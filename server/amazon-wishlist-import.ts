import { lookup as dnsLookup } from "node:dns/promises";
import type { LookupAddress, LookupOptions } from "node:dns";
import https from "node:https";
import { isIP } from "node:net";
import type { IncomingHttpHeaders } from "node:http";
import type { RequestHandler } from "express";
import { parseDocument } from "htmlparser2";
import type { Element } from "domhandler";

import {
  amazonWishlistImportRequestSchema,
  type AmazonWishlistCandidate,
  type AmazonWishlistPreview,
} from "@shared/amazon-wishlist-import";

const AMAZON_HOSTS = new Set(["amazon.com", "www.amazon.com"]);
const AMAZON_IMAGE_HOSTS = new Set([
  "images-amazon.com",
  "images-na.ssl-images-amazon.com",
  "images-eu.ssl-images-amazon.com",
  "images-fe.ssl-images-amazon.com",
  "images-cn.ssl-images-amazon.com",
  "images-in.ssl-images-amazon.com",
  "images-jp.ssl-images-amazon.com",
  "images-ssl.ssl-images-amazon.com",
  "m.media-amazon.com",
  "images.amazon.com",
]);
const WISHLIST_PATH = /^\/(?:hz\/wishlist\/ls|gp\/registry\/wishlist)\/([A-Za-z0-9_-]{1,64})$/;
const PRODUCT_PATH = /^\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Za-z0-9]{10})(?:\/)?$/i;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_CANDIDATES = 100;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

type FetchImplementation = typeof fetch;
type DnsLookupImplementation = (
  hostname: string,
  options: LookupOptions & { all: true },
) => Promise<LookupAddress[]>;

export interface AmazonWishlistPreviewOptions {
  fetch?: FetchImplementation;
  lookup?: DnsLookupImplementation;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxCandidates?: number;
}

export class AmazonWishlistImportError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = "AmazonWishlistImportError";
    this.statusCode = statusCode;
  }
}

function importError(message: string, statusCode = 422): AmazonWishlistImportError {
  return new AmazonWishlistImportError(message, statusCode);
}

function hasUnsafeUrlCharacters(value: string): boolean {
  // URL() accepts and silently trims some whitespace.  Do not let that turn a
  // user-provided URL into a different URL, and reject backslashes which are
  // treated as path separators by some URL implementations.
  return /[\u0000-\u0020\u007f\\]/.test(value);
}

function hasExplicitPort(value: string): boolean {
  const authority = value
    .replace(/^https?:\/\//i, "")
    .replace(/^\/\//, "")
    .split(/[/?#]/, 1)[0] ?? "";
  return authority.includes(":");
}

function assertAmazonHostUrl(value: string, message = "Amazon redirects must stay on Amazon.com"): URL {
  if (!value || hasUnsafeUrlCharacters(value)) {
    throw importError(message, 400);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw importError("Enter a valid Amazon.com wishlist URL", 400);
  }

  if (url.protocol !== "https:" || !AMAZON_HOSTS.has(url.hostname) ||
    url.username || url.password) {
    throw importError(message, 400);
  }

  // URL.port is empty for an explicitly supplied default port (":443"), but
  // an explicit port is still outside this importer’s narrow allow-list.
  const authority = value.slice("https://".length).split(/[/?#]/, 1)[0] ?? "";
  if (authority.includes("@") || authority.includes(":")) {
    throw importError(message, 400);
  }

  return url;
}

/**
 * Validate and normalize the only accepted user-facing URL forms.  Query
 * strings and fragments are intentionally discarded from sourceUrl.
 */
export function normalizeAmazonWishlistUrl(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048 ||
    hasUnsafeUrlCharacters(value)) {
    throw importError("Only public Amazon.com wishlist URLs are supported", 400);
  }

  const url = assertAmazonHostUrl(value, "Only public Amazon.com wishlist URLs are supported");
  const match = WISHLIST_PATH.exec(url.pathname);
  if (!match) {
    throw importError(
      "Only public Amazon.com wishlist URLs are supported (/hz/wishlist/ls/ID or /gp/registry/wishlist/ID)",
      400,
    );
  }

  return `https://${url.hostname}${url.pathname}`;
}

function isPublicIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second, third] = octets;
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 100 && second >= 64 && second <= 127) return false; // shared address space
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && (second === 0 || second === 168)) return false;
  if (first === 192 && second === 2) return false; // documentation
  if (first === 198 && (second === 18 || second === 19 || second === 51)) return false;
  if (first === 203 && second === 0 && third === 113) return false; // documentation
  return true;
}

function isPublicIp(address: string): boolean {
  const normalized = address.toLowerCase().split("%", 1)[0];
  const family = isIP(normalized);
  if (family === 4) return isPublicIpv4(normalized);
  if (family !== 6) return false;

  // IPv4-mapped IPv6 addresses must use the IPv4 policy as well.
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIpv4(mapped[1]);
  const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const first = Number.parseInt(mappedHex[1], 16);
    const second = Number.parseInt(mappedHex[2], 16);
    return isPublicIpv4([
      first >> 8,
      first & 0xff,
      second >> 8,
      second & 0xff,
    ].join("."));
  }

  // Unspecified, loopback, link-local, unique-local and documentation ranges.
  if (normalized === "::" || normalized === "::1" ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
    normalized.startsWith("fea") || normalized.startsWith("feb") ||
    normalized === "2001:db8" || normalized.startsWith("2001:db8:")) {
    return false;
  }
  return true;
}

