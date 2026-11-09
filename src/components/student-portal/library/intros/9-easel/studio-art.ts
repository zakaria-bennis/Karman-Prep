/*
 * Intro 9, the easel: the pictures behind it, all drawn in code.
 * - The studio: a quiet room with a window (lit for the hour), a wooden floor, canvases leaning
 *   on the wall, a side table with brushes and a palette, and the easel standing in the middle.
 *   The brush engine (painterly.ts) then paints it in as brushwork.
 * - The sketch on the easel's canvas: each subject's ground scene traced as light pencil lines
 *   (edges of the real scene, so the paint lands exactly on the drawing), split by a diagonal
 *   pencil line.
 * - Dabs: the few brush strokes of color that appear when a half is pointed at.
 */
import { LIGHT, type TimeOfDay } from "@/lib/painting/light";
import { cover } from "@/lib/painting/painterly";
import { ctx2d, hex, makeCanvas, mix, rgb, rng, vnoise, type Color } from "@/lib/painting/noise";
import { SEAM, layoutFor, type Layout } from "@/lib/painting/library/seam";

export interface ArtRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where the easel's canvas sits on screen. It has the screen's own proportions, so pushing the
 * camera into it fills the screen exactly with the subject's ground scene.
 */
export function artRect(vw: number, vh: number): ArtRect {
  const a = vh / vw;
  const wide = layoutFor(vw, vh) === "wide";
  const maxW = wide ? vw * 0.5 : vw * 0.72;
  const maxH = wide ? vh * 0.56 : vh * 0.56;
  const w = Math.min(maxW, maxH / a);
  const h = w * a;
  const x = (vw - w) / 2 + (wide ? vw * 0.03 : 0);
  const y = wide ? vh * 0.15 : vh * 0.14;
  return { x, y, w, h };
}

const WALL: Record<TimeOfDay, [string, string]> = {
  dawn: ["#e7d3cb", "#cdb2ab"],
  day: ["#ece5d8", "#d6ccbb"],
  sunset: ["#e9c7a6", "#c99a78"],
  night: ["#2b3048", "#1a1e31"],
};

/** The floor line, as a fraction of the screen height. */
const floorAt = (layout: Layout) => (layout === "wide" ? 0.8 : 0.83);

