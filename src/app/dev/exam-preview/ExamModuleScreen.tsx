"use client";

import { useRef, useState } from "react";
import { Bookmark, BookOpen, LayoutGrid, PencilLine } from "lucide-react";
import type { MappedNode } from "@/components/learn/ConstellationMap";
import { ActiveQuizScreen } from "@/components/learn/quiz/ActiveQuizScreen";
import { AnnotationProvider } from "@/components/learn/quiz/PassageAnnotations";
import {
  HighlightTool,
  QuestionGuide,
  QuestionTransition,
  TimerToggle,
} from "@/components/learn/quiz/QuizTools";
import { QuizMenu } from "@/components/learn/quiz/QuizMenu";
import styles from "@/components/learn/quiz/workspace.module.css";
import Scratchpad from "@/components/learn/Scratchpad";
import { CalculatorScope, CalculatorTrigger } from "@/components/calculator/CalculatorScope";
import { makeQuestionKey } from "@/components/calculator/question-key";
import type { ExamModule } from "./exam-data";
import ReferenceSheet from "./ReferenceSheet";

const noop = () => undefined;

export function sectionName(section: "RW" | "MATH") {
  return section === "MATH" ? "Math" : "Reading and Writing";
}

/** One timed module: the real student quiz screen (ActiveQuizScreen) with the practice tools,
 *  a countdown, mark for review, a question guide and Bluebook's check-your-work page. */
