import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { parseDocument } from "htmlparser2";
import type { AnyNode, Element } from "domhandler";
import { suggestWishlistPriceTier, type WishlistPreview } from "../../shared/wishlist-discovery";

const AGENT = "PayGateWishlistBot";
const MAX_BYTES = 2 * 1024 * 1024;
type HttpPage = { status: number; headers: Record<string, string | undefined>; body: string };
export type PreviewTransport = (url: URL) => Promise<HttpPage>;

export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) ||
      (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
  }
  if (isIP(address) === 6) {
    // Only global-unicast IPv6; exclude mapped IPv4 and special-purpose ranges.
    return /^[23]/i.test(address) && !/^2001:(?:0:|db8:|2:|10:|20:)/i.test(address) &&
      !/^2002:/i.test(address);
  }
  return false;
}

export function productUrl(input: string): URL {
  const url = new URL(input);
  if (input.length > 4096 || url.protocol !== "https:" || url.username || url.password ||
      (url.port && url.port !== "443") || isIP(url.hostname.replace(/^\[|\]$/g, "")) ||
      !url.hostname.includes(".") || /\.(?:localhost|local|internal|test|invalid)$/i.test(url.hostname)) {
    throw new Error("Use a public HTTPS product link.");
  }
  url.hash = "";
  return url;
}

// DNS is checked at connection time and the selected address is pinned to the
// socket. Pre-fetch DNS checking alone would leave a rebinding vulnerability.
export const fetchProductPage: PreviewTransport = async (url) => new Promise((resolve, reject) => {
  const req = request(url, {
    method: "GET",
    headers: { "User-Agent": `${AGENT}/1.0`, Accept: "text/html,application/json;q=0.8" },
    lookup: (hostname, options, callback) => {
      lookup(hostname, { all: true, verbatim: true }).then(addresses => {
        if (!addresses.length || addresses.some(item => !publicAddress(item.address))) {
          callback(new Error("Non-public destination."), "", 4);
        } else {
          if (typeof options === "object" && options.all) {
            (callback as any)(null, addresses);
          } else {
            callback(null, addresses[0].address, addresses[0].family);
          }
        }
      }).catch(error => callback(error, "", 4));
    },
  }, response => {
    const chunks: Buffer[] = [];
    let size = 0;
    response.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BYTES) req.destroy(new Error("Page too large."));
      else chunks.push(Buffer.from(chunk));
    });
    response.on("error", reject);
    response.on("aborted", () => reject(new Error("Incomplete response.")));
    response.on("end", () => resolve({
      status: response.statusCode ?? 500,
      headers: {
        location: response.headers.location,
        "content-type": response.headers["content-type"],
        "retry-after": typeof response.headers["retry-after"] === "string" ? response.headers["retry-after"] : undefined,
      },
      body: Buffer.concat(chunks).toString("utf8"),
    }));
  });
  const timeout = setTimeout(() => req.destroy(new Error("Timed out.")), 10000);
  req.on("close", () => clearTimeout(timeout));
  req.on("error", reject);
  req.end();
});

function elements(node: AnyNode): Element[] {
  const children = "children" in node ? node.children : [];
  return [...(node.type === "tag" || node.type === "script" ? [node as Element] : []),
    ...children.flatMap(elements)];
}
function text(node: AnyNode): string {
  return node.type === "text" ? node.data : "children" in node ? node.children.map(text).join("") : "";
}
function httpImage(value: unknown, base: string): string {
  try {
    const image = new URL(typeof value === "string" ? value : "", base);
    return typeof value === "string" && value && image.protocol === "https:" && !image.username && !image.password ? image.href : "";
  } catch { return ""; }
}
function amount(value: unknown): string {
  const raw = typeof value === "number" ? value : typeof value === "string" ? value.replace(/,/g, "").trim() : NaN;
  const number = Number(raw);
  return raw !== "" && Number.isFinite(number) && number > 0 && number < 1000000 ? number.toFixed(2) : "";
}
export function platformFor(url: string): string {
  const host = new URL(url).hostname.toLowerCase();
  for (const [domain, name] of [["amazon.com", "Amazon"], ["viator.com", "Viator"], ["klook.com", "Klook"]]) {
    if (host === domain || host.endsWith(`.${domain}`)) return name;
  }
  return "Other";
}
export function emptyPreview(url: string): WishlistPreview {
  return { title: "", price: "", currency: "", imageUrl: "", url, platform: platformFor(url), priceTier: "starter", error: "unavailable" };
}

export function parseProductPage(html: string, url: string): WishlistPreview {
  const nodes = elements(parseDocument(html, { decodeEntities: true }));
  const meta = (key: string) => nodes.find(node => node.name === "meta" &&
    (node.attribs.property?.toLowerCase() === key || node.attribs.name?.toLowerCase() === key))?.attribs.content?.trim() || "";
  const structured: any[] = [];
  const visit = (value: any) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
      if (types.some((type: unknown) => ["Product", "TouristTrip", "Event", "Service"].includes(String(type)))) structured.push(value);
      if (value["@graph"]) visit(value["@graph"]);
      if (value.mainEntity) visit(value.mainEntity);
    }
  };
  nodes.filter(node => node.name === "script" && node.attribs.type?.toLowerCase() === "application/ld+json")
    .forEach(node => { try { visit(JSON.parse(text(node))); } catch { /* A malformed block does not discard valid metadata. */ } });
  const primary = structured[0];
  const offers = Array.isArray(primary?.offers) ? primary.offers : [primary?.offers];
  const offer = offers.find((value: any) => value && amount(value.price ?? value.lowPrice));
  const title = (meta("og:title") || primary?.name || meta("twitter:title") ||
    text(nodes.find(node => node.name === "title") || { type: "text", data: "" } as AnyNode)).trim().slice(0, 200);
  // Never infer price from unrelated recommendations, shipping, or arbitrary
  // dollar signs elsewhere in the page.
  const price = amount(offer?.price ?? offer?.lowPrice ?? meta("product:price:amount") ?? "");
  const metaPrice = amount(meta("product:price:amount") || meta("og:price:amount"));
  const images = Array.isArray(primary?.image) ? primary.image : [primary?.image];
  const structuredImage = typeof images[0] === "object" ? images[0]?.url : images[0];
  const result: WishlistPreview = {
    title, price: price || metaPrice,
    currency: String(offer?.priceCurrency || meta("product:price:currency") || meta("og:price:currency") || "").toUpperCase(),
    imageUrl: httpImage(meta("og:image") || structuredImage || meta("twitter:image"), url),
    platform: platformFor(url), url, priceTier: suggestWishlistPriceTier(price || metaPrice),
  };
  if (!title || /captcha|robot check|access denied|sign in|page not found|404 not found/i.test(title)) return emptyPreview(url);
  return result;
}