/** The studio, drawn flat; painterly.ts paints it in. Sizes are in screen pixels (vw x vh). */
export function renderStudio(
  vw: number,
  vh: number,
  time: TimeOfDay,
  art: ArtRect,
  accent: Color
): HTMLCanvasElement {
  const layout = layoutFor(vw, vh);
  const wide = layout === "wide";
  const W = wide ? 760 : 480;
  const k = W / vw;
  const H = Math.max(200, Math.round(vh * k));
  const c = makeCanvas(W, H);
  const g = ctx2d(c);
  const L = LIGHT[time];
  const night = time === "night";
  const r = rng(909);
  const dim = 1 - L.dark * 0.55;
  const wood = (hexc: string, lift = 0) =>
    rgb(mix(hex(hexc), [255, 236, 210], lift).map((v) => v * dim));
  const A = { x: art.x * k, y: art.y * k, w: art.w * k, h: art.h * k };
  const floor = floorAt(layout) * H;

  /* The wall: warm plaster, a little lighter toward the window. */
  const [w0, w1] = WALL[time];
  const wall = g.createLinearGradient(0, 0, W, 0);
  wall.addColorStop(0, w0);
  wall.addColorStop(1, w1);
  g.fillStyle = wall;
  g.fillRect(0, 0, W, floor);
  for (let i = 0; i < 900; i++) {
    const x = r() * W;
    const y = r() * floor;
    g.fillStyle = rgb(
      night ? [70, 80, 120] : [255, 250, 240],
      0.04 + vnoise(x / 40, y / 40, 3) * 0.05
    );
    g.fillRect(x, y, 3, 2);
  }

  /* The window, with the hour's sky and far hills in it. */
  const win = wide
    ? { x: W * 0.05, y: H * 0.1, w: W * 0.17, h: H * 0.44 }
    : { x: W * 0.04, y: H * 0.05, w: W * 0.15, h: H * 0.2 };
  const sky = g.createLinearGradient(0, win.y, 0, win.y + win.h);
  sky.addColorStop(0, L.top);
  sky.addColorStop(1, L.low);
  g.fillStyle = sky;
  g.fillRect(win.x, win.y, win.w, win.h);
  const sun: [number, number] = [win.x + win.w * 0.62, win.y + win.h * (night ? 0.22 : 0.45)];
  const glow = g.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], win.w * 0.8);
  glow.addColorStop(0, rgb(hex(L.glow), night ? 0.35 : 0.7));
  glow.addColorStop(1, rgb(hex(L.glow), 0));
  g.fillStyle = glow;
  g.fillRect(win.x, win.y, win.w, win.h);
  g.fillStyle = L.sun;
  g.beginPath();
  g.arc(sun[0], sun[1], win.w * (night ? 0.07 : 0.09), 0, 6.283);
  g.fill();
  g.fillStyle = L.land;
  g.beginPath();
  g.moveTo(win.x, win.y + win.h);
  for (let i = 0; i <= 12; i++) {
    const x = win.x + (win.w * i) / 12;
    g.lineTo(x, win.y + win.h * (0.72 + vnoise(i * 0.7, 1, 5) * 0.14));
  }
  g.lineTo(win.x + win.w, win.y + win.h);
  g.fill();
  const frame = night ? "#3a3f58" : "#f4efe6";
  g.strokeStyle = frame;
  g.lineWidth = Math.max(3, win.w * 0.06);
  g.strokeRect(win.x, win.y, win.w, win.h);
  g.lineWidth = Math.max(2, win.w * 0.035);
  g.beginPath();
  g.moveTo(win.x + win.w / 2, win.y);
  g.lineTo(win.x + win.w / 2, win.y + win.h);
  g.moveTo(win.x, win.y + win.h * 0.48);
  g.lineTo(win.x + win.w, win.y + win.h * 0.48);
  g.stroke();
  g.fillStyle = frame;
  g.fillRect(win.x - win.w * 0.08, win.y + win.h, win.w * 1.16, Math.max(4, win.h * 0.04));

  /* The window's light falls across the wall (by day) or a lamp glows (at night). */
  if (!night) {
    g.save();
    g.globalAlpha = time === "day" ? 0.2 : 0.26;
    g.fillStyle = L.glow;
    g.beginPath();
    g.moveTo(win.x + win.w, win.y);
    g.lineTo(win.x + win.w * 3.4, win.y + win.h * 0.5);
    g.lineTo(win.x + win.w * 3.6, floor + (H - floor) * 0.7);
    g.lineTo(win.x + win.w, win.y + win.h);
    g.closePath();
    g.fill();
    g.restore();
  }

  /* The floor: boards running away from us. */
  const fl = g.createLinearGradient(0, floor, 0, H);
  fl.addColorStop(0, wood("#8d6a4e"));
  fl.addColorStop(1, wood("#5e432f"));
  g.fillStyle = fl;
  g.fillRect(0, floor, W, H - floor);
  g.strokeStyle = rgb([40, 26, 18], 0.35 * dim + 0.1);
  g.lineWidth = 1;
  for (let i = -8; i <= 8; i++) {
    const x0 = W / 2 + (i * W) / 12;
    g.beginPath();
    g.moveTo(x0, floor);
    g.lineTo(W / 2 + (x0 - W / 2) * 2.2, H);
    g.stroke();
  }
  g.fillStyle = wood("#6b4c37");
  g.fillRect(0, floor - H * 0.012, W, H * 0.014);

  /* Canvases leaning on the wall, their backs to us: linen and the wooden stretcher. */
  const leaning = wide
    ? [
        [W * 0.03, 0.2, 0.26, -0.05],
        [W * 0.12, 0.13, 0.19, 0.04],
      ]
    : [[W * 0.03, 0.2, 0.09, -0.04]];
  for (const [x, cw, ch, tilt] of leaning) {
    g.save();
    g.translate(x, floor + H * 0.02);
    g.rotate(tilt);
    g.fillStyle = rgb(mix(hex("#d9ccb2"), [40, 40, 60], L.dark * 0.6));
    g.fillRect(0, -ch * H, cw * W * 0.6, ch * H);
    g.strokeStyle = wood("#9b7653", 0.1);
    g.lineWidth = Math.max(2, W * 0.008);
    g.strokeRect(2, -ch * H + 2, cw * W * 0.6 - 4, ch * H - 4);
    g.beginPath();
    g.moveTo(cw * W * 0.3, -ch * H);
    g.lineTo(cw * W * 0.3, 0);
    g.stroke();
    g.restore();
  }

  /* The easel: a back leg, the mast, two splayed front legs, a crossbar, the ledge and a clamp. */
  const cx = A.x + A.w / 2;
  const apex = A.y - A.h * 0.12;
  const foot = floor + (H - floor) * 0.72;
  const legW = Math.max(3, A.w * 0.026);
  const beam = (x0: number, y0: number, x1: number, y1: number, wdt: number, col: string) => {
    g.strokeStyle = col;
    g.lineWidth = wdt;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    g.strokeStyle = wood("#b48a62", 0.2);
    g.lineWidth = wdt * 0.28;
    g.beginPath();
    g.moveTo(x0 - wdt * 0.25, y0);
    g.lineTo(x1 - wdt * 0.25, y1);
    g.stroke();
  };
  beam(cx, apex, cx + A.w * 0.03, floor - (floor - foot) * 0.2, legW * 0.85, wood("#4f3726"));
  beam(cx, apex - A.h * 0.04, cx, foot, legW, wood("#6e4e36"));
  /* The canvas's shadow on the wall behind it. */
  g.save();
  g.fillStyle = rgb([20, 14, 10], night ? 0.45 : 0.22);
  g.filter = "blur(6px)";
  g.fillRect(A.x + A.w * 0.03, A.y + A.h * 0.04, A.w, A.h);
  g.restore();
  g.fillStyle = "#f2ede3";
  g.fillRect(A.x, A.y, A.w, A.h);
  const spread = A.w * 0.62;
  beam(cx, apex, cx - spread, foot, legW, wood("#7d5a3f"));
  beam(cx, apex, cx + spread, foot, legW, wood("#7d5a3f"));
  const crossY = A.y + A.h + (foot - A.y - A.h) * 0.62;
  const crossT = (crossY - apex) / (foot - apex);
  beam(cx - spread * crossT, crossY, cx + spread * crossT, crossY, legW * 0.7, wood("#6e4e36"));
  const ledgeY = A.y + A.h;
  g.fillStyle = wood("#7d5a3f");
  g.fillRect(A.x - A.w * 0.05, ledgeY, A.w * 1.1, Math.max(4, A.h * 0.035));
  g.fillStyle = wood("#a27b56", 0.15);
  g.fillRect(A.x - A.w * 0.05, ledgeY, A.w * 1.1, Math.max(2, A.h * 0.01));
  g.fillStyle = wood("#7d5a3f");
  g.fillRect(cx - A.w * 0.06, A.y - A.h * 0.035, A.w * 0.12, A.h * 0.05);

  /* A side table (or a stool on a phone) with a jar of brushes and a palette. */
  const tx = wide ? Math.min(W * 0.84, A.x + A.w * 1.08 + W * 0.03) : W * 0.8;
  const ty = wide ? floor - H * 0.2 : floor - H * 0.06;
  const tw = wide ? W * 0.13 : W * 0.16;
  g.fillStyle = wood("#6e4e36");
  g.fillRect(tx, ty, tw, Math.max(4, H * 0.014));
  for (const lx of [tx + tw * 0.08, tx + tw * 0.86])
    g.fillRect(lx, ty, tw * 0.05, foot - ty - H * 0.01);
  const jar = { x: tx + tw * 0.12, w: tw * 0.22, h: tw * 0.3 };
  g.fillStyle = rgb(mix([190, 214, 222], [30, 40, 70], L.dark * 0.6), 0.85);
  g.fillRect(jar.x, ty - jar.h, jar.w, jar.h);
  const handles = ["#c94f3d", "#2f5d8a", "#e0b54a", "#3d7a4f"];
  handles.forEach((hc, i) => {
    const bx = jar.x + jar.w * (0.2 + i * 0.2);
    beam(
      bx,
      ty - jar.h * 0.2,
      bx + (i - 1.5) * tw * 0.05,
      ty - jar.h * 2.1,
      Math.max(2, tw * 0.025),
      rgb(mix(hex(hc), [10, 10, 20], L.dark * 0.5))
    );
  });
  const pal = { x: tx + tw * 0.62, y: ty - tw * 0.04, rx: tw * 0.3, ry: tw * 0.07 };
  g.fillStyle = wood("#b88d62", 0.1);
  g.beginPath();
  g.ellipse(pal.x, pal.y, pal.rx, pal.ry, 0, 0, 6.283);
  g.fill();
  const dabs = [rgb(accent), "#e8c45a", "#6f9a48", "#e88aa0", "#5b97bd", "#f4f1ea"];
  dabs.forEach((dc, i) => {
    g.fillStyle = dc;
    g.beginPath();
    g.ellipse(
      pal.x - pal.rx * 0.7 + i * pal.rx * 0.28,
      pal.y - pal.ry * 0.2,
      pal.rx * 0.09,
      pal.ry * 0.38,
      0,
      0,
      6.283
    );
    g.fill();
  });

  /* At night a lamp beside the easel lights the canvas warmly. */
  if (night) {
    const lx = wide ? A.x - A.w * 0.22 : A.x + A.w * 0.5;
    const ly = wide ? A.y - A.h * 0.05 : A.y - A.h * 0.1;
    const lamp = g.createRadialGradient(lx, ly, 0, lx, ly, A.w * 1.1);
    lamp.addColorStop(0, "rgba(255, 206, 140, 0.42)");
    lamp.addColorStop(1, "rgba(255, 206, 140, 0)");
    g.fillStyle = lamp;
    g.fillRect(0, 0, W, H);
    if (wide) {
      beam(lx, ly, lx - A.w * 0.04, foot, Math.max(2, legW * 0.5), "#20222e");
      g.fillStyle = "#f3d9a8";
      g.beginPath();
      g.moveTo(lx - A.w * 0.07, ly + A.h * 0.02);
      g.lineTo(lx + A.w * 0.07, ly + A.h * 0.02);
      g.lineTo(lx + A.w * 0.045, ly - A.h * 0.08);
      g.lineTo(lx - A.w * 0.045, ly - A.h * 0.08);
      g.fill();
    }
  }

  /* A soft vignette keeps the eye on the easel. */
  const v = g.createRadialGradient(
    cx,
    A.y + A.h / 2,
    A.w * 0.4,
    cx,
    A.y + A.h / 2,
    Math.max(W, H) * 0.8
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, `rgba(10, 8, 14, ${night ? 0.45 : 0.22})`);
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  return c;
}

