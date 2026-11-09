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
  night: boolean
) {
  if (k <= 0.01) return;
  const col = night ? "236,240,255" : "255,252,240";
  g.save();
  drawFigures(g, sky.figures, k, h, 0.1, map, col);
  /* The moons on their orbits, each with a trail of light along the ellipse. */
  const pl = sky.planet;
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
