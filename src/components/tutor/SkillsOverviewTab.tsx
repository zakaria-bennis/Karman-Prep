"use client";

// ============================================================
// SkillsOverviewTab — sortable + filterable table of every node.
// Color-coded rows by confidence band, under a ring for each band
// showing how many of the student's skills sit there. Portal look:
// student-detail.css and the portal forms (forms.css).
// ============================================================

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Num } from "@/components/portal/primitives";
import { Ring } from "@/components/portal/Ring";
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

const BANDS: [ConfidenceBand, string][] = [
  ["struggling", "var(--late)"],
  ["developing", "var(--kp-st-warn)"],
  ["proficient", "var(--good)"],
  ["mastered", "var(--accent)"],
];

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

  const rated = allRows.filter((r) => r.confidence_band).length;

  return (
    <div className="kp-st">
      {/* How the skills spread across the four bands */}
      <div className="kp-st-spread" aria-label="Skills by band">
        {BANDS.map(([band, color]) => {
          const n = allRows.filter((r) => r.confidence_band === band).length;
          return (
            <div key={band}>
              <Ring
                value={allRows.length ? n / allRows.length : 0}
                label={`${CONFIDENCE_COLORS[band].label}: ${n} of ${allRows.length} skills`}
                size={48}
                color={color}
              >
                <Num>{n}</Num>
              </Ring>
              <span>
                <b>{CONFIDENCE_COLORS[band].label}</b>
                <small className="kp-meta">of {allRows.length} skills</small>
              </span>
            </div>
          );
        })}
        <p className="kp-meta">
          <Num>{allRows.length - rated}</Num> not yet rated
        </p>
      </div>

      {/* Filters */}
      <div className="kp-st-filters">
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
        <span className="kp-meta">
          <Num>{sorted.length}</Num> rows
        </span>
      </div>

      <div className="kp-st-scroll">
        <table className="kp-st-table">
          <thead>
            <tr>
              <Th sort={sortKey === "topic" ? sortAsc : null} onClick={h("topic")}>
                Skill
              </Th>
              <th scope="col">Subject</th>
              <Th sort={sortKey === "tier" ? sortAsc : null} onClick={h("tier")}>
                Tier
              </Th>
              <Th sort={sortKey === "cluster" ? sortAsc : null} onClick={h("cluster")}>
                Topic
              </Th>
              <Th sort={sortKey === "status" ? sortAsc : null} onClick={h("status")}>
                Status
              </Th>
              <Th sort={sortKey === "best" ? sortAsc : null} onClick={h("best")} num>
                Best
              </Th>
              <Th sort={sortKey === "attempts" ? sortAsc : null} onClick={h("attempts")} num>
                Attempts
              </Th>
              <Th sort={sortKey === "watch" ? sortAsc : null} onClick={h("watch")} num>
                Watched
              </Th>
              <Th sort={sortKey === "band" ? sortAsc : null} onClick={h("band")}>
                Band
              </Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const band = r.confidence_band;
              return (
                <tr key={r.id} data-band={band ?? undefined}>
                  <td>{r.topic}</td>
                  <td>
                    <small>{r.subject === "math" ? "Math" : "Reading"}</small>
                  </td>
                  <td>
                    <small>{TIER_LABELS[r.tier]}</small>
                  </td>
                  <td>
                    <small>{r.topic_cluster}</small>
                  </td>
                  <td>{r.status.replace(/_/g, " ")}</td>
                  <td data-num="">{r.best_quiz_score ?? "—"}</td>
                  <td data-num="">{r.attempts}</td>
                  <td data-num="">{r.watch_percentage ?? 0}%</td>
                  <td>
                    {band ? (
                      <span className="kp-st-band" data-band={band}>
                        {CONFIDENCE_COLORS[band].label}
                      </span>
                    ) : (
                      <span className="kp-meta">—</span>
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
  sort,
  num,
}: {
  children: React.ReactNode;
  onClick: () => void;
  /** true: sorted up by this column; false: down; null: not sorted by it. */
  sort: boolean | null;
  num?: boolean;
}) {
  return (
    <th
      scope="col"
      data-num={num ? "" : undefined}
      aria-sort={sort === null ? undefined : sort ? "ascending" : "descending"}
    >
      <button type="button" className="kp-st-sort" onClick={onClick}>
        {children}
        <ArrowUpDown size={12} aria-hidden="true" opacity={sort === null ? 0.4 : 0.9} />
      </button>
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
    <label className="kp-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="kp-select">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
