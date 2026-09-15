import { FAQ_H1, FAQ_ITEMS } from "./faq-content";

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

// Only trusted, static shared FAQ content is rendered here; no request/user input.
export function renderFaqBody() {
  return `<style>
.faq-public{min-height:100vh;background:#faf8fc;color:#24182d;font:16px/1.75 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.faq-public *{box-sizing:border-box}.faq-public a{color:#70209b;text-decoration:underline;text-underline-offset:3px}
.faq-public .faq-nav{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px max(20px,calc((100% - 1000px)/2));border-bottom:1px solid #e9dfef;background:white}
.faq-public .faq-brand{font-weight:750;font-size:19px;text-decoration:none;white-space:nowrap}.faq-public .faq-links{display:flex;gap:20px;flex-wrap:wrap}
.faq-public main{max-width:820px;margin:0 auto;padding:56px 24px}.faq-public .faq-kicker{color:#70209b;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.faq-public h1{font-family:Georgia,serif;font-size:clamp(32px,6vw,48px);line-height:1.15;margin:12px 0 18px}
.faq-public .faq-intro{color:#695b70;font-size:18px;margin-bottom:36px}.faq-public section{background:white;border:1px solid #e9dfef;border-radius:12px;padding:24px;margin:16px 0}
.faq-public h2{font-size:19px;line-height:1.45;margin:0 0 12px;font-weight:700}.faq-public section p{margin:0;color:#514358}
.faq-public footer{max-width:820px;margin:auto;padding:0 24px 40px;color:#695b70;font-size:14px}.faq-public footer p{margin:10px 0}.faq-public .faq-social{display:flex;gap:16px;flex-wrap:wrap}
.faq-public a:focus-visible{outline:3px solid #70209b;outline-offset:4px}
@media(max-width:520px){.faq-public .faq-nav{align-items:flex-start;flex-direction:column;gap:8px}.faq-public main{padding:32px 18px}.faq-public section{padding:20px}.faq-public .faq-links{gap:16px}}
</style>
<div class="faq-public">
<nav class="faq-nav" aria-label="Main navigation">
  <a class="faq-brand" href="/">PayGate Dating</a>
  <div class="faq-links"><a href="/pricing">Pricing</a><a href="/faq" aria-current="page">FAQ</a><a href="/api/login">Log in / Join free</a></div>
</nav>
<main>
  <p class="faq-kicker">Your story, five chapters</p>
  <h1>${FAQ_H1}</h1>
  <p class="faq-intro">Straight answers about joining, chapters, wallet funds, and what you choose to pay for.</p>
  ${FAQ_ITEMS.map(({ question, answer }, index) => `<section aria-labelledby="faq-question-${index + 1}"><h2 id="faq-question-${index + 1}">${escapeHtml(question)}</h2><p>${escapeHtml(answer)}</p></section>`).join("\n")}
</main>
<footer><p>Still need help? <a href="/contact">Contact PayGate</a> or <a href="/feedback">send feedback after signing in</a>.</p>
 <p class="faq-social"><a href="https://www.youtube.com/@PayGateDating" target="_blank" rel="noopener noreferrer">YouTube</a><a href="https://www.tiktok.com/@paygatedating" target="_blank" rel="noopener noreferrer">TikTok</a></p>
<p><a href="/terms">Terms of Service</a> · <a href="/privacy">Privacy Policy</a> · <a href="/">Back to PayGate Dating</a></p></footer>
</div>`;
}