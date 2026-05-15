// ============================================================
// /dashboard/student/progress — student-facing progress hub.
//
// Surfaces the diagnostic into the rest of the experience:
//   · Latest predicted SAT score range + delta vs first-ever
//   · Domain breakdown (latest snapshot)
//   · Weak topics from the latest diagnostic, grouped by domain
//   · Constellation mastery counter (from learn_node_status)
//   · CTA to (re)take the diagnostic
//
// Server component; one round-trip per data slice.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, Sparkles, AlertCircle, RefreshCcw, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { DOMAIN_LABELS, type SATDomain, type DomainScores } from "@/types";
import { domainFromSlug, labelFromSlug } from "@/lib/question-bank/taxonomy";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

// Slug → label and slug → domain are derived from the canonical
// taxonomy in `lib/question-bank/taxonomy.ts` (which is itself
// derived from `data/curriculum.ts`). Keeping the source of truth
// in one place means a topic rename only needs editing curriculum.ts.
const topicLabel = labelFromSlug;

function domainHeatColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

interface DiagnosticRow {
  id: string;
  taken_at: string;
  score_range_low: number;
  score_range_high: number;
  domain_scores: DomainScores;
  weak_concepts: string[] | null;
}

export default async function StudentProgressPage() {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId: userId } = await resolveEffectiveClerkId(realUserId);

  const supabase = createAdminClient();

  // Resolve internal user id
  const { data: user } = await supabase
    .from("users")
    .select("id, diagnostic_retakes_remaining")
    .eq("clerk_id", userId)
    .maybeSingle();
  const internalId = (user as { id?: string } | null)?.id ?? null;
  const retakesRemaining =
    (user as { diagnostic_retakes_remaining?: number } | null)?.diagnostic_retakes_remaining ?? 0;

  // Diagnostics (newest first; we use [0] = latest, [last] = first)
  let diagnostics: DiagnosticRow[] = [];
  if (internalId) {
    const { data } = await supabase
      .from("diagnostic_results")
      .select("id, taken_at, score_range_low, score_range_high, domain_scores, weak_concepts")
      .eq("user_id", internalId)
      .order("taken_at", { ascending: false });
    diagnostics = (data as DiagnosticRow[] | null) ?? [];
  }

  const latest = diagnostics[0] ?? null;
  const first = diagnostics[diagnostics.length - 1] ?? null;

  // Mastery counter — keyed by Clerk userId per learn_node_status convention.
  const { data: masteryRows } = await supabase
    .from("learn_node_status")
    .select("status")
    .eq("user_id", userId);
  const masteryRowsTyped = (masteryRows ?? []) as Array<{ status: string }>;
  const masteredCount = masteryRowsTyped.filter((r) => r.status === "mastered").length;
  const inProgressCount = masteryRowsTyped.filter((r) => r.status === "in_progress").length;

  const latestMid = latest
    ? Math.round((latest.score_range_low + latest.score_range_high) / 2)
    : null;
  const firstMid = first ? Math.round((first.score_range_low + first.score_range_high) / 2) : null;
  const delta =
    latestMid !== null && firstMid !== null && diagnostics.length > 1 ? latestMid - firstMid : null;

  // Group weak topics by domain for the breakdown card
  const weakByDomain: Record<SATDomain, string[]> = {
    algebra: [],
    advanced_math: [],
    geometry: [],
    data_analysis: [],
    info_ideas: [],
    craft_structure: [],
    expression_ideas: [],
    conventions: [],
  };
  if (latest?.weak_concepts) {
    for (const slug of latest.weak_concepts) {
      const dom = domainFromSlug(slug);
      if (!dom) continue;
      weakByDomain[dom].push(slug);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <header className="mb-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-500">Progress</p>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            <BarChart3 className="h-6 w-6 text-slate-400" />
            Your progress
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Diagnostic snapshots, weak-topic focus areas, and constellation mastery — all in one
            place.
          </p>
        </header>

        {!latest ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {/* ─── Top row: predicted score + mastery ──────────── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <PredictedCard
                low={latest.score_range_low}
                high={latest.score_range_high}
                delta={delta}
                takenAt={latest.taken_at}
              />
              <CounterCard
                icon={<Sparkles className="h-4 w-4" />}
                label="Concepts mastered"
                value={masteredCount}
                hint={inProgressCount > 0 ? `${inProgressCount} in progress` : "Keep going"}
              />
            </div>

            {/* ─── Domain breakdown ──────────────────────────── */}
            <DomainBreakdown scores={latest.domain_scores} />

            {/* ─── Weak topics ───────────────────────────────── */}
            <WeakTopics weakByDomain={weakByDomain} />
            {/* Re-take CTA — only visible when the admin has granted
                a retake. Each click consumes one grant on submit. */}
            {retakesRemaining > 0 ? <RetakeCta /> : null}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-8 py-12 text-center dark:border-slate-700">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600">
        <TrendingUp className="h-7 w-7 text-white" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
        No diagnostic on file yet
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Take your first diagnostic — 35 questions, ~35 minutes — and your predicted SAT range,
        domain breakdown, and weak topics will all show up here.
      </p>
      <Link
        href="/diagnostic"
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(59,130,246,0.35)] hover:from-blue-400 hover:to-indigo-500"
      >
        Take the diagnostic
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function PredictedCard({
  low,
  high,
  delta,
  takenAt,
}: {
  low: number;
  high: number;
  delta: number | null;
  takenAt: string;
}) {
  const mid = Math.round((low + high) / 2);
  const tookAgo = formatDaysAgo(takenAt);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Predicted SAT
      </p>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
        {low}–{high}
      </p>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>Midpoint {mid}</span>
        {delta !== null && (
          <span
            className={
              delta > 0
                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                : delta < 0
                  ? "font-semibold text-rose-500"
                  : "text-slate-400"
            }
          >
            {delta > 0 ? "+" : ""}
            {delta} since first
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] text-slate-400">Taken {tookAgo}</p>
    </div>
  );
}

function CounterCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className="text-blue-500 dark:text-blue-400">{icon}</span>
        {label}
      </p>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

const MATH_DOMAINS: SATDomain[] = ["algebra", "advanced_math", "geometry", "data_analysis"];
const RW_DOMAINS: SATDomain[] = [
  "info_ideas",
  "craft_structure",
  "expression_ideas",
  "conventions",
];

function DomainBreakdown({ scores }: { scores: DomainScores }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40">
      <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
        Domain breakdown
        <span className="text-xs font-normal text-slate-400">(latest diagnostic)</span>
      </h2>

      <DomainSubsection title="Math" domains={MATH_DOMAINS} scores={scores} />
      <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
        <DomainSubsection title="Reading & Writing" domains={RW_DOMAINS} scores={scores} />
      </div>
    </div>
  );
}

function DomainSubsection({
  title,
  domains,
  scores,
}: {
  title: string;
  domains: SATDomain[];
  scores: DomainScores;
}) {
  const entries = domains
    .map((d) => [d, scores[d] ?? 0] as [SATDomain, number])
    .sort((a, b) => a[1] - b[1]);
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <div className="space-y-3">
        {entries.map(([domain, score]) => (
          <div key={domain}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {DOMAIN_LABELS[domain]}
              </span>
              <span className="text-sm font-bold" style={{ color: domainHeatColor(score) }}>
                {score}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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

function WeakTopics({ weakByDomain }: { weakByDomain: Record<SATDomain, string[]> }) {
  const domains = (Object.keys(weakByDomain) as SATDomain[]).filter(
    (d) => weakByDomain[d].length > 0
  );
  if (domains.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-700/40 dark:bg-emerald-900/10">
        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
          <Sparkles className="h-4 w-4" />
          No weak topics flagged
        </p>
        <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
          You answered every question correctly on the diagnostic. Strong starting point — your
          learning path will push the harder material.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40">
      <h2 className="mb-3 inline-flex items-center gap-2 font-bold text-slate-900 dark:text-white">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        Topics to focus on
      </h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Pulled from the topics you missed on your latest diagnostic, grouped by domain.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {domains.map((d) => (
          <div
            key={d}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {DOMAIN_LABELS[d]}
            </p>
            <ul className="space-y-1">
              {weakByDomain[d].map((slug) => (
                <li
                  key={slug}
                  className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200"
                >
                  <span className="h-1 w-1 rounded-full bg-amber-500" />
                  {topicLabel(slug)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDaysAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDay = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDay === 0) return "today";
  if (diffDay === 1) return "yesterday";
  if (diffDay < 30) return `${diffDay} days ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

// ─── Retake CTA ─────────────────────────────────────────────
// Visible only when admin has granted a retake (users.diagnostic_retakes_remaining > 0).
function RetakeCta() {
  return (
    <div className="mt-6 rounded-xl border border-emerald-300/40 bg-emerald-50 px-5 py-4 dark:border-emerald-400/30 dark:bg-emerald-400/10">
      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
        A diagnostic retake is available
      </p>
      <p className="mt-0.5 text-xs text-emerald-800/80 dark:text-emerald-200/80">
        Your admin granted a retake so you can benchmark your progress. Submitting will add a fresh
        diagnostic_results row alongside your prior one &mdash; both show up on your trend chart.
      </p>
      <Link
        href="/diagnostic"
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        <RefreshCcw className="h-3.5 w-3.5" /> Retake diagnostic
      </Link>
    </div>
  );
}
