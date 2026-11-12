import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import PrivateLab from "@/components/site/private/PrivateLab";
import { heroDesigns } from "@/components/site/private/PrivateHeroes";
import { pricingDesigns } from "@/components/site/private/PrivatePricing";
import { calendarDesigns, closeDesigns } from "@/components/site/private/PrivateRest";
import { ROUTES } from "@/components/site/routes";
import { formatPrice, PRIVATE_PACKAGES } from "@/lib/marketing/offer";

export const metadata = pageMeta(
  ROUTES.private,
  "Karman Prep: Private tutoring",
  `One-on-one SAT tutoring at the hours you choose, with a promised score gain in writing. ${PRIVATE_PACKAGES.map((p) => `${p.hours} sessions for ${formatPrice(p.price)}`).join(", or ")}.`
);

/* In the home page's world, flying the high valleys at sunset. While the founder chooses, each of its four
   sections comes in five designs (PrivateLab.tsx). The date is read per request so the booking calendar
   always starts from today. */
export const dynamic = "force-dynamic";

export default function PrivatePage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <SitePage kind="lit" route={[0.5, 0.86]} className={litFonts}>
      <PrivateLab
        sections={[
          { name: "Opening", options: heroDesigns() },
          { name: "Calendar", options: calendarDesigns(today) },
          { name: "Pricing", options: pricingDesigns() },
          { name: "Close", options: closeDesigns() },
        ]}
      />
    </SitePage>
  );
}
