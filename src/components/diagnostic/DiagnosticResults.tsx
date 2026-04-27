"use client";

// ============================================================
// Diagnostic Results Screen
//
// Renders the ScoredDiagnostic returned by /api/diagnostic/submit:
//   · Predicted total SAT range + Math + R&W subscores
//   · Domain breakdown across all 8 official SAT domains,
//     grouped Math vs R&W
//   · Foundation-aware focus area (vs the old "lowest %" bug)
//   · Strongest domain ONLY when the student got ≥3 correct in
//     that domain — otherwise honestly says "no clear strength yet"
//   · Dynamic CTA: paying users → learning path; non-payers →
//     Start free trial
// ============================================================

import Link from "next/link";
import { ArrowRight, TrendingUp, AlertCircle, CheckCircle, Sparkles, BookmarkCheck } from "lucide-react";
import { DOMAIN_COLORS, DOMAIN_LABELS, DOMAIN_SECTION, type SATDomain, type DomainScores } from "@/types";
import type { ScoredDiagnostic } from "@/lib/diagnostic-scoring";

interface Props {
  scoring: ScoredDiagnostic;
  totalQuestions: number;
  answers: Record<string, string>;
  questions: Array<{ id: string; correct: string; text?: string; domain?: SATDomain }>;
  /** Drives the CTA button below the score guarantee block. */
  isSubscribed: boolean;
  /** Question ids the student bookmarked during the diagnostic. */
  bookmarkedIds?: string[];
}

const SCORE_LABELS: Record<string, string> = {
  "400-800":  "Building foundations",
  "800-1100": "On the way up",
  "1100-1300": "Approaching target",
  "1300-1600": "Strong performer",
};

function getScoreLabel(total: number): string {
  if (total < 800) return SCORE_LABELS["400-800"];
  if (total < 1100) return SCORE_LABELS["800-1100"];
  if (total < 1300) return SCORE_LABELS["1100-1300"];
  return SCORE_LABELS["1300-1600"];
}

function domainHeatColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

const MATH_DOMAINS: SATDomain[] = ["algebra", "advanced_math", "geometry", "data_analysis"];
const RW_DOMAINS: SATDomain[] = ["info_ideas", "craft_structure", "expression_ideas", "conventions"];

