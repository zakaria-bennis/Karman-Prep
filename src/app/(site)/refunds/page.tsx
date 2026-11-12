import SitePage from "@/components/site/SitePage";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import {
  CONTACT,
  formatPrice as $,
  GUARANTEE as G,
  MARCH_PROGRAM as MP,
  PLAN_RENEWAL,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  SCHOOL_PLAN,
  TUTOR_AFFILIATE_PLAN as TA,
} from "@/lib/marketing/offer";

export const metadata = pageMeta(
  ROUTES.refunds,
  "Karman Prep: Refund Policy",
  `Refunds and cancellation at Karman Prep: ${PRACTICE_PLAN.name} and ${PRO_PLAN.name}, the ${$(MP.price)} cohort and its deposit, private tutoring, school licenses and tutor affiliates.`
);

const [P10, P20] = PRIVATE_PACKAGES;
const bonus = G.private.packages;
/** Half a package price, with cents: "$747.50". */
const halfOf = (price: number) =>
  `$${(price / 2).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function RefundsPage() {
  return (
    <SitePage kind="inner">
      <article className="legal">
        <header>
          <div>
            <h1>Refund and cancellation information</h1>
            <p>
              For billing questions, write to{" "}
              <a href={`mailto:${CONTACT.billing}`}>{CONTACT.billing}</a>. Your purchase-time terms
              remain in effect.
            </p>
          </div>
        </header>

        <div>
          <section>
            <h2>
              {PRACTICE_PLAN.name} and {PRO_PLAN.name}
            </h2>
            <p>
              {PRACTICE_PLAN.name} is {$(PRACTICE_PLAN.monthly)} a month or{" "}
              {$(PRACTICE_PLAN.threeMonths)} for 3 months. {PRO_PLAN.name} is {$(PRO_PLAN.monthly)}{" "}
              a month or {$(PRO_PLAN.threeMonths)} for 3 months. {PLAN_RENEWAL} The time you have
              already paid for is not refunded. There is no free trial; the Free plan is the way to
              try Karman first.
            </p>
          </section>

          <section>
            <h2>The {MP.planName}</h2>
            <p>
              The cohort is {$(MP.price)}, paid in full or with a {$(MP.depositAmount)} deposit and{" "}
              {MP.installments.count} payments of {$(MP.installments.amount)}. The deposit is part
              of the {$(MP.price)}, not extra, and it is refunded in full if you cancel before the
              first class.
            </p>
            <p>
              After classes start, the guarantee decides any refund: half or all of the price back,
              or the next cohort free, depending on the SAT score. You choose.
            </p>
            <a href={ROUTES.guarantee}>Read the guarantee in full</a>
          </section>

          <section>
            <h2>Private tutoring</h2>
            <p>
              {P10.name} ({P10.hours} hours, {$(P10.price)}) and {P20.name} ({P20.hours} hours,{" "}
              {$(P20.price)}) are paid before the first session. Both carry the guarantee: if every
              requirement is met and the SAT misses the target, the family chooses: on {P10.name},
              half the price back ({halfOf(P10.price)}) or {bonus[P10.id].freeSessions} free
              sessions; on {P20.name}, half the price back ({halfOf(P20.price)}) or{" "}
              {bonus[P20.id].freeSessions} free sessions. A session cancelled with less than{" "}
              {G.private.cancelHours} hours&apos; notice counts as a used session. A session beyond
              the package is {halfOf(G.private.extraSessionPrice * 2)}.
            </p>
          </section>

          <section>
            <h2>School licenses</h2>
            <p>
              The first year is free. After that, a school is invoiced{" "}
              {$(SCHOOL_PLAN.pricePerStudentPerYear)} per student a year, and every student gets a{" "}
              {PRACTICE_PLAN.name} plan of their own.
            </p>
          </section>

          <section>
            <h2>{TA.name}</h2>
            <p>
              {$(TA.monthly)} a month per tutor. Cancel any time from Billing; the plan runs to the
              end of the month you paid for, and then your students&apos; free {PRACTICE_PLAN.name}{" "}
              plans end too.
            </p>
          </section>

          <section>
            <h2>Previously purchased plans</h2>
            <p>
              These terms do not replace or reduce terms attached to an earlier purchase. If your
              confirmation or account shows different terms, contact billing so the purchase record
              can be reviewed.
            </p>
          </section>

          <div>
            <a href={ROUTES.terms}>Terms of Service</a>
          </div>
        </div>
      </article>
    </SitePage>
  );
}
