/*
 * Painted objects for the "shelf" version of the Library's course choice: a drafting compass
 * and a set square for Math, a stack of books with an inkpot and quill for Reading and Writing.
 * Lit by the day's light, the books bound in the painting's hue.
 *
 * Each object is drawn twice: once in color (the source for the brushwork) and once in white
 * (its silhouette, used as a mask so the painted object stands on the shelf with no box
 * around it). `sil` switches between the two.
 */
import { mix, rgb, type Color } from "../noise";
import type { Studio } from "../studio";
import { inLight } from "./motifs";

const TAU = Math.PI * 2;

type Paint = (c: Color, a?: number) => string;

function painter(sil: boolean): Paint {
  return (c, a = 1) => (sil ? "#fff" : rgb(c, a));
}

/** A bar from (x0, y0) to (x1, y1) of width w, as a path. */
function bar(
  g: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * (w / 2);
  const ny = (dx / l) * (w / 2);
  g.beginPath();
  g.moveTo(x0 + nx, y0 + ny);
  g.lineTo(x1 + nx * 0.55, y1 + ny * 0.55);
  g.lineTo(x1 - nx * 0.55, y1 - ny * 0.55);
  g.lineTo(x0 - nx, y0 - ny);
  g.closePath();
}

/** Math: a set square standing behind an open compass, with a ruler at their feet. */
export function mathObjects(k: Studio, accent: Color, sil: boolean) {
  const { g, W, H, C } = k;
  const p = painter(sil);
  const brass = inLight(k, [201, 154, 72], 0.08);
  const steel = inLight(k, [176, 182, 192], 0.12);
  const wood = inLight(k, [196, 150, 98], 0.1);
  const acrylic = inLight(k, mix(accent, [255, 255, 255], 0.18), 0.1);

  /* The set square: a right triangle with a triangular window cut out of it. */
  const A: [number, number] = [W * 0.1, H * 0.86];
  const B: [number, number] = [W * 0.1, H * 0.12];
  const Cc: [number, number] = [W * 0.78, H * 0.86];
  g.beginPath();
  g.moveTo(...A);
  g.lineTo(...B);
  g.lineTo(...Cc);
  g.closePath();
  const inA: [number, number] = [W * 0.2, H * 0.78];
  const inB: [number, number] = [W * 0.2, H * 0.42];
  const inC: [number, number] = [W * 0.53, H * 0.78];
  g.moveTo(...inA);
  g.lineTo(...inC);
  g.lineTo(...inB);
  g.closePath();
  if (sil) {
    g.fillStyle = "#fff";
    g.fill("evenodd");
  } else {
    const gr = g.createLinearGradient(B[0], B[1], Cc[0], Cc[1]);
    gr.addColorStop(0, rgb(mix(acrylic, C.lit, 0.35)));
    gr.addColorStop(1, rgb(mix(acrylic, C.deep, 0.2)));
    g.fillStyle = gr;
    g.fill("evenodd");
    /* A bright edge along the long side, and scale marks up the short one. */
    g.strokeStyle = rgb(mix(acrylic, [255, 255, 255], 0.55), 0.85);
    g.lineWidth = W * 0.012;
    g.beginPath();
    g.moveTo(B[0] + W * 0.01, B[1] + H * 0.02);
    g.lineTo(Cc[0] - W * 0.02, Cc[1] - H * 0.01);
    g.stroke();
    g.strokeStyle = rgb(mix(acrylic, C.deep, 0.55), 0.7);
    g.lineWidth = Math.max(1, W * 0.006);
    for (let i = 0; i < 14; i++) {
      const y = B[1] + H * 0.06 + i * H * 0.048;
      g.beginPath();
      g.moveTo(B[0] + W * 0.012, y);
      g.lineTo(B[0] + W * (i % 2 ? 0.04 : 0.065), y);
      g.stroke();
    }
  }

  /* The ruler, lying in front. */
  g.beginPath();
  g.moveTo(W * 0.03, H * 0.875);
  g.lineTo(W * 0.97, H * 0.85);
  g.lineTo(W * 0.98, H * 0.92);
  g.lineTo(W * 0.04, H * 0.95);
  g.closePath();
  g.fillStyle = p(wood);
  g.fill();
  if (!sil) {
    g.fillStyle = rgb(mix(wood, C.lit, 0.4), 0.8);
    g.fillRect(W * 0.04, H * 0.868, W * 0.92, H * 0.012);
    g.strokeStyle = rgb(mix(wood, C.deep, 0.6), 0.75);
    g.lineWidth = Math.max(1, W * 0.005);
    for (let i = 0; i < 30; i++) {
      const x = W * (0.06 + i * 0.03);
      const y = H * (0.876 - i * 0.0008);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + H * (i % 5 ? 0.018 : 0.034));
      g.stroke();
    }
  }

  /* The compass: a knob, a hinge and two legs, one ending in a needle, one in a pencil. */
  const hx = W * 0.62;
  const hy = H * 0.2;
  const lx = W * 0.4;
  const rx = W * 0.9;
  const fy = H * 0.86;
  const legW = W * 0.06;
  for (const [x1, shade] of [
    [lx, 0.25],
    [rx, 0],
  ] as const) {
    bar(g, hx, hy, x1, fy - H * 0.06, legW);
    if (sil) {
      g.fillStyle = "#fff";
    } else {
      const gr = g.createLinearGradient(hx - legW, 0, hx + legW, 0);
      gr.addColorStop(0, rgb(mix(brass, C.lit, 0.5 - shade)));
      gr.addColorStop(1, rgb(mix(brass, C.deep, 0.25 + shade)));
      g.fillStyle = gr;
    }
    g.fill();
  }
  /* The needle and the pencil tips. */
  bar(g, lx, fy - H * 0.065, lx - W * 0.012, fy, W * 0.018);
  g.fillStyle = p(steel);
  g.fill();
  bar(g, rx, fy - H * 0.07, rx + W * 0.01, fy, W * 0.04);
  g.fillStyle = p(mix(wood, [240, 200, 120], 0.3));
  g.fill();
  bar(g, rx + W * 0.007, fy - H * 0.02, rx + W * 0.01, fy, W * 0.016);
  g.fillStyle = p([60, 60, 66]);
  g.fill();
  /* The hinge and the knob. */
  g.beginPath();
  g.arc(hx, hy, W * 0.055, 0, TAU);
  g.fillStyle = p(mix(brass, C.lit, 0.15));
  g.fill();
  g.beginPath();
  g.roundRect(hx - W * 0.018, hy - H * 0.13, W * 0.036, H * 0.1, W * 0.01);
  g.fillStyle = p(mix(brass, C.deep, 0.15));
  g.fill();
  if (!sil) {
    g.fillStyle = rgb(mix(brass, [255, 255, 255], 0.6), 0.9);
    g.beginPath();
    g.arc(hx - W * 0.016, hy - H * 0.012, W * 0.016, 0, TAU);
    g.fill();
    /* The arc the compass has just drawn on the ruler's edge. */
    g.strokeStyle = rgb(mix(C.deep, accent, 0.3), 0.6);
    g.lineWidth = Math.max(1, W * 0.008);
    g.beginPath();
    g.arc(lx, fy, rx - lx, Math.PI * 1.88, Math.PI * 1.99);
    g.stroke();
  }
}

