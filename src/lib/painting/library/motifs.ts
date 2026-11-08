/*
 * The painted motifs in the Library's two opening paintings (founder, 2026-11-08: the subject art
 * must "match the painting", not read as flat line icons). Each one is drawn into a Studio
 * picture in the day's light, so painterly.ts can turn it into brushwork like the backdrop.
 *
 * Math: a stone bridge whose arch is a parabola, its deck held up by evenly spaced posts (a
 * plotted function, read as architecture), mirrored in the lake; terraced fields that climb like
 * a bar chart; a ring of light around the sun.
 * Reading and Writing: an open book lying in a meadow, the grass and flowers growing out of its
 * pages; a quill standing in an inkpot beside it.
 *
 * Positions are fractions of the picture (0 to 1 across and down).
 */
import { hex, mix, rgb, type Color } from "../noise";
import type { Studio } from "../studio";

const TAU = Math.PI * 2;

/** hsl(h s% l%) as an RGB color. */
export function hslColor(h: number, s: number, l: number): Color {
  const S = s / 100;
  const Lf = l / 100;
  const a = S * Math.min(Lf, 1 - Lf);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return 255 * (Lf - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return [f(0), f(8), f(4)];
}

/** A color as it looks in this light: a little of the light's glow, darkened at night. */
export function inLight(k: Studio, c: Color, lift = 0.15): Color {
  return mix(mix(c, k.C.lit, lift), k.C.deep, k.L.dark * 0.6);
}

export interface BridgeAt {
  /** Center, span and waterline, as fractions of the picture. */
  cx: number;
  span: number;
  base: number;
  /** How high the arch rises above the water. */
  rise: number;
}

/**
 * An open-spandrel stone bridge: a parabolic arch, a flat deck above it and posts between the
 * two at even steps. Paint it before the lake, so the water mirrors it.
 */
export function bridge(k: Studio, at: BridgeAt, accent: Color) {
  const { g, W, H, C } = k;
  const cx = at.cx * W;
  const half = (at.span * W) / 2;
  const base = at.base * H;
  const rise = at.rise * H;
  const crown = base - rise;
  const a = rise / (half * half);
  const ring = Math.max(4, rise * 0.24);
  const under = (x: number) => crown + a * (x - cx) ** 2;
  const over = (x: number) =>
    under(x) - ring * (0.75 + 0.25 * Math.min(1, Math.abs(x - cx) / half));
  const deckY = crown - ring - rise * 0.24;
  const deckH = Math.max(4, rise * 0.15);
  const reach = half * 1.12;

  /* Warm sandstone, a touch of the painting's hue, in this light. */
  const stone = inLight(k, mix(mix([176, 152, 124], C.shade, 0.22), accent, 0.1), 0.04);
  const lit = mix(stone, C.lit, 0.45 * (1 - k.L.dark * 0.6));
  const dark = mix(stone, C.deep, 0.6);
  const sunRight = C.sunAt[0] > at.cx ? 1 : -1;
  const face = g.createLinearGradient(cx - sunRight * reach, 0, cx + sunRight * reach, 0);
  face.addColorStop(0, rgb(mix(stone, C.deep, 0.18)));
  face.addColorStop(1, rgb(mix(stone, C.lit, 0.25 * (1 - k.L.dark))));

  /* Abutments: the solid ends where the bridge meets the banks. */
  g.fillStyle = face;
  for (const s of [-1, 1]) {
    const x0 = cx + s * half;
    const x1 = cx + s * reach;
    g.beginPath();
    g.moveTo(x0, base + 2);
    g.lineTo(x0, under(x0) - 1);
    g.lineTo(x0, deckY);
    g.lineTo(x1, deckY);
    g.lineTo(x1 + s * rise * 0.12, base + 2);
    g.closePath();
    g.fill();
  }

  /* The arch ring. */
  g.beginPath();
  for (let x = cx - half; x <= cx + half; x += 2) g.lineTo(x, over(x));
  for (let x = cx + half; x >= cx - half; x -= 2) g.lineTo(x, under(x));
  g.closePath();
  g.fillStyle = face;
  g.fill();
  /* Stones across the ring, and a shadow line along its underside. */
  g.strokeStyle = rgb(dark, 0.55);
  g.lineWidth = Math.max(1, ring * 0.12);
  const blocks = 15;
  for (let i = 1; i < blocks; i++) {
    const x = cx - half + (2 * half * i) / blocks;
    g.beginPath();
    g.moveTo(x, over(x));
    g.lineTo(x + (x - cx) * 0.02, under(x));
    g.stroke();
  }
  g.strokeStyle = rgb(mix(dark, C.deep, 0.3), 0.85);
  g.lineWidth = Math.max(1.5, ring * 0.22);
  g.beginPath();
  for (let x = cx - half; x <= cx + half; x += 2) g.lineTo(x, under(x) + g.lineWidth * 0.4);
  g.stroke();
  g.strokeStyle = rgb(lit, 0.75);
  g.lineWidth = Math.max(1, ring * 0.14);
  g.beginPath();
  for (let x = cx - half; x <= cx + half; x += 2) g.lineTo(x, over(x));
  g.stroke();

  /* The posts, evenly spaced like samples of the curve. */
  const posts = 9;
  const pw = Math.max(2, (half * 2) / posts / 3.4);
  for (let i = 1; i < posts; i++) {
    const x = cx - half + (2 * half * i) / posts;
    const top = deckY + deckH;
    const bottom = over(x) + 1;
    if (bottom - top < 2) continue;
    g.fillStyle = face;
    g.fillRect(x - pw / 2, top, pw, bottom - top);
    g.fillStyle = rgb(lit, 0.6);
    g.fillRect(x - pw / 2 + (sunRight > 0 ? pw * 0.62 : 0), top, pw * 0.38, bottom - top);
  }

  /* The deck and its rail. */
  g.fillStyle = face;
  g.fillRect(cx - reach, deckY, reach * 2, deckH);
  g.fillStyle = rgb(lit, 0.8);
  g.fillRect(cx - reach, deckY, reach * 2, Math.max(1, deckH * 0.3));
  g.fillStyle = rgb(dark, 0.7);
  g.fillRect(cx - reach, deckY + deckH * 0.8, reach * 2, Math.max(1, deckH * 0.25));
  const railH = rise * 0.08;
  g.strokeStyle = rgb(mix(dark, C.deep, 0.2), 0.8);
  g.lineWidth = Math.max(1, deckH * 0.22);
  g.beginPath();
  g.moveTo(cx - reach, deckY - railH);
  g.lineTo(cx + reach, deckY - railH);
  for (let i = 0; i <= 24; i++) {
    const x = cx - reach + (2 * reach * i) / 24;
    g.moveTo(x, deckY - railH);
    g.lineTo(x, deckY);
  }
  g.stroke();
  /* Two small lamps at the ends, lit in the evening. */
  if (k.L.dark > 0.1) {
    for (const s of [-1, 1]) {
      const x = cx + s * reach * 0.96;
      const y = deckY - railH * 2.2;
      const gl = g.createRadialGradient(x, y, 0, x, y, rise * 0.22);
      gl.addColorStop(0, "rgba(255,214,140,0.85)");
      gl.addColorStop(1, "rgba(255,190,110,0)");
      g.fillStyle = gl;
      g.fillRect(x - rise * 0.22, y - rise * 0.22, rise * 0.44, rise * 0.44);
    }
  }
}

/** Where the bridge's arch runs, for the life layer (a light that travels along it). */
export function archPoint(at: BridgeAt, t: number): [number, number] {
  const u = at.cx - at.span / 2 + at.span * t;
  const x = (u - at.cx) / (at.span / 2);
  return [u, at.base - at.rise + at.rise * x * x];
}

export interface BookAt {
  /** The middle of the spine at the bottom, the half width and the page height. */
  cx: number;
  by: number;
  bw: number;
  ph: number;
}

/** One page of an open book, as a path. side is -1 (left) or 1 (right). */
function pagePath(g: CanvasRenderingContext2D, k: Studio, b: BookAt, side: number, grow = 0) {
  const cx = b.cx * k.W;
  const by = b.by * k.H;
  const bw = b.bw * k.W * (1 + grow);
  const ph = b.ph * k.H * (1 + grow * 1.6);
  g.beginPath();
  g.moveTo(cx, by + grow * ph * 0.4);
  g.quadraticCurveTo(cx + side * bw * 0.5, by + ph * 0.1, cx + side * bw, by - ph * 0.02);
  g.lineTo(cx + side * bw * 0.93, by - ph);
  g.quadraticCurveTo(cx + side * bw * 0.45, by - ph * 1.24, cx, by - ph * 0.9);
  g.closePath();
}

/** A point on the top edge of a page, t from the spine (0) to the outer corner (1). */
function pageTop(k: Studio, b: BookAt, side: number, t: number): [number, number] {
  const cx = b.cx * k.W;
  const by = b.by * k.H;
  const bw = b.bw * k.W;
  const ph = b.ph * k.H;
  const p0: [number, number] = [cx, by - ph * 0.9];
  const c: [number, number] = [cx + side * bw * 0.45, by - ph * 1.24];
  const p1: [number, number] = [cx + side * bw * 0.93, by - ph];
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
    u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
  ];
}

