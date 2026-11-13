"use client";

/*
 * The Library's world (founder, 2026-11-08): "start the hero split in the sky and then maybe even
 * in space, and then have an animation (once a section is clicked) to transport us or pan us back
 * down to the scene."
 *
 * Three layers, stacked like a film strip and moved only with transforms:
 * - The sky, where the Library opens: two skies, Math and Reading and Writing, joined on a
 *   painted diagonal (sky.ts, seam.ts). Each half is a button cut to its side of the diagonal.
 *   Pointing at one, focusing it, or a first tap on a touch screen brings it to life (sky-life.ts)
 *   while the other dims. A click, or the second tap, chooses it.
 * - A bank of cloud.
 * - The ground: the chosen subject's scene (scenes.ts), the bridge and lake or the book meadow.
 * Choosing a half slides its sky over the other and the camera falls: the sky rises away, the
 * clouds rush past, and the ground arrives (about 1.9 s, interruptible, CSS transitions on
 * transforms only). Closing the box climbs back up. Switching course cross-fades the ground.
 * Everything is painted stroke by stroke with the backdrop's brushwork (painterly.ts), in the
 * day's light and hue. Reduced motion (or "Keep the painting still"): painted at once, nothing
 * moves, the sky and the ground cross-fade, and pointing at a half only brightens it.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Num } from "@/components/portal/primitives";
import { choosePainting } from "@/lib/painting/schedule";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { prefersStill } from "@/lib/painting/motion";
import { ctx2d } from "@/lib/painting/noise";
import type { TimeOfDay } from "@/lib/painting/light";
import { drawPaintingLife, paintingLife, type PaintingLife } from "@/lib/painting/library/life";
import { renderLibraryScene, type LibraryPicture } from "@/lib/painting/library/scenes";
import { renderClouds, renderSky, type SkyPicture } from "@/lib/painting/library/sky";
import {
  drawMathSkyHover,
  drawReadingSky,
  drawTwinkle,
  nebulaState,
} from "@/lib/painting/library/sky-life";
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

/** How long the fall from the sky to the ground takes (the CSS transition matches). */
export const DESCENT_MS = 1900;
/** The sky paints in stroke by stroke once per browser session; later visits show it done. */
const PAINTED_KEY = "karman:library-painted";
const PAINT_MS = 2600;

type Canvases = Record<string, HTMLCanvasElement | null>;

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

const noPaint: PaintHandle = { stop() {}, final: null as unknown as HTMLCanvasElement };