/** Reading and Writing: three books stacked, an inkpot on top and a quill standing in it. */
export function readingObjects(k: Studio, accent: Color, sil: boolean) {
  const { g, W, H, C } = k;
  const p = painter(sil);
  const paper = inLight(k, [244, 236, 214], 0.08);
  const gold = inLight(k, [214, 172, 86], 0.1);
  const covers: Color[] = [
    inLight(k, mix(accent, C.deep, 0.2), 0.05),
    inLight(k, [168, 82, 62], 0.08),
    inLight(k, [222, 196, 140], 0.08),
  ];
  const books: [number, number, number, number][] = [
    /* x0, x1, top, bottom */
    [0.06, 0.94, 0.76, 0.95],
    [0.14, 0.88, 0.6, 0.76],
    [0.09, 0.8, 0.47, 0.6],
  ];
  books.forEach(([x0, x1, t, b], i) => {
    const X0 = x0 * W;
    const X1 = x1 * W;
    const T = t * H;
    const B = b * H;
    /* The page block shows on the right, the spine faces us on the left. */
    g.beginPath();
    g.roundRect(X0, T, X1 - X0, B - T, W * 0.012);
    g.fillStyle = p(covers[i]);
    g.fill();
    if (sil) return;
    g.fillStyle = rgb(paper);
    g.fillRect(X1 - W * 0.2, T + (B - T) * 0.14, W * 0.18, (B - T) * 0.72);
    g.strokeStyle = rgb(mix(paper, C.shade, 0.4), 0.6);
    g.lineWidth = 1;
    for (let j = 1; j < 6; j++) {
      const y = T + (B - T) * (0.14 + (0.72 * j) / 6);
      g.beginPath();
      g.moveTo(X1 - W * 0.2, y);
      g.lineTo(X1 - W * 0.02, y);
      g.stroke();
    }
    const gr = g.createLinearGradient(0, T, 0, B);
    gr.addColorStop(0, rgb(C.lit, 0.32 * (1 - k.L.dark)));
    gr.addColorStop(0.35, rgb(C.lit, 0));
    gr.addColorStop(1, rgb(C.deep, 0.3));
    g.fillStyle = gr;
    g.fillRect(X0, T, X1 - X0 - W * 0.2, B - T);
    /* Gold bands and a title plate on the spine. */
    g.fillStyle = rgb(gold, 0.95);
    for (const f of [0.18, 0.82]) g.fillRect(X0 + W * 0.04, T + (B - T) * f - 1, W * 0.012, 2.5);
    g.fillRect(X0 + W * 0.1, T + (B - T) * 0.36, (X1 - X0) * 0.4, (B - T) * 0.28);
    g.fillStyle = rgb(mix(covers[i], C.deep, 0.35), 0.9);
    g.fillRect(X0 + W * 0.12, T + (B - T) * 0.45, (X1 - X0) * 0.34, (B - T) * 0.1);
  });

  /* The inkpot: dark glass, a lit shoulder, a brass collar. */
  const ix = W * 0.56;
  const iy = H * 0.47;
  g.beginPath();
  g.moveTo(ix - W * 0.12, iy);
  g.bezierCurveTo(
    ix - W * 0.14,
    iy - H * 0.1,
    ix - W * 0.06,
    iy - H * 0.12,
    ix - W * 0.05,
    iy - H * 0.15
  );
  g.lineTo(ix + W * 0.05, iy - H * 0.15);
  g.bezierCurveTo(ix + W * 0.06, iy - H * 0.12, ix + W * 0.14, iy - H * 0.1, ix + W * 0.12, iy);
  g.closePath();
  g.fillStyle = p(inLight(k, [34, 40, 62], 0.12));
  g.fill();
  g.fillStyle = p(gold);
  g.fillRect(ix - W * 0.06, iy - H * 0.17, W * 0.12, H * 0.03);
  if (!sil) {
    g.fillStyle = rgb(mix(C.lit, [255, 255, 255], 0.4), 0.55 * (1 - k.L.dark * 0.5));
    g.beginPath();
    g.ellipse(ix - W * 0.07, iy - H * 0.07, W * 0.018, H * 0.03, -0.4, 0, TAU);
    g.fill();
  }

  /* The quill: a curved shaft with a soft vane, rising up and to the right. */
  const q0: [number, number] = [ix + W * 0.01, iy - H * 0.15];
  const q1: [number, number] = [W * 0.93, H * 0.04];
  const qc: [number, number] = [W * 0.66, H * 0.14];
  const at = (t: number): [number, number] => {
    const u = 1 - t;
    return [
      u * u * q0[0] + 2 * u * t * qc[0] + t * t * q1[0],
      u * u * q0[1] + 2 * u * t * qc[1] + t * t * q1[1],
    ];
  };
  const feather = inLight(k, [246, 242, 232], 0.12);
  g.beginPath();
  for (let i = 0; i <= 20; i++) {
    const t = 0.18 + (i / 20) * 0.82;
    const [x, y] = at(t);
    const wv = W * 0.07 * Math.sin(Math.min(1, (t - 0.18) / 0.82) * Math.PI) ** 0.7;
    g.lineTo(x - wv * 0.55, y - wv * 0.45);
  }
  for (let i = 20; i >= 0; i--) {
    const t = 0.18 + (i / 20) * 0.82;
    const [x, y] = at(t);
    const wv = W * 0.05 * Math.sin(Math.min(1, (t - 0.18) / 0.82) * Math.PI) ** 0.7;
    g.lineTo(x + wv * 0.55, y + wv * 0.45);
  }
  g.closePath();
  if (sil) {
    g.fillStyle = "#fff";
  } else {
    const gr = g.createLinearGradient(q0[0], q0[1], q1[0], q1[1]);
    gr.addColorStop(0, rgb(mix(feather, accent, 0.25)));
    gr.addColorStop(1, rgb(mix(feather, C.lit, 0.3)));
    g.fillStyle = gr;
  }
  g.fill();
  g.strokeStyle = p(mix(feather, C.shade, 0.5));
  g.lineWidth = Math.max(1.5, W * 0.01);
  g.beginPath();
  g.moveTo(...q0);
  g.quadraticCurveTo(qc[0], qc[1], q1[0], q1[1]);
  g.stroke();
  if (!sil) {
    g.strokeStyle = rgb(mix(feather, C.shade, 0.35), 0.5);
    g.lineWidth = 1;
    for (let i = 2; i < 18; i++) {
      const [x, y] = at(0.2 + i * 0.045);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - W * 0.04, y - H * 0.012);
      g.stroke();
    }
  }
}

