"use client";
// "Karman grows tails" (founder, 2026-11-20, his pick of five). In the old stories a fox grows
// another tail each time it grows wiser; here Karman grows them with the student's skill:
//   Not started    curled up asleep, his tail wrapped round to his face, breathing slow, z's rising
//   Learning       awake and sitting up, two tails, their tips holding a little warm light
//   Understanding  four tails, the tips lit with blue foxfire, wisps of it drifting round him
//   Proficient     nine tails fanned out behind, tipped with gold, foxfire circling, a gold aura
// Awake, he is alive: he breathes, blinks, flicks an ear, tilts his head, and his tails sway
// (foxLife.ts). The drawings are foxArt.tsx; the light is three.js (foxLight.ts, stageFx.ts) laid
// exactly over the drawing.
// The change: from asleep he wakes first: his eyes open, his head lifts, he blinks twice, an ear
// flicks, and he springs up out of his curl to sit, kicking up a puff of light. Then light gathers
// in toward the root of his tails while he crouches; the tails he has swing to their new places and
// the new ones sweep out one after another, each with a rush of air, its tip catching fire as it
// lands. When the last is out it is complete: a burst of light, a hop, and he settles into his sway.
import gsap from "gsap";
import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef } from "react";
import { prefersStill } from "@/lib/painting/motion";
import {
  BOX,
  Body,
  Curled,
  curledHead,
  GROUND,
  Head,
  LAYOUT,
  ORDER,
  ROOT,
  TIP,
  TIP_FILL,
  Tail,
  tailTransform,
  tipOf,
} from "./foxArt";
import { blink, live } from "./foxLife";
import { lightFox, type FoxState } from "./foxLight";
import { FOXFIRE, GOLD, ICE, WARM, WHITE, stageFx, type Fx, type Light } from "./stageFx";
import { gather, swish } from "./stageSound";
import t from "./tailsStage.module.css";

/** Whether the top stage has a thin gold ring behind him as well as its glow (page.tsx, ?ring=0). */
export const AuraRing = createContext(true);

function stateOf(level: number): FoxState {
  return {
    tails: Array.from({ length: 9 }, (_, i) => {
      const at = LAYOUT[level][i];
      return at ? { a: at.a, s: at.s, o: 1 } : { a: 0, s: 0.2, o: 0 };
    }),
    crouch: 0,
    tilt: 0,
    lift: 0,
    sway: level > 0 ? 1 : 0,
    rise: level > 0 ? 1 : 0,
    curl: level > 0 ? 0 : 1,
    wake: 0,
    blink: 0,
    earL: 0,
    earR: 0,
  };
}

/** Squashes or stretches from the ground up. */
const fromGround = (sx: number, sy: number, ground = GROUND) =>
  `translate(0 ${ground}) scale(${sx} ${sy}) translate(0 ${-ground})`;
