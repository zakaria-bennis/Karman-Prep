/*
 * Life in the Library's two skies once they are painted (sky.ts).
 *
 * Always, gently: the brightest stars twinkle, and now and then a letter lets go of the nebula.
 * On hover, faded in and out by `k` (0 to 1), `h` seconds after it began:
 * - Math: the constellations draw themselves in light, one after another; the moons run their
 *   elliptical orbits with a trail of light behind them; a glint travels round the planet's ring.
 * - Reading and Writing: letters stream off the nebula's wisps and drift, and the book and quill
 *   constellations draw themselves.
 * Lights are painted dots, never four-point star shapes.
 */
import type { PictureMap } from "../life";
import type { MathSky, ReadingSky } from "./sky";
import { kiteDiamond, kiteString } from "./sky-day";

const TAU = Math.PI * 2;
const LETTERS = "abcdefghijklmnopqrstuvwxyzAEGKMRSW&";
const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));

function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a: number) {
  if (a <= 0.004 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${col},${a})`);
  gr.addColorStop(0.35, `rgba(${col},${a * 0.5})`);
  gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Strokes the first `p` (0 to 1) of a polyline given in pixels. */
function partial(g: CanvasRenderingContext2D, pts: [number, number][], p: number) {
  if (p <= 0 || pts.length < 2) return;
  const n = (pts.length - 1) * Math.min(1, p);
  const whole = Math.floor(n);
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= whole; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (whole < pts.length - 1) {
    const f = n - whole;
    const [ax, ay] = pts[whole];
    const [bx, by] = pts[whole + 1];
    g.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
  }
  g.stroke();
}

/** Twinkling: each bright star brightens and fades on its own slow beat. */
export function drawTwinkle(
  g: CanvasRenderingContext2D,
  stars: [number, number, number][],
  t: number,
  map: PictureMap,
  alpha: number
) {
  stars.forEach(([u, v, s], i) => {
    const beat = 0.5 + 0.5 * Math.sin(t * (0.7 + (i % 5) * 0.23) + i * 1.7);
    dot(g, map.X(u), map.Y(v), (3 + s * 2.4) * map.S, "245,246,255", 0.5 * beat * beat * alpha);
  });
}

/** Draws each figure in light, one after another, starting at `start` seconds. */
function drawFigures(
  g: CanvasRenderingContext2D,
  figures: [number, number][][],
  k: number,
  h: number,
  start: number,
  map: PictureMap,
  col: string
) {
  g.lineCap = "round";
  g.lineJoin = "round";
  figures.forEach((fig, i) => {
    const pts = fig.map(([u, v]) => [map.X(u), map.Y(v)] as [number, number]);
    const p = ease((h - start - i * 0.45) / 0.9);
    g.strokeStyle = `rgba(${col},${0.85 * k})`;
    g.lineWidth = 2 * map.S;
    g.shadowColor = `rgba(${col},${0.8 * k})`;
    g.shadowBlur = 8 * map.S;
    partial(g, pts, p);
    g.shadowBlur = 0;
    pts.forEach(([x, y], j) => {
      const on = ease((p * (pts.length - 1) - j + 1) * 2);
      dot(g, x, y, 9 * map.S, col, 0.95 * k * on);
    });
  });
}

/** Math comes alive: constellations draw themselves, moons run their orbits, the ring glints. */
export function drawMathSkyHover(
  g: CanvasRenderingContext2D,
  sky: MathSky,
  k: number,
  h: number,
  map: PictureMap,
  night: boolean,
  t: number
) {
  if (sky.day) return drawMathDay(g, sky, k, h, map, t);
  if (k <= 0.01) return;
  const col = night ? "236,240,255" : "255,252,240";
  g.save();
  drawFigures(g, sky.figures, k, h, 0.1, map, col);
  /* The moons on their orbits, each with a trail of light along the ellipse. */
  const pl = sky.planet;
  if (!pl) return g.restore();
  const px = map.X(pl.x);
  const py = map.Y(pl.y);
  const pr = map.X(pl.x + pl.r) - px;
  const ct = Math.cos(pl.tilt);
  const st = Math.sin(pl.tilt);
  const at = (a: number, b: number, t: number): [number, number] => {
    const mx = Math.cos(t) * pr * a;
    const my = Math.sin(t) * pr * b;
    return [px + mx * ct - my * st, py + mx * st + my * ct];
  };
  pl.orbits.forEach(([a, b], i) => {
    const t = (i ? 2.3 : 5.4) + h * (i ? 0.9 : 1.4);
    g.lineCap = "round";
    for (let j = 0; j < 18; j++) {
      const [x0, y0] = at(a, b, t - j * 0.05);
      const [x1, y1] = at(a, b, t - (j + 1) * 0.05);
      g.strokeStyle = `rgba(${col},${0.7 * k * (1 - j / 18)})`;
      g.lineWidth = 2.6 * map.S * (1 - j / 24);
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
    const [x, y] = at(a, b, t);
    dot(g, x, y, 14 * map.S, col, 0.95 * k);
  });
  /* A glint running round the front of the ring. */
  const gt = Math.PI * (0.1 + 0.8 * (0.5 - 0.5 * Math.cos(h * 1.6)));
  const [gx, gy] = at(1.8, 0.4, gt);
  dot(g, gx, gy, 16 * map.S, col, 0.85 * k);
  g.restore();
}

interface Drift {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  spin: number;
  ch: string;
  size: number;
}

export interface NebulaState {
  letters: Drift[];
  clock: number;
}

export const nebulaState = (): NebulaState => ({ letters: [], clock: 0.5 });

/**
 * Reading and Writing: letters let go of the nebula's wisps (a few always, a stream on hover) and
 * the book and quill constellations draw themselves.
 */
export function drawReadingSky(
  g: CanvasRenderingContext2D,
  sky: ReadingSky,
  st: NebulaState,
  k: number,
  h: number,
  dt: number,
  map: PictureMap,
  night: boolean,
  font: string,
  alpha: number
) {
  const col = night ? "236,240,255" : "255,252,240";
  const ink = night ? "250,238,200" : "255,255,255";
  if (k > 0.01) {
    g.save();
    drawFigures(g, sky.figures, k, h, 0.15, map, col);
    g.restore();
  }
  /* Letters: one every few seconds at rest, many a second on hover. */
  st.clock -= dt;
  const every = k > 0.2 ? 0.06 + 0.06 * Math.random() : 1.6 + Math.random() * 2;
  while (st.clock <= 0 && st.letters.length < 60 && sky.wisps.length) {
    const [u, v] = sky.wisps[Math.floor(Math.random() * sky.wisps.length)];
    const out = Math.atan2(v - sky.nebula.y, u - sky.nebula.x);
    const sp = (18 + Math.random() * 30) * map.S;
    st.letters.push({
      x: map.X(u),
      y: map.Y(v),
      vx: Math.cos(out) * sp,
      vy: Math.sin(out) * sp - 10 * map.S,
      life: 0,
      max: 2.8 + Math.random() * 2,
      spin: Math.random() * TAU,
      ch: LETTERS[Math.floor(Math.random() * LETTERS.length)],
      size: 14 + Math.random() * 14,
    });
    st.clock += every;
  }
  g.save();
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const q of st.letters) {
    q.life += dt;
    const sway = Math.sin(q.life * 1.8 + q.spin);
    q.x += (q.vx + sway * 12 * map.S) * dt;
    q.y += q.vy * dt;
    const a = Math.min(1, q.life / 0.4, (q.max - q.life) / 1) * alpha;
    if (a <= 0.01) continue;
    g.save();
    g.translate(q.x, q.y);
    g.rotate(sway * 0.5);
    g.font = `${Math.round(q.size * map.S)}px ${font}`;
    g.shadowColor = `rgba(${ink},${0.7 * a})`;
    g.shadowBlur = 8 * map.S;
    g.fillStyle = `rgba(${ink},${0.9 * a})`;
    g.fillText(q.ch, 0, 0);
    g.restore();
  }
  g.restore();
  st.letters = st.letters.filter((q) => q.life < q.max);
}

/** A small flock flying a V across the sky, wings beating. */
function flock(g: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, a: number) {
  g.strokeStyle = `rgba(30,34,44,${0.7 * a})`;
  g.lineWidth = Math.max(1.2, s * 0.09);
  g.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const row = Math.ceil(i / 2);
    const side = i % 2 ? -1 : 1;
    const bx = x - row * s * 1.3;
    const by = y + side * row * s * 0.8;
    const beat = Math.sin(t * 7 + i) * s * 0.25;
    g.beginPath();
    g.moveTo(bx - s * 0.5, by - beat);
    g.quadraticCurveTo(bx - s * 0.2, by - s * 0.3, bx, by);
    g.quadraticCurveTo(bx + s * 0.2, by - s * 0.3, bx + s * 0.5, by - beat);
    g.stroke();
  }
}

/**
 * Math by day comes alive: the kite strings and kites trace themselves in light, a triangle
 * joins the two kites and the balloon, the burner flares, and a flock crosses in a V.
 */
function drawMathDay(
  g: CanvasRenderingContext2D,
  sky: MathSky,
  k: number,
  h: number,
  map: PictureMap,
  t: number
) {
  const day = sky.day;
  if (!day) return;
  const { X, Y, S } = map;
  const aspect = Y(1) / X(1);
  const col = "255,252,236";
  g.save();
  g.lineCap = "round";
  g.lineJoin = "round";
  /* The burner: a warm flicker under the envelope, always a little, brighter on hover. */
  const { x, y, r } = day.balloon;
  const R = X(r);
  const fl = 0.55 + 0.45 * Math.sin(t * 9) * Math.sin(t * 5.3);
  dot(g, X(x), Y(y) + R * 1.55, R * (0.35 + 0.25 * k), "255,196,110", (0.25 + 0.6 * k) * fl);
  if (k > 0.01) {
    day.kites.forEach((kt, i) => {
      const d = kiteDiamond(kt, aspect);
      const str = kiteString(d[2], day.anchor).map(([u, v]) => [X(u), Y(v)] as [number, number]);
      const p = ease((h - i * 0.3) / 1.1);
      g.strokeStyle = `rgba(${col},${0.75 * k})`;
      g.lineWidth = 2 * S;
      g.shadowColor = `rgba(${col},${0.8 * k})`;
      g.shadowBlur = 8 * S;
      partial(g, str, p);
      const outline = [...d, d[0]].map(([u, v]) => [X(u), Y(v)] as [number, number]);
      partial(g, outline, ease((h - 0.2 - i * 0.3) / 0.8));
      g.shadowBlur = 0;
    });
    /* The triangle between the two kites and the balloon. */
    const tri = [
      [day.kites[0][0], day.kites[0][1]],
      [day.kites[1][0], day.kites[1][1]],
      [x, y],
      [day.kites[0][0], day.kites[0][1]],
    ].map(([u, v]) => [X(u), Y(v)] as [number, number]);
    g.setLineDash([6 * S, 7 * S]);
    g.strokeStyle = `rgba(${col},${0.6 * k})`;
    g.lineWidth = 1.6 * S;
    partial(g, tri, ease((h - 0.8) / 1.2));
    g.setLineDash([]);
    /* A flock crossing in a V. */
    const fx = ((h * 0.09) % 1.3) - 0.15;
    flock(g, X(day.birds[0] + fx), Y(day.birds[1]) - h * 4 * S, 16 * S, t, k);
  }
  g.restore();
}

/** Paper planes gliding off from where the painted ones sit, on Reading and Writing's hover. */
export function drawPlanes(
  g: CanvasRenderingContext2D,
  planes: [number, number, number][],
  k: number,
  h: number,
  map: PictureMap
) {
  if (k <= 0.01) return;
  const { X, Y } = map;
  planes.forEach(([u, v, s], i) => {
    const run = ((h + i * 0.9) % 2.6) / 2.6;
    const x = X(u) + run * X(0.22) - X(0.04);
    const y = Y(v) - run * Y(0.18) + Math.sin(run * TAU) * Y(0.015);
    const S = X(s) * 0.8;
    const a = k * Math.min(1, run * 5, (1 - run) * 4);
    g.save();
    g.translate(x, y);
    g.rotate(-0.35 + Math.cos(run * TAU) * 0.12);
    g.fillStyle = `rgba(255,252,244,${0.95 * a})`;
    g.beginPath();
    g.moveTo(S * 1.2, -S * 0.2);
    g.lineTo(-S, -S * 0.05);
    g.lineTo(-S * 0.4, S * 0.35);
    g.closePath();
    g.fill();
    g.fillStyle = `rgba(214,206,190,${0.95 * a})`;
    g.beginPath();
    g.moveTo(S * 1.2, -S * 0.2);
    g.lineTo(-S * 0.4, S * 0.35);
    g.lineTo(-S * 0.55, S * 0.6);
    g.closePath();
    g.fill();
    g.restore();
  });
}
