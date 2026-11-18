"use client";

/*
 * Intro 8, the lanterns (founder, 2026-11-08). A calm lake before the light comes, with two paper
 * lanterns floating over the water, one per subject, each with its name.
 *
 * - The water paints itself in, then the lanterns' light comes up.
 * - Pointing at a lantern (or focusing it, or a first tap on a touch screen) makes it glow brighter
 *   and bob; the other one dims a little.
 * - Choosing a lantern releases it: it rises into the sky, its light spreading as it goes, until
 *   the whole sky has brightened and the subject's own scene (the shared ground scene) is there.
 *   The other lantern drifts away. Then the page opens the Library box over that same scene.
 * - The light follows the hour: night is night, sunset is the dusk after it, dawn is the blue hour
 *   before sunrise, and by day it is soft early-morning light. The lantern's light always opens
 *   onto the scene in the hour's own light, so the hand-over to the Library is seamless.
 * - Reduced motion: nothing bobs or rises; pointing brightens a lantern, choosing cross-fades.
 * Transforms and opacity only.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Num } from "@/components/portal/primitives";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { layoutFor, type Layout } from "@/lib/painting/library/seam";
import type { IntroProps, Subject } from "../registry";
import { paintGround } from "../paint-ground";
import { HORIZON, renderLantern, renderWater } from "./lantern-art";
import s from "./lanterns.module.css";

const NAMES: Record<Subject, string> = { math: "Math", rw: "Reading and Writing" };
const SUBJECTS: Subject[] = ["math", "rw"];

/** Where each lantern floats and where its name sits (fractions of the screen). */
const SPOT: Record<Layout, Record<Subject, { at: [number, number]; label: [number, number] }>> = {
  wide: {
    math: { at: [0.33, 0.43], label: [0.33, 0.76] },
    rw: { at: [0.67, 0.46], label: [0.67, 0.79] },
  },
  tall: {
    math: { at: [0.27, 0.3], label: [0.66, 0.31] },
    rw: { at: [0.73, 0.5], label: [0.34, 0.51] },
  },
};

