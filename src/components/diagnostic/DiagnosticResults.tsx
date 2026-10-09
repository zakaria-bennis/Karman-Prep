"use client";

// ============================================================
// Diagnostic Results Screen
//
// Renders the ScoredDiagnostic returned by /api/diagnostic/submit:
//   · Measured question accuracy and weighted section/domain performance
//   · Domain breakdown across all 8 official SAT domains,
//     grouped Math vs R&W
//   · Foundation-aware focus area (vs the old "lowest %" bug)
//   · Strongest domain ONLY when the student got ≥3 correct in
//     that domain — otherwise honestly says "no clear strength yet"
//   · Dynamic CTA: subscribers → their week; others → current plan options
// ============================================================

import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Sparkles,
  BookmarkCheck,
} from "lucide-react";
import { DOMAIN_LABELS, type SATDomain, type DomainScores } from "@/types";
import type { ScoredDiagnostic } from "@/lib/diagnostic-scoring";

interface Props {
  scoring: ScoredDiagnostic;
  totalQuestions: number;
  answers: Record<string, string>;
  questions: Array<{ id: string; correct: string; text?: string; domain?: SATDomain }>;
  /** Drives the next-step destination; never implies trial eligibility. */
  isSubscribed: boolean;
  /** Question ids the student bookmarked during the diagnostic. */
  bookmarkedIds?: string[];
}

function domainHeatColor(score: number): string {
  if (score >= 70) return "rgb(var(--k-success))";
  if (score >= 50) return "rgb(var(--k-warning))";
  return "rgb(var(--k-rw))";
}

const MATH_DOMAINS: SATDomain[] = ["algebra", "advanced_math", "geometry", "data_analysis"];
const RW_DOMAINS: SATDomain[] = [
  "info_ideas",
  "craft_structure",
  "expression_ideas",
  "conventions",
];

