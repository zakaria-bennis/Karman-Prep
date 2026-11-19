"use client";
// From the last question into the ending (founder, 2026-11-19: "a crazy good animation ... right as
// you submit your last question"; then "try again ... make all three options"). The last question
// sits on its glass card; Submit (pressed here after a moment, for the demo) lights the chosen answer
// and the card holds for a beat; then one of four transitions carries it into the ending:
//   shatter    it breaks into shards of glass that close up into the ring (introShatter.ts)
//   plane      it folds into a paper plane that flies a loop and draws the ring (introPlane.ts)
//   fireflies  it melts into glowing specks that drift, then swarm into the ring (introFireflies.ts)
//   flip       it turns over in 3D, its back the ending's left pane, and lands there (introFlip.ts)
// With less motion asked for, none of them plays.
import gsap from "gsap";
import { useEffect, useRef, useState, type RefObject } from "react";
import { prefersStill } from "@/lib/painting/motion";
import { fireflies } from "./introFireflies";
import { flip } from "./introFlip";
import type { Run } from "./introKit";
import { plane } from "./introPlane";
import { shatter } from "./introShatter";
import q from "./intro.module.css";

export const INTROS = { shatter, plane, fireflies, flip } as const;
export type IntroKind = keyof typeof INTROS;

const CHOICES = ["3", "5", "10", "25"];
const PICKED = 1;

export function Intro({
  kind,
  mode,
  target,
  onLanded,
}: {
  kind: IntroKind;
  mode: "light" | "dark";
  /** The ending's ring, where the transition ends. */
  target: RefObject<SVGSVGElement | null>;
  onLanded: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"asking" | "sent" | "going" | "gone">("asking");
  const landed = useRef(onLanded);
  useEffect(() => {
    landed.current = onLanded;
  }, [onLanded]);

  // with less motion asked for, straight to the ending
  useEffect(() => {
    if (prefersStill()) {
      setState("gone");
      landed.current();
    }
  }, []);

  // the card arrives as the last question, then is sent (pressed here after a moment, for the demo)
  useEffect(() => {
    if (state !== "asking" || !card.current || prefersStill()) return;
    gsap.fromTo(
      card.current,
      { y: 30, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "expo.out" }
    );
    const timer = window.setTimeout(() => setState("sent"), 1700);
    return () => window.clearTimeout(timer);
  }, [state]);

  // sent: the answer lights, the button sinks, the card holds its breath
  useEffect(() => {
    if (state !== "sent" || !card.current) return;
    const el = card.current;
    const line = gsap.timeline({ onComplete: () => setState("going") });
    line
      .to(el.querySelector("[data-submit]"), { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 })
      .fromTo(
        el.querySelector("[data-picked]"),
        { scale: 1 },
        { scale: 1.03, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" },
        0.1
      )
      .to(el, { scale: 1.015, duration: 0.5, ease: "sine.inOut" }, 0.3);
    if (kind === "shatter")
      line.to(el, { x: -2, duration: 0.04, yoyo: true, repeat: 5, ease: "none" }, 0.75);
    else line.to(el, { scale: 1, duration: 0.25, ease: "power2.in" }, 0.8);
    return () => void line.kill();
  }, [state, kind]);

  // going: the chosen transition carries the card into the ending
  useEffect(() => {
    if (state !== "going" || !card.current || !canvas.current) return;
    // from here the card is only a picture: presses go through to the ending
    card.current.style.pointerEvents = "none";
    const run: Run = INTROS[kind];
    return run({
      card: card.current,
      canvas: canvas.current,
      flash: flash.current,
      ring: target.current?.getBoundingClientRect() ?? null,
      side: document.querySelector<HTMLElement>("[data-pane]"),
      onLanded: () => landed.current(),
      onGone: () => setState("gone"),
    });
  }, [state, kind, target]);

  if (state === "gone") return null;
  return (
    <div className={q.layer} data-mode={mode}>
      <div className={q.flash} ref={flash} aria-hidden="true" />
      <canvas className={q.canvas} ref={canvas} aria-hidden="true" />
      <div className={q.card} ref={card} role="group" aria-label="Question 8 of 8">
        <p className={q.count} data-text>
          Question 8 of 8
        </p>
        <p className={q.ask} data-text>
          A circle in the xy-plane has the equation (x − 3)² + (y + 2)² = 25. What is the radius of
          the circle?
        </p>
        <ol className={q.choices}>
          {CHOICES.map((c, i) => (
            <li
              key={c}
              className={q.choice}
              data-edge
              data-picked={i === PICKED || undefined}
              data-right={(i === PICKED && state !== "asking") || undefined}
            >
              <span className={q.letter} data-text>
                {"ABCD"[i]}
              </span>
              <span className={q.value} data-text>
                {c}
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={q.submit}
          data-submit
          onClick={() => setState("sent")}
          disabled={state !== "asking"}
        >
          <span data-text>Submit</span>
        </button>
      </div>
    </div>
  );
}
