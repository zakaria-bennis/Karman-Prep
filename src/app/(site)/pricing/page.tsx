import SitePage from "@/components/site/SitePage";
import PricingPage from "@/components/site/deal/PricingPage";
import { pricingData } from "@/components/site/deal/pricing-data";
import { litFonts } from "@/components/site/home/fonts";
import { fraunces } from "@/components/site/display-font";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import {
  formatPrice,
  guaranteeMax,
  MARCH_PROGRAM,
  PRACTICE_PLAN,
  PRO_PLAN,
} from "@/lib/marketing/offer";

export const metadata = pageMeta(
  ROUTES.pricing,
  "Karman Prep: pricing",
  `Every Karman price on one page: ${PRACTICE_PLAN.name} at ${formatPrice(PRACTICE_PLAN.monthly)} a month, ${PRO_PLAN.name} at ${formatPrice(PRO_PLAN.monthly)}, the live cohort at ${formatPrice(MARCH_PROGRAM.price)} and private tutoring, with the guarantee in full: up to +${guaranteeMax("private")} points, set by the starting score, or your money back.`
);

/* In the home page's world, on the SAT Program page's frame (founder, 2026-11-12). The landscape keeps
   travelling: pricing flies the stretch after About's. */
/* Read per request, so a cohort whose enrollment has closed drops off the card the next day. */
export const dynamic = "force-dynamic";

export default function Pricing() {
  return (
    <SitePage kind="lit" route={[0.56, 0.72]} className={`${litFonts} ${fraunces.variable}`}>
      <PricingPage {...pricingData(new Date().toISOString().slice(0, 10))} />
    </SitePage>
  );
}
