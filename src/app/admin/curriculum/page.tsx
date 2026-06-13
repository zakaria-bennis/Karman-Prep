// ============================================================
// /admin/curriculum — Node browser + Flagged tab (dark).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import {
  groupNodesForAdmin,
  SUBJECT_LABELS,
  nodeAtmosphere,
  ATMOSPHERE_COLORS,
} from "@/data/curriculum";
import { fetchFlaggedQuestions, fetchFlaggedQuestionCount } from "@/lib/supabase/queries/quiz";
import FlagReviewList from "@/components/admin/FlagReviewList";
import NodeQuestionSearch from "@/components/admin/NodeQuestionSearch";

export const metadata: Metadata = { title: "Admin — Curriculum | Karman" };

async function fetchQuestionCounts(): Promise<Map<string, number>> {
  const supabase = createAdminClient();
  // Count live questions only — needs_review (flagged) questions
  // aren't being served, so showing them in the per-node count
  // misleads the curriculum browser.
  const { data } = await supabase
    .from("quiz_questions")
    .select("node_id")
    .not("node_id", "is", null)
    .eq("is_live", true);
  const map = new Map<string, number>();
  for (const r of data ?? []) {
    const n = (r as { node_id: string | null }).node_id;
    if (n) map.set(n, (map.get(n) ?? 0) + 1);
  }
  return map;
}

