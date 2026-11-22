// The parts the geometry pictures share (GeometryFigs.tsx, SolidFigs.tsx): points and their sums,
// numbers read from labels, where a label goes (beside a side, inside an angle), corner marks, and a
// viewBox that holds every line and label, at least 240 wide so labels keep their size on a phone.

export type P = [number, number];
export type Box = [x0: number, y0: number, x1: number, y1: number];

export const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
export const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
export const dot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1];
export const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const unit = (a: P): P => {
  const l = Math.hypot(a[0], a[1]) || 1;
  return [a[0] / l, a[1] / l];
};
export const rad = (deg: number) => (deg * Math.PI) / 180;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A number for an SVG attribute, to two places. */
export const f = (n: number) => String(Math.round(n * 100) / 100);

/** A path through the points, closed unless told otherwise. */
export const path = (ps: P[], close = true) =>
  ps.map((p, i) => `${i ? "L" : "M"}${f(p[0])} ${f(p[1])}`).join(" ") + (close ? " Z" : "");

/** "5" or "2.5" as a number; anything else ("x", "5√2", "") is null. */
export function plainNumber(label: string | undefined): number | null {
  const t = label?.trim() ?? "";
  return /^(\d+(\.\d*)?|\.\d+)$/.test(t) ? Number(t) : null;
}

/** A number as a label: 7.5 as "7.5", 10 as "10", and no float dust (0.1 times 3 is "0.3"). */
export const numberLabel = (n: number) => String(Number(n.toFixed(4)));

/** "5, x and 10", for an aria-label. */
export const listing = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** About half a label's width (Hanken Grotesk at 600), and half its height, at a font size. */
export const halfWidth = (text: string, size = 14) =>
  (Math.max(1, [...text].length) * size * 0.6) / 2;
export const halfHeight = (size = 14) => size * 0.4;

/** A label: where its middle is, its words, its classes, the step it appears at, its font size. */
export interface Text {
  at: P;
  text: string;
  className: string;
  step: number;
  size?: number;
}

export const textBox = ({ at, text, size }: Text): Box => {
  const [hw, hh] = [halfWidth(text, size), halfHeight(size)];
  return [at[0] - hw, at[1] - hh, at[0] + hw, at[1] + hh];
};

export const pointsBox = (ps: P[]): Box => [
  Math.min(...ps.map((p) => p[0])),
  Math.min(...ps.map((p) => p[1])),
  Math.max(...ps.map((p) => p[0])),
  Math.max(...ps.map((p) => p[1])),
];

/** The viewBox around every box, with a margin, widened (centered) to at least `minWidth`. */
export function frame(boxes: Box[], minWidth = 240, margin = 8): Box {
  const x0 = Math.min(...boxes.map((b) => b[0])) - margin;
  const y0 = Math.min(...boxes.map((b) => b[1])) - margin;
  const x1 = Math.max(...boxes.map((b) => b[2])) + margin;
  const y1 = Math.max(...boxes.map((b) => b[3])) + margin;
  const extra = Math.max(0, minWidth - (x1 - x0)) / 2;
  return [x0 - extra, y0, x1 + extra, y1];
}

export const viewBoxOf = (b: Box) => `${f(b[0])} ${f(b[1])} ${f(b[2] - b[0])} ${f(b[3] - b[1])}`;

/** Where a label goes beside the side from a to b: off its middle, on the side `away` points to. */
export function besideSide(a: P, b: P, away: P, text: string, gap = 6, size = 14): P {
  const d = unit(sub(b, a));
  const n: P = dot([-d[1], d[0]], away) >= 0 ? [-d[1], d[0]] : [d[1], -d[0]];
  const reach = halfWidth(text, size) * Math.abs(n[0]) + halfHeight(size) * Math.abs(n[1]);
  return add(mid(a, b), mul(n, gap + reach));
}

/** Where a label sits inside the angle at v between the unit rays u1 and u2: the spot nearest the
 *  corner that clears both rays, and clears an arc of radius `arc` drawn in the corner. */
export function inAngle(v: P, u1: P, u2: P, text: string, arc = 0, size = 14): P {
  const [hw, hh] = [halfWidth(text, size) + 2, halfHeight(size) + 2];
  const reach = (n: P) => hw * Math.abs(n[0]) + hh * Math.abs(n[1]);
  const total = Math.acos(clamp(dot(u1, u2), -1, 1));
  if (total < 1e-3 || total > Math.PI - 1e-3) return v;
  const w = unit(sub(u2, mul(u1, Math.cos(total))));
  let best = v;
  let bestD = Infinity;
  for (let i = 1; i < 24; i++) {
    const a = (total * i) / 24;
    const dir = add(mul(u1, Math.cos(a)), mul(w, Math.sin(a)));
    const d = Math.max(
      reach([-u1[1], u1[0]]) / Math.sin(a),
      reach([-u2[1], u2[0]]) / Math.sin(total - a),
      arc + 2 + reach(dir)
    );
    if (d < bestD) [best, bestD] = [add(v, mul(dir, d)), d];
  }
  return best;
}

/** The arc of radius r in the corner at v, from ray u1 to ray u2 the short way; closed into a
 *  wedge (a slice) when asked. */
export function arcPath(v: P, u1: P, u2: P, r: number, wedge = false): string {
  const [a, b] = [add(v, mul(u1, r)), add(v, mul(u2, r))];
  const sweep = u1[0] * u2[1] - u1[1] * u2[0] > 0 ? 1 : 0;
  const arc = `A${f(r)} ${f(r)} 0 0 ${sweep} ${f(b[0])} ${f(b[1])}`;
  return wedge
    ? `M${f(v[0])} ${f(v[1])} L${f(a[0])} ${f(a[1])} ${arc} Z`
    : `M${f(a[0])} ${f(a[1])} ${arc}`;
}

/** The small square that marks a right angle at v between the unit rays u1 and u2. */
export const squarePath = (v: P, u1: P, u2: P, m = 10) =>
  path([add(v, mul(u1, m)), add(add(v, mul(u1, m)), mul(u2, m)), add(v, mul(u2, m))], false);

/** A label, centered on its point. */
export function Label({ t }: { t: Text }) {
  return (
    <text
      x={f(t.at[0])}
      y={f(t.at[1] + (t.size ?? 14) * 0.36)}
      className={t.className}
      textAnchor="middle"
      data-pop
      data-at={t.step}
    >
      {t.text}
    </text>
  );
}