/**
 * An open book in the grass. Its cover is the painting's hue; the meadow grows out over the top
 * of its pages, with flowers among the lines of text.
 */
export function openBook(k: Studio, b: BookAt, accent: Color, flowers: string[]) {
  const { g, C, L } = k;
  const cover = inLight(k, mix(accent, C.deep, 0.35), 0.02);
  const paper = inLight(k, mix([250, 244, 226], C.lit, 0.25), 0.05);
  const edge = mix(paper, C.shade, 0.5);
  const ink = mix(paper, C.deep, 0.75);
  const cx = b.cx * k.W;
  const ph = b.ph * k.H;

  /* A soft shadow on the grass. */
  const sh = g.createRadialGradient(cx, b.by * k.H, 0, cx, b.by * k.H, b.bw * k.W * 1.15);
  sh.addColorStop(0, rgb(C.deep, 0.45));
  sh.addColorStop(1, rgb(C.deep, 0));
  g.fillStyle = sh;
  g.fillRect(cx - b.bw * k.W * 1.2, b.by * k.H - ph * 0.6, b.bw * k.W * 2.4, ph * 1.2);

  for (const side of [-1, 1]) {
    pagePath(g, k, b, side, 0.1);
    g.fillStyle = rgb(cover);
    g.fill();
    /* The stacked page edges under the open page. */
    for (let i = 3; i >= 1; i--) {
      g.save();
      g.translate(0, i * ph * 0.035);
      pagePath(g, k, b, side);
      g.fillStyle = rgb(mix(edge, paper, i / 4));
      g.fill();
      g.restore();
    }
    pagePath(g, k, b, side);
    const sunSide = C.sunAt[0] * k.W > cx ? 1 : -1;
    const gr = g.createLinearGradient(cx, 0, cx + side * b.bw * k.W, 0);
    gr.addColorStop(0, rgb(mix(paper, C.shade, 0.65)));
    gr.addColorStop(0.3, rgb(mix(paper, C.shade, side === sunSide ? 0.08 : 0.26)));
    gr.addColorStop(1, rgb(side === sunSide ? mix(paper, C.lit, 0.2) : paper));
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = rgb(edge, 0.9);
    g.lineWidth = Math.max(1, ph * 0.03);
    g.stroke();
    /* Lines of text, following the curve of the page. */
    g.strokeStyle = rgb(ink, 0.55);
    g.lineWidth = Math.max(1.2, ph * 0.045);
    for (let i = 0; i < 6; i++) {
      const f = 0.32 + i * 0.11;
      const [x0, y0] = pageTop(k, b, side, 0.12);
      const [x1, y1] = pageTop(k, b, side, 0.86);
      const drop = ph * f;
      g.beginPath();
      g.moveTo(x0, y0 + drop);
      g.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) + drop - ph * 0.08, x1, y1 + drop * 0.95);
      g.stroke();
    }
  }
  /* The spine. */
  g.strokeStyle = rgb(mix(paper, C.deep, 0.5), 0.7);
  g.lineWidth = Math.max(1, ph * 0.04);
  g.beginPath();
  g.moveTo(cx, b.by * k.H);
  g.lineTo(cx, b.by * k.H - ph * 0.9);
  g.stroke();

  /* The meadow growing out of the top of the pages. */
  const greens = ["#5f8a3c", "#86a94a", "#4a7034"].map(hex);
  const blooms = flowers.map(hex);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 70; i++) {
      const t = 0.04 + k.d() * 0.92;
      const [x, y] = pageTop(k, b, side, t);
      const h = ph * (0.18 + k.d() * 0.42);
      const lean = (k.d() - 0.5) * h * 0.5;
      g.strokeStyle = rgb(mix(greens[i % 3], C.deep, 0.1 + L.dark * 0.65), 0.9);
      g.lineWidth = Math.max(1, ph * 0.03);
      g.beginPath();
      g.moveTo(x, y + ph * 0.05);
      g.quadraticCurveTo(x + lean * 0.3, y - h * 0.5, x + lean, y - h);
      g.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const t = 0.08 + k.d() * 0.84;
      const [x, y] = pageTop(k, b, side, t);
      const lift = ph * (0.12 + k.d() * 0.35);
      g.fillStyle = rgb(mix(blooms[i % blooms.length], C.deep, L.dark * 0.6));
      g.beginPath();
      g.arc(x, y - lift, Math.max(1.4, ph * 0.045), 0, TAU);
      g.fill();
    }
    /* A few flowers have spread onto the page itself. */
    for (let i = 0; i < 5; i++) {
      const t = 0.2 + k.d() * 0.65;
      const [x, y] = pageTop(k, b, side, t);
      g.fillStyle = rgb(mix(blooms[(i + 1) % blooms.length], C.deep, L.dark * 0.6), 0.9);
      g.beginPath();
      g.arc(x, y + ph * (0.1 + k.d() * 0.25), Math.max(1.2, ph * 0.035), 0, TAU);
      g.fill();
    }
  }
}

