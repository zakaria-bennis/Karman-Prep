import SitePage from "@/components/site/SitePage";
import TutorsSections from "@/components/site/audience/TutorsSections";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { TUTOR_AFFILIATE_PLAN as TA } from "@/lib/marketing/offer";

export const metadata = pageMeta(ROUTES.tutors, "Karman Prep: For tutors", TA.summary);

/** Signed-out tutors create an account first, then go straight to checkout for this plan. */
const START = `${ROUTES.checkout}?plan=${TA.id}`;

/* In the home page's world (founder, 2026-11-11): the landscape travels with the visitor from page to page.
   This page flies the valley and the fjord. */
export default function ForTutorsPage() {
  return (
    <SitePage kind="lit" route={[0.45, 0.75]} className={litFonts}>
      <TutorsSections start={START} />
    </SitePage>
  );
}
