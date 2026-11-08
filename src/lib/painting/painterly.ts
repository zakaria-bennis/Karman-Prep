/*
 * Paints a picture onto a canvas stroke by stroke, the way Bob Ross paints:
 *   1. One coat of color goes on first, wet and even, never a black canvas.
 *   2. The sky goes in with big criss-cross strokes.
 *   3. Shapes are painted back to front: far away first, then nearer, then the foreground.
 *   4. Smaller strokes add texture and depth on top, and the finest brush follows every edge.
 *   5. The brightest highlights are tapped on last.
 * Stroke colors come from the picture and their direction follows its edges (after
 * Hertzmann, "Painterly Rendering with Curved Brush Strokes of Multiple Sizes", 1998).
 * Large strokes carry bristle streaks, colors drift gently warm and cool across the picture,
 * and a soft canvas grain sits over the finished painting.
 * Karman's landscapes take 3.8 seconds, use five brushes, and end as brushwork.
 * Ported from prototypes/today-directions/painterly.js (founder approved, 2026-11-08).
 */
import { ctx2d, makeCanvas, vnoise } from "./noise";

/** How long the opening takes (founder approved, 2026-11-08). */
export const PAINT_IN_MS = 3800;

/* The picture is read at 960 pixels wide. Brush sizes below are in 480-wide units (U each). */
const PLAN_W = 960;
const U = PLAN_W / 480;

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

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

const byStart = (a: Stroke, b: Stroke) => a.t0 - b.t0;

interface CoarsePlan {
  first: string;
  all: Stroke[];
}

/**
 * Plans every stroke. Times are written for a 2-second painting and stretched later.
 * A generator in two halves: it first yields the coat and the two big brushes (a CoarsePlan),
 * then plans the three small brushes and the highlights a row at a time (yielding null between
 * rows, so the caller can pause it) and returns them. The 3-pixel brush starts 0.96 s into the
 * 2-second plan, so on a slow computer they are planned while the big ones are painted.
 */
