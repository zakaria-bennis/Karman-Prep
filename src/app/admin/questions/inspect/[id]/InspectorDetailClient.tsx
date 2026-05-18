"use client";

// ============================================================
// InspectorDetailClient — split-pane question deep view.
//
// Left: the question rendered as a student sees it (passage,
// stem, choices, figure if attached).
// Right: every finding grouped by severity, with the grader's
// reasoning and (when present) the Pro tiebreak verdict.
//
// Above: action buttons:
//   · Accept (flip is_live=true + import_status=ok)
//   · Mark needs-review
//   · Resolve all findings on this row
//   · Open source PDF page (if rendered locally — link only)
// ============================================================

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCheck,
  Flag,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionFinding, FindingSeverity } from "@/lib/supabase/queries/quiz/findings";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import MathText from "@/components/learn/MathText";
import {
  actionResolveFinding,
  actionAcceptInspectedQuestion,
  actionFlagInspectedQuestion,
} from "@/app/admin/actions";

interface Props {
  question: QuizQuestionWithChoices;
  findings: QuestionFinding[];
}

const SEVERITY_META: Record<
  FindingSeverity,
  { label: string; icon: typeof AlertOctagon; cls: string; rowCls: string }
> = {
  BLOCKING: {
    label: "Blocking",
    icon: AlertOctagon,
    cls: "text-rose-300",
    rowCls: "border-rose-500/40 bg-rose-500/[0.06]",
  },
  WARNING: {
    label: "Warning",
    icon: AlertTriangle,
    cls: "text-amber-300",
    rowCls: "border-amber-500/40 bg-amber-500/[0.05]",
  },
  NOTICE: {
    label: "Notice",
    icon: Info,
    cls: "text-slate-400",
    rowCls: "border-slate-700 bg-slate-800/30",
  },
};

