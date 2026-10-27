"use client";
import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { PenIndex } from "@/lib/quiz/ink/types";
import type { RoutingState } from "@/lib/quiz/ink/routing";
import type { StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import type { QuizMode } from "@/lib/quiz/mode";
import type { TimingAccommodation } from "@/lib/quiz/timer";
import {
  loadWorkspaces,
  saveWorkspaces,
  workspaceReducer,
  type QuestionWorkspace,
  type WorkspaceAction,
} from "@/lib/quiz/workspace";
import { figureLeadsText } from "@/lib/figures/figure-order";
import styles from "./quiz-shell.module.css";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";
import { QuestionArea } from "./QuestionArea";
import { PassageBlock, hasPassage } from "./PassageBlock";
import { FigureSlot } from "./FigureSlot";
import { QuestionContent } from "./QuestionContent";
import { useQuizLayout } from "./use-quiz-layout";
import { useShortcuts } from "./use-shortcuts";
import { PencilContext, type PencilContextValue, type PencilTool } from "./pencil-context";
import { PencilStrip } from "./PencilStrip";
import { AnnotationContext, type AnnotationContextValue } from "./annotation-context";
import { PenIcon } from "./icons";

export type QuizShellProps = {
  mode: QuizMode;
  questions: StudentQuizQuestion[];
  /** Total questions in the section; adaptive sets may know only the first few questions. */
  total?: number;
  attemptKey: string;
  index: number;
  section: string;
  topic?: string;
  onNavigate(index: number): void;
  onSelectAnswer?(questionId: string, answer: string | null): void;
  onSubmit?(questionId: string, answer: string): void | Promise<void>;
  onFinish?(): void;
  onExit?(): void;
  reviews: Record<string, StudentQuizReview>;
  startedAtMs?: number;
  accommodation?: TimingAccommodation;
  hasCalculator?: boolean;
  loading?: boolean;
  /** Saved markers by question id (server state the host loaded). */
  saved?: Record<string, "bookmark" | "tutor_flag">;
  onToggleBookmark?(questionId: string, on: boolean): void;
  onFlagForTutor?(questionId: string, note: string): void;
  slots?: { explanation?: ReactNode };
};

type State = { workspaces: Record<string, QuestionWorkspace> };
type Act = { questionId: string; action: WorkspaceAction } | { load: State["workspaces"] };

function reduce(state: State, act: Act): State {
  if ("load" in act) return { workspaces: act.load };
  return { workspaces: workspaceReducer(state.workspaces, act.questionId, act.action) };
}

export function QuizShell(props: QuizShellProps) {
  const { mode, questions, index, attemptKey } = props;
  const layout = useQuizLayout();
  const [state, dispatch] = useReducer(reduce, { workspaces: {} });
  const [saved, setSaved] = useState(props.saved ?? {});
  const [eliminatorOn, setEliminatorOn] = useState(false);
  const [pencilOn, setPencilOn] = useState(false);
  const [tool, setTool] = useState<PencilTool>("pen");
  const [pen, setPen] = useState<PenIndex>(1);
  const [drawing, setDrawing] = useState(false);
  const [penSeen, setPenSeen] = useState(false);
  const [pickOffer, setPickOffer] = useState<string | null>(null);
  const routing = useRef<RoutingState>({
    pencilOn: false,
    penSeen: false,
    activePenId: null,
    screenReaderTouch: false,
  });
  routing.current = { ...routing.current, pencilOn };
  const lastIndex = useRef(index);
  const direction: 1 | -1 = index >= lastIndex.current ? 1 : -1;
  useEffect(() => {
    lastIndex.current = index;
  }, [index]);
  useEffect(() => dispatch({ load: loadWorkspaces(attemptKey) }), [attemptKey]);
  useEffect(() => saveWorkspaces(attemptKey, state.workspaces), [attemptKey, state.workspaces]);

  const q = questions[index];
  const total = props.total ?? questions.length;
  const review = q ? props.reviews[q.id] : undefined;
  const locked = mode.grading === "locked" || (mode.grading === "instant" && !!review);
  const act = (action: WorkspaceAction) => q && dispatch({ questionId: q.id, action });
  const answerWith = (value: string | null) => {
    if (!q || locked) return;
    act({ type: "answer", value });
    props.onSelectAnswer?.(q.id, value);
  };
  const toggleBookmark = () => {
    if (!q || !mode.canBookmark) return;
    const on = !saved[q.id];
    setSaved(({ [q.id]: _gone, ...rest }) => (on ? { ...rest, [q.id]: "bookmark" } : rest));
    props.onToggleBookmark?.(q.id, on);
  };
  const inkOf = q ? state.workspaces[q.id] : undefined;
  const pencilValue = useMemo<PencilContextValue>(
    () => ({
      pencilOn,
      tool,
      pen,
      routing,
      ink: inkOf?.ink ?? { strokes: [] },
      apply: (op) => q && dispatch({ questionId: q.id, action: { type: "inkOp", op } }),
      offerPick: setPickOffer,
      allowPick: !locked && q?.answer_format === "multiple_choice",
      setDrawing: (d) => {
        setDrawing(d);
        setPenSeen(routing.current.penSeen);
      },
    }),
    [pencilOn, tool, pen, inkOf?.ink, q, locked]
  );
  const highlightSerial = useRef(0);
  const annotations = useMemo<AnnotationContextValue>(
    () => ({
      enabled: !pencilOn,
      highlights: inkOf?.highlights ?? [],
      add: (range, color) => {
        const id = Math.max(highlightSerial.current, Date.now()) + 1;
        highlightSerial.current = id;
        if (q)
          dispatch({
            questionId: q.id,
            action: { type: "addHighlight", highlight: { id, range, color } },
          });
        return id;
      },
      recolor: (id, color) =>
        q && dispatch({ questionId: q.id, action: { type: "recolorHighlight", id, color } }),
      note: (id, note) =>
        q && dispatch({ questionId: q.id, action: { type: "updateNote", id, note } }),
      remove: (id) => q && dispatch({ questionId: q.id, action: { type: "removeHighlight", id } }),
    }),
    [pencilOn, inkOf?.highlights, q]
  );
  useEffect(() => {
    if (!pickOffer) return;
    const t = setTimeout(() => setPickOffer(null), 4000);
    return () => clearTimeout(t);
  }, [pickOffer, inkOf?.ink]);
  useEffect(() => setPickOffer(null), [index]);
  const togglePencil = () => {
    setPencilOn((v) => !v);
    setTool("pen");
  };
  const canNext = !!q && index + 1 < total && (mode.grading !== "instant" || !!review);
  useShortcuts({
    pick: (letter) => {
      if (!q || q.answer_format !== "multiple_choice") return;
      if (!q.answer_choices.some((c) => c.letter === letter)) return;
      if (state.workspaces[q.id]?.crossedOut.includes(letter)) return;
      answerWith(letter);
    },
    mark: () => mode.markForReview && act({ type: "toggleReview", allowed: true }),
    bookmark: toggleBookmark,
    pencil: togglePencil,
    eraser: () => {
      setPencilOn(true);
      setTool("eraser");
    },
    undo: () => act({ type: "undo" }),
    redo: () => act({ type: "redo" }),
    back: () => index > 0 && props.onNavigate(index - 1),
    next: () => canNext && props.onNavigate(index + 1),
  });
  if (props.loading || !q) return <ShellSkeleton layout={layout} />;

  const ws = state.workspaces[q.id];
  const answer = ws?.answer ?? null;
  const last = index + 1 >= total;
  const submitted = !!review;

  const strip = (
    <PencilStrip
      tool={tool}
      pen={pen}
      canUndo={!!ws?.undo.length}
      canRedo={!!ws?.redo.length}
      canClear={!!ws?.ink.strokes.length}
      onTool={setTool}
      onPen={setPen}
      onUndo={() => act({ type: "undo" })}
      onRedo={() => act({ type: "redo" })}
      onClear={() => ws && act({ type: "inkOp", op: { kind: "clear", removed: ws.ink.strokes } })}
    />
  );
  const primary =
    mode.grading === "instant" && !submitted ? (
      <button
        type="button"
        className={styles.primary}
        disabled={!answer}
        onClick={() => answer && props.onSubmit?.(q.id, answer)}
      >
        Submit
      </button>
    ) : (
      <button
        type="button"
        className={styles.primary}
        onClick={() => (last ? props.onFinish?.() : props.onNavigate(index + 1))}
      >
        {last ? "Finish" : "Next"}
      </button>
    );

  return (
    <PencilContext.Provider value={pencilValue}>
      <AnnotationContext.Provider value={annotations}>
        <div
          data-quiz-shell
          data-layout={layout}
          data-drawing={drawing || undefined}
          data-pencil={pencilOn || undefined}
          data-finger-draw={(pencilOn && !penSeen) || undefined}
          className={`${styles.shell} ${styles[layout]}`}
        >
          <div className={styles.barGroup}>
            <TopBar
              section={props.section}
              topic={props.topic ?? q.topic_cluster}
              tools={
                <button
                  type="button"
                  className={styles.tool}
                  aria-label="Pencil"
                  aria-pressed={pencilOn}
                  onClick={togglePencil}
                >
                  <PenIcon state={pencilOn ? "on" : "off"} tip={`var(--quiz-pen-${pen})`} />
                </button>
              }
            />
            {pencilOn && layout !== "compact" && strip}
          </div>
          <QuestionArea
            layout={layout}
            questionKey={q.id}
            direction={direction}
            passage={
              hasPassage(q) ? (
                <>
                  {figureLeadsText(q.subject) && <FigureSlot q={q} calculator={false} />}
                  <PassageBlock q={q} />
                  {!figureLeadsText(q.subject) && <FigureSlot q={q} calculator={false} />}
                </>
              ) : null
            }
            question={
              <QuestionContent
                q={q}
                number={index + 1}
                mode={mode}
                ws={ws}
                review={review}
                bookmarked={!!saved[q.id]}
                flagged={saved[q.id] === "tutor_flag"}
                eliminatorOn={eliminatorOn}
                figureHere={!hasPassage(q)}
                hasCalculator={!!props.hasCalculator}
                onAnswer={answerWith}
                onCross={(letter) => act({ type: "toggleCross", letter })}
                onToggleReview={() => act({ type: "toggleReview", allowed: mode.markForReview })}
                onToggleBookmark={toggleBookmark}
                onFlag={(note) => {
                  setSaved((all) => ({ ...all, [q.id]: "tutor_flag" }));
                  props.onFlagForTutor?.(q.id, note);
                }}
                onToggleEliminator={() => setEliminatorOn((v) => !v)}
                pickOffer={pickOffer}
              />
            }
          />
          <div className={styles.barGroup}>
            {pencilOn && layout === "compact" && strip}
            <BottomBar
              index={index}
              total={total}
              canBack={index > 0}
              onBack={() => props.onNavigate(index - 1)}
              onOpenNavigator={() => undefined}
              primary={primary}
            />
          </div>
        </div>
      </AnnotationContext.Provider>
    </PencilContext.Provider>
  );
}

function ShellSkeleton({ layout }: { layout: string }) {
  return (
    <div
      data-quiz-shell
      data-layout={layout}
      aria-busy="true"
      className={`${styles.shell} ${styles[layout] ?? ""}`}
    >
      <header data-quiz-bar="top" className={`${styles.topBar} ${styles.glass}`}>
        <div className={styles.skeleton} style={{ width: 160, height: 28 }} />
      </header>
      <div className={styles.area}>
        <div className={styles.pane} style={{ position: "absolute", inset: 0 }}>
          <div className={styles.column}>
            {[90, 75, 60, 100, 100, 100, 100].map((w, i) => (
              <div
                key={i}
                className={styles.skeleton}
                style={{ width: `${w}%`, height: i < 3 ? 18 : 52, marginBottom: 14 }}
              />
            ))}
          </div>
        </div>
      </div>
      <footer data-quiz-bar="bottom" className={`${styles.bottomBar} ${styles.glass}`}>
        <div className={styles.skeleton} style={{ width: 96, height: 44 }} />
      </footer>
    </div>
  );
}
