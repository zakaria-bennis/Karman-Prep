import PricingPlans from "@/components/site/PricingPlans";
import SitePage from "@/components/site/SitePage";
import { GuaranteeSection } from "@/components/site/inner";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import {
  formatPrice,
  GUARANTEE as G,
  MARCH_PROGRAM,
  PRACTICE_PLAN,
  PRO_PLAN,
} from "@/lib/marketing/offer";
import { SITE } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.pricing,
  "Karman Prep: pricing",
  `Every Karman price on one page: ${PRACTICE_PLAN.name} at ${formatPrice(PRACTICE_PLAN.monthly)} a month, ${PRO_PLAN.name} at ${formatPrice(PRO_PLAN.monthly)}, the live cohort at ${formatPrice(MARCH_PROGRAM.price)} and private tutoring, with the guarantee in full: +${G.pointsBelow} points, or +${G.pointsFrom} from ${G.splitAt}, or your money back.`
);

export default function PricingPage() {
  return (
    <SitePage kind="pricing" dock={[SITE["pricing program button"], `${ROUTES.program}#apply`]}>
      <PricingPlans
        guarantee={
          <GuaranteeSection
            override={{
              headline: SITE["pricing guarantee headline"],
              text: SITE["pricing guarantee text"],
            }}
          />
        }
      />
    </SitePage>
  );
}
