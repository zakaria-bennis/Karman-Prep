"use client";

/*
 * Intro 2, "Telescope" (founder, 2026-11-08): "you're looking through an observatory telescope's
 * round view at two things … On a click, the view pulls back, the lens widens to the full
 * screen, and you land in the scene."
 *
 * The room is an old observatory (observatory.ts), dark timber and brass around the eyepiece. In
 * the round view, the two ground scenes (the bridge and lake, the meadow and book) meet on the
 * painted diagonal, Math upper left and Reading and Writing lower right, each with its name.
 * Pointing at one (or focusing it, or a first tap) brings the telescope onto it: the view pans a
 * little toward it, a reticle traces its subject (the arch's parabola, the open book), it
 * brightens and the other dims, and the brass focusing ring turns.
 * Choosing: the chosen scene slides over the other, the view pulls back a touch, then the lens
 * opens out to the whole screen while the room falls away, landing on the shared ground (about
 * 1.6 s, transforms and clip only). Reduced motion: a cross-fade.
 */
import { animate, motion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Num } from "@/components/portal/primitives";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { renderLibraryScene, type LibraryPicture } from "@/lib/painting/library/scenes";
import { layoutFor, seamMask, SEAM, type Layout, type Slug } from "@/lib/painting/library/seam";
import type { IntroProps, Subject } from "../registry";
import { useIntroStage } from "../stage-context";
import { renderObservatory } from "./observatory";
import styles from "./telescope.module.css";

const SHORT: Record<Slug, string> = { math: "Math", "reading-writing": "Reading and Writing" };
const SLUGS: Slug[] = ["math", "reading-writing"];
const toSubject = (s: Slug): Subject => (s === "math" ? "math" : "rw");
const OPEN_MS = 1600;

interface Geo {
  w: number;
  h: number;
  layout: Layout;
  /** Lens radius in px, and how far the scene is shrunk inside it. */
  r: number;
  k: number;
}

function readTint() {
  const cs = getComputedStyle(document.documentElement);
  const hue = parseFloat(cs.getPropertyValue("--hue"));
  const sat = parseFloat(cs.getPropertyValue("--hs"));
  return { hue: Number.isFinite(hue) ? hue : 208, sat: Number.isFinite(sat) ? sat : 55 };
}

/** The diagonal's angle on screen, and the unit normal pointing into the Math half (toward the
 *  top-left corner, which is always Math's). */
function diagonal(g: Pick<Geo, "w" | "h" | "layout">) {
  const [a, b] = SEAM[g.layout];
  const base = Math.atan2((b[1] - a[1]) * g.h, (b[0] - a[0]) * g.w);
  let nx = Math.cos(base + Math.PI / 2);
  let ny = Math.sin(base + Math.PI / 2);
  if (nx * -g.w + ny * -g.h < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { base, nx, ny };
}

/** One half of the round view as a polygon (px): the circle cut by the diagonal through its middle. */
function halfOfCircle(g: Geo, slug: Slug): string {
  const { base, nx, ny } = diagonal(g);
  const mathFirst = Math.cos(base + Math.PI / 2) * nx + Math.sin(base + Math.PI / 2) * ny > 0;
  const from = (slug === "math") === mathFirst ? base : base + Math.PI;
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = from + (i / 40) * Math.PI;
    pts.push(`${g.w / 2 + Math.cos(t) * g.r}px ${g.h / 2 + Math.sin(t) * g.r}px`);
  }
  return `polygon(${pts.join(", ")})`;
}