/** The top of the book's spine, where the stream starts (fractions). */
export function spineTop(b: BookAt): [number, number] {
  return [b.cx, b.by - b.ph * 0.9];
}

export interface TerraceAt {
  /** Left and right edge, the ground line, and each step's height (fractions of the picture). */
  x0: number;
  x1: number;
  base: number;
  steps: number[];
}

/**
 * Terraced fields climbing a hillside like the bars of a chart: each step a level green top
 * catching the light and an earth riser in shade, with a low stone wall along its edge.
 */
export function terraces(k: Studio, at: TerraceAt) {
  const { g, W, H, C, L } = k;
  const n = at.steps.length;
  const bw = ((at.x1 - at.x0) * W) / n;
  const base = at.base * H;
  const greens = ["#7fa64e", "#93b257", "#6f9a45", "#a3b85e"].map(hex);
  const earth = mix(hex("#8a6a48"), C.shade, 0.35);
  for (let i = 0; i < n; i++) {
    const x = at.x0 * W + i * bw;
    const top = base - at.steps[i] * H;
    const wob = (j: number) => Math.sin(i * 3.1 + j * 1.7) * H * 0.003;
    /* The riser: the face of the step, a planted bank in shade. */
    g.fillStyle = rgb(mix(mix(earth, greens[(i + 2) % 4], 0.45), C.deep, 0.2 + L.dark * 0.6));
    g.fillRect(x, top, bw + 1, base - top + 2);
    /* Rows of crops across the face, like a chart's gridlines. */
    g.strokeStyle = rgb(mix(greens[(i + 1) % 4], C.deep, 0.35 + L.dark * 0.55), 0.7);
    g.lineWidth = Math.max(1, H * 0.003);
    for (let y = top + H * 0.018; y < base; y += H * 0.016) {
      g.beginPath();
      g.moveTo(x + 1, y + wob(1));
      g.lineTo(x + bw - 1, y + wob(2));
      g.stroke();
    }
    /* The level top, lit. */
    const lip = Math.max(3, H * 0.014);
    g.fillStyle = rgb(mix(mix(greens[i % 4], C.lit, 0.3 * (1 - L.dark)), C.deep, L.dark * 0.6));
    g.beginPath();
    g.moveTo(x - 1, top + wob(0));
    g.lineTo(x + bw + 1, top + wob(3));
    g.lineTo(x + bw + 1, top + lip);
    g.lineTo(x - 1, top + lip);
    g.closePath();
    g.fill();
    /* A stone wall along the front edge of the top. */
    g.fillStyle = rgb(mix(mix([196, 178, 150], C.lit, 0.25), C.deep, L.dark * 0.6), 0.9);
    g.fillRect(x, top + lip - Math.max(1, H * 0.003), bw, Math.max(1.5, H * 0.004));
  }
}