/** Count of questions in the bank — node_id IS NULL and ok. */
async function fetchBankCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .is("node_id", null)
    .eq("is_live", true);
  return count ?? 0;
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminCurriculumPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const activeTab = tab === "flagged" ? "flagged" : "nodes";

  const grouped = groupNodesForAdmin();
  // Always fetch the unresolved-flag COUNT so the blue badge on the
  // Flagged tab is accurate even while the user is on the Nodes tab.
  // Only fetch the FULL flag list (with joined questions) when the
  // user is actually on the Flagged tab — that payload is heavy.
  const [counts, bankCount, flaggedCount, flagged] = await Promise.all([
    fetchQuestionCounts(),
    fetchBankCount(),
    fetchFlaggedQuestionCount(),
    activeTab === "flagged" ? fetchFlaggedQuestions() : Promise.resolve([]),
  ]);

  // Total live questions across every curriculum node — the main
  // headline metric. Sum of the per-node map (which already filters
  // to import_status=ok and node_id IS NOT NULL).
  const totalAttached = Array.from(counts.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      {/* Page header — total counts at a glance */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ivory">Curriculum</h1>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-taupe">
          <span>
            <span className="text-base font-bold text-ivory">{totalAttached.toLocaleString()}</span>
            <span className="ml-1.5">
              question{totalAttached === 1 ? "" : "s"} across all nodes
            </span>
          </span>
          {bankCount > 0 && (
            <span>
              <span className="text-sm font-semibold text-gold-bright">
                {bankCount.toLocaleString()}
              </span>
              <span className="ml-1.5">in bank</span>
            </span>
          )}
          {flaggedCount > 0 && (
            <span>
              <span className="text-sm font-semibold text-warning-bright">
                {flaggedCount.toLocaleString()}
              </span>
              <span className="ml-1.5">flagged</span>
            </span>
          )}
        </div>
      </header>

      {/* Tabs row + search bar (top-right) */}
      <div className="mb-6 flex items-center gap-1 border-b border-bronze text-sm">
        <Link
          href="/admin/curriculum"
          className={`border-b-2 px-4 pb-3 font-semibold ${activeTab === "nodes" ? "border-gold/40 text-gold" : "border-transparent text-taupe hover:text-ivory"}`}
        >
          Nodes
        </Link>
        <Link
          href="/admin/curriculum?tab=flagged"
          className={`inline-flex items-center gap-2 border-b-2 px-4 pb-3 font-semibold ${activeTab === "flagged" ? "border-gold/40 text-gold" : "border-transparent text-taupe hover:text-ivory"}`}
        >
          Flagged
          {flaggedCount > 0 && (
            <span
              aria-label={`${flaggedCount} unresolved flag${flaggedCount === 1 ? "" : "s"}`}
              className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-info px-1.5 text-[11px] font-bold leading-none text-ivory"
            >
              {flaggedCount}
            </span>
          )}
        </Link>
        {/* Search bar: bottom-aligned with the tabs, pushed to the right */}
        <div className="ml-auto pb-2">
          <NodeQuestionSearch />
        </div>
      </div>

      {/* Bank-count chip — visible only when there are questions waiting */}
      {bankCount > 0 && activeTab === "nodes" && (
        <Link
          href="/admin/questions/review?tab=bank"
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/[0.06] px-3 py-2 text-xs text-gold-bright transition-colors hover:bg-gold/[0.12]"
        >
          <Inbox className="h-3.5 w-3.5" />
          <span>
            <span className="font-semibold">
              {bankCount} question{bankCount === 1 ? "" : "s"} in bank
            </span>
            <span className="text-gold-bright/70">
              {" "}
              — click to triage and assign curriculum nodes
            </span>
          </span>
        </Link>
      )}

      {activeTab === "nodes" ? (
        <div className="space-y-10">
          {(["reading", "math"] as const).map((subject) => (
            <section key={subject}>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-taupe">
                {SUBJECT_LABELS[subject]}
              </h2>
              <div className="space-y-4">
                {([1, 2, 3] as const).map((tier) => {
                  const clusters = grouped[subject][tier];
                  if (!clusters || Object.keys(clusters).length === 0) return null;
                  const atmo = nodeAtmosphere(tier);
                  const atmoHex = ATMOSPHERE_COLORS[atmo].hex;
                  const atmoSubtitle =
                    atmo === "Troposphere"
                      ? "easiest · foundational concepts"
                      : atmo === "Mesosphere"
                        ? "intermediate · core SAT skills"
                        : "hardest · advanced mastery";
                  return (
                    <div
                      key={tier}
                      className="overflow-hidden rounded-xl border border-bronze bg-surface/40"
                    >
                      <div
                        className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em]"
                        style={{
                          background: atmoHex + "15",
                          color: atmoHex,
                          borderBottom: `1px solid ${atmoHex}30`,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: atmoHex }}
                        />
                        {atmo}
                        <span className="ml-1 font-normal normal-case tracking-normal text-taupe">
                          · {atmoSubtitle}
                        </span>
                      </div>
                      <div className="divide-y divide-bronze">
                        {Object.entries(clusters).map(([cluster, nodes]) => (
                          <div key={cluster}>
                            <div className="bg-surface/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-taupe">
                              {cluster}
                            </div>
                            <ul>
                              {nodes.map((n) => {
                                const count = counts.get(n.id) ?? 0;
                                const countClass =
                                  count === 0
                                    ? "bg-error/10 text-error-bright border-error/30"
                                    : count < 10
                                      ? "bg-warning/10 text-warning-bright border-warning/30"
                                      : count >= 100
                                        ? "bg-success/10 text-success-bright border-success/30"
                                        : "bg-gold/10 text-gold-bright border-gold/30";
                                return (
                                  <li key={n.id}>
                                    <Link
                                      href={`/admin/curriculum/${n.id}`}
                                      className="group flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-surface/5"
                                    >
                                      <code className="w-14 shrink-0 font-mono text-xs text-taupe">
                                        {n.id}
                                      </code>
                                      <span className="flex-1 truncate text-sm font-medium text-ivory group-hover:text-ivory">
                                        {n.topic}
                                      </span>
                                      <span className="flex items-center gap-3 text-xs text-taupe">
                                        <span>Diff {n.difficulty}</span>
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums ${countClass}`}
                                        >
                                          {count} / 100
                                        </span>
                                        <ChevronRight className="h-3.5 w-3.5 text-taupe group-hover:text-ivory" />
                                      </span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <FlagReviewList flagged={flagged} />
      )}
    </div>
  );
}
