import SitePage from "@/components/site/SitePage";
import HeroOptions from "@/components/site/program/HeroOptions";
import { jsonLd, pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { formatPrice, MARCH_PROGRAM as MP } from "@/lib/marketing/offer";
import { section } from "@/lib/marketing/site-copy";
import { siteOrigin } from "@/lib/marketing/public-pages";

export const metadata = pageMeta(
  ROUTES.program,
  "Karman Prep: The SAT Program",
  `${MP.name}: ${MP.weeks} weeks of live SAT classes. Up to ${MP.paidSeats} students per class, grouped by score band, ${MP.totalClasses} classes of ${MP.classMinutes} minutes and ${MP.fullLengthTests} full-length tests, ${formatPrice(MP.price)}.`
);

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

/* The page is being rebuilt in the home page's world, one section at a time (founder, 2026-11-11). It flies
   the mountain valleys of the route, in full daylight. So far: the opening, as three options to pick from. */
export default function ProgramPage() {
  return (
    <SitePage kind="lit" route={[0.2, 0.56]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(COURSE)} />
      <HeroOptions />
    </SitePage>
  );
}
