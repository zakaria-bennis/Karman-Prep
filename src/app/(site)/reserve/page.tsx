import { redirect } from "next/navigation";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import { pageMeta } from "@/components/site/meta";
import ReserveForm from "@/components/site/reserve/ReserveForm";
import { ROUTES } from "@/components/site/routes";
import { MARCH_PROGRAM as MP, formatPrice } from "@/lib/marketing/offer";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import { reserveProfile } from "@/lib/reserve/buyer";
import { openPrograms } from "@/lib/reserve/programs";
import { openReservation } from "@/lib/reserve/service";

export const metadata = pageMeta(
  ROUTES.reserve,
  "Karman Prep: Reserve a seat",
  `Reserve a seat in the ${MP.weeks}-week SAT cohort: ${formatPrice(MP.price)}, or a ${formatPrice(MP.depositAmount)} deposit and ${MP.installments.count} payments of ${formatPrice(MP.installments.amount)}.`
);

// the cohorts on offer depend on today's date, and the form on who is signed in
export const dynamic = "force-dynamic";

/** Reserve and pay for a cohort seat, in a few short steps (founder, 2026-11-13). The account comes
 *  first (founder, 2026-11-25: nobody pays before they have one): a visitor who is not signed in makes
 *  an account and comes straight back here. */
export default async function ReservePage() {
  const me = await reserveProfile();
  if (!me) redirect(`/auth/sign-up?redirect_url=${encodeURIComponent(ROUTES.reserve)}`);
  const seat = await openReservation(me.clerkId);
  return (
    <SitePage kind="lit" noTheme route={[0.3, 0.42]} className={litFonts}>
      <section className="pg-hero gq rs-page" id="top" aria-label={RESERVE.title}>
        <div className="mist" aria-hidden="true" />
        <ReserveForm
          programs={openPrograms(new Date().toISOString().slice(0, 10))}
          me={{
            who: me.who,
            firstName: me.firstName,
            fullName: me.fullName,
            satDate: me.satDate,
          }}
          open={
            seat
              ? {
                  id: seat.id,
                  who: seat.filled_by,
                  email: seat.parent_email,
                  name: seat.parent_name ?? "",
                  student: seat.student_first_name ?? "",
                  phone: seat.parent_phone ?? "",
                  program: seat.program_id ?? "",
                }
              : null
          }
        />
      </section>
    </SitePage>
  );
}
