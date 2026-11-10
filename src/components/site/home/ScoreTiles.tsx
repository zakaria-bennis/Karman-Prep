"use client";

// The guarantee, made personal. The parent sets their student's score today, and the tiles beneath flip, one
// digit after another like a departures board, to the score Karman guarantees for that start. A switch picks
// private tutoring or the cohort. From the score where no guarantee is sold, it says so plainly. When the
// guaranteed score changes, a few leaves burst from the tiles (lib/painting/journey.ts listens for
// "karman:burst"). The numbers come from offer.ts (GUARANTEE_TIERS), passed in by the page with every word.
import { useEffect, useRef, useState } from "react";
import Seg from "./Seg";

export interface Band {
  upTo: number;
  private: number;
  cohort: number;
}
export type TileWords = Record<
  "private" | "cohort" | "track" | "now" | "lower" | "higher" | "promise" | "none",
  string
>;

const MIN = 800;
const MAX = 1550;

function Tiles({ value, won }: { value: number; won?: boolean }) {
  return (
    <span className={`tiles ${won ? "won" : ""}`} aria-hidden="true">
      {String(value)
        .padStart(4, " ")
        .split("")
        .map((d, i) => (
          /* a new key for a new digit, so only the tiles that change flip */
          <span
            className="t"
            key={`${i}-${d}`}
            style={{ animationDelay: `${i * (won ? 90 : 0)}ms` }}
          >
            {d}
          </span>
        ))}
    </span>
  );
}

export default function ScoreTiles({
  bands,
  noGuaranteeFrom,
  words,
}: {
  bands: Band[];
  noGuaranteeFrom: number;
  words: TileWords;
}) {
  const [track, setTrack] = useState(0);
  const [start, setStart] = useState(1200);
  const won = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const key = track === 0 ? "private" : "cohort";
  const gain =
    start >= noGuaranteeFrom ? null : (bands.find((b) => start <= b.upTo)?.[key] ?? null);
  const target = gain === null ? null : Math.min(1600, start + gain);
  const change = (by: number) => setStart((s) => Math.max(MIN, Math.min(MAX, s + by)));

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const r = won.current?.getBoundingClientRect();
    if (r && target !== null)
      document.dispatchEvent(
        new CustomEvent("karman:burst", {
          detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        })
      );
  }, [target]);

  return (
    <div className="score">
      <Seg
        labels={[words.private, words.cohort]}
        value={track}
        onChange={setTrack}
        label={words.track}
      />
      <div className="score-row">
        <span className="score-lab">{words.now}</span>
        <span className="score-set" role="group" aria-label={words.now}>
          <button type="button" aria-label={words.lower} onClick={() => change(-10)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 10h10" />
            </svg>
          </button>
          <Tiles value={start} />
          <output className="sr" aria-live="polite">
            {start}
          </output>
          <button type="button" aria-label={words.higher} onClick={() => change(10)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 10h10M10 5v10" />
            </svg>
          </button>
        </span>
      </div>
      {target === null ? (
        <p className="score-none" aria-live="polite">
          {words.none}
        </p>
      ) : (
        <div className="score-row" ref={won}>
          <span className="score-lab">{words.promise}</span>
          <Tiles value={target} won />
          <output className="sr" aria-live="polite">
            {words.promise} {target}
          </output>
        </div>
      )}
    </div>
  );
}