function* plan(
  src: HTMLCanvasElement,
  scale: number,
  aspect: number
): Generator<CoarsePlan | null, Stroke[]> {
  const w = PLAN_W;
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
  const grad = (x: number, y: number, d = U): [number, number] => [
    lum[at(x + d, y)] - lum[at(x - d, y)],
    lum[at(x, y + d)] - lum[at(x, y - d)],
  ];
  const color = (x: number, y: number, r: number): [number, number, number] => {
    let R = 0;
    let G = 0;
    let B = 0;
    let n = 0;
    const st = Math.max(1, r);
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
  /* Paint is never mixed perfectly: broad patches drift a little warm or cool, smaller ones a
     little lighter or darker, and every stroke differs slightly from its neighbour. */
  const tone = (c: number[], x: number, y: number, j = 8) => {
    const warm = vnoise(x / 70, y / 70, 41) - 0.5;
    const val = (vnoise(x / 16, y / 16, 43) - 0.5) * 10;
    const r = (Math.random() - 0.5) * j;
    return [c[0] + warm * 16 + val + r, c[1] + warm * 5 + val + r, c[2] - warm * 12 + val + r];
  };
  const css = (c: number[], a = 1) =>
    a < 1 ? `rgba(${c.map(clamp).join(",")},${a})` : `rgb(${c.map(clamp).join(",")})`;
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
  /* A gentle direction field, so strokes in open areas are not all laid the same way. */
  const drift = (x: number, y: number) => (vnoise(x / 120, y / 120, 47) - 0.5) * 0.9;

  /* 1. The base coat: the picture's colors, row by row, laid on in wide sweeps. */
  const rows = 7;
  const coat: Stroke[] = [];
  for (let i = 0; i < rows; i++) {
    const y = ((i + 0.5) / rows) * h;
    const c = color(w / 2, y, Math.round(h / rows));
    const pts = Array.from({ length: 13 }, (_, k): [number, number] => [
      (-0.05 + (k / 12) * 1.1) * w,
      y + Math.sin(k * 0.9 + i) * 3 * U,
    ]);
    coat.push(stroke(pts, (h / rows) * scale * 1.5, css(tone(c, w / 2, y, 4)), i * 40, 260));
  }
  const first = color(w / 2, h * 0.05, 6 * U);

  /* 2 to 4. Strokes in five brush sizes, painted back to front: top of the picture first.
     [radius, start, end, edge threshold (0 paints everywhere), share of flat areas painted] */
  const strokes: Stroke[] = [];
  const layers: [number, number, number, number, number][] = [
    [12, 200, 760, 0, 1],
    [6, 560, 1180, 0, 1],
    [3, 960, 1520, 0, 1],
    [1.6, 1260, 1760, 6, 0.15],
    [0.9, 1480, 1900, 11, 0],
  ];
  let coarseSent = false;
  for (const [R, t0, t1, edge, flatShare] of layers) {
    if (R < 4 && !coarseSent) {
      coarseSent = true;
      const coarse = [...coat, ...strokes].sort(byStart);
      strokes.length = 0;
      yield { first: css(first), all: coarse };
    }
    const list: (Stroke & { y: number; kids: Stroke[] })[] = [];
    const fine = R < 1;
    const step = R * U;
    const d = fine ? 1 : U;
    for (let y = step / 2; y < h; y += step) {
      for (let x = step / 2; x < w; x += step) {
        const sx = x + (Math.random() - 0.5) * step;
        const sy = y + (Math.random() - 0.5) * step;
        const [gx0, gy0] = grad(sx, sy, d);
        const g0 = Math.hypot(gx0, gy0);
        /* The small brushes go where there is detail to paint, plus a little texture elsewhere. */
        if (edge && g0 < edge && Math.random() >= flatShare) continue;
        const c = color(sx, sy, Math.max(1, Math.round(step / 2)));
        const flat = g0 < 1.5;
        /* Flat areas like sky get Bob Ross's criss-cross: short strokes on alternating diagonals. */
        if (flat && R > 2) {
          const a =
            (Math.random() < 0.5 ? 0.7 : -0.7) + drift(sx, sy) + (Math.random() - 0.5) * 0.3;
          const l = step * 1.4;
          const pts: [number, number][] = [
            [sx - Math.cos(a) * l, sy - Math.sin(a) * l],
            [sx, sy],
            [sx + Math.cos(a) * l, sy + Math.sin(a) * l],
          ];
          const s = stroke(pts, step * scale * 1.5, css(tone(c, sx, sy)));
          list.push({ ...s, y: sy, kids: bristles(s, c, R) });
          continue;
        }
        const pts: [number, number][] = [[sx, sy]];
        let dx = 0;
        let dy = 0;
        let cx = sx;
        let cy = sy;
        const steps = fine ? 5 : 6;
        for (let i = 0; i < steps; i++) {
          const [gx, gy] = grad(cx, cy, d);
          const m = Math.hypot(gx, gy);
          if (m < 1.5 && i > 1) break;
          let nx = -gy / (m || 1);
          let ny = gx / (m || 1);
          if (m < 1.5) {
            const a = drift(cx, cy);
            nx = Math.cos(a);
            ny = Math.sin(a);
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
          cx += nx * step;
          cy += ny * step;
          dx = nx;
          dy = ny;
          const k = at(cx, cy) * 4;
          const diff =
            Math.abs(px[k] - c[0]) + Math.abs(px[k + 1] - c[1]) + Math.abs(px[k + 2] - c[2]);
          /* Fine strokes stop sooner at a color change, so edges stay clean. */
          if (i > 1 && diff > (fine ? 45 : 70)) break;
          pts.push([cx, cy]);
        }
        const width = step * scale * (fine ? 1.3 + Math.random() * 0.3 : 1.5 + Math.random() * 0.4);
        const s = stroke(pts, width, css(tone(c, sx, sy, fine ? 5 : 8)));
        list.push({ ...s, y: sy, kids: bristles(s, c, R) });
      }
      if (R < 4) yield null;
    }
    /* Back to front: far away (higher up) before near (lower down), with a little looseness. */
    const keyed = list.map((s) => ({ s, k: s.y + Math.random() * h * 0.18 }));
    keyed.sort((a, b) => a.k - b.k);
    keyed.forEach(({ s }, i) => {
      const { kids } = s;
      const plain: Stroke = { pts: s.pts, w: s.w, c: s.c, t0: 0, dur: 0, done: -1 };
      plain.t0 = t0 + ((t1 - t0 - 140) * i) / keyed.length;
      plain.dur = 140;
      strokes.push(plain);
      for (const kid of kids) {
        kid.t0 = plain.t0;
        kid.dur = plain.dur;
        strokes.push(kid);
      }
    });
  }

  /* Big brushes leave streaks: a lighter and a darker bristle line inside the stroke. */
  function bristles(s: Stroke, c: number[], R: number): Stroke[] {
    if (R < 6 || s.pts.length < 2) return [];
    const out: Stroke[] = [];
    const n = 2;
    for (let b = 0; b < n; b++) {
      const side = (b === 0 ? 1 : -1) * (0.18 + Math.random() * 0.16) * s.w;
      const lift = b === 0 ? 16 : -14;
      const pts = s.pts.map((p, i): [number, number] => {
        const a = s.pts[Math.max(0, i - 1)];
        const z = s.pts[Math.min(s.pts.length - 1, i + 1)];
        const tx = z[0] - a[0];
        const ty = z[1] - a[1];
        const l = Math.hypot(tx, ty) || 1;
        return [p[0] - (ty / l) * side, p[1] + (tx / l) * side];
      });
      out.push({
        pts,
        w: s.w * (0.1 + Math.random() * 0.08),
        c: css([c[0] + lift, c[1] + lift, c[2] + lift], 0.24),
        t0: 0,
        dur: 0,
        done: -1,
      });
    }
    return out;
  }

  /* 5. Highlights: the brightest spots, tapped on last with a small brush along the edge. */
  let lights = 0;
  for (let i = 0; i < 3000 && lights < 800; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const L = lum[at(x, y)];
    if (L <= 175) continue;
    const near =
      (lum[at(x - 3, y)] + lum[at(x + 3, y)] + lum[at(x, y - 3)] + lum[at(x, y + 3)]) / 4;
    if (L < 215 && L < near + 6) continue;
    const [gx, gy] = grad(x, y, 1);
    const m = Math.hypot(gx, gy);
    const a = m > 2 ? Math.atan2(gx, -gy) : Math.random() * 6.28;
    const l = 1.2 * U;
    const c = color(x, y, 1);
    const pts: [number, number][] = [
      [x - Math.cos(a) * l, y - Math.sin(a) * l],
      [x + Math.cos(a) * l, y + Math.sin(a) * l],
    ];
    const lit = c.map((v) => v + (255 - v) * 0.25);
    strokes.push(stroke(pts, 1.1 * U * scale, css(lit), 1780 + Math.random() * 150, 60));
    lights++;
  }
  return strokes.sort(byStart);
}

/** Runs the rest of a plan in short slices between frames, then hands over the strokes. */
function planLater(rest: Generator<CoarsePlan | null, Stroke[]>, ready: (s: Stroke[]) => void) {
  let id = 0;
  const slice = () => {
    const end = performance.now() + SLICE_MS;
    while (performance.now() < end) {
      const r = rest.next();
      if (r.done) {
        ready(r.value);
        return;
      }
    }
    id = window.setTimeout(slice, 0);
  };
  id = window.setTimeout(slice, 0);
  return () => clearTimeout(id);
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

let grainTile: HTMLCanvasElement | null = null;
/* A canvas being painted without the opening, so a new paint (after a resize) stops the old one. */
const running = new WeakMap<HTMLCanvasElement, () => void>();

/** A soft canvas grain: fine noise with a faint woven thread, laid over the finished paint. */
function canvasGrain(ctx: CanvasRenderingContext2D, W: number, H: number) {
  if (!grainTile) {
    const n = 192;
    grainTile = makeCanvas(n, n);
    const g = ctx2d(grainTile);
    const img = g.createImageData(n, n);
    const rowT = Array.from({ length: n }, () => (Math.random() - 0.5) * 18);
    const colT = Array.from({ length: n }, () => (Math.random() - 0.5) * 18);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const weave = Math.sin((x * Math.PI) / 2) * Math.sin((y * Math.PI) / 2) * 10;
        const v = 128 + (Math.random() - 0.5) * 46 + weave + (rowT[y] + colT[x]) / 2;
        const i = (x + y * n) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = clamp(v);
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }
  const pattern = ctx.createPattern(grainTile, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
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

/* Without the opening, the big brushes go on at once and the small ones in short slices after,
   so the page never waits long for the painting. */
const SLICE_MS = 8;
const idle = (f: () => void) =>
  "requestIdleCallback" in window
    ? requestIdleCallback(f, { timeout: 120 })
    : (setTimeout(f, 16) as unknown as number);
const cancelIdle = (id: number) =>
  "cancelIdleCallback" in window ? cancelIdleCallback(id) : clearTimeout(id);

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
  running.get(canvas)?.();
  running.delete(canvas);
  /* A hidden or not-yet-laid-out window can report 0; paint at a laptop size instead. */
  const cssW = opts.width || window.innerWidth || 1440;
  const cssH = opts.height || window.innerHeight || 900;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const W = (canvas.width = Math.max(1, Math.round(cssW * dpr)));
  const H = (canvas.height = Math.max(1, Math.round(cssH * dpr)));
  const ctx = ctx2d(canvas);
  const t0 = performance.now();
  const final = cover(src, W, H);
  const steps = plan(src, W / PLAN_W, cssH / cssW);
  let r = steps.next();
  while (!r.done && r.value === null) r = steps.next();
  const { first, all } = r.value as CoarsePlan;
  /* Timings for the performance check (docs/overnight/reports/painting-detail.md). */
  performance.measure("karman-paint-plan", { start: t0, detail: { strokes: all.length } });
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = first;
  ctx.fillRect(0, 0, W, H);
  let fine: Stroke[] | null = null;
  let stopped = false;
  const k = animate ? ms / 2000 : 1;
  const cancelPlan = planLater(steps, (list) => {
    for (const s of list) {
      s.t0 *= k;
      s.dur *= k;
    }
    fine = list;
  });
  if (!animate) {
    const t1 = performance.now();
    /* The coat and the biggest brushes (planned to start before 0.96 s) go on now. */
    let i = 0;
    while (i < all.length && all[i].t0 < 960) drawSeg(ctx, all[i], 0, all[i++].pts.length - 1);
    performance.measure("karman-paint-draw", { start: t1 });
    let queue = all;
    let id = 0;
    const slice = () => {
      if (stopped) return;
      const end = performance.now() + SLICE_MS;
      while (performance.now() < end) {
        if (i >= queue.length) {
          if (queue === all && fine) {
            queue = fine;
            i = 0;
            continue;
          }
          break;
        }
        for (let n = 0; n < 24 && i < queue.length; n++, i++)
          drawSeg(ctx, queue[i], 0, queue[i].pts.length - 1);
      }
      if (i < queue.length || queue === all) {
        id = idle(slice);
        return;
      }
      canvasGrain(ctx, W, H);
      running.delete(canvas);
      performance.measure("karman-paint-finish", { start: t1 });
      done?.();
    };
    id = idle(slice);
    const stop = () => {
      stopped = true;
      cancelIdle(id);
      cancelPlan();
    };
    running.set(canvas, stop);
    return { stop, final };
  }
  for (const s of all) {
    s.t0 *= k;
    s.dur *= k;
  }
  const start = performance.now();
  let raf = 0;
  let told = false;
  /* Each list is in start order: everything before its `lo` is finished. */
  const lists: Stroke[][] = [all];
  const lows = [0];
  const frame = (now: number) => {
    const t = Math.min(now - start, ms);
    if (fine && lists.length === 1) {
      lists.push(fine);
      lows.push(0);
    }
    lists.forEach((list, j) => {
      let lo = lows[j];
      for (let i = lo; i < list.length; i++) {
        const s = list[i];
        if (t < s.t0) break;
        const n = s.pts.length - 1;
        const to = Math.min(n, Math.ceil(((t - s.t0) / (s.dur || 1)) * n));
        if (to > s.done) {
          drawSeg(ctx, s, Math.max(0, s.done), to);
          s.done = to;
        }
      }
      while (lo < list.length && list[lo].done >= list[lo].pts.length - 1) lo++;
      lows[j] = lo;
    });
    if (!told && t > ms * 0.75) {
      told = true;
      nearlyDone?.();
    }
    /* A slow computer may still be planning the small brushes; they go on as soon as ready. */
    if (now - start < ms || lists.length === 1) raf = requestAnimationFrame(frame);
    else {
      canvasGrain(ctx, W, H);
      done?.();
    }
  };
  raf = requestAnimationFrame(frame);
  return {
    stop() {
      cancelAnimationFrame(raf);
      cancelPlan();
    },
    final,
  };
}
