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
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Sparkles,
  Target,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { createAdminClient } from "@/lib/supabase/server";
import { DOMAIN_LABELS, type SATDomain, type DomainScores } from "@/types";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Slug → label / domain tables for the diagnostic's topic
// taxonomy. Centralized so the same mapping is used when the
// constellation graph eventually adopts these slugs.
// ─────────────────────────────────────────────────────────────
const TOPIC_LABELS: Record<string, string> = {
  // Math — Algebra
  "linear-equations": "Linear equations",
  "systems-of-equations": "Systems of equations",
  "linear-inequalities": "Linear inequalities",
  inequalities: "Inequalities",
  "linear-functions": "Linear functions",
  // Math — Advanced
  quadratics: "Quadratic equations",
  "quadratic-vertex": "Quadratic vertex form",
  polynomials: "Polynomial functions",
  "exponential-functions": "Exponential functions",
  "rational-expressions": "Rational expressions",
  // Math — Geometry & Trig
  triangles: "Triangles",
  circles: "Circles",
  "coordinate-geometry": "Coordinate geometry",
  trigonometry: "Trigonometry",
  volume: "Volume",
  // Math — Problem-solving & Data
  "ratios-rates": "Ratios & rates",
  percentages: "Percentages",
  "statistics-mean-median": "Mean & median",
  statistics: "Statistics",
  probability: "Probability",
  "data-interpretation": "Data interpretation",
  // R&W — Information & Ideas
  "central-idea": "Central idea",
  "command-of-evidence": "Command of evidence",
  inference: "Inference",
  "quantitative-evidence": "Quantitative evidence",
  // R&W — Craft & Structure
  "words-in-context": "Words in context",
  purpose: "Author's purpose",
  "text-structure": "Text structure",
  "cross-text-connections": "Cross-text connections",
  // R&W — Expression of Ideas
  transitions: "Transitions",
  "rhetorical-synthesis": "Rhetorical synthesis",
  precision: "Precision",
  // R&W — Standard English Conventions
  "subject-verb-agreement": "Subject-verb agreement",
  punctuation: "Punctuation",
  "sentence-boundaries": "Sentence boundaries",
};

const TOPIC_DOMAIN: Record<string, SATDomain> = {
  "linear-equations": "algebra",
  "systems-of-equations": "algebra",
  "linear-inequalities": "algebra",
  inequalities: "algebra",
  "linear-functions": "algebra",
  quadratics: "advanced_math",
  "quadratic-vertex": "advanced_math",
  polynomials: "advanced_math",
  "exponential-functions": "advanced_math",
  "rational-expressions": "advanced_math",
  triangles: "geometry",
  circles: "geometry",
  "coordinate-geometry": "geometry",
  trigonometry: "geometry",
  volume: "geometry",
  "ratios-rates": "data_analysis",
  percentages: "data_analysis",
  "statistics-mean-median": "data_analysis",
  statistics: "data_analysis",
  probability: "data_analysis",
  "data-interpretation": "data_analysis",
  "central-idea": "info_ideas",
  "command-of-evidence": "info_ideas",
  inference: "info_ideas",
  "quantitative-evidence": "info_ideas",
  "words-in-context": "craft_structure",
  purpose: "craft_structure",
  "text-structure": "craft_structure",
  "cross-text-connections": "craft_structure",
  transitions: "expression_ideas",
  "rhetorical-synthesis": "expression_ideas",
  precision: "expression_ideas",
  "subject-verb-agreement": "conventions",
  punctuation: "conventions",
  "sentence-boundaries": "conventions",
};

function topicLabel(slug: string): string {
  return TOPIC_LABELS[slug] ?? slug.replace(/-/g, " ");
}

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
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const supabase = createAdminClient();

  // Resolve internal user id
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();
  const internalId = (user as { id?: string } | null)?.id ?? null;

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

  const latestMid = latest ? Math.round((latest.score_range_low + latest.score_range_high) / 2) : null;
  const firstMid = first ? Math.round((first.score_range_low + first.score_range_high) / 2) : null;
  const delta = latestMid !== null && firstMid !== null && diagnostics.length > 1 ? latestMid - firstMid : null;

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
      const dom = TOPIC_DOMAIN[slug];
      if (!dom) continue;
      weakByDomain[dom].push(slug);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <header className="mb-6">
          <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-1">Progress</p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-slate-400" />
            Your progress
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Diagnostic snapshots, weak-topic focus areas, and constellation mastery — all in one place.
          </p>
        </header>

        {!latest ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {/* ─── Top row: predicted score + mastery ──────────── */}
            <div className="grid sm:grid-cols-2 gap-4">
              <PredictedCard
                low={latest.score_range_low}
                high={latest.score_range_high}
                delta={delta}
                takenAt={latest.taken_at}
              />
              <CounterCard
                icon={<Sparkles className="w-4 h-4" />}
                label="Concepts mastered"
                value={masteredCount}
                hint={inProgressCount > 0 ? `${inProgressCount} in progress` : "Keep going"}
              />
            </div>

            {/* ─── Domain breakdown ──────────────────────────── */}
            <DomainBreakdown scores={latest.domain_scores} />

            {/* ─── Weak topics ───────────────────────────────── */}
            <WeakTopics weakByDomain={weakByDomain} />
            {/* (No re-take CTA — the diagnostic is one-and-done per
                student. Resets only happen via admin script.) */}
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
    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 px-8 py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
        <TrendingUp className="w-7 h-7 text-white" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">No diagnostic on file yet</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        Take your first diagnostic — 35 questions, ~35 minutes — and your predicted SAT range,
        domain breakdown, and weak topics will all show up here.
      </p>
      <Link
        href="/diagnostic"
        className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.35)]"
      >
        Take the diagnostic
        <ArrowRight className="w-4 h-4" />
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
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
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
                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                : delta < 0
                  ? "text-rose-500 font-semibold"
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
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 inline-flex items-center gap-1.5">
        <span className="text-blue-500 dark:text-blue-400">{icon}</span>
        {label}
      </p>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

const MATH_DOMAINS: SATDomain[] = ["algebra", "advanced_math", "geometry", "data_analysis"];
const RW_DOMAINS: SATDomain[] = ["info_ideas", "craft_structure", "expression_ideas", "conventions"];

function DomainBreakdown({ scores }: { scores: DomainScores }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5">
      <h2 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        Domain breakdown
        <span className="text-xs font-normal text-slate-400">(latest diagnostic)</span>
      </h2>

      <DomainSubsection title="Math" domains={MATH_DOMAINS} scores={scores} />
      <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
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
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">{title}</p>
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

function WeakTopics({ weakByDomain }: { weakByDomain: Record<SATDomain, string[]> }) {
  const domains = (Object.keys(weakByDomain) as SATDomain[]).filter(
    (d) => weakByDomain[d].length > 0
  );
  if (domains.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-900/10 px-5 py-4">
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          No weak topics flagged
        </p>
        <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
          You answered every question correctly on the diagnostic. Strong starting point — your learning path will push the harder material.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5">
      <h2 className="font-bold text-slate-900 dark:text-white mb-3 inline-flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500" />
        Topics to focus on
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Pulled from the topics you missed on your latest diagnostic, grouped by domain.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {domains.map((d) => (
          <div
            key={d}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3"
          >
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              {DOMAIN_LABELS[d]}
            </p>
            <ul className="space-y-1">
              {weakByDomain[d].map((slug) => (
                <li
                  key={slug}
                  className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                >
                  <span className="w-1 h-1 rounded-full bg-amber-500" />
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
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}
