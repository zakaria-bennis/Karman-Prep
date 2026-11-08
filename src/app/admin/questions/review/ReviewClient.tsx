"use client";

// ============================================================
// ReviewClient — two-tab triage page:
//   · Flagged tab — needs_review questions with the AI-written
//     flag_reason banner. Filterable by flag_type / domain /
//     source_pdf.
//   · Bank tab — OK questions imported with no curriculum node
//     assigned. Same Accept-with-node-picker + Reject controls.
//
// Per-card Accept opens a small node-id picker (questions land
// in the bank with no node by default; admin assigns one before
// sending the question live in a specific Learn quiz pool).
// ============================================================

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  actionAcceptFlaggedQuestion,
  actionRejectFlaggedQuestion,
  actionAcceptAllBank,
  actionBulkRejectQuestions,
} from "@/app/admin/actions";
import { SAT_DOMAINS, CLUSTER_BY_DOMAIN } from "@/lib/question-bank/taxonomy";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import StudentQuestionPreview from "@/components/admin/StudentQuestionPreview";
import { QuestionCard } from "./QuestionCard";

type Tab = "flagged" | "bank";

interface Props {
  activeTab: Tab;
  flagged: QuizQuestionWithChoices[];
  bank: QuizQuestionWithChoices[];
  sourcePdfs: string[];
  counts: {
    flagged: number;
    bank: number;
    skip: number;
    partial_emit: number;
  };
  activeFilters: {
    flag_type?: "skip" | "partial_emit";
    domain?: string;
    source_pdf?: string;
  };
}