const PAPER: Color = [244, 239, 228];
const GRAPHITE: Color = [58, 55, 64];

/** Light pencil lines tracing a scene's shapes, as an image of the given size. */
function traced(src: HTMLCanvasElement, W: number, H: number): HTMLCanvasElement {
  /* Read small (a softer trace with only the main shapes), then scaled up. */
  const w = Math.max(40, Math.round(W / 2));
  const h = Math.max(40, Math.round(H / 2));
  const base = cover(src, w, h, 0.5, 0.5);
  const px = ctx2d(base).getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++)
    lum[i] = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11;
  const out = ctx2d(base).createImageData(w, h);
  const at = (x: number, y: number) =>
    lum[Math.min(w - 1, Math.max(0, x)) + Math.min(h - 1, Math.max(0, y)) * w];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx =
        at(x + 1, y - 1) +
        2 * at(x + 1, y) +
        at(x + 1, y + 1) -
        at(x - 1, y - 1) -
        2 * at(x - 1, y) -
        at(x - 1, y + 1);
      const gy =
        at(x - 1, y + 1) +
        2 * at(x, y + 1) +
        at(x + 1, y + 1) -
        at(x - 1, y - 1) -
        2 * at(x, y - 1) -
        at(x + 1, y - 1);
      const m = Math.hypot(gx, gy);
      let a = Math.max(0, Math.min(1, (m - 70) / 160)) * 0.8;
      /* The pencil skips a little, like a light hand. */
      a *= 0.55 + 0.45 * vnoise(x / 2.5, y / 2.5, 11);
      /* Soft hatching in the darkest shapes. */
      const L = at(x, y);
      if (L < 95 && (x + y) % 5 === 0) a = Math.max(a, 0.12 + (1 - L / 95) * 0.16);
      const i = (x + y * w) * 4;
      out.data[i] = GRAPHITE[0];
      out.data[i + 1] = GRAPHITE[1];
      out.data[i + 2] = GRAPHITE[2];
      out.data[i + 3] = Math.round(a * 255);
    }
  }
  const c = makeCanvas(w, h);
  ctx2d(c).putImageData(out, 0, 0);
  return c;
}