export default function DiagnosticResults({
  scoring,
  totalQuestions,
  answers,
  questions,
  isSubscribed,
  bookmarkedIds = [],
}: Props) {
  const bookmarkedSet = new Set(bookmarkedIds);
  const bookmarkedQuestions = questions
    .map((q, i) => ({ ...q, index: i }))
    .filter((q) => bookmarkedSet.has(q.id));
  const correctCount = questions.filter((q) => answers[q.id] === q.correct).length;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Keep the existing plan/account destinations; checkout defines any trial.
  const ctaHref = isSubscribed ? "/dashboard/student" : "/billing";
  const ctaLabel = isSubscribed ? "Open your SAT week" : "Review your plan options";

  return (
    <div className="min-h-screen bg-surface px-4 py-10 dark:bg-night">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-info to-gold">
            <TrendingUp className="h-8 w-8 text-ivory" />
          </div>
          <h1 className="text-3xl font-extrabold text-ivory dark:text-ivory">
            Your Diagnostic Results
          </h1>
          <p className="mt-2 text-taupe dark:text-taupe">
            {correctCount}/{totalQuestions} correct · {accuracy}% accuracy
          </p>
        </div>

        <section
          aria-labelledby="performance-heading"
          className="rounded-2xl border border-bronze/40 bg-surface p-6 sm:p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-gold">
            Your starting point
          </p>
          <h2 id="performance-heading" className="mt-3 text-2xl font-semibold tracking-tight">
            A snapshot of this practice.
          </h2>
          <p className="mt-4 text-base leading-7 text-taupe">
            These results describe the questions and skills sampled here. They do not predict an
            official SAT score or measure every skill on the test.
          </p>
          <div className="mt-6 grid gap-5 border-t border-bronze/30 pt-5 sm:grid-cols-2">
            {[
              { label: "Math", value: scoring.math.accuracy },
              { label: "Reading & Writing", value: scoring.rw.accuracy },
            ].map((section) => (
              <div key={section.label}>
                <h3 className="text-sm font-medium text-taupe">{section.label}</h3>
                <p className="mt-2 text-3xl font-semibold text-ivory">
                  {Math.round(section.value)}%
                </p>
                <p className="mt-1 text-sm leading-6 text-taupe">Difficulty-weighted accuracy</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-taupe">
            Harder questions carry more weight in the section and domain breakdowns. Use them to
            choose practice, rather than compare with a College Board score.
          </p>
        </section>

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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glass-card border-l-4 border-warning/40 p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-sm font-bold text-ivory dark:text-ivory">Focus Area</span>
            </div>
            <p className="text-sm font-semibold text-ivory dark:text-ivory">
              {scoring.focusArea.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-taupe dark:text-taupe">
              {scoring.focusArea.detail}
            </p>
          </div>

          <div className="glass-card border-l-4 border-success/40 p-5">
            <div className="mb-2 flex items-center gap-2">
              {scoring.strongest ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <Sparkles className="h-4 w-4 text-taupe" />
              )}
              <span className="text-sm font-bold text-ivory dark:text-ivory">Strongest Domain</span>
            </div>
            {scoring.strongest ? (
              <>
                <p className="text-sm font-semibold text-ivory dark:text-ivory">
                  <span className="text-ivory">{DOMAIN_LABELS[scoring.strongest.domain]}</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-taupe dark:text-taupe">
                  {scoring.strongest.score}% difficulty-weighted accuracy
                  {" · "}
                  {scoring.strongest.correctCount} correct in this domain. Keep the momentum.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-ivory dark:text-ivory">
                  No clear strength yet
                </p>
                <p className="mt-1 text-xs leading-relaxed text-taupe dark:text-taupe">
                  You haven&apos;t scored consistently high in any single domain. As you work
                  through your learning path, your strongest domain will start to surface here.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Bookmarked questions — only when the student saved any. */}
        {bookmarkedQuestions.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-ivory dark:text-ivory">
              <BookmarkCheck className="h-4 w-4 text-warning" />
              Bookmarked for review
              <span className="text-xs font-normal text-taupe">({bookmarkedQuestions.length})</span>
            </h2>
            <p className="mb-4 text-xs text-taupe dark:text-taupe">
              You flagged these during the diagnostic. Use this list to choose questions you want to
              discuss or practice again.
            </p>
            <ul className="space-y-2">
              {bookmarkedQuestions.map((q) => {
                const userAnswer = answers[q.id];
                const correct = userAnswer === q.correct;
                return (
                  <li
                    key={q.id}
                    className="rounded-xl border border-bronze bg-surface px-4 py-3 dark:border-bronze dark:bg-surface/40"
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-taupe dark:text-taupe">
                          Q{q.index + 1}
                        </span>
                        {q.domain && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold">
                            {DOMAIN_LABELS[q.domain]}
                          </span>
                        )}
                      </div>
                      <span
                        className={
                          correct
                            ? "text-[11px] font-bold text-success dark:text-success"
                            : "text-[11px] font-bold text-error dark:text-error"
                        }
                      >
                        {userAnswer
                          ? correct
                            ? "Correct"
                            : `You: ${userAnswer} · Correct: ${q.correct}`
                          : `Skipped · Correct: ${q.correct}`}
                      </span>
                    </div>
                    {q.text && (
                      <p className="line-clamp-2 text-xs text-taupe dark:text-ivory">{q.text}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="rounded-2xl bg-surface-raised p-6 text-base leading-7 text-taupe">
          <h2 className="font-semibold text-ivory">Put the result to work.</h2>
          <p className="mt-2">
            Start with the focus area above, revisit your bookmarked questions, or bring this
            breakdown to your tutor.
          </p>
          <Link
            href="/guarantee"
            className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Read the score policy and existing-purchase terms
          </Link>
        </div>

        {/* CTA */}
        <Link href={ctaHref} className="btn-primary w-full justify-center py-4 text-base">
          {ctaLabel}
          <ArrowRight className="h-5 w-5" />
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
      <h2 className="mb-4 font-bold text-ivory dark:text-ivory">{title}</h2>
      <div className="space-y-3">
        {entries.map(([domain, score]) => (
          <div key={domain}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-ivory dark:text-ivory">
                {DOMAIN_LABELS[domain]}
              </span>
              <span className="text-sm font-semibold text-ivory">{score}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface dark:bg-surface-raised">
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
