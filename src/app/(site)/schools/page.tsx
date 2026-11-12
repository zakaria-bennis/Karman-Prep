import SitePage from "@/components/site/SitePage";
import SchoolsSections from "@/components/site/audience/SchoolsSections";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import { partnerMapOn } from "@/data/partners/partner-regions";
import { ROUTES } from "@/components/site/routes";
import { formatPrice, PRACTICE_PLAN, SCHOOL_PLAN } from "@/lib/marketing/offer";

export const metadata = pageMeta(
  ROUTES.schools,
  "Karman Prep: Schools",
  `School licenses for Karman: every student gets a ${PRACTICE_PLAN.name} plan of their own, not a shared pool. The first year is free, then ${formatPrice(SCHOOL_PLAN.pricePerStudentPerYear)} per student a year.`
);

/* In the home page's world (founder, 2026-11-11): the landscape travels with the visitor from page to page.
   This page flies the stretch from the snowy peaks down into the valley. */
export default function SchoolsPage() {
  return (
    <SitePage kind="lit" route={[0.3, 0.6]} className={litFonts}>
      <SchoolsSections partners={partnerMapOn()} />
    </SitePage>
  );
}
