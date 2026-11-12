import SitePage from "@/components/site/SitePage";
import FaqSections, { faqItems } from "@/components/site/company/FaqSections";
import { litFonts } from "@/components/site/home/fonts";
import { jsonLd, pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";

export const metadata = pageMeta(
  ROUTES.faq,
  "Karman Prep: FAQ",
  "Straight answers about Karman's SAT prep: price, deposit, plans, classes, missed sessions, the guarantee and how to claim it."
);

/* In the home page's world (founder, 2026-11-11). The FAQ flies the last stretch of the route, out over the
   sea at sunset, where the home page's own questions float. The JSON-LD lists exactly the questions the page
   shows. */
export default function FaqPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems().map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  return (
    <SitePage kind="lit" route={[0.8, 1]} className={litFonts}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <FaqSections />
    </SitePage>
  );
}
