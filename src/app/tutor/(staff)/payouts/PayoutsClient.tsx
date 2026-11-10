"use client";

// ============================================================
// PayoutsClient — the Instant / ACH choice + eligible-sessions
// table + payout history. All money calculations happen server-side
// in actions.ts; the client just shows previews of the math.
// Rendered inside the page's `.wb` box in the painted shell.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Cta, Num, SectionHeader } from "@/components/portal";
import { WbPill, WbStats, WbTable, type Tone } from "@/components/admin/workbench";
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
      <Card>
        <SectionHeader title={`Payout ${result.method === "instant" ? "sent" : "scheduled"}`} />
        <p className="wb-alert" data-tone="ok" role="status">
          <Num>{fmt.format(result.net_amount)}</Num> {result.arrival_estimate}.
          {result.fee_amount > 0 && <> A 2.5% fee was taken.</>}
        </p>
        <p className="kp-meta">
          <Num>{result.booking_count}</Num> session{result.booking_count === 1 ? "" : "s"},{" "}
          <Num>{result.total_hours.toFixed(2)}</Num> hours.
        </p>
        <p className="wb-note">
          Request ID: <code>{result.request_id}</code>
        </p>
      </Card>
    );
  }

  const option = {
    border: "1px solid var(--line)",
    borderRadius: 4,
    padding: "12px 14px",
    minWidth: 0,
  } as const;

  return (
    <>
      <Card>
        <SectionHeader title="Ready to pay out" />
        <WbStats
          items={[
            { label: "Waiting to be paid", value: fmt.format(pendingAmount) },
            { label: "Sessions", value: eligibleSessions.length },
            { label: "Hours", value: totalHours.toFixed(2) },
          ]}
        />

        {pendingAmount === 0 ? (
          <div className="wb-empty" style={{ marginTop: 12 }}>
            <b>Nothing to pay out yet</b>
            Send the recap after each session and it becomes ready here.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            }}
          >
            <div style={option}>
              <SectionHeader as="h3" title="Instant, to your debit card" />
              {instantAvailable ? (
                <>
                  <p className="kp-meta">
                    <Num>{fmt.format(instantNet)}</Num> after the 2.5% fee. Arrives in seconds.
                  </p>
                  <Cta
                    onClick={() => request("instant")}
                    disabled={isPending}
                    aria-busy={isPending}
                  >
                    {isPending ? "Sending…" : "Pay out instantly"}
                  </Cta>
                </>
              ) : (
                <>
                  <p className="kp-meta">
                    Instant payouts need a debit card on file. Add one in payment settings.
                  </p>
                  <p className="kp-meta">
                    <Link className="kp-link" href="/tutor/settings/payment">
                      Add a debit card
                    </Link>
                  </p>
                </>
              )}
            </div>

            <div style={option}>
              <SectionHeader as="h3" title="ACH, to your bank account" />
              <p className="kp-meta">
                <Num>{fmt.format(pendingAmount)}</Num> with no fee. Arrives in 2 to 3 business days.
              </p>
              {instantAvailable ? (
                <button
                  type="button"
                  className="wb-btn"
                  style={{ marginTop: 12 }}
                  onClick={() => request("standard")}
                  disabled={isPending}
                  aria-busy={isPending}
                >
                  {isPending ? "Sending…" : "Pay out by ACH"}
                </button>
              ) : (
                <Cta onClick={() => request("standard")} disabled={isPending} aria-busy={isPending}>
                  {isPending ? "Sending…" : "Pay out by ACH"}
                </Cta>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="wb-alert" role="alert" style={{ marginTop: 12 }}>
            {error}
          </p>
        )}
      </Card>

      {eligibleSessions.length > 0 && (
        <Card>
          <SectionHeader
            title="Sessions in this payout"
            note={<Num>{eligibleSessions.length}</Num>}
          />
          <WbTable
            caption="Sessions in this payout"
            rows={eligibleSessions}
            rowKey={(s) => s.id}
            empty={null}
            columns={[
              { key: "date", label: "Date", cell: (s) => formatDate(s.scheduled_start) },
              {
                key: "student",
                label: "Student",
                cell: (s) => studentName(s, studentSessionCounts),
              },
              {
                key: "hours",
                label: "Hours",
                numeric: true,
                cell: (s) => `${s.tutor_hours?.toFixed(2) ?? "—"}h`,
              },
              {
                key: "amount",
                label: "Amount",
                numeric: true,
                cell: (s) => (s.payout_amount != null ? fmt.format(s.payout_amount) : "—"),
              },
            ]}
          />
        </Card>
      )}

      <Card>
        <SectionHeader title="Payout history" />
        <WbTable
          caption="Payout history"
          rows={history}
          rowKey={(p) => p.id}
          empty={
            <>
              <b>No payouts yet</b>
              Your payouts will show here.
            </>
          }
          columns={[
            {
              key: "amount",
              label: "Amount",
              numeric: true,
              cell: (p) => <strong>{fmt.format(p.net_amount ?? p.total_amount)}</strong>,
            },
            {
              key: "sessions",
              label: "Sessions",
              numeric: true,
              cell: (p) => p.booking_count ?? 0,
            },
            {
              key: "hours",
              label: "Hours",
              numeric: true,
              cell: (p) => `${p.total_hours.toFixed(2)}h`,
            },
            {
              key: "method",
              label: "Method",
              cell: (p) => (p.payout_method ? methodLabel(p.payout_method) : "—"),
            },
            {
              key: "status",
              label: "Status",
              cell: (p) => <HistoryStatusPill status={p.status} />,
            },
            { key: "date", label: "Requested", cell: (p) => formatDate(p.requested_at) },
          ]}
        />
      </Card>
    </>
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

const HISTORY_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending_approval: { label: "In progress", tone: "info" },
  approved: { label: "Payment in flight", tone: "info" },
  paid: { label: "Paid", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  failed: { label: "Failed", tone: "fail" },
};

function HistoryStatusPill({ status }: { status: string }) {
  const m = HISTORY_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <WbPill tone={m.tone}>{m.label}</WbPill>;
}

function methodLabel(method: string): string {
  if (method === "instant") return "Instant";
  if (method === "standard") return "ACH";
  return method;
}
