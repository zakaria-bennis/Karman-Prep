"use client";

/*
 * Intro 1, "Sky to ground" (founder, 2026-11-08): "start the hero split in the sky … then have an
 * animation (once a section is clicked) to transport us or pan us back down to the scene", and
 * "it doesn't make sense that it's Saturn during the day, right above the clouds."
 *
 * The Library opens looking up. By day, dawn and sunset it is a high sky: Math has a hot-air
 * balloon and diamond kites on curving strings, Reading and Writing a kite with a tail of letters
 * and folded-page paper planes. Only at night does it open into space: a ringed planet on
 * elliptical orbits and geometric constellations for Math, an ink-and-letter nebula with book and
 * quill constellations for Reading and Writing (sky.ts). The two skies meet on a painted diagonal
 * (seam.ts); each half is a button with its own hover (sky-life.ts) while the other dims. A first
 * tap on a touch screen shows a half and the second chooses it.
 *
 * Choosing a half slides its sky over the other, then the camera falls: the sky rises away and a
 * deep bank of cloud rushes past, with the shared ground scene waiting underneath (about 1.9 s,
 * transforms only). Escape on the way down turns back. Reduced motion: a cross-fade.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Num } from "@/components/portal/primitives";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { ctx2d } from "@/lib/painting/noise";
import { renderClouds, renderSky, type SkyPicture } from "@/lib/painting/library/sky";
import {
  drawMathSkyHover,
  drawPlanes,
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
import type { IntroProps, Subject } from "../registry";
import { useIntroStage } from "../stage-context";
import styles from "./sky.module.css";

const SHORT: Record<Slug, string> = { math: "Math", "reading-writing": "Reading and Writing" };
const SLUGS: Slug[] = ["math", "reading-writing"];
const toSubject = (s: Slug): Subject => (s === "math" ? "math" : "rw");

/** How long the fall takes (the CSS transition matches). */
const DESCENT_MS = 1900;
/** The sky paints in stroke by stroke once per browser session; later visits show it done. */
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

const noPaint: PaintHandle = { stop() {}, final: null as unknown as HTMLCanvasElement };

