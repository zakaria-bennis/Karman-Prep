"use client";
// Idea 1, "Karman grows tails" (founder, 2026-11-20). In the old stories a fox grows another tail
// each time it grows wiser; here Karman grows them with the student's skill:
//   Not started    curled up asleep, one tail laid low, a few z's drifting up
//   Learning       awake, two tails, their tips holding a little warm light
//   Understanding  four tails, the tips lit with blue foxfire, wisps of it drifting round
//   Proficient     nine tails fanned out behind, tipped with gold, foxfire circling, a gold aura
// The fox is the approved mark (Fox.tsx), sat on a body drawn in its manner: flat facets, the left
// lighter and the right darker, a pale stroke along the light edge. The light is three.js
// (stageFx.ts) laid exactly over the drawing.
// The change: light gathers in toward the root of the tails while Karman crouches (and, from
// asleep, wakes with a start); then the tails he has swing to their new places and the new ones
// sweep out one after another, each with a rush of air, its tip catching fire as it lands. When the
// last one is out it is complete: a burst of light, the step's chord, and the fox settles into a
// gentle sway, the tips breathing, motes rising off them.
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef } from "react";
import { HEAD } from "@/components/portal/Fox";
import { prefersStill } from "@/lib/painting/motion";
import { FOXFIRE, GOLD, ICE, WARM, WHITE, stageFx, type Fx, type Light } from "./stageFx";
import { gather, swish } from "./stageSound";
import t from "./tailsStage.module.css";

const BOX: [number, number, number, number] = [-140, -150, 280, 280];
/** Where the tails grow from, behind the body. */
const ROOT = { x: 0, y: 46 };
/** Each level's tails, by index: the angle (degrees, clockwise from straight up) and the length. */
const LAYOUT: { a: number; s: number }[][] = [
  [{ a: -118, s: 0.78 }],
  [
    { a: -36, s: 1 },
    { a: 36, s: 1 },
  ],
  [
    { a: -62, s: 0.94 },
    { a: 62, s: 0.94 },
    { a: -22, s: 1.04 },
    { a: 22, s: 1.04 },
  ],
  [
    { a: -84, s: 0.84 },
    { a: 84, s: 0.84 },
    { a: -42, s: 0.98 },
    { a: 42, s: 0.98 },
    { a: -63, s: 0.91 },
    { a: 63, s: 0.91 },
    { a: -21, s: 1.04 },
    { a: 21, s: 1.04 },
    { a: 0, s: 1.08 },
  ],
];
/** The middle tails are drawn first, so the outer ones lie over them. */
const ORDER = [8, 6, 7, 2, 3, 4, 5, 0, 1];
/** Each level's light at the tips. */
const TIP = [WARM, [1, 0.8, 0.48], FOXFIRE, GOLD];
const TIP_FILL = ["#FFF8EE", "#FFF8EE", "#DCEBFF", "#FFE7A0"];
/** Where a tail's tip glows, along it. */
const TIP_AT = 122;

type TailState = { a: number; s: number; o: number };
type State = { tails: TailState[]; crouch: number; tilt: number; lift: number; sway: number };

function stateOf(level: number): State {
  return {
    tails: Array.from({ length: 9 }, (_, i) => {
      const at = LAYOUT[level][i];
      return at ? { a: at.a, s: at.s, o: 1 } : { a: 0, s: 0.2, o: 0 };
    }),
    crouch: 0,
    tilt: 0,
    lift: 0,
    sway: 0,
  };
}

