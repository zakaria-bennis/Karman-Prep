"use client";

// ============================================================
// SkillsOverviewTab — sortable + filterable table of every node.
// Color-coded rows by confidence band.
// ============================================================

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { NodeStatusSnapshot } from "@/lib/supabase/queries/tutor";
import type { ConfidenceBand } from "@/types/quiz";
import { CONFIDENCE_COLORS } from "@/types/quiz";
import {
  RW_NODES,
  MATH_NODES,
  TIER_LABELS,
  type CurriculumNode,
  type Subject,
  type Tier,
} from "@/data/curriculum";
import { cn } from "@/lib/utils";

interface Row extends CurriculumNode {
  status: string;
  best_quiz_score: number | null;
  attempts: number;
  last_attempted: string | null;
  watch_percentage: number | null;
  confidence_band: ConfidenceBand | null;
}

interface Props {
  statuses: NodeStatusSnapshot[];
}

type SortKey = "topic" | "tier" | "cluster" | "status" | "best" | "attempts" | "watch" | "band";

export default function SkillsOverviewTab({ statuses }: Props) {
  const allRows: Row[] = useMemo(() => {
    const statusMap = new Map(statuses.map((s) => [s.node_id, s]));
    return [...RW_NODES, ...MATH_NODES].map((n) => {
      const s = statusMap.get(n.id);
      return {
        ...n,
        status: s?.status ?? "locked",
        best_quiz_score: s?.best_quiz_score ?? null,
        attempts: s?.attempts ?? 0,
        last_attempted: s?.completed_at ?? s?.updated_at ?? null,
        watch_percentage: s?.watch_percentage ?? 0,
        confidence_band: (s?.confidence_band as ConfidenceBand | null) ?? null,
      };
    });
  }, [statuses]);

  const [fSubject, setFSubject] = useState<Subject | "all">("all");
  const [fTier, setFTier] = useState<Tier | "all">("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fBand, setFBand] = useState<ConfidenceBand | "all">("all");
  const [fCluster, setFCluster] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("tier");
  const [sortAsc, setSortAsc] = useState(true);

  const clusters = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((r) => set.add(r.topic_cluster));
    return Array.from(set).sort();
  }, [allRows]);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (fSubject !== "all" && r.subject !== fSubject) return false;
      if (fTier !== "all" && r.tier !== fTier) return false;
      if (fStatus !== "all" && r.status !== fStatus) return false;
      if (fBand !== "all" && r.confidence_band !== fBand) return false;
      if (fCluster !== "all" && r.topic_cluster !== fCluster) return false;
      return true;
    });
  }, [allRows, fSubject, fTier, fStatus, fBand, fCluster]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const sign = sortAsc ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "topic":
          return sign * a.topic.localeCompare(b.topic);
        case "tier":
          return sign * (a.tier - b.tier || a.topic.localeCompare(b.topic));
        case "cluster":
          return sign * a.topic_cluster.localeCompare(b.topic_cluster);
        case "status":
          return sign * a.status.localeCompare(b.status);
        case "best":
          return sign * ((a.best_quiz_score ?? -1) - (b.best_quiz_score ?? -1));
        case "attempts":
          return sign * (a.attempts - b.attempts);
        case "watch":
          return sign * ((a.watch_percentage ?? 0) - (b.watch_percentage ?? 0));
        case "band":
          return sign * (a.confidence_band ?? "").localeCompare(b.confidence_band ?? "");
      }
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  function h(k: SortKey) {
    return () => {
      if (k === sortKey) setSortAsc((v) => !v);
      else {
        setSortKey(k);
        setSortAsc(true);
      }
    };
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Select
          label="Subject"
          value={fSubject}
          onChange={(v) => setFSubject(v as Subject | "all")}
          options={[
            ["all", "All"],
            ["reading", "Reading"],
            ["math", "Math"],
          ]}
        />
        <Select
          label="Tier"
          value={fTier === "all" ? "all" : String(fTier)}
          onChange={(v) => setFTier(v === "all" ? "all" : (Number(v) as Tier))}
          options={[
            ["all", "All"],
            ["1", "Tier 1"],
            ["2", "Tier 2"],
            ["3", "Tier 3"],
          ]}
        />
        <Select
          label="Status"
          value={fStatus}
          onChange={setFStatus}
          options={[
            ["all", "All"],
            ["locked", "Locked"],
            ["available", "Available"],
            ["in_progress", "In progress"],
            ["partially_complete", "Partial"],
            ["mastered", "Mastered"],
          ]}
        />
        <Select
          label="Band"
          value={fBand}
          onChange={(v) => setFBand(v as ConfidenceBand | "all")}
          options={[
            ["all", "All"],
            ["struggling", "Struggling"],
            ["developing", "Developing"],
            ["proficient", "Proficient"],
            ["mastered", "Mastered"],
          ]}
        />
        <Select
          label="Cluster"
          value={fCluster}
          onChange={setFCluster}
          options={[["all", "All"], ...clusters.map((c) => [c, c] as [string, string])]}
        />
        <span className="ml-auto self-end text-xs text-slate-400">{sorted.length} rows</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              <Th onClick={h("topic")}>Skill</Th>
              <th className="px-3 py-2">Subject</th>
              <Th onClick={h("tier")}>Tier</Th>
              <Th onClick={h("cluster")}>Topic</Th>
              <Th onClick={h("status")}>Status</Th>
              <Th onClick={h("best")} className="text-right">
                Best
              </Th>
              <Th onClick={h("attempts")} className="text-right">
                Attempts
              </Th>
              <Th onClick={h("watch")} className="text-right">
                Watched
              </Th>
              <Th onClick={h("band")}>Band</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const band = r.confidence_band;
              const bandBg =
                band === "struggling"
                  ? "bg-red-50 dark:bg-red-900/10"
                  : band === "developing"
                    ? "bg-yellow-50 dark:bg-yellow-900/10"
                    : band === "proficient"
                      ? "bg-green-50 dark:bg-green-900/10"
                      : band === "mastered"
                        ? "bg-teal-50 dark:bg-teal-900/10"
                        : "";
              return (
                <tr
                  key={r.id}
                  className={cn("border-t border-slate-200 dark:border-slate-800", bandBg)}
                >
                  <td className="px-3 py-2 text-slate-900 dark:text-white">{r.topic}</td>
                  <td className="px-3 py-2 capitalize text-slate-400">{r.subject}</td>
                  <td className="px-3 py-2 text-slate-400">{TIER_LABELS[r.tier]}</td>
                  <td className="max-w-[16rem] truncate px-3 py-2 text-slate-400">
                    {r.topic_cluster}
                  </td>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {r.status.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.best_quiz_score ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-400">{r.attempts}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                    {r.watch_percentage ?? 0}%
                  </td>
                  <td className="px-3 py-2">
                    {band ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          CONFIDENCE_COLORS[band].bg,
                          CONFIDENCE_COLORS[band].text
                        )}
                      >
                        {CONFIDENCE_COLORS[band].label}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th
      onClick={onClick}
      className={cn(
        "cursor-pointer select-none px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-800",
        className
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {onClick && <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </th>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-400">
      <span className="font-semibold uppercase tracking-wide">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
