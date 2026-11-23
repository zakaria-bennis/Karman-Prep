"use client";

// Data pictures: bar, line, dot, box, histogram, scatter and table (DataFigure); a sample from a
// population (SampleFigure). The charts on a value axis are in DataCharts.tsx; the number-line charts,
// the table and the sample are here. Each is static markup: Figure.tsx draws it in (data-draw traces a
// line, data-pop grows a part in, in the order of data-at) and keeps it still for reduced motion.
import type { DataFigure, SampleFigure } from "@/lib/lessons/figures";
import {
  BarChart,
  CAT,
  Histogram,
  LineChart,
  Scatter,
  Svg,
  TICK,
  Txt,
  W0,
  draw,
  fitLabel,
  fitText,
  fmt,
  narrowest,
  niceAxis,
  pop,
  r2,
  say,
  sized,
  spread,
  stepOf,
  textW,
  tickText,
  toneOf,
  widthOf,
  type Axis,
  type Chart,
} from "./DataCharts";
import css from "./data.module.css";
import s from "./figure.module.css";

export function DataFig({ fig }: { fig: DataFigure }) {
  switch (fig.chart) {
    case "bar":
      return <BarChart fig={fig} />;
    case "line":
      return <LineChart fig={fig} />;
    case "dot":
      return <DotPlot fig={fig} />;
    case "box":
      return <BoxPlot fig={fig} />;
    case "histogram":
      return <Histogram fig={fig} />;
    case "scatter":
      return <Scatter fig={fig} />;
    case "table":
      return <DataTable fig={fig} />;
  }
}

/** A number line along an axis: the rule, a tick at each value, the numbers under it (thinned or
 *  shrunk so none touch). */
function NumberAxis(p: {
  ax: Axis;
  X: (v: number) => number;
  y: number;
  from: number;
  to: number;
}) {
  const texts = p.ax.ticks.map((v) => tickText(v, p.ax.step));
  const { size, keep } = spread(p.ax.ticks.map(p.X), texts);
  return (
    <g>
      <line x1={r2(p.from)} x2={r2(p.to)} y1={p.y} y2={p.y} className={s.thin} />
      {p.ax.ticks.map((v, i) => (
        <g key={v}>
          <line x1={r2(p.X(v))} x2={r2(p.X(v))} y1={p.y} y2={p.y + 4} className={s.thin} />
          {keep[i] && (
            <Txt x={p.X(v)} y={p.y + 17} lines={texts[i]} a="middle" c={sized(TICK, size)} />
          )}
        </g>
      ))}
    </g>
  );
}

/** "5", or "≈ 4.44" when two places round it. */
const near = (v: number) => (Math.abs(v - +v.toFixed(2)) > 1e-9 ? "≈ " : "") + fmt(v);

/** Where two marker names start: centered under their markers, pushed apart when they would touch,
 *  each kept inside the picture. */
function placeNames(items: { x: number; w: number }[]): number[] {
  const iv = items.map(({ x, w }) => [x - w / 2, x + w / 2]);
  if (iv.length === 2) {
    const [a, b] = iv[0][0] <= iv[1][0] ? [0, 1] : [1, 0];
    if (iv[a][1] + 8 > iv[b][0]) {
      const mid = (items[a].x + items[b].x) / 2;
      const end = Math.min(iv[a][1], mid - 5);
      iv[a] = [end - items[a].w, end];
      const start = Math.max(iv[b][0], mid + 5);
      iv[b] = [start, start + items[b].w];
    }
  }
  return iv.map(([start], i) => Math.min(Math.max(start, 2), W0 - 2 - items[i].w));
}

