"use client";

// ============================================================
// QuestionNavigator — slide-in panel showing every question in
// the diagnostic with status pips for answered / bookmarked /
// hinted / current.
//
// Layout:
//   ┌──────────────────────────────────┐
//   │ All questions          [×]       │
//   │ 12 answered · 3 bookmarked · 5 left│
//   ├──────────────────────────────────┤
//   │ MATH                              │
//   │  1  2  3  4  5                    │
//   │  6  7  8  9 10                    │
//   │ … etc …                           │
//   ├──────────────────────────────────┤
//   │ READING & WRITING                 │
//   │ 21 22 23 24 25                    │
//   │  …                                │
//   └──────────────────────────────────┘
//
// Each tile is a button that jumps to that question. Tiles
// show:
//   · Question number (or chosen letter if answered)
//   · Glowing blue ring on the active question
//   · Tiny bookmark pip in the top-right when bookmarked
//   · Tiny lightbulb pip in the top-left when a hint was used
//
// Backdrop click dismisses; ESC closes too.
// ============================================================

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, Bookmark, Hash, HelpCircle } from "lucide-react";
import { DOMAIN_SECTION, type SATDomain } from "@/types";
import { cn } from "@/lib/utils";

interface NavQuestion {
  id: string;
  domain: SATDomain;
  /** Used to compute right/wrong colouring on the tile. */
  correct: string;
}

interface Props {
  open: boolean;
  questions: NavQuestion[];
  currentIdx: number;
  answers: Record<string, string>;
  bookmarkedIds: Set<string>;
  hintedIds: Set<string>;
  /** The SAT section the student is currently in. Tiles for the
   *  other section render in a locked / non-interactive state —
   *  cross-section jumps are disabled (no time-travel). */
  currentSection: "math" | "rw";
  onClose: () => void;
  onJump: (idx: number) => void;
}

