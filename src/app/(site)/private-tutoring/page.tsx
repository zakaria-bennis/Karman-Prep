import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import PrivateSections from "@/components/site/private/PrivateSections";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { formatPrice, PRIVATE_PACKAGES } from "@/lib/marketing/offer";

export const metadata = pageMeta(
  ROUTES.private,
  "Karman Prep: Private tutoring",
  `One-on-one SAT tutoring: weekly 60-minute sessions that go through every mistake. ${PRIVATE_PACKAGES.map((p) => `${p.hours} hours for ${formatPrice(p.price)}`).join(" or ")}, both with the guarantee.`
);

/* In the home page's world, flying the high valleys at sunset. Its sections are in PrivateSections.tsx. */
export default function PrivatePage() {
  return (
    <SitePage kind="lit" route={[0.5, 0.86]} className={litFonts}>
      <PrivateSections />
    </SitePage>
  );
}
