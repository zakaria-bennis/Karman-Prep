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
import { useRouter } from "next/navigation";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCheck,
  Flag,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionFinding, FindingSeverity } from "@/lib/supabase/queries/quiz/findings";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import {
  actionResolveFinding,
  actionAcceptInspectedQuestion,
  actionFlagInspectedQuestion,
  actionUpdateInspectedQuestion,
} from "@/app/admin/actions";
import ViewMode from "./_components/ViewMode";
import EditForm from "./_components/EditForm";
import { makeInitialForm, type EditFormShape } from "./_components/edit-form-utils";

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
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [topAction, setTopAction] = useState<"idle" | "accepting" | "flagging" | "saving">("idle");
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<EditFormShape>(() => makeInitialForm(question));

  const isMc = question.answer_format !== "numeric_entry";

  function updateField<K extends keyof EditFormShape>(key: K, value: EditFormShape[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function enterEditMode() {
    setForm(makeInitialForm(question));
    setEditMode(true);
    setFeedback(null);
  }

  function cancelEdit() {
    setForm(makeInitialForm(question));
    setEditMode(false);
    setFeedback(null);
  }

  function saveEdits() {
    setTopAction("saving");
    setFeedback(null);
    startTransition(async () => {
      try {
        // Build a patch with only changed fields so we don't overwrite
        // anything we didn't touch.
        const original = makeInitialForm(question);
        const patch: Record<string, unknown> = { questionId: question.id };
        let changes = 0;
        const stringFields = [
          "question_text",
          "hint",
          "explanation_text",
          "desmos_strategy",
          "image_alt",
          "passage_intro",
          "passage",
          "passage_a",
          "passage_b",
          "correct_answer",
          "concept_slug",
        ] as const;
        for (const k of stringFields) {
          if (form[k] !== original[k]) {
            patch[k] = form[k];
            changes++;
          }
        }
        // Choices (MC only) — bundle into `choices` object
        if (isMc) {
          const choices: Record<string, string> = {};
          (["A", "B", "C", "D"] as const).forEach((letter) => {
            const k = `choice_${letter.toLowerCase()}` as keyof EditFormShape;
            if (form[k] !== original[k]) {
              choices[letter] = form[k];
              changes++;
            }
          });
          if (Object.keys(choices).length > 0) patch.choices = choices;
        }
        // Per-choice explanations (MC only) — bundle into
        // `explanations_per_choice` (note the plural — payload field
        // distinct from the JSONB column name).
        if (isMc) {
          const epc: Record<string, string> = {};
          let epcChanged = false;
          (["A", "B", "C", "D"] as const).forEach((letter) => {
            const k = `explanation_${letter.toLowerCase()}` as keyof EditFormShape;
            if (form[k] !== original[k]) epcChanged = true;
            if (form[k]) epc[letter] = form[k] as string;
          });
          if (epcChanged) {
            patch.explanations_per_choice = epc;
            changes++;
          }
        }
        // numeric_tolerance — parse-to-number-or-null
        if (form.numeric_tolerance !== original.numeric_tolerance) {
          const v = form.numeric_tolerance.trim();
          patch.numeric_tolerance = v === "" ? null : Number.parseFloat(v);
          changes++;
        }
        if (changes === 0) {
          setFeedback({ kind: "success", message: "No changes to save." });
          setEditMode(false);
          setTopAction("idle");
          return;
        }
        await actionUpdateInspectedQuestion(
          patch as unknown as Parameters<typeof actionUpdateInspectedQuestion>[0]
        );
        setFeedback({
          kind: "success",
          message: `Saved ${changes} change${changes === 1 ? "" : "s"}.`,
        });
        setEditMode(false);
        router.refresh();
      } catch (err) {
        setFeedback({
          kind: "error",
          message: `Save failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setTopAction("idle");
      }
    });
  }

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
    setFeedback(null);
    startTransition(async () => {
      try {
        await actionResolveFinding({ findingId: f.id, note: "Resolved via Inspector" });
        setFeedback({ kind: "success", message: `Finding resolved.` });
        router.refresh();
      } catch (err) {
        setFeedback({
          kind: "error",
          message: `Resolve failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBusyId(null);
      }
    });
  }

  function acceptLive() {
    setTopAction("accepting");
    setFeedback(null);
    startTransition(async () => {
      try {
        await actionAcceptInspectedQuestion({ questionId: question.id });
        // After accept, the question is live and its findings auto-resolved.
        // The row no longer belongs in the worklist, so go back to the list
        // with a success banner that the next page render will surface.
        router.push("/admin/questions/inspect?accepted=" + encodeURIComponent(question.id));
      } catch (err) {
        setFeedback({
          kind: "error",
          message: `Accept failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        setTopAction("idle");
      }
    });
  }

  function flagForReview() {
    setTopAction("flagging");
    setFeedback(null);
    startTransition(async () => {
      try {
        await actionFlagInspectedQuestion({ questionId: question.id });
        setFeedback({
          kind: "success",
          message: "Marked needs-review. The question stays hidden from students until cleared.",
        });
        router.refresh();
      } catch (err) {
        setFeedback({
          kind: "error",
          message: `Flag failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setTopAction("idle");
      }
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
        {editMode ? (
          <>
            <button
              onClick={saveEdits}
              disabled={topAction !== "idle"}
              className="inline-flex items-center gap-1.5 rounded-md bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {topAction === "saving" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {topAction === "saving" ? "Saving…" : "Save edits"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={topAction !== "idle"}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={enterEditMode}
              disabled={topAction !== "idle"}
              className="inline-flex items-center gap-1.5 rounded-md bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit fields
            </button>
            <button
              onClick={acceptLive}
              disabled={blocking.length > 0 || topAction !== "idle"}
              title={blocking.length > 0 ? "Resolve blocking findings first" : "Set live"}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {topAction === "accepting" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              {topAction === "accepting" ? "Accepting…" : "Accept live"}
            </button>
            <button
              onClick={flagForReview}
              disabled={topAction !== "idle"}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {topAction === "flagging" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Flag className="h-3.5 w-3.5" />
              )}
              {topAction === "flagging" ? "Flagging…" : "Mark needs-review"}
            </button>
          </>
        )}
      </div>

      {feedback && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
            feedback.kind === "success"
              ? "border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-200"
              : "border-rose-500/40 bg-rose-500/[0.06] text-rose-200"
          )}
        >
          {feedback.kind === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline opacity-70 hover:opacity-100"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Split pane */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT — student preview (view mode) OR editable form (edit mode) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-sm font-semibold text-slate-200">
              {editMode ? "Edit fields" : "Student preview"}
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              difficulty {question.difficulty_level ?? "?"} · {question.subject ?? "—"}
            </span>
          </div>

          {editMode ? (
            <EditForm form={form} isMc={isMc} setForm={updateField} />
          ) : (
            <ViewMode question={question} hasPassage={hasPassage} choices={choices} />
          )}
        </div>

        {/* RIGHT — findings (always visible — admin reads the issue
            while editing the field) */}
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
