import Photo from "@/components/site/Photo";
import SitePage from "@/components/site/SitePage";
import { Close, InnerHero, Rows } from "@/components/site/inner";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { CONTACT, formatPrice, PRACTICE_PLAN, SCHOOL_PLAN } from "@/lib/marketing/offer";
import { section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.schools,
  "Karman Prep: Schools",
  `School licenses for Karman: every student gets a ${PRACTICE_PLAN.name} plan of their own, not a shared pool. The first year is free, then ${formatPrice(SCHOOL_PLAN.pricePerStudentPerYear)} per student a year.`
);

/** The school-license email: our general inbox, with the subject filled in. */
const EMAIL = `mailto:${CONTACT.general}?subject=${encodeURIComponent("School license")}`;

export default function SchoolsPage() {
  return (
    <SitePage kind="inner" dock={[section(101).button, EMAIL]}>
      <InnerHero n={101} href={EMAIL} side={<Photo name="start" className="ph-hero" />} />
      <Rows n={102} />
      <Rows n={103} style="steps" />
      <Close n={104} href={EMAIL} />
    </SitePage>
  );
}
