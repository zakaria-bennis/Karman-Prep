// The still things in the cabin scene (scene.ts): a snowy ridge, a snow-laden pine, and the log cabin.
import type { CabinMode, Palette, Place } from "./scene";

/** A mountain ridge with snow lying on its upper slopes. */
export function ridge(
  c: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  base: number,
  tall: number,
  freq: number,
  phase: number,
  col: string,
  snow: string,
  bottom: number
) {
  const top = (x: number) =>
    base -
    tall *
      (0.5 +
        0.3 * Math.sin(x * freq + phase) +
        0.16 * Math.sin(x * freq * 2.7 + phase * 2.1) +
        0.07 * Math.sin(x * freq * 6.3 + phase * 0.7));
  const path = (drop: number) => {
    c.beginPath();
    c.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 6) c.lineTo(x, top(x) + drop);
    c.lineTo(x1, bottom);
    c.closePath();
  };
  path(0);
  c.fillStyle = col;
  c.fill();
  c.save();
  path(0);
  c.clip();
  const g = c.createLinearGradient(0, base - tall, 0, base - tall * 0.25);
  g.addColorStop(0, snow);
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(x0, base - tall * 1.2, x1 - x0, tall);
  c.restore();
}

/** A pine in tiers, each tier carrying snow on its upper edge. */
export function drawPine(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  tall: number,
  col: string,
  snow: string,
  r: () => number
) {
  const tiers = tall > 260 ? 9 : tall > 120 ? 7 : 5;
  const lean = (r() - 0.5) * tall * 0.03;
  c.fillStyle = col;
  c.fillRect(x - tall * 0.012, y - tall * 0.12, tall * 0.024, tall * 0.14);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = tiers - 1; i >= 0; i--) {
      const k = i / (tiers - 1);
      const apexY = y - tall + k * tall * 0.66;
      const half = tall * (0.045 + k * 0.17) * (0.9 + ((i * 37) % 10) / 50);
      const footY = apexY + tall * (0.2 + k * 0.1);
      const ax = x + lean * (1 - k);
      if (pass === 0) {
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(ax, apexY);
        c.quadraticCurveTo(x + half * 0.5, footY - half * 0.3, x + half, footY);
        c.quadraticCurveTo(x, footY - half * 0.34, x - half, footY);
        c.quadraticCurveTo(x - half * 0.5, footY - half * 0.3, ax, apexY);
        c.fill();
      } else {
        // snow lies on the left shoulder of each tier
        c.fillStyle = snow;
        c.beginPath();
        c.moveTo(ax, apexY);
        c.quadraticCurveTo(x - half * 0.5, footY - half * 0.3, x - half, footY);
        c.quadraticCurveTo(
          x - half * 0.55,
          footY - half * 0.42,
          x - half * 0.12,
          footY - half * 0.62
        );
        c.quadraticCurveTo(x - half * 0.05, apexY + (footY - apexY) * 0.4, ax, apexY);
        c.fill();
      }
    }
  }
}

