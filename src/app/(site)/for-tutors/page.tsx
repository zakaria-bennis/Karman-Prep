import Photo from "@/components/site/Photo";
import SitePage from "@/components/site/SitePage";
import { Close, InnerHero, Rows } from "@/components/site/inner";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { formatPrice, PRACTICE_PLAN, TUTOR_AFFILIATE_PLAN as TA } from "@/lib/marketing/offer";
import { section } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.tutors,
  "Karman Prep: For tutors",
  `The Karman tutor affiliate plan: ${formatPrice(TA.monthly)} a month, one code for up to ${TA.maxStudents} students, who get the ${PRACTICE_PLAN.name} plan free while you subscribe. You see their progress, assign work and manage your roster.`
);

/** Signed-out tutors go through sign-in first, then land on Billing with this plan picked. */
const START = `${ROUTES.billing}?plan=${TA.id}`;

export default function ForTutorsPage() {
  return (
    <SitePage kind="inner" dock={[section(111).button, START]}>
      <InnerHero n={111} href={START} side={<Photo name="lin" className="ph-hero" />} />
      <Rows n={112} />
      <Rows n={113} style="steps" />
      <Close n={114} href={START} />
    </SitePage>
  );
}
