"use client";

// ============================================================
// Student Dashboard — Client Component
// Renders streak counter, progress ring, domain bars,
// and the recommended next lesson card.
// ============================================================

import Link from "next/link";
import { Flame, BookOpen, TrendingUp, ArrowRight, Lock, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS, DOMAIN_LABELS, type SATDomain, type DomainScores } from "@/types";
import DashboardLayout from "./DashboardLayout";

interface Props {
  user: { email: string; role: string } | null;
  progress: Array<{
    id: string;
    concept_id: string;
    status: string;
    quiz_score: number | null;
    last_visited: string | null;
    concepts: { title: string; domain: string; difficulty: number } | null;
  }>;
  diagnostic: {
    score_range_low: number;
    score_range_high: number;
    domain_scores: DomainScores;
  } | null;
  subscription: { tier: string; status: string; trial_end: string | null } | null;
}

/** Calculates streak from last_visited dates (simplified) */
function calculateStreak(progress: Props["progress"]): number {
  const visited = progress
    .filter((p) => p.last_visited)
    .map((p) => new Date(p.last_visited!).toDateString());
  const uniqueDays = new Set(visited);
  return Math.min(uniqueDays.size, 30); // Cap display at 30
}

/** Returns 0-100 completion for a domain */
function domainCompletion(progress: Props["progress"], domain: SATDomain): number {
  const domainProgress = progress.filter((p) => p.concepts?.domain === domain);
  if (domainProgress.length === 0) return 0;
  const mastered = domainProgress.filter((p) => p.status === "mastered").length;
  return Math.round((mastered / domainProgress.length) * 100);
}

export default function StudentDashboardClient({ user, progress, diagnostic, subscription }: Props) {
  const streak = calculateStreak(progress);
  const masteredCount = progress.filter((p) => p.status === "mastered").length;
  const totalConcepts = Math.max(progress.length, 15); // Show out of at least 15
  const overallPct = Math.round((masteredCount / totalConcepts) * 100);

  // Find the first available concept as the next lesson
  const nextLesson = progress.find((p) => p.status === "available" || p.status === "in_progress");

  const trialEndsLabel = subscription?.trial_end
    ? `Trial ends ${new Date(subscription.trial_end).toLocaleDateString()}`
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Trial banner */}
        {subscription?.status === "trialing" && trialEndsLabel && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {trialEndsLabel} — your card will be charged automatically.
            </p>
            <Link href="/billing" className="text-sm font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1">
              Manage plan <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Top stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Streak */}
          <div className="glass-card p-4 flex flex-col items-center gap-1">
            <Flame className="w-6 h-6 text-orange-500" />
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{streak}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">day streak</span>
          </div>

          {/* Progress ring */}
          <div className="glass-card p-4 flex flex-col items-center gap-1">
            <ProgressRing pct={overallPct} size={56} />
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">overall</span>
          </div>

          {/* Mastered concepts */}
          <div className="glass-card p-4 flex flex-col items-center gap-1">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{masteredCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">mastered</span>
          </div>

          {/* Predicted score */}
          <div className="glass-card p-4 flex flex-col items-center gap-1">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {diagnostic
                ? `${diagnostic.score_range_low}–${diagnostic.score_range_high}`
                : "—"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">predicted SAT</span>
          </div>
        </div>

        {/* Next lesson */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Continue Learning</h2>
          {nextLesson ? (
            <Link
              href={`/dashboard/student/lesson/${nextLesson.concept_id}`}
              className="glass-card p-5 flex items-center gap-4 hover:shadow-xl transition-all group"
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                `bg-[${DOMAIN_COLORS[nextLesson.concepts?.domain as SATDomain]?.hex}]/10`
              )}
                style={{ backgroundColor: DOMAIN_COLORS[nextLesson.concepts?.domain as SATDomain]?.hex + "20" }}
              >
                <BookOpen className="w-5 h-5" style={{ color: DOMAIN_COLORS[nextLesson.concepts?.domain as SATDomain]?.hex }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white truncate">{nextLesson.concepts?.title || "Next Lesson"}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <span>{DOMAIN_LABELS[nextLesson.concepts?.domain as SATDomain] || "SAT Math"}</span>
                  <span>·</span>
                  <span>{nextLesson.status === "in_progress" ? "In progress" : "Ready"}</span>
                  {nextLesson.quiz_score !== null && (
                    <><span>·</span><span>{nextLesson.quiz_score}%</span></>
                  )}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </Link>
          ) : (
            <div className="glass-card p-5 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No lessons unlocked yet.{" "}
                <Link href="/diagnostic" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Take the diagnostic
                </Link>{" "}
                to get your personalized learning path.
              </p>
            </div>
          )}
        </div>

        {/* Domain progress bars */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Domain Progress</h2>
          <div className="glass-card p-5 space-y-4">
            {(["algebra", "advanced_math", "geometry", "data_analysis"] as SATDomain[]).map((domain) => {
              const pctVal = domainCompletion(progress, domain);
              const color = DOMAIN_COLORS[domain];
              const diagScore = diagnostic?.domain_scores[domain as keyof DomainScores] ?? null;

              return (
                <div key={domain}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{DOMAIN_LABELS[domain]}</span>
                    <div className="flex items-center gap-3">
                      {diagScore !== null && (
                        <span className="text-xs text-slate-400">{diagScore}% diagnostic</span>
                      )}
                      <span className="text-xs font-bold" style={{ color: color.hex }}>{pctVal}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pctVal}%`, backgroundColor: color.hex }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* No diagnostic CTA */}
        {!diagnostic && (
          <div className="glass-card p-6 text-center border-2 border-dashed border-blue-200 dark:border-blue-800">
            <Clock className="w-8 h-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Take the Diagnostic First</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Our 20-question adaptive diagnostic builds your personalized learning path in 35 minutes.
            </p>
            <Link href="/diagnostic" className="btn-primary text-sm">
              Start Diagnostic
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Recent activity */}
        {progress.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Recent Activity</h2>
            <div className="space-y-2">
              {progress.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    p.status === "mastered" ? "bg-emerald-500" :
                    p.status === "in_progress" ? "bg-blue-500" :
                    p.status === "available" ? "bg-amber-400" : "bg-slate-300"
                  )} />
                  <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">
                    {p.concepts?.title || "Concept"}
                  </span>
                  {p.status === "locked" && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                  {p.status === "mastered" && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                  {p.quiz_score !== null && (
                    <span className="text-xs text-slate-400">{p.quiz_score}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/** SVG progress ring component */
function ProgressRing({ pct, size = 64 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6} className="stroke-slate-200 dark:stroke-slate-700" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={6}
        fill="none"
        stroke="#3B82F6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-slate-900 dark:fill-white text-[11px] font-bold rotate-90"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
      >
        {pct}%
      </text>
    </svg>
  );
}