export default function DiagnosticResults({ scoring, totalQuestions, answers, questions, isSubscribed, bookmarkedIds = [] }: Props) {
  const bookmarkedSet = new Set(bookmarkedIds);
  const bookmarkedQuestions = questions
    .map((q, i) => ({ ...q, index: i }))
    .filter((q) => bookmarkedSet.has(q.id));
  const correctCount = questions.filter((q) => answers[q.id] === q.correct).length;
  const accuracy = Math.round((correctCount / totalQuestions) * 100);
  const midScore = Math.round((scoring.totalLow + scoring.totalHigh) / 2);
  const scoreLabel = getScoreLabel(midScore);

  // CTA: non-subscribers go to /billing to pick a tier + start the
  // free trial. Paying subscribers head straight to their dashboard.
  const ctaHref = isSubscribed ? "/dashboard/student" : "/billing";
  const ctaLabel = isSubscribed ? "Go to my learning path" : "Begin your journey";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Your Diagnostic Results</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{correctCount}/{totalQuestions} correct · {accuracy}% accuracy</p>
        </div>

        {/* Predicted score card — total + section subscores */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 text-center">
            Predicted SAT Score Range
          </p>
          <div className="text-5xl font-extrabold text-slate-900 dark:text-white mb-1 text-center">
            {scoring.totalLow}–{scoring.totalHigh}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center">{scoreLabel}</p>

          {/* Score-range bar (400-1600).
              The range itself is the marker — a glowing white
              capsule sits ON the gradient bar spanning from `low`
              to `high`, so the visual width literally maps to the
              student's predicted range. Endpoint scores float just
              above each cap so the eye reads `739 ─── 859` at a
              glance, in line with the bar instead of hovering over
              it. */}
          {(() => {
            const lowPct  = ((scoring.totalLow  - 400) / 1200) * 100;
            const highPct = ((scoring.totalHigh - 400) / 1200) * 100;
            const widthPct = Math.max(highPct - lowPct, 1.5);
            return (
              <div className="mt-7 mb-2 relative">
                {/* Endpoint labels — small Karman Prep-blue numerals
                    sitting just above each end of the range. */}
                <div
                  className="absolute -top-5 text-[10px] font-bold text-blue-300 tabular-nums pointer-events-none"
                  style={{ left: `${lowPct}%`, transform: "translateX(-50%)" }}
                >
                  {scoring.totalLow}
                </div>
                <div
                  className="absolute -top-5 text-[10px] font-bold text-blue-300 tabular-nums pointer-events-none"
                  style={{ left: `${highPct}%`, transform: "translateX(-50%)" }}
                >
                  {scoring.totalHigh}
                </div>

                {/* Gradient bar — red → amber → green heat map. */}
                <div className="relative h-2.5 rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]">
                  {/* Range capsule — sits ON the bar, slightly
                      taller so it reads as raised, with a soft
                      Karman Prep glow. Width literally is the range. */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-4 rounded-full bg-white border border-blue-300/60 shadow-[0_0_14px_rgba(59,130,246,0.55)]"
                    style={{ left: `${lowPct}%`, width: `${widthPct}%` }}
                    aria-hidden
                  />
                </div>

                <div className="flex justify-between text-xs text-slate-400 mt-2 tabular-nums">
                  <span>400</span><span>800</span><span>1200</span><span>1600</span>
                </div>
              </div>
            );
          })()}

          {/* Section subscores */}
          <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Math</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {scoring.math.low}–{scoring.math.high}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reading & Writing</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {scoring.rw.low}–{scoring.rw.high}
              </p>
            </div>
          </div>
        </div>

        {/* Domain heatmap — Math */}
        <DomainSectionCard
          title="Math domains"
          domains={MATH_DOMAINS}
          scores={scoring.domainScores}
        />

        {/* Domain heatmap — R&W */}
        <DomainSectionCard
          title="Reading & Writing domains"
          domains={RW_DOMAINS}
          scores={scoring.domainScores}
        />

        {/* Insights — focus area + strongest */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="glass-card p-5 border-l-4 border-amber-400">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">Focus Area</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
              {scoring.focusArea.label}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {scoring.focusArea.detail}
            </p>
          </div>

          <div className="glass-card p-5 border-l-4 border-emerald-400">
            <div className="flex items-center gap-2 mb-2">
              {scoring.strongest ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-sm font-bold text-slate-900 dark:text-white">Strongest Domain</span>
            </div>
            {scoring.strongest ? (
              <>
                <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                  <span style={{ color: DOMAIN_COLORS[scoring.strongest.domain].hex }}>
                    {DOMAIN_LABELS[scoring.strongest.domain]}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {scoring.strongest.score}% difficulty-weighted accuracy
                  {" · "}
                  {scoring.strongest.correctCount} correct in this domain. Keep the momentum.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">
                  No clear strength yet
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  You haven't scored consistently high in any single domain. As you work through your learning path, your strongest domain will start to surface here.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Bookmarked questions — only when the student saved any. */}
        {bookmarkedQuestions.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-amber-400" />
              Bookmarked for review
              <span className="text-xs font-normal text-slate-400">
                ({bookmarkedQuestions.length})
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              You flagged these during the diagnostic. They&apos;ll come up first when you start your learning path.
            </p>
            <ul className="space-y-2">
              {bookmarkedQuestions.map((q) => {
                const userAnswer = answers[q.id];
                const correct = userAnswer === q.correct;
                return (
                  <li
                    key={q.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Q{q.index + 1}
                        </span>
                        {q.domain && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: DOMAIN_COLORS[q.domain].hex + "22",
                              color: DOMAIN_COLORS[q.domain].hex,
                            }}
                          >
                            {DOMAIN_LABELS[q.domain]}
                          </span>
                        )}
                      </div>
                      <span
                        className={
                          correct
                            ? "text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
                            : "text-[11px] font-bold text-rose-600 dark:text-rose-400"
                        }
                      >
                        {userAnswer ? (correct ? "Correct" : `You: ${userAnswer} · Correct: ${q.correct}`) : `Skipped · Correct: ${q.correct}`}
                      </span>
                    </div>
                    {q.text && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {q.text}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Score guarantee */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-5 text-sm text-blue-700 dark:text-blue-300">
          <p className="font-bold mb-1">Score Improvement Guarantee</p>
          <p>
            Follow your personalized learning path for 8 weeks. If you don&apos;t improve by at least 50 points on your next official SAT, we&apos;ll refund your subscription — no questions asked.
          </p>
        </div>

        {/* CTA */}
        <Link href={ctaHref} className="btn-primary w-full text-base py-4 justify-center">
          {ctaLabel}
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

function DomainSectionCard({
  title,
  domains,
  scores,
}: {
  title: string;
  domains: SATDomain[];
  scores: DomainScores;
}) {
  const entries = domains
    .map((d) => [d, scores[d]] as [SATDomain, number])
    .sort((a, b) => a[1] - b[1]);

  return (
    <div className="glass-card p-6">
      <h2 className="font-bold text-slate-900 dark:text-white mb-4">{title}</h2>
      <div className="space-y-3">
        {entries.map(([domain, score]) => (
          <div key={domain}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {DOMAIN_LABELS[domain]}
              </span>
              <span className="text-sm font-bold" style={{ color: domainHeatColor(score) }}>
                {score}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${score}%`, backgroundColor: domainHeatColor(score) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
