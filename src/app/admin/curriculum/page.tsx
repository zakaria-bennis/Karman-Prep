// ============================================================
// /admin/curriculum — Node browser + Flagged tab.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  WbPage,
  WbPill,
  WbSection,
  WbStats,
  WbTable,
  WbTabs,
  WbToolbar,
  type Tone,
} from "@/components/admin/workbench";
import { createAdminClient } from "@/lib/supabase/server";
import {
  groupNodesForAdmin,
  SUBJECT_LABELS,
  nodeAtmosphere,
  type CurriculumNode,
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

const PATH = "/admin/curriculum";
const n = (value: number) => value.toLocaleString("en-US");

const ATMOSPHERE_NOTE = {
  Troposphere: "Easiest: foundational concepts",
  Mesosphere: "Intermediate: core SAT skills",
  Stratosphere: "Hardest: advanced mastery",
} as const;

/** 0 is empty, under 10 is thin, 100 or more is full. */
function countTone(count: number): Tone {
  if (count === 0) return "fail";
  if (count < 10) return "warn";
  if (count >= 100) return "ok";
  return "info";
}

type NodeRow = CurriculumNode & { cluster: string };

export default async function AdminCurriculumPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const activeTab = tab === "flagged" ? "flagged" : "nodes";

  const grouped = groupNodesForAdmin();
  // Always fetch the unresolved-flag COUNT so the badge on the
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
  // to is_live and node_id IS NOT NULL).
  const totalAttached = Array.from(counts.values()).reduce((a, b) => a + b, 0);

  return (
    <WbPage
      title="Curriculum"
      summary="Every curriculum node with its live question count (the goal is 100 each), and the questions students have flagged."
    >
      <WbStats
        items={[
          { label: "Questions across all nodes", value: n(totalAttached) },
          { label: "In the bank, no node yet", value: n(bankCount) },
          { label: "Open flags", value: n(flaggedCount) },
        ]}
      />

      <WbToolbar>
        <WbTabs
          label="Curriculum view"
          param="tab"
          value={activeTab}
          basePath={PATH}
          options={[
            { value: "nodes", label: "Nodes" },
            { value: "flagged", label: "Flagged", count: flaggedCount },
          ]}
        />
        <div style={{ marginLeft: "auto" }}>
          <NodeQuestionSearch />
        </div>
      </WbToolbar>

      {/* Bank note — only when there are questions waiting */}
      {bankCount > 0 && activeTab === "nodes" && (
        <p className="wb-note">
          {n(bankCount)} question{bankCount === 1 ? " is" : "s are"} in the bank without a node.{" "}
          <Link href="/admin/questions/review?tab=bank">Triage and assign nodes</Link>
        </p>
      )}

      {activeTab === "nodes" ? (
        (["reading", "math"] as const).map((subject) => (
          <WbSection key={subject} title={SUBJECT_LABELS[subject]}>
            <div style={{ display: "grid", gap: 16 }}>
              {([1, 2, 3] as const).map((tier) => {
                const clusters = grouped[subject][tier];
                if (!clusters || Object.keys(clusters).length === 0) return null;
                const atmo = nodeAtmosphere(tier);
                const rows: NodeRow[] = Object.entries(clusters).flatMap(([cluster, nodes]) =>
                  nodes.map((node) => ({ ...node, cluster }))
                );
                return (
                  <div key={tier} style={{ display: "grid", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>
                      {atmo}{" "}
                      <span className="wb-note" style={{ fontWeight: 400 }}>
                        {ATMOSPHERE_NOTE[atmo as keyof typeof ATMOSPHERE_NOTE] ?? ""}
                      </span>
                    </h3>
                    <WbTable<NodeRow>
                      caption={`${SUBJECT_LABELS[subject]}, ${atmo} nodes`}
                      rows={rows}
                      rowKey={(r) => r.id}
                      empty="No nodes in this tier."
                      columns={[
                        {
                          key: "id",
                          label: "Node",
                          cell: (r) => <code style={{ fontSize: "0.8rem" }}>{r.id}</code>,
                        },
                        {
                          key: "topic",
                          label: "Topic",
                          cell: (r) => (
                            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                              <Link href={`${PATH}/${r.id}`}>{r.topic}</Link>
                              <small>{r.cluster}</small>
                            </span>
                          ),
                        },
                        {
                          key: "difficulty",
                          label: "Difficulty",
                          numeric: true,
                          cell: (r) => r.difficulty,
                        },
                        {
                          key: "count",
                          label: "Live questions",
                          numeric: true,
                          cell: (r) => {
                            const count = counts.get(r.id) ?? 0;
                            return <WbPill tone={countTone(count)}>{count} / 100</WbPill>;
                          },
                        },
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          </WbSection>
        ))
      ) : (
        <FlagReviewList flagged={flagged} />
      )}
    </WbPage>
  );
}
