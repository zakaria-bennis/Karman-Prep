"use client";
// Idea 3, "Karman in the stars" (founder, 2026-11-20). A round window of night sky, and in it a
// constellation that becomes Karman's face as the skill grows. Every star sits on a corner of the
// approved fox mark (Fox.tsx), so the finished figure is exactly his face:
//   Not started    one faint star, where his left eye will be
//   Learning       his left ear: three stars joined, the eye brighter (the lines in green)
//   Understanding  his ears, brow, left cheek and jaw, both eyes and the nose (the lines in blue)
//   Proficient     all of him; the lines turn gold from the nose outward, and a faint painting of
//                  Karman glows into the sky behind them like a nebula
// The change: the sky deepens and a shooting star crosses; then the new stars light one after
// another, each with a soft chime up the scale, a flash and a puff of stardust, and from each a
// line of light draws itself to the stars it joins. When the last is in place, the whole figure
// pulses, stardust bursts from it, and the sky keeps twinkling, with now and then a shooting star.
// The light is three.js (stageFx.ts) over a sky painted in CSS.
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef } from "react";
import { HEAD } from "@/components/portal/Fox";
import { prefersStill } from "@/lib/painting/motion";
import { GOLD, ICE, WARM, WHITE, stageFx, type Fx, type Light, type Thread } from "./stageFx";
import { chime, gather } from "./stageSound";
import s from "./starsStage.module.css";

const BOX: [number, number, number, number] = [-63, -99, 126, 126];
const SKY = { x: 0, y: -36, r: 61 };

const STARS = {
  eyeL: [-15, -28],
  earLb: [-30, -42],
  earL: [-34, -80],
  earLi: [-8, -56],
  top: [0, -58],
  earRi: [8, -56],
  earR: [34, -80],
  earRb: [30, -42],
  cheekL: [-40, -32],
  jawL: [-30, 0],
  chin: [0, 8],
  eyeR: [15, -28],
  nose: [0, -13],
  jawR: [30, 0],
  cheekR: [40, -32],
  muzL: [-16, -14],
  muzR: [16, -14],
} as const;
type StarName = keyof typeof STARS;
const NAMES = Object.keys(STARS) as StarName[];
/** The stars each level adds, in the order they light. */
const ADDS: StarName[][] = [
  ["eyeL"],
  ["earLb", "earL", "earLi"],
  ["top", "earRi", "earR", "earRb", "cheekL", "jawL", "chin", "eyeR", "nose"],
  ["jawR", "cheekR", "muzR", "muzL"],
];
const LINES: [StarName, StarName][] = [
  ["earLb", "earL"],
  ["earL", "earLi"],
  ["earLi", "top"],
  ["top", "earRi"],
  ["earRi", "earR"],
  ["earR", "earRb"],
  ["earLb", "cheekL"],
  ["cheekL", "jawL"],
  ["jawL", "chin"],
  ["chin", "jawR"],
  ["jawR", "cheekR"],
  ["cheekR", "earRb"],
  ["cheekR", "muzR"],
  ["muzR", "nose"],
  ["nose", "muzL"],
  ["muzL", "cheekL"],
  ["muzL", "chin"],
  ["muzR", "chin"],
];
/** The lines' color at each level: the stage's own (green, blue, gold). */
const LINE_COLOR = [ICE, [0.42, 0.92, 0.68], [0.5, 0.75, 1], GOLD];
const EYES: StarName[] = ["eyeL", "eyeR"];

const levelOf = (n: StarName) => ADDS.findIndex((a) => a.includes(n));
const litAt = (n: StarName, level: number) => levelOf(n) <= level;
const lineLevel = ([a, b]: [StarName, StarName]) => Math.max(levelOf(a), levelOf(b));

