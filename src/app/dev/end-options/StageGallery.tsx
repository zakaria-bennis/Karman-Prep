"use client";
// /dev/end-options?v=stages: Karman's tails growing at every step, side by side (founder,
// 2026-11-20). Each plays on its own, and again on a press.
import { useEffect, useState } from "react";
import { LEVELS } from "../shell/skills72";
import { TailsStage } from "./TailsStage";
import g from "./stageGallery.module.css";

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
      <TailsStage key={round} from={from} to={from + 1} play={play} size={280} />
      <span>
        {LEVELS[from]} to {LEVELS[from + 1]}
      </span>
    </button>
  );
}

export function StageGallery() {
  return (
    <main className={g.page}>
      <section className={g.row}>
        <h2>Karman grows tails</h2>
        <div className={g.cells}>
          {[0, 1, 2].map((from) => (
            <Cell key={from} from={from} />
          ))}
        </div>
      </section>
    </main>
  );
}
