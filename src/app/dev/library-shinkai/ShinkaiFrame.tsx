"use client";

/*
 * One still frame of the Shinkai-style Library opening, for the founder to approve before anything
 * is animated (2026-11-08). Painted with the real brush engine (painterly.ts) and the smooth glow
 * layer on top (glow.ts). Sets `data-ready` on its root once the paint has finished, for the
 * screenshot script.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { TimeOfDay } from "@/lib/painting/light";
import { ctx2d } from "@/lib/painting/noise";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { SEAM, seamMask } from "@/lib/painting/library/seam";
import { drawGlow } from "@/lib/painting/library/shinkai/glow";
import {
  renderLibraryPlace,
  renderObservatoryPlace,
  type Light,
} from "@/lib/painting/library/shinkai/places";
import { birds, renderDescent, renderSkySide } from "@/lib/painting/library/shinkai/sky";
import styles from "./shinkai.module.css";

export type Frame = "sky" | "descent" | "observatory" | "library";
type Pt = [number, number];

const NAMES = { math: "Math", rw: "Reading and Writing" } as const;
const PCT = { math: 6, rw: 8 } as const;
/** Where each name sits (fractions), clear of the places and the sun. */
const LABEL: Record<"math" | "rw", Pt> = { math: [0.27, 0.27], rw: [0.73, 0.55] };

/** Drifting leaves, for the Reading and Writing hover. */
function leaves(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  for (let i = 0; i < 9; i++) {
    const lx = x + Math.sin(i * 2.3) * s * 4;
    const ly = y - i * s * 0.9 + Math.cos(i * 1.7) * s;
    g.fillStyle = ["#e8a24a", "#d9743c", "#f2c45a"][i % 3];
    g.beginPath();
    g.ellipse(lx, ly, s * 0.5, s * 0.22, i * 0.8, 0, Math.PI * 2);
    g.fill();
  }
}

export default function ShinkaiFrame({
  frame,
  time,
  hover = null,
  behindBox = false,
}: {
  frame: Frame;
  time: TimeOfDay;
  hover?: "math" | "rw" | null;
  behindBox?: boolean;
}) {
  const cv = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [ready, setReady] = useState(false);
  const [mask, setMask] = useState<string | null>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    setSize([W, H]);
    const handles: PaintHandle[] = [];
    let left = 0;
    const done = () => {
      if (--left === 0) setReady(true);
    };
    const paint = (name: string, src: HTMLCanvasElement) => {
      const c = cv.current[name];
      if (!c) return;
      left++;
      handles.push(paintPicture(c, src, { animate: false, width: W, height: H, done }));
    };
    const glow = cv.current.glow;
    const life = cv.current.life;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [glow, life]) {
      if (!c) continue;
      c.width = W * dpr;
      c.height = H * dpr;
      ctx2d(c).setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    let sun: Pt = [W / 2, H / 2];
    let lights: Light[] = [];
    if (frame === "sky") {
      setMask(seamMask("wide", W, H));
      const math = renderSkySide("math", time, W, H);
      const rw = renderSkySide("rw", time, W, H);
      paint("math", math.canvas);
      paint("rw", rw.canvas);
      sun = math.sun;
      /* Hover: that place's lights come on brighter, and its living details appear. */
      const boost = (ls: Light[], on: boolean): Light[] =>
        ls.map(([x, y, r, a]) => [x, y, r * (on ? 1.8 : 1), on ? Math.min(1, a + 0.6) : a]);
      lights = [...boost(math.lights, hover === "math"), ...boost(rw.lights, hover === "rw")];
      const g = life ? ctx2d(life) : null;
      if (g && hover === "math") {
        const [x, y] = math.dest;
        birds(g, x + W * 0.07, y - H * 0.12, W * 0.011, 7, "rgba(30,36,56,0.8)");
        birds(g, x - W * 0.02, y - H * 0.22, W * 0.008, 3, "rgba(30,36,56,0.7)");
      }
      if (g && hover === "rw") {
        const [x, y] = rw.dest;
        leaves(g, x - W * 0.04, y - H * 0.02, W * 0.006);
        birds(g, x - W * 0.08, y - H * 0.18, W * 0.009, 4, "rgba(40,30,30,0.75)");
      }
    } else if (frame === "descent") {
      const d = renderDescent(time, W, H);
      paint("one", d.canvas);
      sun = d.sun;
      lights = d.lights;
    } else {
      const p =
        frame === "observatory"
          ? renderObservatoryPlace(time, W, H)
          : renderLibraryPlace(time, W, H);
      paint("one", p.canvas);
      sun = p.sun;
      lights = p.lights;
    }
    if (glow && frame === "sky") {
      /* A soft band of light along the diagonal, so the two sides read as two places. */
      const g = ctx2d(glow);
      g.save();
      g.globalCompositeOperation = "screen";
      const [a, b] = SEAM.wide;
      const ax = a[0] * W;
      const ay = a[1] * H;
      const bx = b[0] * W;
      const by = b[1] * H;
      const nx = -(by - ay);
      const ny = bx - ax;
      const nl = Math.hypot(nx, ny);
      const band = W * 0.05;
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const gr = g.createLinearGradient(
        mx - (nx / nl) * band,
        my - (ny / nl) * band,
        mx + (nx / nl) * band,
        my + (ny / nl) * band
      );
      gr.addColorStop(0, "rgba(255,248,230,0)");
      gr.addColorStop(0.5, `rgba(255,248,230,${time === "night" ? 0.1 : 0.16})`);
      gr.addColorStop(1, "rgba(255,248,230,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      g.restore();
    }
    if (glow) {
      drawGlow(ctx2d(glow), W, H, {
        time,
        sun,
        lights,
        strength: behindBox ? 0.7 : hover ? 1.1 : 1,
        rays: frame !== "library" || time !== "night",
      });
    }
    if (left === 0) setReady(true);
    return () => handles.forEach((h) => h.stop());
  }, [frame, time, hover, behindBox]);

  const [W, H] = size;
  const maskStyle: CSSProperties = mask
    ? {
        maskImage: `url(${mask})`,
        WebkitMaskImage: `url(${mask})`,
        maskSize: `${W * 3}px ${H}px`,
        WebkitMaskSize: `${W * 3}px ${H}px`,
        maskPosition: `${-W}px 0`,
        WebkitMaskPosition: `${-W}px 0`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }
    : { opacity: 0 };

  return (
    <div className={styles.root} data-ready={ready || undefined} data-hover={hover ?? undefined}>
      {frame === "sky" ? (
        <>
          <canvas
            ref={(c) => void (cv.current.math = c)}
            className={styles.paint}
            data-side="math"
          />
          <canvas
            ref={(c) => void (cv.current.rw = c)}
            className={styles.paint}
            data-side="rw"
            style={maskStyle}
          />
        </>
      ) : (
        <canvas ref={(c) => void (cv.current.one = c)} className={styles.paint} />
      )}
      <canvas ref={(c) => void (cv.current.life = c)} className={styles.paint} />
      <canvas
        ref={(c) => void (cv.current.glow = c)}
        className={`${styles.paint} ${styles.glow}`}
      />
      {frame === "sky" &&
        (["math", "rw"] as const).map((s) => (
          <div
            key={s}
            className={styles.label}
            data-on={hover === s || undefined}
            style={{ left: `${LABEL[s][0] * 100}%`, top: `${LABEL[s][1] * 100}%` }}
          >
            <span className={styles.name}>{NAMES[s]}</span>
            <span className={styles.pct}>{PCT[s]}% done</span>
          </div>
        ))}
    </div>
  );
}