/** A dot plot: a stacked column of dots over each value; the mean and median marked under the line. */
function DotPlot({ fig }: { fig: Chart<"dot"> }) {
  const vals = fig.values.filter(Number.isFinite).sort((p, q) => p - q);
  const ax = niceAxis(Math.min(...vals), Math.max(...vals), 8, {
    whole: vals.every((v) => Number.isInteger(v)),
  });
  const [lo, hi] = [ax.lo - ax.step / 2, ax.hi + ax.step / 2];
  const X = (v: number) => 12 + ((v - lo) / (hi - lo)) * (W0 - 24);
  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  const cols = [...counts].sort((p, q) => p[0] - q[0]);
  const gap = Math.min(Infinity, ...cols.slice(1).map(([v], i) => X(v) - X(cols[i][0])));
  const most = Math.max(1, ...cols.map((c) => c[1]));
  const r = Math.max(2.5, Math.min(6, (gap - 2) / 2, (150 / most - 1.5) / 2));
  const pitch = 2 * r + 1.5;
  const A = 10 + most * pitch;

  const h = vals.length >> 1;
  const mean = vals.reduce((t, v) => t + v, 0) / vals.length;
  const median = vals.length % 2 ? vals[h] : (vals[h - 1] + vals[h]) / 2;
  const marks = vals.length
    ? [
        ...(fig.showMean ? [{ text: `mean ${near(mean)}`, v: mean, tone: s.blue }] : []),
        ...(fig.showMedian ? [{ text: `median ${near(median)}`, v: median, tone: s.gold }] : []),
      ]
    : [];
  const xs = marks.map((m) => Math.min(Math.max(X(m.v), 8), W0 - 8));
  const starts = placeNames(marks.map((m, i) => ({ x: xs[i], w: textW(m.text, 12) })));
  const steps = Math.min(cols.length, 8);
  const label =
    `Dot plot of ${vals.length} values: ${cols.map(([v, c]) => `${fmt(v)} ${c} time${c > 1 ? "s" : ""}`).join(", ")}` +
    marks.map((m) => `; ${m.text}`).join("");

  return (
    <Svg w={W0} h={A + (marks.length ? 52 : 24)} label={label}>
      {cols.map(([v, c], j) =>
        Array.from({ length: c }, (_, m) => (
          <circle
            key={`${v}-${m}`}
            cx={r2(X(v))}
            cy={r2(A - 3 - r - m * pitch)}
            r={r2(r)}
            className={`${s.dot} ${s.warm}`}
            {...pop(1 + stepOf(j, cols.length))}
          />
        ))
      )}
      <NumberAxis ax={ax} X={X} y={A} from={X(lo)} to={X(hi)} />
      {marks.map((m, i) => (
        <g key={m.text} className={m.tone}>
          <path
            d={`M${r2(xs[i])} ${A + 24}L${r2(xs[i] + 6)} ${A + 33}L${r2(xs[i] - 6)} ${A + 33}Z`}
            className={css.marker}
            {...pop(1 + steps + i)}
          />
          <Txt x={starts[i]} y={A + 47} lines={m.text} c={CAT} at={1 + steps + i} />
        </g>
      ))}
    </Svg>
  );
}

type Five = [number, number, number, number, number];

