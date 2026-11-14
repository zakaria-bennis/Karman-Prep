"use client";

import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { planSummary, type Recommendation } from "@/lib/onboarding/recommend-plan";
import type { Role } from "./shared";

export function RecommendationStep({
  recommendation,
  onContinue,
  submitting,
  role,
  signedIn,
}: {
  /** Signed out, the plan is shown first and the account is asked for here, to save it. */
  signedIn: boolean;
  recommendation: Recommendation;
  /** Goes to the plan's real next step: Billing, the cohort application or a call. */
  onContinue: (href: string) => void | Promise<void>;
  submitting: boolean;
  role: Role;
}) {
  const plan = planSummary(recommendation.planId);
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-info">
        <Sparkles className="h-3.5 w-3.5" />
        Our recommendation for {role === "parent" ? "your child" : "you"}
      </p>
      <h2 className="mt-2 text-3xl font-extrabold text-ivory dark:text-ivory">
        {recommendation.headline}
      </h2>

      <div className="mt-5 rounded-2xl border border-info/40 bg-info/60 p-5 dark:bg-info/10">
        <div className="mb-2 flex items-center gap-2 text-info dark:text-info-bright">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-bold uppercase tracking-wider">{plan.name}</span>
          <span className="text-sm font-semibold">{plan.price}</span>
        </div>
        <p className="text-sm leading-relaxed text-ivory dark:text-ivory">{recommendation.why}</p>
      </div>

      {recommendation.signals.length > 0 && (
        <div className="mt-4 rounded-xl border border-bronze bg-surface/40 p-4 dark:border-bronze dark:bg-surface-raised/30">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-taupe dark:text-taupe">
            Why we picked this
          </p>
          <ul className="space-y-1">
            {recommendation.signals.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-taupe dark:text-ivory">
                <span className="shrink-0 text-info">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendation.alsoConsidered && (
        <div className="mt-3 rounded-xl border border-bronze bg-surface/40 p-4 dark:border-bronze dark:bg-surface-raised/30">
          <p className="text-[11px] font-bold uppercase tracking-widest text-taupe dark:text-taupe">
            We also considered
          </p>
          <p className="mt-1 text-xs leading-relaxed text-taupe dark:text-ivory">
            <span className="font-semibold text-ivory dark:text-ivory">
              {planSummary(recommendation.alsoConsidered.planId).name}:{" "}
            </span>
            {recommendation.alsoConsidered.reason}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void onContinue(plan.href)}
        disabled={submitting}
        className="btn-primary mt-6 w-full justify-center py-4 text-base"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            One moment
          </>
        ) : (
          <>
            {signedIn ? plan.action : "Save my plan"}
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      {signedIn ? null : (
        <p className="mt-3 text-center text-sm font-semibold text-taupe">
          A free account keeps this plan and opens your first practice. It takes a few seconds.
        </p>
      )}

      {signedIn ? (
        <button
          type="button"
          onClick={() => void onContinue("/pricing")}
          className="mt-3 w-full text-sm font-semibold text-taupe hover:text-ivory"
        >
          Or see every plan and price
        </button>
      ) : (
        <a
          href="/pricing"
          className="mt-3 block w-full py-2 text-center text-sm font-semibold text-taupe hover:text-ivory"
        >
          Later. Show me every plan and price
        </a>
      )}
    </div>
  );
}