export default function SkyToGround({ percents, time, reducedMotion, onChoose }: IntroProps) {
  const stage = useIntroStage();
  const host = useRef<HTMLDivElement>(null);
  const cv = useRef<Record<string, HTMLCanvasElement | null>>({});
  const names = useRef<Record<Slug, HTMLSpanElement | null>>({
    math: null,
    "reading-writing": null,
  });
  const [layout, setLayout] = useState<Layout>("wide");
  const [mask, setMask] = useState<string | null>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [shown, setShown] = useState(false);
  const [active, setActive] = useState<Slug | null>(null);
  const [pick, setPick] = useState<Slug | null>(null);
  const pointer = useRef<string>("mouse");
  /** True between a press and its click, so the focus a tap gives doesn't count as the first tap. */
  const pressing = useRef(false);
  const state = useRef({ active, pick });
  state.current = { active, pick };
  const hold = reducedMotion;

  /* Paint the two skies and the cloud bank; again (at once) after a resize. */
  useEffect(() => {
    const el = host.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const night = time === "night";
    const handles: PaintHandle[] = [];
    let raf = 0;
    let painted = "";
    let disposed = false;
    let stopLife: (() => void) | null = null;
    const font = () =>
      names.current.math ? getComputedStyle(names.current.math).fontFamily : "Georgia, serif";

    const startLife = (skies: Record<Slug, SkyPicture>, w: number, h: number, lay: Layout) => {
      const sc = cv.current.live;
      if (hold || !sc) return;
      const f = font();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sc.width = Math.round(w * dpr);
      sc.height = Math.round(h * dpr);
      const g = ctx2d(sc);
      const S = Math.min(1.6, Math.max(0.8, Math.sqrt(w * h) / 760));
      const map = { X: (u: number) => u * w, Y: (v: number) => v * h, S };
      const polys = Object.fromEntries(
        SLUGS.map((s) => [s, halfPolygon(lay, s).map(([x, y]) => [x * w, y * h])])
      ) as Record<Slug, number[][]>;
      const hover = { math: 0, "reading-writing": 0 } as Record<Slug, number>;
      const since = { math: 0, "reading-writing": 0 } as Record<Slug, number>;
      const drift = nebulaState();
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
        if (open || (!busy && now - last < 1000 / 30)) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        alpha = Math.min(1, alpha + dt / 1.2);
        const t = (now - t0) / 1000;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
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
          g.save();
          g.beginPath();
          const p = polys[s];
          g.moveTo(p[0][0], p[0][1]);
          for (const q of p.slice(1)) g.lineTo(q[0], q[1]);
          g.closePath();
          for (const r of keep) g.rect(r.right + 8, r.top - 8, -(r.width + 16), r.height + 16);
          g.clip("evenodd");
          const dim = on !== null && on !== s ? 0.45 : 1;
          const sky = skies[s];
          drawTwinkle(g, sky.stars, t, map, alpha * dim);
          if (sky.math) drawMathSkyHover(g, sky.math, hover[s], since[s], map, night, t);
          if (sky.reading) {
            drawReadingSky(
              g,
              sky.reading,
              drift,
              hover[s],
              since[s],
              dt,
              map,
              night,
              f,
              alpha * dim
            );
            if (sky.reading.day) drawPlanes(g, sky.reading.day.planes, hover[s], since[s], map);
          }
          g.restore();
        }
      };
      raf = requestAnimationFrame(frame);
      stopLife = () => {
        cancelAnimationFrame(raf);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, sc.width, sc.height);
      };
    };

    const paint = (animate: boolean) => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (w < 8 || h < 8 || `${w}x${h}` === painted) return;
      painted = `${w}x${h}`;
      handles.splice(0).forEach((p) => p.stop());
      stopLife?.();
      stopLife = null;
      const lay = layoutFor(w, h);
      setLayout(lay);
      setSize([w, h]);
      setMask(seamMask(lay, w, h));
      const tint = readTint();
      const put = (
        name: string,
        src: HTMLCanvasElement,
        opts: Parameters<typeof paintPicture>[2]
      ) => {
        const c = cv.current[name];
        return c ? paintPicture(c, src, { width: w, height: h, ...opts }) : noPaint;
      };
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
          handles.push(put("clouds", renderClouds(lay, time, h / w), { animate: false }));
        }
      };
      SLUGS.forEach((s, i) => {
        handles.push(
          put(`sky-${s}`, skies[s].src, {
            animate: animate && !hold,
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
        /* Without the paintings, the names still show and still work. */
        console.error("[library] the sky could not load", error);
        setShown(true);
      }
    };
    const timer = window.setTimeout(() => safePaint(!sessionFlag()), 0);
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
  }, [time, hold]);

  /* The fall: once it has played, hand over to the shared end state. Escape turns back. */
  useEffect(() => {
    if (!pick) return;
    const done = window.setTimeout(() => onChoose(toSubject(pick)), hold ? 450 : DESCENT_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      clearTimeout(done);
      stage.showGround(null);
      setPick(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(done);
      document.removeEventListener("keydown", onKey);
    };
  }, [pick, hold, onChoose, stage]);

  const choose = (slug: Slug) => {
    setActive(null);
    stage.showGround(toSubject(slug));
    setPick(slug);
  };

  /* Where the seam sits: on the diagonal, leaning a little toward the half being pointed at, or
     slid off the screen so the chosen sky fills it on the way down. */
  const [w, h] = size;
  const lean = hold ? 0 : 0.035;
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

  const percent = (s: Slug) => (s === "math" ? percents.math : percents.rw);

  return (
    <div
      ref={host}
      className={styles.world}
      data-shown={shown || undefined}
      data-view={pick ? "ground" : "sky"}
      data-pick={pick ?? undefined}
      data-active={(!pick && active) || undefined}
      data-still={hold || undefined}
    >
      <div className={`${styles.layer} ${styles.skyLayer}`}>
        <canvas
          ref={(c) => {
            cv.current["sky-math"] = c;
          }}
          className={styles.paint}
          data-slug="math"
        />
        <canvas
          ref={(c) => {
            cv.current["sky-reading-writing"] = c;
          }}
          className={styles.paint}
          data-slug="reading-writing"
          style={maskStyle}
        />
        <canvas
          ref={(c) => {
            cv.current.live = c;
          }}
          className={styles.paint}
        />
        <div className={styles.halves} inert={pick !== null || !shown}>
          {SLUGS.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.half}
              data-slug={s}
              data-on={active === s || undefined}
              style={{ clipPath: clipPath(layout, s), WebkitClipPath: clipPath(layout, s) }}
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
                /* On a touch screen the first tap shows the half; the second chooses it. */
                if (pressed && pointer.current === "touch" && state.current.active !== s) {
                  setActive(s);
                  return;
                }
                choose(s);
              }}
            >
              <span
                className={styles.label}
                style={{
                  left: `${LABEL_AT[layout][s][0] * 100}%`,
                  top: `${LABEL_AT[layout][s][1] * 100}%`,
                }}
              >
                <span
                  ref={(n) => {
                    names.current[s] = n;
                  }}
                  className={styles.name}
                  data-name=""
                >
                  {SHORT[s]}
                </span>
                <span className={styles.pct}>
                  <Num>{percent(s)}%</Num> done
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className={`${styles.layer} ${styles.cloudLayer}`} aria-hidden="true">
        <canvas
          ref={(c) => {
            cv.current.clouds = c;
          }}
          className={styles.paint}
        />
      </div>
    </div>
  );
}
