// ============================================================
// /admin/curriculum — Node browser + Flagged tab
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { groupNodesForAdmin, SUBJECT_LABELS, TIER_LABELS } from "@/data/curriculum";
import { fetchFlaggedQuestions } from "@/lib/supabase/queries/quiz";
import FlagReviewList from "@/components/admin/FlagReviewList";

export const metadata: Metadata = { title: "Admin — Curriculum | Strata" };

async function fetchQuestionCounts(): Promise<Map<string, number>> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("quiz_questions").select("node_id");
  const map = new Map<string, number>();
  for (const r of data ?? []) {
    const n = (r as { node_id: string }).node_id;
    map.set(n, (map.get(n) ?? 0) + 1);
  }
  return map;
}

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminCurriculumPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const activeTab = tab === "flagged" ? "flagged" : "nodes";

  const grouped = groupNodesForAdmin();
  const [counts, flagged] = await Promise.all([
    fetchQuestionCounts(),
    activeTab === "flagged" ? fetchFlaggedQuestions() : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-800 flex gap-4">
        <Link
          href="/admin/curriculum"
          className={`pb-3 text-sm font-semibold border-b-2 ${activeTab === "nodes" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
        >
          Nodes
        </Link>
        <Link
          href="/admin/curriculum?tab=flagged"
          className={`pb-3 text-sm font-semibold border-b-2 ${activeTab === "flagged" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
        >
          Flagged Questions {flagged.length > 0 && `(${flagged.length})`}
        </Link>
      </div>

      {activeTab === "nodes" ? (
        <div className="space-y-8">
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Select a node to manage its quiz questions. Question counts appear next to each node.
          </p>

          {(["reading", "math"] as const).map((subject) => (
            <section key={subject}>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                {SUBJECT_LABELS[subject]}
              </h2>
              <div className="space-y-5">
                {([1, 2, 3] as const).map((tier) => {
                  const clusters = grouped[subject][tier];
                  if (!clusters || Object.keys(clusters).length === 0) return null;
                  return (
                    <div key={tier} className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        Tier {tier} · {TIER_LABELS[tier]}
                      </div>
                      <div className="divide-y divide-slate-200 dark:divide-slate-800">
                        {Object.entries(clusters).map(([cluster, nodes]) => (
                          <div key={cluster}>
                            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                              {cluster}
                            </div>
                            <ul>
                              {nodes.map((n) => {
                                const count = counts.get(n.id) ?? 0;
                                return (
                                  <li key={n.id}>
                                    <Link
                                      href={`/admin/curriculum/${n.id}`}
                                      className="flex items-center gap-4 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                      <code className="text-xs font-mono text-slate-400 shrink-0 w-14">{n.id}</code>
                                      <span className="text-sm font-medium text-slate-900 dark:text-white flex-1 truncate">
                                        {n.topic}
                                      </span>
                                      <span className="text-xs text-slate-500 flex items-center gap-3">
                                        <span>Difficulty {n.difficulty}</span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                                            count === 0
                                              ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                              : count < 10
                                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                              : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                          }`}
                                        >
                                          {count} {count === 1 ? "question" : "questions"}
                                        </span>
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