export default function Lanterns({ percents, time, reducedMotion, onChoose }: IntroProps) {
  const root = useRef<HTMLDivElement>(null);
  const water = useRef<HTMLCanvasElement>(null);
  const ground = useRef<HTMLCanvasElement>(null);
  const bodies = useRef<Partial<Record<Subject, HTMLCanvasElement | null>>>({});
  const [layout, setLayout] = useState<Layout>("wide");
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<Subject | null>(null);
  const [chosen, setChosen] = useState<Subject | null>(null);
  const chosenRef = useRef<Subject | null>(null);
  const pointer = useRef("mouse");
  const pressing = useRef(false);

  /* Paint the water (again, at once, after a resize) and draw both lanterns. */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let handle: PaintHandle | null = null;
    let painted = "";
    let first = true;
    const paint = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (w < 8 || h < 8 || chosenRef.current || `${w}x${h}` === painted) return;
      painted = `${w}x${h}`;
      const lay = layoutFor(w, h);
      setLayout(lay);
      setSize([w, h]);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const sub of SUBJECTS) {
        const c = bodies.current[sub];
        if (!c) continue;
        const art = renderLantern(
          Math.round(c.clientWidth * dpr) || 120,
          sub === "math" ? "parabola" : "book",
          sub === "math" ? 31 : 47
        );
        c.width = art.width;
        c.height = art.height;
        c.getContext("2d")?.drawImage(art, 0, 0);
      }
      const c = water.current;
      if (!c) return;
      handle?.stop();
      handle = paintPicture(c, renderWater(lay, time, h / w), {
        animate: first && !reducedMotion,
        ms: 1800,
        width: w,
        height: h,
        done: () => setReady(true),
      });
      first = false;
    };
    const t = window.setTimeout(paint, 0);
    let resize = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resize);
      resize = window.setTimeout(paint, 180);
    });
    ro.observe(el);
    return () => {
      clearTimeout(t);
      clearTimeout(resize);
      ro.disconnect();
      handle?.stop();
    };
  }, [time, reducedMotion]);

  const choose = (sub: Subject) => {
    if (chosenRef.current) return;
    chosenRef.current = sub;
    setChosen(sub);
    setActive(null);
    const [w, h] = size;
    const g = ground.current;
    const el = root.current;
    if (!g || !el || !w) return onChoose(sub);
    paintGround(g, sub, time, w, h);
    const done = () => onChoose(sub);
    if (reducedMotion) {
      g.animate({ opacity: [0, 1] }, { duration: 500, fill: "forwards" }).finished.then(done, done);
      return;
    }
    const lantern = el.querySelector<HTMLElement>(`[data-lantern="${sub}"]`);
    const glow = lantern?.querySelector<HTMLElement>("[data-glow]");
    const other = el.querySelector<HTMLElement>(
      `[data-lantern="${sub === "math" ? "rw" : "math"}"]`
    );
    const wash = el.querySelector<HTMLElement>("[data-wash]");
    const y = SPOT[layout][sub].at[1];
    const sway = sub === "math" ? 1 : -1;
    lantern?.animate(
      [
        { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
        {
          transform: `translate3d(${sway * 14}px, ${-h * 0.18}px, 0) scale(0.9)`,
          opacity: 1,
          offset: 0.35,
        },
        {
          transform: `translate3d(${-sway * 10}px, ${-h * (y + 0.05) * 0.8}px, 0) scale(0.55)`,
          opacity: 1,
          offset: 0.75,
        },
        { transform: `translate3d(0, ${-h * (y + 0.1)}px, 0) scale(0.32)`, opacity: 0 },
      ],
      { duration: 2700, easing: "cubic-bezier(0.45, 0, 0.6, 1)", fill: "forwards" }
    );
    glow?.animate(
      [
        { transform: "scale(1)", opacity: 0.9 },
        { transform: "scale(2.4)", opacity: 1, offset: 0.4 },
        { transform: "scale(5)", opacity: 1 },
      ],
      { duration: 2700, easing: "ease-in", fill: "forwards" }
    );
    other?.animate(
      [
        { transform: "translate3d(0, 0, 0)", opacity: 1 },
        { transform: `translate3d(${-sway * 60}px, 10px, 0) scale(0.92)`, opacity: 0 },
      ],
      { duration: 1100, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" }
    );
    wash?.animate(
      [
        { opacity: 0, transform: "scale(0.4)" },
        { opacity: 0.85, transform: "scale(1.1)", offset: 0.55 },
        { opacity: 0, transform: "scale(1.6)" },
      ],
      { duration: 2600, delay: 400, easing: "cubic-bezier(0.3, 0, 0.4, 1)", fill: "both" }
    );
    g.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 1300,
      delay: 1500,
      easing: "ease-in-out",
      fill: "both",
    }).finished.then(done, done);
  };

  const pick = chosen ? SPOT[layout][chosen].at : [0.5, 0.5];
  const style = {
    "--horizon": `${HORIZON[layout] * 100}%`,
    "--wash-x": `${pick[0] * 100}%`,
    "--wash-y": `${pick[1] * 100}%`,
    "--lantern": layout === "wide" ? "clamp(96px, 9vw, 150px)" : "clamp(76px, 20vw, 110px)",
  } as CSSProperties;

  return (
    <div
      ref={root}
      className={s.root}
      style={style}
      data-time={time}
      data-ready={ready || undefined}
      data-active={active ?? undefined}
      data-chosen={chosen ?? undefined}
      data-still={reducedMotion || undefined}
      data-layout={layout}
    >
      <canvas ref={water} className={s.full} aria-hidden="true" />
      {SUBJECTS.map((sub) => (
        <span
          key={`r-${sub}`}
          className={s.reflect}
          data-for={sub}
          data-on={active === sub || undefined}
          style={{ left: `${SPOT[layout][sub].at[0] * 100}%` }}
          aria-hidden="true"
        />
      ))}
      <span className={s.wash} data-wash="" aria-hidden="true" />
      {SUBJECTS.map((sub) => {
        const { at, label } = SPOT[layout][sub];
        return (
          <button
            key={sub}
            type="button"
            className={s.choice}
            data-on={active === sub || undefined}
            disabled={!ready || chosen !== null}
            aria-label={`${NAMES[sub]}, ${percents[sub]}% done`}
            onPointerDown={(e) => {
              pointer.current = e.pointerType;
              pressing.current = true;
            }}
            onPointerCancel={() => {
              pressing.current = false;
            }}
            onPointerEnter={(e) => {
              pointer.current = e.pointerType;
              if (e.pointerType !== "touch") setActive(sub);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== "touch") setActive((a) => (a === sub ? null : a));
            }}
            onFocus={() => {
              if (!pressing.current) setActive(sub);
            }}
            onBlur={() => setActive((a) => (a === sub ? null : a))}
            onClick={() => {
              const pressed = pressing.current;
              pressing.current = false;
              if (pressed && pointer.current === "touch" && active !== sub) {
                setActive(sub);
                return;
              }
              choose(sub);
            }}
          >
            <span
              className={s.lantern}
              data-lantern={sub}
              style={{ left: `${at[0] * 100}%`, top: `${at[1] * 100}%` }}
            >
              <span className={s.bob}>
                <span className={s.hop}>
                  <span className={s.glow} data-glow="" />
                  <canvas
                    ref={(c) => {
                      bodies.current[sub] = c;
                    }}
                    className={s.body}
                  />
                </span>
              </span>
            </span>
            <span
              className={s.label}
              style={{ left: `${label[0] * 100}%`, top: `${label[1] * 100}%` }}
            >
              <span className={s.name}>{NAMES[sub]}</span>
              <span className={s.pct}>
                <Num>{percents[sub]}%</Num> done
              </span>
            </span>
          </button>
        );
      })}
      <canvas ref={ground} className={`${s.full} ${s.ground}`} aria-hidden="true" />
    </div>
  );
}
