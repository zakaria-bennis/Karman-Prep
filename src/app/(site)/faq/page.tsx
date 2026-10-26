import Faq from "@/components/site/Faq";
import SitePage from "@/components/site/SitePage";
import { Close } from "@/components/site/inner";
import { jsonLd, pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { pairs, section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.faq,
  "Karman Prep: FAQ",
  "Straight answers about Karman's SAT program: price, deposit, classes, missed sessions, the guarantee and how to claim it."
);

export default function FaqPage() {
  const f = section(71);
  const qa = pairs(f.qa);
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  return (
    <SitePage kind="inner">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <section className="i-hero i-faqhero" data-light id="s-71">
        <div className="in">
          <div className="i-words">
            <p className="eyebrow rv">{f.eyebrow}</p>
            <h1 className="rv">{f.headline}</h1>
          </div>
        </div>
      </section>
      <section className="i-sec" data-light>
        <div className="in">
          <Faq items={qa} />
        </div>
      </section>
      <Close n={11} href={ROUTES.test} />
    </SitePage>
  );
}
