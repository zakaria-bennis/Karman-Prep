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
  AlertTriangle,
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
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-400">Admin</p>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white">
            <DollarSign className="h-6 w-6 text-emerald-400" />
            Revenue
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Computed from active + trialing subscriptions and bookings in the trailing 30 days. As
            of{" "}
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/15 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Snapshot now
          </button>
          {snapMsg && <span className="text-[10px] text-emerald-200">{snapMsg}</span>}
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
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-white">
            <Activity className="h-4 w-4 text-emerald-400" />
            MRR trend
          </h2>
          <span className="text-[10px] text-slate-400">Last {data.snapshots.length} snapshots</span>
        </div>
        <MrrSparkline snapshots={data.snapshots} />
      </section>

      {/* ─── Forecast band ────────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-white">
          <TrendingUp className="h-4 w-4 text-blue-400" />
          Forecast at current pace
        </h2>
        <p className="mb-3 text-[10px] text-slate-400">
          Net new MRR/mo:{" "}
          <span
            className={cn(
              "font-semibold",
              data.forecast.monthlyNetNewMrr >= 0 ? "text-emerald-300" : "text-rose-300"
            )}
          >
            {data.forecast.monthlyNetNewMrr >= 0 ? "+" : ""}
            {fmtMoney(data.forecast.monthlyNetNewMrr)}
          </span>{" "}
          · Net new students/mo:{" "}
          <span
            className={cn(
              "font-semibold",
              data.forecast.monthlyNetNewSubs >= 0 ? "text-emerald-300" : "text-rose-300"
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
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">
            Where the revenue comes from
          </h2>
          <span className="text-[10px] text-slate-400">Hover a slice to highlight</span>
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
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-2 text-left font-semibold">Tier</th>
                  <th className="py-2 text-right font-semibold">Students</th>
                  <th className="py-2 text-right font-semibold">Revenue / mo</th>
                  <th className="py-2 text-right font-semibold">% of MRR</th>
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
                        "border-b border-slate-800/60 transition-colors",
                        isHovered ? "bg-white/[0.04]" : ""
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
                                isHovered ? "text-white" : "text-slate-200"
                              )}
                            >
                              {t.label}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {t.model === "subscription"
                                ? `$${t.price}/mo subscription`
                                : `$${t.price}/session`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right tabular-nums text-slate-200">{t.studentCount}</td>
                      <td className="text-right tabular-nums">
                        <p className="font-semibold text-slate-100">{fmtMoney(t.revenue)}</p>
                        <p className="text-[10px] text-slate-400">{t.unitsLabel}</p>
                      </td>
                      <td className="text-right tabular-nums text-slate-300">
                        {fmtPct(t.revenue, data.totalMrr)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-3 text-sm font-bold text-slate-300">Total</td>
                  <td className="pt-3 text-right font-bold tabular-nums text-slate-100">
                    {data.totalStudents}
                  </td>
                  <td className="pt-3 text-right font-bold tabular-nums text-emerald-300">
                    {fmtMoney(data.totalMrr)}
                  </td>
                  <td className="pt-3 text-right tabular-nums text-slate-400">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        {data.usedBookingFallback && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-xs text-amber-200">
              <span className="font-semibold">Per-session revenue is estimated.</span> No bookings
              on file in the last 30 days for one or more per-session tiers, so we assumed{" "}
              <span className="font-mono">{data.estimatedSessionsPerStudent}</span>{" "}
              sessions/student/month.
            </p>
          </div>
        )}
      </section>

      {/* ─── Cohort retention ─────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-white">
          <Users className="h-4 w-4 text-violet-400" />
          Cohort retention
        </h2>
        <p className="mb-4 text-[10px] text-slate-400">
          Each row is a signup-month cohort. Cells show how many of that cohort were still active at
          month 0 / 1 / 3 / 6 since signup. Future months show &ldquo;—&rdquo;.
        </p>
        {data.cohorts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No cohorts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
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
                <tr key={c.month} className="border-b border-slate-800/60">
                  <td className="py-2.5 font-semibold text-slate-200">{fmtMonth(c.month)}</td>
                  <td className="text-right tabular-nums text-slate-300">{c.size}</td>
                  {c.counts.map((cnt, i) => (
                    <td key={i} className="text-right tabular-nums">
                      {cnt === null ? (
                        <span className="text-slate-400">—</span>
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
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-white">
          <BookmarkX className="h-4 w-4 text-amber-400" />
          Dunning queue
          <span className="text-[10px] font-normal text-slate-400">
            ({data.dunning.length} past-due)
          </span>
        </h2>
        {data.dunning.length === 0 ? (
          <div className="py-6 text-center text-xs text-emerald-300">
            No past-due subscriptions.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                <th className="py-2 text-left font-semibold">Student</th>
                <th className="py-2 text-left font-semibold">Tier</th>
                <th className="py-2 text-right font-semibold">Amount at risk</th>
              </tr>
            </thead>
            <tbody>
              {data.dunning.map((d, i) => (
                <tr key={i} className="border-b border-slate-800/60">
                  <td className="py-2.5">
                    <p className="text-sm font-semibold text-slate-200">{d.name}</p>
                    {d.email && <p className="text-[10px] text-slate-400">{d.email}</p>}
                  </td>
                  <td className="text-xs text-slate-300">{d.tier}</td>
                  <td className="text-right font-semibold tabular-nums text-amber-300">
                    {fmtMoney(d.amountOwed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ─── Per-tutor revenue ────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-white">
          <Receipt className="h-4 w-4 text-blue-400" />
          Per-tutor revenue (last 30d)
        </h2>
        {data.tutorRevenue.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No tutor-attributed revenue in the last 30 days.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                <th className="py-2 text-left font-semibold">Tutor</th>
                <th className="py-2 text-right font-semibold">Sessions</th>
                <th className="py-2 text-right font-semibold">Attributed revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.tutorRevenue.map((t) => (
                <tr key={t.tutorId} className="border-b border-slate-800/60">
                  <td className="py-2.5 font-semibold text-slate-200">{t.name}</td>
                  <td className="text-right tabular-nums text-slate-300">{t.sessions}</td>
                  <td className="text-right font-semibold tabular-nums text-emerald-300">
                    {fmtMoney(t.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ─── Subscription status breakdown ─────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">
          Subscription status
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatusPill label="Active" count={data.statusCounts.active ?? 0} color="emerald" />
          <StatusPill label="Trialing" count={data.statusCounts.trialing ?? 0} color="blue" />
          <StatusPill label="Past due" count={data.statusCounts.past_due ?? 0} color="amber" />
          <StatusPill label="Canceled" count={data.statusCounts.canceled ?? 0} color="rose" />
          <StatusPill label="Incomplete" count={data.statusCounts.incomplete ?? 0} color="slate" />
        </div>
      </section>

      {/* ─── Footer note ──────────────────────────────────── */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
          <div className="text-xs leading-relaxed text-slate-300">
            <p className="mb-1 font-semibold text-slate-100">Production swap-in</p>
            <p>
              Numbers come from Supabase. When the customer base grows, swap the queries inside{" "}
              <span className="font-mono text-slate-400">getRevenueMetrics()</span> for{" "}
              <span className="font-mono text-slate-400">stripe.subscriptions.list()</span> grouped
              by Stripe price id — the return shape doesn&apos;t change. Snapshots populate from the
              &ldquo;Snapshot now&rdquo; button (or wire it to a Vercel Cron / pg_cron nightly).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