/** The sky at a level, still (the level row, and anywhere small). */
export function StarsMark({ level, size = 44 }: { level: number; size?: number }) {
  const c = LINE_COLOR[level].map((v) => Math.round(v * 255)).join(" ");
  return (
    <svg viewBox={BOX.join(" ")} width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="kp-stars-sky" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#24316a" />
          <stop offset="0.7" stopColor="#0d1336" />
          <stop offset="1" stopColor="#080b22" />
        </radialGradient>
      </defs>
      <circle cx={SKY.x} cy={SKY.y} r={SKY.r} fill="url(#kp-stars-sky)" />
      {level === 3 && <g opacity="0.3" dangerouslySetInnerHTML={{ __html: HEAD }} />}
      {LINES.filter((l) => lineLevel(l) <= level).map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={STARS[a][0]}
          y1={STARS[a][1]}
          x2={STARS[b][0]}
          y2={STARS[b][1]}
          stroke={`rgb(${c})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.85"
        />
      ))}
      {NAMES.filter((n) => litAt(n, level)).map((n) => (
        <circle
          key={n}
          cx={STARS[n][0]}
          cy={STARS[n][1]}
          r={EYES.includes(n) ? 5 : 3.6}
          fill="#fff"
          opacity={level === 0 ? 0.6 : 1}
        />
      ))}
    </svg>
  );
}

type Star = { on: number; flash: number; light: Light; base: number };

/** The constellation growing from `from` to `to`, played when `play` turns on. */
export function StarsStage({
  from,
  to,
  play,
  size = 240,
  onPeak,
}: {
  from: number;
  to: number;
  play: boolean;
  size?: number;
  onPeak?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dim = useRef<HTMLDivElement>(null);
  const nebula = useRef<SVGSVGElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const fx = useRef<Fx | null>(null);
  const stars = useRef<Record<StarName, Star> | null>(null);
  const threads = useRef<{ line: [StarName, StarName]; th: Thread }[]>([]);
  const level = useRef(from);
  const ready = useRef<Promise<void> | null>(null);
  const peak = useRef(onPeak);
  useEffect(() => {
    peak.current = onPeak;
  }, [onPeak]);

  // the sky: background stars, the constellation as it stands, twinkling, and shooting stars
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    let gone = false;
    ready.current = stageFx(cv, BOX, { lights: 160, sparks: 900, threads: 40 }).then((kit) => {
      if (!kit || gone) {
        kit?.stop();
        return;
      }
      fx.current = kit;
      // faint stars scattered over the sky, each twinkling at its own pace
      const field = Array.from({ length: 90 }, () => {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * SKY.r * 0.96;
        const l: Light = {
          x: SKY.x + Math.cos(a) * r,
          y: SKY.y + Math.sin(a) * r,
          size: 2 + Math.random() * 4,
          r: 0.8,
          g: 0.88,
          b: 1,
          a: 0.3,
        };
        kit.lights.push(l);
        return {
          l,
          tw: 1 + Math.random() * 3,
          ph: Math.random() * 6,
          top: 0.15 + Math.random() * 0.5,
        };
      });
      const all = {} as Record<StarName, Star>;
      NAMES.forEach((n) => {
        const eye = EYES.includes(n);
        const light: Light = {
          x: STARS[n][0],
          y: STARS[n][1],
          size: 0,
          r: 0.9,
          g: 0.95,
          b: 1,
          a: 0,
          flare: eye ? 1 : 0.55,
        };
        kit.lights.push(light);
        all[n] = { on: litAt(n, from) ? 1 : 0, flash: 0, light, base: eye ? 22 : 15 };
      });
      stars.current = all;
      threads.current = LINES.map((line) => {
        const [a, b] = line;
        const c = LINE_COLOR[Math.max(1, from)];
        const th: Thread = {
          x1: STARS[a][0],
          y1: STARS[a][1],
          x2: STARS[b][0],
          y2: STARS[b][1],
          p: lineLevel(line) <= from ? 1 : 0,
          width: 1.1,
          r: c[0],
          g: c[1],
          b: c[2],
          a: 0.75,
        };
        kit.threads.push(th);
        return { line, th };
      });
      let nextShot = 1.5 + Math.random() * 2;
      const shots: { x: number; y: number; vx: number; vy: number; age: number; th: Thread }[] = [];
      const shoot = () => {
        const a = Math.PI * (0.08 + Math.random() * 0.1);
        const th: Thread = {
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0,
          p: 1,
          width: 0.6,
          r: 0.9,
          g: 0.95,
          b: 1,
          a: 0,
        };
        kit.threads.push(th);
        shots.push({
          x: SKY.x - 52 + Math.random() * 10,
          y: Math.random() < 0.5 ? SKY.y - 34 - Math.random() * 6 : SKY.y + 30 + Math.random() * 6,
          vx: Math.cos(a) * 170,
          vy: Math.sin(a) * 170,
          age: 0,
          th,
        });
      };
      (kit as Fx & { shoot?: () => void }).shoot = shoot;
      kit.onFrame((dt, time) => {
        field.forEach((f) => {
          f.l.a = f.top * (0.55 + 0.45 * Math.sin(time * f.tw + f.ph));
        });
        const lv = level.current;
        NAMES.forEach((n, i) => {
          const st = all[n];
          const faint = lv === 0 ? 0.75 : 1;
          const twinkle = 0.85 + 0.15 * Math.sin(time * (2 + (i % 4)) + i);
          st.light.size = st.base * st.on * twinkle + st.flash * 30;
          st.light.a = Math.min(1, st.on * faint + st.flash);
        });
        // a line being drawn trails stardust from its head
        threads.current.forEach(({ th }) => {
          if (th.p > 0.02 && th.p < 0.98 && Math.random() < 0.8)
            kit.sparks.push({
              x: th.x1 + (th.x2 - th.x1) * th.p,
              y: th.y1 + (th.y2 - th.y1) * th.p,
              vx: (Math.random() - 0.5) * 20,
              vy: (Math.random() - 0.5) * 20,
              size: 4,
              r: th.r,
              g: th.g,
              b: th.b,
              life: 0.5,
              drag: 2,
              tw: 14,
            });
        });
        // now and then a shooting star
        nextShot -= dt;
        if (nextShot <= 0) {
          nextShot = 4 + Math.random() * 4;
          shoot();
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          const sh = shots[i];
          sh.age += dt;
          sh.x += sh.vx * dt;
          sh.y += sh.vy * dt;
          const len = 0.16;
          sh.th.x1 = sh.x - sh.vx * len;
          sh.th.y1 = sh.y - sh.vy * len;
          sh.th.x2 = sh.x;
          sh.th.y2 = sh.y;
          const out = Math.hypot(sh.x - SKY.x, sh.y - SKY.y) > SKY.r * 0.92;
          sh.th.a = out ? Math.max(0, sh.th.a - dt * 6) : Math.min(0.6, sh.age * 5);
          if (sh.age > 1.2) {
            kit.threads.splice(kit.threads.indexOf(sh.th), 1);
            shots.splice(i, 1);
          }
        }
      });
    });
    return () => {
      gone = true;
      fx.current?.stop();
      fx.current = null;
    };
  }, [from]);

  // the change
  useLayoutEffect(() => {
    if (!play || from === to) return;
    let line: gsap.core.Timeline | null = null;
    let dead = false;
    const run = () => {
      const kit = fx.current;
      const all = stars.current;
      if (dead) return;
      const step = to;
      if (!kit || !all || prefersStill()) {
        level.current = to;
        if (nebula.current && to === 3) nebula.current.style.opacity = "0.32";
        peak.current?.();
        return;
      }
      line = gsap.timeline();
      gather(0.55);
      // the sky deepens and a shooting star crosses
      line
        .to(dim.current, { opacity: 0.3, duration: 0.4, ease: "power2.out" }, 0)
        .add(() => (kit as Fx & { shoot?: () => void }).shoot?.(), 0.05);
      const adds = ADDS.slice(from + 1, to + 1).flat();
      const gap = step === 3 ? 0.16 : step === 2 ? 0.13 : 0.24;
      let at = 0.5;
      // from the faint first star: it brightens before the rest
      if (from === 0)
        line.add(() => {
          level.current = to;
        }, 0.35);
      const lit = new Set(NAMES.filter((n) => litAt(n, from)));
      adds.forEach((n, k) => {
        const st = all[n];
        line!
          .add(() => {
            chime(k + (from === 0 ? 0 : 2));
            const [x, y] = STARS[n];
            kit.burst({ x, y, count: 14, speed: 60, colors: [ICE, WHITE], size: 4, life: 0.6 });
          }, at)
          .fromTo(
            st,
            { on: 0, flash: 1 },
            { on: 1, flash: 0, duration: 0.5, ease: "power3.out", immediateRender: false },
            at
          );
        lit.add(n);
        // every line this star completes draws out from the star already there
        threads.current.forEach(({ line: l, th }) => {
          if (th.p > 0 || !l.includes(n) || !lit.has(l[0]) || !lit.has(l[1]) || lineLevel(l) > to)
            return;
          const fromStar = l[0] === n ? l[1] : l[0];
          [th.x1, th.y1] = STARS[fromStar];
          [th.x2, th.y2] = STARS[n];
          const c = LINE_COLOR[to];
          [th.r, th.g, th.b] = c;
          line!.fromTo(
            th,
            { p: 0 },
            { p: 1, duration: 0.24, ease: "power2.inOut", immediateRender: false },
            at - 0.18
          );
          th.p = 0.0001;
        });
        at += gap;
      });
      // the lines already drawn take the new stage's color
      const c = LINE_COLOR[to];
      threads.current.forEach(({ line: l, th }) => {
        if (lineLevel(l) <= from) line!.to(th, { r: c[0], g: c[1], b: c[2], duration: 0.6 }, 0.4);
      });
      line.add(() => {
        level.current = to;
      }, 0.5);
      // complete: the whole figure pulses, stardust bursts from it
      const done = at + 0.1;
      line
        .add(() => {
          peak.current?.();
          kit.burst({
            x: 0,
            y: -36,
            count: [0, 120, 240, 420][step],
            speed: 90 + step * 30,
            colors: step === 3 ? [GOLD, WARM, WHITE] : [ICE, WHITE, LINE_COLOR[step]],
            size: 4,
            life: 1.2 + step * 0.2,
          });
        }, done)
        .to(
          NAMES.filter((n) => litAt(n, to)).map((n) => all[n]),
          { keyframes: { flash: [0, 0.45, 0] }, duration: 0.7, stagger: 0.02, ease: "sine.inOut" },
          done
        )
        .to(dim.current, { opacity: 0, duration: 0.8 }, done);
      // the top: the lines turn gold from the nose outward, and Karman glows in behind them
      if (step === 3) {
        threads.current.forEach(({ th }) => {
          const d = Math.hypot(
            (th.x1 + th.x2) / 2 - STARS.nose[0],
            (th.y1 + th.y2) / 2 - STARS.nose[1]
          );
          line!.to(
            th,
            { r: GOLD[0], g: GOLD[1], b: GOLD[2], a: 1, width: 1.4, duration: 0.4 },
            done + d * 0.01
          );
        });
        line
          .fromTo(
            nebula.current,
            { opacity: 0, scale: 0.9 },
            { opacity: 0.32, scale: 1, duration: 1.2, ease: "power2.out" },
            done
          )
          .fromTo(
            ring.current,
            { opacity: 0, scale: 0.85 },
            { opacity: 1, scale: 1, duration: 0.8, ease: "expo.out" },
            done
          )
          .add(() => (kit as Fx & { shoot?: () => void }).shoot?.(), done + 0.3)
          .add(() => (kit as Fx & { shoot?: () => void }).shoot?.(), done + 0.7);
      }
    };
    // the sky may still be starting
    void (ready.current ?? Promise.resolve()).then(run);
    return () => {
      dead = true;
      line?.kill();
    };
  }, [play, from, to]);

  return (
    <div className={s.stage} style={{ width: size, height: size }}>
      <div className={s.ring} ref={ring} />
      <div className={s.sky} />
      <div className={s.dim} ref={dim} />
      <svg
        ref={nebula}
        className={s.nebula}
        viewBox={BOX.join(" ")}
        aria-hidden="true"
        style={{ opacity: from === 3 ? 0.32 : 0 }}
      >
        <g dangerouslySetInnerHTML={{ __html: HEAD }} />
      </svg>
      <canvas ref={canvas} className={s.light} />
    </div>
  );
}
