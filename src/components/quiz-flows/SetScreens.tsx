"use client";
// The skill set's two screens (founder, 2026-11-18), on the frosted stage. Each is laid out three
// ways, for a phone, a tablet and a computer (stage.module.css), and both carry real information.
//   SetStart  the skill and where it sits, how long the set is, the student's level, what tools the
//             set allows, and Start.
//   SetEnd    the last question's glass says the set is over and draws back; the ending comes out
//             of it: the score, accuracy, time and pace, every answer in order (press one to find
//             it in the list), the level before and after, and coins that fly into their counter.
//             A level gained gets confetti and the one sound.
// Levels are shown as the founder names them (shown-level.ts).
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Coin } from "@/components/portal/Coin";
import type { RunView } from "@/lib/assembler/run-types";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import { CoinBurst } from "./CoinBurst";
import { FlowStage, Go } from "./FlowStage";
import { SHOWN_LEVELS, clockOf, minutesFor, shownLevel } from "./shown-level";
import { arrive, confetti, count, curtain, fill, land, swell } from "./stage-motion";
import s from "./stage.module.css";

const BARS = SHOWN_LEVELS.length - 1;

function Bars({ lit, innerRef }: { lit: number; innerRef?: React.Ref<HTMLSpanElement> }) {
  return (
    <span className={s.bars} ref={innerRef} aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => (
        <i key={i} data-on={i < lit || undefined} />
      ))}
    </span>
  );
}

export function SetStart({
  name,
  domain,
  subject,
  level,
  questions,
  onStart,
  busy,
  exitHref,
  lessonHref,
}: {
  name: string;
  /** The domain the skill belongs to ("Geometry and Trigonometry"). */
  domain: string;
  subject: "math" | "reading";
  /** The student's level in this skill, as the engine keeps it (0 to 4). */
  level: number;
  questions: number;
  onStart: () => void;
  busy: boolean;
  exitHref: string;
  lessonHref?: string | null;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => arrive(root.current), []);
  // the screen exists to be started: Enter begins it, wherever the focus is
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || busy || (e.target as Element).closest?.("a, button")) return;
      onStart();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [busy, onStart]);
  const lit = shownLevel(level);
  const tools =
    subject === "math"
      ? ["Calculator", "Reference", "Pencil"]
      : ["Highlighter", "Pencil", "Cross out"];
  return (
    <FlowStage back={{ href: exitHref, label: "Back" }}>
      <div className={s.start} ref={root}>
        <header className={`${s.glass} ${s.lead}`} data-rise>
          <h1>{name}</h1>
          <p className={s.where}>
            {domain}
            <span>{subject === "math" ? "Math" : "Reading and Writing"}</span>
          </p>
          <p className={s.level}>
            <Bars lit={lit} />
            <b>{SHOWN_LEVELS[lit]}</b>
          </p>
        </header>
        <ul className={s.tiles} data-count="3">
          <li className={s.glass} data-rise>
            <b>{questions}</b>
            <span>Questions</span>
          </li>
          <li className={s.glass} data-rise>
            <b>
              {minutesFor(questions, subject)}
              <small>min</small>
            </b>
            <span>About</span>
          </li>
          <li className={s.glass} data-rise>
            <b className={s.word}>Instant</b>
            <span>Checking</span>
          </li>
        </ul>
        <section className={`${s.glass} ${s.tools}`} data-rise aria-label="Tools in this set">
          <small>Tools</small>
          {tools.map((tool) => (
            <span key={tool}>{tool}</span>
          ))}
        </section>
        <div className={s.actions}>
          <Go onClick={onStart} busy={busy} hint="Enter">
            Start
          </Go>
          {lessonHref && (
            <Link className={s.second} href={lessonHref} data-rise>
              Lesson
            </Link>
          )}
        </div>
      </div>
    </FlowStage>
  );
}