/** One tail, pointing straight up from its root at 0, 0, in facets like the fox's. */
function Tail({ fill }: { fill: string }) {
  return (
    <>
      <path d="M-7 0 L-26 -50 L-24 -100 L-12 -128 L0 -150 L0 0Z" fill="#E89A2C" />
      <path d="M-26 -50 L-24 -100 L-10 -76Z" fill="#F6B652" />
      <path d="M-7 0 L-26 -50 L-12 -40Z" fill="#F6B652" opacity="0.6" />
      <path d="M7 0 L26 -50 L24 -100 L12 -128 L0 -150 L0 0Z" fill="#CC8020" />
      <path d="M26 -50 L24 -100 L10 -76Z" fill="#B87018" opacity="0.7" />
      <path d="M-24 -100 L-12 -128 L0 -150 L12 -128 L24 -100 L0 -92Z" fill={fill} data-tip />
      <path d="M0 -150 L12 -128 L24 -100 L0 -92Z" fill="#000" opacity="0.08" />
      <path
        d="M-7 0 L-26 -50 L-24 -100 L-12 -128 L0 -150"
        stroke="#fff"
        strokeWidth="1"
        opacity="0.28"
        fill="none"
      />
    </>
  );
}

/** The body Karman sits on, under the approved head. */
function Body() {
  return (
    <>
      <path d="M-26 -2 L0 -2 L0 72 L-38 72 L-46 50Z" fill="#E89A2C" />
      <path d="M26 -2 L0 -2 L0 72 L38 72 L46 50Z" fill="#CC8020" />
      <path d="M-46 50 L-30 28 L-26 72 L-38 72Z" fill="#F6B652" />
      <path d="M-18 0 L18 0 L10 40 L0 52 L-10 40Z" fill="#FFF8EE" />
      <path d="M0 0 L18 0 L10 40 L0 52Z" fill="#000" opacity="0.05" />
      <path d="M-17 30 L-6 30 L-6 72 L-17 72Z" fill="#E89A2C" />
      <path d="M6 30 L17 30 L17 72 L6 72Z" fill="#CC8020" />
      <path d="M-18 61 L-5 61 L-5 73 L-18 73Z M5 61 L18 61 L18 73 L5 73Z" fill="#2A2A2A" />
      <path d="M-46 50 L-26 -2" stroke="#fff" strokeWidth="1" opacity="0.28" />
    </>
  );
}

function transformOf(s: TailState, sway = 0) {
  return `translate(${ROOT.x} ${ROOT.y}) rotate(${s.a + sway}) scale(${s.s})`;
}

/** Where a tail's tip glow is, in the drawing. */
function tipOf(s: { a: number; s: number }, sway = 0) {
  const r = ((s.a + sway) * Math.PI) / 180;
  return { x: ROOT.x + Math.sin(r) * TIP_AT * s.s, y: ROOT.y - Math.cos(r) * TIP_AT * s.s };
}

/** Karman at a level, still (the level row, and anywhere small). */
export function TailsMark({ level, size = 44 }: { level: number; size?: number }) {
  const st = stateOf(level);
  return (
    <svg
      viewBox={BOX.join(" ")}
      width={size}
      height={size}
      aria-hidden="true"
      className={t.fox}
      data-asleep={level === 0 || undefined}
    >
      {ORDER.map((i) =>
        st.tails[i].o > 0 ? (
          <g key={i} transform={transformOf(st.tails[i])}>
            <Tail fill={TIP_FILL[level]} />
          </g>
        ) : null
      )}
      <Body />
      <g dangerouslySetInnerHTML={{ __html: HEAD }} />
      <SleepyEyes />
    </svg>
  );
}

/** Closed eyes, drawn over the open ones while asleep. */
function SleepyEyes() {
  return (
    <path
      className={t.shut}
      d="M-21 -29 Q-15 -23 -9 -29 M9 -29 Q15 -23 21 -29"
      stroke="#24180F"
      strokeWidth="2.6"
      fill="none"
      strokeLinecap="round"
    />
  );
}

