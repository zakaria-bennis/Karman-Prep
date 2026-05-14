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

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check, X, AlertTriangle, ExternalLink, BookOpen, Eye, Search,
  Sparkles, ChevronDown, ChevronRight, Lightbulb, Calculator, CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  actionAcceptFlaggedQuestion,
  actionRejectFlaggedQuestion,
  actionAcceptAllBank,
} from "@/app/admin/actions";
import {
  SAT_DOMAINS,
  CLUSTER_BY_DOMAIN,
  CONCEPT_SLUGS,
  nodeIdFromSlug,
  searchSlugs,
  type ConceptSlug,
} from "@/lib/question-bank/taxonomy";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import StudentQuestionPreview from "@/components/admin/StudentQuestionPreview";
import MathText from "@/components/learn/MathText";

type Tab = "flagged" | "bank";

// Build once — used by the picker to display the currently-selected
// node's label without rebuilding the search index per render.
const NODE_INDEX = new Map<string, ConceptSlug>(
  CONCEPT_SLUGS.map((c) => [c.nodeId, c])
);

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
    if (!confirm("Reject this question? It will be DELETED from the database. This can't be undone.")) return;
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
  const [bulkResult, setBulkResult] = useState<
    { accepted: number; skipped: number; errored: number } | null
  >(null);

  async function handleAcceptAll() {
    const total = bank.length;
    if (total === 0) return;
    if (!confirm(
      `Auto-accept all ${total} bank question${total === 1 ? "" : "s"}?\n\n` +
      `Each will be assigned to the curriculum node implied by its concept_slug. ` +
      `Questions whose slug doesn't map to a node will be skipped (you can pick those manually).`
    )) {
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
    visibleQuestions.length > 0 &&
    visibleQuestions.every((q) => expandedIds.has(q.id));

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
      <div className="flex border-b border-slate-800 mb-5">
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
        <div className="flex flex-wrap items-center gap-2 mb-5 text-xs">
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
        <div className="mb-3 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] text-xs text-emerald-200 flex items-start gap-2">
          <CheckCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div className="flex-1">
            Auto-accepted <span className="font-semibold">{bulkResult.accepted}</span> question{bulkResult.accepted === 1 ? "" : "s"} to their default nodes.
            {bulkResult.skipped > 0 && (
              <> <span className="text-amber-300">{bulkResult.skipped} skipped</span> (no slug match — assign manually).</>
            )}
            {bulkResult.errored > 0 && (
              <> <span className="text-rose-300">{bulkResult.errored} errored</span> (see console).</>
            )}
          </div>
          <button onClick={() => setBulkResult(null)} className="text-emerald-300/70 hover:text-emerald-100">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Cards ──────────────────────────────────────────── */}
      {visibleQuestions.length === 0 ? (
        <EmptyState tab={activeTab} hasFilters={!!(activeFilters.flag_type || activeFilters.domain || activeFilters.source_pdf)} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-2 text-xs gap-2">
            {/* Bank-tab-only: bulk-accept-all */}
            {activeTab === "bank" ? (
              <button
                onClick={handleAcceptAll}
                disabled={bulkAccepting || bank.length === 0}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50",
                  "text-white bg-emerald-500 hover:bg-emerald-400 disabled:hover:bg-emerald-500"
                )}
              >
                <CheckCheck className="w-3 h-3" />
                {bulkAccepting
                  ? `Accepting ${bank.length}…`
                  : `Auto-accept all (${bank.length})`}
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={toggleAllExpanded}
              className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
            >
              {allExpanded ? (
                <><ChevronRight className="w-3 h-3" /> Collapse all</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> Expand all</>
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
  active, onClick, label, count, tone,
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
        "px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors",
        active
          ? "border-white text-white"
          : "border-transparent text-slate-500 hover:text-slate-300"
      )}
    >
      {label}
      <span className={cn("ml-2 text-xs font-mono", active ? accent : "text-slate-600")}>
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
    copy = "No questions in the bank. Imported PDF-routine questions land here with no curriculum node assigned — accept one with a node picked to send it live.";
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
        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function QuestionCard({
  question,
  busy,
  expanded,
  onToggleExpanded,
  onAccept,
  onReject,
  onPreview,
}: {
  question: QuizQuestionWithChoices;
  busy: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onAccept: (nodeId: string | null) => void;
  onReject: () => void;
  onPreview: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const choices = question.answer_choices.sort((a, b) => a.letter.localeCompare(b.letter));
  const isFlagged = question.import_status === "needs_review";
  const correctChoice = choices.find((c) => c.is_correct);
  const perChoice = question.explanation_per_choice ?? {};

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60">
      {/* ── Header (always visible) — clicking toggles expansion ── */}
      <button
        onClick={onToggleExpanded}
        className="w-full text-left px-5 pt-4 pb-3 flex items-start gap-2 hover:bg-white/[0.02] rounded-t-xl transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
        )}
        {isFlagged ? (
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        ) : (
          <BookOpen className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {/* Banner line */}
          <div className={cn("text-xs font-medium", isFlagged ? "text-amber-200" : "text-indigo-200")}>
            {isFlagged
              ? `${question.import_flag_type === "skip" ? "Unsolvable" : "Needs review"} — ${question.import_flag_reason ?? ""}`
              : "In bank — pick a curriculum node to send this question live in Learn."}
          </div>
          {/* Source PDF + page — prominent on flagged rows so the
              admin can jump to the source PDF and verify the
              figure / question quickly. */}
          {isFlagged && question.source_pdf && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-slate-800/70 border border-slate-700 px-2.5 py-1 text-[12px]">
              <ExternalLink className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="text-slate-200 font-mono">{question.source_pdf}</span>
              {question.source_page != null && (
                <>
                  <span className="text-slate-600">›</span>
                  <span className="text-amber-200 font-semibold">page {question.source_page}</span>
                </>
              )}
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                {question.subject === "math" ? "Math" : "R&W"}
              </span>
            </div>
          )}
          {/* Question stem (truncated when collapsed) */}
          <div
            className={cn(
              "mt-2 text-sm text-slate-200",
              !expanded && "truncate"
            )}
          >
            {question.question_text}
          </div>
          {/* Compact meta row */}
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
            {/* Source repeats here only when NOT flagged — the
                flagged badge above already covers it prominently. */}
            {!isFlagged && question.source_pdf && (
              <span>
                <ExternalLink className="w-3 h-3 inline mr-1" />
                {question.source_pdf}{question.source_page ? `:${question.source_page}` : ""}
              </span>
            )}
            <span>{question.concept_slug ?? "—"}</span>
            <span>·</span>
            <span>{question.domain ?? "—"}</span>
            <span>·</span>
            <span>diff {question.difficulty_level}</span>
            {correctChoice && (
              <>
                <span>·</span>
                <span className="text-emerald-400 font-mono">answer {correctChoice.letter}</span>
              </>
            )}
          </div>
        </div>
      </button>

      {/* ── Expanded body ─────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-3 pt-1">
          {question.passage_intro && (
            <p className="italic text-slate-400 text-sm mb-2">{question.passage_intro}</p>
          )}
          {question.passage && (
            <div className="mb-3 px-3 py-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 text-sm leading-relaxed font-serif whitespace-pre-wrap">
              {question.passage}
            </div>
          )}
          {(question.passage_a || question.passage_b) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {question.passage_a && (
                <div className="px-3 py-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 text-sm font-serif whitespace-pre-wrap">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Text 1</div>
                  {question.passage_a}
                </div>
              )}
              {question.passage_b && (
                <div className="px-3 py-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 text-sm font-serif whitespace-pre-wrap">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Text 2</div>
                  {question.passage_b}
                </div>
              )}
            </div>
          )}

          {/* Question text (full) + image */}
          <MathText
            text={question.question_text}
            className="block text-slate-100 font-medium mb-3 whitespace-pre-wrap"
          />
          {question.image_url && (
            <figure className="mb-3 inline-block max-w-full rounded-xl border border-slate-700/50 bg-slate-200 p-2 shadow-md shadow-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.image_url}
                alt={question.image_alt ?? "Question figure"}
                className="block max-w-full max-h-72 object-contain rounded"
              />
            </figure>
          )}

          {/* Choices + per-choice explanations */}
          {question.answer_format === "multiple_choice" ? (
            <ul className="space-y-2 mb-4">
              {choices.map((c) => {
                const expl = perChoice[c.letter];
                return (
                  <li
                    key={c.id}
                    className={cn(
                      "px-3 py-2 rounded border text-sm",
                      c.is_correct
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-slate-800 bg-slate-950/40"
                    )}
                  >
                    <div className={cn("flex items-start gap-2", c.is_correct ? "text-emerald-100" : "text-slate-300")}>
                      <span className="font-mono text-xs text-slate-500 shrink-0">{c.letter}.</span>
                      <MathText text={c.choice_text} className="flex-1" />
                      {c.is_correct && <Check className="w-3.5 h-3.5 inline text-emerald-400 shrink-0" />}
                    </div>
                    {expl && (
                      <div className="mt-1.5 pl-5 text-xs text-slate-400 italic">
                        <MathText text={expl} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mb-4 px-3 py-2 rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-100 text-sm flex items-start gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wide text-emerald-300/70">SPR answer:</span>
              <MathText text={question.correct_answer} />
              {question.numeric_tolerance != null && (
                <span className="text-slate-500 text-xs">±{question.numeric_tolerance}</span>
              )}
            </div>
          )}

          {/* Right-answer walkthrough */}
          {question.explanation_text && (
            <div className="mb-3 px-3 py-2.5 rounded-lg bg-slate-950/40 border border-slate-800">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Right-answer walkthrough
              </div>
              <MathText
                text={question.explanation_text}
                className="text-sm text-slate-300 whitespace-pre-wrap block"
              />
            </div>
          )}

          {/* Hint (R&W and Math) */}
          {question.hint && (
            <div className="mb-3 px-3 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wide text-amber-300/70 mb-0.5">Hint</div>
                <MathText text={question.hint} className="text-sm text-amber-100/90" />
              </div>
            </div>
          )}

          {/* Desmos strategy (math only — field is null for R&W) */}
          {question.desmos_strategy && (
            <div className="mb-3 px-3 py-2.5 rounded-lg bg-sky-500/5 border border-sky-500/20 flex items-start gap-2">
              <Calculator className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wide text-sky-300/70 mb-0.5">Desmos strategy</div>
                <MathText text={question.desmos_strategy} className="text-sm text-sky-100/90" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Actions (always visible at the bottom) ────── */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={onPreview}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-white/5"
          >
            <Eye className="w-3 h-3 inline mr-1" /> Preview
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 border border-rose-500/30 hover:bg-rose-500/10 disabled:opacity-50"
          >
            <X className="w-3 h-3 inline mr-1" /> Reject
          </button>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            disabled={busy}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50",
              pickerOpen
                ? "text-slate-300 border border-slate-700 hover:bg-white/5"
                : "text-white bg-emerald-500 hover:bg-emerald-400"
            )}
          >
            <Check className="w-3 h-3 inline mr-1" /> {pickerOpen ? "Close picker" : "Accept…"}
          </button>
        </div>

        {/* Node picker (auto-pick from concept_slug + typeahead) */}
        {pickerOpen && (
          <NodePicker
            slug={question.concept_slug ?? null}
            busy={busy}
            onAccept={(nodeId) => onAccept(nodeId)}
            onCancel={() => setPickerOpen(false)}
          />
        )}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────
// NodePicker — auto-defaults to the curriculum node implied by the
// row's concept_slug (1:1 mapping built into taxonomy.ts), then
// lets the admin search across all 89 nodes if the default is wrong.
// ─────────────────────────────────────────────────────────────
function NodePicker({
  slug,
  busy,
  onAccept,
  onCancel,
}: {
  slug: string | null;
  busy: boolean;
  onAccept: (nodeId: string | null) => void;
  onCancel: () => void;
}) {
  const autoNodeId = slug ? nodeIdFromSlug(slug) ?? null : null;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(autoNodeId);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the search input on open so admins can type immediately.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return searchSlugs(q).slice(0, 8);
  }, [query]);

  const selected = selectedNodeId ? NODE_INDEX.get(selectedNodeId) ?? null : null;
  const isAutoPick = selectedNodeId === autoNodeId && autoNodeId !== null;

  return (
    <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/40 p-3 space-y-2">
      {/* Current selection */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 shrink-0">Send to:</span>
        {selected ? (
          <>
            <span className="font-mono text-slate-400 shrink-0">{selected.nodeId}</span>
            <span className="text-slate-200 truncate">{selected.label}</span>
            <span className="text-slate-600 shrink-0">·</span>
            <span className="text-slate-500 shrink-0">{CLUSTER_BY_DOMAIN[selected.domain]}</span>
            {isAutoPick && (
              <span className="ml-auto inline-flex items-center gap-1 text-emerald-400 shrink-0">
                <Sparkles className="w-3 h-3" /> auto-picked from slug
              </span>
            )}
          </>
        ) : (
          <span className="italic text-slate-500">No node — question stays in bank</span>
        )}
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded px-2 py-1">
        <Search className="w-3 h-3 text-slate-500 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={selected ? "Search for a different node…" : "Type to search 89 nodes…"}
          className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-slate-500 hover:text-slate-300 text-xs"
          >
            ×
          </button>
        )}
      </div>

      {/* Match list (only when typing) */}
      {matches.length > 0 && (
        <ul className="max-h-56 overflow-y-auto rounded border border-slate-800 divide-y divide-slate-800/60">
          {matches.map((m) => {
            const isCurrent = m.nodeId === selectedNodeId;
            return (
              <li key={m.nodeId}>
                <button
                  onClick={() => {
                    setSelectedNodeId(m.nodeId);
                    setQuery("");
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-800/60 flex items-center gap-2",
                    isCurrent && "bg-emerald-500/10"
                  )}
                >
                  <span className="font-mono text-slate-500 shrink-0">{m.nodeId}</span>
                  <span className="text-slate-200 truncate flex-1">{m.label}</span>
                  <span className="text-slate-600 shrink-0">{CLUSTER_BY_DOMAIN[m.domain]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {query.trim() && matches.length === 0 && (
        <div className="text-xs text-slate-500 italic px-1">No nodes match "{query}".</div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => setSelectedNodeId(null)}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Keep in bank
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onAccept(selectedNodeId)}
            disabled={busy}
            className="px-3 py-1 rounded text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50"
          >
            <Check className="w-3 h-3 inline mr-1" /> Accept
          </button>
        </div>
      </div>
    </div>
  );
}
