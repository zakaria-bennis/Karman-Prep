// The still things in the cabin scene (scene.ts): mountains with snow caps, rolling hills, pines with snow
// lying on every branch, and the log cabin with its small details.
import type { CabinMode, Palette, Place } from "./scene";

type Ctx = CanvasRenderingContext2D;

/** A darker (k below 1) or lighter (k above 1) version of a #rrggbb colour. */
export function tone(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${ch(n >> 16)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}

export type Rock = { body: string; shade: string; snow: string; snowShade: string };

/** A range of sharp peaks: a lit face, a shaded face, and snow caps with a ragged lower edge. */
export function mountains(
  c: Ctx,
  x0: number,
  x1: number,
  base: number,
  tall: number,
  gap: number,
  r: () => number,
  col: Rock,
  bottom: number
) {
  type Pt = { x: number; y: number };
  const peaks: Pt[] = [];
  const dips: Pt[] = [];
  let x = x0 - gap;
  dips.push({ x: x - gap * 0.5, y: base - tall * 0.2 });
  while (x < x1 + gap) {
    const hgt = tall * (0.5 + r() * 0.5);
    peaks.push({ x, y: base - hgt });
    const nx = x + gap * (0.65 + r() * 0.8);
    dips.push({ x: (x + nx) / 2 + (r() - 0.5) * gap * 0.25, y: base - hgt * (0.22 + r() * 0.3) });
    x = nx;
  }
  // the skyline, with small breaks so no slope is a ruler line
  const line: Pt[] = [];
  const run = (a: Pt, b: Pt) => {
    for (let k = 0; k < 5; k++) {
      const t = k / 5;
      line.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t + (k ? (r() - 0.5) * tall * 0.05 : 0),
      });
    }
  };
  peaks.forEach((p, i) => {
    run(dips[i], p);
    run(p, dips[i + 1]);
  });
  const outline = () => {
    c.beginPath();
    c.moveTo(line[0].x, bottom);
    for (const p of line) c.lineTo(p.x, p.y);
    c.lineTo(line[line.length - 1].x, bottom);
    c.closePath();
  };
  outline();
  c.fillStyle = col.body;
  c.fill();
  c.save();
  outline();
  c.clip();
  peaks.forEach((p, i) => {
    const l = dips[i];
    const v = dips[i + 1];
    // the face turned away from the light
    c.fillStyle = col.shade;
    c.beginPath();
    c.moveTo(p.x, p.y - 4);
    c.lineTo(v.x + gap * 0.1, v.y);
    c.lineTo(v.x + gap * 0.1, bottom);
    c.lineTo(p.x + (v.x - p.x) * 0.28, bottom);
    c.lineTo(p.x + (v.x - p.x) * 0.1, p.y + (base - p.y) * 0.5);
    c.closePath();
    c.fill();
    // a spur or two running down the lit face
    c.strokeStyle = col.shade;
    c.lineWidth = Math.max(1, tall * 0.012);
    c.globalAlpha = 0.55;
    c.beginPath();
    c.moveTo(p.x - (p.x - l.x) * 0.2, p.y + (l.y - p.y) * 0.3);
    c.lineTo(p.x - (p.x - l.x) * 0.3, p.y + (base - p.y) * 0.75);
    c.stroke();
    c.globalAlpha = 1;
    // the snow cap
    const fl = 0.34 + r() * 0.2;
    const fr = 0.4 + r() * 0.22;
    const L = { x: p.x + (l.x - p.x) * fl, y: p.y + (l.y - p.y) * fl };
    const R = { x: p.x + (v.x - p.x) * fr, y: p.y + (v.y - p.y) * fr };
    const teeth = 5;
    const cap = (from: Pt, to: Pt) => {
      for (let k = 1; k < teeth; k++) {
        const t = k / teeth;
        const sag = Math.sin(t * Math.PI) * tall * 0.07;
        c.lineTo(
          from.x + (to.x - from.x) * t,
          from.y + (to.y - from.y) * t + sag + (k % 2 ? tall * 0.07 : -tall * 0.02)
        );
      }
    };
    c.fillStyle = col.snow;
    c.beginPath();
    c.moveTo(p.x, p.y - 6);
    c.lineTo(R.x, R.y);
    cap(R, L);
    c.lineTo(L.x, L.y);
    c.closePath();
    c.fill();
    c.fillStyle = col.snowShade;
    c.beginPath();
    c.moveTo(p.x, p.y - 6);
    c.lineTo(R.x, R.y);
    c.lineTo(p.x + (R.x - p.x) * 0.55, R.y + tall * 0.05);
    c.lineTo(p.x + (R.x - p.x) * 0.12, p.y + (R.y - p.y) * 0.62);
    c.closePath();
    c.fill();
  });
  c.restore();
}