/** A box plot on a number line, whiskers to the min and max; a second box below to compare. */
function BoxPlot({ fig }: { fig: Chart<"box"> }) {
  const boxes = (fig.second ? [fig.five, fig.second] : [fig.five]) as Five[];
  const all = boxes.flat().filter(Number.isFinite);
  const ax = niceAxis(Math.min(...all), Math.max(...all), 6);
  const names = boxes.map((_, i) => fig.names?.[i] ?? "");
  const nameLines = names.map((t) => (t ? (fitLabel(t, 76, 13) ?? narrowest(t, 13)) : []));
  const nameW = names.some(Boolean)
    ? Math.min(84, Math.max(...nameLines.map((l) => widthOf(l, 13)))) + 10
    : 0;
  const end = (v: number) => textW(tickText(v, ax.step), 12) / 2 + 4;
  const L = Math.max(nameW + 6, end(ax.lo), 12);
  const R = Math.max(12, end(ax.hi));
  const X = (v: number) => L + ((v - ax.lo) / (ax.hi - ax.lo)) * (W0 - L - R);
  const [BH, GAP, top] = [24, 22, 10];
  const cy = (i: number) => top + BH / 2 + i * (BH + GAP);
  const A = cy(boxes.length - 1) + BH / 2 + 16;
  const words = ["min", "first quartile", "median", "third quartile", "max"];
  const label =
    "Box plot. " +
    boxes
      .map(
        (b, i) =>
          `${names[i] || (i ? "Second" : "First")}: ${b.map((v, k) => `${words[k]} ${say(v)}`).join(", ")}`
      )
      .join(". ");

  return (
    <Svg w={W0} h={A + 24} label={label}>
      {ax.ticks.map((v) => (
        <line key={v} x1={r2(X(v))} x2={r2(X(v))} y1={top - 4} y2={A} className={s.faint} />
      ))}
      {boxes.map((b, i) => {
        const [mn, q1, md, q3, mx] = b.map(X);
        const y = cy(i);
        const lines = nameLines[i];
        return (
          <g key={i} className={toneOf(i)}>
            {lines.length > 0 && (
              <Txt
                x={2}
                y={y + 4.5 - ((lines.length - 1) * 14) / 2}
                lines={lines}
                lh={14}
                c={`${s.label} ${css.name}`}
              />
            )}
            <path
              d={`M${r2(mn)} ${y}H${r2(q1)}M${r2(q3)} ${y}H${r2(mx)}M${r2(mn)} ${y - 7}V${y + 7}M${r2(mx)} ${y - 7}V${y + 7}`}
              className={css.whisker}
              {...draw(1 + 2 * i)}
            />
            <rect
              x={r2(q1)}
              y={y - BH / 2}
              width={r2(Math.max(0, q3 - q1))}
              height={BH}
              rx={4}
              className={css.box}
              {...pop(1 + 2 * i)}
            />
            <line
              x1={r2(md)}
              x2={r2(md)}
              y1={y - BH / 2}
              y2={y + BH / 2}
              className={css.median}
              {...draw(2 + 2 * i)}
            />
          </g>
        );
      })}
      <NumberAxis ax={ax} X={X} y={A} from={X(ax.lo) - 4} to={X(ax.hi) + 4} />
    </Svg>
  );
}

const NUM = /^[−+-]?[$€£¥]?\s?[−+-]?\d[\d,]*(\.\d+)?\s?%?$/;
const list = (xs: string[]) =>
  xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/** A table on soft glass; highlighted cells ([row, column], counting from 0 under the head) take a
 *  warm tint that pops in after the table. */
