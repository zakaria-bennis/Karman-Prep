"use client";
// The end of a full-length exam (founder: exams are "very important and special"; round 2, 2026-11-22).
// First how the score moved since the last exam, with the score rising to its total; then the Reinforce
// skills, the three whose misses cost the most points, with See all; then the two section scores, the
// pacing of every module, the predicted score and the coins. Reinforce opens the skill's lesson, then an
// 8-question skill set. With reduced motion everything is simply there.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Go } from "@/components/quiz-flows/FlowStage";
import type { ExamResult, SectionSummary } from "@/lib/exams/result";
import { MODULE_INFO, SECTION_TITLE } from "@/lib/exams/plan";
import { clock } from "./format";
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

const MARK_WORD = {
  fast: "too fast",
  pace: "on pace",
  slow: "too slow",
  blank: "left blank",
} as const;

/** One strip per module: each question too fast, on pace or too slow; the slowest three named. */
function Pace({ result }: { result: ExamResult }) {
  if (!result.pacing?.modules.length) return null;
  return (
    <div className={`${s.block} ${s.rise}`} style={{ animationDelay: `${REVEAL_MS + 600}ms` }}>
      <h2 className={s.label}>Pacing</h2>
      <div className={s.paceRows}>
        {result.pacing.modules.map((m) => {
          const info = MODULE_INFO[m.key];
          return (
            <div key={m.key} className={s.paceRow}>
              <span className={s.paceName}>
                {SECTION_TITLE[info.section]}, Module {info.number}
              </span>
              <ol
                className={s.strip}
                aria-label={`${SECTION_TITLE[info.section]}, Module ${info.number}`}
              >
                {m.marks.map((mark, i) => (
                  <li key={i} data-mark={mark} title={`Question ${i + 1}: ${MARK_WORD[mark]}`}>
                    <span className={s.hidden}>
                      Question {i + 1}: {MARK_WORD[mark]}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
      <p className={s.legend}>
        <i data-mark="fast" /> Too fast <i data-mark="pace" /> On pace <i data-mark="slow" /> Too
        slow <i data-mark="blank" /> Blank
      </p>
      {result.pacing.slowest.length > 0 && (
        <ul className={s.steps}>
          {result.pacing.slowest.map((q) => {
            const info = MODULE_INFO[q.module];
            return (
              <li key={`${q.module}-${q.number}`} className={s.step}>
                <span className={s.stepName}>
                  {SECTION_TITLE[info.section]} {info.number}, question {q.number}: {q.skill}
                </span>
                <span className={s.windowNote}>
                  {clock(q.seconds * 1000)} for about {clock(q.expected * 1000)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
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
  const [all, setAll] = useState(false);
  return (
    <section className={s.pane} aria-labelledby="score">
      <div className={s.reveal}>
        <h1 id="score" className={s.label}>
          Full-length exam {result.form}
        </h1>
        {gain !== null && (
          <p className={`${s.change} ${gain > 0 ? s.up : ""}`}>
            {gain > 0
              ? `Up ${gain} since your last exam`
              : gain === 0
                ? "Same as your last exam"
                : `Down ${-gain} since your last exam`}
          </p>
        )}
        <p className={s.score} aria-live="polite" aria-label={`Your score: ${result.total}`}>
          {shown}
        </p>
      </div>

      {result.reinforce.length > 0 && (
        <div className={`${s.block} ${s.rise}`} style={{ animationDelay: `${REVEAL_MS + 150}ms` }}>
          <h2 className={s.label}>Reinforce</h2>
          <ul className={s.steps}>
            {(all ? result.reinforce : result.reinforce.slice(0, 3)).map((skill) => (
              <li key={skill.skillId}>
                <Link
                  className={s.step}
                  href={`/dashboard/student?page=library&skill=${encodeURIComponent(skill.skillId)}`}
                >
                  <span className={s.stepName}>{skill.name}</span>
                  <span className={s.windowNote}>
                    {skill.points} points · {skill.missed} missed of {skill.total}
                  </span>
                  <span className={s.stepGo}>Reinforce</span>
                </Link>
              </li>
            ))}
          </ul>
          {result.reinforce.length > 3 && (
            <button type="button" className={s.quiet} onClick={() => setAll(!all)}>
              {all ? "Show 3" : `See all ${result.reinforce.length}`}
            </button>
          )}
        </div>
      )}

      <div className={s.sections}>
        <Section name="Reading and Writing" data={result.reading} delay={REVEAL_MS + 200} />
        <Section name="Math" data={result.math} delay={REVEAL_MS + 400} />
      </div>

      <Pace result={result} />

      <div className={s.facts}>
        <div className={`${s.fact} ${s.rise}`} style={{ animationDelay: `${REVEAL_MS + 700}ms` }}>
          <span className={s.label}>Predicted score</span>
          {result.predicted.after !== null ? (
            <>
              <span className={s.factValue}>{result.predicted.after}</span>
              {result.predicted.before !== null && (
                <span className={s.windowNote}>Was {result.predicted.before}</span>
              )}
            </>
          ) : (
            <span className={s.windowNote}>After your next exam</span>
          )}
        </div>
        <div className={`${s.fact} ${s.rise}`} style={{ animationDelay: `${REVEAL_MS + 1000}ms` }}>
          <span className={s.label}>Coins</span>
          <span className={s.factValue}>+{result.coins.toLocaleString("en-US")}</span>
          {gain !== null && gain > 0 && (
            <span className={s.windowNote}>More for each point gained</span>
          )}
        </div>
      </div>

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
