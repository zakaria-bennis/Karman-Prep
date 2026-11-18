/*
 * Intro 10, paper boats: the stream, drawn in code and then painted in as brushwork by the
 * daily paintings' stroke engine. A calm stream seen from above at an angle: it runs away from
 * us up the screen, narrowing into the distance, between grassy banks with stones, reeds and lily
 * pads, under the hour's light (LIGHT in light.ts). Where it meets the horizon it opens into the
 * light, toward the subject's scene.
 */
import { LIGHT, type TimeOfDay } from "@/lib/painting/light";
import { ctx2d, hex, makeCanvas, mix, rgb, rng, vnoise, type Color } from "@/lib/painting/noise";
import { layoutFor, type Layout } from "@/lib/painting/library/seam";
import type { Subject } from "../registry";

/** Where the stream meets the far distance (fraction of the screen height). */
export const HORIZON: Record<Layout, number> = { wide: 0.14, tall: 0.16 };

/** The stream's middle, across the screen, at height v (fractions). */
export function streamU(layout: Layout, v: number): number {
  return layout === "wide" ? 0.5 + 0.055 * Math.sin(v * 7.2 + 0.6) : 0.5 + 0.07 * Math.sin(v * 6.4);
}

/** The stream's width at height v, as a fraction of the screen width. */
export function streamW(layout: Layout, v: number): number {
  const t = Math.max(0, (v - HORIZON[layout]) / (1.05 - HORIZON[layout]));
  return layout === "wide" ? 0.06 + 0.66 * t ** 1.25 : 0.12 + 0.98 * t ** 1.15;
}

/** Each boat's mooring: the point under its hull (fractions) and its size for the distance. */
export function mooring(layout: Layout, s: Subject): { u: number; v: number; scale: number } {
  const v = s === "math" ? (layout === "wide" ? 0.52 : 0.47) : layout === "wide" ? 0.8 : 0.75;
  const side = s === "math" ? -1 : 1;
  const u = streamU(layout, v) + side * streamW(layout, v) * 0.2;
  return { u, v, scale: s === "math" ? 0.9 : 1 };
}

/** Where the stream ends up in the subject's ground scene (fractions): the lake under the
 *  bridge, or the brook through the meadow. The boat sails there as the camera follows. */
export const LANDING: Record<Layout, Record<Subject, [number, number]>> = {
  wide: { math: [0.3, 0.7], rw: [0.665, 0.69] },
  tall: { math: [0.58, 0.46], rw: [0.5, 0.74] },
};

const FLOWERS = ["#f4e3a0", "#e8a0b8", "#ffffff", "#c8a0e0"];

