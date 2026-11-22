"use client";
// The one question screen every quiz uses (spec: docs/superpowers/specs/2026-10-27-quiz-engine-design.md).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { figureLeadsText } from "@/lib/figures/figure-order";
import { sectionStart } from "@/lib/quiz/workspace";
import { showsDots } from "@/lib/quiz/rewards";
import { toOriginal } from "@/lib/quiz/shuffle";
import { track } from "@/lib/analytics/client";
import styles from "./quiz-shell.module.css";
import { AnnotationContext } from "./annotation-context";
import { BottomBar } from "./BottomBar";
import { CalculatorFrame } from "./CalculatorSlot";
import { FigureSlot } from "./FigureSlot";
import { ExitIcon } from "./icons";
import { TEXT_SIZES } from "./MoreMenu";
import { squaresFor } from "./Navigator";
import { PassageBlock, hasPassage } from "./PassageBlock";
import { PencilContext } from "./pencil-context";
import { PencilStrip } from "./PencilStrip";
import { PrimaryAction } from "./PrimaryAction";
import { QuestionArea } from "./QuestionArea";
import { QuestionContent } from "./QuestionContent";
import type { QuizShellProps } from "./quiz-shell-props";
import { CheckPage, ShellDialogs, type ShellDialog } from "./ShellDialogs";
import { ShellSkeleton } from "./ShellSkeleton";
import { ShellTools, useShellTools } from "./ShellTools";
import { Timer } from "./Timer";
import { BarButton, TopBar } from "./TopBar";
import { QuizWorld } from "./QuizWorld";
import { Explanation } from "./Explanation";
import { RunProgress } from "./RunProgress";
import { SecondChance } from "./SecondChance";
import { LevelUpCard } from "./LevelUpCard";
import { useQuizLayout } from "./use-quiz-layout";
import { useShellState } from "./use-shell-state";
import { useShortcuts } from "./use-shortcuts";
import { KEYS_SLOT_ID } from "./NumericEntry";
import { useAnswerRecord } from "./use-answer-record";
import { useSecondChance } from "./use-second-chance";
import { shownWorkspace, useShuffle } from "./use-shuffle";
import { traceMark, useGuard, type GuardEvent } from "./use-guard";
import {
  useBarHeight,
  useCalculatorSounds,
  useRewards,
  useEscape,
  useMissHold,
  useNotice,
} from "./use-shell-effects";

export type { QuizShellProps } from "./quiz-shell-props";

