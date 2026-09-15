import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Parser } from "htmlparser2";
import ts from "typescript";
import { renderFaqBody } from "../shared/faq-html";
import { renderFaqDocument } from "../server/faq";

const require = createRequire(import.meta.url);
const expected = [
  { label: "YouTube", href: "https://www.youtube.com/@PayGateDating" },
  { label: "TikTok", href: "https://www.tiktok.com/@paygatedating" },
];

function assertFooterLinks(html: string) {
  let inFooter = false;
  let footerCount = 0;
  let current: { label: string; attributes: Record<string, string> } | undefined;
  const anchors: NonNullable<typeof current>[] = [];
  const parser = new Parser({
    onopentag(name, attributes) {
      if (name === "footer") { inFooter = true; footerCount++; }
      if (inFooter && name === "a") current = { label: "", attributes };
    },
    ontext(text) { if (current) current.label += text; },
    onclosetag(name) {
      if (name === "a" && current) { anchors.push(current); current = undefined; }
      if (name === "footer") inFooter = false;
    },
  });
  parser.end(html);
  assert.equal(footerCount, 1, "Public pages must render exactly one footer");
  for (const { label, href } of expected) {
    const matches = anchors.filter(anchor => anchor.attributes.href === href);
    assert.equal(matches.length, 1, `${label} must be mounted in the footer, not merely bundled`);
    assert.equal(matches[0].label.trim(), label);
    assert.equal(matches[0].attributes.target, "_blank");
    assert.equal(matches[0].attributes.rel, "noopener noreferrer");
  }
}

// Render real Landing + Footer, isolating unrelated media, auth and sharing
// dependencies. This catches the former FAQ-tab-only mount without network calls.
function loadComponent(path: string, dependencies: Record<string, unknown>): any {
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const stub = () => React.createElement("span");
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(name: string) {
      if (name in dependencies) return dependencies[name];
      if (name === "react") return React;
      if (name === "react/jsx-runtime") return require(name);
      if (name === "wouter") return { Link: (props: any) => React.createElement("a", props) };
      if (name === "lucide-react" || name.startsWith("@/components/")) {
        return new Proxy({}, { get: () => stub });
      }
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return module.exports;
}

const { Footer } = loadComponent("client/src/components/landing/footer.tsx", {});
const { default: Landing } = loadComponent("client/src/pages/landing.tsx", {
  "@/components/landing/footer": { Footer },
});

for (const tab of ["home", "pricing", "how-it-works", "features", "stories", "faq"]) {
  test(`public landing ${tab} renders both social links outside the active tab`, () => {
    assertFooterLinks(renderToStaticMarkup(React.createElement(Landing, { initialTab: tab })));
  });
}

test("client-routed FAQ renders both footer links", () => {
  assertFooterLinks(renderFaqBody());
});

test("direct server-rendered FAQ includes footer links without requiring the JS bundle", () => {
  const html = renderFaqDocument(readFileSync("client/index.html", "utf8"));
  assertFooterLinks(html);
  assert.doesNotMatch(html, /<script[^>]*type=["']module["']/);
});