"use client";

/*
 * Intro 7, the folded map (founder, 2026-11-08). The screen is an old painted paper map lying on
 * a table, folded along one diagonal crease into two panels: Math lands above and to the left,
 * Reading and Writing lands below and to the right (the same diagonal as the sky, seam.ts).
 *
 * - The map paints itself in, stroke by stroke, then the two panels take over.
 * - Pointing at a panel (or focusing it, or a first tap on a touch screen) lifts its outer corner
 *   off the table with a paper shadow under it; the other panel dims a little.
 * - Choosing a panel unfolds it toward you in 3D around the crease while the other folds away.
 *   It fills the screen as that subject's map, then the camera lowers into it: the map tilts away
 *   like the ground under you and the real painted landscape (the shared ground scene) rises out
 *   of it. Then the page opens the Library box over that same scene.
 * - Reduced motion: no lift or fold, pointing brightens a panel, choosing cross-fades to the
 *   ground scene.
 * Transforms and opacity only, so it runs at the screen's frame rate.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Num } from "@/components/portal/primitives";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { ctx2d } from "@/lib/painting/noise";
import { renderLibraryScene } from "@/lib/painting/library/scenes";
import { SEAM, clipPath, layoutFor, type Layout } from "@/lib/painting/library/seam";
import type { IntroProps, Subject } from "../registry";
import { SLUG, paintGround, readTint } from "../paint-ground";
import { TABLE, renderFoldedMap, renderSubjectMap } from "./map-art";
import s from "./folded-map.module.css";

const NAMES: Record<Subject, string> = { math: "Math", rw: "Reading and Writing" };
const SUBJECTS: Subject[] = ["math", "rw"];
const PAINT_MS = 1800;
const EASE = "cubic-bezier(0.55, 0, 0.3, 1)";

/** Where each name sits (fractions), clear of the landmarks. */
const LABEL: Record<Layout, Record<Subject, [number, number]>> = {
  wide: { math: [0.27, 0.19], rw: [0.7, 0.6] },
  tall: { math: [0.5, 0.2], rw: [0.5, 0.74] },
};

/** The crease as a unit axis (x, y) in screen space, for rotate3d. */
function creaseAxis(layout: Layout, w: number, h: number): [number, number] {
  const [a, b] = SEAM[layout];
  const dx = (b[0] - a[0]) * w;
  const dy = (b[1] - a[1]) * h;
  const n = Math.hypot(dx, dy) || 1;
  return [dx / n, dy / n];
}