/** The polygon of one half in canvas pixels. */
export function halfPath(
  g: CanvasRenderingContext2D,
  poly: [number, number][],
  W: number,
  H: number
) {
  g.beginPath();
  poly.forEach(([x, y], i) => (i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)));
  g.closePath();
}

/**
 * The sketch on the easel's canvas: primed canvas, each scene traced in pencil on its own half,
 * and the diagonal pencil line between them.
 */
export function drawSketch(
  canvas: HTMLCanvasElement,
  W: number,
  H: number,
  layout: Layout,
  halves: { poly: [number, number][]; src: HTMLCanvasElement }[]
) {
  canvas.width = W;
  canvas.height = H;
  const g = ctx2d(canvas);
  g.fillStyle = rgb(PAPER);
  g.fillRect(0, 0, W, H);
  const r = rng(77);
  for (let i = 0; i < (W * H) / 90; i++) {
    g.fillStyle = rgb(r() < 0.5 ? [255, 255, 255] : [200, 190, 170], 0.12);
    g.fillRect(r() * W, r() * H, 1.5, 1.5);
  }
  for (const { poly, src } of halves) {
    g.save();
    halfPath(g, poly, W, H);
    g.clip();
    g.imageSmoothingQuality = "high";
    g.drawImage(traced(src, W, H), 0, 0, W, H);
    g.restore();
  }
  /* The diagonal, ruled lightly by hand: two passes that don't quite agree. */
  const [a, b] = SEAM[layout];
  g.strokeStyle = rgb(GRAPHITE, 0.7);
  g.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) {
    g.lineWidth = Math.max(1, W / 520) * (pass ? 0.8 : 1.3);
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = (a[0] + (b[0] - a[0]) * t) * W + (vnoise(t * 9, pass, 21) - 0.5) * W * 0.004;
      const y = (a[1] + (b[1] - a[1]) * t) * H + (vnoise(t * 9, pass + 4, 23) - 0.5) * H * 0.004;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  }
}

