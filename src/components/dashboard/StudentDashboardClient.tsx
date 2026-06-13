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
  /** True when the user's onboarding placement failed AND they
   *  still have no cohort/tutor (audit #10). Drives the
   *  "we're matching you with a tutor" banner. */
  showPlacementBanner?: boolean;
}

/** Calculates streak from last_visited dates (simplified) */
function calculateStreak(progress: Props["progress"]): number {
  const visited = progress
    .filter((p) => p.last_visited)
    .map((p) => new Date(p.last_visited!).toDateString());
  const uniqueDays = new Set(visited);
  return Math.min(uniqueDays.size, 30); // Cap display at 30
}

export default function StudentDashboardClient({
  progress,
  nodeStatuses,
  diagnostic,
  subscription,
  showPlacementBanner,
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
        {/* Placement-pending banner (audit #10) — shown while the
            student is waiting on admin to pair them with a tutor /
            cohort after an onboarding placement failure. Self-clears
            once the cohort_members / tutor_assignments row exists. */}
        {showPlacementBanner && (
          <div className="rounded-xl border border-info/40 bg-info/10 px-4 py-3 text-sm dark:border-info/40 dark:bg-info/20">
            <p className="font-semibold text-info dark:text-info-bright">
              We&rsquo;re matching you with a tutor
            </p>
            <p className="mt-0.5 text-xs text-info/80 dark:text-info-bright/80">
              Your answers are saved. Our team is pairing you with the right tutor / cohort &mdash;
              you&rsquo;ll hear from us within 24 hours. In the meantime you can take the diagnostic
              and start exploring the curriculum.
            </p>
          </div>
        )}

        {/* Trial banner */}
        {subscription?.status === "trialing" && trialEndsLabel && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 dark:border-warning/40 dark:bg-warning/20">
            <p className="text-sm font-medium text-warning dark:text-warning-bright">
              {trialEndsLabel} — your card will be charged automatically.
            </p>
            <Link
              href="/billing"
              className="flex items-center gap-1 text-sm font-semibold text-warning hover:underline dark:text-warning"
            >
              Manage plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Top stats row — two are clickable and open detail pages */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Streak */}
          <div className="glass-card flex flex-col items-center gap-1 p-4">
            <Flame className="h-6 w-6 text-warning" />
            <span className="text-3xl font-extrabold text-ivory dark:text-ivory">{streak}</span>
            <span className="text-xs text-taupe dark:text-taupe">day streak</span>
          </div>

          {/* Progress ring */}
          <div className="glass-card flex flex-col items-center gap-1 p-4">
            <ProgressRing pct={overallPct} size={56} />
            <span className="mt-1 text-xs text-taupe dark:text-taupe">overall</span>
          </div>

          {/* Mastered concepts → /dashboard/student/mastered */}
          <Link
            href="/dashboard/student/mastered"
            className="glass-card group flex cursor-pointer flex-col items-center gap-1 p-4 transition-shadow hover:shadow-xl"
          >
            <CheckCircle className="h-6 w-6 text-success transition-transform group-hover:scale-110" />
            <span className="text-3xl font-extrabold text-ivory dark:text-ivory">
              {masteredCount}
            </span>
            <span className="text-xs text-taupe transition-colors group-hover:text-success dark:text-taupe">
              mastered →
            </span>
          </Link>

          {/* Predicted score → /dashboard/student/predicted-sat */}
          <Link
            href="/dashboard/student/predicted-sat"
            className="glass-card group flex cursor-pointer flex-col items-center gap-1 p-4 transition-shadow hover:shadow-xl"
          >
            <TrendingUp className="h-6 w-6 text-info transition-transform group-hover:scale-110" />
            <span className="text-2xl font-extrabold text-ivory dark:text-ivory">
              {diagnostic ? `${diagnostic.score_range_low}–${diagnostic.score_range_high}` : "—"}
            </span>
            <span className="text-xs text-taupe transition-colors group-hover:text-info dark:text-taupe">
              predicted SAT →
            </span>
          </Link>
        </div>

        {/* Next lesson */}
        <div>
          <h2 className="mb-3 text-lg font-bold text-ivory dark:text-ivory">Continue Learning</h2>
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
                <p className="truncate font-semibold text-ivory dark:text-ivory">
                  {nextLesson.concepts?.title || "Next Lesson"}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-taupe dark:text-taupe">
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
              <ArrowRight className="h-5 w-5 text-taupe transition-colors group-hover:text-info" />
            </Link>
          ) : (
            <div className="glass-card p-5 text-center">
              <p className="text-sm text-taupe dark:text-taupe">
                No lessons unlocked yet — head to your{" "}
                <Link
                  href="/dashboard/student/progress"
                  className="font-medium text-info hover:underline dark:text-info"
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
            <h2 className="mb-3 text-lg font-bold text-ivory dark:text-ivory">Recent Activity</h2>
            <div className="space-y-2">
              {progress.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-bronze bg-surface px-4 py-3 dark:border-bronze dark:bg-surface-raised/50"
                >
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      p.status === "mastered"
                        ? "bg-success"
                        : p.status === "in_progress"
                          ? "bg-info"
                          : p.status === "available"
                            ? "bg-warning"
                            : "bg-surface"
                    )}
                  />
                  <span className="flex-1 truncate text-sm text-ivory dark:text-ivory">
                    {p.concepts?.title || "Concept"}
                  </span>
                  {p.status === "locked" && <Lock className="h-3.5 w-3.5 text-taupe" />}
                  {p.status === "mastered" && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                  {p.quiz_score !== null && (
                    <span className="text-xs text-taupe">{p.quiz_score}%</span>
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
        className="stroke-ivory dark:stroke-ivory"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={6}
        fill="none"
        stroke="#2FA8FF"
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
        className="rotate-90 fill-ivory text-[11px] font-bold dark:fill-white"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
      >
        {pct}%
      </text>
    </svg>
  );
}
