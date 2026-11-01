import { useCallback, useMemo, useRef, useState } from "react";
import type { DemoQuestion } from "@/mock";
import type { CellState } from "./SetStrip";
import { recordAnswer, versionOf, type AnswerMode } from "./telemetry";

/**
 * One set's state: the questions, the choice on each, what was checked, the
 * flags, and the usage of help, the calculator and the explanation per
 * question, so every answer records the telemetry fields when it is committed.
 * A sequential set (Your Daily 10, a practice set, the diagnostic) checks each
 * answer at once; a test module commits every answer when the module ends; an
 * endless session asks `nextQuestion` for the question after the last one.
 */
export interface Answered {
  questionId: string;
  skill: string;
  chosen: string;
  correct: boolean;
  timeMs: number;
  changed: number;
  helpUsed: boolean;
  calculatorUsed: boolean;
  explanationUsed: boolean;
}
export interface SetResult {
  answers: Answered[];
  right: number;
  total: number;
  seconds: number;
  tokens: number;
}
interface Usage {
  help: boolean;
  calc: boolean;
  expl: boolean;
  changed: number;
  started: number;
  spent: number;
}
const fresh = (): Usage => ({
  help: false,
  calc: false,
  expl: false,
  changed: 0,
  started: performance.now(),
  spent: 0,
});

export const tokensFor = (correct: boolean, difficulty: number) =>
  correct ? (difficulty >= 3 ? 15 : 10) : 0;

export function useSetSession({
  mode,
  timed,
  questions,
  nextQuestion,
  module,
  route,
  deferred = false,
}: {
  mode: AnswerMode;
  timed: boolean;
  questions: DemoQuestion[];
  /** Endless and trials: the picker's next question, or null when the pool is spent. */
  nextQuestion?(answered: Answered[]): DemoQuestion | null;
  module?: number;
  route?: "harder" | "easier";
  /** A test module: no feedback until the module ends. */
  deferred?: boolean;
}) {
  const [list, setList] = useState<DemoQuestion[]>(() =>
    questions.length
      ? questions
      : nextQuestion
        ? ([nextQuestion([])].filter(Boolean) as DemoQuestion[])
        : []
  );
  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, Answered>>({});
  const [flags, setFlags] = useState<Record<number, boolean>>({});
  const usage = useRef<Record<number, Usage>>({ 0: fresh() });
  const t0 = useRef(performance.now());

  const use = (i: number) => (usage.current[i] ??= fresh());
  const leave = (i: number) => {
    const u = use(i);
    u.spent += performance.now() - u.started;
  };
  const enter = (i: number) => {
    use(i).started = performance.now();
  };

  const current = list[index];
  const chosen = selection[index];
  const answered = checked[index];

  const select = useCallback(
    (letter: string) => {
      if (checked[index]) return;
      setSelection((s) => {
        if (s[index] && s[index] !== letter) use(index).changed += 1;
        return { ...s, [index]: letter };
      });
    },
    [checked, index]
  );

  const commit = useCallback(
    (i: number): Answered | null => {
      const q = list[i];
      const letter = selection[i];
      if (!q || !letter) return null;
      const u = use(i);
      const timeMs = Math.round(u.spent + (performance.now() - u.started));
      const a: Answered = {
        questionId: q.id,
        skill: q.skill,
        chosen: letter,
        correct: letter === q.correct,
        timeMs,
        changed: u.changed,
        helpUsed: u.help,
        calculatorUsed: u.calc,
        explanationUsed: u.expl,
      };
      recordAnswer({
        questionId: q.id,
        questionVersion: versionOf(q.id),
        skill: q.skill,
        mode,
        timed,
        position: i + 1,
        module,
        route,
        chosen: letter,
        correct: a.correct,
        timeMs,
        changedAnswer: u.changed,
        helpUsed: u.help,
        calculatorUsed: u.calc,
        explanationUsed: u.expl,
        difficulty: q.difficulty,
      });
      return a;
    },
    [list, selection, mode, timed, module, route]
  );

  /** Check the current answer (sequential sets). */
  const check = useCallback(() => {
    const a = commit(index);
    if (a) setChecked((c) => ({ ...c, [index]: a }));
  }, [commit, index]);

  const go = useCallback(
    (i: number) => {
      leave(index);
      enter(i);
      setIndex(i);
    },
    [index]
  );

  /** Move on; in an endless session, ask for the next question first. Returns false when the set is over. */
  const next = useCallback((): boolean => {
    if (index < list.length - 1) {
      go(index + 1);
      return true;
    }
    if (nextQuestion) {
      const q = nextQuestion(Object.values(checked));
      if (!q) return false;
      setList((l) => [...l, q]);
      go(index + 1);
      return true;
    }
    return false;
  }, [index, list.length, nextQuestion, checked, go]);

  const prev = useCallback(() => {
    if (index > 0) go(index - 1);
  }, [index, go]);

  const markHelp = useCallback(() => void (use(index).help = true), [index]);
  const markCalc = useCallback(() => void (use(index).calc = true), [index]);
  const markExplanation = useCallback(() => void (use(index).expl = true), [index]);
  const toggleFlag = useCallback(() => setFlags((f) => ({ ...f, [index]: !f[index] })), [index]);

  /** The result of the set so far; a deferred module commits every selected answer now. */
  const finish = useCallback((): SetResult => {
    leave(index);
    const all: Answered[] = deferred
      ? list.map((_, i) => checked[i] ?? commit(i)).filter((a): a is Answered => a !== null)
      : Object.values(checked);
    const right = all.filter((a) => a.correct).length;
    const tokens = all.reduce((sum, a) => {
      const q = list.find((x) => x.id === a.questionId);
      return sum + tokensFor(a.correct, q?.difficulty ?? 1);
    }, 0);
    return {
      answers: all,
      right,
      total: deferred ? list.length : all.length,
      seconds: Math.round((performance.now() - t0.current) / 1000),
      tokens,
    };
  }, [checked, commit, deferred, index, list]);

  const cells = useMemo<CellState[]>(
    () =>
      list.map((_, i) => {
        const a = checked[i];
        if (!deferred && a) return a.correct ? "right" : "wrong";
        if (i === index) return "current";
        if (flags[i]) return "flagged";
        if (selection[i]) return "answered";
        return "todo";
      }),
    [list, checked, deferred, index, flags, selection]
  );

  return {
    list,
    index,
    current,
    chosen,
    answered,
    flagged: Boolean(flags[index]),
    cells,
    select,
    check,
    next,
    prev,
    go,
    finish,
    markHelp,
    markCalc,
    markExplanation,
    toggleFlag,
    answeredCount: Object.keys(checked).length,
    selectedCount: Object.keys(selection).length,
  };
}