export function isPublicIpAddress(address: string): boolean {
  return isPublicIp(address);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          onTimeout();
          reject(importError("Amazon wishlist request timed out", 504));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function assertPublicAmazonAddress(
  host: string,
  lookup: DnsLookupImplementation,
  timeoutMs: number,
): Promise<void> {
  let addresses: LookupAddress[];
  try {
    addresses = await withTimeout(
      lookup(host, { all: true, verbatim: true }),
      timeoutMs,
      () => undefined,
    );
  } catch (error) {
    if (error instanceof AmazonWishlistImportError) throw error;
    throw importError("Amazon.com could not be reached", 502);
  }

  if (addresses.length === 0 || addresses.some(address => !isPublicIp(address.address))) {
    throw importError("Amazon.com resolved to a non-public address", 400);
  }
}

function headersFromNodeResponse(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || name.toLowerCase() === "set-cookie") continue;
    result.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  return result;
}

export function createPinnedLookup(
  lookup: DnsLookupImplementation,
): NonNullable<https.RequestOptions["lookup"]> {
  return (hostname, options, callback) => {
    Promise.resolve()
      .then(() => lookup(hostname, { all: true, verbatim: true }))
      .then(addresses => {
        if (!addresses.length || addresses.some(address => !isPublicIp(address.address))) {
          callback(
            importError("Amazon.com resolved to a non-public address", 400) as NodeJS.ErrnoException,
            "",
            4,
          );
          return;
        }
        if (options.all) {
          callback(null, addresses);
          return;
        }
        const address = addresses[0];
        callback(null, address.address, address.family);
      })
      .catch(error => callback(
        (error instanceof Error ? error : new Error("DNS lookup failed")) as NodeJS.ErrnoException,
        "",
        4,
      ));
  };
}

