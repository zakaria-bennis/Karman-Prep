/*
 * Intro 4's painted desk: a wooden desk seen from the chair, the wall behind it with a window
 * onto the hour's sky, a lamp, a potted plant and two closed books. Drawn as a source picture,
 * then painted in as brushwork (paintPicture), like every Karman painting. The hour relights it:
 * daylight from the window by day, warm low light at dawn and sunset, the lamp alone at night.
 */
import { LIGHT, type TimeOfDay } from "@/lib/painting/light";
import { ctx2d, hex, makeCanvas, mix, rgb, rng, vnoise, type Color } from "@/lib/painting/noise";

const TAU = Math.PI * 2;

/** Where the desk's back edge meets the wall, as a fraction of the height. */
export function deskEdge(w: number, h: number): number {
  return w < 768 ? 0.15 : h / w > 1 ? 0.13 : 0.2;
}

export function renderDesk(w: number, h: number, time: TimeOfDay, hue: number): HTMLCanvasElement {
  const W = 960;
  const H = Math.max(200, Math.round((W * h) / w));
  const c = makeCanvas(W, H);
  const g = ctx2d(c);
  const L = LIGHT[time] ?? LIGHT.day;
  const r = rng(4242);
  const night = time === "night";
  const dark = L.dark;
  const edge = deskEdge(w, h) * H;
  const tall = H > W;

  /* The wall: warm plaster, lit by the hour, darker toward the corners. */
  const plaster = mix(mix(hex("#d8ccb4"), hex(L.lit), 0.25), hex(L.deep), dark * 0.8);
  const wall = g.createLinearGradient(0, 0, 0, edge);
  wall.addColorStop(0, rgb(mix(plaster, hex(L.deep), 0.25)));
  wall.addColorStop(1, rgb(plaster));
  g.fillStyle = wall;
  g.fillRect(0, 0, W, edge + 2);

  /* The window onto the sky, with the sun or moon in it. */
  const wx0 = W * (tall ? 0.56 : 0.62);
  const wx1 = W * (tall ? 0.92 : 0.86);
  const wy0 = edge * 0.08;
  const wy1 = edge * 0.9;
  const sky = g.createLinearGradient(0, wy0, 0, wy1);
  sky.addColorStop(0, L.top);
  sky.addColorStop(1, L.low);
  g.fillStyle = sky;
  g.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  const sunX = wx0 + (wx1 - wx0) * 0.68;
  const sunY = wy0 + (wy1 - wy0) * (time === "day" ? 0.3 : night ? 0.28 : 0.7);
  const glow = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, (wx1 - wx0) * 0.5);
  glow.addColorStop(0, rgb(hex(L.glow), night ? 0.3 : 0.7));
  glow.addColorStop(1, rgb(hex(L.glow), 0));
  g.fillStyle = glow;
  g.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  g.fillStyle = L.sun;
  g.beginPath();
  g.arc(sunX, sunY, Math.max(3, (wx1 - wx0) * 0.045), 0, TAU);
  g.fill();
  if (night) {
    for (let i = 0; i < 26; i++) {
      g.fillStyle = rgb([235, 238, 250], 0.4 + r() * 0.5);
      g.fillRect(wx0 + r() * (wx1 - wx0), wy0 + r() * (wy1 - wy0) * 0.8, 1.4, 1.4);
    }
  }
  /* Far hills through the glass. */
  g.fillStyle = rgb(mix(hex(L.shade), hex(L.low), 0.35));
  g.beginPath();
  g.moveTo(wx0, wy1);
  for (let x = wx0; x <= wx1; x += 6)
    g.lineTo(x, wy1 - (wy1 - wy0) * (0.12 + 0.1 * vnoise(x / 60, 1, 3)));
  g.lineTo(wx1, wy1);
  g.fill();
  /* Frame and glazing bars. */
  const frame = rgb(mix(hex("#efe6d2"), hex(L.deep), dark * 0.85));
  g.strokeStyle = frame;
  g.lineWidth = 7;
  g.strokeRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo((wx0 + wx1) / 2, wy0);
  g.lineTo((wx0 + wx1) / 2, wy1);
  g.moveTo(wx0, (wy0 + wy1) / 2);
  g.lineTo(wx1, (wy0 + wy1) / 2);
  g.stroke();
  /* Daylight falling through the window onto the wall below it. */
  if (!night) {
    g.fillStyle = rgb(hex(L.lit), 0.18);
    g.fillRect(wx0 - 10, wy1 + 4, wx1 - wx0 + 20, edge - wy1);
  }

  /* The desk: wide planks running away from the chair. */
  const wood: Color = mix(hex("#8a5632"), hex(L.lit), 0.08);
  const woodFar = mix(wood, hex(L.deep), 0.25 + dark * 0.4);
  const woodNear = mix(mix(wood, hex("#5a321c"), 0.35), hex(L.deep), dark * 0.6);
  const top = g.createLinearGradient(0, edge, 0, H);
  top.addColorStop(0, rgb(woodFar));
  top.addColorStop(1, rgb(woodNear));
  g.fillStyle = top;
  g.fillRect(0, edge, W, H - edge);
  /* The desk's back lip. */
  g.fillStyle = rgb(mix(woodFar, hex("#2a160c"), 0.35));
  g.fillRect(0, edge, W, Math.max(3, H * 0.008));
  /* Plank seams converge toward a point above the screen. */
  const vx = W * 0.5;
  const vy = edge - H * 1.4;
  g.strokeStyle = rgb(mix(woodNear, hex("#1c0e06"), 0.4), 0.55);
  g.lineWidth = 2;
  for (let i = -6; i <= 6; i++) {
    const bx = W * 0.5 + i * W * 0.17;
    const t0 = (edge - vy) / (H - vy);
    g.beginPath();
    g.moveTo(vx + (bx - vx) * t0, edge);
    g.lineTo(bx, H);
    g.stroke();
  }
  /* Grain: long wavering strokes along the planks. */
  for (let i = 0; i < 420; i++) {
    const bx = r() * W * 1.6 - W * 0.3;
    const y0 = edge + r() * (H - edge);
    const len = H * (0.05 + r() * 0.16);
    const light = r() < 0.5;
    g.strokeStyle = rgb(
      light ? mix(wood, hex(L.lit), 0.25 - dark * 0.2) : mix(woodNear, hex("#1c0e06"), 0.3),
      0.12 + r() * 0.16
    );
    g.lineWidth = 0.8 + r() * 1.6;
    g.beginPath();
    for (let k = 0; k <= 10; k++) {
      const y = y0 + (len * k) / 10;
      const t = (y - vy) / (H - vy);
      const x = vx + (bx - vx) * t + Math.sin(y / 30 + i) * 2.2;
      if (k === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }

  /* The lamp at the back left: a brass arm and a shade in the day's hue. */
  const lx = W * (tall ? 0.16 : 0.12);
  const ly = edge + H * 0.015;
  const shade = `hsl(${hue} 42% ${night ? 30 : 36}%)`;
  g.strokeStyle = rgb(mix(hex("#b8913e"), hex(L.deep), dark * 0.5));
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(lx, ly);
  g.lineTo(lx + W * 0.03, edge - H * 0.09);
  g.lineTo(lx + W * 0.075, edge - H * 0.13);
  g.stroke();
  g.fillStyle = rgb(mix(hex("#7a6030"), hex(L.deep), dark * 0.4));
  g.beginPath();
  g.ellipse(lx, ly, W * 0.035, H * 0.008, 0, 0, TAU);
  g.fill();
  g.fillStyle = shade;
  g.beginPath();
  const sx = lx + W * 0.075;
  const sy = edge - H * 0.13;
  g.moveTo(sx - W * 0.03, sy - H * 0.01);
  g.lineTo(sx + W * 0.03, sy - H * 0.01);
  g.lineTo(sx + W * 0.055, sy + H * 0.05);
  g.lineTo(sx - W * 0.055, sy + H * 0.05);
  g.closePath();
  g.fill();

  /* A potted plant at the back right, and two closed books at the back left. */
  const px = W * (tall ? 0.86 : 0.93);
  const pot = mix(hex("#b5643c"), hex(L.deep), dark * 0.6);
  g.fillStyle = rgb(pot);
  g.fillRect(px - W * 0.025, edge - H * 0.02, W * 0.05, H * 0.05);
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
    const len = H * (0.05 + r() * 0.06);
    g.strokeStyle = rgb(mix(hex(i % 2 ? "#4f7a35" : "#7aa04a"), hex(L.deep), dark * 0.6));
    g.lineWidth = 5 + r() * 4;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(px, edge - H * 0.02);
    g.quadraticCurveTo(
      px + Math.cos(a) * len * 0.4,
      edge - H * 0.02 + Math.sin(a) * len * 0.6,
      px + Math.cos(a) * len,
      edge - H * 0.02 + Math.sin(a) * len
    );
    g.stroke();
  }
  const bx = W * (tall ? 0.3 : 0.24);
  const books: [string, number][] = [
    ["#3e5a7a", 0.024],
    ["#8a3a3a", 0.02],
  ];
  let by = edge + H * 0.03;
  for (const [col, th] of books) {
    g.fillStyle = rgb(mix(hex(col), hex(L.deep), dark * 0.6));
    g.fillRect(bx - W * 0.07, by - H * th, W * 0.14, H * th);
    g.fillStyle = rgb(mix(hex("#efe4cc"), hex(L.deep), dark * 0.6));
    g.fillRect(bx - W * 0.066, by - H * th * 0.75, W * 0.004, H * th * 0.5);
    by -= H * th;
  }

  /* The hour's light: dark at night, then the lamp's warm pool on the desk. */
  if (dark > 0) {
    g.fillStyle = rgb(hex(L.deep), dark * 0.55);
    g.fillRect(0, 0, W, H);
  }
  const pool = g.createRadialGradient(
    W * 0.5,
    H * 0.52,
    0,
    W * 0.5,
    H * 0.52,
    Math.max(W, H) * 0.6
  );
  const warm = hex(night ? "#ffcf8a" : time === "day" ? "#fff6e6" : "#ffc59a");
  pool.addColorStop(0, rgb(warm, night ? 0.32 : 0.16));
  pool.addColorStop(1, rgb(warm, 0));
  g.globalCompositeOperation = "lighter";
  g.fillStyle = pool;
  g.fillRect(0, 0, W, H);
  if (night || time === "sunset" || time === "dawn") {
    const lamp = g.createRadialGradient(sx, sy + H * 0.06, 0, sx, sy + H * 0.06, W * 0.22);
    lamp.addColorStop(0, rgb(hex("#ffd59a"), night ? 0.45 : 0.25));
    lamp.addColorStop(1, rgb(hex("#ffd59a"), 0));
    g.fillStyle = lamp;
    g.fillRect(0, 0, W, H);
  }
  g.globalCompositeOperation = "source-over";
  return c;
}