export interface Dab {
  pts: [number, number][];
  w: number;
  c: string;
  t0: number;
  dur: number;
}

const inPoly = (poly: [number, number][], x: number, y: number) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/**
 * A few brush strokes of the scene's own colors, scattered over one half (never over its name),
 * in canvas pixels. Times are in milliseconds.
 */
export function planDabs(
  src: HTMLCanvasElement,
  poly: [number, number][],
  avoid: { x0: number; y0: number; x1: number; y1: number },
  W: number,
  H: number,
  n = 14
): Dab[] {
  const g = ctx2d(src);
  const sw = src.width;
  const sh = src.height;
  const px = g.getImageData(0, 0, sw, sh).data;
  const out: Dab[] = [];
  for (let tries = 0; out.length < n && tries < 400; tries++) {
    const u = Math.random();
    const v = Math.random();
    if (!inPoly(poly, u, v)) continue;
    if (u > avoid.x0 && u < avoid.x1 && v > avoid.y0 && v < avoid.y1) continue;
    /* Keep a little away from the diagonal, so the strokes read as on this half. */
    if (!inPoly(poly, u + 0.05, v) || !inPoly(poly, u - 0.05, v)) continue;
    const i =
      ((Math.min(sh - 1, Math.floor(v * sh)) * sw + Math.min(sw - 1, Math.floor(u * sw))) * 4) | 0;
    const col = [px[i], px[i + 1], px[i + 2]];
    const ang = (Math.random() - 0.5) * 0.9 + (Math.random() < 0.2 ? 1.2 : 0);
    const len = W * (0.05 + Math.random() * 0.06);
    const bend = (Math.random() - 0.5) * len * 0.3;
    const pts: [number, number][] = [];
    for (let s = 0; s <= 6; s++) {
      const t = s / 6 - 0.5;
      const along = t * len;
      const off = Math.sin((t + 0.5) * Math.PI) * bend;
      pts.push([
        u * W + Math.cos(ang) * along - Math.sin(ang) * off,
        v * H + Math.sin(ang) * along + Math.cos(ang) * off,
      ]);
    }
    out.push({
      pts,
      w: W * (0.016 + Math.random() * 0.012),
      c: rgb(col),
      t0: out.length * 42,
      dur: 240,
    });
  }
  return out;
}