/** A soft rolling hill with snow on its top and a fringe of tiny far-off trees along the crest. */
export function hill(
  c: Ctx,
  x0: number,
  x1: number,
  base: number,
  tall: number,
  freq: number,
  phase: number,
  col: string,
  snow: string,
  fringe: string,
  r: () => number,
  bottom: number
) {
  const top = (x: number) =>
    base -
    tall *
      (0.5 + 0.34 * Math.sin(x * freq + phase) + 0.16 * Math.sin(x * freq * 2.3 + phase * 2.1));
  const path = () => {
    c.beginPath();
    c.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 6) c.lineTo(x, top(x));
    c.lineTo(x1, bottom);
    c.closePath();
  };
  // the tiny trees stand behind the crest, so paint them first
  c.fillStyle = fringe;
  for (let x = x0; x < x1; x += tall * (0.05 + r() * 0.1)) {
    if (r() < 0.35) continue;
    const y = top(x) + tall * 0.03;
    const hh = tall * (0.12 + r() * 0.14);
    c.beginPath();
    c.moveTo(x, y - hh);
    c.lineTo(x + hh * 0.26, y);
    c.lineTo(x - hh * 0.26, y);
    c.closePath();
    c.fill();
  }
  path();
  c.fillStyle = col;
  c.fill();
  c.save();
  path();
  c.clip();
  const g = c.createLinearGradient(0, base - tall, 0, base - tall * 0.1);
  g.addColorStop(0, snow);
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(x0, base - tall * 1.1, x1 - x0, tall * 1.1);
  c.restore();
}

export type Needle = { col: string; snow: string; snowShade: string };

/** A pine in drooping tiers. Every tier ends in separate branch tips and carries snow on both shoulders
 *  (deeper on the left, where the wind lays it), with a shadow under each drift. */