export default function Telescope({ percents, time, reducedMotion, onChoose }: IntroProps) {
  const stage = useIntroStage();
  const host = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const cv = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [geo, setGeo] = useState<Geo | null>(null);
  const [mask, setMask] = useState<string | null>(null);
  const [pics, setPics] = useState<Partial<Record<Slug, LibraryPicture>>>({});
  const [active, setActive] = useState<Slug | null>(null);
  const [pick, setPick] = useState<Slug | null>(null);
  const pointer = useRef("mouse");
  const pressing = useRef(false);
  const state = useRef({ active, pick });
  state.current = { active, pick };

  /* Paint the room and both scenes; again after a resize. */
  useEffect(() => {
    const el = host.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const handles: PaintHandle[] = [];
    let painted = "";
    const paint = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (w < 8 || h < 8 || `${w}x${h}` === painted) return;
      painted = `${w}x${h}`;
      handles.splice(0).forEach((p) => p.stop());
      const layout = layoutFor(w, h);
      const r = Math.round(Math.min(w * (layout === "wide" ? 0.3 : 0.44), h * 0.36));
      /* Shrink the scene only as far as it still fills the round view. */
      const k = Math.min(1, Math.max((2 * r) / w, (2 * r) / h) * 1.04);
      setGeo({ w, h, layout, r, k });
      setMask(seamMask(layout, w, h));
      const tint = readTint();
      const next: Partial<Record<Slug, LibraryPicture>> = {};
      for (const s of SLUGS) {
        const pic = renderLibraryScene(s, layout, time, tint, h / w);
        next[s] = pic;
        const c = cv.current[s];
        if (c) handles.push(paintPicture(c, pic.src, { animate: false, width: w, height: h }));
      }
      setPics(next);
      const room = cv.current.room;
      if (room)
        handles.push(
          paintPicture(room, renderObservatory(time, h / w, { cx: 0.5, cy: 0.5, r: r / w }), {
            animate: !reducedMotion,
            ms: 1600,
            width: w,
            height: h,
          })
        );
    };
    const timer = window.setTimeout(() => {
      try {
        paint();
      } catch (error) {
        console.error("[library] the telescope could not load", error);
      }
    }, 0);
    let resize = 0;
    const ro = new ResizeObserver(() => {
      if (!painted) return;
      clearTimeout(resize);
      resize = window.setTimeout(paint, 180);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      clearTimeout(resize);
      ro.disconnect();
      handles.forEach((p) => p.stop());
    };
  }, [time, reducedMotion]);

  /* Choosing: the lens opens out to the whole screen, then hand over to the end state. */
  useEffect(() => {
    if (!pick || !geo) return;
    const lens = lensRef.current;
    if (reducedMotion || !lens) {
      const t = window.setTimeout(() => onChoose(toSubject(pick)), 450);
      return () => clearTimeout(t);
    }
    const { w, h, r } = geo;
    const full = Math.hypot(w, h) / 2 + 24;
    const run = animate(
      lens,
      {
        clipPath: [
          `circle(${r}px at 50% 50%)`,
          `circle(${r * 0.9}px at 50% 50%)`,
          `circle(${full}px at 50% 50%)`,
        ],
      },
      { duration: OPEN_MS / 1000, times: [0, 0.22, 1], ease: [0.6, 0, 0.25, 1] }
    );
    const t = window.setTimeout(() => onChoose(toSubject(pick)), OPEN_MS + 60);
    return () => {
      run.stop();
      clearTimeout(t);
    };
  }, [pick, geo, reducedMotion, onChoose]);

  const choose = (s: Slug) => {
    setActive(null);
    stage.showGround(toSubject(s));
    setPick(s);
  };

  const w = geo?.w ?? 0;
  const h = geo?.h ?? 0;
  const k = geo?.k ?? 0.6;
  const tall = geo?.layout === "tall";
  const seam = pick === "math" ? 1 : pick ? -1 : 0;
  const maskStyle: CSSProperties = mask
    ? {
        maskImage: `url(${mask})`,
        WebkitMaskImage: `url(${mask})`,
        maskSize: tall ? `${w}px ${h * 3}px` : `${w * 3}px ${h}px`,
        WebkitMaskSize: tall ? `${w}px ${h * 3}px` : `${w * 3}px ${h}px`,
        maskPosition: tall ? `0 ${-h + seam * h}px` : `${-w + seam * w}px 0`,
        WebkitMaskPosition: tall ? `0 ${-h + seam * h}px` : `${-w + seam * w}px 0`,
      }
    : { opacity: 0 };

  /* Where each subject sits on screen (px, unscaled scene). */
  const subject = (s: Slug): [number, number] => {
    const p = pics[s];
    if (p?.math) return [p.math.bridge.cx * w, (p.math.bridge.base - p.math.bridge.rise) * h];
    if (p?.reading) return [p.reading.book.cx * w, (p.reading.book.by - p.reading.book.ph) * h];
    return [w / 2, h / 2];
  };
  /* Hover pans the view a little toward that subject; choosing centers it and fills the screen. */
  const pan = (() => {
    if (pick) return { scale: reducedMotion ? 1 : [k, k * 0.93, 1, 1], x: 0, y: 0 };
    if (!active || reducedMotion) return { scale: k, x: 0, y: 0 };
    const [sx, sy] = subject(active);
    return { scale: k * 1.08, x: -(sx - w / 2) * k * 0.28, y: -(sy - h / 2) * k * 0.28 };
  })();

  /* The reticle's path around each subject, in scene pixels. */
  const reticle = (s: Slug) => {
    const p = pics[s];
    if (p?.math) {
      const b = p.math.bridge;
      const pts = Array.from({ length: 31 }, (_, i) => {
        const t = i / 30;
        const x = -1 + 2 * t;
        const u = b.cx - b.span / 2 + b.span * t;
        const v = b.base - b.rise + b.rise * x * x;
        return `${(u * w).toFixed(1)},${(v * h).toFixed(1)}`;
      });
      return `M${pts.join(" L")}`;
    }
    if (p?.reading) {
      const b = p.reading.book;
      const x0 = (b.cx - b.bw) * w;
      const x1 = (b.cx + b.bw) * w;
      const y0 = (b.by - b.ph * 1.25) * h;
      const y1 = (b.by + b.ph * 0.15) * h;
      const cx = b.cx * w;
      return `M${x0},${y1} L${x0},${y0 + (y1 - y0) * 0.25} Q${(x0 + cx) / 2},${y0} ${cx},${y0 + (y1 - y0) * 0.15} Q${(x1 + cx) / 2},${y0} ${x1},${y0 + (y1 - y0) * 0.25} L${x1},${y1} Z`;
    }
    return "";
  };

  const r = geo?.r ?? 0;
  const label = (s: Slug): CSSProperties => {
    const { nx, ny } = diagonal({ w, h, layout: geo?.layout ?? "wide" });
    /* Off the diagonal, along its normal, into each half. */
    const f = s === "math" ? 0.5 : -0.5;
    return { left: w / 2 + nx * r * f, top: h / 2 + ny * r * f };
  };

  return (
    <div
      ref={host}
      className={styles.root}
      data-shown={geo ? "" : undefined}
      data-pick={pick ?? undefined}
      data-active={(!pick && active) || undefined}
      data-still={reducedMotion || undefined}
    >
      <canvas
        ref={(c) => {
          cv.current.room = c;
        }}
        className={styles.room}
      />
      <div ref={lensRef} className={styles.lens} style={{ clipPath: `circle(${r}px at 50% 50%)` }}>
        <motion.div
          className={styles.scene}
          initial={false}
          animate={pan}
          transition={
            pick
              ? /* The scene reaches full size before the lens outgrows it. */
                { duration: OPEN_MS / 1000, times: [0, 0.2, 0.62, 1], ease: [0.6, 0, 0.25, 1] }
              : { type: "spring", stiffness: 120, damping: 20 }
          }
          style={{ transformOrigin: "50% 50%" }}
        >
          <canvas
            ref={(c) => {
              cv.current.math = c;
            }}
            className={styles.paint}
            data-slug-paint="math"
          />
          <canvas
            ref={(c) => {
              cv.current["reading-writing"] = c;
            }}
            className={styles.paint}
            data-slug-paint="reading-writing"
            style={maskStyle}
          />
          {geo && (
            <svg className={styles.reticle} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
              {SLUGS.map((s) => (
                <path
                  key={s}
                  d={reticle(s)}
                  pathLength={1}
                  data-on={active === s || undefined}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          )}
        </motion.div>
        <div className={styles.vignette} />
      </div>
      <div className={styles.dial} aria-hidden="true" style={{ width: r * 2.3, height: r * 2.3 }} />
      <div className={styles.halves} inert={pick !== null || !geo}>
        {geo &&
          SLUGS.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.half}
              data-slug={s}
              data-on={active === s || undefined}
              style={{ clipPath: halfOfCircle(geo, s), WebkitClipPath: halfOfCircle(geo, s) }}
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
                if (e.pointerType !== "touch" && state.current.active === s) setActive(null);
              }}
              onFocus={() => {
                if (!pressing.current) setActive(s);
              }}
              onBlur={() => {
                if (state.current.active === s) setActive(null);
              }}
              onClick={() => {
                const pressed = pressing.current;
                pressing.current = false;
                if (pressed && pointer.current === "touch" && state.current.active !== s) {
                  setActive(s);
                  return;
                }
                choose(s);
              }}
            >
              <span className={styles.label} style={label(s)}>
                <span className={styles.name} data-name="">
                  {SHORT[s]}
                </span>
                <span className={styles.pct}>
                  <Num>{s === "math" ? percents.math : percents.rw}%</Num> done
                </span>
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
