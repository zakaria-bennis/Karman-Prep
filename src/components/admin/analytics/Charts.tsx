// ============================================================
// Hand-built charts for /admin/analytics: the sign-up funnel, daily active people, time by
// feature and where visits end. Server-rendered SVG and CSS (analytics.css), no chart library.
// Each chart says what it shows in a sentence and carries its numbers as a table under
// "Show the numbers", so it reads without the picture. Motion: bars grow and lines draw once,
// skipped under reduced motion or the portal's still setting.
// ============================================================

import type { CSSProperties, ReactNode } from "react";
import type { DailyActive, ExitPage, FeatureTime } from "@/lib/analytics/aggregate";
import type { FunnelRow } from "@/lib/analytics/funnel";
import "./analytics.css";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const n = (x: number) => x.toLocaleString("en-US");

export function shortDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function ChartCard({
  title,
  summary,
  table,
  children,
}: {
  title: string;
  summary: ReactNode;
  table: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="an-card" aria-label={title}>
      <h3>{title}</h3>
      <p className="an-summary">{summary}</p>
      <figure className="an-figure" aria-hidden="true">
        {children}
      </figure>
      <details className="an-numbers">
        <summary>Show the numbers</summary>
        {table}
      </details>
    </section>
  );
}

function SimpleTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <div className="wb-table-wrap">
      <table className="wb-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} scope="col" style={i ? { textAlign: "right" } : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} data-label={head[j]} data-num={j ? "" : undefined}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Funnel ─────────────────────────────────────────────────────────────────── */

export function FunnelChart({ rows }: { rows: FunnelRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.reached));
  const worst = rows
    .slice(1)
    .filter((r) => r.dropped !== null && r.dropped > 0)
    .sort((a, b) => (b.dropped ?? 0) - (a.dropped ?? 0))[0];
  const paid = rows[rows.length - 1];
  const summary =
    rows[0].reached === 0 && paid.reached === 0
      ? "No funnel steps recorded in this window yet."
      : `${n(rows[0].reached)} ${rows[0].reached === 1 ? "person" : "people"} visited and ${n(paid.reached)} paid.${
          worst
            ? ` The biggest drop is before “${worst.label}”: ${n(worst.dropped!)} stopped there.`
            : ""
        }`;
  return (
    <ChartCard
      title="Sign-up funnel"
      summary={summary}
      table={
        <SimpleTable
          caption="Sign-up funnel, step by step"
          head={[
            "Step",
            "Reached",
            "Went on from the step before",
            "Stopped",
            "Arrived without the step before",
          ]}
          rows={rows.map((r) => [
            r.label,
            n(r.reached),
            r.continued === null ? "—" : `${n(r.continued)} (${pct(r.rate)})`,
            r.dropped === null ? "—" : n(r.dropped),
            r.continued === null ? "—" : n(r.joined),
          ])}
        />
      }
    >
      <ol className="an-funnel">
        {rows.map((r, i) => {
          const prev = i ? rows[i - 1].reached : r.reached;
          const style: Vars = {
            "--i": i,
            "--w": `${(r.reached / max) * 100}%`,
            "--prev": `${(prev / max) * 100}%`,
          };
          return (
            <li key={r.key} style={style} data-worst={worst?.key === r.key ? "" : undefined}>
              {i > 0 && (
                <p className="an-funnel-gap">
                  <span className="an-funnel-rate">{pct(r.rate)} went on</span>
                  {r.dropped ? <span> · {n(r.dropped)} stopped</span> : null}
                  {r.joined ? <span> · {n(r.joined)} arrived here directly</span> : null}
                </p>
              )}
              <div className="an-funnel-row">
                <span className="an-funnel-label">{r.label}</span>
                <span className="an-funnel-track">
                  <span className="an-funnel-ghost" />
                  <span className="an-funnel-bar" />
                </span>
                <b className="an-funnel-count">{n(r.reached)}</b>
              </div>
            </li>
          );
        })}
      </ol>
    </ChartCard>
  );
}

/* ── Daily active ───────────────────────────────────────────────────────────── */

const W = 640;
const BAND = 92;
const GAP = 34;

function niceMax(v: number) {
  if (v <= 4) return Math.max(1, v);
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / (p / 2)) * (p / 2);
}

