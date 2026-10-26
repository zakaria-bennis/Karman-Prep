import PricingPlans from "@/components/site/PricingPlans";
import SitePage from "@/components/site/SitePage";
import { GuaranteeSection } from "@/components/site/inner";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { GUARANTEE as G } from "@/lib/marketing/offer";
import { SITE } from "@/lib/marketing/site-copy";

export const metadata = pageMeta(
  ROUTES.pricing,
  "Karman Prep: pricing",
  `Every Karman price on one page: the free practice test, the SAT Program and private tutoring, with the guarantee in full: +${G.points} points or a ${G.orScore}, or your money back.`
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
