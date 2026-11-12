"use client";

// ============================================================
// The admin money view. Charts are hand-drawn SVG (no chart
// library), each with a "Show as a table" twin. In order: the
// period switch and the one main button, six headline numbers,
// revenue over time by plan, sales by plan, MRR with its
// forecast, new customers vs cancellations, cohort payments,
// refunds, past due, cohort retention, revenue per tutor,
// subscription status and where the numbers come from.
// Sample mode badges every panel (see page.tsx).
// ============================================================

import { useState, useTransition } from "react";
import { Card, Cta } from "@/components/portal/primitives";
import { MARCH_PROGRAM } from "@/lib/marketing/offer";
import { FAMILIES, type Family } from "./_ledger";
import type { PeriodId, RevenueData } from "./_types";
import { AreaChart } from "./_components/AreaChart";
import { BarsChart, type BarSeries } from "./_components/BarsChart";
import { ChartTable, PanelHead, TipRow } from "./_components/chart-kit";
import { CohortPayments } from "./_components/CohortPayments";
import { fmtDay, fmtMoney, fmtMoneyShort } from "./_components/format";
import { KpiTiles } from "./_components/KpiTiles";
import { PlanLadder } from "./_components/PlanLadder";
import {
  DunningList,
  PeriodSwitch,
  RefundsList,
  RetentionGrid,
  TutorList,
} from "./_components/Tables";
import "./revenue.css";
import "./revenue-panels.css";

export type { RevenueData };

interface Props {
  data: RevenueData;
  snapshotAction: () => Promise<{ ok: true; mrr: number } | { ok: false; error: string }>;
}

