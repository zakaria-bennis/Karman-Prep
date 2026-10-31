import Link from "next/link";
import SitePage from "@/components/site/SitePage";
import { pageMeta } from "@/components/site/meta";
import { ROUTES } from "@/components/site/routes";
import { GUARANTEE_POLICY } from "@/lib/guarantee/policy";

export const metadata = pageMeta(
  ROUTES.refunds,
  "Karman Prep: Refund Policy",
  "Refund and cancellation information for Karman Prep, including the tier-specific trial and prospective course-fee protections."
);

export default function RefundsPage() {
  const trialTiers = GUARANTEE_POLICY.trial.eligibleTierIds;
  const seminarHasTrial = trialTiers.includes("group");

  return (
    <SitePage kind="inner">
      <article className="legal">
        <header>
          <div>
            <h1>Refund and cancellation information</h1>
            <p>
              For billing questions, contact{" "}
              <a href={`mailto:${GUARANTEE_POLICY.supportEmail}`}>
                {GUARANTEE_POLICY.supportEmail}
              </a>
              . Your purchase-time terms remain in effect.
            </p>
          </div>
        </header>

        <div>
          <section>
            <h2>Trial on new checkouts</h2>
            <p>
              A {GUARANTEE_POLICY.trial.days}-day trial is included only with the{" "}
              {seminarHasTrial ? "Seminar (Group)" : "specifically listed eligible tier"} on new
              checkouts. Other tiers do not receive a trial. The checkout page must show the
              applicable terms before you pay. This change does not alter any existing subscription,
              purchase, or balance.
            </p>
            <p>
              Follow the cancellation instructions in your purchase confirmation or account. For
              help, email{" "}
              <a href={`mailto:${GUARANTEE_POLICY.supportEmail}`}>
                {GUARANTEE_POLICY.supportEmail}
              </a>
              . No additional refund window is promised by this page.
            </p>
          </section>

          <section>
            <h2>Prospective course-fee protection</h2>
            <p>
              The {GUARANTEE_POLICY.outcome.instructionalWeeks}-week policy applies only to a
              specifically identified qualifying one-to-one SAT offer with a positive online-course
              fee separately shown and paid. It is not a fixed score-increase promise and does not
              refund tutoring, test, or other service fees. Current standard checkout offers are not
              configured as eligible.
            </p>
            <Link href="/guarantee">Read the full prospective policy</Link>
          </section>

          <section>
            <h2>First-session fit option</h2>
            <p>
              This option applies only if the written purchase terms explicitly include it and
              separately disclose the paid first-session amount. It requires contacting Karman
              within {GUARANTEE_POLICY.firstSessionFit.requestWindowHours} hours after the first
              paid session and before a second paid session. See the full policy for the one-time
              replacement-or-refund choices.
            </p>
          </section>

          <section>
            <h2>Previously purchased plans</h2>
            <p>
              These prospective terms do not replace or reduce terms attached to an earlier
              purchase. If your confirmation or account shows different terms, contact billing so
              the purchase record can be reviewed.
            </p>
          </section>

          <div>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
      </article>
    </SitePage>
  );
}
