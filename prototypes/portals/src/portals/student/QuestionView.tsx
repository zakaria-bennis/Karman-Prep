import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/design-system/cn";
import { Panel } from "@/design-system/glass/Panel";
import { useCountdown } from "@/design-system/components/Timer";
import { useMediaQuery } from "@/design-system/components/hooks";
import type { DemoQuestion } from "@/mock";
import { StudentShell, TextLink } from "./Shell";
import { SetStrip, Stopwatch, Countdown } from "./SetStrip";
import { QuestionBody } from "./QuestionBody";
import { JumpSheet } from "./JumpSheet";
import { PrimaryButton } from "./PrimaryButton";
import { ScratchPad, CalculatorPanel, HelpSheet, ToolBar } from "./QuestionTools";
import { MathText } from "./math";
import { Icon } from "@/design-system/icons";
import { ToolIcon } from "./icons";
import { useSetSession, type Answered, type SetResult } from "./session";
import { readPref, type StudentScreen } from "./nav";
import type { AnswerMode } from "./telemetry";

/*
 * The question screen every mode shares: the set strip with right and wrong,
 * a timer that hides, highlight, scratch pad, the calculator on math, help and
 * the explanation. The one highlighted action sits bottom right, within thumb
 * reach (Fitts); the tools sit beside it; everything else is a text link. The
 * bar wraps under 400px so the primary is always whole. In an endless session
 * the Back control ends the session (its results follow); on phones a test
 * module's strip is compact and jumping lives in the "Go to question" sheet.
 */
export type Clock =
  | { kind: "elapsed" }
  | { kind: "perQuestion"; secondsFor(q: DemoQuestion): number }
  | { kind: "module"; seconds: number };

export interface QuestionViewProps {
  screen: StudentScreen;
  title: string;
  mode: AnswerMode;
  questions: DemoQuestion[];
  nextQuestion?(answered: Answered[]): DemoQuestion | null;
  clock: Clock;
  tutor: string | null;
  onFinish(result: SetResult): void;
  onExit(): void;
  /** Endless: the session can end whenever the student says so. */
  endable?: boolean;
  /** A test module: no feedback until the module ends, free movement, flags. */
  module?: { number: number; section: string; route?: "harder" | "easier"; length: number };
  /** A line under the strip; a function is read again on every question. */
  intro?: ReactNode | (() => ReactNode);
}