export default function ReviewClient({
  activeTab,
  flagged,
  bank,
  sourcePdfs,
  counts,
  activeFilters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<QuizQuestionWithChoices | null>(null);
  // Cards are collapsed by default — admins can expand individually
  // or use the toggle at the top of the list to expand/collapse all.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Bulk-reject selection state — populated only on the Flagged tab.
  // Cleared whenever the tab or filter changes so stale selections
  // from a different filtered view don't follow the admin around.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRejecting, setBulkRejecting] = useState(false);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams);
    if (tab === "bank") params.set("tab", "bank");
    else params.delete("tab");
    router.push(`/admin/questions/review${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function setFilter(key: "flag_type" | "domain" | "source_pdf", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/questions/review?${params.toString()}`);
  }

  async function handleAccept(questionId: string, nodeId: string | null) {
    setPendingId(questionId);
    try {
      await actionAcceptFlaggedQuestion(questionId, { nodeId });
      startTransition(() => router.refresh());
    } finally {
      setPendingId(null);
    }
  }

  async function handleReject(questionId: string) {
    if (
      !confirm("Reject this question? It will be DELETED from the database. This can't be undone.")
    )
      return;
    setPendingId(questionId);
    try {
      await actionRejectFlaggedQuestion(questionId);
      startTransition(() => router.refresh());
    } finally {
      setPendingId(null);
    }
  }

  async function handleBulkReject() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Reject ${ids.length} flagged question${ids.length === 1 ? "" : "s"}?\n\n` +
          `Each will be DELETED from the database. This can't be undone.`
      )
    )
      return;
    setBulkRejecting(true);
    try {
      await actionBulkRejectQuestions(ids);
      setSelectedIds(new Set());
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      alert(`Bulk reject failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBulkRejecting(false);
    }
  }

  // ── Bulk: auto-accept every Bank-tab question to its slug-implied node
  const [bulkAccepting, setBulkAccepting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    accepted: number;
    skipped: number;
    errored: number;
  } | null>(null);

  async function handleAcceptAll() {
    const total = bank.length;
    if (total === 0) return;
    if (
      !confirm(
        `Auto-accept all ${total} bank question${total === 1 ? "" : "s"}?\n\n` +
          `Each will be assigned to the curriculum node implied by its concept_slug. ` +
          `Questions whose slug doesn't map to a node will be skipped (you can pick those manually).`
      )
    ) {
      return;
    }
    setBulkAccepting(true);
    setBulkResult(null);
    try {
      const r = await actionAcceptAllBank();
      setBulkResult({
        accepted: r.accepted,
        skipped: r.skipped_no_slug_match,
        errored: r.errored,
      });
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      alert(`Bulk accept failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBulkAccepting(false);
    }
  }

  const visibleQuestions = activeTab === "flagged" ? flagged : bank;
  const showFilters = activeTab === "flagged";
  const showBulkSelect = activeTab === "flagged";
  const allExpanded =
    visibleQuestions.length > 0 && visibleQuestions.every((q) => expandedIds.has(q.id));
  const allVisibleSelected =
    visibleQuestions.length > 0 && visibleQuestions.every((q) => selectedIds.has(q.id));
  const selectedCount = selectedIds.size;

  // Clear stale selections when the visible set changes (tab switch,
  // filter change, or refresh after a delete). Keeps the "N selected"
  // counter honest — otherwise a row that no longer exists could
  // still be in the set and the bulk action would silently no-op.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visibleIds = new Set(visibleQuestions.map((q) => q.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visibleIds.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [visibleQuestions]);

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleQuestions.map((q) => q.id)));
    }
  }

  function toggleAllExpanded() {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(visibleQuestions.map((q) => q.id)));
    }
  }

  const hasFilters = !!(
    activeFilters.flag_type ||
    activeFilters.domain ||
    activeFilters.source_pdf
  );

  return (
    <>
      <div className="wb-toolbar">
        <div className="wb-tabs" role="group" aria-label="Review list">
          <TabButton
            active={activeTab === "flagged"}
            onClick={() => setTab("flagged")}
            label="Flagged"
            count={counts.flagged}
          />
          <TabButton
            active={activeTab === "bank"}
            onClick={() => setTab("bank")}
            label="Bank"
            count={counts.bank}
          />
        </div>
      </div>

      {/* Filter bar (Flagged tab only) */}
      {showFilters && (
        <div className="wb-toolbar" style={{ alignItems: "flex-end" }}>
          <FilterSelect
            label="Flag type"
            value={activeFilters.flag_type ?? ""}
            options={[
              { value: "", label: "All flag types" },
              { value: "partial_emit", label: "Partial emit" },
              { value: "skip", label: "Skip" },
            ]}
            onChange={(v) => setFilter("flag_type", v)}
          />
          <FilterSelect
            label="Domain"
            value={activeFilters.domain ?? ""}
            options={[
              { value: "", label: "All domains" },
              ...SAT_DOMAINS.map((d) => ({ value: d, label: CLUSTER_BY_DOMAIN[d] })),
            ]}
            onChange={(v) => setFilter("domain", v)}
          />
          <FilterSelect
            label="Source PDF"
            value={activeFilters.source_pdf ?? ""}
            options={[
              { value: "", label: "All PDFs" },
              ...sourcePdfs.map((p) => ({ value: p, label: p })),
            ]}
            onChange={(v) => setFilter("source_pdf", v)}
          />
          {hasFilters && (
            <button
              type="button"
              className="wb-btn"
              onClick={() => router.push("/admin/questions/review")}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Bulk-accept result banner (Bank tab only, after a run) */}
      {bulkResult && activeTab === "bank" && (
        <div
          className="wb-alert"
          data-tone="ok"
          role="status"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <span style={{ flex: 1 }}>
            Auto-accepted <b>{bulkResult.accepted}</b> question
            {bulkResult.accepted === 1 ? "" : "s"} to their default nodes.
            {bulkResult.skipped > 0 && (
              <> {bulkResult.skipped} skipped (no slug match, assign by hand).</>
            )}
            {bulkResult.errored > 0 && <> {bulkResult.errored} errored (see console).</>}
          </span>
          <button type="button" className="wb-btn" onClick={() => setBulkResult(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Cards */}
      {visibleQuestions.length === 0 ? (
        <EmptyState
          tab={activeTab}
          hasFilters={hasFilters}
          onClear={() => router.push("/admin/questions/review")}
        />
      ) : (
        <>
          <div className="wb-toolbar">
            {/* Bank tab — auto-accept-all-by-slug shortcut */}
            {activeTab === "bank" && (
              <button
                type="button"
                className="wb-btn"
                data-variant="primary"
                onClick={handleAcceptAll}
                disabled={bulkAccepting || bank.length === 0}
              >
                {bulkAccepting ? `Accepting ${bank.length}…` : `Auto-accept all (${bank.length})`}
              </button>
            )}
            {/* Flagged tab — bulk-reject controls (audit issue #15) */}
            {showBulkSelect && (
              <>
                <label
                  className="wb-note"
                  style={{ display: "inline-flex", gap: 6, cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  Select all ({visibleQuestions.length})
                </label>
                {selectedCount > 0 && (
                  <>
                    <b>{selectedCount} selected</b>
                    <button
                      type="button"
                      className="wb-btn"
                      data-variant="danger"
                      onClick={handleBulkReject}
                      disabled={bulkRejecting}
                    >
                      {bulkRejecting
                        ? `Rejecting ${selectedCount}…`
                        : `Reject ${selectedCount} selected`}
                    </button>
                    <button
                      type="button"
                      className="wb-btn"
                      onClick={() => setSelectedIds(new Set())}
                      disabled={bulkRejecting}
                    >
                      Clear
                    </button>
                  </>
                )}
              </>
            )}
            <button
              type="button"
              className="wb-btn"
              style={{ marginLeft: "auto" }}
              aria-pressed={allExpanded}
              onClick={toggleAllExpanded}
            >
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          </div>
          <div className="space-y-3">
            {visibleQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                busy={pendingId === q.id || bulkRejecting}
                expanded={expandedIds.has(q.id)}
                selectable={showBulkSelect}
                selected={selectedIds.has(q.id)}
                onToggleSelected={() => toggleSelected(q.id)}
                onToggleExpanded={() => toggleExpanded(q.id)}
                onAccept={(nodeId) => handleAccept(q.id, nodeId)}
                onReject={() => handleReject(q.id)}
                onPreview={() => setPreviewQuestion(q)}
              />
            ))}
          </div>
        </>
      )}

      {previewQuestion && (
        <StudentQuestionPreview
          question={previewQuestion}
          onClose={() => setPreviewQuestion(null)}
        />
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      className="wb-tab"
      aria-pressed={active}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      {label}
      <small>{count}</small>
    </button>
  );
}

function EmptyState({
  tab,
  hasFilters,
  onClear,
}: {
  tab: Tab;
  hasFilters: boolean;
  onClear: () => void;
}) {
  if (tab === "flagged" && hasFilters) {
    return (
      <div className="wb-empty">
        <b>No flagged questions match the current filters.</b>
        <button type="button" className="wb-btn" onClick={onClear}>
          Clear filters
        </button>
      </div>
    );
  }
  return (
    <div className="wb-empty">
      {tab === "flagged" ? (
        <>
          <b>No flagged questions.</b>
          Anything the routine emitted as needs_review lands here for triage.
        </>
      ) : (
        <>
          <b>No questions in the bank.</b>
          Imported questions land here with no curriculum node. Accept one with a node picked to
          send it live.
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="wb-field" style={{ flex: "1 1 180px", maxWidth: 280 }}>
      <span>{label}</span>
      <select className="wb-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
