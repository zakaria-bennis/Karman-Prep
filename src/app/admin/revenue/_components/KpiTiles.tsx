"use client";

// The six headline numbers. Each counts up when the page opens and glides to its new value
// when the period changes, carries its change against the period before, and (where there is
// one) a small line of the same number across the period's buckets.

import type { Kpi, PeriodView } from "../_types";
import { delta, fmtMoney, fmtPctRatio } from "./format";
import { useCountUp } from "./motion";

type Kind = "money" | "count" | "rate";

function Spark({ values, id }: { values: number[]; id: string }) {
  if (values.length < 2) return null;
  const w = 200;
  const h = 34;
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * (w - 6) + 3,
    h - 4 - ((v - min) / span) * (h - 8),
  ]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="kp-rev-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" key={id}>
      <path d={`${d} L${lx},${h} L3,${h} Z`} className="kp-rev-spark-fill" />
      <path d={d} pathLength={1} className="kp-rev-spark-line" />
      <circle cx={lx} cy={ly} r={2.6} className="kp-rev-spark-dot" />
    </svg>
  );
}

function Arrow({ tone }: { tone: "up" | "down" | "flat" }) {
  if (tone === "flat") return <span aria-hidden="true">·</span>;
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
      <path d={tone === "up" ? "M5 1 L9.5 8.5 L0.5 8.5 Z" : "M5 9 L9.5 1.5 L0.5 1.5 Z"} />
    </svg>
  );
}

function Tile({
  label,
  hint,
  kpi,
  kind,
  good = "up",
  priorLabel,
  index,
  sparkId,
}: {
  label: string;
  hint: string;
  kpi: Kpi;
  kind: Kind;
  good?: "up" | "down";
  priorLabel: string;
  index: number;
  sparkId: string;
}) {
  const target = kpi.value ?? 0;
  const shown = useCountUp(kind === "rate" ? target * 1000 : target);
  const text =
    kpi.value === null
      ? "—"
      : kind === "money"
        ? fmtMoney(shown)
        : kind === "rate"
          ? fmtPctRatio(shown / 1000)
          : Math.round(shown).toLocaleString("en-US");
  const finalText =
    kpi.value === null
      ? "not enough data yet"
      : kind === "money"
        ? fmtMoney(target)
        : kind === "rate"
          ? fmtPctRatio(target)
          : target.toLocaleString("en-US");
  const d = delta(kpi.value, kpi.prior, kind === "rate" ? "points" : "relative", good);
  return (
    <div className="kp-rev-kpi" style={{ ["--i" as string]: index }}>
      <span className="kp-rev-kpi-label">{label}</span>
      <b className="kp-num kp-rev-kpi-value" aria-hidden="true">
        {text}
      </b>
      <span className="sr-only">{`${label}: ${finalText}.`}</span>
      <span
        className="kp-rev-delta"
        data-tone={d.tone}
        data-better={d.better === null ? undefined : String(d.better)}
      >
        <Arrow tone={d.tone} />
        <span className="kp-num">{d.text}</span>
        {kpi.prior !== null && kpi.value !== null && <small>vs {priorLabel}</small>}
      </span>
      <small className="kp-rev-kpi-hint">{hint}</small>
      {kpi.spark && <Spark values={kpi.spark} id={sparkId} />}
    </div>
  );
}

export function KpiTiles({ view }: { view: PeriodView }) {
  const k = view.kpis;
  const common = { priorLabel: view.priorLabel };
  return (
    <div className="kp-rev-kpis">
      <Tile
        index={0}
        {...common}
        sparkId={`mrr-${view.id}`}
        label="MRR"
        hint="Monthly value of every live subscription"
        kpi={k.mrr}
        kind="money"
      />
      <Tile
        index={1}
        {...common}
        sparkId={`arr-${view.id}`}
        label="ARR"
        hint="MRR × 12, the run-rate"
        kpi={k.arr}
        kind="money"
      />
      <Tile
        index={2}
        {...common}
        sparkId={`net-${view.id}`}
        label="Net revenue"
        hint={`${view.label}: charged, less refunds`}
        kpi={k.net}
        kind="money"
      />
      <Tile
        index={3}
        {...common}
        sparkId={`cust-${view.id}`}
        label="Paying customers"
        hint="A live subscription or a package"
        kpi={k.customers}
        kind="count"
      />
      <Tile
        index={4}
        {...common}
        sparkId={`ltv-${view.id}`}
        label="LTV"
        hint="Per subscriber: ARPU ÷ monthly churn"
        kpi={k.ltv}
        kind="money"
      />
      <Tile
        index={5}
        {...common}
        sparkId={`churn-${view.id}`}
        label="Monthly churn"
        hint="Subscriptions ended per subscriber-month"
        kpi={k.churn}
        kind="rate"
        good="down"
      />
    </div>
  );
}