export default function InspectorDetailClient({ question, findings }: Props) {
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<Set<string>>(new Set());

  function toggleDetail(id: string) {
    setExpandedDetail((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resolve(f: QuestionFinding) {
    setBusyId(f.id);
    startTransition(async () => {
      try {
        await actionResolveFinding({ findingId: f.id, note: "Resolved via Inspector" });
      } finally {
        setBusyId(null);
      }
    });
  }

  function acceptLive() {
    startTransition(async () => {
      await actionAcceptInspectedQuestion({ questionId: question.id });
    });
  }

  function flagForReview() {
    startTransition(async () => {
      await actionFlagInspectedQuestion({ questionId: question.id });
    });
  }

  // Group findings by severity
  const blocking = findings.filter((f) => f.severity === "BLOCKING");
  const warning = findings.filter((f) => f.severity === "WARNING");
  const notice = findings.filter((f) => f.severity === "NOTICE");

  const choices = [...question.answer_choices].sort((a, b) => a.letter.localeCompare(b.letter));
  const hasPassage =
    !!question.passage || !!question.passage_a || !!question.passage_b || !!question.passage_intro;

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-1 items-center gap-2 text-xs text-slate-400">
          <span>Status:</span>
          {question.is_live ? (
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
              live
            </span>
          ) : (
            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
              {question.import_status ?? "draft"}
            </span>
          )}
          <span className="text-slate-600">·</span>
          <span>{blocking.length} blocking</span>
          <span className="text-slate-600">·</span>
          <span>{warning.length} warning</span>
          <span className="text-slate-600">·</span>
          <span>{notice.length} notice</span>
        </div>
        <button
          onClick={acceptLive}
          disabled={blocking.length > 0}
          title={blocking.length > 0 ? "Resolve blocking findings first" : "Set live"}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Accept live
        </button>
        <button
          onClick={flagForReview}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
        >
          <Flag className="h-3.5 w-3.5" /> Mark needs-review
        </button>
      </div>

      {/* Split pane */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT — student preview */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-sm font-semibold text-slate-200">Student preview</h2>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              difficulty {question.difficulty_level ?? "?"} · {question.subject ?? "—"}
            </span>
          </div>

          {/* Passage */}
          {hasPassage && (
            <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
              {question.passage_intro && (
                <p className="mb-2 text-xs italic text-slate-400">
                  <MathText text={question.passage_intro} />
                </p>
              )}
              {question.passage && (
                <div className="text-sm leading-relaxed text-slate-300">
                  <MathText text={question.passage} />
                </div>
              )}
              {question.passage_a && (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Passage A
                    </div>
                    <div className="text-sm text-slate-300">
                      <MathText text={question.passage_a} />
                    </div>
                  </div>
                  {question.passage_b && (
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Passage B
                      </div>
                      <div className="text-sm text-slate-300">
                        <MathText text={question.passage_b} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Figure */}
          {question.image_url && (
            <div className="mb-4 flex justify-center rounded-lg border border-slate-800 bg-white p-3">
              <Image
                src={question.image_url}
                alt={question.image_alt ?? "Question figure"}
                width={500}
                height={400}
                className="max-h-96 w-auto object-contain"
                unoptimized
              />
            </div>
          )}

          {/* Question stem */}
          <div className="mb-4 text-base leading-relaxed text-slate-100">
            <MathText text={question.question_text} />
          </div>

          {/* Choices */}
          {choices.length > 0 ? (
            <div className="space-y-2">
              {choices.map((c) => {
                const isCorrect = c.letter === question.correct_answer;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex gap-3 rounded-lg border px-3 py-2.5 text-sm",
                      isCorrect
                        ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                        : "border-slate-700 bg-slate-950/40"
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 font-semibold",
                        isCorrect ? "text-emerald-300" : "text-slate-400"
                      )}
                    >
                      {c.letter}
                    </span>
                    <span className="text-slate-200">
                      <MathText text={c.choice_text} />
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2.5 text-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                SPR answer
              </span>{" "}
              <span className="text-emerald-300">{question.correct_answer}</span>
              {question.numeric_tolerance != null && (
                <span className="ml-2 text-xs text-slate-400">
                  ± {String(question.numeric_tolerance)}
                </span>
              )}
            </div>
          )}

          {/* Hint + explanation, collapsed */}
          <details className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-300">
              Hint &amp; explanation
            </summary>
            <div className="space-y-3 border-t border-slate-800 px-3 py-3 text-xs">
              {question.hint && (
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Hint
                  </div>
                  <div className="text-slate-300">
                    <MathText text={question.hint} />
                  </div>
                </div>
              )}
              {question.explanation_text && (
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Explanation
                  </div>
                  <div className="leading-relaxed text-slate-300">
                    <MathText text={question.explanation_text} />
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>

        {/* RIGHT — findings */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-sm font-semibold text-slate-200">Findings</h2>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              {findings.length} active
            </span>
          </div>

          {findings.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400">No active findings — looks clean.</p>
              <p className="mt-1 text-xs text-slate-500">
                Either none flagged, or all have been resolved.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                ...blocking.map((f) => ({ f, sev: "BLOCKING" as const })),
                ...warning.map((f) => ({ f, sev: "WARNING" as const })),
                ...notice.map((f) => ({ f, sev: "NOTICE" as const })),
              ].map(({ f }) => {
                const meta = SEVERITY_META[f.severity];
                const Icon = meta.icon;
                const isExpanded = expandedDetail.has(f.id);
                const hasDetail = f.detail && Object.keys(f.detail).length > 0;
                return (
                  <div key={f.id} className={cn("rounded-lg border p-3 text-xs", meta.rowCls)}>
                    <div className="flex items-start gap-2">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.cls)} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-bold uppercase", meta.cls)}>
                            {meta.label}
                          </span>
                          <code className="rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                            {f.source}:{f.code}
                          </code>
                          <span className="text-[10px] text-slate-500">{f.category}</span>
                        </div>
                        <div className="mt-1 leading-relaxed text-slate-200">{f.message}</div>
                        {f.value && (
                          <div className="mt-1 rounded bg-slate-950/60 px-2 py-1 font-mono text-[11px] text-slate-300">
                            {f.value}
                          </div>
                        )}
                        {hasDetail && (
                          <button
                            onClick={() => toggleDetail(f.id)}
                            className="mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 hover:text-slate-200"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                            grader detail
                          </button>
                        )}
                        {isExpanded && hasDetail && (
                          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-950/80 p-2 font-mono text-[10px] leading-snug text-slate-300">
                            {JSON.stringify(f.detail, null, 2)}
                          </pre>
                        )}
                      </div>
                      <button
                        onClick={() => resolve(f)}
                        disabled={busyId === f.id}
                        title="Resolve this finding"
                        className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                      >
                        {busyId === f.id ? "…" : "Resolve"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Source-PDF reference */}
      {question.source_pdf && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
          <ExternalLink className="mr-1.5 inline-block h-3.5 w-3.5" /> Source:{" "}
          <span className="font-mono text-slate-300">{question.source_pdf}</span>, page{" "}
          <span className="font-mono text-slate-300">{question.source_page}</span>. Original PDFs
          live in R2 (<code>pdf-inbox/&lt;job-id&gt;/</code>); ask backend to render the page if
          needed for manual diff.
        </div>
      )}
    </div>
  );
}