async function requestAmazonHtml(
  url: URL,
  lookup: DnsLookupImplementation,
  maxResponseBytes: number,
  timeoutMs: number,
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    let settled = false;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      if (timeoutTimer) clearTimeout(timeoutTimer);
      reject(error);
    };
    const request = https.request(url, {
      method: "GET",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 (compatible; RegistryWishlistPreview/1.0)",
      },
      // The callback returns the exact address used by this connection. This
      // prevents a DNS preflight from being invalidated by a later rebinding.
      lookup: createPinnedLookup(lookup),
    }, response => {
      const chunks: Buffer[] = [];
      let total = 0;
      const contentLength = response.headers["content-length"];
      if (contentLength && /^\d+$/.test(String(contentLength)) &&
        Number(contentLength) > maxResponseBytes) {
        response.destroy();
        request.destroy();
        fail(importError("Amazon wishlist response was too large", 413));
        return;
      }
      response.on("data", chunk => {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += bytes.byteLength;
        if (total > maxResponseBytes) {
          response.destroy();
          request.destroy();
          fail(importError("Amazon wishlist response was too large", 413));
          return;
        }
        chunks.push(bytes);
      });
      response.on("end", () => {
        if (settled) return;
        settled = true;
        if (timeoutTimer) clearTimeout(timeoutTimer);
        const status = response.statusCode ?? 502;
        resolve(new Response([204, 205, 304].includes(status) ? null : Buffer.concat(chunks), {
          status,
          headers: headersFromNodeResponse(response.headers),
        }));
      });
      response.on("error", fail);
    });
    request.once("error", fail);
    timeoutTimer = setTimeout(() => {
      request.destroy();
      fail(importError("Amazon wishlist request timed out", 504));
    }, timeoutMs);
    request.end();
  });
}

function header(response: Response, name: string): string | null {
  return response.headers?.get(name) ?? null;
}

async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // A fetch implementation may already have closed the body while the
    // response was being rejected. There is no reusable connection to keep.
  }
}

