"use client";

// ============================================================
// DomainProgress — tabbed view of a student's mastery progress
// broken down by official College Board SAT domain groupings.
//
// Each node in curriculum.ts has a `topic_cluster`. We group by
// cluster and render a bar per cluster. Two tabs: Reading / Math.
// ============================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Calculator, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RW_NODES,
  MATH_NODES,
  SUBJECT_COLORS,
  type Subject,
  type NodeStatus,
} from "@/data/curriculum";

interface Props {
  statuses: Map<string, NodeStatus>;
}

interface DomainRow {
  cluster: string;
  total: number;
  mastered: number;
  inProgress: number;
}

function buildDomains(nodes: typeof RW_NODES, statuses: Map<string, NodeStatus>): DomainRow[] {
  const map = new Map<string, DomainRow>();
  for (const n of nodes) {
    if (!map.has(n.topic_cluster)) {
      map.set(n.topic_cluster, { cluster: n.topic_cluster, total: 0, mastered: 0, inProgress: 0 });
    }
    const row = map.get(n.topic_cluster)!;
    row.total++;
    const s = statuses.get(n.id);
    if (s === "mastered") row.mastered++;
    if (s === "in_progress" || s === "partially_complete") row.inProgress++;
  }
  return Array.from(map.values());
}

export default function DomainProgress({ statuses }: Props) {
  const [tab, setTab] = useState<Subject>("reading");

  const readingDomains = useMemo(() => buildDomains(RW_NODES, statuses), [statuses]);
  const mathDomains = useMemo(() => buildDomains(MATH_NODES, statuses), [statuses]);

  const domains = tab === "reading" ? readingDomains : mathDomains;
  const hex = SUBJECT_COLORS[tab].hex;

  const totalMastered = domains.reduce((a, d) => a + d.mastered, 0);
  const totalNodes = domains.reduce((a, d) => a + d.total, 0);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Domain progress</h2>

        {/* Subject tabs */}
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-900">
          <button
            onClick={() => setTab("reading")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 font-semibold",
              tab === "reading"
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            )}
            style={tab === "reading" ? { background: "rgba(236, 72, 153, 0.1)" } : undefined}
          >
            <BookOpen className="h-3 w-3" /> Reading
          </button>
          <button
            onClick={() => setTab("math")}
            className={cn(
              "flex items-center gap-1.5 border-l border-slate-200 px-3 py-2 font-semibold dark:border-slate-700",
              tab === "math"
                ? "text-sky-500"
                : "text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
            style={tab === "math" ? { background: "rgba(56, 189, 248, 0.1)" } : undefined}
          >
            <Calculator className="h-3 w-3" /> Math
          </button>
        </div>
      </div>

      <div className="glass-card p-5">
        {/* Overall strip */}
        <div className="mb-5 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              {tab === "reading" ? "Reading & Writing overall" : "Math overall"}
            </span>
            <span className="text-xs tabular-nums text-slate-400">
              {totalMastered} / {totalNodes}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(totalMastered / Math.max(1, totalNodes)) * 100}%`,
                background: hex,
              }}
            />
          </div>
        </div>

        {/* Per-domain rows */}
        <div className="space-y-3">
          {domains.map((d) => {
            const pct = Math.round((d.mastered / Math.max(1, d.total)) * 100);
            return (
              <div key={d.cluster}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {d.cluster}
                  </span>
                  <div className="ml-2 flex shrink-0 items-center gap-2 text-xs tabular-nums text-slate-400">
                    {d.inProgress > 0 && (
                      <span className="text-blue-500">{d.inProgress} in progress</span>
                    )}
                    <span className="font-bold" style={{ color: hex }}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: hex }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href={`/learn/${tab}`}
          className="mt-5 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
          style={{ color: hex }}
        >
          Open {tab === "reading" ? "Reading" : "Math"} constellation{" "}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
