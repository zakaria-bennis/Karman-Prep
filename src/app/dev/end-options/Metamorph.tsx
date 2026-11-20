"use client";
// A skill's level drawn as a living thing that changes from one stage to the next (founder,
// 2026-11-20: "a metamorphosis between not started to learning, learning to understanding,
// understanding to proficient", the celebration as big as the step). Three to choose from:
//   butterfly  an egg, a caterpillar, a chrysalis, a butterfly
//   bloom      a seed, a sprout, a bud, a flower
//   crystal    a pebble, a first crystal, a cluster, a cut gem
// The change: the old stage trembles, harder for a bigger step, and folds into a ball of light that
// bursts; the new one comes out of it, growing its own way (wings unfolding, petals opening,
// crystals shooting up). Drawn in code; no pictures.
import gsap from "gsap";
import { createContext, useContext, useId, useLayoutEffect, useRef } from "react";
import { art, Paints } from "./stageArt";
import { prefersStill } from "@/lib/painting/motion";
import mm from "./metamorph.module.css";

export const MORPHS = ["butterfly", "bloom", "crystal"] as const;
export type MorphKind = (typeof MORPHS)[number];
/** Which of the three the page shows (page.tsx, ?stage=). */
export const MorphKindContext = createContext<MorphKind>("butterfly");

/** The new stage grows in its own way, out of the ball of light. */
function grow(line: gsap.core.Timeline, el: Element, at: number) {
  const q = (s: string) => Array.from(el.querySelectorAll(s));
  line
    .fromTo(
      el,
      { scale: 0.35, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.45,
        ease: "back.out(2.2)",
        smoothOrigin: false,
        svgOrigin: "60 60",
      },
      at
    )
    .fromTo(
      q("[data-pop]"),
      { scale: 0 },
      {
        scale: 1,
        duration: 0.5,
        stagger: 0.05,
        ease: "back.out(2.4)",
        smoothOrigin: false,
        transformOrigin: "50% 100%",
      },
      at + 0.02
    )
    .fromTo(
      q("[data-stem]"),
      { scaleY: 0 },
      {
        scaleY: 1,
        duration: 0.4,
        ease: "power3.out",
        smoothOrigin: false,
        transformOrigin: "50% 100%",
      },
      at
    )
    .fromTo(
      q("[data-leaf]"),
      { scale: 0 },
      {
        scale: 1,
        duration: 0.55,
        stagger: 0.06,
        ease: "elastic.out(1, 0.5)",
        smoothOrigin: false,
        svgOrigin: "60 70",
      },
      at + 0.15
    )
    .fromTo(
      q("[data-petal]"),
      { scale: 0, rotation: -70 },
      {
        scale: 1,
        rotation: 0,
        duration: 0.6,
        stagger: 0.04,
        ease: "back.out(2)",
        smoothOrigin: false,
        svgOrigin: "60 32",
      },
      at + 0.2
    )
    .fromTo(
      q("[data-grow]"),
      { scaleY: 0 },
      {
        scaleY: 1,
        duration: 0.5,
        stagger: 0.08,
        ease: "back.out(2.6)",
        smoothOrigin: false,
        svgOrigin: "60 86",
      },
      at + 0.05
    )
    .fromTo(
      q("[data-drop]"),
      { y: -40, scaleY: 0.6 },
      {
        y: 0,
        scaleY: 1,
        duration: 0.6,
        ease: "bounce.out",
        smoothOrigin: false,
        svgOrigin: "60 30",
      },
      at
    )
    .fromTo(
      q("[data-glint]"),
      { scale: 0, rotation: -90 },
      {
        scale: 1.3,
        rotation: 0,
        duration: 0.5,
        ease: "back.out(3)",
        smoothOrigin: false,
        svgOrigin: "78 31",
        yoyo: true,
        repeat: 1,
      },
      at + 0.35
    );
  // wings unfold from the body, then beat
  const wings = q("[data-wing]");
  if (wings.length)
    line
      .fromTo(
        wings,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.45,
          ease: "back.out(1.8)",
          smoothOrigin: false,
          svgOrigin: "60 60",
        },
        at + 0.1
      )
      .to(
        wings,
        {
          scaleX: 0.35,
          duration: 0.14,
          yoyo: true,
          repeat: 5,
          ease: "sine.inOut",
          smoothOrigin: false,
          svgOrigin: "60 60",
        },
        at + 0.6
      );
}

/** A stage, still: the level a skill is at. */
export function StageMark({ level, size = 44 }: { level: number; size?: number }) {
  const kind = useContext(MorphKindContext);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <Paints id={id} />
      {art(kind, level, id)}
    </svg>
  );
}

/** The change from `from` to `to`, played when `play` turns on. `onPeak` is the moment it bursts
 *  into the new stage, for the sound and the confetti. The bigger the step, the more it shakes,
 *  the brighter it bursts, and the more sparkles fly. */
