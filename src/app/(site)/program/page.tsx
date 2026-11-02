import ArtDrawing from "@/components/site/ArtDrawing";
import LeadFormCard from "@/components/site/LeadFormCard";
import Photo from "@/components/site/Photo";
import SitePage from "@/components/site/SitePage";
import { FeatureSection } from "@/components/site/Feature";
import { GuaranteeSection, InnerHero, Rows, TextCard } from "@/components/site/inner";
import { jsonLd, pageMeta } from "@/components/site/meta";
import { delay, Seats, TextLink } from "@/components/site/parts";
import { ROUTES } from "@/components/site/routes";
import { formatPrice, MARCH_PROGRAM as MP } from "@/lib/marketing/offer";
import { section, SITE } from "@/lib/marketing/site-copy";
import { siteOrigin } from "@/lib/marketing/public-pages";

export const metadata = pageMeta(
  ROUTES.program,
  "Karman Prep: The SAT Program",
  `${MP.name}: ${MP.weeks} weeks of live SAT classes. ${MP.paidSeats + MP.scholarshipSeats} students per class, ${MP.fullLengthTests} full-length tests with a one-on-one review after each, ${formatPrice(MP.price)}.`
);

/** The label on the drawing's last step: the program's final week */
const stepDate = `WEEK ${MP.weeks}`;
/** The last day of the program: the Sunday of its final week */
const endDate = new Date(Date.parse(`${MP.startDate}T12:00:00Z`) + (MP.weeks * 7 - 1) * 864e5)
  .toISOString()
  .slice(0, 10);

const COURSE = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: MP.name,
  description: section(21).text,
  provider: { "@type": "Organization", name: "Karman Prep", sameAs: siteOrigin() },
  offers: {
    "@type": "Offer",
    price: MP.price,
    priceCurrency: "USD",
    category: "Paid",
    url: `${siteOrigin()}${ROUTES.program}`,
  },
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "Online",
    startDate: MP.startDate,
    endDate,
  },
};

export default function ProgramPage() {
  const price = section(26);
  return (
    <SitePage kind="inner" dock={[section(21).button, "#apply"]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(COURSE)} />
      <InnerHero
        n={21}
        href="#apply"
        side={
          <>
            <ArtDrawing name="weeks" date={stepDate} style={delay(0.2)} />
            <Photo name="program" className="ph-hero" />
          </>
        }
      />
      <FeatureSection n={2} />
      <Rows n={22} />
      <Rows n={23} style="time" />
      <TextCard n={24} />
      <GuaranteeSection />
      <Rows
        n={25}
        style="steps"
        side={<Photo name="call" className="ph-side rv" clip />}
        after={
          <>
            <Seats label={section(25).seats} className="rv" />
            <LeadFormCard n={25} form="apply" anchor="apply" className="i-formcard wide rv" />
          </>
        }
      />
      <section className="i-sec" data-light id="s-26">
        <div className="in i-split">
          <div className="i-head">
            <h2 className="rv">{price.headline}</h2>
            <p className="lede rv">{price.text}</p>
          </div>
          <div className="i-more rv">
            <TextLink label={SITE["pricing link"]} href={ROUTES.pricing} />
          </div>
        </div>
      </section>
      <TextCard n={27} />
    </SitePage>
  );
}
