import type { Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { FAQ_CANONICAL, FAQ_DESCRIPTION, FAQ_TITLE, faqStructuredData } from "../shared/faq-content";
import { escapeHtml, renderFaqBody } from "../shared/faq-html";

export function renderFaqDocument(template: string) {
  if (!/<div id="root"><\/div>/.test(template)) {
    throw new Error("FAQ rendering requires the application HTML root");
  }
  // Keep the existing icons, CSS, fonts, and analytics unchanged. Remove only the
  // SPA entry and homepage SEO: the FAQ is already complete, without hydration.
  const html = template
    .replace(/<script\b[^>]*type=["']module["'][^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:title|og:description|og:url|twitter:title|twitter:description|twitter:url)["'][^>]*>/gi, "")
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "");

  const structuredData = JSON.stringify(faqStructuredData()).replace(/</g, "\\u003c");
  const metadata = `<title>${FAQ_TITLE}</title>
<meta name="description" content="${escapeHtml(FAQ_DESCRIPTION)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${FAQ_CANONICAL}">
<meta property="og:title" content="${FAQ_TITLE}">
<meta property="og:description" content="${escapeHtml(FAQ_DESCRIPTION)}">
<meta property="og:url" content="${FAQ_CANONICAL}">
<meta name="twitter:title" content="${FAQ_TITLE}">
<meta name="twitter:description" content="${escapeHtml(FAQ_DESCRIPTION)}">
<meta name="twitter:url" content="${FAQ_CANONICAL}">
<script type="application/ld+json">${structuredData}</script>`;

  return html.replace("</head>", `${metadata}\n</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${renderFaqBody()}</div>`);
}

export function registerFaqRoutes(app: Express, loadTemplate = () => fs.readFileSync(
  path.resolve(process.cwd(), process.env.NODE_ENV === "production"
    ? "dist/public/index.html" : "client/index.html"), "utf8",
)) {
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const normalized = req.path.toLowerCase().replace(/\/$/, "");
    if (!["/faq", "/help", "/support", "/questions"].includes(normalized)) return next();
    if (req.path !== "/faq") {
      const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
      return res.redirect(301, `/faq${query}`);
    }
    res.set("Cache-Control", "no-cache");
    res.type("html").status(200).send(renderFaqDocument(loadTemplate()));
  });
}