"use client";

import { planSummary, type Recommendation } from "@/lib/onboarding/recommend-plan";
import { FINDER } from "./shared";

const W = FINDER.plan;

/** The plan, said briefly: its name and price, one or two sentences of why, the points to gain with the
 *  weeks left as one plain line, and the site's own button to its real next step. */
export function RecommendationStep({
  recommendation,
  onContinue,
  submitting,
  signedIn,
  parent = false,
}: {
  /** Signed out, the plan is shown first and the account is asked for here, to save it. */
  signedIn: boolean;
  recommendation: Recommendation;
  /** Goes to the plan's real next step: checkout, the reservation or the call booking. */
  onContinue: (href: string) => void | Promise<void>;
  submitting: boolean;
  /** A parent is answering for their student: a renewing plan belongs to the student's account, so
   *  the parent adds the student first. */
  parent?: boolean;
}) {
  const plan = planSummary(recommendation.planId);
  const other = recommendation.alsoConsidered;
  return (
    <div className="ob-plan">
      <h1>{recommendation.headline}</h1>
      <p className="ob-price num">{plan.price}</p>
      <p>{recommendation.why}</p>
      {recommendation.signals.length > 0 && (
        <p className="ob-facts">{recommendation.signals.join(" with ")}.</p>
      )}
      <button
        type="button"
        className="btn"
        onClick={() => void onContinue(plan.href)}
        data-busy={submitting || undefined}
        suppressHydrationWarning
      >
        <span className="lb">
          {submitting
            ? W.busy
            : !signedIn
              ? W.save
              : parent && plan.href.startsWith("/checkout")
                ? W.parentFirst
                : plan.action}
        </span>
      </button>
      {other ? (
        <p className="ob-also">
          {W.also} <b>{planSummary(other.planId).name}</b>: {other.reason}
        </p>
      ) : null}
      {/* the plan-finder ends on its plan: every plan is one link away, and nothing else is offered here
          (founder, 2026-11-26: no free plan at the end of the pipeline) */}
      <p className="ob-ways">
        <a className="ob-quiet" href="/pricing">
          {W.all}
        </a>
      </p>
    </div>
  );
}
