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

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, AlertTriangle, ExternalLink, BookOpen, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  actionAcceptFlaggedQuestion,
  actionRejectFlaggedQuestion,
} from "@/app/admin/actions";
import { getNodes } from "@/data/curriculum";
import { SAT_DOMAINS, CLUSTER_BY_DOMAIN, type SATDomain } from "@/lib/question-bank/taxonomy";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import StudentQuestionPreview from "@/components/admin/StudentQuestionPreview";

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

// Math domain set for picking which curriculum lobe's nodes to
// surface in the Accept node picker.
const MATH_DOMAINS = new Set<SATDomain>([
  "algebra", "advanced_math", "geometry", "data_analysis",
]);

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

  const visibleQuestions = activeTab === "flagged" ? flagged : bank;
  const showFilters = activeTab === "flagged";

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

      {/* ── Cards ──────────────────────────────────────────── */}
      {visibleQuestions.length === 0 ? (
        <EmptyState tab={activeTab} hasFilters={!!(activeFilters.flag_type || activeFilters.domain || activeFilters.source_pdf)} />
      ) : (
        <div className="space-y-4">
          {visibleQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              busy={pendingId === q.id}
              onAccept={(nodeId) => handleAccept(q.id, nodeId)}
              onReject={() => handleReject(q.id)}
              onPreview={() => setPreviewQuestion(q)}
            />
          ))}
        </div>
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
  onAccept,
  onReject,
  onPreview,
}: {
  question: QuizQuestionWithChoices;
  busy: boolean;
  onAccept: (nodeId: string | null) => void;
  onReject: () => void;
  onPreview: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string>("");

  // Subject derived from domain so we surface the right lobe's nodes.
  const subject =
    question.domain && MATH_DOMAINS.has(question.domain as SATDomain) ? "math" : "reading";
  const candidateNodes = useMemo(() => getNodes(subject), [subject]);

  const choices = question.answer_choices.sort((a, b) => a.letter.localeCompare(b.letter));
  const isFlagged = question.import_status === "needs_review";

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      {/* ── Header banner ─ flag for needs_review, plain meta for bank */}
      <div className="flex items-start gap-2 mb-4 text-xs">
        {isFlagged ? (
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        ) : (
          <BookOpen className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
        )}
        <div className="flex-1">
          {isFlagged ? (
            <div className="text-amber-200 font-medium">
              {question.import_flag_type === "skip" ? "Unsolvable" : "Needs review"} — {question.import_flag_reason}
            </div>
          ) : (
            <div className="text-indigo-200 font-medium">
              In bank — pick a curriculum node to send this question live in Learn.
            </div>
          )}
          <div className="text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
            {question.source_pdf && (
              <span>
                <ExternalLink className="w-3 h-3 inline mr-1" />
                {question.source_pdf}
                {question.source_page && `:${question.source_page}`}
              </span>
            )}
            <span>domain: <span className="text-slate-400">{question.domain ?? "—"}</span></span>
            <span>slug: <span className="text-slate-400">{question.concept_slug ?? "—"}</span></span>
            <span>difficulty: <span className="text-slate-400">{question.difficulty_level}</span></span>
            <span>answer_source: <span className="text-slate-400">{question.answer_source ?? "—"}</span></span>
          </div>
        </div>
      </div>

      {/* ── Passage (if any) ────────────────────────────── */}
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

      {/* ── Question + choices ──────────────────────────── */}
      <p className="text-slate-100 font-medium mb-3 whitespace-pre-wrap">{question.question_text}</p>
      {question.answer_format === "multiple_choice" ? (
        <ul className="space-y-1.5 mb-4">
          {choices.map((c) => (
            <li
              key={c.id}
              className={cn(
                "px-3 py-2 rounded border text-sm",
                c.is_correct
                  ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-100"
                  : "border-slate-800 bg-slate-950/40 text-slate-300"
              )}
            >
              <span className="font-mono text-xs text-slate-500 mr-2">{c.letter}.</span>
              {c.choice_text}
              {c.is_correct && <Check className="w-3.5 h-3.5 inline ml-2 text-emerald-400" />}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-4 px-3 py-2 rounded border border-emerald-500/40 bg-emerald-500/5 text-emerald-100 text-sm">
          <span className="text-xs uppercase tracking-wide text-emerald-300/70 mr-2">SPR answer:</span>
          {question.correct_answer}
          {question.numeric_tolerance != null && (
            <span className="text-slate-500 text-xs ml-2">±{question.numeric_tolerance}</span>
          )}
        </div>
      )}

      {/* ── Explanation ─────────────────────────────────── */}
      {question.explanation_text && (
        <details className="mb-4 text-xs">
          <summary className="cursor-pointer text-slate-400 hover:text-slate-200">Show explanation</summary>
          <p className="mt-2 text-slate-400 whitespace-pre-wrap">{question.explanation_text}</p>
        </details>
      )}

      {/* ── Actions ─────────────────────────────────────── */}
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
        {pickerOpen ? (
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-700 rounded-lg pl-2 pr-1 py-1">
            <BookOpen className="w-3 h-3 text-slate-500" />
            <select
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none max-w-[16rem]"
            >
              <option value="">No node (keep in bank)</option>
              {candidateNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.id} · {n.topic}</option>
              ))}
            </select>
            <button
              onClick={() => onAccept(selectedNode || null)}
              disabled={busy}
              className="px-3 py-1 rounded text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={() => setPickerOpen(false)}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setPickerOpen(true)}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50"
          >
            <Check className="w-3 h-3 inline mr-1" /> Accept…
          </button>
        )}
      </div>
    </article>
  );
}