export default function LibraryWorld({
  courses,
  ready,
  pick,
  active,
  flying,
  reduce,
  onActive,
  onChoose,
  jump = false,
}: {
  courses: StageCourse[];
  /** True once the Challenge moment and the day's painting are out of the way. */
  ready: boolean;
  /** The open course: the camera is down on its ground. Null: up in the sky. */
  pick: Slug | null;
  /** The half being pointed at or focused. */
  active: Slug | null;
  /** The name travelling to the box's toggle, hidden here meanwhile. */
  flying: Slug | null;
  reduce: boolean;
  onActive: (slug: Slug | null) => void;
  /** Chooses a course. `from` is the ground point the box opens out of; `name` is the name's box
   *  on screen and `line` its line height, for the name's flight into the toggle. */
  onChoose: (
    slug: Slug,
    from: { x: number; y: number; name: DOMRect | null; line: number }
  ) => void;
  /** An opening animation (`?intro=N`) has already brought the camera down: land at once. */
  jump?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const cv = useRef<Canvases>({});
  const names = useRef<Record<Slug, HTMLSpanElement | null>>({
    math: null,
    "reading-writing": null,
  });
  const grounds = useRef<Partial<Record<Slug, LibraryPicture>>>({});
  const [layout, setLayout] = useState<Layout>("wide");
  const [mask, setMask] = useState<string | null>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [shown, setShown] = useState(false);
  const [still, setStill] = useState(false);
  /* A course already open when the page loads lands at once, without the fall. */
  const [instant, setInstant] = useState(true);
  const pointer = useRef<string>("mouse");
  /** True between a press and its click, so the focus a tap gives doesn't count as the first tap. */
  const pressing = useRef(false);
  const state = useRef({ active, pick });
  state.current = { active, pick };
  /** Starts painting the grounds now, if the sky is still painting in when a course is chosen. */
  const groundsNow = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (pick) groundsNow.current?.();
  }, [pick]);

  useEffect(() => {
    if (!shown) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)));
    return () => cancelAnimationFrame(id);
  }, [shown]);

  /* Paint the skies, then the clouds and both grounds; again (at once) after a resize. */
  useEffect(() => {
    const el = host.current;
    if (!ready || !el || typeof ResizeObserver === "undefined") return;
    const hold = reduce || prefersStill();
    setStill(hold);
    const dev = process.env.NODE_ENV !== "production";
    const time: TimeOfDay = choosePainting(new Date(), location.search, dev).time;
    const night = time === "night";
    const handles: PaintHandle[] = [];
    let raf = 0;
    let timer = 0;
    let painted = "";
    let disposed = false;
    let stopLife: (() => void) | null = null;

    const font = () =>
      names.current.math ? getComputedStyle(names.current.math).fontFamily : "Georgia, serif";

    const startLife = (skies: Record<Slug, SkyPicture>, w: number, h: number, lay: Layout) => {
      if (hold) return;
      const sc = cv.current.skyLive;
      const gc = cv.current.groundLive;
      if (!sc || !gc) return;
      const f = font();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [sc, gc]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const sg = ctx2d(sc);
      const gg = ctx2d(gc);
      const S = Math.min(1.6, Math.max(0.8, Math.sqrt(w * h) / 760));
      const map = { X: (u: number) => u * w, Y: (v: number) => v * h, S };
      const polys = Object.fromEntries(
        SLUGS.map((s) => [s, halfPolygon(lay, s).map(([x, y]) => [x * w, y * h])])
      ) as Record<Slug, number[][]>;
      const hover = { math: 0, "reading-writing": 0 } as Record<Slug, number>;
      const since = { math: 0, "reading-writing": 0 } as Record<Slug, number>;
      const nebula = nebulaState();
      const lives: Partial<Record<Slug, PaintingLife>> = {};
      const t0 = performance.now();
      let last = t0;
      let alpha = 0;
      let wasDown = false;
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
        const t = (now - t0) / 1000;
        /* Down on the ground: the open course's own life. */
        if (open) {
          if (!wasDown) {
            sg.setTransform(1, 0, 0, 1, 0, 0);
            sg.clearRect(0, 0, sc.width, sc.height);
          }
          wasDown = true;
          gg.setTransform(dpr, 0, 0, dpr, 0, 0);
          gg.clearRect(0, 0, w, h);
          const pic = grounds.current[open];
          if (pic) {
            lives[open] ??= paintingLife(pic.life, time, f);
            drawPaintingLife(gg, lives[open], dt, t, map, 1);
          }
          return;
        }
        wasDown = false;
        sg.setTransform(dpr, 0, 0, dpr, 0, 0);
        sg.clearRect(0, 0, w, h);
        /* Nothing moves behind the names. */
        const keep: DOMRect[] = [];
        for (const s of SLUGS) {
          const r = names.current[s]?.parentElement?.getBoundingClientRect();
          if (r) keep.push(r);
        }
        for (const s of SLUGS) {
          const target = on === s ? 1 : 0;
          hover[s] += (target - hover[s]) * Math.min(1, dt * (target ? 3.2 : 4.5));
          if (target && hover[s] < 0.05) since[s] = 0;
          since[s] += dt;
          sg.save();
          sg.beginPath();
          const p = polys[s];
          sg.moveTo(p[0][0], p[0][1]);
          for (const q of p.slice(1)) sg.lineTo(q[0], q[1]);
          sg.closePath();
          for (const r of keep) sg.rect(r.right + 8, r.top - 8, -(r.width + 16), r.height + 16);
          sg.clip("evenodd");
          const dim = on !== null && on !== s ? 0.45 : 1;
          const sky = skies[s];
          drawTwinkle(sg, sky.stars, t, map, alpha * dim);
          if (sky.math) drawMathSkyHover(sg, sky.math, hover[s], since[s], map, night);
          if (sky.reading)
            drawReadingSky(
              sg,
              sky.reading,
              nebula,
              hover[s],
              since[s],
              dt,
              map,
              night,
              f,
              alpha * dim
            );
          sg.restore();
        }
      };
      raf = requestAnimationFrame(frame);
      stopLife = () => {
        cancelAnimationFrame(raf);
        for (const [c, g] of [
          [sc, sg],
          [gc, gg],
        ] as const) {
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.clearRect(0, 0, c.width, c.height);
        }
      };
    };

    const paint = (animate: boolean) => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (w < 8 || h < 8) return;
      const key = `${w}x${h}`;
      if (key === painted) return;
      painted = key;
      handles.splice(0).forEach((p) => p.stop());
      stopLife?.();
      stopLife = null;
      const lay = layoutFor(w, h);
      setLayout(lay);
      setSize([w, h]);
      setMask(seamMask(lay, w, h));
      const tint = readTint();
      const at = { width: w, height: h };
      const put = (
        name: string,
        src: HTMLCanvasElement,
        opts: Parameters<typeof paintPicture>[2]
      ) => {
        const c = cv.current[name];
        return c ? paintPicture(c, src, { ...at, ...opts }) : noPaint;
      };
      /* The ground scenes and the clouds: painted at once, out of sight, ready for the fall. */
      let groundsStarted = false;
      const paintGrounds = () => {
        if (groundsStarted || disposed) return;
        groundsStarted = true;
        for (const s of SLUGS) {
          const pic = renderLibraryScene(s, lay, time, tint, h / w);
          grounds.current[s] = pic;
          handles.push(put(`ground-${s}`, pic.src, { animate: false }));
        }
        handles.push(put("clouds", renderClouds(lay, time, h / w), { animate: false }));
      };
      groundsNow.current = paintGrounds;
      if (state.current.pick) paintGrounds();
      const f = font();
      const skies = {
        math: renderSky("math", lay, time, tint, h / w, f),
        "reading-writing": renderSky("reading-writing", lay, time, tint, h / w, f),
      } as Record<Slug, SkyPicture>;
      let left = 2;
      const done = () => {
        if (--left === 0 && !disposed) {
          sessionFlag(true);
          startLife(skies, w, h, lay);
          paintGrounds();
        }
      };
      SLUGS.forEach((s, i) => {
        handles.push(
          put(`sky-${s}`, skies[s].src, {
            animate: animate && !hold && !state.current.pick,
            ms: PAINT_MS + i * 240,
            done,
          })
        );
      });
      setShown(true);
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
      groundsNow.current = null;
      clearTimeout(timer);
      clearTimeout(resize);
      ro.disconnect();
      handles.forEach((p) => p.stop());
      stopLife?.();
    };
  }, [ready, reduce]);

  /* Where the seam sits: on the diagonal, leaning a little toward the half being pointed at, or
     slid off the screen so the chosen sky fills it on the way down. */
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

  /** Where the box opens from: the subject on its ground, the bridge's crown or the open book. */
  const groundPoint = (slug: Slug) => {
    const pic = grounds.current[slug];
    const r = host.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    if (pic?.math) {
      const b = pic.math.bridge;
      return { x: r.left + b.cx * r.width, y: r.top + (b.base - b.rise) * r.height };
    }
    if (pic?.reading) {
      const b = pic.reading.book;
      return { x: r.left + b.cx * r.width, y: r.top + (b.by - b.ph) * r.height };
    }
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.6 };
  };

  const choose = (slug: Slug) => {
    const el = names.current[slug];
    const name = el?.getBoundingClientRect() ?? null;
    const line = el ? parseFloat(getComputedStyle(el).fontSize) || 60 : 60;
    onChoose(slug, { ...groundPoint(slug), name, line });
  };

  const canvas = (name: string, extra?: { style?: CSSProperties; slug?: Slug; on?: boolean }) => (
    <canvas
      ref={(c) => {
        cv.current[name] = c;
      }}
      className={styles.paint}
      data-slug={extra?.slug}
      data-on={extra?.on || undefined}
      style={extra?.style}
    />
  );

  return (
    <div
      ref={host}
      className={styles.world}
      data-shown={shown || undefined}
      data-view={pick ? "ground" : "sky"}
      data-pick={pick ?? undefined}
      data-active={(!pick && active) || undefined}
      data-still={still || undefined}
      data-instant={instant || jump || undefined}
      data-layout={layout}
    >
      <div className={`${styles.layer} ${styles.skyLayer}`}>
        {canvas("sky-math", { slug: "math" })}
        {canvas("sky-reading-writing", { slug: "reading-writing", style: maskStyle })}
        <canvas
          ref={(c) => {
            cv.current.skyLive = c;
          }}
          className={styles.live}
        />
        <div className={styles.halves} inert={pick !== null || !shown}>
          {courses.map((c) => (
            <button
              key={c.slug}
              type="button"
              className={styles.half}
              data-slug={c.slug}
              data-on={active === c.slug || undefined}
              style={{
                clipPath: clipPath(layout, c.slug),
                WebkitClipPath: clipPath(layout, c.slug),
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
              onClick={() => {
                const pressed = pressing.current;
                pressing.current = false;
                /* On a touch screen the first tap shows the half; the second opens it. */
                if (pressed && pointer.current === "touch" && state.current.active !== c.slug) {
                  onActive(c.slug);
                  return;
                }
                choose(c.slug);
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
      <div className={`${styles.layer} ${styles.groundLayer}`} aria-hidden="true">
        {SLUGS.map((s) => (
          <span key={s} className={styles.ground} data-on={pick === s || undefined}>
            {canvas(`ground-${s}`)}
          </span>
        ))}
        <canvas
          ref={(c) => {
            cv.current.groundLive = c;
          }}
          className={styles.live}
        />
      </div>
      <div className={`${styles.layer} ${styles.cloudLayer}`} aria-hidden="true">
        {canvas("clouds")}
      </div>
    </div>
  );
}
