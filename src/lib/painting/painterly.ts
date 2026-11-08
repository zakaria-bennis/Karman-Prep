/*
 * Paints a picture onto a canvas stroke by stroke, the way Bob Ross paints:
 *   1. One coat of color goes on first, wet and even, never a black canvas.
 *   2. The sky goes in with big criss-cross strokes.
 *   3. Shapes are painted back to front: far away first, then nearer, then the foreground.
 *   4. Smaller strokes add texture and depth on top.
 *   5. The brightest highlights are tapped on last.
 * Stroke colors come from the picture and their direction follows its edges (after
 * Hertzmann, "Painterly Rendering with Curved Brush Strokes of Multiple Sizes", 1998).
 * Karman's landscapes take 3.8 seconds, use a fine fourth brush, and end as brushwork.
 * Ported from prototypes/today-directions/painterly.js (founder approved, 2026-11-08).
 */
import { ctx2d, makeCanvas } from "./noise";

/** How long the opening takes (founder approved, 2026-11-08). */
export const PAINT_IN_MS = 3800;

interface Stroke {
  pts: [number, number][];
  w: number;
  c: string;
  t0: number;
  dur: number;
  /** How far along the stroke has been painted, in points. */
  done: number;
}

/** Draws the source into a canvas of size w x h, cropped to cover, focused at fx, fy. */
export function cover(src: HTMLCanvasElement, w: number, h: number, fx = 0.7, fy = 0.4) {
  const c = makeCanvas(w, h);
  const k = Math.max(w / src.width, h / src.height);
  const dw = src.width * k;
  const dh = src.height * k;
  ctx2d(c).drawImage(src, (w - dw) * fx, (h - dh) * fy, dw, dh);
  return c;
}

/** Plans every stroke. Times are written for a 2-second painting and stretched later. */
function plan(src: HTMLCanvasElement, scale: number, aspect: number) {
  const w = 480;
  const h = Math.max(1, Math.round(w * aspect));
  const base = cover(src, w, h);
  const px = ctx2d(base).getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++)
    lum[i] = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11;
  const at = (x: number, y: number) => {
    const X = Math.max(0, Math.min(w - 1, x | 0));
    const Y = Math.max(0, Math.min(h - 1, y | 0));
    return X + Y * w;
  };
  const grad = (x: number, y: number): [number, number] => [
    lum[at(x + 1, y)] - lum[at(x - 1, y)],
    lum[at(x, y + 1)] - lum[at(x, y - 1)],
  ];
  const color = (x: number, y: number, r: number): [number, number, number] => {
    let R = 0;
    let G = 0;
    let B = 0;
    let n = 0;
    const st = Math.max(1, r >> 1);
    for (let j = -r; j <= r; j += st) {
      for (let i = -r; i <= r; i += st) {
        const k = at(x + i, y + j) * 4;
        R += px[k];
        G += px[k + 1];
        B += px[k + 2];
        n++;
      }
    }
    return [R / n, G / n, B / n];
  };
  const rgb = (c: number[], j = 8) =>
    `rgb(${c.map((v) => Math.round(v + (Math.random() - 0.5) * j)).join(",")})`;
  const S = (pts: [number, number][]) =>
    pts.map(([a, b]) => [a * scale, b * scale] as [number, number]);
  const stroke = (pts: [number, number][], width: number, c: string, t0 = 0, dur = 0): Stroke => ({
    pts: S(pts),
    w: width,
    c,
    t0,
    dur,
    done: -1,
  });

  /* 1. The base coat: the picture's colors, row by row, laid on in wide sweeps. */
  const rows = 7;
  const coat: Stroke[] = [];
  for (let i = 0; i < rows; i++) {
    const y = ((i + 0.5) / rows) * h;
    const c = color(w / 2, y, Math.round(h / rows));
    const pts = Array.from({ length: 13 }, (_, k): [number, number] => [
      (-0.05 + (k / 12) * 1.1) * w,
      y + Math.sin(k * 0.9 + i) * 3,
    ]);
    coat.push(stroke(pts, (h / rows) * scale * 1.5, rgb(c, 4), i * 40, 260));
  }
  const first = color(w / 2, h * 0.05, 6);

  /* 2 to 4. Strokes in four brush sizes, painted back to front: top of the picture first. */
  const strokes: Stroke[] = [];
  const layers: [number, number, number][] = [
    [12, 200, 760],
    [6, 560, 1200],
    [3, 1000, 1600],
    [1.6, 1350, 1800],
  ];
  for (const [R, t0, t1] of layers) {
    const list: (Stroke & { y: number })[] = [];
    for (let y = R / 2; y < h; y += R) {
      for (let x = R / 2; x < w; x += R) {
        const sx = x + (Math.random() - 0.5) * R;
        const sy = y + (Math.random() - 0.5) * R;
        const c = color(sx, sy, Math.max(1, Math.round(R / 2)));
        /* The finest brush only goes where there is detail to paint. */
        if (R < 2 && Math.hypot(...grad(sx, sy)) < 6) continue;
        const [gx0, gy0] = grad(sx, sy);
        const flat = Math.hypot(gx0, gy0) < 1.5;
        /* Flat areas like sky get Bob Ross's criss-cross: short strokes on alternating diagonals. */
        if (flat && R > 2) {
          const a = (Math.random() < 0.5 ? 0.7 : -0.7) + (Math.random() - 0.5) * 0.3;
          const l = R * 1.4;
          const pts: [number, number][] = [
            [sx - Math.cos(a) * l, sy - Math.sin(a) * l],
            [sx, sy],
            [sx + Math.cos(a) * l, sy + Math.sin(a) * l],
          ];
          list.push({ ...stroke(pts, R * scale * 1.5, rgb(c)), y: sy });
          continue;
        }
        const pts: [number, number][] = [[sx, sy]];
        let dx = 0;
        let dy = 0;
        let cx = sx;
        let cy = sy;
        for (let i = 0; i < 6; i++) {
          const [gx, gy] = grad(cx, cy);
          const m = Math.hypot(gx, gy);
          if (m < 1.5 && i > 1) break;
          let nx = -gy / (m || 1);
          let ny = gx / (m || 1);
          if (m < 1.5) {
            nx = 1;
            ny = 0.15;
          }
          if (nx * dx + ny * dy < 0) {
            nx = -nx;
            ny = -ny;
          }
          if (i) {
            nx = 0.6 * nx + 0.4 * dx;
            ny = 0.6 * ny + 0.4 * dy;
            const l = Math.hypot(nx, ny) || 1;
            nx /= l;
            ny /= l;
          }
          cx += nx * R;
          cy += ny * R;
          dx = nx;
          dy = ny;
          const k = at(cx, cy) * 4;
          const diff =
            Math.abs(px[k] - c[0]) + Math.abs(px[k + 1] - c[1]) + Math.abs(px[k + 2] - c[2]);
          if (i > 1 && diff > 70) break;
          pts.push([cx, cy]);
        }
        list.push({ ...stroke(pts, R * scale * (1.5 + Math.random() * 0.4), rgb(c)), y: sy });
      }
    }
    /* Back to front: far away (higher up) before near (lower down), with a little looseness. */
    const keyed = list.map((s) => ({ s, k: s.y + Math.random() * h * 0.18 }));
    keyed.sort((a, b) => a.k - b.k);
    keyed.forEach(({ s }, i) => {
      s.t0 = t0 + ((t1 - t0 - 140) * i) / keyed.length;
      s.dur = 140;
      strokes.push(s);
    });
  }

  /* 5. Highlights: the brightest spots, tapped on last with a small brush. */
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    if (lum[at(x, y)] <= 175) continue;
    const a = Math.random() * 6.28;
    const pts: [number, number][] = [
      [x, y],
      [x + Math.cos(a) * 2, y + Math.sin(a) * 2],
    ];
    strokes.push(stroke(pts, 2 * scale, rgb(color(x, y, 1), 4), 1600 + Math.random() * 180, 60));
  }
  return { first: rgb(first, 0), all: [...coat, ...strokes] };
}

