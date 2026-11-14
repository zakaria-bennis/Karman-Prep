"use client";

import { planSummary, type Recommendation } from "@/lib/onboarding/recommend-plan";
import { FINDER } from "./shared";

const W = FINDER.plan;

/** The plan, said briefly: its name and price, one or two sentences of why, the three answers it turned
 *  on, and the site's own button to its real next step. */
export function RecommendationStep({
  recommendation,
  onContinue,
  submitting,
  signedIn,
}: {
  /** Signed out, the plan is shown first and the account is asked for here, to save it. */
  signedIn: boolean;
  recommendation: Recommendation;
  /** Goes to the plan's real next step: checkout, the reservation or the call booking. */
  onContinue: (href: string) => void | Promise<void>;
  submitting: boolean;
}) {
  const plan = planSummary(recommendation.planId);
  const other = recommendation.alsoConsidered;
  return (
    <div className="ob-plan">
      <h1>{recommendation.headline}</h1>
      <p className="ob-price num">{plan.price}</p>
      <p>{recommendation.why}</p>
      <ul aria-label={W.because}>
        {recommendation.signals.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <button
        type="button"
        className="btn"
        onClick={() => void onContinue(plan.href)}
        data-busy={submitting || undefined}
        suppressHydrationWarning
      >
        <span className="lb">{submitting ? W.busy : signedIn ? plan.action : W.save}</span>
      </button>
      {signedIn ? null : <p className="rs-why">{W.saveNote}</p>}
      {other ? (
        <p className="ob-also">
          {W.also} <b>{planSummary(other.planId).name}</b>: {other.reason}
        </p>
      ) : null}
      <a className="ob-quiet" href="/pricing">
        {W.all}
      </a>
    </div>
  );
}
