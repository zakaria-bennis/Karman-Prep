"use client";

// ============================================================
// PreviewSidePanel — right-side slide-in panel that shows
// whichever toggle chips are active on the bottom action bar.
//
// Sections stack vertically; each has its own close button so
// the admin can dismiss without going back to the toolbar chip.
//
// PHASE 2 NOTE: the PDF section here is a PLACEHOLDER — it shows
// the source_pdf + source_page text and a "PDF rendering ships
// in phase 4" hint. Real pdfjs-dist rendering, page cropping,
// and bbox detection comes in phase 4.
//
// Grader section pulls votes from the inline `grader_votes`
// JSONB column the GraderVotesBadge already reads; if absent,
// shows an "Ungraded" hint. Same shape, same nullable rules.
// ============================================================

import { X, Compass, Lightbulb, BookOpen, FileText, Vote } from "lucide-react";
import MathText from "@/components/learn/MathText";
import { cn } from "@/lib/utils";
import type { QuizQuestionWithChoices, AnswerLetter } from "@/types/quiz";
import type { PanelKey } from "./PreviewActionBar";
import { EditableMathText } from "./EditableMathText";
import { EditedChip } from "@/components/admin/EditedChip";
import type { PreviewEditProps } from "./QuestionPreview";

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];

interface Props {
  question: QuizQuestionWithChoices;
  openPanels: Set<PanelKey>;
  onClose: (key: PanelKey) => void;
  edit?: PreviewEditProps;
}

export function PreviewSidePanel({ question: q, openPanels, onClose, edit }: Props) {
  return (
    <aside className="flex h-full w-full flex-col gap-3 overflow-y-auto rounded-xl border border-indigo-500/20 bg-slate-900/40 p-3">
      {openPanels.has("desmos") && (
        <PanelCard
          title="Desmos strategy"
          Icon={Compass}
          tone="sky"
          onClose={() => onClose("desmos")}
          edit={edit}
          fieldKey="desmos_strategy"
        >
          {edit ? (
            <div className="text-[14px] leading-[1.6] text-sky-100">
              <EditableMathText
                value={q.desmos_strategy ?? ""}
                onSave={(v) => edit.onSave("desmos_strategy", v)}
                className="block whitespace-pre-wrap"
                allowEmpty
                placeholder="(no Desmos strategy — click to add)"
              />
            </div>
          ) : q.desmos_strategy ? (
            <div className="text-[14px] leading-[1.6] text-sky-100">
              <MathText text={q.desmos_strategy} className="block whitespace-pre-wrap" />
            </div>
          ) : (
            <EmptyHint>No Desmos strategy stored for this question.</EmptyHint>
          )}
        </PanelCard>
      )}

      {openPanels.has("hints") && (
        <PanelCard
          title="Hints"
          Icon={Lightbulb}
          tone="amber"
          onClose={() => onClose("hints")}
          edit={edit}
          fieldKey="hint"
        >
          {edit ? (
            <div className="text-[14px] leading-[1.6] text-amber-100">
              <EditableMathText
                value={q.hint ?? ""}
                onSave={(v) => edit.onSave("hint", v)}
                className="block whitespace-pre-wrap"
                allowEmpty
                placeholder="(no hint — click to add)"
              />
            </div>
          ) : q.hint ? (
            <div className="text-[14px] leading-[1.6] text-amber-100">
              <MathText text={q.hint} className="block whitespace-pre-wrap" />
            </div>
          ) : (
            <EmptyHint>No hint stored for this question.</EmptyHint>
          )}
        </PanelCard>
      )}

      {openPanels.has("explanations") && (
        <PanelCard
          title="Explanations"
          Icon={BookOpen}
          tone="indigo"
          onClose={() => onClose("explanations")}
        >
          <ExplanationsBody question={q} />
        </PanelCard>
      )}

      {openPanels.has("pdf") && (
        <PanelCard title="Source PDF" Icon={FileText} tone="slate" onClose={() => onClose("pdf")}>
          <PdfPlaceholder question={q} />
        </PanelCard>
      )}

      {openPanels.has("grader") && (
        <PanelCard title="Grader votes" Icon={Vote} tone="slate" onClose={() => onClose("grader")}>
          <GraderBody question={q} />
        </PanelCard>
      )}
    </aside>
  );
}

// ── shared subcomponents ──────────────────────────────────────

type Tone = "sky" | "amber" | "indigo" | "slate";

const TONE_CLASSES: Record<Tone, { border: string; bg: string; text: string }> = {
  sky: { border: "border-sky-500/30", bg: "bg-sky-500/[0.04]", text: "text-sky-300" },
  amber: { border: "border-amber-500/30", bg: "bg-amber-500/[0.04]", text: "text-amber-300" },
  indigo: {
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/[0.04]",
    text: "text-indigo-300",
  },
  slate: { border: "border-slate-700", bg: "bg-slate-900/40", text: "text-slate-300" },
};