/** A wooden shelf board, lit along its top edge. */
export function shelfBoard(k: Studio) {
  const { g, W, H, C } = k;
  const wood = inLight(k, [150, 104, 64], 0.06);
  const top = H * 0.32;
  const gr = g.createLinearGradient(0, 0, 0, top);
  gr.addColorStop(0, rgb(mix(wood, C.lit, 0.35)));
  gr.addColorStop(1, rgb(mix(wood, C.lit, 0.1)));
  g.fillStyle = gr;
  g.fillRect(0, 0, W, top);
  g.fillStyle = rgb(mix(wood, C.deep, 0.15));
  g.fillRect(0, top, W, H - top);
  /* Grain: long wavy lines in a lighter and a darker brown. */
  for (let i = 0; i < 26; i++) {
    const y = top + ((i + 0.5) / 26) * (H - top);
    g.strokeStyle = rgb(i % 3 ? mix(wood, C.deep, 0.4) : mix(wood, C.lit, 0.3), 0.35);
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= W; x += 6) g.lineTo(x, y + Math.sin(x * 0.02 + i * 1.7) * 1.4);
    g.stroke();
  }
  g.fillStyle = rgb(mix(wood, [255, 255, 255], 0.35), 0.5);
  g.fillRect(0, top - 1, W, 2);
  g.fillStyle = rgb(C.deep, 0.5);
  g.fillRect(0, H - 3, W, 3);
}
