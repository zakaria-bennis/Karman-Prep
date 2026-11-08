"use client";

// ============================================================
// RevenueClient — admin revenue dashboard surface.
//
// All charts are vanilla SVG so no external chart library is
// pulled in. Sections render in priority order:
//   1. KPI strip            (MRR, ARR, Students, ARPU, Churn, LTV)
//   2. 30d momentum         (new subs, cancellations, refunds, past-due)
//   3. MRR trend sparkline  (from revenue_snapshots)
//   4. Forecast band        (3 / 6 / 12 month projection)
//   5. Pie + tier table     (where revenue comes from)
//   6. Cohort retention     (signup-month rows × months-later columns)
//   7. Dunning queue        (past-due students with amounts owed)
//   8. Per-tutor revenue    (top earners by attribution)
//   9. Status breakdown     (Stripe statuses)
// ============================================================

import { useState, useTransition } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Calculator,
  Info,
  RefreshCw,
  Activity,
  Target,
  Loader2,
  Receipt,
  BookmarkX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoney, fmtPct, fmtPctRatio, fmtMonth } from "./_components/format";
import { PieChart } from "./_components/PieChart";
import { MrrSparkline } from "./_components/MrrSparkline";
import { Kpi, MomentumCard, ForecastTile, StatusPill, CohortCell } from "./_components/atoms";
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

