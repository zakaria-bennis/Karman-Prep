"use client";
// The daily challenge's ending, right side (founder, 2026-11-24, approved mockup
// prototypes/challenge-end-mockups.html): each question beside everyone who played it today
// (the share who got it right, the student's time against the average, the bars of who picked
// what), then Leave and Review. Left side: the multiplier rolling up (MultiplierRoll).
import { useEffect, useRef, useState } from "react";
import { prefersStill } from "@/lib/painting/motion";
import { formatClock } from "@/lib/student/time-trial";
import type { ChallengeResultView } from "./end-view";
import { Go } from "./endParts";
import c from "./challengeResults.module.css";

/** A whole percent that counts up from 0 once shown. */
function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(() => (prefersStill() ? to : 0));
  useEffect(() => {
    if (prefersStill()) return setN(to);
    const t0 = performance.now();
    let id = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1200);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [to]);
  return <>{n}</>;
}

function Result({ r, at }: { r: ChallengeResultView; at: number }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setFilled(true), prefersStill() ? 0 : 350 + at * 250);
    return () => window.clearTimeout(id);
  }, [at]);
  const crowd = r.crowd;
  const pace =
    r.seconds === null || crowd?.averageSeconds == null
      ? undefined
      : r.seconds <= crowd.averageSeconds
        ? "fast"
        : "slow";
  return (
    <li className={c.q} style={{ animationDelay: `${at * 0.2}s` }}>
      <p className={c.head}>
        <b>{r.subject}</b>
        <span className={c.res} data-ok={r.ok || undefined}>
          {r.ok ? "Correct" : "Incorrect"}
        </span>
      </p>
      {crowd ? (
        <>
          <div className={c.nums}>
            <p>
              <b className={c.v}>
                <CountUp to={crowd.rightPercent} />%
              </b>
              <small>got it right</small>
            </p>
            {r.seconds !== null && (
              <p>
                <b className={c.v} data-pace={pace}>
                  {formatClock(r.seconds)}
                </b>
                {crowd.averageSeconds !== null && (
                  <small>average {formatClock(crowd.averageSeconds)}</small>
                )}
              </p>
            )}
          </div>
          <ul className={c.picks} aria-label="Picks">
            {crowd.picks.map((p) => (
              <li
                key={p.label}
                className={c.pick}
                data-right={p.right || undefined}
                data-mine={p.mine || undefined}
              >
                <b>{p.label}</b>
                <span className={c.bar}>
                  <i style={{ width: filled ? `${p.percent}%` : 0 }} />
                </span>
                <span>{p.percent}%</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className={c.few}>Too few players yet</p>
      )}
    </li>
  );
}

export function ChallengeResults({
  results,
  onLeave,
  onReview,
}: {
  results: ChallengeResultView[];
  onLeave(): void;
  onReview?: () => void;
}) {
  const leave = useRef(onLeave);
  leave.current = onLeave;
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && leave.current();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div className={c.results}>
      <button type="button" className={c.x} aria-label="Close" onClick={onLeave}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <ol className={c.list}>
        {results.map((r, i) => (
          <Result key={r.subject} r={r} at={i} />
        ))}
      </ol>
      <div className={c.acts} data-next>
        <button type="button" className={c.leave} onClick={onLeave}>
          Leave
        </button>
        {onReview && <Go onClick={onReview}>Review</Go>}
      </div>
    </div>
  );
}

/** "×1.25", always two places, so a digit always has one to roll from ("×1.20" to "×1.25"). */
function times(n: number) {
  return `×${n.toFixed(2)}`;
}

/** The challenge multiplier rolling up from yesterday's to today's, each changed digit turning
 *  over like a counter (founder's pick 3A, 2026-11-24). Still when less motion is asked for. */
export function MultiplierRoll({ before, after }: { before: number; after: number }) {
  const from = times(before);
  const to = times(after);
  const [rolled, setRolled] = useState(false);
  useEffect(() => {
    if (prefersStill()) return setRolled(true);
    const id = window.setTimeout(() => setRolled(true), 900);
    return () => window.clearTimeout(id);
  }, []);
  const width = Math.max(from.length, to.length);
  const a = from.padEnd(width, " ");
  const b = to.padEnd(width, " ");
  return (
    <p className={c.roll} aria-label={`Multiplier ${to}`} data-up={after > before || undefined}>
      {[...b].map((ch, i) =>
        a[i] === ch ? (
          <span key={i} aria-hidden="true">
            {ch}
          </span>
        ) : (
          <span key={i} className={c.win} aria-hidden="true">
            <span className={c.reel} data-rolled={rolled || undefined}>
              <span>{a[i]}</span>
              <span>{ch}</span>
            </span>
          </span>
        )
      )}
    </p>
  );
}
