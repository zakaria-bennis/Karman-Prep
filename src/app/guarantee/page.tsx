import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { GUARANTEE_POLICY } from "@/lib/guarantee/policy";

export const metadata: Metadata = {
  title: "Course-Fee Protection — Karman Prep",
  description:
    "Terms for Karman's prospective 12-week SAT one-to-one course-fee protection and first-session fit option.",
};

const MAILTO = `mailto:${GUARANTEE_POLICY.supportEmail}`;

export default function GuaranteePage() {
  const { outcome, firstSessionFit } = GUARANTEE_POLICY;
  const hasEligibleOutcomeOffer = outcome.eligibleOfferIds.length > 0;
  const hasEligibleFitOffer = firstSessionFit.eligibleOfferIds.length > 0;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface dark:bg-night">
        <header className="bg-gradient-to-b from-surface to-white px-4 pb-12 pt-24 text-center dark:from-surface dark:to-night">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              KARMAN PREP · POLICY {GUARANTEE_POLICY.version}
            </p>
            <h1 className="font-plex-serif text-4xl text-ivory sm:text-5xl">{outcome.title}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-taupe">
              This is protection for the separately itemized online-course fee on a qualifying
              one-to-one SAT plan. It is not a points promise and it does not refund tutoring fees,
              test fees, or other services.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
          <section
            aria-labelledby="availability-heading"
            className="rounded-2xl border border-warning/40 bg-warning/10 p-6 sm:p-8"
          >
            <h2 id="availability-heading" className="text-xl font-bold text-ivory">
              Availability for new purchases
            </h2>
            <p className="mt-3 leading-relaxed text-taupe">
              {hasEligibleOutcomeOffer
                ? "Only the specific offer IDs listed in the signed purchase terms are eligible."
                : "No current standard checkout offer is configured as eligible for the 12-week course-fee protection. Current plans are sold as a single tier charge and do not separately identify a positive online-course fee or a qualifying 12-week plan."}
            </p>
            <p className="mt-3 leading-relaxed text-taupe">
              Do not assume a plan is covered based on this policy page alone. Before buying, the
              offer must identify a qualifying 12-week one-to-one SAT plan and show the positive
              online-course fee separately after discounts. The purchase record must preserve that
              amount and the policy version. Existing purchases keep their purchase-time terms.
            </p>
          </section>

          <section aria-labelledby="outcome-heading" className="glass-card space-y-6 p-6 sm:p-8">
            <div>
              <h2 id="outcome-heading" className="font-plex-serif text-2xl text-ivory">
                When course-fee protection applies
              </h2>
              <p className="mt-2 leading-relaxed text-taupe">
                The only covered outcome is a first qualifying official SAT total that is equal to
                or below the qualifying baseline after completion of the covered plan. Any increase
                means this outcome refund does not apply. Karman makes no fixed-point score promise.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ivory">Baseline and eligibility</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-taupe">
                <li>
                  The student must enroll in a specifically identified {outcome.instructionalWeeks}
                  -week, one-to-one SAT plan with an agreed number of instructional hours and a
                  written workload plan supplied before teaching begins.
                </li>
                <li>
                  The baseline is the most recent official SAT total from a test taken within the{" "}
                  {outcome.baselineLookbackMonths} months before the first teaching date. It must be
                  supplied before teaching starts; without it, the offer is not eligible.
                  Eligibility must be disclosed before purchase. Practice tests, PSAT results, and
                  superscores do not count. A baseline of {outcome.excludedBaselineScore} is not
                  eligible.
                </li>
                <li>
                  Complete the full 12 instructional weeks and the one-to-one hours in the written
                  plan. Approved makeups count toward those hours.
                </li>
                <li>
                  Complete at least {outcome.homeworkCompletionPercent}% of required homework in
                  good faith by the agreed deadlines, plus every full-length test named in the
                  initial plan. Optional work is excluded; requirements cannot be added
                  retroactively.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-ivory">Fair pauses and exceptions</h3>
              <p className="mt-2 leading-relaxed text-taupe">
                Documented illness, emergency, disability, technical interruptions, or Karman
                outages and missed delivery will receive human review. We will make reasonable
                schedule, deadline, or workload adjustments; an outage or missed Karman delivery
                cannot by itself disqualify a student. Approved pauses extend deadlines without
                requiring another tutoring purchase. Disputes and exceptions are reviewed by a
                person, not automatically denied for missing paperwork.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-ivory">Qualifying SAT and claim timing</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-taupe">
                <li>
                  The qualifying test is the first official SAT after plan completion, normally
                  taken within {outcome.postPlanTestWindowDays} days. If no administration is
                  offered in that window or the registered test is cancelled, the next offered
                  administration qualifies. We compare the total score from one sitting; no
                  superscore is used.
                </li>
                <li>
                  Submit a claim within {outcome.claimWindowCalendarDays} calendar days after the
                  score becomes available, with official before-and-after score reports. A delayed
                  score release does not shorten the claim period. Timely notice preserves the claim
                  while genuinely missing documents are resolved.
                </li>
                <li>
                  Karman uses its attendance and work records. We acknowledge a claim within{" "}
                  {outcome.claimAcknowledgmentBusinessDays} business days and decide it, or ask for
                  specifically missing information, within{" "}
                  {outcome.claimDecisionBusinessDaysAfterComplete} business days after the claim is
                  complete. A decision includes the reason and a path to request human review.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-ivory">Refund amount</h3>
              <p className="mt-2 leading-relaxed text-taupe">
                If all requirements are met, the refund is limited to the actual online-course fee
                separately shown at purchase, net of discounts. Tutoring fees, test fees, and other
                services are excluded. A complimentary or unitemized course has no refundable
                course-fee value and is not covered. Course access ends only after a completed
                course-fee refund. There is one outcome claim per plan.
              </p>
            </div>

            <p className="border-t border-bronze pt-5 text-sm leading-relaxed text-taupe">
              To raise a claim or ask about eligibility, use the existing billing contact:{" "}
              <a className="text-info underline" href={MAILTO}>
                {GUARANTEE_POLICY.supportEmail}
              </a>
              . This contact route is not an automated claim form.
            </p>
          </section>

          <section aria-labelledby="fit-heading" className="glass-card space-y-4 p-6 sm:p-8">
            <h2 id="fit-heading" className="font-plex-serif text-2xl text-ivory">
              First-session fit option
            </h2>
            <p className="leading-relaxed text-taupe">
              For an explicitly covered group or private offer, contact Karman within{" "}
              {firstSessionFit.requestWindowHours} hours after the first paid teaching session ends,
              and before a second paid session. Choose one remedy: one free replacement session of
              up to {firstSessionFit.replacementMinutes} minutes in the same service format, or a
              refund of the first paid session amount. The remedies cannot be combined or repeated.
            </p>
            <p className="leading-relaxed text-taupe">
              For bundles, the first-session value must be disclosed before purchase. This narrow
              first-session option is separate from course-fee protection and is the only exception
              to the exclusion of tutoring fees. It is not a 48-hour waiting period; the request
              must be received within that time limit.
            </p>
            <p className="leading-relaxed text-taupe">
              {hasEligibleFitOffer
                ? "Only offers listed in the signed purchase terms include this option."
                : "No current standard checkout offer is configured to include this option. It applies only when the signed purchase terms explicitly identify it and separately disclose the paid first-session amount."}
            </p>
          </section>

          <p className="text-center text-sm text-taupe">
            See the{" "}
            <Link className="underline" href="/refunds">
              refund policy
            </Link>{" "}
            and{" "}
            <Link className="underline" href="/terms">
              terms of service
            </Link>
            . These prospective terms do not change an earlier purchase.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