function PanelCard({
  title,
  Icon,
  tone,
  onClose,
  children,
  edit,
  fieldKey,
}: {
  title: string;
  Icon: React.ElementType;
  tone: Tone;
  onClose: () => void;
  children: React.ReactNode;
  edit?: PreviewEditProps;
  fieldKey?: string;
}) {
  const t = TONE_CLASSES[tone];
  const showChip = edit && fieldKey && edit.editedFields.has(fieldKey);
  return (
    <section className={cn("rounded-xl border", t.border, t.bg)}>
      <header className="flex items-center gap-2 border-b border-slate-800/60 px-3 py-2">
        <Icon className={cn("h-3.5 w-3.5", t.text)} />
        <span className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", t.text)}>
          {title}
        </span>
        {showChip && edit && fieldKey && (
          <EditedChip questionId={edit.questionId} fieldKey={fieldKey} fieldLabel={fieldKey} />
        )}
        <button
          onClick={onClose}
          className="ml-auto text-slate-500 hover:text-slate-200"
          aria-label={`Close ${title}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="text-xs italic text-slate-500">{children}</div>;
}

function ExplanationsBody({ question: q }: { question: QuizQuestionWithChoices }) {
  const perChoiceMap = q.explanation_per_choice as Record<string, string | undefined> | null;
  const hasAnything =
    !!q.explanation_text || (perChoiceMap && Object.keys(perChoiceMap).length > 0);
  if (!hasAnything) {
    return <EmptyHint>No explanation stored for this question.</EmptyHint>;
  }
  return (
    <>
      {q.explanation_text && (
        <div className="mb-3 text-[14px] leading-[1.6] text-slate-100">
          <MathText text={q.explanation_text} className="block whitespace-pre-wrap" />
        </div>
      )}
      {perChoiceMap && q.answer_format === "multiple_choice" && (
        <ul className="space-y-2">
          {LETTERS.map((letter) => {
            const expl = perChoiceMap[letter];
            if (!expl) return null;
            const isCorrect = letter === q.correct_answer;
            return (
              <li
                key={letter}
                className={cn(
                  "rounded-lg border px-3 py-2 text-[13px] leading-[1.5]",
                  isCorrect
                    ? "border-emerald-500/40 bg-emerald-500/[0.04] text-emerald-100"
                    : "border-slate-800 bg-slate-900/40 text-slate-200"
                )}
              >
                <span
                  className={cn(
                    "mr-1.5 inline-block font-mono font-bold",
                    isCorrect ? "text-emerald-300" : "text-slate-400"
                  )}
                >
                  {letter}.
                </span>
                <MathText text={expl} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function PdfPlaceholder({ question: q }: { question: QuizQuestionWithChoices }) {
  if (!q.source_pdf) {
    return <EmptyHint>No source PDF on file.</EmptyHint>;
  }
  return (
    <div className="space-y-2 text-xs text-slate-300">
      <div className="flex items-center gap-2">
        <span className="text-slate-500">file:</span>
        <span className="font-mono text-slate-200">{q.source_pdf}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">page:</span>
        <span className="font-mono text-slate-200">{q.source_page ?? "—"}</span>
      </div>
      <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-3 py-4 text-center text-[11px] italic text-slate-500">
        PDF inline rendering ships in phase 4.
        <br />
        For now, open the PDF separately at the page above.
      </div>
    </div>
  );
}

function GraderBody({ question: q }: { question: QuizQuestionWithChoices }) {
  const votes = (q as unknown as { grader_votes?: unknown }).grader_votes;
  if (!votes || typeof votes !== "object") {
    return <EmptyHint>This question has not been graded yet.</EmptyHint>;
  }
  const v = votes as Record<string, unknown>;
  const pass1 = v.pass1 as Record<string, unknown> | undefined;
  const adjudicator = (v.adjudicator_correct as string | undefined) ?? null;
  const final = (v.final_correct as string | undefined) ?? null;
  return (
    <div className="space-y-2 text-xs text-slate-200">
      {pass1 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Pass 1 voters</div>
          {Object.entries(pass1).map(([voter, value]) => (
            <div key={voter} className="flex items-center justify-between">
              <span className="font-mono text-slate-400">{voter}</span>
              <span className="font-mono text-slate-100">{String(value ?? "—")}</span>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1 border-t border-slate-800/60 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">adjudicator</span>
          <span className="font-mono text-slate-100">{adjudicator ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">final</span>
          <span className="font-mono font-bold text-emerald-300">{final ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}
