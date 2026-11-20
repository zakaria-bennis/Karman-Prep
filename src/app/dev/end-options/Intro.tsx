"use client";
// From the last question into the ending (founder, 2026-11-19: "a crazy good animation ... right as
// you submit your last question"; then: the shatter only, and "a singularity animation that
// explodes into the final card"). The last question is the real quiz screen (LastQuestion.tsx).
// Finish hands it to one of two transitions:
//   singularity  the screen is pulled into a black hole that collapses to a point and explodes into
//                the ending (introSingularity.ts)
//   shatter      the glass breaks into shards that close up into the ring (introShatter.ts)
// The landscape behind stays put: it is the ending's own, under the quiz's glass. With less motion
// asked for, neither plays.
import { useEffect, useRef, useState, type RefObject } from "react";
import { prefersStill } from "@/lib/painting/motion";
import type { Run } from "./introKit";
import { shatter } from "./introShatter";
import { singularity } from "./introSingularity";
import { LastQuestion } from "./LastQuestion";
import q from "./intro.module.css";

export const INTROS = { singularity, shatter } as const;
export type IntroKind = keyof typeof INTROS;

export function Intro({
  kind,
  mode,
  answers,
  target,
  onLanded,
}: {
  kind: IntroKind;
  mode: "light" | "dark";
  /** Which of the set's questions were right, for the quiz's dots. */
  answers: boolean[];
  /** The ending's ring, where the transition ends. */
  target: RefObject<SVGSVGElement | null>;
  onLanded: () => void;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"asking" | "going" | "gone">("asking");
  const landed = useRef(onLanded);
  useEffect(() => {
    landed.current = onLanded;
  }, [onLanded]);

  // going: the chosen transition carries the quiz into the ending
  useEffect(() => {
    if (state !== "going") return;
    if (prefersStill()) {
      landed.current();
      setState("gone");
      return;
    }
    const card = layer.current?.querySelector<HTMLElement>("[data-quiz-shell]");
    if (!card || !canvas.current) return;
    // from here the quiz is only a picture: presses go through to the ending
    card.style.pointerEvents = "none";
    const run: Run = INTROS[kind];
    return run({
      card,
      canvas: canvas.current,
      flash: flash.current,
      veil: veil.current,
      ring: target.current?.getBoundingClientRect() ?? null,
      side: document.querySelector<HTMLElement>("[data-pane]"),
      onLanded: () => landed.current(),
      onGone: () => setState("gone"),
    });
  }, [state, kind, target]);

  if (state === "gone") return null;
  return (
    <div className={q.layer} data-mode={mode} ref={layer}>
      <LastQuestion answers={answers} onFinish={() => setState("going")} />
      <div className={q.veil} ref={veil} aria-hidden="true" />
      <canvas className={q.canvas} ref={canvas} aria-hidden="true" />
      <div className={q.flash} ref={flash} aria-hidden="true" />
    </div>
  );
}
