"use client";

// The close's "start here" box: the parent types their student's latest score and sees the class that
// student would join and the points promised for that score, with the button to reserve. Nothing is sent
// anywhere. Facts and words come in as props.
import { useState, type ReactNode } from "react";

export default function ProgramStart({
  ask,
  field,
  show,
  bad,
  klass,
  classBands,
  bandTops,
  gains,
  promise,
  high,
  noScore,
  action,
}: {
  ask: string;
  field: string;
  show: string;
  bad: string;
  /** "Your student would join the class that starts between" */
  klass: string;
  /** The classes, as "1000 to 1200" and so on, lowest first. */
  classBands: string[];
  /** The top score of each promise band, lowest first. */
  bandTops: number[];
  /** Points promised for each promise band. */
  gains: number[];
  promise: string;
  high: string;
  noScore: string;
  /** The reserve button and the dates. */
  action: ReactNode;
}) {
  const [text, setText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(text);
    const ok = Number.isFinite(n) && n >= 400 && n <= 1600;
    setWrong(!ok);
    setScore(ok ? Math.round(n / 10) * 10 : null);
  };
  /* the class: the first whose upper bound the score does not pass */
  const tops = classBands.map((b) => Number(b.split(" ").at(-1)));
  const cls =
    score === null ? null : (classBands[tops.findIndex((t) => score <= t)] ?? classBands.at(-1));
  const band = score === null ? -1 : bandTops.findIndex((t) => score <= t);
  return (
    <div className="pg-start">
      <form onSubmit={submit} noValidate>
        <label htmlFor="pg-score-in">{ask}</label>
        <div>
          <input
            id="pg-score-in"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder={field}
            value={text}
            aria-invalid={wrong || undefined}
            aria-describedby={wrong ? "pg-score-bad" : undefined}
            onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
          />
          <button type="submit">{show}</button>
        </div>
        {wrong ? (
          <p className="pg-bad" id="pg-score-bad" role="alert">
            {bad}
          </p>
        ) : null}
      </form>
      {score !== null ? (
        <div className="pg-answer" key={score} aria-live="polite">
          <p>
            {klass} <b className="num">{cls}</b>.
          </p>
          <p className="pg-answer-gain">
            {band >= 0 ? (
              <>
                <b className="num">+{gains[band]}</b> {promise}
              </>
            ) : (
              high
            )}
          </p>
        </div>
      ) : (
        <p className="pg-small">{noScore}</p>
      )}
      {action}
    </div>
  );
}
