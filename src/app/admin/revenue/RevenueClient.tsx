"use client";

// ============================================================
// RevenueClient — the admin revenue page, on the workbench kit.
//
// Charts are plain SVG (no chart library). Sections, in order:
// headline totals, the last 30 days, MRR trend, forecast, where
// the revenue comes from (pie + plan table), cohort retention,
// past-due subscriptions, revenue per tutor, subscription
// status, and where the numbers come from.
// ============================================================

import { useState, useTransition } from "react";
import { WbPage, WbSection, WbStats, WbTable } from "@/components/admin/workbench";
import { fmtMoney, fmtPctRatio, fmtMonth } from "./_components/format";
import { MrrSparkline } from "./_components/MrrSparkline";
import { PlanBreakdown } from "./_components/PlanBreakdown";
import { CohortCell, Signed } from "./_components/atoms";
import type {
  RevenueData,
  TierBreakdown,
  MrrSnapshot,
  CohortRow,
  DunningEntry,
  TutorRevenueRow,
} from "./_types";

export type { RevenueData, TierBreakdown, MrrSnapshot, CohortRow, DunningEntry, TutorRevenueRow };

interface Props {
  data: RevenueData;
  snapshotAction: () => Promise<{ ok: true; mrr: number } | { ok: false; error: string }>;
}

const CHECKPOINTS = ["Month 0", "Month 1", "Month 3", "Month 6"];