/** Where each terrace's top edge sits, for the life layer (its corner, in picture units). */
export function terraceTops(at: TerraceAt): [number, number][] {
  const bw = (at.x1 - at.x0) / at.steps.length;
  return at.steps.map((h, i) => [at.x0 + bw * (i + 0.5), at.base - h]);
}

/** A thin ring of light around the sun or moon, like a drawn circle, and its radius. */
export function sunRing(k: Studio, r: number) {
  const { g, W, H, C, L } = k;
  const x = C.sunAt[0] * W;
  const y = C.sunAt[1] * H;
  g.strokeStyle = rgb(mix(C.sun, C.glow, 0.4), 0.55 - L.dark * 0.2);
  g.lineWidth = Math.max(1.5, W * 0.003);
  g.beginPath();
  g.arc(x, y, r * W, 0, TAU);
  g.stroke();
  g.strokeStyle = rgb(mix(C.sun, C.glow, 0.4), 0.3);
  g.lineWidth = Math.max(1, W * 0.0018);
  g.beginPath();
  g.arc(x, y, r * W * 1.45, 0, TAU);
  g.stroke();
}

export interface QuillAt {
  /** The inkpot's middle at the bottom, and its height. */
  x: number;
  y: number;
  h: number;
}

/** A glass inkpot on the grass with a long feather quill standing in it, leaning back. */
export function quill(k: Studio, at: QuillAt, accent: Color) {
  const { g, W, H, C, L } = k;
  const x = at.x * W;
  const y = at.y * H;
  const h = at.h * H;
  const w = h * 0.9;
  /* Shadow. */
  g.fillStyle = rgb(C.deep, 0.35);
  g.beginPath();
  g.ellipse(x + w * 0.2, y, w * 0.85, h * 0.12, 0, 0, TAU);
  g.fill();
  /* The pot: dark glass with the painting's hue in it, a lit rim and a highlight. */
  const glass = inLight(k, mix(accent, C.deep, 0.65), 0.05);
  g.fillStyle = rgb(glass);
  g.beginPath();
  g.moveTo(x - w / 2, y);
  g.quadraticCurveTo(x - w * 0.56, y - h * 0.7, x - w * 0.24, y - h * 0.78);
  g.lineTo(x + w * 0.24, y - h * 0.78);
  g.quadraticCurveTo(x + w * 0.56, y - h * 0.7, x + w / 2, y);
  g.closePath();
  g.fill();
  g.fillStyle = rgb(mix(glass, C.deep, 0.4));
  g.fillRect(x - w * 0.24, y - h, w * 0.48, h * 0.24);
  g.fillStyle = rgb(mix(glass, C.lit, 0.55 * (1 - L.dark * 0.5)), 0.8);
  g.fillRect(x - w * 0.26, y - h, w * 0.52, Math.max(1.5, h * 0.06));
  const sunSide = C.sunAt[0] > at.x ? 1 : -1;
  g.fillStyle = rgb(mix(C.lit, [255, 255, 255], 0.4), 0.55 * (1 - L.dark * 0.6));
  g.beginPath();
  g.ellipse(x + sunSide * w * 0.28, y - h * 0.42, w * 0.06, h * 0.22, 0, 0, TAU);
  g.fill();
  /* The quill: a long curved shaft and a feather vane, leaning away. */
  const tipX = x - w * 0.05;
  const tipY = y - h * 0.82;
  const endX = tipX + h * 1.7;
  const endY = tipY - h * 3.4;
  const vane = inLight(k, [244, 238, 226], 0.1);
  const vaneShade = mix(vane, C.shade, 0.45);
  for (const side of [-1, 1]) {
    g.fillStyle = rgb(side > 0 ? vane : vaneShade);
    g.beginPath();
    g.moveTo(tipX + (endX - tipX) * 0.28, tipY + (endY - tipY) * 0.28);
    g.bezierCurveTo(
      tipX + (endX - tipX) * 0.45 + side * h * 0.42,
      tipY + (endY - tipY) * 0.45 + h * 0.1,
      endX + side * h * 0.36,
      endY + h * 0.55,
      endX,
      endY
    );
    g.lineTo(tipX + (endX - tipX) * 0.28, tipY + (endY - tipY) * 0.28);
    g.fill();
  }
  /* Barbs across the vane. */
  g.strokeStyle = rgb(vaneShade, 0.6);
  g.lineWidth = Math.max(1, h * 0.03);
  for (let i = 0; i < 9; i++) {
    const t = 0.35 + i * 0.07;
    const px = tipX + (endX - tipX) * t;
    const py = tipY + (endY - tipY) * t;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + h * 0.3, py + h * 0.14);
    g.stroke();
  }
  g.strokeStyle = rgb(mix(vane, C.deep, 0.35));
  g.lineWidth = Math.max(1.2, h * 0.05);
  g.beginPath();
  g.moveTo(tipX, tipY);
  g.quadraticCurveTo(tipX + (endX - tipX) * 0.4, tipY + (endY - tipY) * 0.55, endX, endY);
  g.stroke();
}
