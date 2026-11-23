"use client";

// A circle with a central angle (CircleFigure): the slice lit as a sector, its curved edge as an arc,
// an inscribed angle opening on the same arc, or the unit circle with its point. Drawn to scale.
import type { CircleFigure } from "@/lib/lessons/figures";
import s from "./figure.module.css";

const R = 74;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** A point on the circle, the angle measured clockwise from the top. */
const onTop = (deg: number, r = R): [number, number] => [
  r * Math.sin(rad(deg)),
  -r * Math.cos(rad(deg)),
];

/** A point on the circle, the angle measured counterclockwise from the right (the unit circle). */
const onRight = (deg: number, r = R): [number, number] => [
  r * Math.cos(rad(deg)),
  -r * Math.sin(rad(deg)),
];

const f = (n: number) => n.toFixed(2);

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

/** 72 degrees as "2π/5". */
export function radiansLabel(deg: number): string {
  const top = Math.round(deg);
  const g = gcd(top, 180);
  const [p, q] = [top / g, 180 / g];
  const num = p === 1 ? "π" : `${p}π`;
  return q === 1 ? num : `${num}/${q}`;
}

export function CircleFig({ fig }: { fig: CircleFigure }) {
  const deg = Math.min(Math.max(fig.angle, 1), 359);
  const big = deg > 180 ? 1 : 0;
  const angleText = fig.radians ? radiansLabel(deg) : `${+deg.toFixed(1)}°`;

  if (fig.show === "unit") {
    const [px, py] = onRight(deg);
    const sweepEnd = onRight(deg, 26);
    return (
      <svg
        className={s.fig}
        viewBox="-110 -110 220 220"
        role="img"
        aria-label={`Unit circle with an angle of ${angleText}`}
      >
        <line x1={-100} y1={0} x2={100} y2={0} className={s.thin} />
        <line x1={0} y1={-100} x2={0} y2={100} className={s.thin} />
        <circle r={R} className={s.soft} data-draw data-at={0} />
        <path
          d={`M26 0 A26 26 0 ${big} 0 ${f(sweepEnd[0])} ${f(sweepEnd[1])}`}
          className={`${s.line} ${s.warm}`}
          data-draw
          data-at={1}
        />
        <line
          x1={0}
          y1={0}
          x2={f(px)}
          y2={f(py)}
          className={`${s.line} ${s.gold}`}
          data-draw
          data-at={1}
        />
        <line
          x1={f(px)}
          y1={f(py)}
          x2={f(px)}
          y2={0}
          className={`${s.thin} ${s.dashed}`}
          data-pop
          data-at={2}
        />
        <circle cx={f(px)} cy={f(py)} r={5} className={`${s.dot} ${s.gold}`} data-pop data-at={2} />
        <text
          x={f(onRight(deg / 2, 40)[0])}
          y={f(onRight(deg / 2, 40)[1] + 5)}
          className={`${s.toneText} ${s.warm}`}
          textAnchor="middle"
          data-pop
          data-at={3}
        >
          {angleText}
        </text>
        <text x={R + 6} y={-6} className={`${s.label} ${s.small}`} data-pop data-at={3}>
          1
        </text>
      </svg>
    );
  }

  const [ex, ey] = onTop(deg);
  const sector = `M0 0 L0 ${-R} A${R} ${R} 0 ${big} 1 ${f(ex)} ${f(ey)}Z`;
  const arc = `M0 ${-R} A${R} ${R} 0 ${big} 1 ${f(ex)} ${f(ey)}`;
  const [lx, ly] = onTop(deg / 2, 30);
  const [rx, ry] = onTop(-30, R / 2 + 8);

  if (fig.show === "inscribed") {
    // C sits on the larger arc, opposite the middle of the lit arc
    const [cx, cy] = onTop(deg / 2 + 180);
    const [ix, iy] = [cx + (0 - cx) * 0.3, cy + (-R / 2 - cy) * 0.3];
    return (
      <svg
        className={s.fig}
        viewBox="-110 -110 220 220"
        role="img"
        aria-label={`Central angle ${angleText} and the inscribed angle on the same arc`}
      >
        <circle r={R} className={s.soft} data-draw data-at={0} />
        <path d={arc} className={`${s.line} ${s.gold}`} data-draw data-at={1} />
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={-R}
          className={`${s.line} ${s.warm}`}
          data-draw
          data-at={2}
        />
        <line
          x1={0}
          y1={0}
          x2={f(ex)}
          y2={f(ey)}
          className={`${s.line} ${s.warm}`}
          data-draw
          data-at={2}
        />
        <line
          x1={f(cx)}
          y1={f(cy)}
          x2={0}
          y2={-R}
          className={`${s.line} ${s.blue}`}
          data-draw
          data-at={3}
        />
        <line
          x1={f(cx)}
          y1={f(cy)}
          x2={f(ex)}
          y2={f(ey)}
          className={`${s.line} ${s.blue}`}
          data-draw
          data-at={3}
        />
        <circle r={3} className={s.dot} data-pop data-at={2} />
        <circle
          cx={f(cx)}
          cy={f(cy)}
          r={4.5}
          className={`${s.dot} ${s.blue}`}
          data-pop
          data-at={3}
        />
        <text
          x={f(lx)}
          y={f(ly + 4)}
          className={`${s.toneText} ${s.warm}`}
          textAnchor="middle"
          data-pop
          data-at={4}
        >
          {angleText}
        </text>
        <text
          x={f(ix)}
          y={f(iy + 4)}
          className={`${s.toneText} ${s.blue}`}
          textAnchor="middle"
          data-pop
          data-at={4}
        >
          {fig.radians ? radiansLabel(deg / 2) : `${+(deg / 2).toFixed(1)}°`}
        </text>
      </svg>
    );
  }

  const lit = fig.show === "sector";
  return (
    <svg
      className={s.fig}
      viewBox="-110 -110 220 220"
      role="img"
      aria-label={`A circle with a ${lit ? "sector" : "arc"} of ${angleText}`}
    >
      <circle r={R} className={s.soft} data-draw data-at={0} />
      {lit && <path d={sector} className={`${s.area} ${s.warm}`} data-pop data-at={2} />}
      <path
        d={arc}
        className={`${s.line} ${s.gold}`}
        style={{ strokeWidth: lit ? 4 : 5.5 }}
        data-draw
        data-at={1}
      />
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-R}
        className={s.thin}
        style={{ strokeOpacity: 0.85 }}
        data-draw
        data-at={1}
      />
      <line
        x1={0}
        y1={0}
        x2={f(ex)}
        y2={f(ey)}
        className={s.thin}
        style={{ strokeOpacity: 0.85 }}
        data-draw
        data-at={1}
      />
      <circle r={3} className={s.dot} data-pop data-at={1} />
      {fig.r && (
        <text x={f(rx)} y={f(ry)} className={s.label} textAnchor="middle" data-pop data-at={3}>
          {fig.r}
        </text>
      )}
      <text
        x={f(lx)}
        y={f(ly + 4)}
        className={`${s.toneText} ${s.warm}`}
        textAnchor="middle"
        data-pop
        data-at={3}
      >
        {angleText}
      </text>
    </svg>
  );
}
