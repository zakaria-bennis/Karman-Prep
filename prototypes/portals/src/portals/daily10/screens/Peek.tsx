import { useCallback, useRef, useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Icon } from "@/design-system/icons";
import { QUESTIONS } from "@/mock";
import { QuestionBody } from "../../student/QuestionBody";
import { SetStrip, Stopwatch, type CellState } from "../../student/SetStrip";
import { ScratchPad, ToolBar } from "../../student/QuestionTools";
import { ToolIcon } from "../../student/icons";
import { MathText } from "../../student/math";
import { Companion, localRect, type CompanionApi } from "../companion/Companion";
import type { Layout, Rect } from "../companion/engine";
import "../../student/student.css";
import "../daily10.css";

/*
 * The companion engine on a real question frame, with the question chrome a
 * student expects (rule 56): the set strip with right and wrong so far, a
 * timer that hides, highlight, a scratch pad, selectable choices and one
 * Check. The chrome is the student portal's own (read-only imports), so this
 * screen reads as Your Daily 10 and not as a demo. The fox stays tucked away
 * while the student answers, pops out of a fresh edge after Check, reacts to
 * a right answer with a happiness that grows with the streak, meets a miss
 * with a small "oh?" and a kind nod, and ducks away on Next.
 */
const SET = 10;

export default function Peek() {
  const host = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const explain = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const buttons = useRef<HTMLDivElement>(null);
  const api = useRef<CompanionApi>(null);
  const [qi, setQi] = useState(0);
  const [streak, setStreak] = useState(0);
  const [chosen, setChosen] = useState<string | undefined>();
  const [checked, setChecked] = useState<{ correct: boolean; chosen: string } | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [highlighting, setHighlighting] = useState(false);
  const [pad, setPad] = useState(false);
  const q = QUESTIONS[qi % QUESTIONS.length];
  const index = qi % SET;
  const cells: CellState[] = Array.from({ length: SET }, (_, i) =>
    i < results.length ? (results[i] ? "right" : "wrong") : i === index ? "current" : "todo"
  );

  const layout = useCallback((): Layout => {
    const h = host.current;
    if (!h) return { spots: {}, keepOut: [] };
    const r = (el: Element | null) => (el ? localRect(h, el) : null);
    const barR = r(bar.current);
    const topR = r(top.current);
    const chR = r(body.current?.querySelector("[role=radiogroup]") ?? null);
    const spots: Layout["spots"] = {};
    if (barR) {
      spots.bar = { rect: barR, side: "top", at: barR.left + 110 };
      spots.barR = { rect: barR, side: "top", at: barR.right - 170 };
    }
    if (topR) spots.top = { rect: topR, side: "bottom", at: topR.right - 140 };
    if (chR) {
      spots.choice = { rect: chR, side: "right", at: chR.top + 70, reach: 12 };
      spots.choiceL = { rect: chR, side: "left", at: chR.top + 70, reach: 12 };
    }
    const keepOut = [r(body.current), r(explain.current)].filter(Boolean) as Rect[];
    const avoid = [r(buttons.current)].filter(Boolean) as Rect[];
    return { spots, keepOut, avoid };
  }, []);

  const check = () => {
    if (!chosen) return;
    const correct = chosen === q.correct;
    setChecked({ correct, chosen });
    setResults((r) => [...r, correct]);
    if (correct) {
      const n = streak + 1;
      setStreak(n);
      api.current?.correct(n);
    } else {
      setStreak(0);
      api.current?.wrong(explain.current);
    }
  };
  const next = () => {
    setChecked(null);
    setChosen(undefined);
    setHighlighting(false);
    if (index === SET - 1) setResults([]);
    setQi((i) => i + 1);
    api.current?.next();
  };

  return (
    <div ref={host} className="d10 relative flex h-full w-full flex-col overflow-hidden text-text">
      <header
        ref={top}
        className="z-[2] flex min-h-12 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-panel px-4 py-1"
      >
        <h1 className="min-w-0 text-section">Your Daily 10</h1>
        <SetStrip
          cells={cells}
          size="sm"
          label="Today's set"
          // on a phone the strip takes its own line under the title; wider, it sits beside it
          className="order-last min-w-0 basis-full sm:order-none sm:basis-auto"
        />
        <span className="tabular whitespace-nowrap text-dense text-muted">
          {index + 1} of {SET}
        </span>
        <Stopwatch running={!checked} className="ml-auto" />
      </header>
      <main className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        <div className="mx-auto grid max-w-[720px] gap-4">
          <div ref={body}>
            <QuestionBody
              question={q}
              chosen={chosen}
              checked={checked ?? undefined}
              highlighting={highlighting}
              onSelect={setChosen}
            />
          </div>
          {checked ? (
            <div ref={explain} className="grid gap-1 rounded-panel border border-line bg-panel p-4">
              <p
                className={`text-dense font-semibold ${checked.correct ? "text-positive" : "text-negative"}`}
              >
                {checked.correct
                  ? `Correct${streak >= 3 ? `, ${streak} in a row` : ""}`
                  : `Not this time. The answer is ${q.correct}`}
              </p>
              <p className="text-body text-muted">
                <MathText text={q.explanation} />
              </p>
            </div>
          ) : null}
        </div>
      </main>
      <footer
        ref={bar}
        className="z-[2] flex min-h-16 shrink-0 items-center justify-between gap-3 border-t border-line bg-panel px-4 py-2"
      >
        <ToolBar
          tools={[
            {
              id: "highlight",
              label: highlighting ? "Highlighter on" : "Highlighter",
              icon: <ToolIcon name="highlighter" size={24} />,
              on: highlighting,
              onPress: () => setHighlighting((v) => !v),
            },
            {
              id: "pad",
              label: "Scratch pad",
              icon: <ToolIcon name="pad" size={24} />,
              on: pad,
              onPress: () => setPad(true),
            },
          ]}
        />
        <div ref={buttons} className="flex items-center gap-2">
          {checked ? (
            <GlassButton
              size="sm"
              variant="primary"
              icon={<Icon name="chevronRight" size={20} />}
              onClick={next}
            >
              Next
            </GlassButton>
          ) : (
            // the accent lands on Check once there is a choice to check (Von Restorff)
            <GlassButton
              size="sm"
              variant={chosen ? "primary" : "glass"}
              disabled={!chosen}
              onClick={check}
            >
              Check
            </GlassButton>
          )}
        </div>
      </footer>
      <ScratchPad open={pad} onClose={() => setPad(false)} />
      <Companion ref={api} animal="fox" stage="kit" layout={layout} />
    </div>
  );
}
