// Terms of Service. Every price, date and guarantee term is rendered from offer.ts, never retyped, and the
// words are kept plain so a parent can read them. Lines the lawyer still has to settle are marked CONFIRM.
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
// CONFIRM: governing law and venue, kept from the previous terms.
const GOVERNING_LAW = "the laws of the State of Texas, United States";
const VENUE = "the courts of Travis County, Texas";
// CONFIRM: notice periods and the liability cap, kept from the previous terms.
const PRICE_NOTICE_DAYS = 30;
const CHANGE_NOTICE_DAYS = 14;
const LIABILITY_MONTHS = 3;

export const metadata = pageMeta(
  ROUTES.terms,
  "Karman Prep: Terms of Service",
  "The terms for every Karman plan: Free, Platform and Plus, the SAT Program, Private 10 and 20, and School licenses. Paying, cancelling and the guarantee."
);

const monthly = PRACTICE_PLANS.filter((p) => p.billing === "month");
const [p10, p20] = PRIVATE_PACKAGES;

function Mail({ to }: { to: string }) {
  return <a href={`mailto:${to}`}>{to}</a>;
}

export default function TermsPage() {
  return (
    <SitePage kind="inner">
      <article className="legal">
        <header>
          <h1>Terms of Service</h1>
          <p>
            Effective <time dateTime={EFFECTIVE.iso}>{EFFECTIVE.label}</time>. These terms cover
            karmanprep.com and the Karman platform. By creating an account, enrolling a student or
            paying for a plan, you agree to them and to the{" "}
            <a href={ROUTES.privacy}>Privacy Policy</a>. If you don&apos;t agree, don&apos;t use
            Karman.
          </p>
        </header>

        <section id="who">
          <h2>Who Karman is for</h2>
          <ul>
            <li>
              <span>
                Karman is for students preparing for the SAT, and for the parents, tutors and
                schools around them. Each has their own account.
              </span>
            </li>
            <li>
              <span>
                A student under 18 uses Karman with a parent or guardian&apos;s permission. The
                parent or guardian is the one who agrees to these terms and pays.
              </span>
            </li>
            <li>
              <span>Students under 13 may not use Karman.</span>
            </li>
          </ul>
        </section>

        <section id="plans">
          <h2>The plans</h2>
          <p>
            Every price is in US dollars, and the price you see is the whole price. What each plan
            includes is on the <a href={ROUTES.pricing}>pricing page</a>.
          </p>
          <h3>Free, Platform and Plus</h3>
          <p>
            Free costs nothing.{" "}
            {monthly.map((p) => `${p.name} is ${$(p.price)} a month`).join(" and ")}. Both bill
            monthly until you cancel. Cancel any time: the plan stays open to the end of the month
            you have paid for, then stops. None of the three carries the guarantee.
          </p>
          <h3>The SAT Program</h3>
          <p>
            Each program ends on one SAT date. {MP.name} runs from {MP.startLabel} to the SAT on{" "}
            {MP.testDateLabel}. It costs {$(MP.price)} at the founding price; later programs are{" "}
            {$(MP.regularPrice)}. You can pay in full or in {MP.installments.count} payments of{" "}
            {$(MP.installments.amount)}. A {$(MP.depositAmount)} deposit holds the seat and is
            refundable. The program carries the guarantee.
          </p>
          <h3>Private 10 and Private 20</h3>
          <p>
            {p10.name} is {p10.hours} hours for {$(p10.price)}. {p20.name} is {p20.hours} hours for{" "}
            {$(p20.price)}. Sessions are 60 minutes with a Karman tutor, and the student books each
            one. The guarantee covers {p20.name} only.
          </p>
          <h3>School licenses</h3>
          <p>
            {$(SCHOOL_PLAN.pricePerStudentPerYear)} per student a year, {SCHOOL_PLAN.term}. A school
            signs its own license agreement; where that agreement and these terms differ, the
            agreement wins. School licenses carry no guarantee.
          </p>
        </section>

        <section id="paying">
          <h2>Paying and cancelling</h2>
          <ul>
            <li>
              <span>Stripe handles every payment. Karman never sees your card number.</span>
            </li>
            <li>
              <span>
                Monthly plans renew each month until you cancel, from the Billing page of your
                account or by email to <Mail to={CONTACT.support} />. Cancelling stops the next
                charge. It doesn&apos;t refund the current month.
              </span>
            </li>
            <li>
              <span>
                If you pay for the SAT Program in installments, each one is due on the date shown at
                checkout. The guarantee needs every installment paid on time.
              </span>
            </li>
            <li>
              <span>
                Prices can change. A change never applies to a program you have already enrolled in,
                and a monthly plan&apos;s price changes only after Karman has emailed you{" "}
                {PRICE_NOTICE_DAYS} days ahead.
              </span>
            </li>
            <li>
              <span>
                What comes back when you cancel, leave a program or claim the guarantee is in the{" "}
                <a href={ROUTES.refunds}>Refund Policy</a>.
              </span>
            </li>
          </ul>
        </section>

        <section id="live">
          <h2>Live classes and sessions</h2>
          <ul>
            <li>
              <span>Classes, sessions and the free practice test are live on Zoom.</span>
            </li>
            <li>
              <span>
                Private sessions are booked by the student from their account. If the scheduled
                tutor is unavailable, another Karman tutor may take a class or session.
              </span>
            </li>
            <li>
              <span>
                Live classes and workshops are recorded for the students in the program. Private
                sessions are transcribed so the tutor can write the note to parents after each one.
                Students and parents may not record a class or session themselves.
              </span>
            </li>
          </ul>
        </section>

        <section id="guarantee">
          <h2>The guarantee</h2>
          <p>
            The guarantee covers the SAT Program and {p20.name} only. It promises +{G.points} points
            or a {G.orScore} on the official SAT, measured against {G.baseline}. It applies when:
          </p>
          <ul>
            {G.eligibility.map((rule) => (
              <li key={rule}>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <p>
            Every rule is on the <a href={ROUTES.guarantee}>guarantee page</a>, and what comes back
            is in the <a href={ROUTES.refunds}>Refund Policy</a>.
          </p>
        </section>

        <section id="account">
          <h2>Your account and what&apos;s not allowed</h2>
          <ul>
            <li>
              <span>One person, one account. Don&apos;t share a login.</span>
            </li>
            <li>
              <span>
                Karman&apos;s questions, explanations, lessons, recordings, drawings and software
                belong to Karman or its licensors. Use them for your student&apos;s own study.
                Don&apos;t copy, share, sell or scrape them.
              </span>
            </li>
            <li>
              <span>
                Treat tutors, Karman staff and other students with respect. Karman may close an
                account that breaks these terms.
              </span>
            </li>
            <li>
              <span>
                SAT is a registered trademark of the College Board, which is not affiliated with
                Karman and does not endorse it.
              </span>
            </li>
          </ul>
        </section>

        <section id="promises">
          <h2>What Karman doesn&apos;t promise</h2>
          <ul>
            <li>
              <span>
                Karman promises a score only through the guarantee, as written above and on the
                guarantee page. Outside it, no score is promised.
              </span>
            </li>
            <li>
              <span>
                Karman isn&apos;t responsible for the College Board&apos;s decisions, a cancelled
                test date, an internet outage or anything else outside its control. The guarantee
                says what happens when a test date is cancelled.
              </span>
            </li>
            <li>
              <span>
                The platform is provided as it is. To the extent the law allows, Karman&apos;s total
                liability for any claim is limited to what you paid Karman in the {LIABILITY_MONTHS}{" "}
                months before the claim.
              </span>
            </li>
          </ul>
        </section>

        <section id="law">
          <h2>Governing law</h2>
          <p>
            These terms are governed by {GOVERNING_LAW}. Any dispute is heard in {VENUE}.
          </p>
        </section>

        <section id="changes">
          <h2>Changes to these terms</h2>
          <p>
            Karman may update these terms. Account holders get an email at least{" "}
            {CHANGE_NOTICE_DAYS} days before a material change takes effect. The date at the top is
            the version you are reading.
          </p>
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p>
            Questions about these terms: <Mail to={CONTACT.general} />. Your account or a payment:{" "}
            <Mail to={CONTACT.support} />.
          </p>
        </section>

        <p>
          Read with the <a href={ROUTES.privacy}>Privacy Policy</a>, the{" "}
          <a href={ROUTES.cookies}>Cookie Policy</a>, the <a href={ROUTES.refunds}>Refund Policy</a>{" "}
          and <a href={ROUTES.guarantee}>the guarantee</a>.
        </p>
      </article>
    </SitePage>
  );
}