function drawSeg(ctx: CanvasRenderingContext2D, s: Stroke, i0: number, i1: number) {
  ctx.strokeStyle = s.c;
  ctx.lineWidth = s.w;
  ctx.beginPath();
  ctx.moveTo(s.pts[i0][0], s.pts[i0][1]);
  for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(s.pts[i][0], s.pts[i][1]);
  if (i1 === i0) ctx.lineTo(s.pts[i0][0] + 0.1, s.pts[i0][1]);
  ctx.stroke();
}

export interface PaintOptions {
  animate?: boolean;
  ms?: number;
  /** Called once, three quarters of the way through. */
  nearlyDone?: () => void;
  done?: () => void;
  /** The canvas size in CSS pixels. Defaults to the window. */
  width?: number;
  height?: number;
}

export interface PaintHandle {
  stop(): void;
  /** The finished picture at canvas size, for colors and the light check. */
  final: HTMLCanvasElement;
}

/**
 * Paints `src` into `canvas`, animated unless told otherwise.
 * It ends as brushwork, never as the smooth source picture.
 */
export function paintPicture(
  canvas: HTMLCanvasElement,
  src: HTMLCanvasElement,
  opts: PaintOptions = {}
): PaintHandle {
  const { animate = true, ms = PAINT_IN_MS, nearlyDone, done } = opts;
  /* A hidden or not-yet-laid-out window can report 0; paint at a laptop size instead. */
  const cssW = opts.width || window.innerWidth || 1440;
  const cssH = opts.height || window.innerHeight || 900;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const W = (canvas.width = Math.max(1, Math.round(cssW * dpr)));
  const H = (canvas.height = Math.max(1, Math.round(cssH * dpr)));
  const ctx = ctx2d(canvas);
  const final = cover(src, W, H);
  const { first, all } = plan(src, W / 480, cssH / cssW);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = first;
  ctx.fillRect(0, 0, W, H);
  if (!animate) {
    for (const s of all) drawSeg(ctx, s, 0, s.pts.length - 1);
    done?.();
    return { stop() {}, final };
  }
  const k = ms / 2000;
  for (const s of all) {
    s.t0 *= k;
    s.dur *= k;
  }
  const start = performance.now();
  let raf = 0;
  let told = false;
  const frame = (now: number) => {
    const t = now - start;
    for (const s of all) {
      if (t < s.t0) continue;
      const n = s.pts.length - 1;
      const to = Math.min(n, Math.ceil(((t - s.t0) / s.dur) * n));
      if (to > s.done) {
        drawSeg(ctx, s, Math.max(0, s.done), to);
        s.done = to;
      }
    }
    if (!told && t > ms * 0.75) {
      told = true;
      nearlyDone?.();
    }
    if (t < ms) raf = requestAnimationFrame(frame);
    else done?.();
  };
  raf = requestAnimationFrame(frame);
  return {
    stop() {
      cancelAnimationFrame(raf);
    },
    final,
  };
}
