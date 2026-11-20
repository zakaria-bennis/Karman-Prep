"use client";
// /dev/end-options?v=stages: the two ways of drawing a skill's stage side by side, every step of
// each, so the founder can choose one (2026-11-20). Each plays on its own, and again on a press.
import { useEffect, useState } from "react";
import { LEVELS } from "../shell/skills72";
import { STAGES, StageChange, StageKindContext } from "./Stage";
import g from "./stageGallery.module.css";

const NAMES = { tails: "Karman grows tails", stars: "Karman in the stars" } as const;

function Cell({ from }: { from: number }) {
  const [round, setRound] = useState(0);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    setPlay(false);
    const timer = window.setTimeout(() => setPlay(true), 1200 + from * 300);
    return () => window.clearTimeout(timer);
  }, [round, from]);
  return (
    <button type="button" className={g.cell} onClick={() => setRound((r) => r + 1)}>
      <StageChange key={round} from={from} to={from + 1} play={play} size={240} />
      <span>
        {LEVELS[from]} to {LEVELS[from + 1]}
      </span>
    </button>
  );
}

export function StageGallery() {
  return (
    <main className={g.page}>
      {STAGES.map((kind) => (
        <StageKindContext.Provider key={kind} value={kind}>
          <section className={g.row}>
            <h2>{NAMES[kind]}</h2>
            <div className={g.cells}>
              {[0, 1, 2].map((from) => (
                <Cell key={from} from={from} />
              ))}
            </div>
          </section>
        </StageKindContext.Provider>
      ))}
    </main>
  );
}
