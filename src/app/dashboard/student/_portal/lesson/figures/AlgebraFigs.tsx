"use client";

// Algebra pictures (src/lib/lessons/figures.ts): an equation as a level balance, the number line, tape
// bars, the area model and the function machine, each drawn from the lesson's own numbers. Lines
// trace in (data-draw, SVG only) and pieces pop in (data-pop) in the order of data-at; useDrawIn runs
// that for Figure.tsx and leaves everything still for reduced motion. Rich fields go through
// LessonText; the rest is plain text, as the contract says.
import { Fragment } from "react";
import type {
  BalanceFigure,
  GridFigure,
  MachineFigure,
  NumberLineFigure,
  TapeFigure,
  Tone,
} from "@/lib/lessons/figures";
import { LessonText, plainOf } from "../LessonText";
import a from "./algebra.module.css";
import s from "./figure.module.css";

const tone = (t: Tone | undefined, fallback: Tone) => s[t ?? fallback];
const f2 = (n: number) => n.toFixed(2);

/** A number as a figure writes it: a true minus sign, and no float noise (0.30000000000000004). */
export function numberText(n: number): string {
  const v = +n.toFixed(6);
  return v < 0 ? `−${-v}` : `${v}`;
}

/** A value typed as text ("-3"), with a true minus sign when it is a plain negative number. */
const valueText = (t: string) => t.replace(/^-(?=[\d.])/, "−");

// ---------------------------------------------------------------- the balance

// The drawing is 240 by 120: the beam at y 16 holds the pans at x 50 and 190 on its strings, their
// rims at y 78; the post stands at x 120. The two sides are HTML, laid on the rims (algebra.module.css).
const BAL_W = 240;
const BAL_H = 120;
const BEAM_Y = 16;
const RIM_Y = 78;

/** A shallow pan hanging under x = cx: its rim, then its rounded belly. */
function pan(cx: number): string {
  const [l, r, y] = [cx - 38, cx + 38, RIM_Y];
  return `M${l} ${y}H${r}C${r - 4} ${y + 8} ${cx + 18} ${y + 11} ${cx} ${y + 11}C${cx - 18} ${y + 11} ${l + 4} ${y + 8} ${l} ${y}Z`;
}

