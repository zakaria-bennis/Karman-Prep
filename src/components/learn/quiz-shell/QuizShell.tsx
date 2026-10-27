"use client";
// The one question screen every quiz uses (spec: docs/superpowers/specs/2026-10-27-quiz-engine-design.md).
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { figureLeadsText } from "@/lib/figures/figure-order";
import { sectionStart } from "@/lib/quiz/workspace";
import type { QuizMode } from "@/lib/quiz/mode";
import type { TimingAccommodation } from "@/lib/quiz/timer";
import type { ConfidenceBand, StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import {
  initialRewards,
  rewardFor,
  rewardReducer,
  showsDots,
  type DotState,
} from "@/lib/quiz/rewards";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import styles from "./quiz-shell.module.css";
import nav from "./nav.module.css";
import { AnnotationContext } from "./annotation-context";
import { BottomBar } from "./BottomBar";
import { CALC_SLOT_ID, CalculatorFrame } from "./CalculatorSlot";
import { FigureSlot } from "./FigureSlot";
import { PenIcon, ReferenceIcon } from "./icons";
import { MoreMenu } from "./MoreMenu";
import { NavigatorDialog, NavigatorGrid, squaresFor } from "./Navigator";
import { PassageBlock, hasPassage } from "./PassageBlock";
import { PencilContext } from "./pencil-context";
import { PencilStrip } from "./PencilStrip";
import { QuestionArea } from "./QuestionArea";
import { QuestionContent } from "./QuestionContent";
import { ReferenceSheet } from "./ReferenceSheet";
import { Timer } from "./Timer";
import { TopBar } from "./TopBar";
import { FeedbackBar, ProgressDots } from "./Rewards";
import { LevelUpCard } from "./LevelUpCard";
import { DRAWING_NAMES } from "./drawings";
import { useQuizLayout } from "./use-quiz-layout";
import { useShellState } from "./use-shell-state";
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
  /** "time" when a countdown ran out and the section submitted itself. */
  onFinish?(reason?: "time"): void;
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
  onReportProblem?(questionId: string, note: string): void;
  /** Extra content under the question (instant-mode rewards plug in here). */
  feedback?: ReactNode;
  /** The host draws its own clock (Time Trial); the shell shows none and never expires. */
  hideClock?: boolean;
  /** Replaces the counter in the bottom bar. */
  progress?: ReactNode;
  /** A completed skill set moved the skill's band (skill practice only). */
  levelUp?: { skill: string; before: ConfidenceBand | null; after: ConfidenceBand } | null;
  onLevelUpDone?(): void;
};

