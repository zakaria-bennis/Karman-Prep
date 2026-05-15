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
import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import { Wallet, Clock, DollarSign, ArrowRight, BarChart3 } from "lucide-react";
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
  const { userId: clerkId } = await safeAuth();
  if (!clerkId) redirect("/auth/sign-in");

  const role = await fetchUserRole(clerkId);
  if (role !== "tutor" && role !== "admin") redirect("/dashboard/student");

  const supabase = createAdminClient();
  const { data: caller } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!caller) redirect("/auth/sign-in");

  const summary = await fetchTutorEarningsSummary(caller.id as string);
  const canRequestPayout = summary.pending_amount > 0;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        {/* ── Header ────────────────────────────────── */}
        <header>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-500">
            Tutor Portal
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">My earnings</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Refreshed {timeSince(summary.last_refreshed_at)} ago
          </p>
        </header>

        {/* ── 3 lifetime cards ──────────────────────── */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <MetricCard
            icon={<Clock className="h-4 w-4" />}
            label="Total hours (lifetime)"
            value={fmtHours(summary.total_hours_worked)}
            tone="slate"
          />
          <MetricCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Lifetime earned"
            value={fmt.format(summary.total_earnings)}
            tone="emerald"
            footer={`${fmt.format(summary.paid_amount)} paid · ${summary.sessions_paid} session${summary.sessions_paid === 1 ? "" : "s"}`}
          />
          <MetricCard
            icon={<Wallet className="h-4 w-4" />}
            label="Pending payout"
            value={fmt.format(summary.pending_amount)}
            tone={summary.pending_amount > 0 ? "blue" : "slate"}
            footer={`${summary.sessions_with_recap - summary.sessions_paid} session${summary.sessions_with_recap - summary.sessions_paid === 1 ? "" : "s"} ready`}
          />
        </section>

        {/* ── Two CTAs — primary = Request payout, secondary = View data ── */}
        <section className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/tutor/payouts"
            aria-disabled={!canRequestPayout}
            className={cn(
              "flex items-start justify-between gap-3 rounded-xl border-2 p-5 transition",
              canRequestPayout
                ? "border-blue-500 bg-blue-600 text-white hover:bg-blue-700"
                : "pointer-events-none cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40"
            )}
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-80">
                <Wallet className="h-4 w-4" /> Request payout
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
            <ArrowRight className="mt-1 h-5 w-5 shrink-0" />
          </Link>

          <Link
            href="/tutor/earnings/data"
            className="group flex items-start justify-between gap-3 rounded-xl border-2 border-slate-200 bg-white p-5 transition hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-500/40"
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                <BarChart3 className="h-4 w-4" /> View earning data
              </div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Sessions, history, trends
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Filter by today, week, month, or any range. See per-session earnings + a 12-week
                chart.
              </div>
            </div>
            <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-blue-500" />
          </Link>
        </section>

        {/* ── Light footer guidance ──────────────────── */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-500">
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
  icon,
  label,
  value,
  tone,
  footer,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "slate" | "blue" | "emerald";
  footer?: string;
}) {
  const tones = {
    slate: "border-slate-200 dark:border-slate-800",
    blue: "border-blue-300 dark:border-blue-500/40 bg-blue-50/40 dark:bg-blue-500/5",
    emerald: "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-500/5",
  };
  return (
    <div className={cn("rounded-xl border bg-white px-4 py-4 dark:bg-slate-900/60", tones[tone])}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-xl font-extrabold tabular-nums text-slate-900 dark:text-white sm:text-2xl">
        {value}
      </div>
      {footer && <div className="mt-1 text-xs text-slate-500 dark:text-slate-500">{footer}</div>}
    </div>
  );
}

function timeSince(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
