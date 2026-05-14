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

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, ChevronDown, ChevronRight, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  actionAcceptFlaggedQuestion,
  actionRejectFlaggedQuestion,
  actionAcceptAllBank,
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

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
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
  const allExpanded =
    visibleQuestions.length > 0 && visibleQuestions.every((q) => expandedIds.has(q.id));

  function toggleAllExpanded() {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(visibleQuestions.map((q) => q.id)));
    }
  }

  return (
    <>
      {/* ── Tab toggle ─────────────────────────────────────── */}
      <div className="mb-5 flex border-b border-slate-800">
        <TabButton
          active={activeTab === "flagged"}
          onClick={() => setTab("flagged")}
          label="Flagged"
          count={counts.flagged}
          tone="amber"
        />
        <TabButton
          active={activeTab === "bank"}
          onClick={() => setTab("bank")}
          label="Bank"
          count={counts.bank}
          tone="indigo"
        />
      </div>

      {/* ── Filter bar (Flagged tab only) ──────────────────── */}
      {showFilters && (
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
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
          {(activeFilters.flag_type || activeFilters.domain || activeFilters.source_pdf) && (
            <button
              onClick={() => router.push("/admin/questions/review")}
              className="ml-auto text-slate-500 hover:text-slate-300"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Bulk-accept result banner (Bank tab only, after a run) ─ */}
      {bulkResult && activeTab === "bank" && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-200">
          <CheckCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">
            Auto-accepted <span className="font-semibold">{bulkResult.accepted}</span> question
            {bulkResult.accepted === 1 ? "" : "s"} to their default nodes.
            {bulkResult.skipped > 0 && (
              <>
                {" "}
                <span className="text-amber-300">{bulkResult.skipped} skipped</span> (no slug match
                — assign manually).
              </>
            )}
            {bulkResult.errored > 0 && (
              <>
                {" "}
                <span className="text-rose-300">{bulkResult.errored} errored</span> (see console).
              </>
            )}
          </div>
          <button
            onClick={() => setBulkResult(null)}
            className="text-emerald-300/70 hover:text-emerald-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Cards ──────────────────────────────────────────── */}
      {visibleQuestions.length === 0 ? (
        <EmptyState
          tab={activeTab}
          hasFilters={
            !!(activeFilters.flag_type || activeFilters.domain || activeFilters.source_pdf)
          }
        />
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            {/* Bank-tab-only: bulk-accept-all */}
            {activeTab === "bank" ? (
              <button
                onClick={handleAcceptAll}
                disabled={bulkAccepting || bank.length === 0}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50",
                  "bg-emerald-500 text-white hover:bg-emerald-400 disabled:hover:bg-emerald-500"
                )}
              >
                <CheckCheck className="h-3 w-3" />
                {bulkAccepting ? `Accepting ${bank.length}…` : `Auto-accept all (${bank.length})`}
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={toggleAllExpanded}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200"
            >
              {allExpanded ? (
                <>
                  <ChevronRight className="h-3 w-3" /> Collapse all
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> Expand all
                </>
              )}
            </button>
          </div>
          <div className="space-y-3">
            {visibleQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                busy={pendingId === q.id}
                expanded={expandedIds.has(q.id)}
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
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone: "amber" | "indigo";
}) {
  const accent = tone === "amber" ? "text-amber-300" : "text-indigo-300";
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-white text-white"
          : "border-transparent text-slate-500 hover:text-slate-300"
      )}
    >
      {label}
      <span className={cn("ml-2 font-mono text-xs", active ? accent : "text-slate-600")}>
        {count}
      </span>
    </button>
  );
}

function EmptyState({ tab, hasFilters }: { tab: Tab; hasFilters: boolean }) {
  let copy: string;
  if (tab === "flagged") {
    copy = hasFilters
      ? "No flagged questions match the current filters."
      : "No flagged questions. Anything the routine emitted as needs_review will land here for triage.";
  } else {
    copy =
      "No questions in the bank. Imported PDF-routine questions land here with no curriculum node assigned — accept one with a node picked to send it live.";
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-12 text-center text-sm text-slate-500">
      {copy}
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
    <label className="inline-flex items-center gap-1.5 text-slate-400">
      <span>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
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
