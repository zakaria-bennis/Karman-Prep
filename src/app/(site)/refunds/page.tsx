// Refund Policy. What comes back, plan by plan: the deposit, the SAT Program and its guarantee, Private 10
// and 20, the monthly plans and School licenses. Every number is rendered from offer.ts; lines the lawyer
// still has to settle are marked CONFIRM.
import SitePage from "@/components/site/SitePage";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import {
  CONTACT,
  formatPrice as $,
  GUARANTEE as G,
  MARCH_PROGRAM as MP,
  PRACTICE_PLANS,
  PRIVATE_PACKAGES,
  SCHOOL_PLAN,
} from "@/lib/marketing/offer";

// CONFIRM: the effective date waits on the lawyer's review of this page.
const EFFECTIVE = { iso: "2026-10-31", label: "October 31, 2026" } as const;
// CONFIRM: offer.ts only says the deposit is refundable, not until when. Until the founder decides, the page
// says it is refundable and sends the family to support@. The same goes for leaving a program before the SAT
// and for unused Private hours: neither is defined in offer.ts, so the page points to support@ instead of
// inventing a rule.

export const metadata = pageMeta(
  ROUTES.refunds,
  "Karman Prep: Refund Policy",
  `What comes back, plan by plan: the ${$(MP.depositAmount)} deposit, the SAT Program and its guarantee, Private 10 and 20, the monthly plans and School licenses.`
);

const monthly = PRACTICE_PLANS.filter((p) => p.billing === "month");
const [p10, p20] = PRIVATE_PACKAGES;
/** The claim sentence from offer.ts, with its email address turned into a link. */
const [claimBefore, claimAfter = ""] = G.claim.split(G.claimEmail);

function Mail({ to }: { to: string }) {
  return <a href={`mailto:${to}`}>{to}</a>;
}

export default function RefundsPage() {
  return (
    <SitePage kind="inner">
      <article className="legal">
        <header>
          <h1>Refund Policy</h1>
          <p>
            Effective <time dateTime={EFFECTIVE.iso}>{EFFECTIVE.label}</time>. What comes back, plan
            by plan. A refund goes back to the payment method you used, and nothing is taken out of
            it.
          </p>
        </header>

        <section id="deposit">
          <h2>The deposit</h2>
          <p>
            A {$(MP.depositAmount)} deposit holds a seat in the SAT Program. It is refundable: email{" "}
            <Mail to={CONTACT.support} /> and Karman sends it back.
          </p>
        </section>

        <section id="program">
          <h2>The SAT Program</h2>
          <p>
            {MP.name} costs {$(MP.price)} at the founding price; later programs are{" "}
            {$(MP.regularPrice)}. You can pay in full or in {MP.installments.count} payments of{" "}
            {$(MP.installments.amount)}. If your student needs to leave the program before the SAT,
            email <Mail to={CONTACT.support} /> and Karman looks at it with you.
          </p>
          <h3>What the guarantee pays back</h3>
          <p>
            The program promises +{G.points} points or a {G.orScore} on the official SAT. After the
            scores come out, the result decides what comes back. You choose between money and a
            seat.
          </p>
          <ul>
            {G.outcomes.map((o) => (
              <li key={o.result}>
                <span>
                  <b>{o.result}:</b> {o.remedy}
                </span>
              </li>
            ))}
          </ul>
          <h3>What the guarantee needs</h3>
          <ul>
            {[...G.eligibility, ...G.requirements].map((rule) => (
              <li key={rule}>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <h3>How to claim</h3>
          <p>
            {claimBefore}
            <Mail to={G.claimEmail} />
            {claimAfter} One email, with the report attached.
          </p>
        </section>

        <section id="private">
          <h2>
            {p10.name} and {p20.name}
          </h2>
          <p>
            {p10.name} is {p10.hours} hours for {$(p10.price)}. {p20.name} is {p20.hours} hours for{" "}
            {$(p20.price)}. The student books each session.
          </p>
          <p>
            {p20.name} carries the guarantee: +{G.private20.points} points or a{" "}
            {G.private20.orScore} on the official SAT. If the score falls short:{" "}
            {G.private20.remedy} It needs:
          </p>
          <ul>
            {G.private20.requirements.map((rule) => (
              <li key={rule}>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <p>
            {p10.name} carries no guarantee. For anything else about a package, including hours your
            student hasn&apos;t used, email <Mail to={CONTACT.support} />.
          </p>
        </section>

        <section id="monthly">
          <h2>Free, Platform and Plus</h2>
          <p>
            Free costs nothing.{" "}
            {monthly.map((p) => `${p.name} (${$(p.price)} a month)`).join(" and ")} bill monthly
            until you cancel. Cancel any time from the Billing page of your account or by email: the
            plan stays open to the end of the month you have paid for, then stops. There is no
            refund for the rest of a month, and no guarantee on either plan.
          </p>
        </section>

        <section id="school">
          <h2>School licenses</h2>
          <p>
            {$(SCHOOL_PLAN.pricePerStudentPerYear)} per student a year, {SCHOOL_PLAN.term}. Refunds
            follow the school&apos;s license agreement.
          </p>
        </section>

        <section id="ask">
          <h2>How to ask</h2>
          <p>
            Email <Mail to={CONTACT.support} /> from the address on the account, with the
            student&apos;s name and what you paid for. Guarantee claims go to{" "}
            <Mail to={G.claimEmail} /> with the official score report.
          </p>
        </section>

        <p>
          Read with the <a href={ROUTES.terms}>Terms of Service</a> and{" "}
          <a href={ROUTES.guarantee}>the guarantee</a>.
        </p>
      </article>
    </SitePage>
  );
}
