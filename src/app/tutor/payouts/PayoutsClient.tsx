"use client";

// ============================================================
// PayoutsClient — the two big buttons + eligible-sessions table
// + payout history list. All money calculations happen server-side
// in actions.ts; the client just shows previews of the math.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Banknote, CreditCard, Loader2, CheckCircle2, AlertTriangle,
  Calendar, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { actionRequestPayout, type PayoutMethod, type PayoutResult } from "./actions";
import type { TutorEarningsSession, TutorPayoutRequestSummary } from "@/lib/supabase/queries/earnings";

const APP_FEE_INSTANT = 0.025;
const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

interface Props {
  pendingAmount: number;
  eligibleSessions: TutorEarningsSession[];
  history: TutorPayoutRequestSummary[];
  /** True if the tutor has a debit card on file (instant payouts eligible). */
  instantAvailable: boolean;
  /** Map student_user_id → total session count with this tutor.
   *  Renders as "(N)" next to recurring student names. */
  studentSessionCounts: Record<string, number>;
}

export default function PayoutsClient({
  pendingAmount, eligibleSessions, history, instantAvailable, studentSessionCounts,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<PayoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalHours = eligibleSessions.reduce((s, e) => s + (e.tutor_hours ?? 0), 0);
  const instantNet  = round2(pendingAmount * (1 - APP_FEE_INSTANT));
  const instantFee  = round2(pendingAmount * APP_FEE_INSTANT);

  function request(method: PayoutMethod) {
    if (!confirm(method === "instant"
      ? `Pay out ${fmt.format(instantNet)} instantly to your debit card? (2.5% fee applied to ${fmt.format(pendingAmount)} gross.)`
      : `Pay out ${fmt.format(pendingAmount)} via ACH? Arrives in 2-3 business days.`
    )) return;

    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const res = await actionRequestPayout(method);
        setResult(res);
        router.refresh();
      } catch (err) {
        setError(humanize(err));
      }
    });
  }

  // ── Already-succeeded confirmation ──────────────────
  if (result) {
    return (
      <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
              Payout {result.method === "instant" ? "sent instantly" : "scheduled"}
            </h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-300/90 mt-1">
              {fmt.format(result.net_amount)} {result.arrival_estimate}.
              {result.fee_amount > 0 && (
                <> A 2.5% fee was applied.</>
              )}
            </p>
            <ul className="mt-3 text-xs text-emerald-700 dark:text-emerald-300/80 space-y-0.5">
              <li>{result.booking_count} session{result.booking_count === 1 ? "" : "s"}</li>
              <li>{result.total_hours.toFixed(2)} hours</li>
              <li className="font-mono">request id: {result.request_id}</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero — pending + 2 buttons ─────────────────── */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6">
        <div className="flex items-baseline gap-3 flex-wrap">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending</div>
          <div className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {fmt.format(pendingAmount)}
          </div>
        </div>
        <div className="text-sm text-slate-500 mt-1">
          {eligibleSessions.length} session{eligibleSessions.length === 1 ? "" : "s"} ·{" "}
          {totalHours.toFixed(2)} hours
        </div>

        {pendingAmount === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center">
            <p className="text-sm text-slate-500">
              No pending earnings. Send recap emails to mark sessions for payout.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {/* Instant button — disabled when no debit card on file */}
            {instantAvailable ? (
              <button
                onClick={() => request("instant")}
                disabled={isPending}
                className="group rounded-xl border-2 border-blue-500 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-left p-4 text-white transition"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80">
                  <CreditCard className="w-4 h-4" />
                  Instant — to debit card
                </div>
                <div className="mt-2 text-2xl font-extrabold tabular-nums">
                  {fmt.format(instantNet)}
                </div>
                <div className="mt-1 text-xs opacity-80">
                  After 2.5% fee · arrives in seconds
                </div>
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mt-3" />
                ) : null}
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/40">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <CreditCard className="w-4 h-4" />
                  Instant — locked
                </div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-snug">
                  Instant payouts require a debit card on file. Add one in Payment Settings to unlock.
                </div>
                <Link
                  href="/tutor/settings/payment"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Add debit card →
                </Link>
              </div>
            )}

            {/* Standard button */}
            <button
              onClick={() => request("standard")}
              disabled={isPending}
              className="group rounded-xl border border-slate-300 dark:border-slate-700 hover:border-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-left p-4 transition bg-white dark:bg-slate-900"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Banknote className="w-4 h-4" />
                ACH — to bank account
              </div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {fmt.format(pendingAmount)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                No fee · arrives in 2-3 business days
              </div>
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mt-3 text-slate-400" />
              ) : null}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </section>

      {/* ── Eligible sessions ─────────────────────────── */}
      {eligibleSessions.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Sessions in this payout ({eligibleSessions.length})
          </h2>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-900">
                <tr className="text-left text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-950">
                {eligibleSessions.map((s) => (
                  <tr key={s.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <Calendar className="w-3 h-3 inline mr-1.5 text-slate-400" />
                      {formatDate(s.scheduled_start)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-900 dark:text-white font-medium truncate max-w-[16rem]">
                      {studentName(s, studentSessionCounts)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-400">
                      <Clock className="w-3 h-3 inline mr-1 text-slate-400" />
                      {s.tutor_hours?.toFixed(2) ?? "—"}h
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                      {s.payout_amount != null ? fmt.format(s.payout_amount) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── History ───────────────────────────────────── */}
      {history.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Payout history
          </h2>
          <ul className="space-y-2">
            {history.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <HistoryStatusPill status={p.status} />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {fmt.format(p.net_amount ?? p.total_amount)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {p.booking_count ?? 0} session{p.booking_count === 1 ? "" : "s"} ·{" "}
                      {p.total_hours.toFixed(2)}h
                      {p.payout_method && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="uppercase tracking-wider text-[10px] font-semibold">
                            {p.payout_method === "instant" ? "Instant" : p.payout_method === "standard" ? "ACH" : p.payout_method}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 text-right shrink-0">
                  {formatDate(p.requested_at)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function studentName(s: TutorEarningsSession, counts: Record<string, number> = {}): string {
  // For 1:1 sessions: student name with "(N)" if recurring (≥ 2 sessions).
  // For group sessions: cohort name + enrollment count.
  if (s.cohort) {
    const count = s.enrolled?.length ?? 0;
    return `${s.cohort.name} · ${count} enrolled`;
  }
  const first = s.enrolled?.[0];
  if (!first) return "—";
  const base = [first.first_name, first.last_name].filter(Boolean).join(" ") || first.email || "Student";
  const n = counts[first.id] ?? 0;
  return n > 1 ? `${base} (${n})` : base;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

function humanize(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === "not_onboarded")           return "Finish Stripe onboarding before requesting a payout.";
  if (msg === "payouts_not_enabled")     return "Stripe hasn't approved your account for payouts yet — check your settings page.";
  if (msg === "instant_not_available")   return "Instant payouts require a US debit card. Add one in Payment Settings, then try again. (ACH still works without a card.)";
  if (msg === "no_eligible_sessions")    return "No sessions ready for payout. Send recap emails to mark sessions as eligible.";
  if (msg === "zero_amount")             return "Pending amount is zero.";
  if (msg.startsWith("transfer_failed:")) return `Stripe couldn't move money to your account: ${msg.slice("transfer_failed: ".length)}`;
  if (msg.startsWith("payout_failed:"))   return `Money is in your Stripe balance, but the payout to your bank/card failed: ${msg.slice("payout_failed: ".length)}. Contact admin.`;
  return msg;
}

function HistoryStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_approval: { label: "In progress",         cls: "bg-blue-100 dark:bg-blue-400/15 text-blue-700 dark:text-blue-300" },
    approved:         { label: "Payment in flight",   cls: "bg-purple-100 dark:bg-purple-400/15 text-purple-700 dark:text-purple-300" },
    paid:             { label: "Paid",                cls: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    cancelled:        { label: "Cancelled",           cls: "bg-slate-200 dark:bg-slate-800 text-slate-500" },
    failed:           { label: "Failed",              cls: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  };
  const m = map[status] ?? { label: status, cls: "bg-slate-100 dark:bg-slate-800 text-slate-500" };
  return (
    <span className={cn("px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap", m.cls)}>
      {m.label}
    </span>
  );
}