function DataTable({ fig }: { fig: Chart<"table"> }) {
  const lit = new Map((fig.highlight ?? []).map(([r, c], k) => [`${r},${c}`, k]));
  const num = fig.head.map(
    (_, c) =>
      fig.rows.some((row) => NUM.test((row[c] ?? "").trim())) &&
      fig.rows.every((row) => !(row[c] ?? "").trim() || NUM.test((row[c] ?? "").trim()))
  );
  return (
    <div className={css.tableWrap}>
      <table className={css.table}>
        <caption className={css.srOnly}>{`A table of ${list(fig.head)}`}</caption>
        <thead>
          <tr>
            {fig.head.map((h, c) => (
              <th key={c} scope="col" className={num[c] ? css.num : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fig.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => {
                const k = lit.get(`${r},${c}`);
                return (
                  <td key={c} className={num[c] ? css.num : undefined}>
                    {k === undefined ? (
                      cell
                    ) : (
                      <>
                        <span className={css.tint} aria-hidden {...pop(1 + Math.min(k, 7))} />
                        <mark>{cell}</mark>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- the sample

/** A small seeded random generator (mulberry32): the same field on every render. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIELD = { x: 6, y: 6, w: 228, h: 132 };
const IN = { x: FIELD.x + 13, y: FIELD.y + 13, w: FIELD.w - 26, h: FIELD.h - 26 };
const rnd = seeded(20261122);

/** The population: 64 members spread over the field without clumps (the best of 12 tries each). */
const MEMBERS: [number, number][] = [];
while (MEMBERS.length < 64) {
  let best: [number, number] = [0, 0];
  let far = -1;
  for (let k = 0; k < 12; k++) {
    const c: [number, number] = [r2(IN.x + rnd() * IN.w), r2(IN.y + rnd() * IN.h)];
    const d = Math.min(Infinity, ...MEMBERS.map(([x, y]) => Math.hypot(x - c[0], y - c[1])));
    if (d > far) [far, best] = [d, c];
  }
  MEMBERS.push(best);
}

/** A random sample: one member from each of 12 cells (4 across, 3 down), so it spreads over all of it. */
const SPREAD: number[] = [];
for (let row = 0; row < 3; row++)
  for (let col = 0; col < 4; col++) {
    const [x0, y0] = [IN.x + (col * IN.w) / 4, IN.y + (row * IN.h) / 3];
    const inCell = MEMBERS.map((_, i) => i).filter((i) => {
      const [x, y] = MEMBERS[i];
      return x >= x0 && x < x0 + IN.w / 4 && y >= y0 && y < y0 + IN.h / 3;
    });
    const near = MEMBERS.map((_, i) => i)
      .filter((i) => !SPREAD.includes(i))
      .sort(
        (a, b) =>
          Math.hypot(MEMBERS[a][0] - x0 - IN.w / 8, MEMBERS[a][1] - y0 - IN.h / 6) -
          Math.hypot(MEMBERS[b][0] - x0 - IN.w / 8, MEMBERS[b][1] - y0 - IN.h / 6)
      );
    SPREAD.push(inCell.length ? inCell[Math.floor(rnd() * inCell.length)] : near[0]);
  }
SPREAD.sort(() => rnd() - 0.5);

/** A sample that is not random: the 12 members nearest one corner, nearest first. */
const CORNER = MEMBERS.map((_, i) => i)
  .sort(
    (a, b) =>
      Math.hypot(MEMBERS[a][0] - FIELD.x, MEMBERS[a][1] - FIELD.y) -
      Math.hypot(MEMBERS[b][0] - FIELD.x, MEMBERS[b][1] - FIELD.y)
  )
  .slice(0, 12);

/** "62%" as 62 with nothing before and "%" after; "$4.50" as 4.5 after "$". Null when it is not a
 *  plain number. */
export function parseAmount(text: string) {
  const m = /^\s*([$€£¥]?)\s*([−+-]?)\s*(\d[\d,]*(?:\.\d+)?|\.\d+)\s*(%|[a-zA-Z ]{0,12})\s*$/.exec(
    text
  );
  if (!m) return null;
  const digits = m[3].replace(/,/g, "");
  const v = Number(digits) * (m[2] === "-" || m[2] === "−" ? -1 : 1);
  return Number.isFinite(v)
    ? { v, pre: m[1], post: m[4].trimEnd(), dec: (digits.split(".")[1] ?? "").length }
    : null;
}

/** The size of a margin ("±3%" as 3), or null. */
export function parseMargin(text: string) {
  const m = /(\d[\d,]*(?:\.\d+)?|\.\d+)/.exec(text);
  const v = m ? Number(m[1].replace(/,/g, "")) : Number.NaN;
  return Number.isFinite(v) && v > 0 ? { v, dec: (m![1].split(".")[1] ?? "").length } : null;
}

/** A population as a field of dots, with 12 of them lit as the sample: spread over all of it when it
 *  is random, bunched in one corner when it is not. Under it, the estimate as a range. */
export function SampleFig({ fig }: { fig: SampleFigure }) {
  const lit = fig.random ? SPREAD : CORNER;
  const below = FIELD.y + FIELD.h;
  const name = fig.label ? fitText(fig.label, W0 - 8) : null;
  let y = below + (name ? 20 + (name.lines.length - 1) * 14 : 0);
  const est = fig.estimate ? parseAmount(fig.estimate) : null;
  const margin = fig.margin ? parseMargin(fig.margin) : null;
  const ranged = est && margin;
  const T = y + (ranged ? 40 : 30);
  const H = fig.estimate ? T + (ranged ? 26 : 8) : y + 10;
  y = T;

  const span = ranged ? 2.4 * margin.v : 1;
  const X = (v: number) => 20 + ((v - (est?.v ?? 0) + span) / (2 * span)) * (W0 - 40);
  const dec = ranged ? Math.max(est.dec, margin.dec) : 0;
  const show = (v: number) => `${est?.pre ?? ""}${fmt(v, dec, { fixed: true })}${est?.post ?? ""}`;
  const [a, b] = ranged ? [est.v - margin.v, est.v + margin.v] : [0, 0];
  const after = 1 + Math.ceil(lit.length / 2);
  const label =
    `A population of 64 dots; ${fig.random ? "a random sample of 12 is spread across all of it" : "a sample of 12 that is not random is bunched in one corner"}` +
    (fig.label ? `. ${fig.label}` : "") +
    (fig.estimate ? `. Estimate ${fig.estimate}${fig.margin ? ` ${fig.margin}` : ""}` : "") +
    (ranged ? `, from ${show(a)} to ${show(b)}` : "");

  return (
    <Svg w={W0} h={H} label={label}>
      <rect
        x={FIELD.x}
        y={FIELD.y}
        width={FIELD.w}
        height={FIELD.h}
        rx={16}
        className={s.soft}
        {...draw(0)}
      />
      {MEMBERS.map(([mx, my], i) => (
        <circle key={i} cx={mx} cy={my} r={3.4} className={css.member} />
      ))}
      {lit.map((i, k) => (
        <circle
          key={i}
          cx={MEMBERS[i][0]}
          cy={MEMBERS[i][1]}
          r={5}
          className={`${s.dot} ${s.warm}`}
          data-sample=""
          {...pop(1 + (k >> 1))}
        />
      ))}
      {name && (
        <Txt
          x={W0 / 2}
          y={below + 20}
          lines={name.lines}
          lh={14}
          a="middle"
          c={sized(CAT, name.size)}
        />
      )}
      {fig.estimate && !ranged && (
        <text
          x={W0 / 2}
          y={y}
          textAnchor="middle"
          className={`${s.label} ${css.estimate}`}
          {...pop(after)}
        >
          {[fig.estimate, fig.margin].filter(Boolean).join(" ")}
        </text>
      )}
      {ranged && (
        <g className={s.warm}>
          <line x1={20} x2={W0 - 20} y1={y} y2={y} className={css.track} />
          <line
            x1={r2(X(est.v))}
            x2={r2(X(a))}
            y1={y}
            y2={y}
            className={css.range}
            {...draw(after)}
          />
          <line
            x1={r2(X(est.v))}
            x2={r2(X(b))}
            y1={y}
            y2={y}
            className={css.range}
            {...draw(after)}
          />
          {[a, b].map((v) => (
            <g key={v} {...pop(after + 1)}>
              <line x1={r2(X(v))} x2={r2(X(v))} y1={y - 8} y2={y + 8} className={css.end} />
              <text x={r2(X(v))} y={y + 22} textAnchor="middle" className={TICK}>
                {show(v)}
              </text>
            </g>
          ))}
          <circle cx={r2(X(est.v))} cy={y} r={5.5} className={s.dot} {...pop(after + 1)} />
          <text
            x={r2(X(est.v))}
            y={y - 14}
            textAnchor="middle"
            className={s.label}
            {...pop(after + 1)}
          >
            <tspan className={css.estimate}>{fig.estimate}</tspan>{" "}
            <tspan className={TICK}>{fig.margin}</tspan>
          </text>
        </g>
      )}
    </Svg>
  );
}
