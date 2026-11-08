"use client";

// ============================================================
// InspectorClient — worklist table with filters + bulk multi-
// select. Each row links to /admin/questions/inspect/[id] for the
// deep view. Filters are URL-synced; multi-select is local state.
//
// Bulk actions:
//   · Resolve all findings on selected rows
//   · Accept selected as live (auto-resolves findings)
//   · Flag selected as needs-review (leaves findings open)
// ============================================================

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { WbPill, type Tone } from "@/components/admin/workbench";
import {
  actionBulkAcceptQuestions,
  actionBulkFlagQuestions,
  actionBulkResolveFindings,
} from "@/app/admin/inspector-actions";
import type {
  InspectorRow,
  InspectorSummary,
  FindingSeverity,
  FindingSource,
} from "@/lib/supabase/queries/quiz/findings";

interface Props {
  rows: InspectorRow[];
  summary: InspectorSummary;
  filterOptions: {
    source_pdfs: string[];
    categories: string[];
  };
  activeFilters: {
    severity?: FindingSeverity;
    source?: FindingSource;
    category?: string;
    source_pdf?: string;
    domain?: string;
    q?: string;
    include_resolved?: boolean;
  };
}

const SEVERITY_TONE: Record<FindingSeverity, { label: string; tone: Tone }> = {
  BLOCKING: { label: "Blocking", tone: "fail" },
  WARNING: { label: "Warning", tone: "warn" },
  NOTICE: { label: "Notice", tone: "neutral" },
};

const SEVERITY_TABS: Array<{ value: string; label: string }> = [
  { value: "", label: "All severities" },
  { value: "BLOCKING", label: "Blocking only" },
  { value: "WARNING", label: "Warning and up" },
  { value: "NOTICE", label: "Notice only" },
];

const DOMAINS = [
  "algebra",
  "advanced_math",
  "geometry",
  "data_analysis",
  "info_ideas",
  "craft_structure",
  "expression_ideas",
  "conventions",
];