/** The cabin, seen from the front: log walls, a deep roof of snow, a stone chimney, a door and two lit windows. */
export function drawCabin(c: CanvasRenderingContext2D, pl: Place, pal: Palette, mode: CabinMode) {
  const { u, cabinX: x, cabinY: y, cabinW: W } = pl;
  const wallH = 118 * u;
  const peak = 104 * u;
  const eave = 30 * u;
  const L = x - W / 2;
  const R = x + W / 2;
  const top = y - wallH;

  // soft shadow on the snow
  c.fillStyle = mode === "night" ? "rgba(6, 8, 30, 0.45)" : "rgba(70, 76, 130, 0.3)";
  c.beginPath();
  c.ellipse(x + 16 * u, y + 6 * u, W * 0.62, 16 * u, 0, 0, 7);
  c.fill();

  // chimney, behind the roof line
  const chX = x + W * 0.24;
  const chW = 40 * u;
  const chTop = top - peak * 0.9;
  c.fillStyle = mode === "night" ? "#3a3550" : "#77697a";
  c.fillRect(chX, chTop, chW, peak * 0.9);
  c.fillStyle = "rgba(0,0,0,0.16)";
  for (let i = 0; i < 5; i++) {
    c.fillRect(chX + ((i % 2) * chW) / 2, chTop + 8 * u + i * 13 * u, chW / 2 - 2 * u, 2 * u);
  }
  c.fillStyle = pal.roofSnow;
  c.beginPath();
  c.roundRect(chX - 5 * u, chTop - 9 * u, chW + 10 * u, 14 * u, 7 * u);
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
    c.fillStyle = "rgba(255, 220, 180, 0.07)";
    c.fillRect(L, yy - log, W, 3 * u);
    c.fillStyle = "rgba(0, 0, 0, 0.3)";
    c.fillRect(L, yy - 2 * u, W, 2 * u);
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
      c.fillStyle = "rgba(255, 214, 170, 0.16)";
      c.beginPath();
      c.arc(ex, yy, log * 0.26, 0, 7);
      c.fill();
    }
  }

  // door
  const dW = 50 * u;
  const dH = 82 * u;
  const dX = x - W * 0.08 - dW / 2;
  c.fillStyle = mode === "night" ? "#2a1a16" : "#3d251c";
  c.beginPath();
  c.roundRect(dX, y - dH, dW, dH, [6 * u, 6 * u, 0, 0]);
  c.fill();
  c.fillStyle = "rgba(255, 200, 140, 0.1)";
  c.fillRect(dX + 6 * u, y - dH + 8 * u, dW - 12 * u, dH - 16 * u);
  c.fillStyle = "#e8b25a";
  c.beginPath();
  c.arc(dX + dW - 9 * u, y - dH * 0.45, 3 * u, 0, 7);
  c.fill();

  // two windows, lit from inside (their flicker is painted each frame in life.ts)
  for (const wx of windows(pl)) {
    const s = 52 * u;
    c.fillStyle = mode === "night" ? "#22150f" : "#33211a";
    c.beginPath();
    c.roundRect(wx - s / 2 - 5 * u, y - 96 * u - 5 * u, s + 10 * u, s + 10 * u, 5 * u);
    c.fill();
    const g = c.createLinearGradient(0, y - 96 * u, 0, y - 96 * u + s);
    g.addColorStop(0, "#ffe3a1");
    g.addColorStop(1, "#ffac4a");
    c.fillStyle = g;
    c.fillRect(wx - s / 2, y - 96 * u, s, s);
    c.fillStyle = mode === "night" ? "#22150f" : "#33211a";
    c.fillRect(wx - 1.5 * u, y - 96 * u, 3 * u, s);
    c.fillRect(wx - s / 2, y - 96 * u + s / 2 - 1.5 * u, s, 3 * u);
    c.fillStyle = pal.roofSnow;
    c.beginPath();
    c.roundRect(wx - s / 2 - 8 * u, y - 96 * u + s + 3 * u, s + 16 * u, 8 * u, 4 * u);
    c.fill();
  }

  // the roof: dark boards, then a deep slab of snow with a soft underside
  const roof = (grow: number, drop: number) => {
    c.beginPath();
    c.moveTo(L - eave - grow, top + 16 * u + drop);
    c.lineTo(x, top - peak - grow * 0.7 + drop);
    c.lineTo(R + eave + grow, top + 16 * u + drop);
  };
  c.lineJoin = "round";
  c.lineCap = "round";
  roof(0, 8 * u);
  c.strokeStyle = mode === "night" ? "#241712" : "#3a241b";
  c.lineWidth = 16 * u;
  c.stroke();
  roof(0, 2 * u);
  c.strokeStyle = pal.roofShade;
  c.lineWidth = 26 * u;
  c.stroke();
  roof(0, -4 * u);
  c.strokeStyle = pal.roofSnow;
  c.lineWidth = 24 * u;
  c.stroke();
  // lumps of snow along the roof, so the slab is not a ruler line
  c.fillStyle = pal.roofSnow;
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    const side = k < 0.5 ? k * 2 : (1 - k) * 2;
    const px = L - eave + (W + eave * 2) * k;
    const py = top + 16 * u - side * (peak + 16 * u) - 6 * u;
    c.beginPath();
    c.ellipse(px, py, (16 + ((i * 7) % 9)) * u, (9 + ((i * 5) % 5)) * u, 0, 0, 7);
    c.fill();
  }

  // snow banked against the foot of the wall
  c.fillStyle = pal.roofSnow;
  c.globalAlpha = mode === "night" ? 0.5 : 0.9;
  for (let i = 0; i < 7; i++) {
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

/** The x of each window's centre. */
export function windows(pl: Place): number[] {
  return [pl.cabinX - pl.cabinW * 0.32, pl.cabinX + pl.cabinW * 0.24];
}