const FAMILY_SERIES: BarSeries[] = FAMILIES.map((f) => ({
  key: f,
  label: {
    practice: "Practice",
    pro: "Pro",
    "tutor-affiliate": "Tutor affiliate",
    cohort: "Cohort",
    private: "Private 10 and 20",
  }[f],
  color: `var(--rev-${f === "tutor-affiliate" ? "affiliate" : f})`,
}));
const REFUND_SERIES: BarSeries[] = [
  { key: "refunds", label: "Refunds", color: "var(--rev-refund)" },
];
const NEW_SERIES: BarSeries[] = [
  { key: "new", label: "New paying customers", color: "var(--rev-new)" },
];
const LOST_SERIES: BarSeries[] = [
  { key: "lost", label: "Cancelled subscriptions", color: "var(--rev-refund)" },
];

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmtMoney(Math.abs(n))}`;

/** The next k Austin months after "YYYY-MM", as chart labels. */
function monthsAfter(key: string, k: number) {
  const [y, m] = key.split("-").map(Number);
  return Array.from({ length: k }, (_, i) => {
    const d = new Date(Date.UTC(y, m + i, 1));
    return {
      short: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  });
}

export default function RevenueClient({ data, snapshotAction }: Props) {
  const [period, setPeriod] = useState<PeriodId>("30d");
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [snapMsg, setSnapMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const view = data.periods[period];
  const s = data.sample;
  const b = view.buckets;
  const xLabels = b.map((x) => ({ short: x.short, label: x.label }));

  function handleSnapshot() {
    setSnapMsg(null);
    startTransition(async () => {
      const r = await snapshotAction();
      setSnapMsg(
        r.ok
          ? { ok: true, text: `Captured: ${fmtMoney(r.mrr)} MRR.` }
          : { ok: false, text: `Error: ${r.error}` }
      );
    });
  }

  function toggle(key: string) {
    setHidden((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else if (next.size < FAMILY_SERIES.length - 1) next.add(key);
      return next;
    });
  }

  const asOf = new Date(data.asOf).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  });
  const forecastAhead =
    period === "12m" && b.length > 0
      ? monthsAfter(b[b.length - 1].key, 6).map((l, k) => ({
          ...l,
          value: Math.max(
            0,
            Math.round((view.kpis.mrr.value ?? 0) + view.forecast.monthlyNetNewMrr * (k + 1))
          ),
        }))
      : [];
  const latestSnap = data.snapshots[data.snapshots.length - 1];
  const grainWord = view.grain === "day" ? "day" : view.grain === "week" ? "week" : "month";

  return (
    <div className="kp-rev">
      <div className="kp-rev-top">
        <p suppressHydrationWarning>
          As of {asOf}, Austin time. Days, weeks and months are counted in Austin time.
        </p>
        <div className="kp-rev-top-actions">
          <PeriodSwitch value={period} onChange={setPeriod} />
          <Cta onClick={handleSnapshot} disabled={pending}>
            {pending ? "Capturing…" : "Snapshot MRR now"}
          </Cta>
        </div>
      </div>
      {snapMsg && (
        <p role="status" className="kp-rev-alert" data-ok={snapMsg.ok ? "" : undefined}>
          {snapMsg.text}
        </p>
      )}
      {s && (
        <p className="kp-rev-banner" role="note">
          <b>Sample data.</b>{" "}
          {data.sampleReason === "asked"
            ? "You asked for sample data: every number below is made up from the real plan prices."
            : `Your database has ${data.realPaidRows} paid ${data.realPaidRows === 1 ? "row" : "rows"}, too few to draw these charts, so every number below is made up from the real plan prices. Real numbers take over by themselves at ${data.sampleThreshold}.`}{" "}
          <a className="kp-link" href="?sample=0">
            Show the real numbers
          </a>
        </p>
      )}
      {!s && data.realPaidRows < data.sampleThreshold && (
        <p className="kp-rev-banner" data-real="" role="note">
          Real numbers, from {data.realPaidRows} paid {data.realPaidRows === 1 ? "row" : "rows"}.{" "}
          <a className="kp-link" href="?sample=1">
            See the page with sample data
          </a>
        </p>
      )}

      <section
        aria-label={`Headline numbers, ${view.label.toLowerCase()}`}
        className="kp-rev-kpi-wrap"
        data-sample={s ? "" : undefined}
      >
        {s && <SampleCorner />}
        <KpiTiles view={view} />
      </section>

      <div className="kp-rev-grid">
        <div className="kp-rev-span-12">
          <Card>
            <PanelHead
              title="Revenue"
              sample={s}
              sub={`${view.label}, by ${grainWord}: what was charged, by plan, with refunds below the line.`}
              right={
                <p className="kp-rev-headline">
                  <b className="kp-num">{fmtMoney(view.kpis.net.value ?? 0)}</b>
                  <small>net</small>
                </p>
              }
            />
            <ul className="kp-rev-legend" aria-label="Plans shown">
              {FAMILY_SERIES.map((f) => (
                <li key={f.key}>
                  <button
                    type="button"
                    aria-pressed={!hidden.has(f.key)}
                    onClick={() => toggle(f.key)}
                  >
                    <i style={{ background: f.color }} aria-hidden="true" />
                    {f.label}
                  </button>
                </li>
              ))}
              <li>
                <span>
                  <i style={{ background: "var(--rev-refund)" }} aria-hidden="true" />
                  Refunds
                </span>
              </li>
            </ul>
            <BarsChart
              id={`rev-${period}`}
              label={`Revenue by plan, ${view.label.toLowerCase()}`}
              xLabels={xLabels}
              up={FAMILY_SERIES}
              upValues={b.map((x) => FAMILIES.map((f) => x.byFamily[f]))}
              down={REFUND_SERIES}
              downValues={b.map((x) => [x.refunds])}
              hidden={hidden}
              yFormat={fmtMoneyShort}
              tooltip={(i) => (
                <>
                  {FAMILY_SERIES.filter((f) => b[i].byFamily[f.key as Family] > 0).map((f) => (
                    <TipRow
                      key={f.key}
                      color={f.color}
                      label={f.label}
                      value={fmtMoney(b[i].byFamily[f.key as Family])}
                    />
                  ))}
                  {b[i].refunds > 0 && (
                    <TipRow
                      color="var(--rev-refund)"
                      label="Refunds"
                      value={`−${fmtMoney(b[i].refunds)}`}
                    />
                  )}
                  <TipRow label="Net" value={fmtMoney(b[i].net)} strong />
                </>
              )}
              speak={(i) =>
                `${b[i].label}: ${fmtMoney(b[i].net)} net. ${FAMILY_SERIES.filter(
                  (f) => b[i].byFamily[f.key as Family] > 0
                )
                  .map((f) => `${f.label} ${fmtMoney(b[i].byFamily[f.key as Family])}`)
                  .join(", ")}${b[i].refunds ? `, refunds ${fmtMoney(b[i].refunds)}` : ""}.`
              }
            />
            {data.cohortPayments.notRecorded > 0 && (
              <p className="kp-rev-note">
                Cohort seats count at the full price on the day bought: whether a seat was paid in
                full or by deposit isn&apos;t recorded yet.
              </p>
            )}
            <ChartTable
              caption={`Revenue by plan, ${view.label.toLowerCase()}`}
              head={["Period", ...FAMILY_SERIES.map((f) => f.label), "Refunds", "Net"]}
              rows={b.map((x) => ({
                key: x.key,
                cells: [
                  x.label,
                  ...FAMILIES.map((f) => fmtMoney(x.byFamily[f])),
                  fmtMoney(x.refunds),
                  fmtMoney(x.net),
                ],
              }))}
            />
          </Card>
        </div>

        <div className="kp-rev-span-7">
          <Card>
            <PanelHead
              title="Sales by plan"
              sample={s}
              sub="Free to Schools: who holds each plan now, and what it brought in."
            />
            <PlanLadder plans={view.plans} periodLabel={view.label} />
          </Card>
        </div>

        <div className="kp-rev-span-5">
          <Card>
            <PanelHead
              title="MRR"
              sample={s}
              sub={
                period === "12m"
                  ? "At the end of each month, then six months ahead at the current pace (dashed)."
                  : `At the end of each ${grainWord}.`
              }
            />
            <AreaChart
              id={`mrr-${period}`}
              label={`MRR, ${view.label.toLowerCase()}`}
              xLabels={xLabels}
              values={b.map((x) => x.mrr)}
              forecast={forecastAhead}
              yFormat={fmtMoneyShort}
              tooltip={(i) => (
                <>
                  <TipRow label="MRR" value={fmtMoney(b[i].mrr)} strong />
                  {b[i].newMrr > 0 && (
                    <TipRow
                      color="var(--rev-new)"
                      label="Added"
                      value={`+${fmtMoney(b[i].newMrr)}`}
                    />
                  )}
                  {b[i].lostMrr > 0 && (
                    <TipRow
                      color="var(--rev-refund)"
                      label="Lost"
                      value={`−${fmtMoney(b[i].lostMrr)}`}
                    />
                  )}
                </>
              )}
              speak={(i) =>
                `${b[i].label}: MRR ${fmtMoney(b[i].mrr)}, added ${fmtMoney(b[i].newMrr)}, lost ${fmtMoney(b[i].lostMrr)}.`
              }
            />
            <dl className="kp-rev-forecast-row">
              <div>
                <dt>Net new MRR a month</dt>
                <dd
                  className="kp-num"
                  data-tone={view.forecast.monthlyNetNewMrr >= 0 ? "up" : "down"}
                >
                  {signed(Math.round(view.forecast.monthlyNetNewMrr))}
                </dd>
              </div>
              <div>
                <dt>In 3 months</dt>
                <dd className="kp-num">{fmtMoney(view.forecast.in3Months)}</dd>
              </div>
              <div>
                <dt>In 6</dt>
                <dd className="kp-num">{fmtMoney(view.forecast.in6Months)}</dd>
              </div>
              <div>
                <dt>In 12</dt>
                <dd className="kp-num">{fmtMoney(view.forecast.in12Months)}</dd>
              </div>
            </dl>
            <p className="kp-rev-note">
              Rebuilt from subscription start and cancel dates.{" "}
              {latestSnap
                ? `${data.snapshots.length} captured ${data.snapshots.length === 1 ? "snapshot" : "snapshots"} to check against; the latest, ${fmtDay(latestSnap.capturedAt)}, read ${fmtMoney(latestSnap.mrr)}.`
                : "No captured snapshots yet to check it against."}
            </p>
            <ChartTable
              caption={`MRR, ${view.label.toLowerCase()}`}
              head={["Period", "MRR", "Added", "Lost"]}
              rows={b.map((x) => ({
                key: x.key,
                cells: [x.label, fmtMoney(x.mrr), fmtMoney(x.newMrr), fmtMoney(x.lostMrr)],
              }))}
            />
          </Card>
        </div>

        <div className="kp-rev-span-7">
          <Card>
            <PanelHead
              title="New customers and cancellations"
              sample={s}
              sub={`Per ${grainWord}: people paying for the first time above the line, subscriptions that ended below it.`}
            />
            <BarsChart
              id={`flow-${period}`}
              label={`New paying customers and cancelled subscriptions, ${view.label.toLowerCase()}`}
              xLabels={xLabels}
              up={NEW_SERIES}
              upValues={b.map((x) => [x.newCustomers])}
              down={LOST_SERIES}
              downValues={b.map((x) => [x.churned])}
              integer
              yFormat={(n) => String(n)}
              height={220}
              tooltip={(i) => (
                <>
                  <TipRow color="var(--rev-new)" label="New customers" value={b[i].newCustomers} />
                  <TipRow color="var(--rev-refund)" label="Cancelled" value={b[i].churned} />
                  <TipRow label="MRR added" value={`+${fmtMoney(b[i].newMrr)}`} />
                  <TipRow label="MRR lost" value={`−${fmtMoney(b[i].lostMrr)}`} />
                  <TipRow label="Paying customers" value={b[i].customers} strong />
                </>
              )}
              speak={(i) =>
                `${b[i].label}: ${b[i].newCustomers} new paying customers, ${b[i].churned} cancelled subscriptions.`
              }
            />
            <ChartTable
              caption={`New customers and cancellations, ${view.label.toLowerCase()}`}
              head={[
                "Period",
                "New customers",
                "Cancelled",
                "MRR added",
                "MRR lost",
                "Paying at the end",
              ]}
              rows={b.map((x) => ({
                key: x.key,
                cells: [
                  x.label,
                  x.newCustomers,
                  x.churned,
                  fmtMoney(x.newMrr),
                  fmtMoney(x.lostMrr),
                  x.customers,
                ],
              }))}
            />
          </Card>
        </div>

        <div className="kp-rev-span-5">
          <Card>
            <PanelHead
              title="Cohort payments"
              sample={s}
              sub="Paid in full, or the deposit and three monthly payments. All seats, all time."
            />
            <CohortPayments data={data.cohortPayments} />
          </Card>
        </div>

        <div className="kp-rev-span-6">
          <Card>
            <PanelHead title="Refunds" sample={s} sub={`${view.label}, newest first.`} />
            <RefundsList view={view} />
          </Card>
        </div>

        <div className="kp-rev-span-6">
          <Card tone={data.dunning.length > 0 ? "late" : undefined}>
            <PanelHead
              title={`Past due (${data.dunning.length})`}
              sample={s}
              sub={
                data.dunning.length > 0
                  ? `About ${fmtMoney(data.dunning.reduce((t, d) => t + d.amountOwed, 0))} at risk: their last renewal failed and Stripe is retrying.`
                  : "Subscriptions whose last renewal failed."
              }
            />
            <DunningList entries={data.dunning} />
          </Card>
        </div>

        <div className="kp-rev-span-12">
          <Card>
            <PanelHead
              title="Cohort retention"
              sample={s}
              sub="Subscribers grouped by the month they started: the share still subscribed at the end of that month, and 1, 3 and 6 months on."
            />
            <RetentionGrid cohorts={data.cohorts} />
          </Card>
        </div>

        <div className="kp-rev-span-6">
          <Card>
            <PanelHead
              title="Revenue per tutor"
              sample={s}
              sub={`${view.label}: private sessions at the hourly price of the student's package.`}
            />
            <TutorList tutors={view.tutors} />
          </Card>
        </div>

        <div className="kp-rev-span-6">
          <Card>
            <PanelHead
              title="Subscriptions by status"
              sample={s}
              sub="Every subscription row, now."
            />
            <div className="kp-rev-trio" data-four="">
              {[
                ["Active", data.statusCounts.active ?? 0],
                ["Past due", data.statusCounts.past_due ?? 0],
                ["Cancelled", data.statusCounts.canceled ?? 0],
                ["Incomplete", data.statusCounts.incomplete ?? 0],
              ].map(([label, n]) => (
                <span key={label}>
                  <b className="kp-num">{n}</b>
                  <small>{label}</small>
                </span>
              ))}
            </div>
          </Card>
        </div>

        <div className="kp-rev-span-12">
          <Card>
            <PanelHead title="Where the numbers come from" sample={false} />
            <ul className="kp-rev-sources">
              <li>
                <b>Subscriptions, purchases and refunds</b> are the rows the Stripe webhook writes
                to Supabase. Charges are rebuilt from them: each subscription at its start and every
                renewal until it ends, each package on the day bought. A coupon, a proration or a
                renewal that failed and later went through will differ from Stripe&apos;s own
                figures.
              </li>
              <li>
                <b>Cohort deposits and instalments</b> are scheduled in Stripe, but which option a
                seat chose isn&apos;t stored in Supabase yet. Until it is, every real seat counts as{" "}
                {fmtMoney(MARCH_PROGRAM.price)} on the day it was bought.
              </li>
              <li>
                <b>MRR history</b> is rebuilt from start and cancel dates; the &ldquo;Snapshot MRR
                now&rdquo; button (or a nightly job) saves a point to check it against.
              </li>
              <li>
                <b>Schools</b> pay nothing in their free first year, so they show seats, not
                revenue.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SampleCorner() {
  return (
    <span className="kp-rev-sample kp-rev-sample-corner" title="Made-up rows, not your customers">
      Sample data
    </span>
  );
}