async function readResponseBody(
  response: Response,
  maxBytes: number,
  timeoutMs: number,
  controller: AbortController,
): Promise<string> {
  const contentLength = header(response, "content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBytes) {
    await cancelResponseBody(response);
    throw importError("Amazon wishlist response was too large", 413);
  }

  let activeReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const read = async (): Promise<string> => {
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      activeReader = reader;
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        total += next.value.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw importError("Amazon wishlist response was too large", 413);
        }
        chunks.push(next.value);
      }
      return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString("utf8");
    }

    // Some small test doubles and older fetch implementations expose only
    // arrayBuffer/text.  Keep the same byte bound for those implementations.
    if (response.arrayBuffer) {
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > maxBytes) {
        throw importError("Amazon wishlist response was too large", 413);
      }
      return Buffer.from(bytes).toString("utf8");
    }
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      throw importError("Amazon wishlist response was too large", 413);
    }
    return text;
  };

  try {
    return await withTimeout(read(), timeoutMs, () => {
      controller.abort();
      void activeReader?.cancel().catch(() => undefined);
    });
  } catch (error) {
    if (error instanceof AmazonWishlistImportError) throw error;
    if ((error as { name?: string })?.name === "AbortError") {
      throw importError("Amazon wishlist request timed out", 504);
    }
    throw importError("Could not download the Amazon.com wishlist HTML", 502);
  }
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function fetchWishlistHtml(
  normalizedSourceUrl: string,
  options: AmazonWishlistPreviewOptions,
): Promise<{ html: string; finalUrl: string }> {
  const lookup = options.lookup ?? (dnsLookup as unknown as DnsLookupImplementation);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  let currentUrl = normalizedSourceUrl;
  const deadline = Date.now() + timeoutMs;

  for (let redirectCount = 0; ; redirectCount += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw importError("Amazon wishlist request timed out", 504);
    const validatedUrl = assertAmazonHostUrl(currentUrl);

    let responseController = new AbortController();
    let response: Response;
    try {
      if (options.fetch) {
        // Injected transports are used by tests and callers that provide their
        // own HTTP implementation. Keep their DNS preflight, while the
        // production default below pins the address in the actual TLS socket.
        await assertPublicAmazonAddress(validatedUrl.hostname, lookup, remainingMs);
        responseController = new AbortController();
        response = await withTimeout(
          options.fetch(validatedUrl.href, {
            method: "GET",
            redirect: "manual",
            signal: responseController.signal,
            headers: {
              accept: "text/html,application/xhtml+xml",
              "user-agent": "Mozilla/5.0 (compatible; RegistryWishlistPreview/1.0)",
            },
          }),
          remainingMs,
          () => responseController.abort(),
        );
      } else {
        // Native HTTPS is intentionally used in production: its lookup
        // callback supplies the same validated address to the TLS connection,
        // preventing a preflight/connection DNS rebinding window.
        response = await requestAmazonHtml(validatedUrl, lookup, maxResponseBytes, remainingMs);
      }
    } catch (error) {
      if (error instanceof AmazonWishlistImportError) throw error;
      if ((error as { name?: string })?.name === "AbortError") {
        throw importError("Amazon wishlist request timed out", 504);
      }
      throw importError("Could not reach Amazon.com for the wishlist preview", 502);
    }

    // A real fetch with redirect:manual reports the current request URL here.
    // Validate it anyway so test doubles and alternate fetch implementations
    // cannot hide a cross-origin hop.
    const reportedUrl = response.url;
    if (reportedUrl) {
      let checkedReportedUrl: URL;
      try {
        checkedReportedUrl = assertAmazonHostUrl(reportedUrl);
      } catch {
        await cancelResponseBody(response);
        throw importError("Amazon wishlist redirect was not allowed", 502);
      }
      currentUrl = checkedReportedUrl.href;
    }

    if (isRedirect(response.status)) {
      const location = header(response, "location");
      if (!location || redirectCount >= MAX_REDIRECTS) {
        await cancelResponseBody(response);
        throw importError("Amazon wishlist redirect was not allowed", 502);
      }
      let nextUrl: URL;
      try {
        nextUrl = new URL(location, validatedUrl);
      } catch {
        await cancelResponseBody(response);
        throw importError("Amazon wishlist redirect was not allowed", 502);
      }
      if (hasExplicitPort(location)) {
        await cancelResponseBody(response);
        throw importError("Amazon wishlist redirect was not allowed", 502);
      }
      // This checks every redirect before it is requested, not only the final
      // URL returned by fetch.
      try {
        assertAmazonHostUrl(nextUrl.href);
      } catch {
        await cancelResponseBody(response);
        throw importError("Amazon wishlist redirect was not allowed", 502);
      }
      await cancelResponseBody(response);
      currentUrl = nextUrl.href;
      continue;
    }

    if (response.status < 200 || response.status >= 300) {
      await cancelResponseBody(response);
      if (response.status === 401 || response.status === 403) {
        throw importError("Amazon wishlist is private or requires CAPTCHA/sign-in", 422);
      }
      if (response.status === 404) {
        throw importError("Amazon wishlist was not found", 404);
      }
      throw importError("Amazon.com returned an unavailable wishlist response", 502);
    }

    const contentType = header(response, "content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "text/html" && contentType !== "application/xhtml+xml") {
      await cancelResponseBody(response);
      throw importError("Amazon wishlist did not return HTML", 502);
    }

    const bodyRemainingMs = deadline - Date.now();
    if (bodyRemainingMs <= 0) {
      await cancelResponseBody(response);
      throw importError("Amazon wishlist request timed out", 504);
    }
    const html = await readResponseBody(
      response,
      maxResponseBytes,
      bodyRemainingMs,
      responseController,
    );
    return { html, finalUrl: currentUrl };
  }
}

function attr(element: Element, name: string): string {
  return element.attribs?.[name] ?? "";
}

function elementsUnder(root: Element | { children: any[] }): Element[] {
  const found: Element[] = [];
  const walk = (node: any) => {
    if (node?.type === "tag") {
      found.push(node as Element);
    }
    for (const child of node?.children ?? []) walk(child);
  };
  walk(root);
  return found;
}

function textUnder(node: any): string {
  const pieces: string[] = [];
  const walk = (current: any) => {
    if (current?.type === "text") {
      pieces.push(current.data ?? "");
      return;
    }
    if (current?.type === "script" || current?.type === "style") return;
    for (const child of current?.children ?? []) walk(child);
  };
  walk(node);
  return pieces.join(" ").replace(/\s+/g, " ").trim();
}

function classNames(element: Element): string {
  return attr(element, "class").toLowerCase();
}