export function DailyActiveChart({ daily }: { daily: DailyActive[] }) {
  const days = daily.length;
  const step = W / Math.max(1, days);
  const sMax = niceMax(Math.max(0, ...daily.map((d) => d.students)));
  const vMax = niceMax(Math.max(0, ...daily.map((d) => d.visitors)));
  const top2 = BAND + GAP;
  const y2 = (v: number) => top2 + BAND - (v / vMax) * BAND;
  const line = daily
    .map((d, i) => `${i ? "L" : "M"}${(i + 0.5) * step},${y2(d.visitors).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${(days - 0.5) * step},${top2 + BAND} L${0.5 * step},${top2 + BAND} Z`;
  const avg = (k: "students" | "visitors") =>
    days ? Math.round((daily.reduce((a, d) => a + d[k], 0) / days) * 10) / 10 : 0;
  const peak = [...daily].sort((a, b) => b.students - a.students)[0];
  const ticks = [0, Math.floor((days - 1) / 2), days - 1].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <ChartCard
      title="Daily active"
      summary={`On an average day, ${avg("students")} students used a portal and ${avg("visitors")} people visited the public site (only visitors who allowed analytics are counted).${
        peak && peak.students
          ? ` Busiest day for students: ${shortDay(peak.day)}, with ${peak.students}.`
          : ""
      }`}
      table={
        <SimpleTable
          caption="Daily active students and site visitors"
          head={["Day", "Students active", "Site visitors"]}
          rows={daily.map((d) => [shortDay(d.day), n(d.students), n(d.visitors)])}
        />
      }
    >
      <svg className="an-daily" viewBox={`0 -14 ${W} ${BAND * 2 + GAP + 34}`} role="presentation">
        <text className="an-axis-title" x="0" y="-2">
          Students active · up to {n(sMax)}
        </text>
        <line className="an-base" x1="0" x2={W} y1={BAND} y2={BAND} />
        {daily.map((d, i) => {
          const h = (d.students / sMax) * BAND;
          return (
            <rect
              key={d.day}
              className="an-bar"
              style={{ "--i": i } as Vars}
              x={i * step + step * 0.18}
              y={BAND - h}
              width={step * 0.64}
              height={Math.max(h, d.students ? 2 : 0)}
              rx={Math.min(3, step * 0.2)}
            >
              <title>{`${shortDay(d.day)}: ${d.students} students`}</title>
            </rect>
          );
        })}
        <text className="an-axis-title" x="0" y={top2 - 6}>
          Site visitors · up to {n(vMax)}
        </text>
        <line className="an-base" x1="0" x2={W} y1={top2 + BAND} y2={top2 + BAND} />
        <path className="an-area" d={area} />
        <path className="an-line" d={line} pathLength={1} />
        {daily.map((d, i) => (
          <circle
            key={d.day}
            className="an-dot"
            style={{ "--i": i } as Vars}
            cx={(i + 0.5) * step}
            cy={y2(d.visitors)}
            r={days > 45 ? 0 : 2.6}
          >
            <title>{`${shortDay(d.day)}: ${d.visitors} visitors`}</title>
          </circle>
        ))}
        {ticks.map((i) => (
          <text
            key={i}
            className="an-tick"
            x={(i + 0.5) * step}
            y={top2 + BAND + 20}
            textAnchor={i === 0 ? "start" : i === days - 1 ? "end" : "middle"}
          >
            {daily[i] ? shortDay(daily[i].day) : ""}
          </text>
        ))}
      </svg>
    </ChartCard>
  );
}

/* ── Horizontal bars: time by feature, where visits end ─────────────────────── */

function Bars({
  items,
}: {
  items: Array<{ key: string; label: string; value: number; shown: string; note?: string }>;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="an-bars">
      {items.map((it, i) => (
        <li key={it.key} style={{ "--i": i, "--w": `${(it.value / max) * 100}%` } as Vars}>
          <span className="an-bars-label">{it.label}</span>
          <span className="an-bars-track">
            <span className="an-bars-fill" />
          </span>
          <b>{it.shown}</b>
          {it.note && <small>{it.note}</small>}
        </li>
      ))}
    </ul>
  );
}

export function FeatureTimeChart({ features }: { features: FeatureTime[] }) {
  const total = features.reduce((a, f) => a + f.minutes, 0);
  const top = features[0];
  return (
    <ChartCard
      title="Time spent by feature"
      summary={
        top
          ? `${n(Math.round(total))} active minutes in the portals; the most went to ${top.feature} (${Math.round((top.minutes / Math.max(total, 1)) * 100)}%).`
          : "No time in the portals recorded in this window yet."
      }
      table={
        <SimpleTable
          caption="Active minutes by feature"
          head={["Feature", "Minutes", "People"]}
          rows={features.map((f) => [f.feature, n(f.minutes), n(f.people)])}
        />
      }
    >
      <Bars
        items={features.slice(0, 10).map((f) => ({
          key: f.feature,
          label: f.feature,
          value: f.minutes,
          shown: `${n(Math.round(f.minutes))} min`,
          note: `${f.people} ${f.people === 1 ? "person" : "people"}`,
        }))}
      />
    </ChartCard>
  );
}

export function ExitChart({ exits }: { exits: ExitPage[] }) {
  const all = exits.reduce((a, e) => a + e.visitsEnded, 0);
  return (
    <ChartCard
      title="Where visits end"
      summary={
        exits[0]
          ? `The last page of each visit. ${exits[0].path} ends the most (${n(exits[0].visitsEnded)} of the ${n(all)} visits listed).`
          : "No visits recorded in this window yet."
      }
      table={
        <SimpleTable
          caption="Last page of each visit"
          head={["Page", "Visits that ended here"]}
          rows={exits.map((e) => [e.path, n(e.visitsEnded)])}
        />
      }
    >
      <Bars
        items={exits.map((e) => ({
          key: e.path,
          label: e.path,
          value: e.visitsEnded,
          shown: n(e.visitsEnded),
        }))}
      />
    </ChartCard>
  );
}
