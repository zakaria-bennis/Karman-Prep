import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import PrivateSections from "@/components/site/private/PrivateSections";
import { ROUTES } from "@/components/site/routes";
import { formatPrice, PRIVATE_PACKAGES } from "@/lib/marketing/offer";

export const metadata = pageMeta(
  ROUTES.private,
  "Karman Prep: Private tutoring",
  `One-on-one SAT tutoring at the hours you choose, with a promised score gain in writing. ${PRIVATE_PACKAGES.map((p) => `${p.hours} sessions for ${formatPrice(p.price)}`).join(", or ")}.`
);

/* In the home page's world, flying the high valleys at sunset. The date is read per request so the booking
   demo and the call form always start from today. */
export const dynamic = "force-dynamic";

export default function PrivatePage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <SitePage kind="lit" route={[0.5, 0.86]} className={litFonts}>
      <PrivateSections today={today} />
    </SitePage>
  );
}