function isItemContainer(element: Element): boolean {
  const id = attr(element, "id");
  const classes = classNames(element);
  return Boolean(attr(element, "data-item-id") ||
    /^item(?:_|-)[a-z0-9_-]+$/i.test(id) ||
    classes.includes("g-item-sortable") || classes.includes("wl-item") ||
    classes.includes("wishlist-item"));
}

function firstText(elements: Element[], predicate: (element: Element) => boolean): string {
  for (const element of elements) {
    if (!predicate(element)) continue;
    const value = textUnder(element) ||
      attr(element, "data-title") || attr(element, "title") || attr(element, "aria-label");
    if (value) return value;
  }
  return "";
}

function safeImageUrl(raw: string): string {
  if (!raw || hasUnsafeUrlCharacters(raw)) return "";
  let url: URL;
  try {
    url = new URL(raw, "https://www.amazon.com");
  } catch {
    return "";
  }
  if (url.protocol !== "https:" || !AMAZON_IMAGE_HOSTS.has(url.hostname) ||
    hasExplicitPort(raw) ||
    url.username || url.password || url.port) {
    return "";
  }
  return `https://${url.hostname}${url.pathname}`;
}

export function normalizeAmazonProductUrl(raw: string): string {
  if (!raw || hasUnsafeUrlCharacters(raw)) return "";
  let url: URL;
  try {
    url = new URL(raw, "https://www.amazon.com");
  } catch {
    return "";
  }
  if (url.protocol !== "https:" || !AMAZON_HOSTS.has(url.hostname) ||
    hasExplicitPort(raw) ||
    url.username || url.password || url.port) {
    return "";
  }
  const match = PRODUCT_PATH.exec(url.pathname);
  if (!match) return "";
  return `https://www.amazon.com/dp/${match[1].toUpperCase()}`;
}

/**
 * Return a currency-free, two-decimal USD value. Currency symbols are
 * required: a bare number or a non-USD amount is not safe to label as USD.
 */
export function normalizeUsdPrice(raw: string): string {
  const value = raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const dollarIndex = value.indexOf("$");
  if (dollarIndex >= 0 &&
    /(?:CA|CAD|AU|AUD|NZ|NZD|SG|SGD|HK|HKD)\s*$/i.test(value.slice(0, dollarIndex).trim())) {
    return "";
  }
  const match = value.match(
    /(?:^|[^\w])(?:US\s*)?\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)(?![0-9])|(?:^|[^\w])USD\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)(?![0-9])/i,
  );
  if (!match) return "";
  const amount = match[1] ?? match[2];
  const [wholePart, fractionPart = ""] = amount.replace(/,/g, "").split(".");
  if (!/^\d+$/.test(wholePart) || !/^\d{0,2}$/.test(fractionPart)) return "";
  const whole = wholePart.replace(/^0+(?=\d)/, "") || "0";
  return `${whole}.${fractionPart.padEnd(2, "0")}`;
}

function extractPrice(elements: Element[]): string {
  // Amazon often includes both an offscreen accessible price and a visual
  // whole/fraction representation. Prefer the former so the visual markup is
  // not accidentally concatenated twice.
  const offscreen = elements.find(element => classNames(element).split(/\s+/).includes("a-offscreen"));
  if (offscreen) {
    return normalizeUsdPrice(
      attr(offscreen, "data-price") || textUnder(offscreen) ||
      attr(offscreen, "aria-label") || attr(offscreen, "title"),
    );
  }

  const priceRoot = elements.find(element => {
    const idText = attr(element, "id").toLowerCase();
    const classes = classNames(element);
    return classes.split(/\s+/).includes("a-price") || idText.includes("price") ||
      classes.split(/\s+/).includes("price") || Boolean(attr(element, "data-price"));
  });
  if (!priceRoot) return "";

  const symbol = elementsUnder(priceRoot).find(element =>
    classNames(element).split(/\s+/).includes("a-price-symbol"));
  const whole = elementsUnder(priceRoot).find(element =>
    classNames(element).split(/\s+/).includes("a-price-whole"));
  const fraction = elementsUnder(priceRoot).find(element =>
    classNames(element).split(/\s+/).includes("a-price-fraction"));
  if (symbol && whole && fraction) {
    return normalizeUsdPrice(`${textUnder(symbol)}${textUnder(whole)}${textUnder(fraction)}`);
  }
  return normalizeUsdPrice(
    attr(priceRoot, "data-price") || textUnder(priceRoot) ||
    attr(priceRoot, "aria-label") || attr(priceRoot, "title"),
  );
}

