import { redirect } from "next/navigation";
import SitePage from "@/components/site/SitePage";
import { litFonts } from "@/components/site/home/fonts";
import Paid from "@/components/site/reserve/Paid";
import PayStage from "@/components/site/reserve/PayStage";
import { ROUTES } from "@/components/site/routes";
import { MARCH_PROGRAM as MP, formatPrice } from "@/lib/marketing/offer";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import { openPrograms } from "@/lib/reserve/programs";
import { paymentFor, referenceOf } from "@/lib/reserve/service";
import { openSeatWay, seatPaid } from "../actions";

export const metadata = { title: "Karman Prep: Payment", robots: { index: false } };
export const dynamic = "force-dynamic";

const W = RESERVE.payPage;

/** Our own payment page for a reserved seat (founder, 2026-11-14): Stripe's fields inside our page, with
 *  the one-tap ways to pay first. Reached from the last step of Reserve a seat. Once the seat is paid
 *  the same address shows "paid" and the way on (founder, 2026-11-25); a way of paying that leaves the
 *  site comes back here with ?s=, the checkout Stripe says was finished. */
export default async function ReservePayPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; s?: string }>;
}) {
  const { id = "", s = "" } = await searchParams;
  const pay = await paymentFor(id, s);
  if (!pay) redirect(ROUTES.reserve);
  const { seat } = pay;
  const deposit = seat.payment_option === "installments";
  const month = openPrograms("2000-01-01").find((p) => p.id === seat.program_id)?.month;
  const what = month ? W.what.replace("{month}", month) : W.whatOpen;
  const amount = formatPrice(deposit ? MP.depositAmount : MP.price);
  const paid = {
    name: seat.student_first_name ?? "",
    what,
    amount,
    reference: referenceOf(seat.id),
    email: seat.parent_email,
    next: `/reserve/welcome?r=${seat.claim_token}`,
  };
  return (
    <SitePage kind="lit" bare noTheme route={[0.3, 0.42]} className={litFonts}>
      <section className="pg-hero gq rs-page" id="top">
        <div className="mist" aria-hidden="true" />
        {pay.state === "open" ? (
          <PayStage
            flow="reserve"
            settle={seatPaid.bind(null, seat.id)}
            openWay={openSeatWay.bind(null, seat.id)}
            clientSecret={pay.clientSecret}
            cardSecret={pay.cardSecret}
            publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
            back={`${ROUTES.reserve}?back=${seat.id}`}
            title={W.title.replace("{name}", seat.student_first_name ?? "")}
            what={what}
            amount={amount}
            price={formatPrice(MP.price)}
            later={
              deposit
                ? {
                    label: W.later.replace("{count}", String(MP.installments.count)),
                    each: W.each.replace("{each}", formatPrice(MP.installments.amount)),
                  }
                : null
            }
            includes={MP.includes.map((i) => i.title)}
            promise={RESERVE.pay.promise}
            ways={pay.ways}
            paid={paid}
          />
        ) : (
          <Paid {...paid} state={pay.state} />
        )}
      </section>
    </SitePage>
  );
}
