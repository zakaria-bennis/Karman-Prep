"use client";

// ============================================================
// Student Dashboard — Client Component
// Renders streak counter, progress ring, domain bars,
// and the recommended next lesson card.
// ============================================================

import Link from "next/link";
import { Flame, BookOpen, TrendingUp, ArrowRight, Lock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS, DOMAIN_LABELS, type SATDomain, type DomainScores } from "@/types";
import DashboardLayout from "./DashboardLayout";
import DomainProgress from "./DomainProgress";
import type { NodeStatus } from "@/data/curriculum";

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
  /** The newer learn_node_status map keyed by node_id. */
  nodeStatuses?: Map<string, NodeStatus>;
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

export default function StudentDashboardClient({
  user,
  progress,
  nodeStatuses,
  diagnostic,
  subscription,
}: Props) {
  const nodeStatusMap = nodeStatuses ?? new Map<string, NodeStatus>();
  const masteredFromNodes = Array.from(nodeStatusMap.values()).filter(
    (s) => s === "mastered"
  ).length;
  const streak = calculateStreak(progress);
  // Prefer the newer learn_node_status count; fall back to legacy progress table
  const masteredCount =
    masteredFromNodes > 0
      ? masteredFromNodes
      : progress.filter((p) => p.status === "mastered").length;
  const totalConcepts = Math.max(progress.length, 15); // Show out of at least 15
  const overallPct = Math.round((masteredCount / totalConcepts) * 100);

  // Find the first available concept as the next lesson
  const nextLesson = progress.find((p) => p.status === "available" || p.status === "in_progress");

  const trialEndsLabel = subscription?.trial_end
    ? `Trial ends ${new Date(subscription.trial_end).toLocaleDateString()}`
    : null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        {/* Trial banner */}
        {subscription?.status === "trialing" && trialEndsLabel && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {trialEndsLabel} — your card will be charged automatically.
            </p>
            <Link
              href="/billing"
              className="flex items-center gap-1 text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
            >
              Manage plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Top stats row — two are clickable and open detail pages */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Streak */}
          <div className="glass-card flex flex-col items-center gap-1 p-4">
            <Flame className="h-6 w-6 text-orange-500" />
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{streak}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">day streak</span>
          </div>

          {/* Progress ring */}
          <div className="glass-card flex flex-col items-center gap-1 p-4">
            <ProgressRing pct={overallPct} size={56} />
            <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">overall</span>
          </div>

          {/* Mastered concepts → /dashboard/student/mastered */}
          <Link
            href="/dashboard/student/mastered"
            className="glass-card group flex cursor-pointer flex-col items-center gap-1 p-4 transition-shadow hover:shadow-xl"
          >
            <CheckCircle className="h-6 w-6 text-emerald-500 transition-transform group-hover:scale-110" />
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {masteredCount}
            </span>
            <span className="text-xs text-slate-500 transition-colors group-hover:text-emerald-500 dark:text-slate-400">
              mastered →
            </span>
          </Link>

          {/* Predicted score → /dashboard/student/predicted-sat */}
          <Link
            href="/dashboard/student/predicted-sat"
            className="glass-card group flex cursor-pointer flex-col items-center gap-1 p-4 transition-shadow hover:shadow-xl"
          >
            <TrendingUp className="h-6 w-6 text-blue-500 transition-transform group-hover:scale-110" />
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {diagnostic ? `${diagnostic.score_range_low}–${diagnostic.score_range_high}` : "—"}
            </span>
            <span className="text-xs text-slate-500 transition-colors group-hover:text-blue-500 dark:text-slate-400">
              predicted SAT →
            </span>
          </Link>
        </div>

        {/* Next lesson */}
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
            Continue Learning
          </h2>
          {nextLesson ? (
            <Link
              href={`/dashboard/student/lesson/${nextLesson.concept_id}`}
              className="glass-card group flex items-center gap-4 p-5 transition-all hover:shadow-xl"
            >
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                  `bg-[${DOMAIN_COLORS[nextLesson.concepts?.domain as SATDomain]?.hex}]/10`
                )}
                style={{
                  backgroundColor:
                    DOMAIN_COLORS[nextLesson.concepts?.domain as SATDomain]?.hex + "20",
                }}
              >
                <BookOpen
                  className="h-5 w-5"
                  style={{ color: DOMAIN_COLORS[nextLesson.concepts?.domain as SATDomain]?.hex }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900 dark:text-white">
                  {nextLesson.concepts?.title || "Next Lesson"}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <span>
                    {DOMAIN_LABELS[nextLesson.concepts?.domain as SATDomain] || "SAT Math"}
                  </span>
                  <span>·</span>
                  <span>{nextLesson.status === "in_progress" ? "In progress" : "Ready"}</span>
                  {nextLesson.quiz_score !== null && (
                    <>
                      <span>·</span>
                      <span>{nextLesson.quiz_score}%</span>
                    </>
                  )}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-colors group-hover:text-blue-500" />
            </Link>
          ) : (
            <div className="glass-card p-5 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No lessons unlocked yet — head to your{" "}
                <Link
                  href="/dashboard/student/progress"
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  progress page
                </Link>{" "}
                to see where you&apos;re starting from.
              </p>
            </div>
          )}
        </div>

        {/* Domain progress — new tabbed component (Reading / Math) */}
        <DomainProgress statuses={nodeStatusMap} />

        {/* Recent activity */}
        {progress.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
              Recent Activity
            </h2>
            <div className="space-y-2">
              {progress.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      p.status === "mastered"
                        ? "bg-emerald-500"
                        : p.status === "in_progress"
                          ? "bg-blue-500"
                          : p.status === "available"
                            ? "bg-amber-400"
                            : "bg-slate-300"
                    )}
                  />
                  <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                    {p.concepts?.title || "Concept"}
                  </span>
                  {p.status === "locked" && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                  {p.status === "mastered" && (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  )}
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
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={6}
        className="stroke-slate-200 dark:stroke-slate-700"
        fill="none"
      />
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
        className="rotate-90 fill-slate-900 text-[11px] font-bold dark:fill-white"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
      >
        {pct}%
      </text>
    </svg>
  );
}
