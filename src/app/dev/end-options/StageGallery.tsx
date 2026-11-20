"use client";
// /dev/end-options?v=stages: the three metamorphoses side by side, every step of each, so the
// founder can choose one (2026-11-20). Each plays on its own, and again on a press.
import { useEffect, useState } from "react";
import { LEVELS } from "../shell/skills72";
import { MORPHS, Metamorph, MorphKindContext } from "./Metamorph";
import g from "./stageGallery.module.css";

const NAMES = { butterfly: "Butterfly", bloom: "Bloom", crystal: "Crystal" } as const;

function Cell({ from }: { from: number }) {
  const [round, setRound] = useState(0);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    setPlay(false);
    const timer = window.setTimeout(() => setPlay(true), 900 + from * 250);
    return () => window.clearTimeout(timer);
  }, [round, from]);
  return (
    <button type="button" className={g.cell} onClick={() => setRound((r) => r + 1)}>
      <Metamorph key={round} from={from} to={from + 1} play={play} size={150} />
      <span>
        {LEVELS[from]} to {LEVELS[from + 1]}
      </span>
    </button>
  );
}

export function StageGallery() {
  return (
    <main className={g.page}>
      {MORPHS.map((kind) => (
        <MorphKindContext.Provider key={kind} value={kind}>
          <section className={g.row}>
            <h2>{NAMES[kind]}</h2>
            {[0, 1, 2].map((from) => (
              <Cell key={from} from={from} />
            ))}
          </section>
        </MorphKindContext.Provider>
      ))}
    </main>
  );
}
