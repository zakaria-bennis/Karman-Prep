"use client";

// ============================================================
// Diagnostic Results Screen
// Shows predicted score range, domain breakdown heatmap,
// and generated learning path CTA.
// ============================================================

import Link from "next/link";
import { ArrowRight, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { DOMAIN_COLORS, DOMAIN_LABELS, type SATDomain, type DomainScores } from "@/types";

interface Props {
  results: {
    scoreRangeLow: number;
    scoreRangeHigh: number;
    domainScores: DomainScores;
    weakConceptIds: string[];
  };
  totalQuestions: number;
  answers: Record<string, string>;
  questions: Array<{ id: string; correct: string }>;
}

const SCORE_LABELS: Record<string, string> = {
  "200-400": "Needs significant work",
  "400-600": "Building foundations",
  "600-700": "Approaching target",
  "700-800": "Strong performer",
};

function getScoreLabel(score: number): string {
  if (score < 400) return SCORE_LABELS["200-400"];
  if (score < 600) return SCORE_LABELS["400-600"];
  if (score < 700) return SCORE_LABELS["600-700"];
  return SCORE_LABELS["700-800"];
}

/** Returns a heatmap color: red → amber → green based on 0–100 score */
function domainHeatColor(score: number): string {
  if (score >= 70) return "#22C55E";     // green
  if (score >= 50) return "#F59E0B";     // amber
  return "#EF4444";                       // red
}

export default function DiagnosticResults({ results, totalQuestions, answers, questions }: Props) {
  const correctCount = questions.filter((q) => answers[q.id] === q.correct).length;
  const accuracy = Math.round((correctCount / totalQuestions) * 100);
  const midScore = Math.round((results.scoreRangeLow + results.scoreRangeHigh) / 2);
  const scoreLabel = getScoreLabel(midScore);

  // Sort domains from weakest to strongest
  const domainEntries = (Object.entries(results.domainScores) as [SATDomain, number][])
    .sort((a, b) => a[1] - b[1]);

  const weakestDomain = domainEntries[0];
  const strongestDomain = domainEntries[domainEntries.length - 1];

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

        {/* Predicted score card */}
        <div className="glass-card p-6 text-center">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Predicted SAT Score Range
          </p>
          <div className="text-5xl font-extrabold text-slate-900 dark:text-white mb-1">
            {results.scoreRangeLow}–{results.scoreRangeHigh}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{scoreLabel}</p>

          {/* Score bar */}
          <div className="mt-4 relative">
            <div className="h-3 rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-500" />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-600 shadow-md transition-all"
              style={{ left: `${((midScore - 200) / 600) * 100}%`, transform: "translate(-50%, -50%)" }}
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1.5">
              <span>200</span><span>400</span><span>600</span><span>800</span>
            </div>
          </div>
        </div>

        {/* Domain heatmap */}
        <div className="glass-card p-6">
          <h2 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            Domain Breakdown
            <span className="text-xs font-normal text-slate-400">(green = strong, red = needs work)</span>
          </h2>
          <div className="space-y-3">
            {domainEntries.map(([domain, score]) => (
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

        {/* Insights */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="glass-card p-5 border-l-4 border-red-400">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">Focus Area</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold" style={{ color: DOMAIN_COLORS[weakestDomain[0]].hex }}>
                {DOMAIN_LABELS[weakestDomain[0]]}
              </span>{" "}
              ({weakestDomain[1]}%) — your learning path will start here.
            </p>
          </div>
          <div className="glass-card p-5 border-l-4 border-emerald-400">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">Strongest Domain</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold" style={{ color: DOMAIN_COLORS[strongestDomain[0]].hex }}>
                {DOMAIN_LABELS[strongestDomain[0]]}
              </span>{" "}
              ({strongestDomain[1]}%) — keep the momentum going.
            </p>
          </div>
        </div>

        {/* Score guarantee */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-5 text-sm text-blue-700 dark:text-blue-300">
          <p className="font-bold mb-1">Score Improvement Guarantee</p>
          <p>
            Follow your personalized learning path for 8 weeks. If you don&apos;t improve by at least 150 points on your next official SAT, we&apos;ll refund your subscription — no questions asked.
          </p>
        </div>

        {/* CTA */}
        <Link href="/dashboard/student" className="btn-primary w-full text-base py-4 justify-center">
          Go to My Learning Path
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
