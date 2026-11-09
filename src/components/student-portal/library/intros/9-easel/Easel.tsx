"use client";

/*
 * Intro 9, the easel (founder, 2026-11-08): a painter's easel in a quiet studio. Its canvas is
 * split by a diagonal pencil line, each half lightly sketched: the bridge and lake for Math, the
 * meadow and book for Reading and Writing.
 * - Pointing at a half (or focusing it, or a first tap on a touch screen) brushes a few strokes of
 *   that scene's colors onto it.
 * - Choosing it: the brush paints that half in fully, stroke by stroke and quickly, with the same
 *   stroke engine as the daily paintings (painterly.ts). Then the camera pushes into the canvas
 *   until it fills the screen and becomes the scene, and the page opens the Library box over it.
 * The easel's canvas has the screen's proportions, so the push lands exactly on the full-screen
 * ground scene. Transforms and opacity only during the push. Reduced motion: no strokes move, the
 * studio cross-fades to the scene.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Num } from "@/components/portal/primitives";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { ctx2d } from "@/lib/painting/noise";
import { hslColor } from "@/lib/painting/library/motifs";
import { renderLibraryScene } from "@/lib/painting/library/scenes";
import { halfPolygon, layoutFor, type Layout, type Slug } from "@/lib/painting/library/seam";
import type { IntroProps, Subject } from "../registry";
import {
  artRect,
  drawDabs,
  drawSketch,
  planDabs,
  renderStudio,
  type ArtRect,
  type Dab,
} from "./studio-art";
import styles from "./easel.module.css";

const SUBJECTS: Subject[] = ["math", "rw"];
const SLUG: Record<Subject, Slug> = { math: "math", rw: "reading-writing" };
const NAME: Record<Subject, string> = { math: "Math", rw: "Reading and Writing" };
/** Where each name sits on its half of the easel's canvas (fractions of the canvas). */
const LABEL: Record<Layout, Record<Subject, [number, number]>> = {
  wide: { math: [0.29, 0.3], rw: [0.71, 0.7] },
  tall: { math: [0.5, 0.2], rw: [0.5, 0.8] },
};
const PAINT_MS = 1300;
const PUSH_MS = 1250;

type Phase = "idle" | "paint" | "push";

function readTint() {
  const cs = getComputedStyle(document.documentElement);
  const hue = parseFloat(cs.getPropertyValue("--hue"));
  const sat = parseFloat(cs.getPropertyValue("--hs"));
  return { hue: Number.isFinite(hue) ? hue : 208, sat: Number.isFinite(sat) ? sat : 55 };
}

/** The half as a clip-path, or (matched point for point) the whole canvas, so it can grow. */
function clip(layout: Layout, s: Subject, full = false): string {
  const pts = full
    ? [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]
    : halfPolygon(layout, SLUG[s]);
  return `polygon(${pts.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(", ")})`;
}

interface World {
  vw: number;
  vh: number;
  layout: Layout;
  art: ArtRect;
}

