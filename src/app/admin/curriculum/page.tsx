// ============================================================
// /admin/curriculum — Node browser + Flagged tab (dark).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { groupNodesForAdmin, SUBJECT_LABELS, nodeAtmosphere, ATMOSPHERE_COLORS } from "@/data/curriculum";
import { fetchFlaggedQuestions } from "@/lib/supabase/queries/quiz";
import FlagReviewList from "@/components/admin/FlagReviewList";

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
    .or("import_status.is.null,import_status.eq.ok");
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
    .or("import_status.is.null,import_status.eq.ok");
  return count ?? 0;
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminCurriculumPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const activeTab = tab === "flagged" ? "flagged" : "nodes";

  const grouped = groupNodesForAdmin();
  const [counts, bankCount, flagged] = await Promise.all([
    fetchQuestionCounts(),
    fetchBankCount(),
    activeTab === "flagged" ? fetchFlaggedQuestions() : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      {/* Top tabs */}
      <div className="mb-6 border-b border-slate-800 flex gap-1 text-sm">
        <Link
          href="/admin/curriculum"
          className={`px-4 pb-3 font-semibold border-b-2 ${activeTab === "nodes" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-200"}`}
        >
          Nodes
        </Link>
        <Link
          href="/admin/curriculum?tab=flagged"
          className={`px-4 pb-3 font-semibold border-b-2 ${activeTab === "flagged" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-200"}`}
        >
          Flagged {flagged.length > 0 && <span className="text-rose-400">({flagged.length})</span>}
        </Link>
      </div>

      {/* Bank-count chip — visible only when there are questions waiting */}
      {bankCount > 0 && activeTab === "nodes" && (
        <Link
          href="/admin/questions/review?tab=bank"
          className="mb-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-500/30 bg-indigo-500/[0.06] text-xs text-indigo-200 hover:bg-indigo-500/[0.12] transition-colors"
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>
            <span className="font-semibold">{bankCount} question{bankCount === 1 ? "" : "s"} in bank</span>
            <span className="text-indigo-300/70"> — click to triage and assign curriculum nodes</span>
          </span>
        </Link>
      )}

      {activeTab === "nodes" ? (
        <div className="space-y-10">
          <p className="text-sm text-slate-400 max-w-2xl">
            Pick a node to manage its <span className="text-white">questions</span>, <span className="text-white">textbook page</span>, and <span className="text-white">video</span>. Question counts appear next to each node.
          </p>

          {(["reading", "math"] as const).map((subject) => (
            <section key={subject}>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.25em] mb-4">
                {SUBJECT_LABELS[subject]}
              </h2>
              <div className="space-y-4">
                {([1, 2, 3] as const).map((tier) => {
                  const clusters = grouped[subject][tier];
                  if (!clusters || Object.keys(clusters).length === 0) return null;
                  const atmo = nodeAtmosphere(tier);
                  const atmoHex = ATMOSPHERE_COLORS[atmo].hex;
                  const atmoSubtitle =
                    atmo === "Troposphere"  ? "easiest · foundational concepts" :
                    atmo === "Mesosphere"   ? "intermediate · core SAT skills" :
                                              "hardest · advanced mastery";
                  return (
                    <div key={tier} className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
                      <div
                        className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] flex items-center gap-2"
                        style={{ background: atmoHex + "15", color: atmoHex, borderBottom: `1px solid ${atmoHex}30` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: atmoHex }} />
                        {atmo}
                        <span className="text-slate-500 font-normal tracking-normal normal-case ml-1">· {atmoSubtitle}</span>
                      </div>
                      <div className="divide-y divide-slate-800">
                        {Object.entries(clusters).map(([cluster, nodes]) => (
                          <div key={cluster}>
                            <div className="px-4 py-1.5 bg-slate-900/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                              {cluster}
                            </div>
                            <ul>
                              {nodes.map((n) => {
                                const count = counts.get(n.id) ?? 0;
                                const countClass =
                                  count === 0
                                    ? "bg-red-500/10 text-red-300 border-red-500/30"
                                    : count < 10
                                    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                    : count >= 100
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                    : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30";
                                return (
                                  <li key={n.id}>
                                    <Link
                                      href={`/admin/curriculum/${n.id}`}
                                      className="flex items-center gap-4 px-4 py-2.5 hover:bg-white/5 transition-colors group"
                                    >
                                      <code className="text-xs font-mono text-slate-500 shrink-0 w-14">{n.id}</code>
                                      <span className="text-sm font-medium text-slate-200 group-hover:text-white flex-1 truncate">
                                        {n.topic}
                                      </span>
                                      <span className="text-xs text-slate-500 flex items-center gap-3">
                                        <span>Diff {n.difficulty}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums border ${countClass}`}>
                                          {count} / 100
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300" />
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