export function QuizShell(props: QuizShellProps) {
  const { mode, index, attemptKey } = props;
  // With a seed the questions are drawn with their choices shuffled, re-lettered by place, and
  // their reviews to match (use-shuffle.ts). What the shell keeps and hands back stays in each
  // question's own letters.
  const { questions, reviews, mapFor } = useShuffle(
    props.shuffleSeed,
    props.questions,
    props.reviews
  );
  const layout = useQuizLayout();
  const q = questions[index];
  const total = props.total ?? questions.length;
  const review = q ? reviews[q.id] : undefined;
  const shuffled = q ? mapFor(q.id) : null;
  const locked = mode.grading === "locked" || (mode.grading === "instant" && !!review);
  const s = useShellState({ attemptKey, q, mode, locked, saved: props.saved });
  const [eliminatorOn, setEliminatorOn] = useState(false);
  const [dialog, setDialog] = useState<ShellDialog>(null);
  const [checking, setChecking] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  // The record of how each question is answered (use-answer-record.ts), for the host to save.
  const working = q ? s.workspaces[q.id] : undefined;
  // the order the choices were shown in, in the question's own letters (a tutor can rebuild it)
  const letters = useMemo(
    () =>
      shuffled
        ? [...shuffled.order]
        : q?.answer_format === "multiple_choice"
          ? q.answer_choices.map((c) => c.letter)
          : [],
    [q, shuffled]
  );
  const noteRecord = useAnswerRecord({
    attemptKey,
    mode: mode.grading,
    enabled: !props.loading && mode.grading !== "locked",
    question: q ? { id: q.id, order: letters } : undefined,
    answer: working?.answer ?? null,
    crossedOut: working?.crossedOut ?? [],
    marked: working?.markedForReview ?? false,
    calculatorOpen: calcOpen,
    answered: mode.grading === "instant" && !!review,
    onSignals: props.onSignals,
  });
  // Keeping the question from being lifted off the screen (use-guard.ts). A preview or a
  // finished question that is only being looked at is not guarded.
  const guarded = !props.loading && mode.grading !== "locked";
  const onGuard = useCallback((event: GuardEvent) => noteRecord({ type: event }), [noteRecord]);
  const masked = useGuard({ enabled: guarded, onEvent: onGuard });
  const mark = useMemo(
    () => (guarded ? traceMark(attemptKey, new Date()) : undefined),
    [guarded, attemptKey]
  );
  // Analytics: which questions were seen (skips and time to first answer, with the answer tables).
  useEffect(() => {
    if (q && !props.loading) track("question_viewed", { questionId: q.id, mode: mode.grading });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id, props.loading]);
  /** Bumped by "?" to open the shortcuts list in the More menu. */
  // The host's server start time wins; otherwise the first start this session (survives reloads).
  // Nothing is recorded while the host is still loading (its attempt key is not real yet).
  const startedAt = useMemo(
    () => (props.loading ? Date.now() : (props.startedAtMs ?? sectionStart(attemptKey))),
    [attemptKey, props.loading, props.startedAtMs]
  );
  // Restored answers (after a reload) are reported to the host once, so it submits what is shown.
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (s.loadedFor !== attemptKey || reported.current === attemptKey) return;
    reported.current = attemptKey;
    for (const [id, ws] of Object.entries(s.workspaces))
      if (ws.answer) props.onSelectAnswer?.(id, ws.answer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.loadedFor, attemptKey]);
  const { header, barH } = useBarHeight();
  useCalculatorSounds();
  const lastIndex = useRef(index);
  const direction: 1 | -1 = index >= lastIndex.current ? 1 : -1;
  useEffect(() => {
    lastIndex.current = index;
    setChecking(false);
  }, [index]);
  // Small wins: folded from the graded answers in order, so a repeated review never counts twice.
  const instant = mode.grading === "instant";
  // A miss graded in front of the student (not one opened again later) holds Next for three
  // seconds while the button fills, a nudge toward the explanation (founder, 2026-11-17). The
  // calculator, if it is open, steps aside so the explanation has the room.
  const qid = q?.id;
  const missed = instant && !!review && !review.isCorrect;
  const holding = useMissHold(qid, !!review, missed, () => setCalcOpen(false));
  useRewards(questions, index, reviews, instant, total);

  /** A pick comes in as the letter shown; it is kept and handed on as the question's own. */
  const answerWith = (value: string | null) => {
    if (!q || locked) return;
    const own = toOriginal(shuffled, value);
    s.act({ type: "answer", value: own });
    props.onSelectAnswer?.(q.id, own);
  };
  const [saveNotice, setSaveNotice] = useNotice(5000);
  const [hint, setHint] = useNotice(3200);
  const chance = useSecondChance({
    q,
    review,
    instant,
    questions,
    rescue: props.rescue,
    rescued: props.rescued,
    onFail: () => setSaveNotice("That did not go through. Try again."),
  });
  const tools = useShellTools({
    s,
    q,
    mode,
    setCalcOpen,
    setDialog,
    setHint,
    setSaveNotice,
    onToggleBookmark: props.onToggleBookmark,
  });
  const { toggleHighlighter, toggleBookmark, togglePencil, openReference } = tools;
  const [moreOpen, setMoreOpen] = useState(false);
  useEscape({
    active: s.pencilOn || s.highlighterOn || calcOpen,
    calculatorOpen: calcOpen,
    blocked: !!dialog,
    putAway: () => {
      s.setPencilOn(false);
      s.setHighlighterOn(false);
      setCalcOpen(false);
    },
    closeCalculator: () => setCalcOpen(false),
  });
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
      if (s.workspaces[q.id]?.crossedOut.includes(toOriginal(shuffled, letter))) return;
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
    highlight: toggleHighlighter,
    calculator: () =>
      document
        .querySelector<HTMLButtonElement>("[data-quiz-shell] [data-calculator-trigger]")
        ?.click(),
    reference: () => q?.subject === "math" && openReference(),
    eliminator: () => setEliminatorOn((v) => !v),
    submit: () => {
      if (!q || checking) return;
      const picked = s.workspaces[q.id]?.answer;
      if (mode.grading === "instant" && !review) return picked && props.onSubmit?.(q.id, picked);
      if (canNext) goNext();
    },
    textSize: (step) => {
      const i = TEXT_SIZES.indexOf(s.textSize as (typeof TEXT_SIZES)[number]);
      const nextSize = TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, Math.max(0, i + step))];
      if (nextSize) s.setTextSize(nextSize);
    },
    help: () => setDialog((d) => (d === "shortcuts" ? null : "shortcuts")),
  });

  if (props.loading || !q) return <ShellSkeleton layout={layout} />;
  const ws = s.ws;
  const answer = ws?.answer ?? null;
  const squares = squaresFor(
    total,
    questions,
    s.workspaces,
    reviews,
    s.saved,
    mode,
    chance.isPutRight
  );
  const math = q.subject === "math";
  // The explanation is never under the answers (founder, 2026-11-17). Once a question is graded
  // it has a page of its own: at the right on a wide screen; on a phone or a tablet it comes up
  // from the bottom and the question draws up into the top half, each scrolling on its own.
  const explained = instant && !!review;
  const missAside = explained;
  // the run of dots (Endless: hearts, a strip of ten that scrolls, and the run's length)
  const progress =
    props.progress ??
    (instant && (props.endless || showsDots(total)) ? (
      <RunProgress
        questions={questions}
        reviews={reviews}
        index={index}
        total={total}
        endless={props.endless}
        putRight={chance.isPutRight}
        onOpen={() => setDialog("nav")}
        onGo={props.onNavigate}
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

  const primary = (
    <PrimaryAction
      checking={checking}
      grading={mode.grading}
      graded={!!review}
      answer={answer}
      holding={holding}
      last={last}
      onSubmitSection={() => props.onFinish?.()}
      onSubmit={(picked) => props.onSubmit?.(q.id, picked)}
      onNext={goNext}
    />
  );

  const content = checking ? (
    <CheckPage
      squares={squares}
      onJump={(i) => {
        setChecking(false);
        props.onNavigate(i);
      }}
    />
  ) : null;

  return (
    <PencilContext.Provider value={s.pencil}>
      <AnnotationContext.Provider value={s.annotations}>
        <div
          data-quiz-shell
          data-layout={layout}
          data-drawing={s.drawing || undefined}
          data-pencil={s.pencilOn || undefined}
          data-highlighter={s.highlighterOn || undefined}
          data-masked={masked || undefined}
          data-calc={calcOpen || undefined}
          data-no-world={props.noWorld || undefined}
          data-finger-draw={(s.pencilOn && !s.penSeen) || undefined}
          className={`${styles.shell} ${styles[layout]}`}
          style={
            {
              "--quiz-text-scale": s.textSize / 100,
              "--quiz-bar-h": `${barH}px`,
            } as React.CSSProperties
          }
        >
          {!props.noWorld && <QuizWorld />}
          {mark && (
            <div className={styles.trace} style={{ backgroundImage: mark }} aria-hidden="true" />
          )}
          {/* the bars and the question: a docked calculator moves all of it over as one card */}
          <div className={styles.stage} data-calculator-dock-shift="">
            <div ref={header} className={styles.barGroup}>
              <TopBar
                section={props.section}
                topic={props.topic}
                exit={
                  props.onExit && (
                    <BarButton
                      icon={<ExitIcon size={18} />}
                      word="Exit"
                      flow="row"
                      className={styles.exit}
                      onClick={exit}
                    />
                  )
                }
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
                  <ShellTools
                    s={s}
                    q={q}
                    mode={mode}
                    math={math}
                    dialog={dialog}
                    moreOpen={moreOpen}
                    setMoreOpen={setMoreOpen}
                    onShortcuts={() => setDialog("shortcuts")}
                    tools={tools}
                    onFlagForTutor={props.onFlagForTutor}
                    onRemoveTutorFlag={props.onRemoveTutorFlag}
                    onReportProblem={props.onReportProblem}
                  />
                }
              />
              {s.pencilOn && layout !== "compact" && strip}
            </div>
            <div className={styles.body}>
              {content ?? (
                <QuestionArea
                  layout={layout}
                  questionKey={q.id}
                  direction={direction}
                  aside={
                    missAside && review ? (
                      <Explanation
                        q={q}
                        review={review}
                        action={
                          <SecondChance
                            state={chance.state}
                            left={chance.left}
                            onUse={chance.use}
                          />
                        }
                      />
                    ) : null
                  }
                  wrap={(c) => (
                    <CalculatorFrame
                      enabled={!!props.hasCalculator && math && mode.grading !== "locked"}
                      attemptKey={attemptKey}
                      questionId={q.id}
                      open={calcOpen}
                      onOpenChange={(open) => {
                        setCalcOpen(open);
                        if (open) {
                          // the calculator has the screen: nothing else is in hand
                          s.setPencilOn(false);
                          s.setHighlighterOn(false);
                          setDialog((d) => (d === "reference" ? null : d));
                        }
                        if (open) track("calculator_opened", q ? { questionId: q.id } : {});
                      }}
                      dockTop={12}
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
                        ws={shownWorkspace(ws, shuffled)}
                        review={review}
                        generated={props.generated?.[q.id] === true}
                        bookmarked={!!s.saved[q.id]}
                        eliminatorOn={eliminatorOn}
                        figureHere={!hasPassage(q)}
                        hasCalculator={!!props.hasCalculator}
                        pickOffer={s.pickOffer}
                        explanationAside={explained}
                        onAnswer={answerWith}
                        onCross={(letter) =>
                          s.act({ type: "toggleCross", letter: toOriginal(shuffled, letter) })
                        }
                        onToggleReview={() =>
                          s.act({ type: "toggleReview", allowed: mode.markForReview })
                        }
                        onToggleBookmark={toggleBookmark}
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
                {hint && (
                  <p role="status" className={styles.saveNotice} data-tone="hint">
                    {hint}
                  </p>
                )}
                {saveNotice && (
                  <p role="alert" className={styles.saveNotice}>
                    {saveNotice}
                  </p>
                )}
                {s.pencilOn && layout === "compact" && strip}
                {/* a phone's keys for a typed answer are put here, low on the screen */}
                <div id={KEYS_SLOT_ID} className={styles.keysSlot} />
                {instant && review && !checking && (
                  // Nothing is shown about an answer but the answer itself (founder, 2026-11-17:
                  // no updates during a quiz). A screen reader is still told.
                  <p key={q.id} role="status" aria-label="Answer result" className={styles.srOnly}>
                    {review.isCorrect ? "Correct." : "Not quite."}
                  </p>
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
          </div>

          <ShellDialogs
            dialog={dialog}
            compact={layout === "compact"}
            section={props.section}
            squares={squares}
            index={index}
            markForReview={mode.markForReview}
            math={math}
            onClose={() => setDialog(null)}
            onJump={(i) => {
              setDialog(null);
              props.onNavigate(i);
            }}
            onLeave={() => props.onExit?.()}
          />
        </div>
      </AnnotationContext.Provider>
    </PencilContext.Provider>
  );
}
