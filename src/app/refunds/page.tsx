import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { GUARANTEE_POLICY } from "@/lib/guarantee/policy";

export const metadata: Metadata = {
  title: "Refund Policy — Karman Prep",
  description:
    "Refund and cancellation information for Karman Prep, including the tier-specific trial and prospective course-fee protections.",
};

export default function RefundsPage() {
  const trialTiers = GUARANTEE_POLICY.trial.eligibleTierIds;
  const seminarHasTrial = trialTiers.includes("group");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface dark:bg-night">
        <header className="bg-gradient-to-b from-surface to-white px-4 pb-12 pt-24 text-center dark:from-surface dark:to-night">
          <div className="mx-auto max-w-2xl">
            <h1 className="mb-4 font-plex-serif text-4xl text-ivory sm:text-5xl">
              Refund and cancellation information
            </h1>
            <p className="text-base text-taupe">
              For billing questions, contact{" "}
              <a className="text-info underline" href={`mailto:${GUARANTEE_POLICY.supportEmail}`}>
                {GUARANTEE_POLICY.supportEmail}
              </a>
              . Your purchase-time terms remain in effect.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
          <section className="glass-card space-y-3 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ivory">Trial on new checkouts</h2>
            <p className="leading-relaxed text-taupe">
              A {GUARANTEE_POLICY.trial.days}-day trial is included only with the{" "}
              {seminarHasTrial ? "Seminar (Group)" : "specifically listed eligible tier"} on new
              checkouts. Other tiers do not receive a trial. The checkout page must show the
              applicable terms before you pay. This change does not alter any existing subscription,
              purchase, or balance.
            </p>
            <p className="leading-relaxed text-taupe">
              Follow the cancellation instructions in your purchase confirmation or account. For
              help, email{" "}
              <a className="text-info underline" href={`mailto:${GUARANTEE_POLICY.supportEmail}`}>
                {GUARANTEE_POLICY.supportEmail}
              </a>
              . No additional refund window is promised by this page.
            </p>
          </section>

          <section className="glass-card space-y-3 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ivory">Prospective course-fee protection</h2>
            <p className="leading-relaxed text-taupe">
              The {GUARANTEE_POLICY.outcome.instructionalWeeks}-week policy applies only to a
              specifically identified qualifying one-to-one SAT offer with a positive online-course
              fee separately shown and paid. It is not a fixed score-increase promise and does not
              refund tutoring, test, or other service fees. Current standard checkout offers are not
              configured as eligible.
            </p>
            <Link href="/guarantee" className="inline-flex items-center gap-2 text-info underline">
              Read the full prospective policy
            </Link>
          </section>

          <section className="glass-card space-y-3 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ivory">First-session fit option</h2>
            <p className="leading-relaxed text-taupe">
              This option applies only if the written purchase terms explicitly include it and
              separately disclose the paid first-session amount. It requires contacting Karman
              within {GUARANTEE_POLICY.firstSessionFit.requestWindowHours} hours after the first
              paid session and before a second paid session. See the full policy for the one-time
              replacement-or-refund choices.
            </p>
          </section>

          <section className="rounded-2xl border border-bronze p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ivory">Previously purchased plans</h2>
            <p className="mt-3 leading-relaxed text-taupe">
              These prospective terms do not replace or reduce terms attached to an earlier
              purchase. If your confirmation or account shows different terms, contact billing so
              the purchase record can be reviewed.
            </p>
          </section>

          <div className="pt-2 text-center">
            <Link href="/terms" className="text-sm text-info underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
