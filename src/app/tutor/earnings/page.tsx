// ============================================================
// /tutor/earnings — slim home dashboard.
//
// What's here (intentionally minimal):
//   · 3 lifetime metric cards
//   · "Request payout" CTA → /tutor/payouts (disabled if pending=$0)
//   · "View earning data" CTA → /tutor/earnings/data
//      (time-range dropdown + sessions table + analytics chart
//       all live on that detailed page now)
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  Wallet, Clock, DollarSign, ArrowRight, BarChart3,
} from "lucide-react";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchTutorEarningsSummary } from "@/lib/supabase/queries/earnings";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Earnings — Karman" };
export const dynamic = "force-dynamic";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmtHours = (n: number) => `${n.toFixed(2)}h`;

export default async function TutorEarningsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/auth/sign-in");

  const role = await fetchUserRole(clerkId);
  if (role !== "tutor" && role !== "admin") redirect("/dashboard/student");

  const supabase = createAdminClient();
  const { data: caller } = await supabase
    .from("users").select("id").eq("clerk_id", clerkId).maybeSingle();
  if (!caller) redirect("/auth/sign-in");

  const summary = await fetchTutorEarningsSummary(caller.id as string);
  const canRequestPayout = summary.pending_amount > 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Header ────────────────────────────────── */}
        <header>
          <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-1">
            Tutor Portal
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            My earnings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Refreshed {timeSince(summary.last_refreshed_at)} ago
          </p>
        </header>

        {/* ── 3 lifetime cards ──────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <MetricCard
            icon={<Clock className="w-4 h-4" />}
            label="Total hours (lifetime)"
            value={fmtHours(summary.total_hours_worked)}
            tone="slate"
          />
          <MetricCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Lifetime earned"
            value={fmt.format(summary.total_earnings)}
            tone="emerald"
            footer={`${fmt.format(summary.paid_amount)} paid · ${summary.sessions_paid} session${summary.sessions_paid === 1 ? "" : "s"}`}
          />
          <MetricCard
            icon={<Wallet className="w-4 h-4" />}
            label="Pending payout"
            value={fmt.format(summary.pending_amount)}
            tone={summary.pending_amount > 0 ? "blue" : "slate"}
            footer={`${summary.sessions_with_recap - summary.sessions_paid} session${summary.sessions_with_recap - summary.sessions_paid === 1 ? "" : "s"} ready`}
          />
        </section>

        {/* ── Two CTAs — primary = Request payout, secondary = View data ── */}
        <section className="grid sm:grid-cols-2 gap-3">
          <Link
            href="/tutor/payouts"
            aria-disabled={!canRequestPayout}
            className={cn(
              "rounded-xl border-2 p-5 transition flex items-start justify-between gap-3",
              canRequestPayout
                ? "border-blue-500 bg-blue-600 hover:bg-blue-700 text-white"
                : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-400 cursor-not-allowed pointer-events-none"
            )}
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                <Wallet className="w-4 h-4" /> Request payout
              </div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums">
                {fmt.format(summary.pending_amount)}
              </div>
              <div className="mt-1 text-xs opacity-80">
                {canRequestPayout
                  ? `${summary.sessions_with_recap - summary.sessions_paid} session${summary.sessions_with_recap - summary.sessions_paid === 1 ? "" : "s"} ready · pick Instant or ACH`
                  : "No pending earnings — send recaps to mark sessions as eligible."}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 mt-1 shrink-0" />
          </Link>

          <Link
            href="/tutor/earnings/data"
            className="rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-blue-400 dark:hover:border-blue-500/40 p-5 transition flex items-start justify-between gap-3 group"
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" /> View earning data
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Sessions, history, trends
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Filter by today, week, month, or any range. See per-session earnings + a 12-week chart.
              </div>
            </div>
            <ArrowRight className="w-5 h-5 mt-1 shrink-0 text-slate-400 group-hover:text-blue-500 transition" />
          </Link>
        </section>

        {/* ── Light footer guidance ──────────────────── */}
        <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
          Pay = $35/hour, rounded down to 15-min increments. Same rate for 1:1 and group sessions.
        </p>
      </div>
    </DashboardLayout>
  );
}

// ──────────────────────────────────────────────────────────
// Components
// ──────────────────────────────────────────────────────────
function MetricCard({
  icon, label, value, tone, footer,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "slate" | "blue" | "emerald";
  footer?: string;
}) {
  const tones = {
    slate:   "border-slate-200 dark:border-slate-800",
    blue:    "border-blue-300 dark:border-blue-500/40 bg-blue-50/40 dark:bg-blue-500/5",
    emerald: "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-500/5",
  };
  return (
    <div className={cn("rounded-xl border bg-white dark:bg-slate-900/60 px-4 py-4", tones[tone])}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
        {value}
      </div>
      {footer && (
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">{footer}</div>
      )}
    </div>
  );
}

function timeSince(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60)    return `${seconds}s`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
