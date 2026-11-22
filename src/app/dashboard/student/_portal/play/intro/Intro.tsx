"use client";
// From the last question into the ending (founder, 2026-11-19: "a crazy good animation ... right as
// you submit your last question"; then: the shatter only, and "a singularity animation that
// explodes into the final card"). The last question is the player's own live quiz screen, still
// drawn underneath (PlayLayer.tsx); the ending (ActivityEnd.tsx) mounts over it, unseen, and this
// carries the screen away at once:
//   singularity  the screen is pulled into a black hole that collapses to a point and explodes into
//                the ending (introSingularity.ts)
//   shatter      the glass breaks into shards that close up into the ring (introShatter.ts)
// The moment the screen is drawn on the canvas it is taken (onTaken: its glass hidden, its landscape
// kept); the ending begins to open when the transition lands (onLanded) and the layer goes when it
// is over (onGone). The ending plays none of it when less motion is asked for.
import { useEffect, useRef, type RefObject } from "react";
import type { Run } from "./introKit";
import { shatter } from "./introShatter";
import { singularity } from "./introSingularity";
import q from "./intro.module.css";

export const INTROS = { singularity, shatter } as const;
export type IntroKind = keyof typeof INTROS;

export function Intro({
  kind,
  card,
  target,
  onTaken,
  onLanded,
  onGone,
}: {
  kind: IntroKind;
  /** The quiz screen to carry away (the player's `[data-quiz-shell]`). */
  card: HTMLElement;
  /** The ending's ring, where the transition ends. */
  target: RefObject<SVGSVGElement | null>;
  onTaken: () => void;
  onLanded: () => void;
  onGone: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  // the latest handlers, so a parent's new functions never restart the transition
  const told = useRef({ onTaken, onLanded, onGone });
  useEffect(() => {
    told.current = { onTaken, onLanded, onGone };
  }, [onTaken, onLanded, onGone]);

  useEffect(() => {
    if (!canvas.current) return;
    // from here the quiz is only a picture: presses go through to the ending
    card.style.pointerEvents = "none";
    const run: Run = INTROS[kind];
    return run({
      card,
      canvas: canvas.current,
      flash: flash.current,
      veil: veil.current,
      ring: target.current?.getBoundingClientRect() ?? null,
      onTaken: () => told.current.onTaken(),
      onLanded: () => told.current.onLanded(),
      onGone: () => told.current.onGone(),
    });
  }, [kind, card, target]);

  return (
    <div className={q.layer} aria-hidden="true">
      <div className={q.veil} ref={veil} />
      <canvas className={q.canvas} ref={canvas} />
      <div className={q.flash} ref={flash} />
    </div>
  );
}
