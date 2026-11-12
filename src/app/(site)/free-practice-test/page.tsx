import SitePage from "@/components/site/SitePage";
import FreeTestSections from "@/components/site/audience/FreeTestSections";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { FREE_PRACTICE_TEST as FT } from "@/lib/marketing/offer";

export const metadata = pageMeta(
  ROUTES.test,
  "Karman Prep: Free practice test",
  `A free, full-length SAT practice test on Karman, any time: ${FT.questionCount} Karman questions, a score report, a domain breakdown and an optional ${FT.callMinutes}-minute results call.`
);

/* In the home page's world (founder, 2026-11-11): the landscape travels with the visitor from page to page.
   This page flies from above the clouds down to the first peaks. */
export default function FreeTestPage() {
  return (
    <SitePage kind="lit" route={[0.1, 0.4]} className={litFonts}>
      <FreeTestSections />
    </SitePage>
  );
}
