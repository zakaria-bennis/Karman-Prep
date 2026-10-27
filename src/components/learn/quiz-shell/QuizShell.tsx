"use client";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
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
    back: () => index > 0 && props.onNavigate(index - 1),
    next: () => canNext && props.onNavigate(index + 1),
  });
  if (props.loading || !q) return <ShellSkeleton layout={layout} />;

  const ws = state.workspaces[q.id];
  const answer = ws?.answer ?? null;
  const last = index + 1 >= total;
  const submitted = !!review;

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
    <div data-quiz-shell data-layout={layout} className={`${styles.shell} ${styles[layout]}`}>
      <TopBar section={props.section} topic={props.topic ?? q.topic_cluster} />
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
          />
        }
      />
      <BottomBar
        index={index}
        total={total}
        canBack={index > 0}
        onBack={() => props.onNavigate(index - 1)}
        onOpenNavigator={() => undefined}
        primary={primary}
      />
    </div>
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