export default function FoldedMap({ percents, time, reducedMotion, onChoose }: IntroProps) {
  const root = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const flat = useRef<HTMLCanvasElement>(null);
  const maps = useRef<Partial<Record<Subject, HTMLCanvasElement | null>>>({});
  const flaps = useRef<Partial<Record<Subject, HTMLCanvasElement | null>>>({});
  const subjectMap = useRef<HTMLCanvasElement>(null);
  const ground = useRef<HTMLCanvasElement>(null);
  const [layout, setLayout] = useState<Layout>("wide");
  /** The map sheet's size, and the whole screen's (where the landscape lands). */
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const screen = useRef<[number, number]>([0, 0]);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<Subject | null>(null);
  const [chosen, setChosen] = useState<Subject | null>(null);
  const pointer = useRef("mouse");
  const pressing = useRef(false);
  const chosenRef = useRef<Subject | null>(null);

  /* Paint the map (again, at once, after a resize). */
  useEffect(() => {
    const el = sheet.current;
    const all = root.current;
    if (!el || !all) return;
    let handle: PaintHandle | null = null;
    let painted = "";
    let first = true;
    const paint = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (w < 8 || h < 8 || chosenRef.current) return;
      screen.current = [all.clientWidth, all.clientHeight];
      if (`${w}x${h}` === painted) return;
      painted = `${w}x${h}`;
      const lay = layoutFor(w, h);
      setLayout(lay);
      setSize([w, h]);
      const { hue, sat } = readTint();
      const src = renderFoldedMap(lay, time, w, h, `hsl(${hue} ${Math.max(40, sat)}% 46%)`);
      const c = flat.current;
      if (!c) return;
      handle?.stop();
      setReady(false);
      handle = paintPicture(c, src, {
        animate: first && !reducedMotion,
        ms: PAINT_MS,
        width: w,
        height: h,
        brush: 0.8,
        done: () => {
          /* Copy the painted map into both panels, and each outer corner into its flap. */
          for (const sub of SUBJECTS) {
            const m = maps.current[sub];
            if (m) {
              m.width = c.width;
              m.height = c.height;
              ctx2d(m).drawImage(c, 0, 0);
            }
            const f = flaps.current[sub];
            if (f) {
              const side = Math.round(c.width * (f.clientWidth / w || 0.2));
              f.width = side;
              f.height = side;
              const sx = sub === "math" ? 0 : c.width - side;
              const sy = sub === "math" ? 0 : c.height - side;
              ctx2d(f).drawImage(c, sx, sy, side, side, 0, 0, side, side);
            }
          }
          setReady(true);
        },
      });
      first = false;
    };
    const t = window.setTimeout(paint, 0);
    let resize = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resize);
      resize = window.setTimeout(paint, 180);
    });
    ro.observe(all);
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
    const [w, h] = screen.current;
    const g = ground.current;
    const m = subjectMap.current;
    if (!g || !m || !w) return onChoose(sub);
    paintGround(g, sub, time, w, h);
    if (reducedMotion) {
      g.animate({ opacity: [0, 1] }, { duration: 500, fill: "forwards" }).finished.then(
        () => onChoose(sub),
        () => onChoose(sub)
      );
      return;
    }
    const { hue, sat } = readTint();
    const pic = renderLibraryScene(SLUG[sub], layoutFor(w, h), time, { hue, sat }, h / w);
    paintPicture(m, renderSubjectMap(pic, time, w, h, `hsl(${hue} ${Math.max(40, sat)}% 46%)`), {
      animate: false,
      width: w,
      height: h,
      brush: 0.8,
    });
    const [ax, ay] = creaseAxis(layout, size[0], size[1]);
    const turn = (deg: number) => `perspective(1400px) rotate3d(${ax}, ${ay}, 0, ${deg}deg)`;
    /* The chosen panel's side of the crease swings up toward the viewer; the sign depends on
       which side of the crease it lies. */
    const up = sub === "math" ? 1 : -1;
    const panel = root.current?.querySelector<HTMLElement>(`[data-subject="${sub}"]`);
    const other = root.current?.querySelector<HTMLElement>(
      `[data-subject="${sub === "math" ? "rw" : "math"}"]`
    );
    panel?.animate(
      [
        { transform: turn(0), opacity: 1 },
        { transform: `${turn(24 * up)} translateZ(60px)`, opacity: 1, offset: 0.45 },
        { transform: `${turn(6 * up)} scale(1.8)`, opacity: 1, offset: 0.8 },
        { transform: `${turn(0)} scale(2.2)`, opacity: 0 },
      ],
      { duration: 1150, easing: EASE, fill: "forwards" }
    );
    other?.animate(
      [
        { transform: turn(0), opacity: 1 },
        { transform: turn(-84 * up), opacity: 0 },
      ],
      { duration: 700, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "forwards" }
    );
    m.animate(
      [
        { opacity: 0, transform: "scale(1.12)", offset: 0 },
        { opacity: 1, transform: "none", offset: 0.3 },
        { opacity: 1, transform: "none", offset: 0.48 },
        {
          opacity: 1,
          transform: "perspective(900px) rotateX(46deg) translateY(4%) scale(1.2)",
          offset: 0.78,
        },
        { opacity: 0, transform: "perspective(900px) rotateX(62deg) translateY(8%) scale(1.3)" },
      ],
      { duration: 2300, delay: 650, easing: "cubic-bezier(0.45, 0, 0.35, 1)", fill: "both" }
    );
    g.animate(
      [
        { opacity: 0, transform: "perspective(900px) rotateX(32deg) translateY(10%) scale(1.25)" },
        {
          opacity: 1,
          transform: "perspective(900px) rotateX(12deg) translateY(3%) scale(1.08)",
          offset: 0.5,
        },
        { opacity: 1, transform: "none" },
      ],
      { duration: 1500, delay: 1550, easing: "cubic-bezier(0.25, 0.6, 0.3, 1)", fill: "both" }
    ).finished.then(
      () => onChoose(sub),
      () => onChoose(sub)
    );
  };

  const [w, h] = size;
  const vars = {
    background: TABLE[time],
    "--flap": layout === "wide" ? "min(22vmin, 220px)" : "min(26vmin, 160px)",
  } as CSSProperties;

  return (
    <div
      ref={root}
      className={s.root}
      style={vars}
      data-time={time}
      data-ready={ready || undefined}
      data-active={active ?? undefined}
      data-chosen={chosen ?? undefined}
      data-still={reducedMotion || undefined}
    >
      <div ref={sheet} className={s.sheet}>
        <canvas ref={flat} className={s.flat} aria-hidden="true" />
        {SUBJECTS.map((sub) => {
          const [lx, ly] = LABEL[layout][sub];
          return (
            <button
              key={sub}
              type="button"
              className={s.panel}
              data-subject={sub}
              data-on={active === sub || undefined}
              disabled={!ready || chosen !== null}
              style={{
                clipPath: clipPath(layout, SLUG[sub]),
                WebkitClipPath: clipPath(layout, SLUG[sub]),
              }}
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
              <canvas
                ref={(c) => {
                  maps.current[sub] = c;
                }}
                className={s.map}
                aria-hidden="true"
              />
              <span className={s.shade} aria-hidden="true" />
              <span className={s.hole} aria-hidden="true" />
              <span className={s.flap} aria-hidden="true">
                <canvas
                  ref={(c) => {
                    flaps.current[sub] = c;
                  }}
                />
              </span>
              <span className={s.label} style={{ left: `${lx * 100}%`, top: `${ly * 100}%` }}>
                <span className={s.name}>{NAMES[sub]}</span>
                <span className={s.pct}>
                  <Num>{percents[sub]}%</Num> done
                </span>
              </span>
            </button>
          );
        })}
        {w > 0 && (
          <svg className={s.crease} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
            <line
              x1={SEAM[layout][0][0] * w}
              y1={SEAM[layout][0][1] * h}
              x2={SEAM[layout][1][0] * w}
              y2={SEAM[layout][1][1] * h}
            />
          </svg>
        )}
      </div>
      <canvas ref={subjectMap} className={s.stage} aria-hidden="true" />
      <canvas ref={ground} className={s.stage} aria-hidden="true" />
    </div>
  );
}
