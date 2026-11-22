"use client";
// The end of a full-length exam (founder: exams are "very important and special"). The score is revealed
// first, on its own, rising to the total; then the two section scores with their domains, the predicted
// score as it now stands, the coins earned by improvement over the last exam, and what to practice next.
// With reduced motion everything is simply there.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Go } from "@/components/quiz-flows/FlowStage";
import type { ExamResult, SectionSummary } from "@/lib/exams/result";
import s from "./exam.module.css";

const REVEAL_MS = 2200;

function useRise(target: number) {
  const [value, setValue] = useState(400);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / REVEAL_MS);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round((400 + (target - 400) * eased) / 10) * 10);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

function Section({ name, data, delay }: { name: string; data: SectionSummary; delay: number }) {
  return (
    <div className={`${s.section} ${s.rise}`} style={{ animationDelay: `${delay}ms` }}>
      <div className={s.sectionTop}>
        <strong>{name}</strong>
        <span className={s.sectionScore}>{data.score}</span>
      </div>
      <div className={s.bar} aria-hidden="true">
        <i style={{ width: `${((data.score - 200) / 600) * 100}%` }} />
      </div>
      <ul className={s.domains}>
        {data.domains.map((d) => (
          <li key={d.id} className={s.domain}>
            <span>{d.name}</span>
            <span>
              {d.right} of {d.total}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExamEnding({ result }: { result: ExamResult }) {
  const shown = useRise(result.total);
  const gain = result.improvement;
  return (
    <section className={s.pane} aria-labelledby="score">
      <div className={s.reveal}>
        <h1 id="score" className={s.label}>
          Full-length exam {result.form}
        </h1>
        <p className={s.score} aria-live="polite" aria-label={`Your score: ${result.total}`}>
          {shown}
        </p>
        <p className={`${s.range} ${s.rise}`} style={{ animationDelay: `${REVEAL_MS}ms` }}>
          Likely range {result.low} to {result.high}
        </p>
      </div>

      <div className={s.sections}>
        <Section name="Reading and Writing" data={result.reading} delay={REVEAL_MS + 200} />
        <Section name="Math" data={result.math} delay={REVEAL_MS + 400} />
      </div>

      <div className={s.facts}>
        <div className={`${s.fact} ${s.rise}`} style={{ animationDelay: `${REVEAL_MS + 700}ms` }}>
          <span className={s.label}>Predicted score</span>
          {result.predicted.after !== null ? (
            <>
              <span className={s.factValue}>{result.predicted.after}</span>
              <span className={s.windowNote}>
                {result.predicted.before !== null
                  ? `Was ${result.predicted.before}`
                  : "Your first predicted score"}
              </span>
            </>
          ) : (
            <span className={s.windowNote}>It appears after your next exam.</span>
          )}
        </div>
        <div className={`${s.fact} ${s.rise}`} style={{ animationDelay: `${REVEAL_MS + 850}ms` }}>
          <span className={s.label}>Since your last exam</span>
          {gain === null ? (
            <span className={s.windowNote}>This is your first. Next time we compare.</span>
          ) : (
            <span className={`${s.factValue} ${gain > 0 ? s.up : ""}`}>
              {gain > 0 ? `+${gain}` : gain === 0 ? "Even" : gain}
            </span>
          )}
        </div>
        <div className={`${s.fact} ${s.rise}`} style={{ animationDelay: `${REVEAL_MS + 1000}ms` }}>
          <span className={s.label}>Coins</span>
          <span className={s.factValue}>+{result.coins.toLocaleString("en-US")}</span>
          <span className={s.windowNote}>
            {gain === null
              ? "For your first exam"
              : gain > 0
                ? "More for every point you gained"
                : "For finishing"}
          </span>
        </div>
      </div>

      {result.nextSteps.length > 0 && (
        <div className={`${s.block} ${s.rise}`} style={{ animationDelay: `${REVEAL_MS + 1200}ms` }}>
          <h2 className={s.label}>Practice next</h2>
          <ul className={s.steps}>
            {result.nextSteps.map((step) => (
              <li key={step.skillId} className={s.step}>
                <span>{step.name}</span>
                <span className={s.windowNote}>
                  {step.missed} missed of {step.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`${s.actions} ${s.rise}`} style={{ animationDelay: `${REVEAL_MS + 1300}ms` }}>
        <Go href="/dashboard/student?page=library">Practice in the Library</Go>
        <Link className={s.quiet} href="/dashboard/student?page=progress">
          See your progress
        </Link>
        <Link className={s.quiet} href="/learn/tests">
          All exams
        </Link>
      </div>
    </section>
  );
}
