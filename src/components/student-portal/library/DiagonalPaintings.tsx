"use client";

/*
 * The Library's opening (founder, 2026-11-08): "start the library section off with no card open
 * … have the selector be baked artistically into the actual background painting … a diagonal
 * between the Math and the Reading." He chose two paintings joined on a diagonal.
 *
 * - Two Karman paintings fill the screen, painted in stroke by stroke with the backdrop's own
 *   brushwork (painterly.ts), in the day's light and hue. Reading and Writing lies over Math,
 *   masked along a painted seam (seam.ts).
 * - Each half is a button, cut to its side of the diagonal. Pointing at one, focusing it with the
 *   keyboard, or a first tap on a touch screen brings it to life with its own animation while the
 *   other dims. A click (or the second tap) opens that course.
 * - Once a course is open, its painting grows over the other (the seam slides off the screen)
 *   and stays behind the box. Switching course slides the seam across the other way.
 * - Reduced motion (or "Keep the painting still"): painted at once, nothing moves; pointing at a
 *   half only brightens it.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Num } from "@/components/portal/primitives";
import { choosePainting } from "@/lib/painting/schedule";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { prefersStill } from "@/lib/painting/motion";
import { ctx2d } from "@/lib/painting/noise";
import type { TimeOfDay } from "@/lib/painting/light";
import {
  drawMathHover,
  drawPaintingLife,
  drawReadingHover,
  paintingLife,
  readingHoverState,
  type PaintingLife,
} from "@/lib/painting/library/life";
import { renderLibraryScene, type LibraryPicture } from "@/lib/painting/library/scenes";
import {
  LABEL_AT,
  clipPath,
  halfPolygon,
  layoutFor,
  seamMask,
  type Layout,
  type Slug,
} from "@/lib/painting/library/seam";
import styles from "./stage.module.css";

export type { Slug };

export interface StageCourse {
  slug: Slug;
  name: string;
  progress: number;
}

export const SHORT: Record<Slug, string> = {
  math: "Math",
  "reading-writing": "Reading and Writing",
};
const SLUGS: Slug[] = ["math", "reading-writing"];

/** The opening paints in stroke by stroke once per browser session; later visits show it done. */
const PAINTED_KEY = "karman:library-painted";
const PAINT_MS = 2600;

function readTint() {
  const cs = getComputedStyle(document.documentElement);
  const hue = parseFloat(cs.getPropertyValue("--hue"));
  const sat = parseFloat(cs.getPropertyValue("--hs"));
  return { hue: Number.isFinite(hue) ? hue : 208, sat: Number.isFinite(sat) ? sat : 55 };
}

