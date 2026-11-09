/*
 * Where the Library's two opening skies meet (founder, 2026-11-08: "a diagonal between the Math
 * and the Reading", then "make the diagonal clearly diagonal"). On a wide screen the seam runs
 * corner to corner, from near the top right to near the bottom left: Math above and to the left,
 * Reading and Writing below and to the right. On a phone or an upright iPad it slants across the
 * middle: Math on top, Reading and Writing below.
 *
 * The seam itself is a painted edge, not a ruled line: a mask whose border wanders with noise and
 * is crossed by brush tongues from both sides. The mask is three screens long, so sliding it moves
 * the seam right off the screen (one painting fills it) without redrawing.
 */
import { ctx2d, makeCanvas, rng, vnoise } from "../noise";

export type Layout = "wide" | "tall";
export type Slug = "math" | "reading-writing";
type Pt = [number, number];

export function layoutFor(w: number, h: number): Layout {
  return w >= 768 && h / w < 1.15 ? "wide" : "tall";
}

/** The seam's two ends, as fractions of the screen. */
export const SEAM: Record<Layout, [Pt, Pt]> = {
  wide: [
    [0.85, 0],
    [0.15, 1],
  ],
  tall: [
    [0, 0.64],
    [1, 0.36],
  ],
};

/** Each half as a polygon (fractions), for hit testing and for clipping the life layer. */
export function halfPolygon(layout: Layout, slug: Slug): Pt[] {
  const [a, b] = SEAM[layout];
  if (layout === "wide") {
    return slug === "math" ? [[0, 0], a, b, [0, 1]] : [a, [1, 0], [1, 1], b];
  }
  return slug === "math" ? [[0, 0], [1, 0], b, a] : [a, b, [1, 1], [0, 1]];
}

/** The same polygon as a CSS clip-path. */
export function clipPath(layout: Layout, slug: Slug): string {
  const pts = halfPolygon(layout, slug).map(([x, y]) => `${x * 100}% ${y * 100}%`);
  return `polygon(${pts.join(", ")})`;
}

/** Where each subject's name sits (fractions), clear of the planet, the nebula and the figures. */
export const LABEL_AT: Record<Layout, Record<Slug, Pt>> = {
  wide: { math: [0.27, 0.27], "reading-writing": [0.72, 0.62] },
  tall: { math: [0.5, 0.2], "reading-writing": [0.5, 0.74] },
};

/** The mask is drawn at a quarter of the screen's size; the browser scales it up softly. */
const MASK_SCALE = 0.25;

/**
 * The Reading and Writing painting's mask: opaque on its side of the seam, transparent on the
 * Math side, three screens long along the direction it slides (across when wide, down when tall).
 * Place it one screen back (`-100vw` or `-100vh`) to sit the seam on the diagonal.
 */
export function seamMask(layout: Layout, w: number, h: number): string {
  const tall = layout === "tall";
  const mw = Math.max(8, Math.round((tall ? w : w * 3) * MASK_SCALE));
  const mh = Math.max(8, Math.round((tall ? h * 3 : h) * MASK_SCALE));
  const c = makeCanvas(mw, mh);
  const g = ctx2d(c);
  const s = MASK_SCALE;
  const [a, b] = SEAM[layout];
  /* The seam in mask pixels: the screen sits in the middle third. */
  const along = (t: number): Pt =>
    tall
      ? [t * w * s, (h + (a[1] + (b[1] - a[1]) * t) * h) * s]
      : [(w + (a[0] + (b[0] - a[0]) * t) * w) * s, t * h * s];
  const amp = Math.min(w, h) * 0.022 * s;
  const wander = (t: number) =>
    (vnoise(t * 5, 1.3, 61) - 0.5) * amp * 2.2 + (vnoise(t * 19, 2.7, 67) - 0.5) * amp;
  /* Normal pointing into the Reading side. */
  const nx = tall ? 0 : 1;
  const ny = tall ? 1 : 0;
  const steps = 80;
  g.fillStyle = "#fff";
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = along(t);
    const d = wander(t);
    g.lineTo(x + nx * d, y + ny * d);
  }
  if (tall) {
    g.lineTo(mw, mh);
    g.lineTo(0, mh);
  } else {
    g.lineTo(mw, mh);
    g.lineTo(mw, 0);
  }
  g.closePath();
  g.fill();
  /* Brush dabs across the seam, both ways: Reading reaching into Math, and wiped back out of
     Reading. Each crosses the seam at a slant, like a loaded brush pulled past the edge. */
  const r = rng(73);
  g.lineCap = "round";
  const dabs = 22;
  for (let i = 0; i < dabs; i++) {
    const t = r();
    const [x, y] = along(t);
    const d = wander(t);
    const out = r() < 0.5 ? 1 : -1;
    const len = amp * (1.1 + r() * 1.6);
    const ang = (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5);
    /* Across the seam: along the normal, tilted. */
    const dx = nx * Math.cos(ang) - ny * Math.sin(ang);
    const dy = nx * Math.sin(ang) + ny * Math.cos(ang);
    const sx = x + nx * d;
    const sy = y + ny * d;
    g.globalCompositeOperation = out > 0 ? "source-over" : "destination-out";
    g.strokeStyle = "#fff";
    g.lineWidth = Math.max(1, amp * (0.7 + r() * 0.7));
    g.beginPath();
    g.moveTo(sx + dx * len * 0.15 * out, sy + dy * len * 0.15 * out);
    g.lineTo(sx - dx * len * out, sy - dy * len * out);
    g.stroke();
  }
  g.globalCompositeOperation = "source-over";
  /* Soften: a blurred copy under the crisp one, so the edge fades over a few brush widths. */
  const soft = makeCanvas(Math.max(2, Math.round(mw / 10)), Math.max(2, Math.round(mh / 10)));
  const sg = ctx2d(soft);
  sg.imageSmoothingQuality = "high";
  sg.drawImage(c, 0, 0, soft.width, soft.height);
  const out = makeCanvas(mw, mh);
  const og = ctx2d(out);
  og.imageSmoothingQuality = "high";
  og.drawImage(soft, 0, 0, mw, mh);
  og.globalAlpha = 0.45;
  og.drawImage(c, 0, 0);
  return out.toDataURL("image/png");
}