export function robotsPolicy(body: string, path: string): { allowed: boolean; delay: number } {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[]; delay: number }[] = [];
  let group: typeof groups[number] | undefined;
  let hasRules = false;
  for (const line of body.split(/\r?\n/)) {
    const [name, ...rest] = line.split("#")[0].split(":");
    const value = rest.join(":").trim();
    const key = name.trim().toLowerCase();
    if (key === "user-agent") {
      if (!group || hasRules) { group = { agents: [], rules: [], delay: 1 }; groups.push(group); hasRules = false; }
      group.agents.push(value.toLowerCase());
    } else if (group && ["allow", "disallow", "crawl-delay"].includes(key)) {
      hasRules = true;
      if (key === "crawl-delay") group.delay = Math.max(group.delay, Number(value) || 1);
      else if (value) group.rules.push({ allow: key === "allow", path: value });
    }
  }
  const exact = groups.filter(item => item.agents.some(agent => agent !== "*" && AGENT.toLowerCase().startsWith(agent)));
  const selected = exact.length ? exact : groups.filter(item => item.agents.includes("*"));
  const matching = selected.flatMap(item => item.rules).filter(rule => {
    const pattern = rule.path.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\$$/, "$");
    return new RegExp(`^${pattern}`).test(path);
  }).sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return { allowed: matching[0]?.allow ?? true, delay: Math.max(1, ...selected.map(item => item.delay)) };
}

export function createPreviewScraper(transport: PreviewTransport = fetchProductPage) {
  const cache = new Map<string, { expires: number; result: WishlistPreview }>();
  const robots = new Map<string, { expires: number; body: string }>();
  const pending = new Map<string, Promise<WishlistPreview>>();
  const hostQueues = new Map<string, Promise<void>>();
  const nextHostRequest = new Map<string, number>();
  async function page(url: URL): Promise<HttpPage> {
    const prior = hostQueues.get(url.origin) ?? Promise.resolve();
    const task = prior.catch(() => {}).then(async () => {
      const wait = (nextHostRequest.get(url.origin) ?? 0) - Date.now();
      if (wait > 10000) throw new Error("Please retry later.");
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      nextHostRequest.set(url.origin, Date.now() + 1000);
      const response = await transport(url);
      if (response.status === 429 || response.status === 503) {
        const retry = Math.min(3600, Math.max(1, Number(response.headers["retry-after"]) || 60));
        nextHostRequest.set(url.origin, Date.now() + retry * 1000);
      }
      return response;
    });
    const tail = task.then(() => {}, () => {});
    hostQueues.set(url.origin, tail);
    tail.finally(() => { if (hostQueues.get(url.origin) === tail) hostQueues.delete(url.origin); });
    return task;
  }
  async function scrape(input: string): Promise<WishlistPreview> {
    let url = productUrl(input);
    for (let hop = 0; hop < 5; hop++) {
      let robot = robots.get(url.origin);
      if (!robot || robot.expires < Date.now()) {
        const response = await page(new URL("/robots.txt", url));
        if (response.status !== 200 && response.status !== 404) throw new Error("Robots unavailable.");
        robot = { expires: Date.now() + 3600000, body: response.status === 404 ? "" : response.body };
        if (robots.size >= 500) robots.delete(robots.keys().next().value!);
        robots.set(url.origin, robot);
      }
      const policy = robotsPolicy(robot.body, url.pathname + url.search);
      if (!policy.allowed || policy.delay > 10) throw new Error("Crawling not permitted.");
      nextHostRequest.set(url.origin, Math.max(nextHostRequest.get(url.origin) ?? 0, Date.now() + policy.delay * 1000));
      const response = await page(url);
      if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location) {
        url = productUrl(new URL(response.headers.location, url).href);
        continue;
      }
      if (response.status !== 200 || !/text\/html|application\/xhtml/i.test(response.headers["content-type"] || "")) throw new Error("Product unavailable.");
      return parseProductPage(response.body, url.href);
    }
    throw new Error("Too many redirects.");
  }
  return async (input: string): Promise<WishlistPreview> => {
    const url = productUrl(input).href;
    const cached = cache.get(url);
    if (cached && cached.expires > Date.now()) return { ...cached.result };
    const inFlight = pending.get(url);
    if (inFlight) return { ...await inFlight };
    const task = scrape(url).catch(() => emptyPreview(url)).then(result => {
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(url, { expires: Date.now() + (result.error ? 60000 : 900000), result });
      return result;
    });
    pending.set(url, task);
    try { return { ...await task }; } finally { pending.delete(url); }
  };
}
