"use client";

import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { tierLabel, type Recommendation } from "@/lib/onboarding/recommend-tier";
import type { Role } from "./shared";

export function RecommendationStep({
  recommendation,
  onPick,
  submitting,
  role,
}: {
  recommendation: Recommendation;
  onPick: (tier: string) => void;
  submitting: boolean;
  role: Role;
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-blue-400">
        <Sparkles className="h-3.5 w-3.5" />
        Our recommendation for {role === "parent" ? "your child" : "you"}
      </p>
      <h2 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
        {recommendation.headline}
      </h2>

      <div className="mt-5 rounded-2xl border border-blue-300/40 bg-blue-50/60 p-5 dark:bg-blue-900/10">
        <div className="mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-200">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-bold uppercase tracking-wider">
            {tierLabel(recommendation.tier)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {recommendation.why}
        </p>
      </div>

      {recommendation.signals.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white/40 p-4 dark:border-slate-700 dark:bg-slate-800/30">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Why we picked this
          </p>
          <ul className="space-y-1">
            {recommendation.signals.map((s, i) => (
              <li
                key={i}
                className="flex gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300"
              >
                <span className="shrink-0 text-blue-400">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendation.alsoConsidered && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white/40 p-4 dark:border-slate-700 dark:bg-slate-800/30">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            We also considered
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {tierLabel(recommendation.alsoConsidered.tier)} —{" "}
            </span>
            {recommendation.alsoConsidered.reason}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => onPick(recommendation.tier)}
        disabled={submitting}
        className="btn-primary mt-6 w-full justify-center py-4 text-base"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Setting up checkout…
          </>
        ) : (
          <>
            Start free trial — {tierLabel(recommendation.tier)}
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => onPick("group")}
        className="mt-3 w-full text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Or browse all plans →
      </button>
    </div>
  );
}