export function BalanceFig({ fig }: { fig: BalanceFigure }) {
  const steps = fig.steps ?? [];
  const said = [
    `A level balance: ${plainOf(fig.left)} = ${plainOf(fig.right)}.`,
    ...steps.map((st) => `${plainOf(st.move)}: ${plainOf(st.left)} = ${plainOf(st.right)}.`),
  ].join(" ");
  return (
    <div className={`${s.fig} ${a.balance}`} role="img" aria-label={said}>
      <div className={a.scale}>
        <svg className={a.scaleArt} viewBox={`0 0 ${BAL_W} ${BAL_H}`} aria-hidden="true">
          <path d="M98 116C101 106 139 106 142 116Z" className={s.soft} data-pop data-at={0} />
          <line x1={120} y1={BEAM_Y} x2={120} y2={110} className={s.thin} data-draw data-at={0} />
          <path
            d={`M50 ${BEAM_Y}L12 ${RIM_Y}M50 ${BEAM_Y}L88 ${RIM_Y}M190 ${BEAM_Y}L152 ${RIM_Y}M190 ${BEAM_Y}L228 ${RIM_Y}`}
            className={s.thin}
            data-draw
            data-at={1}
          />
          <line
            x1={42}
            y1={BEAM_Y}
            x2={198}
            y2={BEAM_Y}
            className={`${s.line} ${s.warm}`}
            data-draw
            data-at={1}
          />
          <circle
            cx={120}
            cy={BEAM_Y}
            r={4.5}
            className={`${s.dot} ${s.gold}`}
            data-pop
            data-at={1}
          />
          <path d={pan(50)} className={s.soft} data-pop data-at={2} />
          <path d={pan(190)} className={s.soft} data-pop data-at={2} />
        </svg>
        <div className={a.sides} style={{ bottom: `${((BAL_H - RIM_Y) / BAL_H) * 100}%` }}>
          <span className={a.weight} data-pop data-at={3}>
            <LessonText text={fig.left} />
          </span>
          <span className={a.equals} data-pop data-at={3}>
            =
          </span>
          <span className={a.weight} data-pop data-at={3}>
            <LessonText text={fig.right} />
          </span>
        </div>
      </div>
      {steps.length > 0 && (
        <ol className={a.steps}>
          {steps.map((st, k) => (
            <li key={k} className={a.step} data-pop data-at={4 + k}>
              <span className={a.move}>
                <LessonText text={st.move} />
              </span>
              <span className={a.lhs}>
                <LessonText text={st.left} />
              </span>
              <span className={a.eq}>=</span>
              <span className={a.rhs}>
                <LessonText text={st.right} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the number line

// 280 wide, so a 14 px number is 12 px on a 240 px phone and 15 px at 300 px.
const NL_W = 280;
/** The line runs from here to NL_W - NL_END, arrowheads and all. */
const NL_END = 10;
/** `from` and `to` sit this far in, so the line goes on past them. */
const NL_IN = 30;
/** About how wide one character of a tick's number is. */
const DIGIT = 7.6;

/** A number line's ticks: the step (1, 2 or 5 times a power of ten) that gives closest to 11 ticks,
 *  never fewer than 8 or more than 13 when one can. */
export function ticksFor(from: number, to: number): { step: number; ticks: number[] } {
  let step = 1;
  let best = Infinity;
  for (let e = -4; e <= 7; e++) {
    for (const m of [1, 2, 5]) {
      const st = m * 10 ** e;
      const n = Math.floor(to / st + 1e-9) - Math.ceil(from / st - 1e-9) + 1;
      const err = n < 8 ? 8.5 - n : n > 13 ? n - 12.5 : Math.abs(n - 11) / 10;
      if (err < best) [step, best] = [st, err];
    }
  }
  const ticks: number[] = [];
  for (let k = Math.ceil(from / step - 1e-9); k * step <= to + 1e-9; k++) {
    ticks.push(+(k * step).toFixed(6));
  }
  return { step, ticks };
}

/** An end of a ray or a stretch: hollow when the point is left out, filled when it is in. */
function endDot(x: number, y: number, open: boolean | undefined, t: string, at: number) {
  return (
    <circle
      cx={f2(x)}
      cy={y}
      r={5.5}
      className={`${open ? s.hollow : s.dot} ${t}`}
      data-pop
      data-at={at}
    />
  );
}

export function NumberLineFig({ fig }: { fig: NumberLineFigure }) {
  const from = fig.from;
  const to = fig.to > fig.from ? fig.to : fig.from + 1;
  const X = (v: number) =>
    NL_IN + ((Math.min(to, Math.max(from, v)) - from) / (to - from)) * (NL_W - 2 * NL_IN);
  const points = (fig.points ?? []).filter((p) => p.at >= from - 1e-9 && p.at <= to + 1e-9);
  const y = points.some((p) => p.label) ? 34 : 16;
  const [L, R] = [NL_END, NL_W - NL_END];

  // numbers on every tick when they fit, else on every 2nd, 5th, 10th...
  const { step, ticks } = ticksFor(from, to);
  const gap = (step / (to - from)) * (NL_W - 2 * NL_IN);
  const widest = Math.max(0, ...ticks.map((v) => numberText(v).length)) * DIGIT;
  let every = 1;
  while (widest + 4 > gap * every) every = every === 1 ? 2 : every === 2 ? 5 : every * 2;

  const ray = fig.ray;
  const rayTone = tone(ray?.tone, "warm");
  const rayEnd = ray?.dir === "left" ? L : R;
  const rayHead = ray?.dir === "left" ? 9 : -9;
  const span = fig.span;
  const spanTone = tone(span?.tone, "warm");

  const said = [
    `A number line from ${numberText(from)} to ${numberText(to)}`,
    ...points.map(
      (p) =>
        `${p.open ? "an open" : "a closed"} point at ${numberText(p.at)}${p.label ? ` (${p.label})` : ""}`
    ),
    ray &&
      `a ray from ${numberText(ray.from)} going ${ray.dir}, ${ray.open ? "open" : "closed"} at ${numberText(ray.from)}`,
    span &&
      `a stretch from ${numberText(span.from)} (${span.openFrom ? "open" : "closed"}) to ${numberText(span.to)} (${span.openTo ? "open" : "closed"})`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <svg className={s.fig} viewBox={`0 0 ${NL_W} ${y + 30}`} role="img" aria-label={`${said}.`}>
      <path
        d={`M${L} ${y}H${R}M${L + 7} ${y - 5}L${L} ${y}L${L + 7} ${y + 5}M${R - 7} ${y - 5}L${R} ${y}L${R - 7} ${y + 5}`}
        className={a.axis}
        data-draw
        data-at={0}
      />
      {ticks.map((v) => {
        const x = f2(X(v));
        const big = Math.round(v / step) % every === 0;
        return (
          <Fragment key={v}>
            <line
              x1={x}
              y1={y - (big ? 6 : 4)}
              x2={x}
              y2={y + (big ? 6 : 4)}
              className={a.tick}
              data-draw
              data-at={0}
            />
            {big && (
              <text
                x={x}
                y={y + 23}
                textAnchor="middle"
                className={`${s.label} ${a.num}`}
                data-pop
                data-at={0}
              >
                {numberText(v)}
              </text>
            )}
          </Fragment>
        );
      })}
      {ray && (
        <g>
          <path
            d={`M${f2(X(ray.from))} ${y}H${rayEnd}M${rayEnd + rayHead} ${y - 6.5}L${rayEnd} ${y}L${rayEnd + rayHead} ${y + 6.5}`}
            className={`${a.ray} ${rayTone}`}
            data-draw
            data-at={1}
          />
          {endDot(X(ray.from), y, ray.open, rayTone, 2)}
        </g>
      )}
      {span && (
        <g>
          <path
            d={`M${f2(X(span.from))} ${y}H${f2(X(span.to))}`}
            className={`${a.ray} ${spanTone}`}
            data-draw
            data-at={1}
          />
          {endDot(X(span.from), y, span.openFrom, spanTone, 2)}
          {endDot(X(span.to), y, span.openTo, spanTone, 2)}
        </g>
      )}
      {points.map((p, k) => {
        const t = tone(p.tone, "gold");
        return (
          <g key={k}>
            {endDot(X(p.at), y, p.open, t, 2)}
            {p.label && (
              <text
                x={f2(X(p.at))}
                y={y - 13}
                textAnchor="middle"
                className={`${s.toneText} ${t}`}
                data-pop
                data-at={3}
              >
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- tape bars

/** Each bar's own color unless a part names one. */
const BAR_TONES: Tone[] = ["warm", "blue", "gold", "green"];

export function TapeFig({ fig }: { fig: TapeFigure }) {
  // one unit width for every bar: the track is the largest bar's total, so bars compare honestly
  const totals = fig.bars.map((b) => b.parts.reduce((t, p) => t + Math.max(p.n, 0), 0));
  const unit = Math.max(0, ...totals) || 1;
  // parts pop in one by one; a long tape pops in bar by bar instead
  const count = fig.bars.reduce((t, b) => t + b.parts.length, 0);
  const oneByOne = count <= 14;
  const starts: number[] = [];
  let next = 0;
  for (const bar of fig.bars) {
    starts.push(next);
    next += oneByOne ? Math.max(bar.parts.length, 1) : 1;
  }
  const said = [
    "Tape diagram.",
    ...fig.bars.map(
      (b, i) =>
        `${b.label}: ${b.parts.map((p) => p.label || numberText(p.n)).join(", ")} (total ${numberText(totals[i])}).`
    ),
    fig.note ?? "",
  ].join(" ");

  return (
    <div className={`${s.fig} ${a.tape}`} role="img" aria-label={said.trim()}>
      <div className={a.bars}>
        {fig.bars.map((bar, b) => (
          <Fragment key={b}>
            <span className={a.barName} data-pop data-at={starts[b]}>
              {bar.label}
            </span>
            <div className={a.track}>
              {bar.parts.map((p, k) => (
                <span
                  key={k}
                  className={a.slot}
                  style={{ width: `${(Math.max(p.n, 0) / unit) * 100}%` }}
                >
                  <span
                    className={`${a.part} ${tone(p.tone, BAR_TONES[b % BAR_TONES.length])}`}
                    data-pop
                    data-at={oneByOne ? starts[b] + k : starts[b]}
                  >
                    {p.label ?? numberText(p.n)}
                  </span>
                </span>
              ))}
            </div>
          </Fragment>
        ))}
      </div>
      {fig.note && (
        <p className={a.note} data-pop data-at={next}>
          {fig.note}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the area model

export function GridFig({ fig }: { fig: GridFigure }) {
  const n = fig.cols.length;
  const said = [
    "An area model.",
    `Rows: ${fig.rows.map(plainOf).join(", ")}.`,
    `Columns: ${fig.cols.map(plainOf).join(", ")}.`,
    `Products: ${fig.rows.map((_, i) => fig.cols.map((_, j) => plainOf(fig.cells[i]?.[j] ?? "")).join(", ")).join("; ")}.`,
  ].join(" ");
  return (
    <div
      className={`${s.fig} ${a.area}`}
      role="img"
      aria-label={said}
      style={{ gridTemplateColumns: `auto repeat(${n}, minmax(0, 1fr))` }}
    >
      <span className={a.times} data-pop data-at={0}>
        ×
      </span>
      {fig.cols.map((c, j) => (
        <span key={j} className={a.colHead} data-pop data-at={0}>
          <LessonText text={c} />
        </span>
      ))}
      {fig.rows.map((r, i) => (
        <Fragment key={i}>
          <span className={a.rowHead} data-pop data-at={1}>
            <LessonText text={r} />
          </span>
          {fig.cols.map((_, j) => (
            <span key={j} className={a.cell} data-pop data-at={2 + i * n + j}>
              <LessonText text={fig.cells[i]?.[j] ?? ""} />
            </span>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- the function machine

type Pairs = [input: string, output: string][];

function Arrow({ at }: { at: number }) {
  return (
    <svg className={a.arrow} viewBox="0 0 28 14" aria-hidden="true">
      <path d="M2 7H25M19.5 2.5L25 7L19.5 11.5" className={a.arrowPath} data-draw data-at={at} />
    </svg>
  );
}

/** One machine: in, the rule, out; and under it its pairs, in and out, popping in pair by pair.
 *  A value is tinted when it came out of a machine (outTone) or came in from the one before. */
function Stage({
  rule,
  pairs,
  at,
  inTone,
  outTone,
}: {
  rule: string;
  pairs: Pairs;
  at: number;
  inTone: (k: number) => Tone | null;
  outTone: (k: number) => Tone;
}) {
  return (
    <div className={a.stage}>
      <div className={a.flow}>
        <Arrow at={at} />
        <div className={a.machine} data-pop data-at={at}>
          <LessonText text={rule} />
        </div>
        <Arrow at={at + 1} />
      </div>
      {pairs.length > 0 && (
        <div
          className={a.table}
          style={{ gridTemplateColumns: `auto repeat(${pairs.length}, minmax(0, 1fr))` }}
          data-pop
          data-at={at + 1}
        >
          <span className={a.th}>in</span>
          {pairs.map(([x], k) => {
            const t = inTone(k);
            return (
              <span
                key={k}
                className={t ? `${a.td} ${a.passed} ${s[t]}` : a.td}
                data-pop
                data-at={at + 2 + k}
              >
                {valueText(x)}
              </span>
            );
          })}
          <span className={a.th}>out</span>
          {pairs.map(([, out], k) => (
            <span
              key={k}
              className={`${a.td} ${a.passed} ${s[outTone(k)]}`}
              data-pop
              data-at={at + 2 + k}
            >
              {valueText(out)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function MachineFig({ fig }: { fig: MachineFigure }) {
  const then = fig.then;
  // the first machine's outputs that go on into the second, and the second's inputs that came from it
  const outs = new Set(fig.pairs.map(([, out]) => out.trim()));
  const ins = new Set((then?.pairs ?? []).map(([x]) => x.trim()));
  const firstEnd = 2 + fig.pairs.length;
  const run = (rule: string, pairs: Pairs) =>
    `the rule ${plainOf(rule)}${pairs.length ? `: ${pairs.map(([x, out]) => `${x} gives ${out}`).join(", ")}` : ""}`;
  const said = `A function machine with ${run(fig.rule, fig.pairs)}.${then ? ` Its outputs go into a second machine with ${run(then.rule, then.pairs)}.` : ""}`;

  return (
    <div className={`${s.fig} ${a.machines}`} role="img" aria-label={said}>
      <Stage
        rule={fig.rule}
        pairs={fig.pairs}
        at={0}
        inTone={() => null}
        outTone={(k) => (then && ins.has(fig.pairs[k][1].trim()) ? "gold" : "warm")}
      />
      {then && (
        <>
          <svg className={a.feed} viewBox="0 0 24 26" aria-hidden="true">
            <path
              d="M12 2V23M6.5 17.5L12 23L17.5 17.5"
              className={a.arrowPath}
              data-draw
              data-at={firstEnd}
            />
          </svg>
          <Stage
            rule={then.rule}
            pairs={then.pairs}
            at={firstEnd + 1}
            inTone={(k) => (outs.has(then.pairs[k][0].trim()) ? "gold" : null)}
            outTone={() => "warm"}
          />
        </>
      )}
    </div>
  );
}
