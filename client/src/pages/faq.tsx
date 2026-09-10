import { Seo } from "@/components/seo";
import { FAQ_DESCRIPTION, FAQ_TITLE, faqStructuredData } from "@shared/faq-content";
import { renderFaqBody } from "@shared/faq-html";

export default function FaqPage() {
  return <>
    <Seo title={FAQ_TITLE} description={FAQ_DESCRIPTION} canonicalPath="/faq" />
    <script type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData()).replace(/</g, "\\u003c") }} />
    <div dangerouslySetInnerHTML={{ __html: renderFaqBody() }} />
  </>;
}