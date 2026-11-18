"use client";
// Keeps the record of how each question is answered (src/lib/quiz/record.ts) while the quiz is
// on screen, and hands it to the host to save: when a question is answered, when it is left,
// and when the page is hidden or closed. It watches what the shell already knows (the choice
// picked, what is crossed out, the calculator, the explanation) and the page itself (left or
// come back to, touched, pasted into, copied from). It survives a reload in the tab's own
// storage, beside the question's working state.
import { useCallback, useEffect, useRef } from "react";
import { begin, note, type Happened, type Input, type Sitting } from "@/lib/quiz/record";
import { deviceNow, signalsOf, type NoteSignals } from "@/lib/quiz/signals";

const KEY = "karman-quiz-rec:";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function load(attemptKey: string, mode: string): Sitting {
  try {
    const kept = sessionStorage.getItem(KEY + attemptKey);
    if (kept) {
      const sitting = JSON.parse(kept) as Sitting;
      // the time the tab was closed or reloading is not time on a question
      return { ...sitting, now: Date.now(), touchedAt: Date.now(), away: false, open: -1 };
    }
  } catch {
    /* A record that cannot be read back starts again. */
  }
  return begin(attemptKey, { mode, device: deviceNow() }, Date.now());
}

export function useAnswerRecord({
  attemptKey,
  mode,
  enabled,
  question,
  answer,
  crossedOut,
  marked,
  calculatorOpen,
  answered,
  onSignals,
}: {
  /** The run's id, or the run's id, a colon and a section. Only a real run (a uuid) is recorded. */
  attemptKey: string;
  mode: string;
  enabled: boolean;
  question: { id: string; order: string[] } | undefined;
  answer: string | null;
  crossedOut: string[];
  marked: boolean;
  calculatorOpen: boolean;
  /** The question has been graded and its explanation is on screen. */
  answered: boolean;
  onSignals?(signals: NoteSignals): void;
}): (what: Happened) => void {
  // a timed section's key is the run's id, a colon and the section
  const runId = attemptKey.split(":")[0];
  const on = enabled && UUID.test(runId);
  const sitting = useRef<Sitting | null>(null);
  const input = useRef<Input | null>(null);
  const send = useRef(onSignals);
  useEffect(() => {
    send.current = onSignals;
  }, [onSignals]);

  const apply = useCallback(
    (what: Happened, keep = true) => {
      if (!on) return;
      sitting.current = note(sitting.current ?? load(attemptKey, mode), what, Date.now());
      if (!keep) return;
      try {
        sessionStorage.setItem(KEY + attemptKey, JSON.stringify(sitting.current));
      } catch {
        /* Full or private storage: the record lives for this page only. */
      }
    },
    [on, attemptKey, mode]
  );
  const flush = useCallback(
    (questionId: string | undefined) => {
      const s = sitting.current;
      const q = s?.record.questions.find((item) => item.questionId === questionId);
      if (!on || !s || !q) return;
      send.current?.({ runId, device: s.record.device, items: [signalsOf(q)] });
    },
    [on, runId]
  );

  // a question comes up; the one before it is sent as it stood when it was left
  const id = question?.id;
  const order = question?.order.join("");
  useEffect(() => {
    if (!id) return;
    apply({ type: "shown", questionId: id, order: (order ?? "").split("") });
    return () => {
      apply({ type: "touched" });
      flush(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, apply, flush]);

  // what the student did, as the shell's own state shows it
  const before = useRef<{ id?: string; answer: string | null; crossed: string[] }>({
    answer: null,
    crossed: [],
  });
  useEffect(() => {
    const was = before.current.id === id ? before.current : { answer: null, crossed: [] };
    if (id && answer !== null && answer !== was.answer)
      apply({ type: "picked", choice: answer, input: input.current });
    for (const letter of crossedOut)
      if (id && !was.crossed.includes(letter)) apply({ type: "crossed", choice: letter, on: true });
    for (const letter of was.crossed)
      if (id && !crossedOut.includes(letter)) apply({ type: "crossed", choice: letter, on: false });
    before.current = { id, answer, crossed: crossedOut };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, answer, crossedOut.join("")]);
  useEffect(() => {
    if (id) apply({ type: "marked", on: marked });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, marked]);
  useEffect(() => {
    if (id) apply({ type: "calculator", open: calculatorOpen });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, calculatorOpen]);
  useEffect(() => {
    if (!id || !answered) return;
    // whether it was right is the server's to say: it is not kept here
    apply({ type: "answered", right: null });
    apply({ type: "explanation", open: true });
    flush(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, answered]);

  // the page itself
  useEffect(() => {
    if (!on) return;
    let last = 0;
    const touched = (kind: Input) => () => {
      input.current = kind;
      // often enough to end an idle spell, seldom enough to cost nothing
      if (Date.now() - last < 1000) return;
      last = Date.now();
      apply({ type: "touched" }, false);
    };
    const pointer = (e: PointerEvent) => touched(e.pointerType === "touch" ? "touch" : "mouse")();
    const keys = touched("keys");
    const away = () => {
      apply({ type: "away" });
      flush(sitting.current?.record.questions[sitting.current.open]?.questionId);
    };
    const back = () => apply({ type: "back" });
    const seen = () => (document.hidden ? away() : back());
    const pasted = () => apply({ type: "pasted" });
    const copied = () => apply({ type: "copied" });
    window.addEventListener("pointerdown", pointer, true);
    window.addEventListener("keydown", keys, true);
    window.addEventListener("blur", away);
    window.addEventListener("focus", back);
    window.addEventListener("pagehide", away);
    document.addEventListener("visibilitychange", seen);
    document.addEventListener("paste", pasted, true);
    document.addEventListener("copy", copied, true);
    return () => {
      window.removeEventListener("pointerdown", pointer, true);
      window.removeEventListener("keydown", keys, true);
      window.removeEventListener("blur", away);
      window.removeEventListener("focus", back);
      window.removeEventListener("pagehide", away);
      document.removeEventListener("visibilitychange", seen);
      document.removeEventListener("paste", pasted, true);
      document.removeEventListener("copy", copied, true);
    };
  }, [on, apply, flush]);
  return apply;
}