export default function InspectorClient({ rows, filterOptions, activeFilters }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<"resolving" | "accepting" | "flagging" | null>(null);
  const [bulkFeedback, setBulkFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const visibleIds = rows.map((r) => r.question_id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  function toggleRow(id: string) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function bulkResolve() {
    const ids = [...selectedIds];
    setBulkBusy("resolving");
    setBulkFeedback(null);
    startTransition(async () => {
      try {
        const r = await actionBulkResolveFindings({
          questionIds: ids,
          note: "Bulk-resolved via Inspector worklist",
        });
        setBulkFeedback({
          kind: "success",
          message: `Resolved ${r.resolved} finding${r.resolved === 1 ? "" : "s"} across ${ids.length} question${ids.length === 1 ? "" : "s"}.`,
        });
        setSelectedIds(new Set());
        router.refresh();
      } catch (err) {
        setBulkFeedback({
          kind: "error",
          message: `Bulk resolve failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBulkBusy(null);
      }
    });
  }

  function bulkAccept() {
    const ids = [...selectedIds];
    setBulkBusy("accepting");
    setBulkFeedback(null);
    startTransition(async () => {
      try {
        const r = await actionBulkAcceptQuestions({ questionIds: ids });
        setBulkFeedback({
          kind: "success",
          message: `Accepted ${r.accepted} question${r.accepted === 1 ? "" : "s"} as live · auto-resolved ${r.resolvedFindings} finding${r.resolvedFindings === 1 ? "" : "s"}.`,
        });
        setSelectedIds(new Set());
        router.refresh();
      } catch (err) {
        setBulkFeedback({
          kind: "error",
          message: `Bulk accept failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBulkBusy(null);
      }
    });
  }

  function bulkFlag() {
    const ids = [...selectedIds];
    setBulkBusy("flagging");
    setBulkFeedback(null);
    startTransition(async () => {
      try {
        const r = await actionBulkFlagQuestions({ questionIds: ids });
        setBulkFeedback({
          kind: "success",
          message: `Flagged ${r.flagged} question${r.flagged === 1 ? "" : "s"} as needs-review.`,
        });
        setSelectedIds(new Set());
        router.refresh();
      } catch (err) {
        setBulkFeedback({
          kind: "error",
          message: `Bulk flag failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBulkBusy(null);
      }
    });
  }

  function setFilter(key: string, value: string | undefined) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin/questions/inspect?${next.toString()}`);
  }

  function clearAll() {
    router.push("/admin/questions/inspect");
  }

  const anyFilterActive =
    !!activeFilters.severity ||
    !!activeFilters.source ||
    !!activeFilters.category ||
    !!activeFilters.source_pdf ||
    !!activeFilters.domain ||
    !!activeFilters.q ||
    activeFilters.include_resolved;

  return (
    <>
      <div className="wb-toolbar">
        <div className="wb-tabs" role="group" aria-label="Severity">
          {SEVERITY_TABS.map((t) => {
            const on = (activeFilters.severity ?? "") === t.value;
            return (
              <button
                key={t.value || "all"}
                type="button"
                className="wb-tab"
                aria-pressed={on}
                aria-current={on ? "page" : undefined}
                onClick={() => setFilter("severity", t.value || undefined)}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <form
          role="search"
          className="wb-search"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement | null;
            setFilter("q", input?.value.trim() || undefined);
          }}
        >
          <input
            className="wb-input"
            type="search"
            name="q"
            placeholder="Question text"
            aria-label="Search question text"
            defaultValue={activeFilters.q ?? ""}
          />
          <button className="wb-btn" type="submit">
            Search
          </button>
        </form>
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        }}
      >
        <FilterSelect
          label="Source"
          value={activeFilters.source ?? ""}
          onChange={(v) => setFilter("source", v)}
          options={[
            { value: "", label: "Auditor and grader" },
            { value: "auditor", label: "Deterministic auditor" },
            { value: "grader", label: "LLM grader" },
          ]}
        />
        <FilterSelect
          label="Category"
          value={activeFilters.category ?? ""}
          onChange={(v) => setFilter("category", v)}
          options={[
            { value: "", label: "All categories" },
            ...filterOptions.categories.map((c) => ({ value: c, label: c })),
          ]}
        />
        <FilterSelect
          label="Domain"
          value={activeFilters.domain ?? ""}
          onChange={(v) => setFilter("domain", v)}
          options={[
            { value: "", label: "All domains" },
            ...DOMAINS.map((d) => ({ value: d, label: d })),
          ]}
        />
        <FilterSelect
          label="Source PDF"
          value={activeFilters.source_pdf ?? ""}
          onChange={(v) => setFilter("source_pdf", v)}
          options={[
            { value: "", label: "All source PDFs" },
            ...filterOptions.source_pdfs.map((p) => ({ value: p, label: p })),
          ]}
        />
      </div>

      <div className="wb-toolbar">
        <label className="wb-note" style={{ display: "inline-flex", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!activeFilters.include_resolved}
            onChange={(e) => setFilter("include_resolved", e.target.checked ? "true" : "")}
            style={{ accentColor: "var(--accent)" }}
          />
          Include resolved findings
        </label>
        {anyFilterActive && (
          <button type="button" className="wb-btn" onClick={clearAll}>
            Clear all filters
          </button>
        )}
      </div>

      {/* Bulk action bar — visible only when at least one row is selected */}
      {selectedIds.size > 0 && (
        <div className="wb-toolbar" role="region" aria-label="Bulk actions">
          <b>{selectedIds.size} selected</b>
          <button
            type="button"
            className="wb-btn"
            onClick={bulkResolve}
            disabled={bulkBusy !== null}
          >
            {bulkBusy === "resolving" ? "Resolving…" : "Resolve all findings"}
          </button>
          <button
            type="button"
            className="wb-btn"
            data-variant="primary"
            onClick={bulkAccept}
            disabled={bulkBusy !== null}
          >
            {bulkBusy === "accepting" ? "Accepting…" : "Accept as live"}
          </button>
          <button type="button" className="wb-btn" onClick={bulkFlag} disabled={bulkBusy !== null}>
            {bulkBusy === "flagging" ? "Flagging…" : "Flag as needs-review"}
          </button>
          <button type="button" className="wb-btn" onClick={clearSelection}>
            Clear selection
          </button>
        </div>
      )}

      {bulkFeedback && (
        <div
          className="wb-alert"
          data-tone={bulkFeedback.kind === "success" ? "ok" : undefined}
          role={bulkFeedback.kind === "error" ? "alert" : "status"}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <span style={{ flex: 1 }}>{bulkFeedback.message}</span>
          <button type="button" className="wb-btn" onClick={() => setBulkFeedback(null)}>
            Dismiss
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="wb-empty">
          <b>No findings match the current filter.</b>
          {anyFilterActive ? (
            <button type="button" className="wb-btn" onClick={clearAll}>
              Clear filters
            </button>
          ) : (
            "Run the audit and grader scripts, then ingest-findings, to fill this list."
          )}
        </div>
      ) : (
        <div className="wb-table-wrap">
          <table className="wb-table">
            <caption className="sr-only">Questions with findings</caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all visible rows"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }}
                    onChange={toggleAllVisible}
                    style={{ accentColor: "var(--accent)" }}
                  />
                </th>
                <th scope="col">Question</th>
                <th scope="col">Source</th>
                <th scope="col">Domain</th>
                <th scope="col">Findings</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const worst = SEVERITY_TONE[r.worst_severity] ?? SEVERITY_TONE.NOTICE;
                const isSelected = selectedIds.has(r.question_id);
                return (
                  <tr
                    key={r.question_id}
                    style={
                      isSelected
                        ? { background: "color-mix(in srgb, var(--accent) 6%, transparent)" }
                        : undefined
                    }
                  >
                    <td data-label="Select">
                      <input
                        type="checkbox"
                        aria-label={`Select row ${r.question_id}`}
                        checked={isSelected}
                        onChange={() => toggleRow(r.question_id)}
                        style={{ accentColor: "var(--accent)" }}
                      />
                    </td>
                    <td data-label="Question">
                      <span style={{ minWidth: 0, overflowWrap: "anywhere", textAlign: "left" }}>
                        <span
                          title={r.question_text}
                          style={{ fontWeight: r.worst_severity === "BLOCKING" ? 600 : 400 }}
                        >
                          {r.question_text.slice(0, 140)}
                          {r.question_text.length > 140 && "…"}
                        </span>
                        <small>
                          {r.concept_slug ?? "(no concept)"}
                          {r.latest_category ? ` · last: ${r.latest_category}` : ""}
                        </small>
                      </span>
                    </td>
                    <td data-label="Source">
                      {r.source_pdf ? (
                        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                          {r.source_pdf}
                          <small>p {r.source_page ?? "?"}</small>
                        </span>
                      ) : (
                        <span className="wb-note">unknown</span>
                      )}
                    </td>
                    <td data-label="Domain">{r.domain ?? "—"}</td>
                    <td data-label="Findings">
                      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
                        <WbPill tone={worst.tone}>
                          {r.total_count} · {worst.label}
                        </WbPill>
                        {r.blocking_count > 0 && r.worst_severity !== "BLOCKING" && (
                          <WbPill tone="fail">{r.blocking_count} blocking</WbPill>
                        )}
                        {r.warning_count > 0 && r.worst_severity === "BLOCKING" && (
                          <WbPill tone="warn">{r.warning_count} warning</WbPill>
                        )}
                        {r.notice_count > 0 && r.worst_severity !== "NOTICE" && (
                          <WbPill tone="neutral">{r.notice_count} notice</WbPill>
                        )}
                      </span>
                    </td>
                    <td data-label="Status">
                      {r.is_live ? (
                        <WbPill tone="ok">live</WbPill>
                      ) : (
                        <WbPill tone="warn">{r.import_status ?? "draft"}</WbPill>
                      )}
                    </td>
                    <td data-label="">
                      <Link href={`/admin/questions/inspect/${r.question_id}`}>Inspect</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string | undefined) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="wb-field">
      <span>{label}</span>
      <select
        className="wb-select"
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