export function Metamorph({
  from,
  to,
  play,
  size = 150,
  onPeak,
}: {
  from: number;
  to: number;
  play: boolean;
  size?: number;
  onPeak?: () => void;
}) {
  const kind = useContext(MorphKindContext);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const peak = useRef(onPeak);
  useLayoutEffect(() => {
    peak.current = onPeak;
  }, [onPeak]);
  const m = Math.max(1, Math.min(3, to));
  const sparkCount = 8 + m * 8;

  useLayoutEffect(() => {
    const el = svg.current;
    if (!el || !play || from === to) return;
    const q = (s: string) => el.querySelector(s);
    const old = q("[data-old]");
    const next = q("[data-new]");
    const glow = q("[data-glow]");
    const orb = q("[data-orb]");
    const rays = q("[data-rays]");
    const sparks = Array.from(el.querySelectorAll("[data-spark]"));
    if (!old || !next) return;
    if (prefersStill()) {
      gsap.set(old, { opacity: 0 });
      gsap.set(next, { opacity: 1 });
      peak.current?.();
      return;
    }
    const shake = 3 + m * 3;
    const line = gsap.timeline();
    line
      .fromTo(
        glow,
        { opacity: 0, scale: 0.6 },
        {
          opacity: 0.55 + m * 0.15,
          scale: 1,
          duration: 0.6,
          ease: "power2.out",
          smoothOrigin: false,
          svgOrigin: "60 60",
        },
        0
      )
      // it trembles, harder for a bigger step
      .to(
        old,
        {
          keyframes: {
            rotation: [-shake, shake, -shake * 1.3, shake * 1.3, -shake * 1.6, shake * 1.6, 0],
          },
          duration: 0.5,
          ease: "none",
          smoothOrigin: false,
          svgOrigin: "60 80",
        },
        0
      )
      // folds into a ball of light
      .to(
        old,
        {
          scale: 0.1,
          opacity: 0,
          duration: 0.18,
          ease: "power3.in",
          smoothOrigin: false,
          svgOrigin: "60 60",
        },
        0.5
      )
      .fromTo(
        orb,
        { scale: 0, opacity: 1 },
        { scale: 1, duration: 0.2, ease: "power3.in", smoothOrigin: false, svgOrigin: "60 60" },
        0.5
      )
      .add(() => peak.current?.(), 0.7)
      // and bursts
      .to(
        orb,
        {
          scale: 2.2 + m * 0.6,
          opacity: 0,
          duration: 0.45,
          ease: "expo.out",
          smoothOrigin: false,
          svgOrigin: "60 60",
        },
        0.7
      )
      .to(glow, { opacity: 0.35, duration: 0.8 }, 0.9);
    sparks.forEach((s, i) => {
      const a = (i / sparks.length) * Math.PI * 2 + Math.random() * 0.4;
      const d = 40 + m * 14 + Math.random() * 20;
      line.fromTo(
        s,
        { x: 0, y: 0, opacity: 1, scale: 1 },
        {
          x: Math.cos(a) * d,
          y: Math.sin(a) * d,
          opacity: 0,
          scale: 0.3,
          duration: 0.7 + Math.random() * 0.3,
          ease: "power3.out",
        },
        0.7
      );
    });
    if (m === 3 && rays)
      line.fromTo(
        rays,
        { opacity: 0, scale: 0.4 },
        {
          opacity: 0.9,
          scale: 1,
          duration: 0.5,
          ease: "back.out(2)",
          smoothOrigin: false,
          svgOrigin: "60 60",
        },
        0.7
      );
    grow(line, next, 0.72);
    return () => {
      line.kill();
      // back to as drawn, so a second run starts clean
      gsap.set(el.querySelectorAll("g, circle, path"), { clearProps: "transform,opacity" });
    };
  }, [play, from, to, m]);

  return (
    <svg
      ref={svg}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      overflow="visible"
      aria-hidden="true"
    >
      <Paints id={id} />
      <g data-rays opacity="0">
        <g className={mm.spin}>
          {Array.from({ length: 12 }, (_, k) => (
            <path
              key={k}
              d="M60 60 L57 -6 L63 -6Z"
              fill="#ffd166"
              opacity="0.5"
              transform={`rotate(${k * 30} 60 60)`}
            />
          ))}
        </g>
      </g>
      <circle data-glow cx="60" cy="60" r="56" fill={`url(#${id}-glow)`} opacity="0" />
      <g data-old>{art(kind, from, id)}</g>
      <g data-new opacity="0">
        {art(kind, to, id)}
      </g>
      <circle data-orb cx="60" cy="60" r="22" fill={`url(#${id}-glow)`} opacity="0" />
      <g>
        {Array.from({ length: sparkCount }, (_, k) => (
          <circle
            key={k}
            data-spark
            cx="60"
            cy="60"
            r={k % 3 ? 2.2 : 3.4}
            fill={k % 2 ? "#fff6d8" : "#ffd166"}
            opacity="0"
          />
        ))}
      </g>
    </svg>
  );
}
