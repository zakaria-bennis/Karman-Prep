"use client";
import { useEffect, useReducer, useRef, type ReactNode } from "react";
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
import MathText from "../MathText";
import styles from "./quiz-shell.module.css";
import { TopBar } from "./TopBar";
import { BottomBar } from "./BottomBar";
import { QuestionArea } from "./QuestionArea";
import { PassageBlock, hasPassage } from "./PassageBlock";
import { useQuizLayout } from "./use-quiz-layout";

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
  const lastIndex = useRef(index);
  const direction: 1 | -1 = index >= lastIndex.current ? 1 : -1;
  useEffect(() => {
    lastIndex.current = index;
  }, [index]);
  useEffect(() => dispatch({ load: loadWorkspaces(attemptKey) }), [attemptKey]);
  useEffect(() => saveWorkspaces(attemptKey, state.workspaces), [attemptKey, state.workspaces]);

  const q = questions[index];
  const total = props.total ?? questions.length;
  if (props.loading || !q) return <ShellSkeleton layout={layout} />;

  const ws = state.workspaces[q.id];
  const review = props.reviews[q.id];
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
        passage={hasPassage(q) ? <PassageBlock q={q} /> : null}
        question={
          <h2 data-ink-block="stem" className={styles.stem}>
            <MathText text={q.question_text} serializedFunctionLines={q.subject === "math"} />
          </h2>
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
