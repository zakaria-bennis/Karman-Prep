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
      <div className="rounded-xl border border-[color-mix(in_srgb,var(--good)_40%,transparent)] bg-[color-mix(in_srgb,var(--good)_10%,transparent)] p-6 dark:border-[color-mix(in_srgb,var(--good)_40%,transparent)] dark:bg-[color-mix(in_srgb,var(--good)_10%,transparent)]">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-[color:var(--good)] dark:text-[color:var(--good)]" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[color:var(--good)] dark:text-[color:var(--good)]">
              Payout {result.method === "instant" ? "sent instantly" : "scheduled"}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--good)] dark:text-[color-mix(in_srgb,var(--good)_90%,transparent)]">
              {fmt.format(result.net_amount)} {result.arrival_estimate}.
              {result.fee_amount > 0 && <> A 2.5% fee was applied.</>}
            </p>
            <ul className="mt-3 space-y-0.5 text-xs text-[color:var(--good)] dark:text-[color-mix(in_srgb,var(--good)_80%,transparent)]">
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
      <section className="rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] p-6 dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_60%,transparent)]">
        <div className="flex flex-wrap items-baseline gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--mute)]">Pending</div>
          <div className="text-4xl font-extrabold tabular-nums text-[color:var(--ink)] dark:text-[color:var(--ink)]">
            {fmt.format(pendingAmount)}
          </div>
        </div>
        <div className="mt-1 text-sm text-[color:var(--mute)]">
          {eligibleSessions.length} session{eligibleSessions.length === 1 ? "" : "s"} ·{" "}
          {totalHours.toFixed(2)} hours
        </div>

        {pendingAmount === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-[color:var(--line)] p-4 text-center dark:border-[color:var(--line)]">
            <p className="text-sm text-[color:var(--mute)]">
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
                className="group rounded-xl border-2 border-[color-mix(in_srgb,var(--info)_40%,transparent)] bg-[color:var(--info)] p-4 text-left text-[color:var(--ink)] transition hover:bg-[color:var(--info)] disabled:cursor-not-allowed disabled:opacity-40"
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
              <div className="rounded-xl border border-dashed border-[color:var(--line)] bg-[color:var(--card)] p-4 dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_40%,transparent)]">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--mute)]">
                  <CreditCard className="h-4 w-4" />
                  Instant — locked
                </div>
                <div className="mt-2 text-sm leading-snug text-[color:var(--mute)] dark:text-[color:var(--mute)]">
                  Instant payouts require a debit card on file. Add one in Payment Settings to
                  unlock.
                </div>
                <Link
                  href="/tutor/settings/payment"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--info)] hover:underline dark:text-[color:var(--info)]"
                >
                  Add debit card →
                </Link>
              </div>
            )}

            {/* Standard button */}
            <button
              onClick={() => request("standard")}
              disabled={isPending}
              className="group rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] p-4 text-left transition hover:border-[color-mix(in_srgb,var(--good)_40%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[color:var(--line)] dark:bg-[color:var(--card)]"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--good)] dark:text-[color:var(--good)]">
                <Banknote className="h-4 w-4" />
                ACH — to bank account
              </div>
              <div className="mt-2 text-2xl font-extrabold tabular-nums text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                {fmt.format(pendingAmount)}
              </div>
              <div className="mt-1 text-xs text-[color:var(--mute)]">No fee · arrives in 2-3 business days</div>
              {isPending ? <Loader2 className="mt-3 h-4 w-4 animate-spin text-[color:var(--mute)]" /> : null}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--late)_40%,transparent)] bg-[color-mix(in_srgb,var(--late)_10%,transparent)] px-4 py-3 text-sm text-[color:var(--late)] dark:border-[color-mix(in_srgb,var(--late)_40%,transparent)] dark:bg-[color-mix(in_srgb,var(--late)_10%,transparent)] dark:text-[color:var(--late)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </section>

      {/* ── Eligible sessions ─────────────────────────── */}
      {eligibleSessions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
            Sessions in this payout ({eligibleSessions.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-[color:var(--line)] dark:border-[color:var(--line)]">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--card)] dark:bg-[color:var(--card)]">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--mute)] dark:text-[color:var(--mute)]">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-[color:var(--card)] dark:bg-[color:var(--sunk)]">
                {eligibleSessions.map((s) => (
                  <tr key={s.id} className="border-t border-[color:var(--line)] dark:border-[color:var(--line)]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                      <Calendar className="mr-1.5 inline h-3 w-3 text-[color:var(--mute)]" />
                      {formatDate(s.scheduled_start)}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-2.5 font-medium text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                      {studentName(s, studentSessionCounts)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[color:var(--mute)] dark:text-[color:var(--mute)]">
                      <Clock className="mr-1 inline h-3 w-3 text-[color:var(--mute)]" />
                      {s.tutor_hours?.toFixed(2) ?? "—"}h
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[color:var(--ink)] dark:text-[color:var(--ink)]">
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
          <h2 className="mb-3 text-sm font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">Payout history</h2>
          <ul className="space-y-2">
            {history.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--line)] bg-[color:var(--card)] px-4 py-3 dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_60%,transparent)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <HistoryStatusPill status={p.status} />
                  <div className="min-w-0">
                    <div className="font-bold tabular-nums text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                      {fmt.format(p.net_amount ?? p.total_amount)}
                    </div>
                    <div className="text-xs text-[color:var(--mute)]">
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
                <div className="shrink-0 text-right text-xs text-[color:var(--mute)]">
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
      cls: "bg-[color-mix(in_srgb,var(--info)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--info)_15%,transparent)] text-[color:var(--info)] dark:text-[color:var(--info)]",
    },
    approved: {
      label: "Payment in flight",
      cls: "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[color:var(--accent-text)] dark:text-[color:var(--accent-text)]",
    },
    paid: {
      label: "Paid",
      cls: "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--good)_15%,transparent)] text-[color:var(--good)] dark:text-[color:var(--good)]",
    },
    cancelled: { label: "Cancelled", cls: "bg-[color:var(--card)] dark:bg-[color:var(--raised)] text-[color:var(--mute)]" },
    failed: {
      label: "Failed",
      cls: "bg-[color-mix(in_srgb,var(--late)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--late)_15%,transparent)] text-[color:var(--late)] dark:text-[color:var(--late)]",
    },
  };
  const m = map[status] ?? { label: status, cls: "bg-[color:var(--card)] dark:bg-[color:var(--raised)] text-[color:var(--mute)]" };
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