function seedOf(text: string): number {
  let h = 0;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function QuizShell(props: QuizShellProps) {
  const { mode, questions, index, attemptKey } = props;
  const layout = useQuizLayout();
  const q = questions[index];
  const total = props.total ?? questions.length;
  const review = q ? props.reviews[q.id] : undefined;
  const locked = mode.grading === "locked" || (mode.grading === "instant" && !!review);
  const s = useShellState({ attemptKey, q, mode, locked, saved: props.saved });
  const [eliminatorOn, setEliminatorOn] = useState(false);
  const [dialog, setDialog] = useState<"nav" | "reference" | "exit" | null>(null);
  const [checking, setChecking] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  // The host's server start time wins; otherwise the first start this session (survives reloads).
  const [startedAt] = useState(() => props.startedAtMs ?? sectionStart(attemptKey));
  const header = useRef<HTMLDivElement>(null);
  const [dockTop, setDockTop] = useState(64);
  const lastIndex = useRef(index);
  const direction: 1 | -1 = index >= lastIndex.current ? 1 : -1;
  useEffect(() => {
    lastIndex.current = index;
    setChecking(false);
  }, [index]);
  // Small wins: folded from the graded answers in order, so a repeated review never counts twice.
  const instant = mode.grading === "instant";
  const rewards = questions.slice(0, index + 1).reduce((state, item, i) => {
    const r = props.reviews[item.id];
    return r && instant
      ? rewardReducer(state, {
          kind: "graded",
          key: item.id,
          index: i,
          correct: r.isCorrect,
          points: r.points ?? 0,
        })
      : state;
  }, initialRewards(total));
  const played = useRef(new Set<string>());
  useEffect(() => {
    if (!instant || !q || !review || played.current.has(q.id)) return;
    played.current.add(q.id);
    if (review.isCorrect)
      playRewardSound(rewardFor(rewards).tier === "streak5" ? "correctStreak" : "correct");
  }, [instant, q, review, rewards]);
  useLayoutEffect(() => {
    if (header.current) setDockTop(Math.round(header.current.getBoundingClientRect().bottom) + 8);
  }, [layout, s.pencilOn]);

  const answerWith = (value: string | null) => {
    if (!q || locked) return;
    s.act({ type: "answer", value });
    props.onSelectAnswer?.(q.id, value);
  };
  const toggleBookmark = () => {
    if (!q || !mode.canBookmark) return;
    const on = !s.saved[q.id];
    s.setSaved(({ [q.id]: _gone, ...rest }) => (on ? { ...rest, [q.id]: "bookmark" } : rest));
    props.onToggleBookmark?.(q.id, on);
  };
  const togglePencil = () => {
    s.setPencilOn(!s.pencilOn);
    s.setTool("pen");
  };
  const last = index + 1 >= total;
  const goNext = () => {
    if (!last) return props.onNavigate(index + 1);
    if (mode.grading === "end") return setChecking(true);
    props.onFinish?.();
  };
  const canNext = !!q && (mode.grading !== "instant" || !!review);
  const exit = () => (mode.grading === "end" ? setDialog("exit") : props.onExit?.());

  useShortcuts({
    pick: (letter) => {
      if (!q || q.answer_format !== "multiple_choice" || checking) return;
      if (!q.answer_choices.some((c) => c.letter === letter)) return;
      if (s.workspaces[q.id]?.crossedOut.includes(letter)) return;
      answerWith(letter);
    },
    mark: () => mode.markForReview && s.act({ type: "toggleReview", allowed: true }),
    bookmark: toggleBookmark,
    pencil: togglePencil,
    eraser: () => {
      s.setPencilOn(true);
      s.setTool("eraser");
    },
    undo: () => s.act({ type: "undo" }),
    redo: () => s.act({ type: "redo" }),
    back: () => (checking ? setChecking(false) : index > 0 && props.onNavigate(index - 1)),
    next: () => canNext && !checking && goNext(),
  });

  if (props.loading || !q) return <ShellSkeleton layout={layout} />;
  const ws = s.ws;
  const answer = ws?.answer ?? null;
  const squares = squaresFor(total, questions, s.workspaces, props.reviews, s.saved, mode);
  const math = q.subject === "math";
  const dots: DotState[] = Array.from({ length: total }, (_, i) => {
    const item = questions[i];
    const r = item ? props.reviews[item.id] : undefined;
    if (r) return r.isCorrect ? "correct" : "wrong";
    if (i === index) return "current";
    return item ? "open" : "locked";
  });
  const reward = rewardFor(rewards);
  const drawing = DRAWING_NAMES[(seedOf(attemptKey) + index * 3) % DRAWING_NAMES.length];
  const progress =
    props.progress ??
    (instant && showsDots(total) ? (
      <ProgressDots
        states={dots}
        label={`Question ${index + 1} of ${total}`}
        onOpen={() => setDialog("nav")}
      />
    ) : undefined);

  const strip = (
    <PencilStrip
      tool={s.tool}
      pen={s.pen}
      canUndo={!!ws?.undo.length}
      canRedo={!!ws?.redo.length}
      canClear={!!ws?.ink.strokes.length}
      onTool={s.setTool}
      onPen={s.setPen}
      onUndo={() => s.act({ type: "undo" })}
      onRedo={() => s.act({ type: "redo" })}
      onClear={() => ws && s.act({ type: "inkOp", op: { kind: "clear", removed: ws.ink.strokes } })}
    />
  );

  const primary = checking ? (
    <button type="button" className={styles.primary} onClick={() => props.onFinish?.()}>
      Submit section
    </button>
  ) : mode.grading === "instant" && !review ? (
    <button
      type="button"
      className={styles.primary}
      disabled={!answer}
      onClick={() => answer && props.onSubmit?.(q.id, answer)}
    >
      Submit
    </button>
  ) : (
    <button type="button" className={styles.primary} onClick={goNext}>
      {last ? (mode.grading === "end" ? "Review" : "Finish") : "Next"}
    </button>
  );

  const content = checking ? (
    <div className={nav.check}>
      <h2 className={nav.checkTitle}>Check your work</h2>
      <p>Go back to any question before you submit this section.</p>
      <NavigatorGrid
        squares={squares}
        current={-1}
        checkPage
        onJump={(i) => {
          setChecking(false);
          props.onNavigate(i);
        }}
      />
    </div>
  ) : null;

  return (
    <PencilContext.Provider value={s.pencil}>
      <AnnotationContext.Provider value={s.annotations}>
        <div
          data-quiz-shell
          data-layout={layout}
          data-drawing={s.drawing || undefined}
          data-pencil={s.pencilOn || undefined}
          data-finger-draw={(s.pencilOn && !s.penSeen) || undefined}
          className={`${styles.shell} ${styles[layout]}`}
          style={{ "--quiz-text-scale": s.textSize / 100 } as React.CSSProperties}
        >
          <div ref={header} className={styles.barGroup}>
            <TopBar
              section={props.section}
              topic={props.topic ?? q.topic_cluster}
              centre={
                mode.clock.kind !== "none" &&
                !props.hideClock && (
                  <Timer
                    clock={mode.clock}
                    startedAtMs={startedAt}
                    accommodation={props.accommodation}
                    onExpire={() => props.onFinish?.("time")}
                  />
                )
              }
              tools={
                <>
                  <span id={CALC_SLOT_ID} className={styles.slot} />
                  {math && (
                    <button
                      type="button"
                      className={styles.tool}
                      aria-label="Reference"
                      aria-haspopup="dialog"
                      onClick={() => setDialog("reference")}
                    >
                      <ReferenceIcon />
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.tool}
                    aria-label="Pencil"
                    aria-pressed={s.pencilOn}
                    onClick={togglePencil}
                  >
                    <PenIcon state={s.pencilOn ? "on" : "off"} tip={`var(--quiz-pen-${s.pen})`} />
                  </button>
                  <MoreMenu
                    textSize={s.textSize}
                    onTextSize={s.setTextSize}
                    showSounds={mode.grading === "instant"}
                    onReport={
                      props.onReportProblem && ((note) => props.onReportProblem!(q.id, note))
                    }
                    onExit={props.onExit && exit}
                  />
                </>
              }
            />
            {s.pencilOn && layout !== "compact" && strip}
          </div>
          <div className={styles.body} data-calculator-dock-shift="">
            {content ?? (
              <QuestionArea
                layout={layout}
                questionKey={q.id}
                direction={direction}
                wrap={(c) => (
                  <CalculatorFrame
                    enabled={!!props.hasCalculator && math && mode.grading !== "locked"}
                    attemptKey={attemptKey}
                    questionId={q.id}
                    open={calcOpen}
                    onOpenChange={setCalcOpen}
                    dockTop={dockTop}
                  >
                    {c}
                  </CalculatorFrame>
                )}
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
                  <>
                    <QuestionContent
                      q={q}
                      number={index + 1}
                      mode={mode}
                      ws={ws}
                      review={review}
                      bookmarked={!!s.saved[q.id]}
                      flagged={s.saved[q.id] === "tutor_flag"}
                      eliminatorOn={eliminatorOn}
                      figureHere={!hasPassage(q)}
                      hasCalculator={!!props.hasCalculator}
                      pickOffer={s.pickOffer}
                      onAnswer={answerWith}
                      onCross={(letter) => s.act({ type: "toggleCross", letter })}
                      onToggleReview={() =>
                        s.act({ type: "toggleReview", allowed: mode.markForReview })
                      }
                      onToggleBookmark={toggleBookmark}
                      onFlag={(note) => {
                        s.setSaved((all) => ({ ...all, [q.id]: "tutor_flag" }));
                        props.onFlagForTutor?.(q.id, note);
                      }}
                      onToggleEliminator={() => setEliminatorOn((v) => !v)}
                    />
                    {props.feedback}
                  </>
                }
              />
            )}
            <div className={styles.barGroup}>
              {props.levelUp && (
                <LevelUpCard
                  skill={props.levelUp.skill}
                  before={props.levelUp.before}
                  after={props.levelUp.after}
                  onDone={() => props.onLevelUpDone?.()}
                />
              )}
              {s.pencilOn && layout === "compact" && strip}
              {instant && review && !checking && (
                <FeedbackBar
                  key={q.id}
                  correct={review.isCorrect}
                  points={review.points ?? 0}
                  streak={rewards.streak}
                  showStreak={reward.showStreak}
                  drawing={drawing}
                />
              )}
              <BottomBar
                index={index}
                total={total}
                canBack={checking || index > 0}
                onBack={() => (checking ? setChecking(false) : props.onNavigate(index - 1))}
                onOpenNavigator={() => setDialog("nav")}
                centre={
                  checking ? <span className={styles.counter}>Check your work</span> : progress
                }
                primary={primary}
              />
            </div>
          </div>
          {dialog === "nav" && (
            <NavigatorDialog
              compact={layout === "compact"}
              title={props.section}
              onClose={() => setDialog(null)}
            >
              <NavigatorGrid
                squares={squares}
                current={index}
                onJump={(i) => {
                  setDialog(null);
                  props.onNavigate(i);
                }}
              />
              <div className={nav.legend}>
                <span>Solid: answered</span>
                <span>Dashed: unanswered</span>
                {mode.markForReview && <span>Tag: marked for review</span>}
              </div>
            </NavigatorDialog>
          )}
          {dialog === "reference" && (
            <NavigatorDialog
              compact={layout === "compact"}
              title="Reference"
              onClose={() => setDialog(null)}
            >
              <ReferenceSheet />
            </NavigatorDialog>
          )}
          {dialog === "exit" && (
            <NavigatorDialog
              compact={layout === "compact"}
              title="Leave this section?"
              onClose={() => setDialog(null)}
            >
              <p>The timer keeps running while you are away.</p>
              <div className={nav.checkActions}>
                <button type="button" className={styles.tool} onClick={() => setDialog(null)}>
                  Stay
                </button>
                <button type="button" className={styles.tool} onClick={() => props.onExit?.()}>
                  Leave
                </button>
              </div>
            </NavigatorDialog>
          )}
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
      <div className={styles.body}>
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
    </div>
  );
}