export default function RevenueClient({ data, snapshotAction }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [snapMsg, setSnapMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const slices = data.tiers.map((t) => ({
    tier: t.tier,
    label: t.label,
    value: t.revenue,
    color: t.color,
  }));

  function handleSnapshot() {
    setSnapMsg(null);
    startTransition(async () => {
      const r = await snapshotAction();
      if (r.ok) setSnapMsg(`Captured: ${fmtMoney(r.mrr)} MRR.`);
      else setSnapMsg(`Error: ${r.error}`);
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
      {/* ─── Header ─────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[color:var(--good)]">Admin</p>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-[color:var(--ink)]">
            <DollarSign className="h-6 w-6 text-[color:var(--good)]" />
            Revenue
          </h1>
          <p className="mt-1 text-xs text-[color:var(--mute)]">
            Computed from active subscriptions and one-time purchases in the trailing 30 days. As of{" "}
            {new Date(data.asOf).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            .
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleSnapshot}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--good)_40%,transparent)] bg-[color-mix(in_srgb,var(--good)_10%,transparent)] px-3 py-1.5 text-xs font-semibold text-[color:var(--good)] hover:bg-[color-mix(in_srgb,var(--good)_15%,transparent)] disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Snapshot now
          </button>
          {snapMsg && <span className="text-[10px] text-[color:var(--good)]">{snapMsg}</span>}
        </div>
      </header>

      {/* ─── KPI strip — 6 cards ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi
          label="MRR"
          value={fmtMoney(data.totalMrr)}
          icon={<DollarSign className="h-4 w-4" />}
          accent="emerald"
        />
        <Kpi
          label="ARR (run-rate)"
          value={fmtMoney(data.totalArr)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="blue"
        />
        <Kpi
          label="Students"
          value={data.totalStudents.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
          accent="violet"
        />
        <Kpi
          label="ARPU"
          value={fmtMoney(data.arpu)}
          icon={<Calculator className="h-4 w-4" />}
          accent="amber"
          hint="Avg / student / mo"
        />
        <Kpi
          label="Churn (mo)"
          value={fmtPctRatio(data.monthlyChurnRate)}
          icon={<Activity className="h-4 w-4" />}
          accent="rose"
          hint={
            data.monthlyChurnRate === 0 ? "No cancels in last 30d" : "Last 30d / start-of-period"
          }
        />
        <Kpi
          label="LTV"
          value={data.ltv == null ? "—" : fmtMoney(data.ltv)}
          icon={<Target className="h-4 w-4" />}
          accent="teal"
          hint={data.ltv == null ? "Needs churn data" : "ARPU ÷ monthly churn"}
        />
      </div>

      {/* ─── 30d momentum ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MomentumCard
          label="New subs (30d)"
          value={data.newSubs30d}
          direction="up"
          color="emerald"
        />
        <MomentumCard
          label="Cancellations (30d)"
          value={data.cancellations30d}
          direction="down"
          color="rose"
        />
        <MomentumCard
          label="Refunds issued (30d)"
          value={data.refunds30dCount}
          direction="down"
          color="rose"
          hint={
            data.refunds30dDollars > 0
              ? `${fmtMoney(data.refunds30dDollars)} refunded`
              : "No refunds yet"
          }
        />
        <MomentumCard
          label="Past-due now"
          value={data.dunning.length}
          direction="down"
          color="amber"
          hint={
            data.dunning.length > 0
              ? `~${fmtMoney(data.dunning.reduce((s, d) => s + d.amountOwed, 0))} at risk`
              : undefined
          }
        />
      </div>

      {/* ─── MRR trend sparkline ─────────────────────────── */}
      <section className="rounded-xl border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-[color:var(--ink)]">
            <Activity className="h-4 w-4 text-[color:var(--good)]" />
            MRR trend
          </h2>
          <span className="text-[10px] text-[color:var(--mute)]">Last {data.snapshots.length} snapshots</span>
        </div>
        <MrrSparkline snapshots={data.snapshots} />
      </section>

      {/* ─── Forecast band ────────────────────────────────── */}
      <section className="rounded-xl border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5">
        <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-[color:var(--ink)]">
          <TrendingUp className="h-4 w-4 text-[color:var(--info)]" />
          Forecast at current pace
        </h2>
        <p className="mb-3 text-[10px] text-[color:var(--mute)]">
          Net new MRR/mo:{" "}
          <span
            className={cn(
              "font-semibold",
              data.forecast.monthlyNetNewMrr >= 0 ? "text-[color:var(--good)]" : "text-[color:var(--late)]"
            )}
          >
            {data.forecast.monthlyNetNewMrr >= 0 ? "+" : ""}
            {fmtMoney(data.forecast.monthlyNetNewMrr)}
          </span>{" "}
          · Net new students/mo:{" "}
          <span
            className={cn(
              "font-semibold",
              data.forecast.monthlyNetNewSubs >= 0 ? "text-[color:var(--good)]" : "text-[color:var(--late)]"
            )}
          >
            {data.forecast.monthlyNetNewSubs >= 0 ? "+" : ""}
            {data.forecast.monthlyNetNewSubs.toFixed(1)}
          </span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          <ForecastTile label="in 3 months" value={data.forecast.in3Months} />
          <ForecastTile label="in 6 months" value={data.forecast.in6Months} />
          <ForecastTile label="in 12 months" value={data.forecast.in12Months} />
        </div>
      </section>

      {/* ─── Pie + tier breakdown ─────────────────────── */}
      <section className="rounded-xl border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[color:var(--ink)]">
            Where the revenue comes from
          </h2>
          <span className="text-[10px] text-[color:var(--mute)]">Hover a slice to highlight</span>
        </div>
        <div className="grid items-center gap-6 md:grid-cols-[260px_1fr]">
          <div className="flex justify-center">
            <PieChart
              slices={slices}
              total={data.totalMrr}
              hovered={hovered}
              onHover={setHovered}
            />
          </div>
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--line)] text-[10px] uppercase tracking-wider text-[color:var(--mute)]">
                  <th className="py-2 text-left font-semibold">Tier</th>
                  <th className="py-2 text-right font-semibold">Students</th>
                  <th className="py-2 text-right font-semibold">Revenue / mo</th>
                  <th className="py-2 text-right font-semibold">% of revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.tiers.map((t) => {
                  const isHovered = hovered === t.tier;
                  return (
                    <tr
                      key={t.tier}
                      onMouseEnter={() => setHovered(t.tier)}
                      onMouseLeave={() => setHovered(null)}
                      className={cn(
                        "border-b border-[color-mix(in_srgb,var(--line)_60%,transparent)] transition-colors",
                        isHovered ? "bg-[color-mix(in_srgb,var(--card)_4%,transparent)]" : ""
                      )}
                    >
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ background: t.color }}
                          />
                          <div>
                            <p
                              className={cn(
                                "text-sm font-semibold",
                                isHovered ? "text-[color:var(--ink)]" : "text-[color:var(--ink)]"
                              )}
                            >
                              {t.label}
                            </p>
                            <p className="text-[10px] text-[color:var(--mute)]">
                              {t.model === "subscription"
                                ? `${fmtMoney(t.price)}/mo subscription`
                                : `${fmtMoney(t.price)} one-time`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right tabular-nums text-[color:var(--ink)]">{t.studentCount}</td>
                      <td className="text-right tabular-nums">
                        <p className="font-semibold text-[color:var(--ink)]">{fmtMoney(t.revenue)}</p>
                        <p className="text-[10px] text-[color:var(--mute)]">{t.unitsLabel}</p>
                      </td>
                      <td className="text-right tabular-nums text-[color:var(--ink)]">
                        {fmtPct(t.revenue, data.monthRevenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-3 text-sm font-bold text-[color:var(--ink)]">Total</td>
                  <td className="pt-3 text-right font-bold tabular-nums text-[color:var(--ink)]">
                    {data.tiers.reduce((sum, t) => sum + t.studentCount, 0)}
                  </td>
                  <td className="pt-3 text-right font-bold tabular-nums text-[color:var(--good)]">
                    {fmtMoney(data.monthRevenue)}
                  </td>
                  <td className="pt-3 text-right tabular-nums text-[color:var(--mute)]">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Cohort retention ─────────────────────────────── */}
      <section className="rounded-xl border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5">
        <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-[color:var(--ink)]">
          <Users className="h-4 w-4 text-[color:var(--accent-text)]" />
          Cohort retention
        </h2>
        <p className="mb-4 text-[10px] text-[color:var(--mute)]">
          Each row is a signup-month cohort. Cells show how many of that cohort were still active at
          month 0 / 1 / 3 / 6 since signup. Future months show &ldquo;—&rdquo;.
        </p>
        {data.cohorts.length === 0 ? (
          <div className="py-8 text-center text-xs text-[color:var(--mute)]">No cohorts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] text-[10px] uppercase tracking-wider text-[color:var(--mute)]">
                <th className="py-2 text-left font-semibold">Cohort</th>
                <th className="py-2 text-right font-semibold">Size</th>
                <th className="py-2 text-right font-semibold">M0</th>
                <th className="py-2 text-right font-semibold">M1</th>
                <th className="py-2 text-right font-semibold">M3</th>
                <th className="py-2 text-right font-semibold">M6</th>
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((c) => (
                <tr key={c.month} className="border-b border-[color-mix(in_srgb,var(--line)_60%,transparent)]">
                  <td className="py-2.5 font-semibold text-[color:var(--ink)]">{fmtMonth(c.month)}</td>
                  <td className="text-right tabular-nums text-[color:var(--ink)]">{c.size}</td>
                  {c.counts.map((cnt, i) => (
                    <td key={i} className="text-right tabular-nums">
                      {cnt === null ? (
                        <span className="text-[color:var(--mute)]">—</span>
                      ) : (
                        <CohortCell active={cnt} total={c.size} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ─── Dunning queue ────────────────────────────────── */}
      <section className="rounded-xl border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5">
        <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-[color:var(--ink)]">
          <BookmarkX className="h-4 w-4 text-[color:var(--warn)]" />
          Dunning queue
          <span className="text-[10px] font-normal text-[color:var(--mute)]">
            ({data.dunning.length} past-due)
          </span>
        </h2>
        {data.dunning.length === 0 ? (
          <div className="py-6 text-center text-xs text-[color:var(--good)]">
            No past-due subscriptions.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] text-[10px] uppercase tracking-wider text-[color:var(--mute)]">
                <th className="py-2 text-left font-semibold">Student</th>
                <th className="py-2 text-left font-semibold">Tier</th>
                <th className="py-2 text-right font-semibold">Amount at risk</th>
              </tr>
            </thead>
            <tbody>
              {data.dunning.map((d, i) => (
                <tr key={i} className="border-b border-[color-mix(in_srgb,var(--line)_60%,transparent)]">
                  <td className="py-2.5">
                    <p className="text-sm font-semibold text-[color:var(--ink)]">{d.name}</p>
                    {d.email && <p className="text-[10px] text-[color:var(--mute)]">{d.email}</p>}
                  </td>
                  <td className="text-xs text-[color:var(--ink)]">{d.tier}</td>
                  <td className="text-right font-semibold tabular-nums text-[color:var(--warn)]">
                    {fmtMoney(d.amountOwed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ─── Per-tutor revenue ────────────────────────────── */}
      <section className="rounded-xl border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5">
        <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-[color:var(--ink)]">
          <Receipt className="h-4 w-4 text-[color:var(--info)]" />
          Per-tutor revenue (last 30d)
        </h2>
        {data.tutorRevenue.length === 0 ? (
          <div className="py-6 text-center text-xs text-[color:var(--mute)]">
            No tutor-attributed revenue in the last 30 days.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--line)] text-[10px] uppercase tracking-wider text-[color:var(--mute)]">
                <th className="py-2 text-left font-semibold">Tutor</th>
                <th className="py-2 text-right font-semibold">Sessions</th>
                <th className="py-2 text-right font-semibold">Attributed revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.tutorRevenue.map((t) => (
                <tr key={t.tutorId} className="border-b border-[color-mix(in_srgb,var(--line)_60%,transparent)]">
                  <td className="py-2.5 font-semibold text-[color:var(--ink)]">{t.name}</td>
                  <td className="text-right tabular-nums text-[color:var(--ink)]">{t.sessions}</td>
                  <td className="text-right font-semibold tabular-nums text-[color:var(--good)]">
                    {fmtMoney(t.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ─── Subscription status breakdown ─────────────── */}
      <section className="rounded-xl border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[color:var(--ink)]">
          Subscription status
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatusPill label="Active" count={data.statusCounts.active ?? 0} color="emerald" />
          <StatusPill label="Past due" count={data.statusCounts.past_due ?? 0} color="amber" />
          <StatusPill label="Canceled" count={data.statusCounts.canceled ?? 0} color="rose" />
          <StatusPill label="Incomplete" count={data.statusCounts.incomplete ?? 0} color="slate" />
        </div>
      </section>

      {/* ─── Footer note ──────────────────────────────────── */}
      <section className="rounded-xl border border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_40%,transparent)] p-5">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info)]" />
          <div className="text-xs leading-relaxed text-[color:var(--ink)]">
            <p className="mb-1 font-semibold text-[color:var(--ink)]">Production swap-in</p>
            <p>
              Numbers come from Supabase. When the customer base grows, swap the queries inside{" "}
              <span className="font-mono text-[color:var(--mute)]">getRevenueMetrics()</span> for{" "}
              <span className="font-mono text-[color:var(--mute)]">stripe.subscriptions.list()</span> grouped by
              Stripe price id — the return shape doesn&apos;t change. Snapshots populate from the
              &ldquo;Snapshot now&rdquo; button (or wire it to a Vercel Cron / pg_cron nightly).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