/** Where he lies curled: the bottom of his wrapped tail. */
const CURL_GROUND = 98;
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
      {level === 0 ? (
        <Curled />
      ) : (
        <>
          {ORDER.map((i) =>
            st.tails[i].o > 0 ? (
              <g key={i} transform={tailTransform(st.tails[i])}>
                <Tail fill={TIP_FILL[level]} />
              </g>
            ) : null
          )}
          <Body />
          <Head />
        </>
      )}
    </svg>
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
  const ring = useContext(AuraRing);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const aura = useRef<HTMLDivElement>(null);
  const st = useRef<FoxState>(stateOf(from));
  const level = useRef(from);
  const changing = useRef(false);
  const fx = useRef<Fx | null>(null);
  const peak = useRef(onPeak);
  useEffect(() => {
    peak.current = onPeak;
  }, [onPeak]);

  // the drawing follows the state every frame: curled or sitting, breath, tails, head, eyes, ears
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const q = <T extends Element>(s: string) => el.querySelector<T>(s);
    const tails = Array.from(el.querySelectorAll<SVGGElement>("[data-tail]"));
    const curled = q<SVGGElement>("[data-curled]");
    const cHead = q<SVGGElement>("[data-curled-head]");
    const sit = q<SVGGElement>("[data-sit]");
    const body = q<SVGGElement>("[data-body]");
    const head = q<SVGGElement>("[data-head]");
    const lids = Array.from(el.querySelectorAll<SVGGElement>(".m-lid"));
    const ears = Array.from(el.querySelectorAll<SVGGElement>("[data-head] .m-ear"));
    const shadow = q<SVGEllipseElement>("[data-shadow]");
    const still = prefersStill();
    const draw = () => {
      const s = st.current;
      const time = still ? 0 : performance.now() / 1000;
      const asleep = level.current === 0 && s.curl > 0.99;
      // curled up, breathing slow while asleep
      if (curled) {
        curled.style.display = s.curl > 0.001 ? "" : "none";
        const breath = asleep ? 0.022 * Math.sin(time * 1.5) : 0;
        curled.setAttribute(
          "transform",
          fromGround(1 + (1 - s.curl) * 0.14 - breath * 0.4, s.curl + breath, CURL_GROUND)
        );
      }
      cHead?.setAttribute("transform", curledHead(s.wake));
      // his shadow on the ground, wide under the curl, narrower under him sitting
      if (shadow) {
        const c = Math.min(1, s.curl);
        shadow.setAttribute("cy", String(GROUND + (CURL_GROUND - GROUND) * c));
        shadow.setAttribute("rx", String(108 * c + 58 * Math.min(1.2, s.rise) * (1 - c)));
      }
      // sitting up, breathing while awake
      if (sit) {
        sit.style.display = s.rise > 0.001 ? "" : "none";
        sit.setAttribute("transform", fromGround(1 + (1 - s.rise) * 0.22, s.rise));
      }
      const breath = 0.012 * Math.sin(time * 2.4);
      tails.forEach((g) => {
        const i = Number(g.dataset.tail);
        const tail = s.tails[i];
        const sway = Math.sin(time * 1.6 + i * 0.8) * 2.6 * s.sway;
        g.setAttribute("transform", tailTransform(tail, sway));
        g.setAttribute("opacity", String(tail.o));
      });
      body?.setAttribute("transform", fromGround(1, 1 + breath - s.crouch * 0.05));
      head?.setAttribute(
        "transform",
        `translate(0 ${s.crouch * 6 - s.lift * 4 - breath * 60}) rotate(${s.tilt} 0 0)`
      );
      // eyes closing from the middle, ears flicking from their roots
      const shut = `translate(0 -28) scale(1 ${Math.max(0.08, 1 - s.blink)}) translate(0 28)`;
      lids.forEach((l) => l.setAttribute("transform", shut));
      ears[0]?.setAttribute("transform", `rotate(${s.earL} -20 -50)`);
      ears[1]?.setAttribute("transform", `rotate(${s.earR} 20 -50)`);
    };
    draw();
    gsap.ticker.add(draw);
    // awake, he lives
    const stop = live(
      () => st.current,
      () => level.current > 0 && !changing.current
    );
    return () => {
      gsap.ticker.remove(draw);
      stop();
    };
  }, []);

  // the light
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
      lightFox(
        kit,
        () => st.current,
        () => level.current
      );
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
    const tips = () =>
      el
        .querySelectorAll<SVGPathElement>("[data-tip]")
        .forEach((p) => p.setAttribute("fill", TIP_FILL[to]));
    if (prefersStill()) {
      st.current = stateOf(to);
      level.current = to;
      el.removeAttribute("data-asleep");
      tips();
      peak.current?.();
      return;
    }
    changing.current = true;
    const line = gsap.timeline({ onComplete: () => (changing.current = false) });
    let start = 0;

    // from asleep, he wakes first
    if (from === 0) {
      line
        .to(el.querySelectorAll("[data-z]"), { opacity: 0, duration: 0.2, overwrite: true }, 0)
        .add(() => el.removeAttribute("data-asleep"), 0.12)
        .to(s, { wake: 1, duration: 0.35, ease: "back.out(2.4)" }, 0.12)
        .add(() => blink(s, 2), 0.42)
        .to(s, { keyframes: { earL: [-14, 4, -8, 0] }, duration: 0.4, ease: "none" }, 0.62)
        // he springs up out of his curl to sit, the change hidden in a pop of light
        .add(() => {
          const f = kit();
          if (!f) return;
          const pop: Light = { x: 10, y: 34, size: 40, r: 1, g: 0.95, b: 0.82, a: 0 };
          f.lights.push(pop);
          gsap.to(pop, {
            keyframes: { size: [40, 260, 120], a: [0, 1, 0] },
            duration: 0.42,
            ease: "power2.out",
            onComplete: () => f.lights.splice(f.lights.indexOf(pop), 1),
          });
        }, 0.82)
        .to(s, { curl: 0, duration: 0.06, ease: "power2.in" }, 0.94)
        .fromTo(
          s,
          { rise: 0 },
          { rise: 1, duration: 0.55, ease: "back.out(2.6)", immediateRender: false },
          0.96
        )
        .add(() => {
          kit()?.burst({
            x: 0,
            y: GROUND - 6,
            count: 40,
            speed: 110,
            colors: [WARM, WHITE],
            size: 5,
            life: 0.7,
            spread: Math.PI * 0.9,
            angle: -Math.PI / 2,
          });
        }, 0.92)
        .to(s, { keyframes: { tilt: [-7, 5, 0] }, duration: 0.6, ease: "none" }, 1.1);
      start = 1.3;
    }

    const GATHER = from === 0 ? 0.55 : 0.75;
    line.add(() => gather(GATHER + 0.1), start);
    // light drawn in toward the root of the tails while he crouches
    const pull = { k: 0 };
    line
      .to(s, { sway: 0, duration: 0.2 }, start)
      .to(s, { crouch: 1, duration: GATHER, ease: "power2.in" }, start)
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
        start
      );
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
      .add(() => kit()?.lights.push(root), start)
      .to(root, { size: 60 + step * 18, a: 0.75, duration: GATHER, ease: "power2.in" }, start);

    // release: he springs up, the tails he has swing to their new places
    const out = start + GATHER;
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
      const end = LAYOUT[to][i];
      line
        .add(() => swish(i - before), at)
        .fromTo(
          s.tails[i],
          { a: end.a * 0.15, s: 0.2, o: 0 },
          {
            a: end.a,
            s: end.s,
            o: 1,
            duration: 0.55,
            ease: "back.out(1.5)",
            immediateRender: false,
          },
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
      tips();
    }, out + 0.35);
    // complete: a burst from the root, a hop, the aura for the top, and the sway
    line
      .add(() => {
        peak.current?.();
        kit()?.burst({
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
      .to(s, { keyframes: { lift: [1 + step * 0.6, 0] }, duration: 0.55, ease: "power2.out" }, done)
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
        .add(() => el.setAttribute("data-happy", ""), done)
        .add(() => el.removeAttribute("data-happy"), done + 2.2)
        .to(s, { tilt: 0, duration: 0.6, ease: "sine.inOut" }, done + 2.2);
    return () => {
      line.kill();
      changing.current = false;
    };
  }, [play, from, to]);

  // asleep: z's drifting up from his head
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el || prefersStill() || from !== 0) return;
    const loop = gsap.fromTo(
      el.querySelectorAll("[data-z]"),
      { opacity: 0, x: 0, y: 0, scale: 0.5 },
      {
        keyframes: { opacity: [0, 1, 0] },
        x: 22,
        y: -40,
        scale: 1.2,
        duration: 2.4,
        stagger: { each: 0.8, repeat: -1 },
        ease: "sine.out",
      }
    );
    return () => {
      loop.kill();
    };
  }, [from]);

  const startState = stateOf(from);
  return (
    <div className={t.stage} style={{ width: size, height: size }}>
      <div
        className={t.aura}
        ref={aura}
        data-on={from === 3 || undefined}
        data-ring={ring || undefined}
      />
      <svg
        ref={svg}
        viewBox={BOX.join(" ")}
        width={size}
        height={size}
        className={t.fox}
        data-asleep={from === 0 || undefined}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`${uid}-shade`}>
            <stop offset="0" stopColor="#000" stopOpacity="0.32" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          data-shadow
          cx="0"
          cy={from === 0 ? CURL_GROUND : GROUND}
          rx={from === 0 ? 108 : 58}
          ry="10"
          fill={`url(#${uid}-shade)`}
        />
        <g data-curled style={{ display: from === 0 ? undefined : "none" }}>
          <Curled head={curledHead(0)} />
        </g>
        <g data-sit style={{ display: from === 0 ? "none" : undefined }}>
          {ORDER.map((i) => (
            <g
              key={i}
              data-tail={i}
              transform={tailTransform(startState.tails[i])}
              opacity={startState.tails[i].o}
            >
              <Tail fill={TIP_FILL[from]} />
            </g>
          ))}
          <g data-body>
            <Body />
          </g>
          <g data-head>
            <Head />
          </g>
        </g>
        <g className={t.zs}>
          {[0, 1, 2].map((k) => (
            <text key={k} data-z x={92 + k * 8} y={-30 - k * 8} fontSize={16 - k * 2}>
              z
            </text>
          ))}
        </g>
      </svg>
      <canvas ref={canvas} className={t.light} />
    </div>
  );
}