export default function Easel({ percents, time, reducedMotion, onChoose }: IntroProps) {
  const [world, setWorld] = useState<World | null>(null);
  const [active, setActive] = useState<Subject | null>(null);
  const [chosen, setChosen] = useState<Subject | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState(false);
  const bg = useRef<HTMLCanvasElement>(null);
  const sketch = useRef<HTMLCanvasElement>(null);
  const paint = useRef<HTMLCanvasElement>(null);
  const hover = useRef<Record<Subject, HTMLCanvasElement | null>>({ math: null, rw: null });
  const ground = useRef<Record<Subject, HTMLCanvasElement | null>>({ math: null, rw: null });
  const labels = useRef<Record<Subject, HTMLSpanElement | null>>({ math: null, rw: null });
  const scenes = useRef<Partial<Record<Subject, HTMLCanvasElement>>>({});
  const groundDone = useRef<Partial<Record<Subject, boolean>>>({});
  const handles = useRef<PaintHandle[]>([]);
  const dabRaf = useRef<Record<Subject, number>>({ math: 0, rw: 0 });
  const pointer = useRef("mouse");
  const pressing = useRef(false);
  const live = useRef({ active, chosen });
  live.current = { active, chosen };
  const onChooseRef = useRef(onChoose);
  onChooseRef.current = onChoose;

  /* Measure the screen; again after a resize (only before a choice). */
  useEffect(() => {
    const measure = () => {
      if (live.current.chosen) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setWorld({ vw, vh, layout: layoutFor(vw, vh), art: artRect(vw, vh) });
    };
    measure();
    let t = 0;
    const onResize = () => {
      clearTimeout(t);
      t = window.setTimeout(measure, 180);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  /* Paint the studio in, then show the sketch on the easel. */
  useEffect(() => {
    if (!world || !bg.current || !sketch.current) return;
    const { vw, vh, layout, art } = world;
    const tint = readTint();
    const accent = hslColor(tint.hue, Math.max(40, tint.sat), 46);
    const aspect = vh / vw;
    groundDone.current = {};
    for (const s of SUBJECTS)
      scenes.current[s] = renderLibraryScene(SLUG[s], layout, time, tint, aspect).src;
    const studio = renderStudio(vw, vh, time, art, accent);
    const first = !shown;
    const h = paintPicture(bg.current, studio, {
      animate: first && !reducedMotion,
      ms: 1400,
      width: vw,
      height: vh,
    });
    handles.current.push(h);
    /* The sketch is traced from the daytime scene, where every edge shows clearly. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    drawSketch(
      sketch.current,
      Math.round(art.w * dpr),
      Math.round(art.h * dpr),
      layout,
      SUBJECTS.map((s) => ({
        poly: halfPolygon(layout, SLUG[s]),
        src: renderLibraryScene(SLUG[s], layout, "day", tint, aspect).src,
      }))
    );
    setShown(true);
    const list = handles.current;
    return () => {
      list.splice(0).forEach((p) => p.stop());
    };
    // `shown` only marks the first paint; it must not repaint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, time, reducedMotion]);

  /** Paints the full-screen ground scene, ready under the push (once per subject). */
  const paintGround = (s: Subject) => {
    const c = ground.current[s];
    const src = scenes.current[s];
    if (!c || !src || !world || groundDone.current[s]) return;
    groundDone.current[s] = true;
    handles.current.push(
      paintPicture(c, src, { animate: false, width: world.vw, height: world.vh })
    );
  };

  /* Pointing at a half: a few strokes of its colors appear. Leaving: they fade. */
  useEffect(() => {
    if (!world) return;
    const { art } = world;
    for (const s of SUBJECTS) {
      const c = hover.current[s];
      if (!c) continue;
      cancelAnimationFrame(dabRaf.current[s]);
      if (active !== s || chosen) continue;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = (c.width = Math.round(art.w * dpr));
      const H = (c.height = Math.round(art.h * dpr));
      const g = ctx2d(c);
      g.clearRect(0, 0, W, H);
      const src = scenes.current[s];
      if (!src) continue;
      const lr = labels.current[s]?.getBoundingClientRect();
      const ar = c.getBoundingClientRect();
      const avoid = lr
        ? {
            x0: (lr.left - ar.left) / ar.width - 0.03,
            x1: (lr.right - ar.left) / ar.width + 0.03,
            y0: (lr.top - ar.top) / ar.height - 0.04,
            y1: (lr.bottom - ar.top) / ar.height + 0.04,
          }
        : { x0: 0, x1: 0, y0: 0, y1: 0 };
      const dabs: Dab[] = planDabs(src, halfPolygon(world.layout, SLUG[s]), avoid, W, H, 14);
      if (reducedMotion) {
        drawDabs(g, dabs, 1e6);
        continue;
      }
      const t0 = performance.now();
      const end = dabs.length * 42 + 260;
      const frame = (now: number) => {
        const t = now - t0;
        g.clearRect(0, 0, W, H);
        drawDabs(g, dabs, t);
        if (t < end) dabRaf.current[s] = requestAnimationFrame(frame);
      };
      dabRaf.current[s] = requestAnimationFrame(frame);
    }
    /* Get the scene ready behind the studio, in case this half is chosen. */
    if (active) {
      const id = window.setTimeout(() => paintGround(active), 260);
      return () => clearTimeout(id);
    }
    // paintGround reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, chosen, world, reducedMotion]);

  useEffect(() => {
    const raf = dabRaf.current;
    return () => {
      cancelAnimationFrame(raf.math);
      cancelAnimationFrame(raf.rw);
    };
  }, []);

  const choose = (s: Subject) => {
    if (live.current.chosen || !world) return;
    setChosen(s);
    setActive(s);
    paintGround(s);
    if (reducedMotion) {
      setPhase("push");
      window.setTimeout(() => onChooseRef.current(s), 450);
      return;
    }
    setPhase("paint");
    const c = paint.current;
    const src = scenes.current[s];
    if (!c || !src) {
      onChooseRef.current(s);
      return;
    }
    const { art } = world;
    handles.current.push(
      paintPicture(c, src, {
        animate: true,
        ms: PAINT_MS,
        width: art.w,
        height: art.h,
        brush: art.w < 420 ? 1.5 : 1.1,
        done: () => {
          setPhase("push");
          window.setTimeout(() => onChooseRef.current(s), PUSH_MS + 40);
        },
      })
    );
  };

  if (!world) return <div className={styles.root} />;
  const { vw, art, layout } = world;
  const scale = vw / art.w;
  const camera: CSSProperties =
    phase === "push" && !reducedMotion
      ? { transform: `translate3d(${-art.x * scale}px, ${-art.y * scale}px, 0) scale(${scale})` }
      : { transform: "translate3d(0, 0, 0) scale(1)" };

  return (
    <div
      className={styles.root}
      data-shown={shown || undefined}
      data-phase={phase}
      data-time={time}
      data-reduced={reducedMotion || undefined}
      data-intro="easel"
    >
      <div className={styles.camera} style={{ ...camera, transitionDuration: `${PUSH_MS}ms` }}>
        <canvas ref={bg} className={styles.fill} />
        <div
          className={styles.art}
          style={{ left: art.x, top: art.y, width: art.w, height: art.h }}
          data-active={active ?? undefined}
        >
          <canvas ref={sketch} className={styles.layer} />
          {SUBJECTS.map((s) => (
            <canvas
              key={s}
              ref={(c) => {
                hover.current[s] = c;
              }}
              className={`${styles.layer} ${styles.dabs}`}
              data-on={(active === s && !chosen) || undefined}
              style={{ clipPath: clip(layout, s), WebkitClipPath: clip(layout, s) }}
            />
          ))}
          <canvas
            ref={paint}
            className={`${styles.layer} ${styles.paint}`}
            data-on={chosen ? true : undefined}
            style={
              chosen
                ? {
                    clipPath: clip(layout, chosen, phase === "push"),
                    WebkitClipPath: clip(layout, chosen, phase === "push"),
                  }
                : undefined
            }
          />
          <span className={styles.light} aria-hidden="true" />
          <div className={styles.halves} inert={chosen !== null}>
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.half}
                data-subject={s}
                data-on={active === s || undefined}
                aria-label={`${NAME[s]}, ${percents[s]}% done`}
                style={{ clipPath: clip(layout, s), WebkitClipPath: clip(layout, s) }}
                onPointerDown={(e) => {
                  pointer.current = e.pointerType;
                  pressing.current = true;
                }}
                onPointerCancel={() => {
                  pressing.current = false;
                }}
                onPointerEnter={(e) => {
                  pointer.current = e.pointerType;
                  if (e.pointerType !== "touch") setActive(s);
                }}
                onPointerLeave={(e) => {
                  if (
                    e.pointerType !== "touch" &&
                    live.current.active === s &&
                    !live.current.chosen
                  )
                    setActive(null);
                }}
                onFocus={() => {
                  if (!pressing.current) setActive(s);
                }}
                onBlur={() => {
                  if (live.current.active === s && !live.current.chosen) setActive(null);
                }}
                onClick={() => {
                  const pressed = pressing.current;
                  pressing.current = false;
                  /* On a touch screen the first tap shows the strokes; the second paints. */
                  if (pressed && pointer.current === "touch" && live.current.active !== s) {
                    setActive(s);
                    return;
                  }
                  choose(s);
                }}
              >
                <span
                  ref={(n) => {
                    labels.current[s] = n;
                  }}
                  className={styles.label}
                  style={{
                    left: `${LABEL[layout][s][0] * 100}%`,
                    top: `${LABEL[layout][s][1] * 100}%`,
                  }}
                  aria-hidden="true"
                >
                  <span className={styles.name}>{NAME[s]}</span>
                  <span className={styles.pct}>
                    <Num>{percents[s]}%</Num> done
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {SUBJECTS.map((s) => (
        <canvas
          key={s}
          ref={(c) => {
            ground.current[s] = c;
          }}
          className={`${styles.fill} ${styles.ground}`}
          data-on={(chosen === s && phase === "push") || undefined}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