function candidateFromScope(scope: Element, fallbackLink?: Element): AmazonWishlistCandidate | undefined {
  const descendants = elementsUnder(scope);
  const links = descendants.filter(element => element.name.toLowerCase() === "a");
  const productUrl = links.map(link => normalizeAmazonProductUrl(attr(link, "href"))).find(Boolean) ??
    (fallbackLink ? normalizeAmazonProductUrl(attr(fallbackLink, "href")) : "");
  const productAsin = productUrl.match(/\/dp\/([A-Z0-9]{10})$/)?.[1] ?? "";

  const idElement = descendants.find(element => Boolean(
    attr(element, "data-item-id") || attr(element, "data-asin") ||
    (/^item(?:_|-)[a-z0-9_-]+$/i.test(attr(element, "id")) &&
      !/^item(?:name|price|image)[_-]/i.test(attr(element, "id"))),
  ));
  const rawContainerId = idElement
    ? (attr(idElement, "data-item-id") || attr(idElement, "data-asin") || attr(idElement, "id"))
    : "";
  const containerId = rawContainerId.replace(/^item[_-]/i, "").trim();
  const id = productAsin || containerId;
  if (!id) return undefined;

  const title = firstText(descendants, element => {
    const elementId = attr(element, "id").toLowerCase();
    const classes = classNames(element);
    return elementId.includes("itemname") || elementId.includes("item_name") ||
      elementId.includes("title") || classes.includes("item-name") ||
      classes.includes("item-title") || classes.includes("product-title") ||
      Boolean(attr(element, "data-item-name"));
  }) || textUnder(fallbackLink ?? scope).replace(/\s+/g, " ");

  const price = extractPrice(descendants);

  const imageElement = descendants.find(element => element.name.toLowerCase() === "img");
  const imageUrl = imageElement
    ? [
      attr(imageElement, "src"),
      attr(imageElement, "data-src"),
      attr(imageElement, "data-original"),
      attr(imageElement, "data-lazy-src"),
    ].map(safeImageUrl).find(Boolean) ?? ""
    : "";

  return {
    id,
    title: title.trim(),
    price: price.trim(),
    imageUrl,
    productUrl,
  };
}

export interface ParsedAmazonWishlistHtml {
  candidates: AmazonWishlistCandidate[];
  warnings: string[];
}

/**
 * Parse only the HTML that Amazon returned.  This intentionally does not
 * execute scripts, fetch images, or follow pagination/product links.
 */
export function parseAmazonWishlistHtml(
  html: string,
  maxCandidates = DEFAULT_MAX_CANDIDATES,
): ParsedAmazonWishlistHtml {
  const document = parseDocument(html, { decodeEntities: true });
  const allElements = elementsUnder(document as any);
  let roots = allElements.filter(isItemContainer);
  const rootSet = new Set(roots);
  roots = roots.filter(root => {
    let parent = root.parent;
    while (parent) {
      if (rootSet.has(parent as Element)) return false;
      parent = parent.parent;
    }
    return true;
  });

  // Generic product links and data-asin cards also appear in Amazon footers
  // and recommendations, including on missing/private lists. Only recognized
  // wishlist item containers are candidates; unknown markup fails closed.

  const warnings = [
    "Preview includes only entries loaded in the HTML; pagination or JavaScript-loaded items may be omitted.",
  ];
  const pagination = allElements.some(element => {
    if (element.name.toLowerCase() !== "a") return false;
    const link = attr(element, "href");
    const text = textUnder(element).toLowerCase();
    return /(?:page|start|next|loadmore|load-more)/i.test(`${link} ${text}`);
  });
  if (pagination) {
    warnings.push("Amazon indicated pagination; only the first loaded HTML page was previewed.");
  }

  const candidates: AmazonWishlistCandidate[] = [];
  let duplicateCount = 0;
  let incompleteCount = 0;
  const seen = new Set<string>();
  for (const root of roots) {
    const candidate = candidateFromScope(root);
    if (!candidate) continue;
    const key = candidate.productUrl || candidate.id.toLowerCase();
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    if (!candidate.title || !candidate.price || !candidate.imageUrl || !candidate.productUrl) {
      incompleteCount += 1;
    }
    if (candidates.length < maxCandidates) candidates.push(candidate);
  }
  if (duplicateCount > 0) warnings.push("Duplicate wishlist entries were combined.");
  if (incompleteCount > 0) {
    warnings.push("Some loaded entries did not include complete title, price, image, and product URL data.");
  }
  if (roots.length > maxCandidates || candidates.length >= maxCandidates && roots.length > candidates.length) {
    warnings.push(`Only the first ${maxCandidates} loaded wishlist entries were included.`);
  }

  return { candidates, warnings };
}

