"use client";

// ============================================================
// MasteredNodesList — sortable + subject-filterable list of
// every node a student has mastered.
// ============================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpDown, CheckCircle, Flame, BookOpen, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardLayout from "./DashboardLayout";
import { nodeAtmosphere, ATMOSPHERE_COLORS, SUBJECT_COLORS, type Subject } from "@/data/curriculum";
import type { MasteredNodeRow } from "@/app/dashboard/student/mastered/page";

type SubjectFilter = "all" | Subject;
type SortMode = "chronological" | "alphabetical";

interface Props {
  mastered: MasteredNodeRow[];
}

export default function MasteredNodesList({ mastered }: Props) {
  const [subject, setSubject] = useState<SubjectFilter>("all");
  const [sort, setSort] = useState<SortMode>("chronological");

  const counts = useMemo(() => ({
    all:     mastered.length,
    reading: mastered.filter((n) => n.subject === "reading").length,
    math:    mastered.filter((n) => n.subject === "math").length,
  }), [mastered]);

  const filtered = useMemo(() => {
    const list = subject === "all" ? mastered : mastered.filter((n) => n.subject === subject);
    if (sort === "chronological") {
      return [...list].sort((a, b) => b.mastered_at.localeCompare(a.mastered_at));
    }
    return [...list].sort((a, b) => a.topic.localeCompare(b.topic));
  }, [mastered, subject, sort]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
        </Link>

        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <CheckCircle className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Mastered Nodes</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {counts.all}
              <span className="text-base text-slate-400 font-normal ml-2">of 100 mastered</span>
            </h1>
          </div>

          {/* Sort control */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden text-xs">
            <button
              onClick={() => setSort("chronological")}
              className={cn(
                "px-3 py-2 font-semibold flex items-center gap-1",
                sort === "chronological"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <ArrowUpDown className="w-3 h-3" /> Chronological
            </button>
            <button
              onClick={() => setSort("alphabetical")}
              className={cn(
                "px-3 py-2 font-semibold border-l border-slate-200 dark:border-slate-700",
                sort === "alphabetical"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              A → Z
            </button>
          </div>
        </div>

        {/* Subject tabs */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
          {([
            { id: "all",     label: "All",               count: counts.all,     color: "#64748b" },
            { id: "reading", label: "Reading & Writing", count: counts.reading, color: SUBJECT_COLORS.reading.hex },
            { id: "math",    label: "Math",              count: counts.math,    color: SUBJECT_COLORS.math.hex },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setSubject(t.id as SubjectFilter)}
              className={cn(
                "px-4 pb-3 pt-2 text-sm font-semibold border-b-2 transition-colors",
                subject === t.id ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
              style={subject === t.id ? { borderColor: t.color } : { borderColor: "transparent" }}
            >
              {t.label} <span className="text-slate-400 text-xs ml-1 tabular-nums">({t.count})</span>
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
            <CheckCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {subject === "all"
                ? "No mastered nodes yet. Ace a node's quiz twice in a row to master it."
                : `No mastered ${subject === "reading" ? "Reading & Writing" : "Math"} nodes yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const atmo = nodeAtmosphere(n.tier);
              const atmoHex = ATMOSPHERE_COLORS[atmo].hex;
              const SubjectIcon = n.subject === "reading" ? BookOpen : Calculator;
              const subjectHex = SUBJECT_COLORS[n.subject].hex;
              return (
                <Link
                  key={n.id}
                  href={`/learn/${n.subject}/${n.id}`}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <SubjectIcon className="w-4 h-4 shrink-0" style={{ color: subjectHex }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {n.topic}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mt-0.5">
                      <span
                        className="px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px]"
                        style={{ color: atmoHex, background: atmoHex + "15", border: `1px solid ${atmoHex}30` }}
                      >
                        {atmo}
                      </span>
                      <span>{n.topic_cluster}</span>
                      {n.attempts > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-amber-400" />
                          {n.attempts} {n.attempts === 1 ? "attempt" : "attempts"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    {n.best_quiz_score !== null && (
                      <span className="font-bold tabular-nums text-emerald-500">{n.best_quiz_score}%</span>
                    )}
                    <p className="text-slate-400 mt-0.5">
                      {new Date(n.mastered_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
