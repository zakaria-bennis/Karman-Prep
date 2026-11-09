import Photo from "@/components/site/Photo";
import SitePage from "@/components/site/SitePage";
import { Close, InnerHero, Rows } from "@/components/site/inner";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { TUTOR_AFFILIATE_PLAN as TA } from "@/lib/marketing/offer";

export const metadata = pageMeta(ROUTES.tutors, "Karman Prep: For tutors", TA.summary);

/** Signed-out tutors create an account first, then go straight to checkout for this plan. */
const START = `${ROUTES.checkout}?plan=${TA.id}`;

export default function ForTutorsPage() {
  return (
    <SitePage kind="inner">
      <InnerHero n={111} href={START} side={<Photo name="lin" className="ph-hero" />} />
      <Rows n={112} />
      <Rows n={113} style="steps" />
      <Close n={114} href={START} />
    </SitePage>
  );
}
