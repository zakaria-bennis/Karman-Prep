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
  Banknote,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { actionRequestPayout, type PayoutMethod, type PayoutResult } from "./actions";
import type {
  TutorEarningsSession,
  TutorPayoutRequestSummary,
} from "@/lib/supabase/queries/earnings";

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
  pendingAmount,
  eligibleSessions,
  history,
  instantAvailable,
  studentSessionCounts,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<PayoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalHours = eligibleSessions.reduce((s, e) => s + (e.tutor_hours ?? 0), 0);
  const instantNet = round2(pendingAmount * (1 - APP_FEE_INSTANT));

  function request(method: PayoutMethod) {
    if (
      !confirm(
        method === "instant"
          ? `Pay out ${fmt.format(instantNet)} instantly to your debit card? (2.5% fee applied to ${fmt.format(pendingAmount)} gross.)`
          : `Pay out ${fmt.format(pendingAmount)} via ACH? Arrives in 2-3 business days.`
      )
    )
      return;

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
      <div className="rounded-xl border border-success/40 bg-success/10 p-6 dark:border-success/40 dark:bg-success/10">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-success dark:text-success" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-success dark:text-success-bright">
              Payout {result.method === "instant" ? "sent instantly" : "scheduled"}
            </h2>
            <p className="mt-1 text-sm text-success dark:text-success-bright/90">
              {fmt.format(result.net_amount)} {result.arrival_estimate}.
              {result.fee_amount > 0 && <> A 2.5% fee was applied.</>}
            </p>
            <ul className="mt-3 space-y-0.5 text-xs text-success dark:text-success-bright/80">
              <li>
                {result.booking_count} session{result.booking_count === 1 ? "" : "s"}
              </li>
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
      <section className="rounded-xl border border-bronze bg-surface p-6 dark:border-bronze dark:bg-surface/60">
        <div className="flex flex-wrap items-baseline gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-taupe">Pending</div>
          <div className="text-4xl font-extrabold tabular-nums text-ivory dark:text-ivory">
            {fmt.format(pendingAmount)}
          </div>
        </div>
        <div className="mt-1 text-sm text-taupe">
          {eligibleSessions.length} session{eligibleSessions.length === 1 ? "" : "s"} ·{" "}
          {totalHours.toFixed(2)} hours
        </div>

        {pendingAmount === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-bronze p-4 text-center dark:border-bronze">
            <p className="text-sm text-taupe">
              No pending earnings. Send recap emails to mark sessions for payout.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {/* Instant button — disabled when no debit card on file */}
            {instantAvailable ? (
              <button
                onClick={() => request("instant")}
                disabled={isPending}
                className="group rounded-xl border-2 border-info/40 bg-info p-4 text-left text-ivory transition hover:bg-info-bright disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80">
                  <CreditCard className="h-4 w-4" />
                  Instant — to debit card
                </div>
                <div className="mt-2 text-2xl font-extrabold tabular-nums">
                  {fmt.format(instantNet)}
                </div>
                <div className="mt-1 text-xs opacity-80">After 2.5% fee · arrives in seconds</div>
                {isPending ? <Loader2 className="mt-3 h-4 w-4 animate-spin" /> : null}
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-bronze bg-surface p-4 dark:border-bronze dark:bg-surface/40">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-taupe">
                  <CreditCard className="h-4 w-4" />
                  Instant — locked
                </div>
                <div className="mt-2 text-sm leading-snug text-taupe dark:text-taupe">
                  Instant payouts require a debit card on file. Add one in Payment Settings to
                  unlock.
                </div>
                <Link
                  href="/tutor/settings/payment"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-info hover:underline dark:text-info"
                >
                  Add debit card →
                </Link>
              </div>
            )}

            {/* Standard button */}
            <button
              onClick={() => request("standard")}
              disabled={isPending}
              className="group rounded-xl border border-bronze bg-surface p-4 text-left transition hover:border-success/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-bronze dark:bg-surface"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-success dark:text-success">
                <Banknote className="h-4 w-4" />
                ACH — to bank account
              </div>
              <div className="mt-2 text-2xl font-extrabold tabular-nums text-ivory dark:text-ivory">
                {fmt.format(pendingAmount)}
              </div>
              <div className="mt-1 text-xs text-taupe">No fee · arrives in 2-3 business days</div>
              {isPending ? <Loader2 className="mt-3 h-4 w-4 animate-spin text-taupe" /> : null}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error dark:border-error/40 dark:bg-error/10 dark:text-error-bright">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </section>

      {/* ── Eligible sessions ─────────────────────────── */}
      {eligibleSessions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-ivory dark:text-ivory">
            Sessions in this payout ({eligibleSessions.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-bronze dark:border-bronze">
            <table className="w-full text-sm">
              <thead className="bg-surface dark:bg-surface">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-taupe dark:text-taupe">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-surface dark:bg-night">
                {eligibleSessions.map((s) => (
                  <tr key={s.id} className="border-t border-bronze dark:border-bronze">
                    <td className="whitespace-nowrap px-4 py-2.5 text-ivory dark:text-ivory">
                      <Calendar className="mr-1.5 inline h-3 w-3 text-taupe" />
                      {formatDate(s.scheduled_start)}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-2.5 font-medium text-ivory dark:text-ivory">
                      {studentName(s, studentSessionCounts)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-taupe dark:text-taupe">
                      <Clock className="mr-1 inline h-3 w-3 text-taupe" />
                      {s.tutor_hours?.toFixed(2) ?? "—"}h
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ivory dark:text-ivory">
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
          <h2 className="mb-3 text-sm font-bold text-ivory dark:text-ivory">Payout history</h2>
          <ul className="space-y-2">
            {history.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-bronze bg-surface px-4 py-3 dark:border-bronze dark:bg-surface/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <HistoryStatusPill status={p.status} />
                  <div className="min-w-0">
                    <div className="font-bold tabular-nums text-ivory dark:text-ivory">
                      {fmt.format(p.net_amount ?? p.total_amount)}
                    </div>
                    <div className="text-xs text-taupe">
                      {p.booking_count ?? 0} session{p.booking_count === 1 ? "" : "s"} ·{" "}
                      {p.total_hours.toFixed(2)}h
                      {p.payout_method && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            {p.payout_method === "instant"
                              ? "Instant"
                              : p.payout_method === "standard"
                                ? "ACH"
                                : p.payout_method}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-taupe">
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
  const base =
    [first.first_name, first.last_name].filter(Boolean).join(" ") || first.email || "Student";
  const n = counts[first.id] ?? 0;
  return n > 1 ? `${base} (${n})` : base;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function humanize(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === "not_onboarded") return "Finish Stripe onboarding before requesting a payout.";
  if (msg === "payouts_not_enabled")
    return "Stripe hasn't approved your account for payouts yet — check your settings page.";
  if (msg === "instant_not_available")
    return "Instant payouts require a US debit card. Add one in Payment Settings, then try again. (ACH still works without a card.)";
  if (msg === "no_eligible_sessions")
    return "No sessions ready for payout. Send recap emails to mark sessions as eligible.";
  if (msg === "zero_amount") return "Pending amount is zero.";
  if (msg.startsWith("transfer_failed:"))
    return `Stripe couldn't move money to your account: ${msg.slice("transfer_failed: ".length)}`;
  if (msg.startsWith("payout_failed:"))
    return `Money is in your Stripe balance, but the payout to your bank/card failed: ${msg.slice("payout_failed: ".length)}. Contact admin.`;
  return msg;
}

function HistoryStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_approval: {
      label: "In progress",
      cls: "bg-info/10 dark:bg-info/15 text-info dark:text-info-bright",
    },
    approved: {
      label: "Payment in flight",
      cls: "bg-gold/10 dark:bg-gold/15 text-gold dark:text-gold-bright",
    },
    paid: {
      label: "Paid",
      cls: "bg-success/10 dark:bg-success/15 text-success dark:text-success-bright",
    },
    cancelled: { label: "Cancelled", cls: "bg-surface dark:bg-surface-raised text-taupe" },
    failed: {
      label: "Failed",
      cls: "bg-error/10 dark:bg-error/15 text-error dark:text-error-bright",
    },
  };
  const m = map[status] ?? { label: status, cls: "bg-surface dark:bg-surface-raised text-taupe" };
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
        m.cls
      )}
    >
      {m.label}
    </span>
  );
}