export function QuestionNavigator({
  open,
  questions,
  currentIdx,
  answers,
  bookmarkedIds,
  hintedIds,
  currentSection,
  onClose,
  onJump,
}: Props) {
  // ESC to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Partition by section, keeping global indexes for the tile labels.
  const indexed = questions.map((q, i) => ({ ...q, idx: i }));
  const mathQs = indexed.filter((q) => DOMAIN_SECTION[q.domain] === "math");
  const rwQs = indexed.filter((q) => DOMAIN_SECTION[q.domain] === "rw");

  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const remaining = questions.length - answeredCount;
  const bookmarkedCount = bookmarkedIds.size;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop — click to dismiss. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="absolute inset-0 bg-night/40 backdrop-blur-sm"
      />

      {/* Slide-in panel. */}
      <motion.aside
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-ivory/10 bg-[#070605] shadow-2xl"
      >
        {/* Header */}
        <header className="border-b border-ivory/10 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-info">
                Navigation
              </p>
              <h2 className="text-lg font-extrabold text-ivory">All questions</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-taupe hover:bg-surface/[0.08] hover:text-ivory"
              aria-label="Close navigator"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2 text-xs text-taupe">
            <span className="font-semibold text-success-bright">{answeredCount} answered</span>
            <span className="mx-1.5 text-taupe">·</span>
            <span className="font-semibold text-warning-bright">{bookmarkedCount} bookmarked</span>
            <span className="mx-1.5 text-taupe">·</span>
            <span className="font-semibold text-ivory">{remaining} left</span>
          </p>
        </header>

        {/* Body — scroll if long. */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {/* R&W rendered first to mirror the diagnostic's
              section order (R&W section runs first, then Math).
              The section the student is NOT currently in is shown
              but locked — tiles render greyed and clicks are
              suppressed so the student can't time-travel. */}
          <Section
            title="Reading & Writing"
            icon={<HelpCircle className="h-3.5 w-3.5" />}
            color="text-error-bright"
            questions={rwQs}
            currentIdx={currentIdx}
            answers={answers}
            bookmarkedIds={bookmarkedIds}
            hintedIds={hintedIds}
            locked={currentSection !== "rw"}
            onJump={(i) => {
              onJump(i);
              onClose();
            }}
          />
          <Section
            title="Math"
            icon={<Hash className="h-3.5 w-3.5" />}
            color="text-info"
            questions={mathQs}
            currentIdx={currentIdx}
            answers={answers}
            bookmarkedIds={bookmarkedIds}
            hintedIds={hintedIds}
            locked={currentSection !== "math"}
            onJump={(i) => {
              onJump(i);
              onClose();
            }}
          />
        </div>

        {/* Footer legend */}
        <footer className="grid grid-cols-2 gap-2 border-t border-ivory/10 px-5 py-3 text-[10px] text-taupe">
          <LegendItem
            swatch={<div className="h-3 w-3 rounded border border-ivory/15 bg-surface/[0.04]" />}
            label="Unanswered"
          />
          <LegendItem
            swatch={<div className="h-3 w-3 rounded border border-success/50 bg-success/30" />}
            label="Correct"
          />
          <LegendItem
            swatch={<div className="h-3 w-3 rounded border border-error/50 bg-error/30" />}
            label="Wrong"
          />
          <LegendItem
            swatch={<div className="h-3 w-3 rounded border border-warning/50 bg-warning/30" />}
            label="Hint used"
          />
          <LegendItem
            swatch={<Bookmark className="h-3 w-3 fill-white text-ivory" />}
            label="Bookmarked"
          />
          <LegendItem
            swatch={<div className="h-3 w-3 rounded bg-surface/[0.04] ring-2 ring-info/50" />}
            label="Current"
          />
        </footer>
      </motion.aside>
    </div>
  );
}

function Section({
  title,
  icon,
  color,
  questions,
  currentIdx,
  answers,
  bookmarkedIds,
  hintedIds,
  locked = false,
  onJump,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  questions: Array<NavQuestion & { idx: number }>;
  currentIdx: number;
  answers: Record<string, string>;
  bookmarkedIds: Set<string>;
  hintedIds: Set<string>;
  /** When true, this section's tiles are rendered greyed out
   *  and not interactive — student can't jump cross-section. */
  locked?: boolean;
  onJump: (idx: number) => void;
}) {
  if (questions.length === 0) return null;
  return (
    <div>
      <div
        className={cn(
          "mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest",
          color,
          locked && "opacity-60"
        )}
      >
        {icon}
        {title}
        <span className="text-[10px] font-semibold normal-case tracking-normal text-taupe">
          · {questions.length} questions
        </span>
        {locked && (
          <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-semibold uppercase normal-case tracking-normal tracking-wider text-taupe">
            Locked
          </span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, sectionIdx) => {
          const userAnswer = answers[q.id];
          const answered = !!userAnswer;
          const correct = answered && userAnswer === q.correct;
          const wrong = answered && !correct;
          const isCurrent = q.idx === currentIdx;
          const isBookmarked = bookmarkedIds.has(q.id);
          const isHinted = hintedIds.has(q.id);

          // Colour rules:
          //   · No hint, correct      → green fill
          //   · No hint, wrong        → red fill
          //   · Hint used, unanswered → amber fill
          //   · Hint used, correct    → amber fill, GREEN outline
          //   · Hint used, wrong      → amber fill, RED outline
          //   · Otherwise (default)   → neutral
          // Current-question state is layered on top with a glowing
          // blue ring so it always reads.
          let palette: string;
          if (isHinted) {
            if (correct) {
              palette =
                "bg-warning/20 border-2 border-success/40 text-warning-bright hover:bg-warning/30";
            } else if (wrong) {
              palette =
                "bg-warning/20 border-2 border-error/40 text-warning-bright hover:bg-warning/30";
            } else {
              palette =
                "bg-warning/20 border border-warning/40 text-warning-bright hover:bg-warning/30";
            }
          } else if (correct) {
            palette =
              "bg-success/20 border border-success/40 text-success-bright hover:bg-success/30";
          } else if (wrong) {
            palette = "bg-error/20 border border-error/40 text-error-bright hover:bg-error/30";
          } else {
            palette =
              "bg-surface/[0.04] border border-ivory/10 text-ivory hover:bg-surface/[0.08] hover:border-ivory/20";
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                if (locked) return;
                onJump(q.idx);
              }}
              disabled={locked}
              aria-label={`Question ${sectionIdx + 1} of this section${locked ? " — locked" : ""}`}
              aria-current={isCurrent ? "true" : undefined}
              title={
                locked ? "This section is locked — finish your current section first." : undefined
              }
              className={cn(
                "relative flex aspect-square items-center justify-center overflow-visible rounded-lg text-base font-extrabold transition-all",
                palette,
                isCurrent &&
                  "shadow-[0_0_18px_rgba(59,130,246,0.45)] ring-2 ring-info/50 ring-offset-2 ring-offset-[#070605]",
                locked && "cursor-not-allowed opacity-40 grayscale"
              )}
            >
              {/* Centre label — section-relative position, never the
                  chosen letter (the fill colour conveys correctness).
                  R&W tiles label 1-15, Math tiles relabel 1-20. */}
              <span>{sectionIdx + 1}</span>

              {/* Bookmark ribbon — extends down from the top-left
                  corner of the tile, hangs slightly above so it
                  reads as a marker. Pristine white to match the
                  header bookmark control. */}
              {isBookmarked && (
                <span
                  aria-hidden
                  className="absolute -top-1 left-1.5 h-4 w-2.5 bg-surface shadow-[0_2px_6px_rgba(255,255,255,0.25)]"
                  style={{
                    clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 70%, 0 100%)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {swatch}
      <span>{label}</span>
    </div>
  );
}