export default function RevenueClient({ data, snapshotAction }: Props) {
  const [snapMsg, setSnapMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSnapshot() {
    setSnapMsg(null);
    startTransition(async () => {
      const r = await snapshotAction();
      if (r.ok) setSnapMsg({ ok: true, text: `Captured: ${fmtMoney(r.mrr)} MRR.` });
      else setSnapMsg({ ok: false, text: `Error: ${r.error}` });
    });
  }

  const asOf = new Date(data.asOf).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const atRisk = data.dunning.reduce((s, d) => s + d.amountOwed, 0);

  return (
    <WbPage
      title="Revenue"
      summary={`From active subscriptions and one-time purchases in the last 30 days. As of ${asOf}.`}
      actions={
        <button
          type="button"
          className="wb-btn"
          data-variant="primary"
          onClick={handleSnapshot}
          disabled={pending}
        >
          {pending ? "Capturing…" : "Snapshot now"}
        </button>
      }
    >
      {snapMsg && (
        <p role="status" className="wb-alert" data-tone={snapMsg.ok ? "ok" : undefined}>
          {snapMsg.text}
        </p>
      )}

      <WbStats
        items={[
          { label: "MRR", value: fmtMoney(data.totalMrr) },
          { label: "ARR (run-rate)", value: fmtMoney(data.totalArr) },
          { label: "Students", value: data.totalStudents.toLocaleString() },
          { label: "ARPU, average per student a month", value: fmtMoney(data.arpu) },
          {
            label:
              data.monthlyChurnRate === 0
                ? "Monthly churn, no cancellations in 30 days"
                : "Monthly churn, last 30 days over the start",
            value: fmtPctRatio(data.monthlyChurnRate),
          },
          {
            label: data.ltv == null ? "LTV, needs churn data" : "LTV, ARPU ÷ monthly churn",
            value: data.ltv == null ? "—" : fmtMoney(data.ltv),
          },
        ]}
      />

      <WbSection title="Last 30 days">
        <WbStats
          items={[
            { label: "New subscriptions", value: data.newSubs30d },
            { label: "Cancellations", value: data.cancellations30d },
            {
              label:
                data.refunds30dDollars > 0
                  ? `Refunds issued, ${fmtMoney(data.refunds30dDollars)} refunded`
                  : "Refunds issued, none yet",
              value: data.refunds30dCount,
            },
            {
              label:
                data.dunning.length > 0
                  ? `Past due now, about ${fmtMoney(atRisk)} at risk`
                  : "Past due now",
              value: data.dunning.length,
            },
          ]}
        />
      </WbSection>

      <WbSection title="MRR trend">
        <p className="wb-note" style={{ marginBottom: 8 }}>
          Last {data.snapshots.length} snapshots.
        </p>
        <MrrSparkline snapshots={data.snapshots} />
      </WbSection>

      <WbSection title="Forecast at the current pace">
        <p className="wb-note" style={{ marginBottom: 10 }}>
          Net new MRR a month:{" "}
          <Signed value={data.forecast.monthlyNetNewMrr}>
            {fmtMoney(data.forecast.monthlyNetNewMrr)}
          </Signed>
          . Net new students a month:{" "}
          <Signed value={data.forecast.monthlyNetNewSubs}>
            {data.forecast.monthlyNetNewSubs.toFixed(1)}
          </Signed>
          .
        </p>
        <WbStats
          items={[
            { label: "MRR in 3 months", value: fmtMoney(data.forecast.in3Months) },
            { label: "MRR in 6 months", value: fmtMoney(data.forecast.in6Months) },
            { label: "MRR in 12 months", value: fmtMoney(data.forecast.in12Months) },
          ]}
        />
      </WbSection>

      <WbSection title="Where the revenue comes from">
        <p className="wb-note" style={{ marginBottom: 10 }}>
          Point at a plan to pick it out in the pie.
        </p>
        <PlanBreakdown
          tiers={data.tiers}
          totalMrr={data.totalMrr}
          monthRevenue={data.monthRevenue}
        />
      </WbSection>

      <WbSection title="Cohort retention">
        <p className="wb-note" style={{ marginBottom: 10 }}>
          Each row is the people who subscribed in one month, and how many were still active 0, 1, 3
          and 6 months later. Months that haven&apos;t happened yet show &ldquo;—&rdquo;.
        </p>
        <WbTable<CohortRow>
          caption="Cohort retention"
          rows={data.cohorts}
          rowKey={(c) => c.month}
          empty="No cohorts yet."
          columns={[
            { key: "month", label: "Signed up", cell: (c) => <b>{fmtMonth(c.month)}</b> },
            { key: "size", label: "Size", numeric: true, cell: (c) => c.size },
            ...CHECKPOINTS.map((label, i) => ({
              key: label,
              label,
              numeric: true,
              cell: (c: CohortRow) => {
                const cnt = c.counts[i];
                return cnt === null || cnt === undefined ? (
                  "—"
                ) : (
                  <CohortCell active={cnt} total={c.size} />
                );
              },
            })),
          ]}
        />
      </WbSection>

      <WbSection title={`Past due (${data.dunning.length})`}>
        <WbTable<DunningEntry & { i: number }>
          caption="Past-due subscriptions"
          rows={data.dunning.map((d, i) => ({ ...d, i }))}
          rowKey={(d) => String(d.i)}
          empty="No past-due subscriptions."
          columns={[
            {
              key: "student",
              label: "Student",
              cell: (d) => (
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                  <b>{d.name}</b>
                  {d.email && <small>{d.email}</small>}
                </span>
              ),
            },
            { key: "plan", label: "Plan", cell: (d) => d.tier },
            {
              key: "owed",
              label: "Amount at risk",
              numeric: true,
              cell: (d) => <b style={{ color: "var(--warn)" }}>{fmtMoney(d.amountOwed)}</b>,
            },
          ]}
        />
      </WbSection>

      <WbSection title="Revenue per tutor, last 30 days">
        <WbTable<TutorRevenueRow>
          caption="Revenue per tutor"
          rows={data.tutorRevenue}
          rowKey={(t) => t.tutorId}
          empty="No tutor-attributed revenue in the last 30 days."
          columns={[
            { key: "tutor", label: "Tutor", cell: (t) => <b>{t.name}</b> },
            { key: "sessions", label: "Sessions", numeric: true, cell: (t) => t.sessions },
            {
              key: "revenue",
              label: "Attributed revenue",
              numeric: true,
              cell: (t) => <b style={{ color: "var(--good)" }}>{fmtMoney(t.revenue)}</b>,
            },
          ]}
        />
      </WbSection>

      <WbSection title="Subscription status">
        <WbStats
          items={[
            { label: "Active", value: data.statusCounts.active ?? 0 },
            { label: "Past due", value: data.statusCounts.past_due ?? 0 },
            { label: "Canceled", value: data.statusCounts.canceled ?? 0 },
            { label: "Incomplete", value: data.statusCounts.incomplete ?? 0 },
          ]}
        />
      </WbSection>

      <WbSection title="Where the numbers come from">
        <p className="wb-note">
          Numbers come from Supabase. When the customer base grows, swap the queries inside{" "}
          <code>getRevenueMetrics()</code> for <code>stripe.subscriptions.list()</code> grouped by
          Stripe price id; the return shape doesn&apos;t change. Snapshots come from the
          &ldquo;Snapshot now&rdquo; button (or wire it to a nightly Vercel Cron or pg_cron job).
        </p>
      </WbSection>
    </WbPage>
  );
}