function htmlSignalsPrivateOrCaptcha(html: string): "captcha" | "private" | undefined {
  const lower = html.toLowerCase();
  const visible = textUnder(parseDocument(html, { decodeEntities: true })).toLowerCase();
  if (lower.includes("validatecaptcha") || lower.includes("captchacharacters") ||
    visible.includes("captcha") || visible.includes("robot check") ||
    visible.includes("enter the characters")) {
    return "captcha";
  }
  if (lower.includes("sign in to view") || lower.includes("private wishlist") ||
    lower.includes("this list is private")) {
    return "private";
  }
  return undefined;
}

export async function previewAmazonWishlist(
  rawUrl: string,
  options: AmazonWishlistPreviewOptions = {},
): Promise<AmazonWishlistPreview> {
  const sourceUrl = normalizeAmazonWishlistUrl(rawUrl);
  const { html, finalUrl } = await fetchWishlistHtml(sourceUrl, options);
  const finalPath = new URL(finalUrl).pathname.toLowerCase();
  const signal = htmlSignalsPrivateOrCaptcha(html) ||
    (finalPath.includes("captcha") ? "captcha" : undefined) ||
    (finalPath.startsWith("/ap/signin") || finalPath.startsWith("/gp/sign-in") ? "private" : undefined);
  if (signal === "captcha") {
    throw importError("Amazon wishlist requires CAPTCHA; only public Amazon.com wishlists can be previewed", 422);
  }
  if (signal === "private") {
    throw importError("Amazon wishlist is private or requires sign-in", 422);
  }

  const parsed = parseAmazonWishlistHtml(html, options.maxCandidates ?? DEFAULT_MAX_CANDIDATES);
  if (parsed.candidates.length === 0) {
    throw importError("No wishlist items were found in the loaded Amazon HTML", 422);
  }
  return {
    sourceUrl,
    candidates: parsed.candidates,
    warnings: parsed.warnings,
  };
}

export const sameOriginAmazonWishlistRequest: RequestHandler = (req, res, next) => {
  const origin = req.get("origin");
  if (req.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== `${req.protocol}://${req.get("host")}`)) {
    res.status(403).json({ message: "Amazon wishlist preview requires a same-origin request" });
    return;
  }
  next();
};

export function createAmazonWishlistPreviewHandler(
  options: AmazonWishlistPreviewOptions = {},
): RequestHandler {
  return async (req, res) => {
    if (typeof res.setHeader === "function") res.setHeader("Cache-Control", "no-store");
    if (typeof req.is === "function" && !req.is("application/json")) {
      res.status(400).json({
        message: "Request must be strict JSON containing only a URL string",
      });
      return;
    }
    const validation = amazonWishlistImportRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        message: "Request must be strict JSON containing only a URL string",
      });
      return;
    }

    try {
      const result = await previewAmazonWishlist(validation.data.url, options);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof AmazonWishlistImportError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }
      res.status(502).json({ message: "Could not fetch the Amazon.com wishlist preview" });
    }
  };
}