/**
 * Draws the dabs as far as time t (ms) like a loaded flat brush: a body of paint that thins
 * toward the end of the stroke, crossed by bristle lines a little lighter and darker.
 */
export function drawDabs(g: CanvasRenderingContext2D, dabs: Dab[], t: number) {
  g.lineCap = "round";
  g.lineJoin = "round";
  const BRISTLES = 7;
  for (const [k, d] of dabs.entries()) {
    const p = Math.max(0, Math.min(1, (t - d.t0) / d.dur));
    if (p <= 0) continue;
    const n = Math.max(1, Math.ceil(p * (d.pts.length - 1)));
    const [a, b] = [d.pts[0], d.pts[d.pts.length - 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    for (let j = 0; j < BRISTLES; j++) {
      const off = (j / (BRISTLES - 1) - 0.5) * d.w;
      /* Each bristle carries a slightly different load: lighter, darker, drier. */
      const lift = (((k * 7 + j * 13) % 9) - 4) * 6;
      const m = d.c.match(/\d+(\.\d+)?/g)?.map(Number) ?? [128, 128, 128];
      g.strokeStyle = `rgba(${m[0] + lift},${m[1] + lift},${m[2] + lift},${0.55 + ((j * 5 + k) % 4) * 0.1})`;
      g.lineWidth = (d.w / BRISTLES) * 1.9;
      /* Outer bristles run dry sooner. */
      const reach = Math.max(1, Math.round(n * (1 - Math.abs(off / d.w) * 0.5)));
      g.beginPath();
      for (let i = 0; i <= reach; i++) {
        const [x, y] = d.pts[i];
        if (i) g.lineTo(x + nx * off, y + ny * off);
        else g.moveTo(x + nx * off, y + ny * off);
      }
      g.stroke();
    }
  }
}
