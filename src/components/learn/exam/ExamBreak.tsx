"use client";
// The 10-minute break between Reading and Writing and Math. The student may come back early; when the
// break runs out, Math starts on its own (the clock never waits), as on the real test.
import { useEffect, useState } from "react";
import { Go } from "@/components/quiz-flows/FlowStage";
import { clock } from "./format";
import s from "./exam.module.css";

export function ExamBreak({
  endsAt,
  serverNow,
  onResume,
  onOver,
  busy,
}: {
  endsAt: string;
  serverNow: string;
  onResume(): void;
  onOver(): void;
  busy: boolean;
}) {
  const [drift] = useState(() => Date.now() - new Date(serverNow).getTime());
  const end = new Date(endsAt).getTime() + drift;
  const [left, setLeft] = useState(() => end - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = end - Date.now();
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onOver();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [end, onOver]);

  return (
    <section className={`${s.pane} ${s.narrow} ${s.center} ${s.rise}`} aria-labelledby="break">
      <div className={s.head}>
        <h1 id="break" className={s.title}>
          Break
        </h1>
        <p className={s.lead}>
          Reading and Writing is done. Stand up, stretch, drink some water. Math starts when you
          come back, or when the break is over.
        </p>
      </div>
      <p className={s.clock} role="timer" aria-live="off">
        {clock(left)}
      </p>
      <Go onClick={onResume} busy={busy}>
        Start Math now
      </Go>
    </section>
  );
}
