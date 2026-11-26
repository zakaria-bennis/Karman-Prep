// The payment is made (founder, 2026-11-25: straight to a screen that says so, with one way on).
// Shown by the payment page the moment Stripe confirms, and again whenever that page is opened for a
// seat already paid. "Get started" opens the seat's own page (/reserve/welcome). A bank payment is the
// one case that cannot be "paid" yet: it says the seat is held and when the family hears from us.
// A renewing plan uses the same screen (/checkout/pay), with its own title and the portal as the way on.
// Words: reserve-copy.ts (payPage.paid). Styles: styles/pay.css. The fox and the confetti: private.css.
import FoxCheer, { Confetti } from "@/components/site/private/FoxCheer";
import { RESERVE } from "@/lib/marketing/reserve-copy";

const W = RESERVE.payPage.paid;

export interface PaidProps {
  state: "paid" | "clearing";
  /** The student's first name. */
  name: string;
  /** The whole title, when it is not a seat: "Paid. You're on Pro." */
  title?: string;
  /** The same for a plan paid from a bank, which takes a few days to arrive: its title and its line. */
  clearing?: { title: string; text: string };
  /** "The 9-week SAT cohort, March" */
  what: string;
  /** What was paid today: "$995". */
  amount: string;
  /** "A1B2C3D4". A plan has none to show. */
  reference?: string;
  /** Where the confirmation went. Left out when this page cannot promise one. */
  email?: string;
  /** The seat's own page, or the portal. */
  next: string;
}

export default function Paid({
  state,
  name,
  title,
  clearing,
  what,
  amount,
  reference,
  email,
  next,
}: PaidProps) {
  const say = (t: string) => t.replace("{name}", name).replace("{email}", email ?? "");
  const paid = state === "paid";
  return (
    <div className="gq-card pp-paid" role="status">
      {paid ? <Confetti /> : null}
      <FoxCheer />
      <h1>{paid && title ? title : (clearing?.title ?? say(paid ? W.title : W.clearingTitle))}</h1>
      <dl className="pp-bill">
        <div>
          <dt>{what}</dt>
          <dd className="num">{paid ? amount : ""}</dd>
        </div>
        {paid ? (
          <div className="pp-total">
            <dt>{W.amount}</dt>
            <dd className="num">{amount}</dd>
          </div>
        ) : null}
        {reference ? (
          <div>
            <dt>{W.reference}</dt>
            <dd className="num">{reference}</dd>
          </div>
        ) : null}
      </dl>
      {!paid && clearing ? (
        <p className="pp-sent">{clearing.text}</p>
      ) : email ? (
        <p className="pp-sent">{say(paid ? W.sent : W.clearingText)}</p>
      ) : null}
      {paid || clearing ? (
        <a className="btn pp-go" href={next} suppressHydrationWarning>
          <span className="lb">{W.button}</span>
        </a>
      ) : null}
    </div>
  );
}