export function SetEnd({
  run,
  exitHref,
  lessonHref,
  againHref,
}: {
  run: RunView;
  exitHref: string;
  lessonHref?: string | null;
  againHref?: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const score = useRef<HTMLElement>(null);
  const share = useRef<HTMLElement>(null);
  const answers = useRef<HTMLOListElement>(null);
  const bars = useRef<HTMLSpanElement>(null);
  const purse = useRef<HTMLLIElement>(null);
  const coins = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const [burst, setBurst] = useState(0);
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<number | null>(null);

  const result = run.result;
  // a set on a whole skill can move several of its sub-skills: the three that moved most are shown
  const moves = (result?.skills ?? []).slice(0, 3).map((k) => ({
    skillId: k.skillId,
    label: k.label,
    from: shownLevel(k.from),
    to: shownLevel(k.to),
  }));
  const from = moves[0]?.from ?? 0;
  const to = moves[0]?.to ?? 0;
  const up = moves.some((m) => m.to > m.from);
  const right = result?.right ?? 0;
  const total = result?.total ?? 0;
  const tokens = result?.tokens ?? 0;
  const percent = total ? Math.round((right / total) * 100) : 0;
  const took = run.completedAt ? Date.parse(run.completedAt) - Date.parse(run.startedAt) : 0;
  const time = clockOf(took);
  const pace = total ? clockOf(took / total) : null;
  const flying = Math.min(18, Math.max(tokens > 0 ? 5 : 0, Math.round(tokens / 5)));

  useEffect(() => {
    const undo = [
      curtain(veil.current, stage.current),
      count(score.current, right, 1.3),
      count(share.current, percent, 1.5),
      land(answers.current, 1.45),
      fill(bars.current, from, to, 2.3),
      up ? confetti(stage.current, 2.5) : undefined,
    ];
    const timers = [
      // coins leave once the numbers have settled; with less motion asked for, none fly
      window.setTimeout(() => setBurst(1), 2000),
      // one sound for the one real moment: a level gained
      up ? window.setTimeout(() => playRewardSound("levelUp"), 2500) : 0,
    ];
    return () => {
      undo.forEach((stop) => stop?.());
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [right, percent, from, to, up]);

  // Enter takes the next step, as it started the set
  const next = up ? (againHref ?? exitHref) : (lessonHref ?? againHref ?? exitHref);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || (e.target as Element).closest?.("a, button")) return;
      window.location.assign(next);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [next]);

  if (!result) return null;
  const given = run.sections.flatMap((section) =>
    section.questions.map((q) => {
      const review = run.reviews[q.id];
      return {
        id: q.id,
        right: !!review?.isCorrect,
        yours: review?.studentAnswer?.trim() || "No answer",
        answer: review?.correct_answer?.trim() ?? "",
      };
    })
  );
  // pressing an answer's square finds it in the list
  const find = (i: number) => {
    setOpen(true);
    setFound(i);
    requestAnimationFrame(() =>
      list.current?.children[i]?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    );
  };

  return (
    <FlowStage back={{ href: exitHref, label: "Done" }}>
      <div className={s.veil} ref={veil} aria-hidden="true">
        <b>Set complete</b>
      </div>
      <CoinBurst
        className={s.burst}
        coins={flying}
        play={burst}
        target={purse}
        onLand={(landed, of) => {
          if (coins.current) coins.current.textContent = `+${Math.round((tokens * landed) / of)}`;
          swell(purse.current?.querySelector("svg") ?? null);
        }}
      />
      <div className={s.end} ref={stage} data-up={up || undefined}>
        <section className={`${s.glass} ${s.hero}`} data-rise aria-labelledby="set-name">
          <h1 id="set-name">{run.title}</h1>
          <p className={s.score} aria-label={`${right} of ${total} right`}>
            <b ref={score}>{right}</b>
            <span>of {total}</span>
          </p>
          <ol
            className={s.answers}
            ref={answers}
            aria-label="Your answers in order"
            style={{ "--n": Math.min(10, given.length) } as CSSProperties}
          >
            {given.map((a, i) => (
              <li key={a.id}>
                <button
                  type="button"
                  data-right={a.right || undefined}
                  aria-label={`Question ${i + 1}: ${a.right ? "right" : "missed"}`}
                  aria-pressed={found === i}
                  onClick={() => find(i)}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
        </section>

        <ul className={s.tiles} data-count="4">
          <li className={s.glass} data-rise>
            <b>
              <i ref={share}>{percent}</i>
              <small>%</small>
            </b>
            <span>Accuracy</span>
          </li>
          <li className={s.glass} data-rise>
            <b>{time ?? "–"}</b>
            <span>Time</span>
          </li>
          <li className={s.glass} data-rise>
            <b>{pace ?? "–"}</b>
            <span>A question</span>
          </li>
          <li className={`${s.glass} ${s.purse}`} data-rise ref={purse}>
            <button
              type="button"
              onClick={() => tokens > 0 && setBurst((n) => n + 1)}
              aria-label={`${tokens} coins earned`}
            >
              <b>
                <Coin size={30} />
                <i ref={coins}>+{tokens}</i>
              </b>
              <span>Coins</span>
            </button>
          </li>
        </ul>

        {moves.length > 0 && (
          <section className={`${s.glass} ${s.moved}`} data-rise aria-label="Level">
            {moves.map((move, i) => (
              <p key={move.skillId} className={s.level} data-up={move.to > move.from || undefined}>
                {moves.length > 1 && <span>{move.label}</span>}
                <Bars lit={move.to} innerRef={i === 0 ? bars : undefined} />
                <b>{SHOWN_LEVELS[move.to]}</b>
                <small>
                  {move.to > move.from
                    ? `Up from ${SHOWN_LEVELS[move.from]}`
                    : move.to < move.from
                      ? `Down from ${SHOWN_LEVELS[move.from]}`
                      : move.to < BARS
                        ? "Same level"
                        : "Top level"}
                </small>
              </p>
            ))}
          </section>
        )}

        <section className={`${s.glass} ${s.each}`} data-rise data-open={open || undefined}>
          <button
            type="button"
            className={s.fold}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            Each answer
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M9.500 6.500L15 12l-5.500 5.500" />
            </svg>
          </button>
          <h2>Each answer</h2>
          <ol ref={list}>
            {given.map((a, i) => (
              <li
                key={a.id}
                data-right={a.right || undefined}
                data-found={found === i || undefined}
              >
                <i aria-hidden="true">{i + 1}</i>
                <span>
                  <b>{a.yours}</b>
                  {!a.right && a.answer && <small>Answer {a.answer}</small>}
                </span>
                <em>{a.right ? "Right" : "Missed"}</em>
              </li>
            ))}
          </ol>
        </section>

        <div className={s.actions} data-rise>
          <Go href={next} hint="Enter">
            {up ? "Another set" : lessonHref ? "Lesson" : "Try again"}
          </Go>
          {!up && lessonHref && againHref && (
            <Link className={s.second} href={againHref} data-rise>
              Try again
            </Link>
          )}
        </div>
      </div>
    </FlowStage>
  );
}
