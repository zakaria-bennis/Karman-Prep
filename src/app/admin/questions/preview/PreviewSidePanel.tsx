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

import { useState } from "react";
import { X, Compass, Lightbulb, BookOpen, FileText, ImageIcon, Vote } from "lucide-react";
import MathText from "@/components/learn/MathText";
import { cn } from "@/lib/utils";
import type { AnswerLetter } from "@/types/quiz";
import type { PanelKey } from "./PreviewActionBar";
import { EditableMathText } from "./EditableMathText";
import { EditedChip } from "@/components/admin/EditedChip";
import type { PreviewEditProps } from "./QuestionPreview";
import { PdfSourceViewer } from "./PdfSourceViewer";
import { SourceAssetImagePanel } from "@/components/admin/source-lineage/SourceAssetImagePanel";
import type { PreviewQuestionWithLineage } from "./types";

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];

interface Props {
  question: PreviewQuestionWithLineage;
  openPanels: Set<PanelKey>;
  onClose: (key: PanelKey) => void;
  edit?: PreviewEditProps;
  showSourceAssetPanels: boolean;
}

export function PreviewSidePanel({
  question: q,
  openPanels,
  onClose,
  edit,
  showSourceAssetPanels,
}: Props) {
  return (
    <aside className="flex h-full w-full flex-col gap-3 overflow-y-auto rounded-xl border border-gold/20 bg-surface/40 p-3">
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
            <div className="text-[14px] leading-[1.6] text-info-bright">
              <EditableMathText
                value={q.desmos_strategy ?? ""}
                onSave={(v) => edit.onSave("desmos_strategy", v)}
                className="block whitespace-pre-wrap"
                allowEmpty
                placeholder="(no Desmos strategy — click to add)"
              />
            </div>
          ) : q.desmos_strategy ? (
            <div className="text-[14px] leading-[1.6] text-info-bright">
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
            <div className="text-[14px] leading-[1.6] text-warning-bright">
              <EditableMathText
                value={q.hint ?? ""}
                onSave={(v) => edit.onSave("hint", v)}
                className="block whitespace-pre-wrap"
                allowEmpty
                placeholder="(no hint — click to add)"
              />
            </div>
          ) : q.hint ? (
            <div className="text-[14px] leading-[1.6] text-warning-bright">
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
          <PdfPanel question={q} />
        </PanelCard>
      )}

      {showSourceAssetPanels && openPanels.has("crop") && (
        <PanelCard
          title="Question crop"
          Icon={ImageIcon}
          tone="slate"
          onClose={() => onClose("crop")}
        >
          <SourceAssetImagePanel
            lineage={q.sourceLineage}
            assetType="question_crop"
            emptyLabel="Phase 3 ran, but no matched question crop is attached."
          />
        </PanelCard>
      )}

      {showSourceAssetPanels && openPanels.has("expanded") && (
        <PanelCard
          title="Expanded crop"
          Icon={ImageIcon}
          tone="slate"
          onClose={() => onClose("expanded")}
        >
          <SourceAssetImagePanel
            lineage={q.sourceLineage}
            assetType="expanded_question_crop"
            emptyLabel="Phase 3 ran, but no expanded crop is attached."
          />
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
  sky: { border: "border-info/30", bg: "bg-info/[0.04]", text: "text-info-bright" },
  amber: { border: "border-warning/30", bg: "bg-warning/[0.04]", text: "text-warning-bright" },
  indigo: {
    border: "border-gold/30",
    bg: "bg-gold/[0.04]",
    text: "text-gold-bright",
  },
  slate: { border: "border-bronze", bg: "bg-surface/40", text: "text-ivory" },
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
      <header className="flex items-center gap-2 border-b border-bronze/60 px-3 py-2">
        <Icon className={cn("h-3.5 w-3.5", t.text)} />
        <span className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", t.text)}>
          {title}
        </span>
        {showChip && edit && fieldKey && (
          <EditedChip questionId={edit.questionId} fieldKey={fieldKey} fieldLabel={fieldKey} />
        )}
        <button
          onClick={onClose}
          className="ml-auto text-taupe hover:text-ivory"
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
  return <div className="text-xs italic text-taupe">{children}</div>;
}

function ExplanationsBody({ question: q }: { question: PreviewQuestionWithLineage }) {
  const perChoiceMap = q.explanation_per_choice as Record<string, string | undefined> | null;
  const hasAnything =
    !!q.explanation_text || (perChoiceMap && Object.keys(perChoiceMap).length > 0);
  if (!hasAnything) {
    return <EmptyHint>No explanation stored for this question.</EmptyHint>;
  }
  return (
    <>
      {q.explanation_text && (
        <div className="mb-3 text-[14px] leading-[1.6] text-ivory">
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
                    ? "border-success/40 bg-success/[0.04] text-success-bright"
                    : "border-bronze bg-surface/40 text-ivory"
                )}
              >
                <span
                  className={cn(
                    "mr-1.5 inline-block font-mono font-bold",
                    isCorrect ? "text-success-bright" : "text-taupe"
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

function PdfPanel({ question: q }: { question: PreviewQuestionWithLineage }) {
  // Two-mode UI: default shows the cropped figure (what the
  // student sees on the quiz); expand opens the source PDF page
  // in an iframe so the admin can compare against the original.
  // Both modes mounted lazily — heavy iframe only renders when
  // expanded.
  const hasFigure = !!q.image_url;
  const hasSource = !!q.source_pdf;
  const [view, setView] = useStateForPdfPanel(hasFigure ? "cropped" : "source");

  if (!hasFigure && !hasSource) {
    return <EmptyHint>No figure or source PDF on file.</EmptyHint>;
  }

  return (
    <div className="space-y-3">
      {/* Mode toggle — only shown when both modes are available. */}
      {hasFigure && hasSource && (
        <div className="inline-flex rounded-lg border border-bronze bg-surface p-0.5 text-[11px]">
          <button
            onClick={() => setView("cropped")}
            className={
              view === "cropped"
                ? "rounded-md bg-surface-raised px-2.5 py-1 font-semibold text-ivory"
                : "rounded-md px-2.5 py-1 text-taupe hover:text-ivory"
            }
          >
            Cropped figure
          </button>
          <button
            onClick={() => setView("source")}
            className={
              view === "source"
                ? "rounded-md bg-surface-raised px-2.5 py-1 font-semibold text-ivory"
                : "rounded-md px-2.5 py-1 text-taupe hover:text-ivory"
            }
          >
            Source PDF page
          </button>
        </div>
      )}

      {view === "cropped" && hasFigure && (
        <div className="overflow-hidden rounded-lg border border-bronze/50 bg-surface p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={q.image_url ?? ""}
            alt={q.image_alt ?? ""}
            className="mx-auto block max-h-[480px] w-auto rounded object-contain"
          />
          {q.image_alt && <p className="mt-2 px-2 text-[10px] italic text-taupe">{q.image_alt}</p>}
        </div>
      )}

      {view === "source" && hasSource && (
        <PdfSourceViewer sourcePdf={q.source_pdf!} sourcePage={q.source_page ?? null} />
      )}

      {/* Metadata footer — always visible so the admin sees what
          file + page the question came from regardless of mode. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-bronze/60 pt-2 text-[10px] text-taupe">
        {q.source_pdf && (
          <span>
            <span className="text-taupe">file:</span>{" "}
            <span className="font-mono text-ivory">{q.source_pdf}</span>
          </span>
        )}
        {q.source_page != null && (
          <span>
            <span className="text-taupe">page:</span>{" "}
            <span className="font-mono text-ivory">p{q.source_page}</span>
          </span>
        )}
        {hasFigure && (
          <span>
            <span className="text-taupe">figure:</span>{" "}
            <span className="font-mono text-ivory">stored in R2</span>
          </span>
        )}
      </div>
    </div>
  );
}

// Small local hook just to keep React's useState import scoped.
// Defined inside this file because PdfPanel is the only consumer
// and inlining the import keeps the side-panel file self-contained.
function useStateForPdfPanel<T>(initial: T): [T, (next: T) => void] {
  // Re-export of React.useState with the typed signature we want.
  return useState<T>(initial);
}

function GraderBody({ question: q }: { question: PreviewQuestionWithLineage }) {
  const votes = (q as unknown as { grader_votes?: unknown }).grader_votes;
  if (!votes || typeof votes !== "object") {
    return <EmptyHint>This question has not been graded yet.</EmptyHint>;
  }
  const v = votes as Record<string, unknown>;
  const pass1 = v.pass1 as Record<string, unknown> | undefined;
  const adjudicator = (v.adjudicator_correct as string | undefined) ?? null;
  const final = (v.final_correct as string | undefined) ?? null;
  return (
    <div className="space-y-2 text-xs text-ivory">
      {pass1 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-taupe">Pass 1 voters</div>
          {Object.entries(pass1).map(([voter, value]) => (
            <div key={voter} className="flex items-center justify-between">
              <span className="font-mono text-taupe">{voter}</span>
              <span className="font-mono text-ivory">{String(value ?? "—")}</span>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1 border-t border-bronze/60 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-taupe">adjudicator</span>
          <span className="font-mono text-ivory">{adjudicator ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-taupe">final</span>
          <span className="font-mono font-bold text-success-bright">{final ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}