export function renderStream(vw: number, vh: number, time: TimeOfDay): HTMLCanvasElement {
  const layout = layoutFor(vw, vh);
  const wide = layout === "wide";
  const W = wide ? 760 : 480;
  const H = Math.max(200, Math.round((vh / vw) * W));
  const c = makeCanvas(W, H);
  const g = ctx2d(c);
  const L = LIGHT[time];
  const C = {
    top: hex(L.top),
    low: hex(L.low),
    haze: hex(L.haze),
    sun: hex(L.sun),
    glow: hex(L.glow),
    land: hex(L.land),
    deep: hex(L.deep),
    water: hex(L.water),
  };
  const night = time === "night";
  const dark = L.dark;
  const r = rng(1010);
  const hz = HORIZON[layout] * H;

  /* The sky, a strip above the far end, with the sun or moon low in it. */
  const sky = g.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, L.top);
  sky.addColorStop(1, L.low);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, hz + 2);
  const sx = W * (wide ? 0.62 : 0.7);
  const glow = g.createRadialGradient(sx, hz * 0.6, 0, sx, hz * 0.6, W * 0.4);
  glow.addColorStop(0, rgb(C.glow, night ? 0.3 : 0.6));
  glow.addColorStop(1, rgb(C.glow, 0));
  g.fillStyle = glow;
  g.fillRect(0, 0, W, hz + 2);
  g.fillStyle = L.sun;
  g.beginPath();
  g.arc(sx, hz * 0.55, W * 0.014, 0, 6.283);
  g.fill();

  /* Far hills along the horizon, softened by haze. */
  for (let band = 0; band < 2; band++) {
    g.fillStyle = rgb(mix(mix(C.land, C.haze, band ? 0.25 : 0.55), C.deep, dark * 0.4));
    g.beginPath();
    g.moveTo(0, hz + 2);
    for (let i = 0; i <= 30; i++) {
      const x = (W * i) / 30;
      g.lineTo(x, hz - H * (0.015 - band * 0.006) - vnoise(i * 0.5, band, 3) * H * 0.03);
    }
    g.lineTo(W, hz + 2);
    g.fill();
  }

  /* The meadow banks: grass mottled light and dark, darker toward us. */
  const grassFar = mix(mix(C.land, [170, 200, 120], 0.35 * (1 - dark)), C.haze, 0.25);
  const grassNear = mix(C.land, C.deep, 0.25);
  const meadow = g.createLinearGradient(0, hz, 0, H);
  meadow.addColorStop(0, rgb(grassFar));
  meadow.addColorStop(1, rgb(grassNear));
  g.fillStyle = meadow;
  g.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 2600; i++) {
    const y = hz + (H - hz) * Math.sqrt(r());
    const x = r() * W;
    const near = (y - hz) / (H - hz);
    const n = vnoise(x / 30, y / 30, 9);
    const col: Color = mix(
      n > 0.5 ? mix(C.land, [200, 220, 140], 0.3 * (1 - dark)) : C.deep,
      C.land,
      0.5
    );
    g.fillStyle = rgb(col, 0.35);
    g.beginPath();
    g.ellipse(x, y, 2 + near * 7, 1 + near * 3, 0, 0, 6.283);
    g.fill();
  }

  /* The water. */
  const edge = (v: number, side: -1 | 1) =>
    (streamU(layout, v) + (side * streamW(layout, v)) / 2) * W;
  const vs: number[] = [];
  for (let v = HORIZON[layout] + 0.004; v <= 1.06; v += 0.01) vs.push(v);
  const waterPath = (grow = 0) => {
    g.beginPath();
    vs.forEach((v, i) => {
      const x = edge(v, -1) - grow * (0.4 + (v - 0.1) * 6);
      if (i) g.lineTo(x, v * H);
      else g.moveTo(x, v * H);
    });
    for (let i = vs.length - 1; i >= 0; i--)
      g.lineTo(edge(vs[i], 1) + grow * (0.4 + (vs[i] - 0.1) * 6), vs[i] * H);
    g.closePath();
  };
  /* The wet bank: a darker earth line just outside the water. */
  g.fillStyle = rgb(mix([92, 74, 52], C.deep, 0.35 + dark * 0.4));
  waterPath(3);
  g.fill();
  const water = g.createLinearGradient(0, hz, 0, H);
  water.addColorStop(0, rgb(mix(C.low, C.water, 0.35)));
  water.addColorStop(0.35, rgb(mix(C.water, C.low, 0.2)));
  water.addColorStop(1, rgb(mix(C.water, C.deep, 0.4)));
  g.fillStyle = water;
  waterPath();
  g.fill();

  g.save();
  waterPath();
  g.clip();
  /* Slow currents: pale lines drawn along the stream. */
  for (let i = 0; i < 70; i++) {
    const off = (r() - 0.5) * 0.85;
    const v0 = HORIZON[layout] + 0.02 + r() * 0.85;
    const len = 0.03 + r() * 0.08;
    g.strokeStyle = rgb(mix(C.low, [255, 255, 255], 0.3), 0.12 + r() * 0.14);
    g.lineWidth = 0.6 + (v0 - 0.1) * 2.4;
    g.beginPath();
    for (let k = 0; k <= 6; k++) {
      const v = v0 + (len * k) / 6;
      const x = (streamU(layout, v) + off * streamW(layout, v) * 0.9) * W;
      if (k) g.lineTo(x, v * H);
      else g.moveTo(x, v * H);
    }
    g.stroke();
  }
  /* The sun's (or moon's) path on the water. */
  for (let i = 0; i < 26; i++) {
    const v = HORIZON[layout] + 0.01 + i * 0.012 + r() * 0.01;
    const x = (streamU(layout, v) + 0.08 * (sx / W - 0.5)) * W + (r() - 0.5) * W * 0.01 * i;
    g.fillStyle = rgb(C.sun, (night ? 0.5 : 0.35) * (1 - i / 30));
    g.fillRect(x - (2 + i * 0.6), v * H, 4 + i * 1.2, 1 + i * 0.08);
  }
  g.restore();

  /* Lily pads near the banks, and stones and reeds along them. */
  for (let i = 0; i < 16; i++) {
    const v = HORIZON[layout] + 0.08 + r() * 0.85;
    const side = r() < 0.5 ? -1 : 1;
    const x = (streamU(layout, v) + side * streamW(layout, v) * (0.36 + r() * 0.1)) * W;
    const s = 2 + (v - 0.1) * 16;
    g.fillStyle = rgb(mix([74, 120, 60], C.deep, dark * 0.6));
    g.beginPath();
    g.ellipse(x, v * H, s * 1.4, s * 0.6, 0, 0.3, 6.0);
    g.lineTo(x, v * H);
    g.fill();
    if (r() < 0.35 && !night) {
      g.fillStyle = "#f3d7e2";
      g.beginPath();
      g.arc(x + s * 0.3, v * H - s * 0.15, s * 0.32, 0, 6.283);
      g.fill();
    }
  }
  for (let i = 0; i < 60; i++) {
    const v = HORIZON[layout] + 0.03 + Math.sqrt(r()) * 0.95;
    const side: -1 | 1 = r() < 0.5 ? -1 : 1;
    const x = edge(v, side) + side * (r() * 6 - 2);
    const s = 1.5 + (v - 0.1) * 10;
    const grey = mix([150, 146, 138], C.deep, 0.2 + dark * 0.6);
    g.fillStyle = rgb(grey);
    g.beginPath();
    g.ellipse(x, v * H, s * (1 + r()), s * 0.6, 0, 0, 6.283);
    g.fill();
    g.fillStyle = rgb(mix(grey, [255, 255, 255], 0.3), 0.6);
    g.beginPath();
    g.ellipse(x - s * 0.2, v * H - s * 0.2, s * 0.5, s * 0.22, 0, 0, 6.283);
    g.fill();
  }
  for (let i = 0; i < 22; i++) {
    const v = HORIZON[layout] + 0.1 + r() * 0.88;
    const side: -1 | 1 = r() < 0.5 ? -1 : 1;
    const x0 = edge(v, side) + side * 8;
    const hgt = 6 + (v - 0.1) * 40;
    g.strokeStyle = rgb(mix([96, 120, 60], C.deep, 0.15 + dark * 0.6));
    g.lineWidth = 1 + (v - 0.1) * 1.6;
    for (let k = 0; k < 6; k++) {
      const x = x0 + (r() - 0.5) * hgt * 0.5;
      g.beginPath();
      g.moveTo(x, v * H);
      g.quadraticCurveTo(
        x + side * hgt * 0.1,
        v * H - hgt * 0.6,
        x + side * hgt * 0.22,
        v * H - hgt
      );
      g.stroke();
    }
  }
  /* Meadow flowers, more of them near us. */
  for (let i = 0; i < 160; i++) {
    const v = HORIZON[layout] + 0.04 + Math.sqrt(r()) * 0.95;
    const u = r();
    if (Math.abs(u - streamU(layout, v)) < streamW(layout, v) / 2 + 0.02) continue;
    g.fillStyle = rgb(mix(hex(FLOWERS[i % 4]), C.deep, dark * 0.7));
    const s = 0.8 + (v - 0.1) * 3.2;
    g.beginPath();
    g.arc(u * W, v * H, s, 0, 6.283);
    g.fill();
  }
  /* Haze where the stream meets the distance. */
  const haze = g.createLinearGradient(0, hz - H * 0.02, 0, hz + H * 0.12);
  haze.addColorStop(0, rgb(C.haze, 0));
  haze.addColorStop(0.3, rgb(C.haze, night ? 0.25 : 0.45));
  haze.addColorStop(1, rgb(C.haze, 0));
  g.fillStyle = haze;
  g.fillRect(0, hz - H * 0.02, W, H * 0.14);
  /* A soft darkening at the near edge and the sides. */
  const vig = g.createRadialGradient(
    W / 2,
    H * 0.45,
    W * 0.2,
    W / 2,
    H * 0.45,
    Math.max(W, H) * 0.85
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, `rgba(8, 12, 20, ${night ? 0.4 : 0.2})`);
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);
  return c;
}
