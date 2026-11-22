"use client";
// The tools at the right of the top bar: the calculator's slot, Highlight, Pencil, Reference (Math
// only) and More. One tool at a time (founder, 2026-11-17): the hook below puts the others away
// when one is picked up.
import { rangesFromSelection } from "@/lib/quiz/annotations/ranges";
import type { QuizMode } from "@/lib/quiz/mode";
import type { StudentQuizQuestion } from "@/types/quiz";
import styles from "./quiz-shell.module.css";
import { CALC_SLOT_ID } from "./CalculatorSlot";
import { HighlightIcon, PenIcon, ReferenceIcon } from "./icons";
import { MoreMenu } from "./MoreMenu";
import type { ShellDialog } from "./ShellDialogs";
import { BarButton } from "./TopBar";
import type { useShellState } from "./use-shell-state";

type ShellState = ReturnType<typeof useShellState>;

/** Picking up and putting away the tools, shared by the bar's buttons and the keyboard. */
export function useShellTools({
  s,
  q,
  mode,
  setCalcOpen,
  setDialog,
  setHint,
  setSaveNotice,
  onToggleBookmark,
}: {
  s: ShellState;
  q: StudentQuizQuestion | undefined;
  mode: QuizMode;
  setCalcOpen(open: boolean): void;
  setDialog(update: (d: ShellDialog) => ShellDialog): void;
  setHint(text: string): void;
  setSaveNotice(text: string): void;
  onToggleBookmark?(questionId: string, on: boolean): void | Promise<unknown>;
}) {
  // Highlight: a tool like the pencil (founder, 2026-11-08). Words already selected are
  // highlighted straight away; after that, every selection is highlighted until it's turned off.
  // One tool at a time (founder, 2026-11-17): picking one up puts the others away. The
  // highlighter, the pencil, the reference and the calculator never share the screen.
  const toggleHighlighter = () => {
    if (s.highlighterOn) return s.setHighlighterOn(false);
    setCalcOpen(false);
    s.setHighlighterOn(true);
    const sel = window.getSelection();
    const color = s.annotations.nextColor();
    let added = 0;
    document.querySelectorAll<HTMLElement>("[data-quiz-shell] [data-quiz-pane]").forEach((pane) => {
      for (const r of rangesFromSelection(pane, sel)) {
        s.annotations.add(r, color);
        added++;
      }
    });
    if (added) sel?.removeAllRanges();
    else setHint("Select words to highlight them. Esc puts the highlighter away.");
  };
  const toggleBookmark = () => {
    if (!q || !mode.canBookmark) return;
    const id = q.id;
    // A question flagged for the tutor stays saved; the bookmark cannot remove the flag.
    if (s.saved[id] === "tutor_flag") return;
    const on = !s.saved[id];
    const put = (value: boolean) =>
      s.setSaved(({ [id]: _gone, ...rest }) => (value ? { ...rest, [id]: "bookmark" } : rest));
    put(on);
    Promise.resolve(onToggleBookmark?.(id, on)).catch(() => {
      put(!on);
      setSaveNotice("That did not save. Try again.");
    });
  };
  const togglePencil = () => {
    if (!s.pencilOn) setCalcOpen(false);
    s.setPencilOn(!s.pencilOn);
    s.setTool("pen");
  };
  const openReference = () => {
    setCalcOpen(false);
    s.setPencilOn(false);
    s.setHighlighterOn(false);
    setDialog((d) => (d === "reference" ? null : "reference"));
  };
  return { toggleHighlighter, toggleBookmark, togglePencil, openReference };
}

export function ShellTools({
  s,
  q,
  mode,
  math,
  dialog,
  moreOpen,
  setMoreOpen,
  onShortcuts,
  tools,
  onFlagForTutor,
  onRemoveTutorFlag,
  onReportProblem,
}: {
  s: ShellState;
  q: StudentQuizQuestion;
  mode: QuizMode;
  math: boolean;
  dialog: ShellDialog;
  moreOpen: boolean;
  setMoreOpen(open: boolean): void;
  onShortcuts(): void;
  tools: ReturnType<typeof useShellTools>;
  onFlagForTutor?(questionId: string, note: string): void | Promise<unknown>;
  onRemoveTutorFlag?(questionId: string): void | Promise<unknown>;
  onReportProblem?(questionId: string, note: string): void | Promise<unknown>;
}) {
  return (
    <>
      <span id={CALC_SLOT_ID} className={styles.slot} />
      <BarButton
        icon={<HighlightIcon />}
        word="Highlight"
        aria-pressed={s.highlighterOn}
        active={s.highlighterOn}
        // Keeps the selection: pressing a button would otherwise clear it first.
        onPointerDown={(e) => e.preventDefault()}
        onClick={tools.toggleHighlighter}
      />
      <BarButton
        icon={<PenIcon state={s.pencilOn ? "on" : "off"} tip={`var(--quiz-pen-${s.pen})`} />}
        word="Pencil"
        aria-pressed={s.pencilOn}
        active={s.pencilOn}
        onClick={tools.togglePencil}
      />
      {math && (
        <BarButton
          icon={<ReferenceIcon />}
          word="Reference"
          aria-haspopup="dialog"
          active={dialog === "reference"}
          onClick={tools.openReference}
        />
      )}
      <MoreMenu
        textSize={s.textSize}
        onTextSize={s.setTextSize}
        onShortcuts={onShortcuts}
        onOpenChange={(open) => {
          setMoreOpen(open);
          if (!open) return;
          s.setPencilOn(false);
          s.setHighlighterOn(false);
        }}
        active={moreOpen}
        showSounds={mode.grading === "instant"}
        tutor={
          mode.showTutorFlag && onFlagForTutor
            ? {
                asked: s.saved[q.id] === "tutor_flag",
                onAsk: (note) => {
                  s.setSaved((all) => ({ ...all, [q.id]: "tutor_flag" }));
                  onFlagForTutor?.(q.id, note);
                },
                onRemove: () => {
                  // the flag comes down; the question stays bookmarked
                  s.setSaved((all) => ({ ...all, [q.id]: "bookmark" }));
                  onRemoveTutorFlag?.(q.id);
                },
              }
            : undefined
        }
        onReport={onReportProblem && ((note) => Promise.resolve(onReportProblem(q.id, note)))}
      />
    </>
  );
}