/** Karman's tails growing from `from` to `to`, played when `play` turns on. */
export function TailsStage({
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
  const svg = useRef<SVGSVGElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const aura = useRef<HTMLDivElement>(null);
  const st = useRef<State>(stateOf(from));
  const level = useRef(from);
  const fx = useRef<Fx | null>(null);
  const peak = useRef(onPeak);
  useEffect(() => {
    peak.current = onPeak;
  }, [onPeak]);

  // the drawing follows the state every frame: the tails, the crouch, the head's tilt
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const tails = Array.from(el.querySelectorAll<SVGGElement>("[data-tail]"));
    const body = el.querySelector<SVGGElement>("[data-body]");
    const head = el.querySelector<SVGGElement>("[data-head]");
    const draw = () => {
      const s = st.current;
      tails.forEach((g) => {
        const i = Number(g.dataset.tail);
        const tail = s.tails[i];
        const sway = Math.sin(performance.now() / 620 + i * 0.8) * 2.6 * s.sway;
        g.setAttribute("transform", transformOf(tail, sway));
        g.setAttribute("opacity", String(tail.o));
      });
      body?.setAttribute(
        "transform",
        `translate(0 ${72 * s.crouch * 0.05}) scale(1 ${1 - s.crouch * 0.05})`
      );
      head?.setAttribute(
        "transform",
        `translate(0 ${s.crouch * 6 - s.lift * 4}) rotate(${s.tilt} 0 0)`
      );
    };
    draw();
    gsap.ticker.add(draw);
    return () => gsap.ticker.remove(draw);
  }, []);

  // the light: tip glows, wisps of foxfire, motes, and the z's while asleep
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    let gone = false;
    void stageFx(cv, BOX).then((kit) => {
      if (!kit || gone) {
        kit?.stop();
        return;
      }
      fx.current = kit;
      const tipLights: Light[] = Array.from({ length: 9 }, () => ({
        x: 0,
        y: 0,
        size: 0,
        r: 1,
        g: 1,
        b: 1,
        a: 0,
      }));
      const wisps: Light[] = Array.from({ length: 9 }, () => ({
        x: 0,
        y: 0,
        size: 22,
        r: 0.5,
        g: 0.75,
        b: 1,
        a: 0,
      }));
      kit.lights.push(...tipLights, ...wisps);
      let mote = 0;
      kit.onFrame((dt, time) => {
        const s = st.current;
        const lv = level.current;
        const c = TIP[lv];
        s.tails.forEach((tail, i) => {
          const sway = Math.sin(performance.now() / 620 + i * 0.8) * 2.6 * s.sway;
          const p = tipOf(tail, sway);
          const l = tipLights[i];
          l.x = p.x;
          l.y = p.y + s.crouch * 2;
          const breathe = 0.8 + 0.2 * Math.sin(time * 2.4 + i);
          const lit = lv === 0 ? 0 : tail.o;
          l.size = (lv === 3 ? 64 : lv === 2 ? 54 : 34) * breathe * tail.s;
          l.a = lit * (lv === 1 ? 0.55 : 0.85) * breathe;
          [l.r, l.g, l.b] = c;
        });
        // foxfire: little flames circling Karman, more for a higher stage
        const many = lv === 3 ? 9 : lv === 2 ? 3 : 0;
        wisps.forEach((w, i) => {
          const on = i < many;
          const ang = time * (0.7 + (i % 3) * 0.12) + (i / Math.max(1, many)) * Math.PI * 2;
          w.x = Math.cos(ang) * 118;
          w.y = -16 + Math.sin(ang) * 44 + Math.sin(time * 3 + i) * 6;
          w.a += ((on ? 0.9 : 0) - w.a) * Math.min(1, dt * 3);
          w.size = 20 + 6 * Math.sin(time * 9 + i * 2);
          const gold = lv === 3 && i % 2 === 0;
          [w.r, w.g, w.b] = gold ? GOLD : FOXFIRE;
          if (on && Math.random() < dt * 30)
            kit.sparks.push({
              x: w.x,
              y: w.y,
              vx: (Math.random() - 0.5) * 10,
              vy: -18 - Math.random() * 14,
              size: 7,
              r: w.r,
              g: w.g,
              b: w.b,
              life: 0.45,
              drag: 1,
              tw: 0,
            });
        });
        // motes rising off the lit tips
        mote += dt;
        if (lv > 0 && mote > 0.12) {
          mote = 0;
          const i = Math.floor(Math.random() * LAYOUT[lv].length);
          const l = tipLights[i];
          kit.sparks.push({
            x: l.x + (Math.random() - 0.5) * 10,
            y: l.y,
            vx: (Math.random() - 0.5) * 12,
            vy: -22 - Math.random() * 20,
            size: 5 + Math.random() * 3,
            r: c[0],
            g: c[1],
            b: c[2],
            life: 1.4,
            drag: 0.6,
            tw: 10,
          });
        }
      });
    });
    return () => {
      gone = true;
      fx.current?.stop();
      fx.current = null;
    };
  }, []);

  // the change
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el || !play || from === to) return;
    const s = st.current;
    const step = to;
    const before = LAYOUT[from].length;
    const after = LAYOUT[to].length;
    const kit = () => fx.current;
    const color = TIP[to];
    if (prefersStill()) {
      st.current = { ...stateOf(to), sway: 0 };
      level.current = to;
      el.removeAttribute("data-asleep");
      el.querySelectorAll<SVGPathElement>("[data-tip]").forEach((p) =>
        p.setAttribute("fill", TIP_FILL[to])
      );
      peak.current?.();
      return;
    }
    const line = gsap.timeline();
    const GATHER = 0.75;
    gather(GATHER + 0.1);
    // light drawn in toward the root of the tails while he crouches
    const pull = { k: 0 };
    line
      .to(s, { sway: 0, duration: 0.2 }, 0)
      .to(s, { crouch: 1, duration: GATHER, ease: "power2.in" }, 0)
      .to(
        pull,
        {
          k: 1,
          duration: GATHER,
          ease: "none",
          onUpdate: () => {
            const f = kit();
            if (!f || Math.random() > 0.9) return;
            for (let n = 0; n < 3; n++) {
              const a = Math.random() * Math.PI * 2;
              const r = 120 + Math.random() * 30;
              const x = ROOT.x + Math.cos(a) * r;
              const y = ROOT.y - 30 + Math.sin(a) * r;
              f.sparks.push({
                x,
                y,
                vx: (ROOT.x - x) * 1.9,
                vy: (ROOT.y - 20 - y) * 1.9,
                size: 4 + Math.random() * 3,
                r: color[0],
                g: color[1],
                b: color[2],
                life: 0.5,
                drag: 0,
                tw: 12,
              });
            }
          },
        },
        0
      );
    // from asleep: he wakes with a start, ears and all
    if (from === 0)
      line
        .add(() => el.removeAttribute("data-asleep"), 0.3)
        .to(s, { keyframes: { tilt: [-7, 6, -3, 0] }, duration: 0.45, ease: "none" }, 0.3)
        .to(s, { keyframes: { lift: [1, 0] }, duration: 0.3, ease: "power2.out" }, 0.3);
    // the root glows brighter as it gathers
    const root: Light = {
      x: ROOT.x,
      y: ROOT.y - 18,
      size: 0,
      r: color[0],
      g: color[1],
      b: color[2],
      a: 0,
    };
    line
      .add(() => kit()?.lights.push(root), 0)
      .to(root, { size: 70 + step * 20, a: 0.9, duration: GATHER, ease: "power2.in" }, 0);

    // release: he springs up, the tails he has swing to their new places
    const out = GATHER;
    line.to(s, { crouch: 0, duration: 0.45, ease: "back.out(3)" }, out);
    for (let i = 0; i < before; i++)
      line.to(
        s.tails[i],
        { a: LAYOUT[to][i].a, s: LAYOUT[to][i].s, duration: 0.5, ease: "back.out(1.6)" },
        out
      );
    // and the new ones sweep out, one after another, each tip catching fire as it lands
    const gap = step === 3 ? 0.11 : 0.17;
    for (let i = before; i < after; i++) {
      const at = out + 0.05 + (i - before) * gap;
      const tail = s.tails[i];
      const end = LAYOUT[to][i];
      line
        .add(() => swish(i - before), at)
        .fromTo(
          tail,
          { a: end.a * 0.15, s: 0.2, o: 0 },
          { a: end.a, s: end.s, o: 1, duration: 0.55, ease: "back.out(1.5)" },
          at
        )
        .add(() => {
          const f = kit();
          if (!f) return;
          const p = tipOf(end);
          f.burst({
            x: p.x,
            y: p.y,
            count: 26 + step * 8,
            speed: 120,
            colors: [color, WHITE],
            size: 6,
            life: 0.7,
          });
          const flash: Light = {
            x: p.x,
            y: p.y,
            size: 110,
            r: color[0],
            g: color[1],
            b: color[2],
            a: 1,
          };
          f.lights.push(flash);
          gsap.to(flash, {
            size: 30,
            a: 0,
            duration: 0.5,
            ease: "power2.out",
            onComplete: () => f.lights.splice(f.lights.indexOf(flash), 1),
          });
        }, at + 0.32);
    }
    const done = out + 0.05 + (after - before - 1) * gap + 0.4;
    // the tips take their new light as the first new tail lands
    line.add(() => {
      level.current = to;
      el.querySelectorAll<SVGPathElement>("[data-tip]").forEach((p) =>
        p.setAttribute("fill", TIP_FILL[to])
      );
    }, out + 0.35);
    // complete: a burst from the root, the aura for the top, and the sway
    line
      .add(() => {
        peak.current?.();
        const f = kit();
        f?.burst({
          x: ROOT.x,
          y: ROOT.y - 30,
          count: [0, 120, 220, 420][step],
          speed: 160 + step * 50,
          colors:
            step === 3
              ? [GOLD, WARM, WHITE, FOXFIRE]
              : step === 2
                ? [FOXFIRE, ICE, WHITE]
                : [WARM, WHITE],
          size: 6,
          life: 1.1 + step * 0.2,
          fall: 40,
        });
      }, done)
      .to(root, { a: 0, size: 220, duration: 0.6, ease: "power2.out" }, done)
      .to(s, { keyframes: { lift: [1, 0] }, duration: 0.5, ease: "power2.out" }, done)
      .to(s, { sway: 1, duration: 1, ease: "sine.inOut" }, done + 0.3);
    if (step === 3 && aura.current)
      line
        .fromTo(
          aura.current,
          { opacity: 0, scale: 0.4 },
          { opacity: 1, scale: 1, duration: 0.8, ease: "expo.out" },
          done
        )
        .to(s, { tilt: -5, duration: 0.5, ease: "back.out(2)" }, done)
        .add(() => el.setAttribute("data-happy", ""), done);
    return () => {
      line.kill();
    };
  }, [play, from, to]);

  // asleep: z's drifting up
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el || prefersStill()) return;
    const zs = el.querySelectorAll("[data-z]");
    const loop = gsap.fromTo(
      zs,
      { opacity: 0, x: 0, y: 0, scale: 0.5 },
      {
        keyframes: { opacity: [0, 1, 0] },
        x: 24,
        y: -38,
        scale: 1.2,
        duration: 2.2,
        stagger: { each: 0.7, repeat: -1 },
        ease: "sine.out",
      }
    );
    return () => {
      loop.kill();
    };
  }, []);

  const start = stateOf(from);
  return (
    <div className={t.stage} style={{ width: size, height: size }}>
      <div className={t.aura} ref={aura} data-on={from === 3 || undefined} />
      <svg
        ref={svg}
        viewBox={BOX.join(" ")}
        width={size}
        height={size}
        className={t.fox}
        data-asleep={from === 0 || undefined}
        aria-hidden="true"
      >
        {ORDER.map((i) => (
          <g
            key={i}
            data-tail={i}
            transform={transformOf(start.tails[i])}
            opacity={start.tails[i].o}
          >
            <Tail fill={TIP_FILL[from]} />
          </g>
        ))}
        <g data-body>
          <Body />
        </g>
        <g data-head>
          <g dangerouslySetInnerHTML={{ __html: HEAD }} />
          <SleepyEyes />
          <path
            className={t.happy}
            d="M-21 -27 Q-15 -35 -9 -27 M9 -27 Q15 -35 21 -27"
            stroke="#24180F"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </g>
        <g className={t.zs}>
          {[0, 1, 2].map((k) => (
            <text key={k} data-z x={34 + k * 6} y={-66 - k * 4} fontSize={14 - k * 2}>
              z
            </text>
          ))}
        </g>
      </svg>
      <canvas ref={canvas} className={t.light} />
    </div>
  );
}
