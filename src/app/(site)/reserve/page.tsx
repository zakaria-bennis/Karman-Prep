import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import ReserveForm from "@/components/site/reserve/ReserveForm";
import { ROUTES } from "@/components/site/routes";
import { MARCH_PROGRAM as MP, formatPrice } from "@/lib/marketing/offer";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import { openPrograms } from "@/lib/reserve/programs";

export const metadata = pageMeta(
  ROUTES.reserve,
  "Karman Prep: Reserve a seat",
  `Reserve a seat in the ${MP.weeks}-week SAT cohort: ${formatPrice(MP.price)}, or a ${formatPrice(MP.depositAmount)} deposit and ${MP.installments.count} payments of ${formatPrice(MP.installments.amount)}.`
);

// the cohorts on offer depend on today's date
export const dynamic = "force-dynamic";

/** Reserve and pay for a cohort seat, in four short steps (founder, 2026-11-13). */
export default function ReservePage() {
  return (
    <SitePage kind="lit" route={[0.3, 0.42]} className={litFonts}>
      <section className="pg-hero gq rs-page" id="top" aria-label={RESERVE.title}>
        <div className="mist" aria-hidden="true" />
        <ReserveForm programs={openPrograms(new Date().toISOString().slice(0, 10))} />
      </section>
    </SitePage>
  );
}