export function drawPine(c: Ctx, x: number, y: number, tall: number, n: Needle, r: () => number) {
  const fine = tall > 80;
  const tiers = tall > 320 ? 11 : tall > 170 ? 9 : tall > 80 ? 7 : 5;
  const lean = (r() - 0.5) * tall * 0.035;
  const under = tone(n.col.startsWith("#") ? n.col : "#101830", 0.62);
  c.fillStyle = under;
  c.fillRect(x - tall * 0.013, y - tall * 0.12, tall * 0.026, tall * 0.13);
  // a little heap of snow at the foot
  if (fine) {
    c.fillStyle = n.snowShade;
    c.globalAlpha = 0.5;
    c.beginPath();
    c.ellipse(x, y + tall * 0.006, tall * 0.14, tall * 0.014, 0, 0, 7);
    c.fill();
    c.globalAlpha = 1;
  }
  for (let i = tiers - 1; i >= 0; i--) {
    const k = i / (tiers - 1);
    const apexY = y - tall + k * tall * 0.68;
    const half = tall * (0.05 + k * 0.19) * (0.86 + r() * 0.26);
    const footY = apexY + tall * (0.2 + k * 0.09);
    const ax = x + lean * (1 - k);
    const dip = half * 0.5;
    const tips = fine ? 3 + Math.round(k * 3) : 2;

    // the bough
    const g = c.createLinearGradient(0, apexY, 0, footY);
    g.addColorStop(0, n.col);
    g.addColorStop(1, under);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(ax, apexY);
    c.quadraticCurveTo(x + half * 0.4, footY - dip, x + half, footY);
    let px = x + half;
    for (let j = 1; j <= tips; j++) {
      const tx = x + half - (2 * half * j) / tips;
      const ty = footY + (j < tips ? r() * half * 0.14 : 0);
      c.quadraticCurveTo((px + tx) / 2, footY - half * (0.2 + r() * 0.1), tx, ty);
      px = tx;
    }
    c.quadraticCurveTo(x - half * 0.4, footY - dip, ax, apexY);
    c.fill();

    // snow along a shoulder: `side` -1 is the left, 1 the right
    const drift = (side: number, reach: number, thick: number, col: string, drop: number) => {
      const ex = x + side * half;
      const cx = x + side * half * 0.4;
      const cy = footY - dip;
      const at = (t: number) => ({
        x: (1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * ex,
        y: (1 - t) ** 2 * apexY + 2 * (1 - t) * t * cy + t * t * footY + drop,
      });
      const steps = fine ? 3 : 2;
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(ax, apexY + drop - tall * 0.006);
      for (let s = 1; s <= steps; s++) {
        const p = at((reach * s) / steps);
        c.lineTo(p.x, p.y);
      }
      // back along the underside in soft lumps
      for (let s = steps; s >= 1; s--) {
        const a = at((reach * s) / steps);
        const b = at((reach * (s - 1)) / steps);
        c.quadraticCurveTo(
          (a.x + b.x) / 2 - side * thick * 0.2,
          (a.y + b.y) / 2 + thick * (1.5 + (s % 2) * 0.5),
          b.x - side * thick * 0.25,
          b.y + thick * 0.55
        );
      }
      c.closePath();
      c.fill();
    };
    const th = half * (fine ? 0.2 : 0.28);
    drift(-1, 0.86, th, n.snowShade, th * 0.5);
    drift(-1, 0.86, th, n.snow, 0);
    drift(1, 0.6, th * 0.6, n.snowShade, th * 0.35);
    drift(1, 0.6, th * 0.6, n.snow, 0);
  }
  // the top carries a small cap
  c.fillStyle = n.snow;
  c.beginPath();
  c.ellipse(x + lean, y - tall + tall * 0.012, tall * 0.012, tall * 0.02, 0, 0, 7);
  c.fill();
}

/** Where the door, the windows and the lantern are. */
export function cabinParts(pl: Place) {
  const { u, cabinX: x, cabinY: y, cabinW: W } = pl;
  return {
    windows: [x - W * 0.32, x + W * 0.24],
    windowY: y - 96 * u,
    doorX: x - W * 0.08,
    lantern: { x: x - W * 0.08 + 40 * u, y: y - 74 * u },
  };
}

/** The cabin, seen from the front: log walls, a deep roof of snow hung with icicles, a stone chimney, a door
 *  with a wreath, two lit windows, a lantern and a stack of firewood. */
export function drawCabin(c: Ctx, pl: Place, pal: Palette, mode: CabinMode) {
  const { u, cabinX: x, cabinY: y, cabinW: W } = pl;
  const night = mode === "night";
  const parts = cabinParts(pl);
  const wallH = 118 * u;
  const peak = 104 * u;
  const eave = 30 * u;
  const L = x - W / 2;
  const R = x + W / 2;
  const top = y - wallH;
  const wood = night ? "#22150f" : "#33211a";

  // soft shadow on the snow
  c.fillStyle = night ? "rgba(6, 8, 30, 0.45)" : "rgba(70, 50, 120, 0.3)";
  c.beginPath();
  c.ellipse(x + 20 * u, y + 7 * u, W * 0.66, 17 * u, 0, 0, 7);
  c.fill();

  // firewood stacked against the right wall, snow on top
  const pileX = R + 12 * u;
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4 - row; i++) {
      const lx = pileX + (i + row * 0.5) * 15 * u + 7 * u;
      const ly = y - 7 * u - row * 13 * u;
      c.fillStyle = pal.logs[(i + row) % 2];
      c.beginPath();
      c.arc(lx, ly, 7.5 * u, 0, 7);
      c.fill();
      c.fillStyle = "rgba(255, 214, 170, 0.22)";
      c.beginPath();
      c.arc(lx, ly, 4 * u, 0, 7);
      c.fill();
      c.strokeStyle = "rgba(0,0,0,0.25)";
      c.lineWidth = u;
      c.beginPath();
      c.arc(lx, ly, 2 * u, 0, 7);
      c.stroke();
    }
  }
  c.fillStyle = pal.roofSnow;
  c.beginPath();
  c.ellipse(pileX + 30 * u, y - 44 * u, 26 * u, 8 * u, 0, 0, 7);
  c.fill();

  // chimney of rounded stones, behind the roof line
  const chX = x + W * 0.24;
  const chW = 42 * u;
  const chTop = top - peak * 0.9;
  c.fillStyle = night ? "#34304a" : "#6d5f7a";
  c.fillRect(chX, chTop, chW, peak * 0.9);
  for (let row = 0; row < 7; row++) {
    for (let i = 0; i < 3; i++) {
      c.fillStyle = (row + i) % 2 ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.14)";
      c.beginPath();
      c.roundRect(
        chX + 2 * u + i * 13 * u + (row % 2) * 4 * u - 3 * u,
        chTop + 6 * u + row * 12 * u,
        11 * u,
        9 * u,
        4 * u
      );
      c.fill();
    }
  }
  c.fillStyle = pal.roofSnow;
  c.beginPath();
  c.roundRect(chX - 6 * u, chTop - 10 * u, chW + 12 * u, 15 * u, 7.5 * u);
  c.fill();

  // the gable wall of logs
  c.save();
  c.beginPath();
  c.moveTo(L, y);
  c.lineTo(L, top);
  c.lineTo(x, top - peak);
  c.lineTo(R, top);
  c.lineTo(R, y);
  c.closePath();
  c.clip();
  const log = 15 * u;
  for (let i = 0, yy = y; yy > top - peak - log; yy -= log, i++) {
    c.fillStyle = pal.logs[i % 2];
    c.fillRect(L, yy - log, W, log);
    c.fillStyle = "rgba(255, 220, 180, 0.08)";
    c.fillRect(L, yy - log, W, 3 * u);
    c.fillStyle = "rgba(0, 0, 0, 0.3)";
    c.fillRect(L, yy - 2 * u, W, 2 * u);
    // grain: a few short darker strokes and a knot
    c.fillStyle = "rgba(0, 0, 0, 0.13)";
    for (let g = 0; g < 5; g++) {
      const gx = L + ((i * 53 + g * 97) % 100) * 0.01 * W;
      c.fillRect(gx, yy - log + 6 * u + (g % 2) * 3 * u, (18 + ((g * 7) % 20)) * u, 1.2 * u);
    }
    c.beginPath();
    c.ellipse(L + ((i * 71) % 100) * 0.01 * W, yy - log / 2, 3 * u, 1.8 * u, 0, 0, 7);
    c.fill();
  }
  // the roof throws a shadow down the wall
  const sh = c.createLinearGradient(0, top - peak, 0, top + 30 * u);
  sh.addColorStop(0, "rgba(10, 6, 20, 0.55)");
  sh.addColorStop(1, "rgba(10, 6, 20, 0)");
  c.fillStyle = sh;
  c.fillRect(L, top - peak, W, peak + 30 * u);
  c.restore();

  // log ends at the corners
  for (let yy = y - log / 2; yy > top; yy -= log) {
    for (const ex of [L - 3 * u, R + 3 * u]) {
      c.fillStyle = pal.logs[1];
      c.beginPath();
      c.arc(ex, yy, log * 0.52, 0, 7);
      c.fill();
      c.fillStyle = "rgba(255, 214, 170, 0.18)";
      c.beginPath();
      c.arc(ex, yy, log * 0.28, 0, 7);
      c.fill();
    }
  }

  // door, with a step of snow and a wreath
  const dW = 50 * u;
  const dH = 82 * u;
  const dX = parts.doorX - dW / 2;
  c.fillStyle = wood;
  c.beginPath();
  c.roundRect(dX - 4 * u, y - dH - 4 * u, dW + 8 * u, dH + 4 * u, [8 * u, 8 * u, 0, 0]);
  c.fill();
  c.fillStyle = night ? "#3a251d" : "#4c2f23";
  c.beginPath();
  c.roundRect(dX, y - dH, dW, dH, [6 * u, 6 * u, 0, 0]);
  c.fill();
  c.fillStyle = "rgba(0, 0, 0, 0.2)";
  for (let i = 1; i < 4; i++)
    c.fillRect(dX + (dW * i) / 4 - 0.6 * u, y - dH + 3 * u, 1.2 * u, dH - 3 * u);
  c.fillStyle = "#e8b25a";
  c.beginPath();
  c.arc(dX + dW - 9 * u, y - dH * 0.42, 3 * u, 0, 7);
  c.fill();
  c.strokeStyle = night ? "#1f4a37" : "#2d6b4a";
  c.lineWidth = 6 * u;
  c.beginPath();
  c.arc(parts.doorX, y - dH * 0.66, 11 * u, 0, 7);
  c.stroke();
  c.fillStyle = "#c8443c";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    c.beginPath();
    c.arc(parts.doorX + Math.cos(a) * 11 * u, y - dH * 0.66 + Math.sin(a) * 11 * u, 2 * u, 0, 7);
    c.fill();
  }
  c.fillStyle = pal.roofSnow;
  c.beginPath();
  c.roundRect(dX - 10 * u, y - 5 * u, dW + 20 * u, 9 * u, 4.5 * u);
  c.fill();

  // two windows, lit from inside, with curtains (their glow is painted each frame in life.ts)
  for (const wx of parts.windows) {
    const s = 52 * u;
    const wy = parts.windowY;
    c.fillStyle = wood;
    c.beginPath();
    c.roundRect(wx - s / 2 - 6 * u, wy - 6 * u, s + 12 * u, s + 12 * u, 5 * u);
    c.fill();
    const g = c.createLinearGradient(0, wy, 0, wy + s);
    g.addColorStop(0, "#ffe7ab");
    g.addColorStop(1, "#ffac4a");
    c.fillStyle = g;
    c.fillRect(wx - s / 2, wy, s, s);
    c.fillStyle = "rgba(190, 80, 50, 0.55)";
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(wx + (side * s) / 2, wy);
      c.lineTo(wx + side * s * 0.08, wy);
      c.quadraticCurveTo(wx + side * s * 0.34, wy + s * 0.34, wx + (side * s) / 2, wy + s * 0.78);
      c.closePath();
      c.fill();
    }
    c.fillStyle = wood;
    c.fillRect(wx - 1.5 * u, wy, 3 * u, s);
    c.fillRect(wx - s / 2, wy + s / 2 - 1.5 * u, s, 3 * u);
    c.fillStyle = pal.roofSnow;
    c.beginPath();
    c.roundRect(wx - s / 2 - 9 * u, wy + s + 4 * u, s + 18 * u, 9 * u, 4.5 * u);
    c.fill();
  }

  // a lantern on a bracket beside the door
  const ln = parts.lantern;
  c.strokeStyle = wood;
  c.lineWidth = 2 * u;
  c.beginPath();
  c.moveTo(ln.x, ln.y - 16 * u);
  c.lineTo(ln.x, ln.y - 7 * u);
  c.stroke();
  c.fillStyle = wood;
  c.beginPath();
  c.roundRect(ln.x - 5 * u, ln.y - 8 * u, 10 * u, 15 * u, 2 * u);
  c.fill();
  c.fillStyle = "#ffd98a";
  c.fillRect(ln.x - 3 * u, ln.y - 5 * u, 6 * u, 9 * u);

  // the roof: dark boards, then a deep slab of snow with a soft underside
  const roof = (drop: number) => {
    c.beginPath();
    c.moveTo(L - eave, top + 16 * u + drop);
    c.lineTo(x, top - peak + drop);
    c.lineTo(R + eave, top + 16 * u + drop);
  };
  c.lineJoin = "round";
  c.lineCap = "round";
  roof(8 * u);
  c.strokeStyle = night ? "#241712" : "#3a241b";
  c.lineWidth = 16 * u;
  c.stroke();
  // icicles hang from under the snow, longest near the eaves
  c.fillStyle = night ? "rgba(205, 216, 255, 0.85)" : "rgba(255, 244, 240, 0.9)";
  for (let i = 0; i <= 26; i++) {
    const k = i / 26;
    const side = k < 0.5 ? k * 2 : (1 - k) * 2;
    if (side > 0.82) continue;
    const ix = L - eave + (W + eave * 2) * k;
    const iy = top + 16 * u - side * (peak + 16 * u) + 12 * u;
    const len = (7 + ((i * 13) % 12) + (1 - side) * 8) * u;
    c.beginPath();
    c.moveTo(ix - 2.4 * u, iy);
    c.lineTo(ix + 2.4 * u, iy);
    c.lineTo(ix, iy + len);
    c.closePath();
    c.fill();
  }
  roof(2 * u);
  c.strokeStyle = pal.roofShade;
  c.lineWidth = 26 * u;
  c.stroke();
  roof(-4 * u);
  c.strokeStyle = pal.roofSnow;
  c.lineWidth = 24 * u;
  c.stroke();
  // lumps of snow along the roof, so the slab is not a ruler line
  c.fillStyle = pal.roofSnow;
  for (let i = 0; i <= 14; i++) {
    const k = i / 14;
    const side = k < 0.5 ? k * 2 : (1 - k) * 2;
    const px = L - eave + (W + eave * 2) * k;
    const py = top + 16 * u - side * (peak + 16 * u) - 6 * u;
    c.beginPath();
    c.ellipse(px, py, (15 + ((i * 7) % 9)) * u, (8 + ((i * 5) % 6)) * u, 0, 0, 7);
    c.fill();
  }

  // snow banked against the foot of the wall
  c.fillStyle = pal.roofSnow;
  c.globalAlpha = night ? 0.55 : 0.92;
  for (let i = 0; i < 7; i++) {
    if (i === 2 || i === 3) continue; // the doorway is kept clear
    c.beginPath();
    c.ellipse(
      L + (W * (i + 0.3)) / 6.6,
      y + 3 * u,
      (34 + ((i * 11) % 14)) * u,
      (8 + ((i * 3) % 5)) * u,
      0,
      0,
      7
    );
    c.fill();
  }
  c.globalAlpha = 1;
}
