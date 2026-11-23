"use client";
// The start of a full-length exam (founder, 2026-11-20): the module plan and its times, the reference
// sheet, a checklist, the rules and the time available, then a get-ready screen. Pressing Start begins
// the exam and its clock. Calm, professional and focused. Never reachable outside the Saturday window
// (the page checks that on the server before this renders).
import { useRef, useState } from "react";
import { Go } from "@/components/quiz-flows/FlowStage";
import { ReferenceSheet } from "@/components/learn/quiz-shell/ReferenceSheet";
import type { StartInfo } from "@/lib/exams/service";
import { BREAK_SECONDS } from "@/lib/exams/plan";
import { dayTime, zoneName } from "./format";
import s from "./exam.module.css";

const CHECKLIST = [
  "A quiet place for about 2½ hours",
  "Device charged, steady connection",
  "Scratch paper and a pencil",
  "Phone away. Calculator and reference sheet are built in",
];

const RULES = [
  "Each module has its own timer. When it ends, your answers are kept.",
  "Module 2 gets easier or harder based on Module 1.",
  "Move between questions and mark any for review. A submitted module is closed.",
  "A 10-minute break follows Reading and Writing. The clock runs if you leave the page.",
  "A few questions are tryouts and don't count. You won't know which, so answer every one.",
  "No outside help.",
];

export function ExamStart({
  info,
  onStart,
  busy,
  error,
}: {
  info: StartInfo;
  onStart(): void;
  busy: boolean;
  error: string | null;
}) {
  const [ready, setReady] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null);
  const totalMinutes = info.modules.reduce((sum, m) => sum + m.minutes, 0) + BREAK_SECONDS / 60;
  const hours = Math.floor(totalMinutes / 60);
  const extra = info.accommodation > 1;

  if (ready)
    return (
      <section className={`${s.pane} ${s.narrow} ${s.center} ${s.rise}`} aria-labelledby="ready">
        <div className={s.breath} aria-hidden="true" />
        <div className={s.head}>
          <h1 id="ready" className={s.title}>
            Get ready
          </h1>
          <p className={s.lead}>
            Take a breath. Start begins Reading and Writing Module 1 and its{" "}
            {info.modules[0].minutes}-minute clock.
          </p>
        </div>
        {error && <p className={s.error}>{error}</p>}
        <div className={s.actions}>
          <button type="button" className={s.quiet} onClick={() => setReady(false)} disabled={busy}>
            Back
          </button>
          <Go onClick={onStart} busy={busy} hint="Enter">
            Start
          </Go>
        </div>
      </section>
    );

  return (
    <section className={`${s.pane} ${s.rise}`} aria-labelledby="start">
      <div className={s.head}>
        <h1 id="start" className={s.title}>
          Full-length exam {info.form}
        </h1>
        <p className={s.lead}>
          {info.opensWith === "pass"
            ? "Opened with an Exam pass. "
            : info.opensWith === "test-switch"
              ? "Open today by the test switch. "
              : `Open until ${dayTime(info.window.closesAt, info.window.zone)} (${zoneName(info.window.zone)}). `}
          Once started, it runs its full time, even past midnight.
        </p>
      </div>

      <div className={s.split}>
        <div className={s.block}>
          <h2 className={s.label}>The plan</h2>
          <div className={s.plan}>
            {info.modules.map((m, i) => (
              <div key={m.key}>
                {i === 2 && (
                  <div className={`${s.row} ${s.rowBreak}`}>
                    <span>Break</span>
                    <span />
                    <span>10 min</span>
                  </div>
                )}
                <div className={s.row}>
                  <span className={s.rowName}>{m.title}</span>
                  <span className={s.rowMeta}>{m.questions} questions</span>
                  <span>{m.minutes} min</span>
                </div>
              </div>
            ))}
          </div>
          <p className={s.total}>
            <span>In all</span>
            <span>
              {hours} h {Math.round(totalMinutes - hours * 60)} min
              {extra ? ", with your extra time" : ""}
            </span>
          </p>
          <button type="button" className={s.quiet} onClick={() => sheet.current?.showModal()}>
            Reference sheet
          </button>
        </div>

        <div className={s.block}>
          <h2 className={s.label}>Checklist</h2>
          <ul className={s.checks}>
            {CHECKLIST.map((line) => (
              <li key={line}>
                <label className={s.check}>
                  <input type="checkbox" />
                  <span>{line}</span>
                </label>
              </li>
            ))}
          </ul>
          <h2 className={s.label}>Rules</h2>
          <ul className={s.rules}>
            {RULES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={s.actions}>
        <Go onClick={() => setReady(true)}>Continue</Go>
      </div>

      <dialog ref={sheet} className={s.sheet} aria-label="Reference sheet">
        <div className={s.sheetTop}>
          <strong>Reference sheet</strong>
          <button type="button" className={s.quiet} onClick={() => sheet.current?.close()}>
            Close
          </button>
        </div>
        <ReferenceSheet />
      </dialog>
    </section>
  );
}