export default function ExamModuleScreen({
  mod,
  moduleKey,
  moduleLabel,
  index,
  reviewing,
  answers,
  marked,
  secondsLeft,
  onAnswer,
  onToggleMark,
  onNavigate,
  onReview,
  onSubmitModule,
}: {
  mod: ExamModule;
  moduleKey: string;
  moduleLabel: string;
  index: number;
  reviewing: boolean;
  answers: Record<string, string>;
  marked: string[];
  secondsLeft: number;
  onAnswer(questionId: string, answer: string): void;
  onToggleMark(questionId: string): void;
  onNavigate(index: number): void;
  onReview(): void;
  onSubmitModule(): void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const item = mod.questions[index];
  const isMath = mod.section === "MATH";
  const isMarked = marked.includes(item.questionId);
  const last = index === mod.questions.length - 1;
  const go = (to: number) => {
    setDirection(to < index ? "previous" : "next");
    onNavigate(to);
  };
  const next = () => (last ? onReview() : go(index + 1));
  const timerColor =
    secondsLeft > 5 * 60
      ? undefined
      : secondsLeft > 60
        ? "rgb(var(--k-warning))"
        : "rgb(var(--k-error))";
  const node = {
    id: moduleKey,
    subject: isMath ? "math" : "reading",
    topic: moduleLabel,
    status: "available",
  } as unknown as MappedNode;
  const questionKey = makeQuestionKey(moduleKey, item.questionId);

  const grid = (onPick: (i: number) => void, current: number | null) => (
    <div className={styles.guideGrid}>
      {mod.questions.map((q, i) => {
        const answered = !!answers[q.questionId]?.trim();
        const flagged = marked.includes(q.questionId);
        return (
          <button
            key={q.questionId}
            type="button"
            aria-current={i === current ? "true" : undefined}
            aria-label={`Question ${q.number}${answered ? ", answered" : ", unanswered"}${flagged ? ", marked for review" : ""}`}
            onClick={() => onPick(i)}
          >
            {q.number}
            {answered ? " ✓" : " ○"}
            {flagged ? " ⚑" : ""}
          </button>
        );
      })}
    </div>
  );

  return (
    <AnnotationProvider key={moduleKey}>
      <div ref={containerRef} className="fixed inset-0 z-[60] overflow-hidden bg-night text-ivory">
        <CalculatorScope
          key={questionKey}
          questionKey={questionKey}
          enabled={isMath && !reviewing}
          open={calculatorOpen}
          onOpenChange={setCalculatorOpen}
        >
          {reviewing ? (
            <div className="absolute inset-0 overflow-y-auto px-6 py-10">
              <div className="mx-auto max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-taupe">
                  {moduleLabel}
                </p>
                <h1 className="mt-2 text-2xl font-bold">Check your work</h1>
                <p className="mt-3 text-sm leading-relaxed text-taupe">
                  Pick a question to go back to it, or submit this module. When the time runs out,
                  the module submits itself.
                </p>
                <div className="mt-4">
                  <TimerToggle seconds={secondsLeft} countdown color={timerColor} />
                </div>
                <div className="mt-6 rounded-xl border border-bronze bg-surface p-5">
                  {grid((i) => go(i), null)}
                  <p className="mt-4 text-xs text-taupe">
                    ✓ Answered · ○ Unanswered · ⚑ Marked for review
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    className={styles.tool}
                    onClick={() => go(mod.questions.length - 1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={onSubmitModule}
                    className="rounded-xl bg-ivory px-8 py-3 text-sm font-bold text-night hover:bg-ivory/90"
                  >
                    Submit module
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <QuestionTransition index={index} direction={direction}>
                <ActiveQuizScreen
                  node={node}
                  q={item.question}
                  onClose={noop}
                  onSelectAnswer={(answer) => onAnswer(item.questionId, answer)}
                  onSubmit={next}
                  onFlagClick={noop}
                  showExplanations={false}
                  onToggleExplanations={noop}
                  onNext={next}
                  stateOverride={{
                    phase: "answering",
                    reviews: {},
                    records: [],
                    targetLength: mod.questions.length,
                    currentIndex: index,
                    selectedAnswer: answers[item.questionId] ?? null,
                  }}
                  menu={
                    <>
                      {item.incomplete && (
                        <span
                          className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning-bright"
                          title={item.issues.join("; ")}
                        >
                          Capture incomplete
                        </span>
                      )}
                      <CalculatorTrigger />
                      {isMath && (
                        <button
                          type="button"
                          className={styles.tool}
                          onClick={() => setReferenceOpen(true)}
                        >
                          <BookOpen size={16} /> Reference
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.tool}
                        onClick={() => setScratchpadOpen((o) => !o)}
                        aria-label="Scratchpad"
                      >
                        <PencilLine size={16} />
                      </button>
                      {!isMath && <HighlightTool />}
                      <TimerToggle seconds={secondsLeft} countdown color={timerColor} />
                      <QuizMenu subject={isMath ? "math" : "reading"} />
                    </>
                  }
                />
              </QuestionTransition>
              <div className="absolute inset-x-0 bottom-0 z-10 flex h-16 items-center justify-between gap-2 border-t border-bronze bg-night px-3">
                <button
                  type="button"
                  className={styles.tool}
                  aria-pressed={isMarked}
                  onClick={() => onToggleMark(item.questionId)}
                >
                  <Bookmark size={16} fill={isMarked ? "currentColor" : "none"} />
                  {isMarked ? "Marked for review" : "Mark for review"}
                </button>
                <button type="button" className={styles.tool} onClick={() => setGuideOpen(true)}>
                  <LayoutGrid size={16} />
                  Question {item.number} of {mod.questions.length}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={styles.tool}
                    disabled={index === 0}
                    onClick={() => go(index - 1)}
                  >
                    Back
                  </button>
                  <button type="button" className={styles.tool} onClick={next}>
                    {last ? "Check your work" : "Next"}
                  </button>
                </div>
              </div>
            </>
          )}
          <Scratchpad
            pageKey={item.question.id}
            open={scratchpadOpen && !reviewing}
            onClose={() => setScratchpadOpen(false)}
            constraintsRef={containerRef}
          />
          {guideOpen && (
            <QuestionGuide onClose={() => setGuideOpen(false)}>
              <p>{moduleLabel}</p>
              {grid((i) => {
                go(i);
                setGuideOpen(false);
              }, index)}
              <p>✓ Answered · ○ Unanswered · ⚑ Marked for review</p>
              <button
                type="button"
                onClick={() => {
                  setGuideOpen(false);
                  onReview();
                }}
              >
                Go to check your work
              </button>
            </QuestionGuide>
          )}
          {referenceOpen && <ReferenceSheet onClose={() => setReferenceOpen(false)} />}
        </CalculatorScope>
      </div>
    </AnnotationProvider>
  );
}
