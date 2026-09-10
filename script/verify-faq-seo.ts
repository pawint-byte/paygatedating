// Read-only HTTP verification. No login, database, or payment operations.
// Usage: npx tsx script/verify-faq-seo.ts https://paygatedating.com
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { FAQ_CANONICAL, FAQ_H1, FAQ_ITEMS, FAQ_TITLE } from "../shared/faq-content";
import { escapeHtml } from "../shared/faq-html";

const run = promisify(execFile);
const base = new URL(process.argv[2] || "https://paygatedating.com");
if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) {
  throw new Error("Provide a public HTTP(S) base URL without credentials");
}
const paths = ["/", "/faq", "/not-a-real-page-xyz", "/sitemap.xml", "/FAQ", "/help", "/support", "/questions"];
const responses = await Promise.all(paths.map(async pathname => {
  const { stdout } = await run("curl", [
    "-sS", "--max-time", "30", "-w", "\n__FAQ_CHECK__%{http_code}\t%{redirect_url}",
    new URL(pathname, base).href,
  ], { maxBuffer: 2 * 1024 * 1024 });
  const marker = stdout.lastIndexOf("\n__FAQ_CHECK__");
  const body = stdout.slice(0, marker);
  const [status, redirect] = stdout.slice(marker + "\n__FAQ_CHECK__".length).trim().split("\t");
  return { pathname, status: Number(status), redirect: redirect || null, body };
}));
const faq = responses.find(response => response.pathname === "/faq")!;
const home = responses[0];
const missing = responses.find(response => response.pathname === "/not-a-real-page-xyz")!;
const sitemap = responses.find(response => response.pathname === "/sitemap.xml")!;
const title = (html: string) => html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || null;
const canonical = (html: string) => html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1] || null;
const h1 = (html: string) => html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || null;
const structured = [...faq.body.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => JSON.parse(match[1]));
const faqData = structured.find(data => data["@type"] === "FAQPage");
const checks = {
  faqStatus200: faq.status === 200,
  uniqueFaqTitle: title(faq.body) === FAQ_TITLE && title(home.body) !== FAQ_TITLE,
  faqCanonical: canonical(faq.body) === FAQ_CANONICAL,
  faqH1: h1(faq.body) === FAQ_H1,
  indexFollow: /name="robots" content="index,follow"/.test(faq.body),
  allVisibleAnswers: FAQ_ITEMS.every(item => faq.body.includes(escapeHtml(item.question)) && faq.body.includes(escapeHtml(item.answer))),
  matchingJsonLd: faqData?.mainEntity?.length === FAQ_ITEMS.length &&
    FAQ_ITEMS.every((item, index) => faqData.mainEntity[index].name === item.question &&
      faqData.mainEntity[index].acceptedAnswer.text === item.answer),
  genuine404: missing.status === 404 && !missing.body.includes('<div id="root">'),
  sitemapStatusAndEntry: sitemap.status === 200 && sitemap.body.includes(`<loc>${FAQ_CANONICAL}</loc>`),
  aliasRedirects: responses.slice(4).every(response => response.status === 301 &&
    response.redirect === new URL("/faq", base).href),
};
console.log(JSON.stringify({
  base: base.origin,
  checkedAt: new Date().toISOString(),
  http: responses.map(({ pathname, status, redirect, body }) => ({
    path: pathname, status, redirect,
    ...(pathname === "/sitemap.xml" ? { includesFaq: body.includes(`<loc>${FAQ_CANONICAL}</loc>`) }
      : { title: title(body), canonical: canonical(body), h1: h1(body) }),
  })),
  faqJsonLdType: faqData?.["@type"] || null,
  faqJsonLdAnswers: faqData?.mainEntity?.length || 0,
  checks,
  passed: Object.values(checks).every(Boolean),
}, null, 2));
if (!Object.values(checks).every(Boolean)) process.exitCode = 1;