function sessionFlag(set?: boolean): boolean {
  try {
    if (set) sessionStorage.setItem(PAINTED_KEY, "1");
    return sessionStorage.getItem(PAINTED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function DiagonalPaintings({
  courses,
  ready,
  pick,
  active,
  flying,
  reduce,
  onActive,
  onChoose,
  onShown,
}: {
  courses: StageCourse[];
  /** True once the Challenge moment and the day's painting are out of the way. */
  ready: boolean;
  /** The open course: its painting fills the screen. */
  pick: Slug | null;
  /** The half being pointed at or focused. */
  active: Slug | null;
  /** The name travelling to the box's toggle, hidden here meanwhile. */
  flying: Slug | null;
  reduce: boolean;
  onActive: (slug: Slug | null) => void;
  /** Opens a course; `from` is the screen point the box grows out of. */
  onChoose: (
    slug: Slug,
    from: { x: number; y: number; name: DOMRect | null; line: number }
  ) => void;
  onShown?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const paints = useRef<Record<Slug, HTMLCanvasElement | null>>({
    math: null,
    "reading-writing": null,
  });
  const liveRef = useRef<HTMLCanvasElement>(null);
  const names = useRef<Record<Slug, HTMLSpanElement | null>>({
    math: null,
    "reading-writing": null,
  });
  const [layout, setLayout] = useState<Layout>("wide");
  const [mask, setMask] = useState<string | null>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [shown, setShown] = useState(false);
  const [still, setStill] = useState(false);
  const pointer = useRef<string>("mouse");
  /** True between a press and its click, so the focus a tap gives doesn't count as the first tap. */
  const pressing = useRef(false);
  const state = useRef({ active, pick });
  state.current = { active, pick };
  const shownCb = useRef(onShown);
  shownCb.current = onShown;

  /* Paint both pictures once ready, and again (at once, without the opening) after a resize. */
  useEffect(() => {
    const el = host.current;
    if (!ready || !el || typeof ResizeObserver === "undefined") return;
    const hold = reduce || prefersStill();
    setStill(hold);
    const dev = process.env.NODE_ENV !== "production";
    const time: TimeOfDay = choosePainting(new Date(), location.search, dev).time;
    let handles: PaintHandle[] = [];
    let raf = 0;
    let timer = 0;
    let painted = "";
    let disposed = false;
    let stopLife: (() => void) | null = null;

    const startLife = (pics: Record<Slug, LibraryPicture>, w: number, h: number, lay: Layout) => {
      const lc = liveRef.current;
      if (!lc || hold) return;
      const font = names.current.math ? getComputedStyle(names.current.math).fontFamily : "serif";
      const lives: Record<Slug, PaintingLife> = {
        math: paintingLife(pics.math.life, time, font),
        "reading-writing": paintingLife(pics["reading-writing"].life, time, font),
      };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      lc.width = Math.round(w * dpr);
      lc.height = Math.round(h * dpr);
      const g = ctx2d(lc);
      const S = Math.min(1.6, Math.max(0.8, Math.sqrt(w * h) / 760));
      const map = { X: (u: number) => u * w, Y: (v: number) => v * h, S };
      const polys = Object.fromEntries(
        SLUGS.map((s) => [s, halfPolygon(lay, s).map(([x, y]) => [x * w, y * h])])
      ) as Record<Slug, number[][]>;
      const hover = { math: 0, "reading-writing": 0 } as Record<Slug, number>;
      const since = { math: 0, "reading-writing": 0 } as Record<Slug, number>;
      const words = readingHoverState();
      const t0 = performance.now();
      let last = t0;
      let alpha = 0;
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (document.hidden) {
          last = now;
          return;
        }
        const { active: on, pick: open } = state.current;
        const busy = on !== null || hover.math > 0.01 || hover["reading-writing"] > 0.01;
        if (!busy && now - last < 1000 / 30) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        alpha = Math.min(1, alpha + dt / 1.2);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        /* Nothing moves behind the names. */
        const keep: DOMRect[] = [];
        if (!open) {
          for (const s of SLUGS) {
            const r = names.current[s]?.parentElement?.getBoundingClientRect();
            if (r) keep.push(r);
          }
        }
        for (const s of SLUGS) {
          if (open && open !== s) continue;
          const target = !open && on === s ? 1 : 0;
          hover[s] += (target - hover[s]) * Math.min(1, dt * (target ? 3.2 : 4.5));
          if (target && hover[s] < 0.05) since[s] = 0;
          since[s] += dt;
          g.save();
          g.beginPath();
          if (!open) {
            const p = polys[s];
            g.moveTo(p[0][0], p[0][1]);
            for (const q of p.slice(1)) g.lineTo(q[0], q[1]);
            g.closePath();
          } else {
            g.rect(0, 0, w, h);
          }
          for (const r of keep) g.rect(r.right + 8, r.top - 8, -(r.width + 16), r.height + 16);
          g.clip("evenodd");
          const dim = !open && on !== null && on !== s ? 0.45 : 1;
          drawPaintingLife(g, lives[s], dt, (now - t0) / 1000, map, alpha * dim);
          const pic = pics[s];
          if (pic.math) drawMathHover(g, pic.math, hover[s], since[s], map, time);
          if (pic.reading)
            drawReadingHover(g, pic.reading, words, hover[s], since[s], dt, map, time, font);
          g.restore();
        }
      };
      raf = requestAnimationFrame(frame);
      stopLife = () => {
        cancelAnimationFrame(raf);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, lc.width, lc.height);
      };
    };

    const paint = (animate: boolean) => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (w < 8 || h < 8) return;
      const key = `${w}x${h}`;
      if (key === painted) return;
      painted = key;
      handles.forEach((p) => p.stop());
      stopLife?.();
      stopLife = null;
      const lay = layoutFor(w, h);
      setLayout(lay);
      setSize([w, h]);
      setMask(seamMask(lay, w, h));
      const tint = readTint();
      const pics = {
        math: renderLibraryScene("math", lay, time, tint, h / w),
        "reading-writing": renderLibraryScene("reading-writing", lay, time, tint, h / w),
      } as Record<Slug, LibraryPicture>;
      let left = 2;
      const done = () => {
        if (--left === 0 && !disposed) {
          sessionFlag(true);
          startLife(pics, w, h, lay);
        }
      };
      handles = SLUGS.map((s, i) => {
        const canvas = paints.current[s];
        if (!canvas) return { stop() {}, final: canvas as unknown as HTMLCanvasElement };
        return paintPicture(canvas, pics[s].src, {
          animate: animate && !hold,
          ms: PAINT_MS + i * 240,
          width: w,
          height: h,
          done,
        });
      });
      setShown(true);
      shownCb.current?.();
    };

    const safePaint = (animate: boolean) => {
      try {
        paint(animate);
      } catch (error) {
        /* Without the paintings, the names still show over the day's painting and still work. */
        console.error("[library] the paintings could not load", error);
        setShown(true);
      }
    };
    timer = window.setTimeout(() => safePaint(!sessionFlag()), 0);
    let resize = 0;
    const ro = new ResizeObserver(() => {
      if (!painted) return;
      clearTimeout(resize);
      resize = window.setTimeout(() => safePaint(false), 180);
    });
    ro.observe(el);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(resize);
      ro.disconnect();
      handles.forEach((p) => p.stop());
      stopLife?.();
    };
  }, [ready, reduce]);

  /* Where the seam sits: on the diagonal, leaning a little toward the half being pointed at, or
     slid off the screen so the open course's painting fills it. */
  const [w, h] = size;
  const lean = still ? 0 : 0.035;
  const seam = pick === "math" ? 1 : pick ? -1 : active === "math" ? lean : active ? -lean : 0;
  const tall = layout === "tall";
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

  const choose = (slug: Slug, x: number, y: number) => {
    const el = names.current[slug];
    const name = el?.getBoundingClientRect() ?? null;
    const line = el ? parseFloat(getComputedStyle(el).fontSize) || 60 : 60;
    const at =
      x || y ? { x, y } : name ? { x: name.left + name.width / 2, y: name.bottom } : { x: 0, y: 0 };
    onChoose(slug, { ...at, name, line });
  };

  return (
    <div
      ref={host}
      className={styles.paintings}
      data-shown={shown || undefined}
      data-pick={pick ?? undefined}
      data-active={(!pick && active) || undefined}
      data-still={still || undefined}
      data-layout={layout}
    >
      <canvas
        ref={(c) => {
          paints.current.math = c;
        }}
        className={styles.paint}
        data-slug="math"
      />
      <canvas
        ref={(c) => {
          paints.current["reading-writing"] = c;
        }}
        className={styles.paint}
        data-slug="reading-writing"
        style={maskStyle}
      />
      <canvas ref={liveRef} className={styles.live} />
      <div className={styles.halves} inert={pick !== null || !shown}>
        {courses.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={styles.half}
            data-slug={c.slug}
            data-on={active === c.slug || undefined}
            style={{ clipPath: clipPath(layout, c.slug), WebkitClipPath: clipPath(layout, c.slug) }}
            onPointerDown={(e) => {
              pointer.current = e.pointerType;
              pressing.current = true;
            }}
            onPointerCancel={() => {
              pressing.current = false;
            }}
            onPointerEnter={(e) => {
              pointer.current = e.pointerType;
              if (e.pointerType !== "touch") onActive(c.slug);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== "touch" && state.current.active === c.slug) onActive(null);
            }}
            onFocus={() => {
              if (!pressing.current) onActive(c.slug);
            }}
            onBlur={() => {
              if (state.current.active === c.slug) onActive(null);
            }}
            onClick={(e) => {
              const pressed = pressing.current;
              pressing.current = false;
              /* On a touch screen the first tap shows the half; the second opens it. */
              if (pressed && pointer.current === "touch" && state.current.active !== c.slug) {
                onActive(c.slug);
                return;
              }
              choose(c.slug, e.clientX, e.clientY);
            }}
          >
            <span
              className={styles.label}
              style={{
                left: `${LABEL_AT[layout][c.slug][0] * 100}%`,
                top: `${LABEL_AT[layout][c.slug][1] * 100}%`,
                visibility: flying === c.slug ? "hidden" : undefined,
              }}
            >
              <span
                ref={(n) => {
                  names.current[c.slug] = n;
                }}
                className={styles.name}
              >
                {SHORT[c.slug]}
              </span>
              <span className={styles.pct}>
                <Num>{Math.round(c.progress * 100)}%</Num> done
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
