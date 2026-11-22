"use client";

// The coordinate plane (PlaneFigure): lines, parabolas, exponential curves, polynomials from their
// zeros, circles, points, segments and shaded half-planes, drawn to scale in the window the lesson
// gives, one after another.
import { useId, type ReactElement } from "react";
import type { PlaneFigure, PlaneItem, Tone } from "@/lib/lessons/figures";
import s from "./figure.module.css";

const W = 240;
const H = 240;
const PAD = 14;

function niceStep(range: number): number {
  const raw = range / 8;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

const tone = (t: Tone | undefined, fallback: Tone) => s[t ?? fallback];

export function PlaneFig({ fig }: { fig: PlaneFigure }) {
  const clip = useId().replace(/:/g, "");
  const [x0, x1] = fig.x ?? [-10, 10];
  const [y0, y1] = fig.y ?? [-10, 10];
  const X = (x: number) => PAD + ((x - x0) / (x1 - x0)) * (W - 2 * PAD);
  const Y = (y: number) => H - PAD - ((y - y0) / (y1 - y0)) * (H - 2 * PAD);
  const lo = y0 - (y1 - y0);
  const hi = y1 + (y1 - y0);
  const clamp = (y: number) => Math.min(hi, Math.max(lo, y));
  const f2 = (n: number) => n.toFixed(2);

  /** A curve y = g(x) across the window, as a path. */
  const curve = (g: (x: number) => number) => {
    const n = 160;
    let d = "";
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = g(x);
      if (!Number.isFinite(y)) continue;
      d += `${d ? "L" : "M"}${f2(X(x))} ${f2(Y(clamp(y)))}`;
    }
    return d;
  };

  /** Where to put a curve's label: the last point from the right that is inside the window. */
  const labelAt = (g: (x: number) => number): [number, number] | null => {
    for (let i = 0; i <= 40; i++) {
      const x = x1 - (x1 - x0) * (0.08 + i * 0.02);
      const y = g(x);
      if (Number.isFinite(y) && y > y0 + (y1 - y0) * 0.08 && y < y1 - (y1 - y0) * 0.08)
        return [X(x), Y(y)];
    }
    return null;
  };

  const step = niceStep(Math.max(x1 - x0, y1 - y0));
  const xs: number[] = [];
  for (let v = Math.ceil(x0 / step) * step; v <= x1 + 1e-9; v += step) xs.push(+v.toFixed(6));
  const ys: number[] = [];
  for (let v = Math.ceil(y0 / step) * step; v <= y1 + 1e-9; v += step) ys.push(+v.toFixed(6));
  const ax = x0 <= 0 && x1 >= 0 ? X(0) : X(x0);
  const ay = y0 <= 0 && y1 >= 0 ? Y(0) : Y(y0);

  const notes: ReactElement[] = [];
  const items = fig.draw.map((item: PlaneItem, k) => {
    const at = k + 1;
    // labels sit outside the clipped plot, turned inward near the right edge, so none is cut off
    const label = (pos: [number, number] | null, text: string | undefined, t: string) => {
      if (!pos || !text) return null;
      const right = pos[0] > W * 0.55;
      notes.push(
        <text
          key={`n${k}`}
          x={f2(Math.min(W - 2, Math.max(2, pos[0] + (right ? -6 : 6))))}
          y={f2(Math.min(H - PAD - 4, Math.max(PAD + 10, pos[1] - 8)))}
          textAnchor={right ? "end" : "start"}
          className={`${s.toneText} ${t}`}
          data-pop
          data-at={at}
        >
          {text}
        </text>
      );
      return null;
    };

    if ("shade" in item) {
      const [m, b] = item.shade;
      const g = (x: number) => m * x + b;
      const edge = item.side === "above" ? hi : lo;
      const d = `${curve(g)} L${f2(X(x1))} ${f2(Y(edge))} L${f2(X(x0))} ${f2(Y(edge))}Z`;
      const t = tone(item.tone, "blue");
      return (
        <g key={k}>
          <path d={d} className={`${s.area} ${t}`} data-pop data-at={at} />
          <path
            d={curve(g)}
            className={`${s.line} ${t} ${item.strict ? s.dashed : ""}`}
            data-draw
            data-at={at}
          />
        </g>
      );
    }
    if ("line" in item) {
      const [m, b] = item.line;
      const g = (x: number) => m * x + b;
      const t = tone(item.tone, "warm");
      return (
        <g key={k}>
          <path
            d={curve(g)}
            className={`${s.line} ${t} ${item.dashed ? s.dashed : ""}`}
            data-draw
            data-at={at}
          />
          {label(labelAt(g), item.label, t)}
        </g>
      );
    }
    if ("vertical" in item) {
      const t = tone(item.tone, "warm");
      return (
        <g key={k}>
          <line
            x1={f2(X(item.vertical))}
            y1={f2(Y(y1))}
            x2={f2(X(item.vertical))}
            y2={f2(Y(y0))}
            className={`${s.line} ${t} ${item.dashed ? s.dashed : ""}`}
            data-draw
            data-at={at}
          />
          {label([X(item.vertical), Y(y1 - (y1 - y0) * 0.1)], item.label, t)}
        </g>
      );
    }
    if ("parabola" in item || "exp" in item || "poly" in item) {
      const g =
        "parabola" in item
          ? (x: number) => item.parabola[0] * (x - item.parabola[1]) ** 2 + item.parabola[2]
          : "exp" in item
            ? (x: number) => item.exp[0] * item.exp[1] ** x
            : (x: number) => item.poly.reduce((p, z) => p * (x - z), item.a ?? 1);
      const t = tone(item.tone, "warm");
      return (
        <g key={k}>
          <path d={curve(g)} className={`${s.line} ${t}`} data-draw data-at={at} />
          {label(labelAt(g), item.label, t)}
        </g>
      );
    }
    if ("circle" in item) {
      const [h, kk, r] = item.circle;
      const t = tone(item.tone, "warm");
      const rx = (r / (x1 - x0)) * (W - 2 * PAD);
      const ry = (r / (y1 - y0)) * (H - 2 * PAD);
      return (
        <g key={k}>
          <ellipse
            cx={f2(X(h))}
            cy={f2(Y(kk))}
            rx={f2(rx)}
            ry={f2(ry)}
            className={`${s.line} ${t}`}
            data-draw
            data-at={at}
          />
          {label([X(h) + rx * 0.7, Y(kk) - ry * 0.7], item.label, t)}
        </g>
      );
    }
    if ("segment" in item) {
      const [ax1, ay1, ax2, ay2] = item.segment;
      const t = tone(item.tone, "gold");
      return (
        <g key={k}>
          <line
            x1={f2(X(ax1))}
            y1={f2(Y(ay1))}
            x2={f2(X(ax2))}
            y2={f2(Y(ay2))}
            className={`${s.line} ${t} ${s.dashed}`}
            data-draw
            data-at={at}
          />
          {label([(X(ax1) + X(ax2)) / 2, (Y(ay1) + Y(ay2)) / 2], item.label, t)}
        </g>
      );
    }
    const [px, py] = item.point;
    const t = tone(item.tone, "gold");
    return (
      <g key={k}>
        <circle
          cx={f2(X(px))}
          cy={f2(Y(py))}
          r={5}
          className={`${s.dot} ${t}`}
          data-pop
          data-at={at}
        />
        {label([X(px), Y(py)], item.label, t)}
      </g>
    );
  });

  return (
    <svg
      className={s.fig}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="A graph on the coordinate plane"
    >
      <defs>
        <clipPath id={clip}>
          <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} />
        </clipPath>
      </defs>
      {xs.map((v) => (
        <line key={`x${v}`} x1={f2(X(v))} y1={PAD} x2={f2(X(v))} y2={H - PAD} className={s.faint} />
      ))}
      {ys.map((v) => (
        <line key={`y${v}`} x1={PAD} y1={f2(Y(v))} x2={W - PAD} y2={f2(Y(v))} className={s.faint} />
      ))}
      <line x1={PAD} y1={f2(ay)} x2={W - PAD} y2={f2(ay)} className={s.thin} />
      <line x1={f2(ax)} y1={PAD} x2={f2(ax)} y2={H - PAD} className={s.thin} />
      {xs
        .filter((v) => v !== 0 && Math.abs(v) % (step * 2) < 1e-9)
        .map((v) => (
          <text
            key={`tx${v}`}
            x={f2(X(v))}
            y={f2(Math.min(ay + 14, H - 2))}
            className={`${s.label} ${s.small}`}
            textAnchor="middle"
          >
            {v}
          </text>
        ))}
      {ys
        .filter((v) => v !== 0 && Math.abs(v) % (step * 2) < 1e-9)
        .map((v) => (
          <text
            key={`ty${v}`}
            x={f2(Math.max(ax - 5, 10))}
            y={f2(Y(v) + 4)}
            className={`${s.label} ${s.small}`}
            textAnchor="end"
          >
            {v}
          </text>
        ))}
      {fig.xLabel && (
        <text
          x={W - PAD}
          y={f2(Math.min(ay - 6, H - PAD - 4))}
          className={`${s.label} ${s.small}`}
          textAnchor="end"
        >
          {fig.xLabel}
        </text>
      )}
      {fig.yLabel && (
        <text x={f2(ax + 6)} y={PAD + 10} className={`${s.label} ${s.small}`}>
          {fig.yLabel}
        </text>
      )}
      <g clipPath={`url(#${clip})`}>{items}</g>
      {notes}
    </svg>
  );
}
