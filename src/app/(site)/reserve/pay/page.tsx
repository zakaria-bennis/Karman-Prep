import { redirect } from "next/navigation";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import PayStage from "@/components/site/reserve/PayStage";
import { ROUTES } from "@/components/site/routes";
import { MARCH_PROGRAM as MP, formatPrice } from "@/lib/marketing/offer";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import { openPrograms } from "@/lib/reserve/programs";
import { paymentFor } from "@/lib/reserve/service";

export const metadata = { title: "Karman Prep: Payment", robots: { index: false } };
export const dynamic = "force-dynamic";

const W = RESERVE.payPage;

/** Our own payment page for a reserved seat (founder, 2026-11-14): Stripe's fields inside our page, with
 *  the one-tap ways to pay first. Reached from the last step of Reserve a seat. */
export default async function ReservePayPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id = "" } = await searchParams;
  const pay = await paymentFor(id);
  if (!pay) redirect(ROUTES.reserve);
  if (pay.state === "paid") redirect(`/reserve/welcome?r=${pay.seat.claim_token}`);
  const { seat } = pay;
  const deposit = seat.payment_option === "installments";
  const month = openPrograms(new Date().toISOString().slice(0, 10)).find(
    (p) => p.id === seat.program_id
  )?.month;
  return (
    <SitePage kind="lit" bare route={[0.3, 0.42]} className={litFonts}>
      <section className="pg-hero gq rs-page" id="top">
        <div className="mist" aria-hidden="true" />
        <PayStage
          clientSecret={pay.clientSecret}
          publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
          back={`${ROUTES.reserve}?back=${seat.id}`}
          title={W.title.replace("{name}", seat.student_first_name ?? "")}
          what={month ? W.what.replace("{month}", month) : W.whatOpen}
          amount={formatPrice(deposit ? MP.depositAmount : MP.price)}
          note={
            deposit
              ? W.depositNote
                  .replace("{count}", String(MP.installments.count))
                  .replace("{each}", formatPrice(MP.installments.amount))
              : ""
          }
        />
      </section>
    </SitePage>
  );
}