export function QuestionView(p: QuestionViewProps) {
  const deferred = Boolean(p.module);
  const timed = p.clock.kind !== "elapsed";
  const s = useSetSession({
    mode: p.mode,
    timed,
    questions: p.questions,
    nextQuestion: p.nextQuestion,
    module: p.module?.number,
    route: p.module?.route,
    deferred,
  });
  const [tool, setTool] = useState<"pad" | "calc" | "help" | "jump" | null>(null);
  const phone = useMediaQuery("(max-width: 639px)");
  const [highlighting, setHighlighting] = useState(false);
  const [explained, setExplained] = useState(false);
  const [left, setLeft] = useState(0);
  const finished = useRef(false);
  const hiddenTimer = readPref("karman-timer", ["shown", "hidden"], "shown") === "hidden";
  const q = s.current;
  const last = p.module
    ? s.index === p.module.length - 1
    : !p.nextQuestion && s.index === s.list.length - 1;

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    p.onFinish(s.finish());
  };
  const anyAnswered = s.answeredCount > 0;
  // Endless and the trials: Back ends the session once something was answered; nothing is lost.
  const back = p.endable && anyAnswered ? finish : p.onExit;
  const moduleLeft = useCountdown(
    p.clock.kind === "module" ? p.clock.seconds : 0,
    p.clock.kind === "module",
    p.clock.kind === "module" ? finish : undefined
  );
  useEffect(() => {
    if (p.clock.kind !== "perQuestion" || !q) return;
    setLeft(p.clock.secondsFor(q));
    const t = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.index, p.clock.kind]);
  useEffect(() => setExplained(false), [s.index]);

  if (!q)
    return (
      <StudentShell screen={p.screen} title={p.title} back={p.onExit} bar={false}>
        <Panel className="p-4 text-body text-muted">That is every question in this demo set.</Panel>
      </StudentShell>
    );

  const advance = () => {
    if (deferred) {
      if (last) finish();
      else s.next();
      return;
    }
    if (last || !s.next()) finish();
  };
  const primary = deferred
    ? last
      ? { label: "Finish module", onClick: finish }
      : { label: "Next", onClick: advance }
    : s.answered
      ? { label: last ? "Finish" : "Next question", onClick: advance }
      : { label: "Check answer", onClick: s.check, disabled: !s.chosen };

  const timer =
    p.clock.kind === "elapsed" ? (
      <Stopwatch hiddenByDefault={hiddenTimer} />
    ) : p.clock.kind === "perQuestion" ? (
      <Countdown left={left} hiddenByDefault={hiddenTimer} />
    ) : (
      <Countdown left={moduleLeft} hiddenByDefault={hiddenTimer} />
    );
  const count = p.module ? p.module.length : p.nextQuestion ? s.list.length : s.list.length;
  const cells = p.module
    ? Array.from({ length: p.module.length }, (_, i) => s.cells[i] ?? "todo")
    : s.cells;

  return (
    <StudentShell screen={p.screen} title={p.title} back={back} action={timer} wide bar={false}>
      <div className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-[1120px] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-dense text-muted">
              {p.module ? `${p.module.section}, module ${p.module.number} of 2` : q.section}
              <span className="text-text"> {p.module ? "" : q.skill}</span>
            </p>
            {p.module && phone ? (
              <button
                type="button"
                onClick={() => setTool("jump")}
                aria-label={`Question ${s.index + 1} of ${count}, go to question`}
                className="-mr-2 inline-flex min-h-tap items-center gap-1 rounded-control px-2 text-dense font-semibold text-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
              >
                <span className="tabular">
                  {s.index + 1} of {count}
                </span>
                <Icon name="chevronRight" size={20} />
              </button>
            ) : (
              <p className="tabular text-dense text-muted">
                {s.index + 1} of {count}
              </p>
            )}
          </div>
          <SetStrip
            cells={cells}
            className="mt-2"
            onPick={p.module && !phone ? (i) => s.go(i) : undefined}
            size={count > 12 ? "sm" : "md"}
          />
          {typeof p.intro === "function" ? p.intro() : p.intro}
        </div>
        <div className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-32 pt-4 sm:px-6 lg:px-8">
          <Panel className="p-4 sm:p-6">
            <QuestionBody
              key={q.id + s.index}
              question={q}
              chosen={s.chosen}
              checked={
                s.answered ? { correct: s.answered.correct, chosen: s.answered.chosen } : undefined
              }
              highlighting={highlighting}
              onSelect={s.select}
            />
            {s.answered ? (
              <div className="mt-5 grid gap-3 border-t border-line pt-4">
                <p
                  className={cn(
                    "text-body font-semibold",
                    s.answered.correct ? "text-positive" : "text-negative"
                  )}
                >
                  {s.answered.correct ? "Right." : `Not this one. The answer is ${q.correct}.`}
                </p>
                {explained ? (
                  <p className="text-body text-muted">
                    <MathText text={q.explanation} />
                  </p>
                ) : (
                  <TextLink
                    onClick={() => {
                      setExplained(true);
                      s.markExplanation();
                    }}
                  >
                    Show the explanation
                  </TextLink>
                )}
              </div>
            ) : null}
          </Panel>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-sticky border-t border-line bg-panel px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-x-3 gap-y-2">
            <ToolBar
              tools={[
                {
                  id: "highlight",
                  label: "Highlight",
                  icon: <ToolIcon name="highlighter" />,
                  on: highlighting,
                  onPress: () => setHighlighting((v) => !v),
                  hidden: !q.passage,
                },
                {
                  id: "pad",
                  label: "Scratch pad",
                  icon: <ToolIcon name="pad" />,
                  onPress: () => setTool("pad"),
                },
                {
                  id: "calculator",
                  label: "Calculator",
                  icon: <ToolIcon name="calculator" />,
                  onPress: () => {
                    s.markCalc();
                    setTool("calc");
                  },
                  hidden: q.section !== "Math",
                },
                {
                  id: "flag",
                  label: s.flagged ? "Unmark for review" : "Mark for review",
                  icon: <ToolIcon name="flag" />,
                  on: s.flagged,
                  onPress: s.toggleFlag,
                  hidden: !deferred,
                },
                {
                  id: "help",
                  label: "Help",
                  icon: <Icon name="help" size={20} />,
                  onPress: () => {
                    s.markHelp();
                    setTool("help");
                  },
                  hidden: deferred,
                },
              ]}
            />
            <span className="flex-1" />
            <div className="ml-auto flex items-center gap-3">
              {deferred && s.index > 0 ? <TextLink onClick={s.prev}>Previous</TextLink> : null}
              {deferred && !last && !phone ? (
                <TextLink onClick={finish}>Finish module</TextLink>
              ) : null}
              <PrimaryButton
                onClick={primary.onClick}
                disabled={"disabled" in primary && primary.disabled}
              >
                {primary.label}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
      <ScratchPad open={tool === "pad"} onClose={() => setTool(null)} />
      {p.module ? (
        <JumpSheet
          open={tool === "jump"}
          onClose={() => setTool(null)}
          cells={cells}
          onPick={s.go}
          onFinish={finish}
          last={last}
        />
      ) : null}
      <CalculatorPanel open={tool === "calc"} onClose={() => setTool(null)} />
      <HelpSheet
        open={tool === "help"}
        onClose={() => setTool(null)}
        skill={q.skill}
        section={q.section}
        tutor={p.tutor}
      />
    </StudentShell>
  );
}
