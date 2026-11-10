"use client";

// ============================================================
// EarningsDataClient — detailed earning data view.
//
// Lives at /tutor/earnings/data. Owns:
//   · Time-range dropdown (URL-driven via ?range=)
//   · Period totals (range-scoped, not lifetime)
//   · The 12-week earnings chart
//   · Sessions table filtered by range
//   · Recent payouts table
//
// The slim /tutor/earnings page keeps the lifetime totals and the
// payout button. The painted shell gives the heading and tabs.
// ============================================================

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Num, SectionHeader } from "@/components/portal";
import { WbPill, WbStats, WbTable, type Tone } from "@/components/admin/workbench";
import { tierLabelOf } from "@/lib/scheduling/tiers";
import {
  TIME_RANGE_LABELS,
  type TimeRange,
  type TutorEarningsSummary,
  type TutorEarningsSession,
  type TutorPayoutRequestSummary,
  type WeeklyEarningsPoint,
} from "@/lib/supabase/queries/earnings";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmtHours = (n: number) => `${n.toFixed(2)}h`;

const RANGE_ORDER: TimeRange[] = ["today", "7d", "14d", "30d", "3mo", "6mo", "1y", "all"];

interface Props {
  summary: TutorEarningsSummary;
  sessions: TutorEarningsSession[];
  payouts: TutorPayoutRequestSummary[];
  weekly: WeeklyEarningsPoint[];
  range: TimeRange;
  /** Map student_user_id → total session count with this tutor.
   *  Used to render "(3)" next to recurring student names. */
  studentSessionCounts: Record<string, number>;
}

export default function EarningsDataClient({
  summary,
  sessions,
  payouts,
  weekly,
  range,
  studentSessionCounts,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const filteredHours = sessions.reduce((s, x) => s + (x.tutor_hours ?? 0), 0);
  const filteredAmount = sessions.reduce((s, x) => s + Number(x.payout_amount ?? 0), 0);
  const filteredPaid = sessions.filter((x) => x.payout_status === "paid").length;
  const filteredPending = sessions.filter(
    (x) => x.payout_status === "pending" || x.payout_status === "requested"
  ).length;
  void summary; // lifetime stats live on /tutor/earnings

  function changeRange(r: TimeRange) {
    startTransition(() => {
      router.push(`/tutor/earnings/data?range=${r}`);
    });
  }

  return (
    <div className="wb" style={{ paddingBlock: 0 }}>
      <Card>
        <SectionHeader title={TIME_RANGE_LABELS[range]} />
        <label className="wb-field" style={{ maxWidth: 240, marginBlock: "8px 12px" }}>
          <span>Time range</span>
          <select
            className="wb-select"
            value={range}
            disabled={isPending}
            onChange={(e) => changeRange(e.target.value as TimeRange)}
          >
            {RANGE_ORDER.map((r) => (
              <option key={r} value={r}>
                {TIME_RANGE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <WbStats
          items={[
            { label: "Sessions", value: sessions.length },
            { label: "Hours", value: fmtHours(filteredHours) },
            { label: "Earned", value: fmt.format(filteredAmount) },
            { label: "Paid / open", value: `${filteredPaid} / ${filteredPending}` },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader title="Last 12 weeks" />
        <WeeklyChart points={weekly} />
      </Card>

      <Card>
        <SectionHeader title="Sessions in this range" note={<Num>{sessions.length}</Num>} />
        <WbTable
          caption={`Sessions, ${TIME_RANGE_LABELS[range]}`}
          rows={sessions}
          rowKey={(s) => s.id}
          empty={
            <>
              <b>No sessions in this range</b>
              Try a wider range.
            </>
          }
          columns={[
            { key: "date", label: "Date", cell: (s) => formatDate(s.scheduled_start) },
            {
              key: "for",
              label: "For",
              cell: (s) => <ForCell session={s} counts={studentSessionCounts} />,
            },
            { key: "tier", label: "Plan", cell: (s) => <TierPill tier={s.tier} /> },
            {
              key: "hours",
              label: "Hours",
              numeric: true,
              cell: (s) => (s.tutor_hours != null ? fmtHours(s.tutor_hours) : "—"),
            },
            {
              key: "amount",
              label: "Amount",
              numeric: true,
              cell: (s) => (s.payout_amount != null ? fmt.format(s.payout_amount) : "—"),
            },
            {
              key: "recap",
              label: "Recap",
              cell: (s) =>
                s.recap_email_sent ? (
                  <WbPill tone="ok">Sent</WbPill>
                ) : (
                  <WbPill tone="neutral">Not sent</WbPill>
                ),
            },
            {
              key: "payout",
              label: "Payout",
              cell: (s) => <PayoutStatusPill status={s.payout_status} />,
            },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader title="Recent payouts" note={<Num>{payouts.length}</Num>} />
        <WbTable
          caption="Recent payouts"
          rows={payouts}
          rowKey={(p) => p.id}
          empty={
            <>
              <b>No payouts yet</b>
              Sessions waiting to be paid are in the table above.
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
            { key: "hours", label: "Hours", numeric: true, cell: (p) => fmtHours(p.total_hours) },
            {
              key: "method",
              label: "Method",
              cell: (p) => (p.payout_method ? methodLabel(p.payout_method) : "—"),
            },
            { key: "status", label: "Status", cell: (p) => <PayoutStatusPill status={p.status} /> },
            {
              key: "when",
              label: "When",
              cell: (p) => (
                <>
                  Requested {timeSince(p.requested_at)} ago
                  {p.paid_at && (
                    <small style={{ display: "block", color: "var(--good)" }}>
                      Paid {timeSince(p.paid_at)} ago
                    </small>
                  )}
                </>
              ),
            },
          ]}
        />
      </Card>

      <p className="wb-note">
        <Link className="kp-link" href="/tutor/earnings">
          Back to earnings
        </Link>
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Cells
// ──────────────────────────────────────────────────────────
function ForCell({
  session: s,
  counts,
}: {
  session: TutorEarningsSession;
  counts: Record<string, number>;
}) {
  const enrolled = s.enrolled ?? [];
  const nameWithCount = (e: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }) => {
    const n = counts[e.id] ?? 0;
    return `${studentDisplay(e)}${n > 1 ? ` (${n})` : ""}`;
  };

  if (!s.cohort_id) {
    return <span>{enrolled.length > 0 ? nameWithCount(enrolled[0]) : "—"}</span>;
  }
  return (
    <span style={{ display: "block", minWidth: 0 }}>
      <span style={{ fontWeight: 600 }}>{s.cohort?.name ?? "(cohort missing)"}</span>{" "}
      <small>{enrolled.length} enrolled</small>
      {enrolled.length > 0 && (
        <small style={{ display: "block" }}>
          {enrolled.slice(0, 3).map(nameWithCount).join(", ")}
          {enrolled.length > 3 ? ` +${enrolled.length - 3}` : ""}
        </small>
      )}
    </span>
  );
}

const TIER_TONES: Record<string, Tone> = {
  private: "warn",
  elite: "info",
  small_group: "ok",
  group: "info",
};

function TierPill({ tier }: { tier: string }) {
  return <WbPill tone={TIER_TONES[tier] ?? "neutral"}>{tierLabelOf(tier)}</WbPill>;
}

const PAYOUT_STATUS: Record<string, { label: string; tone: Tone }> = {
  not_eligible: { label: "—", tone: "neutral" },
  pending: { label: "Pending", tone: "warn" },
  requested: { label: "Requested", tone: "info" },
  pending_approval: { label: "Awaiting review", tone: "info" },
  approved: { label: "Payment in flight", tone: "info" },
  paid: { label: "Paid", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  failed: { label: "Failed", tone: "fail" },
};

function PayoutStatusPill({ status }: { status: string }) {
  const m = PAYOUT_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <WbPill tone={m.tone}>{m.label}</WbPill>;
}

function methodLabel(method: string): string {
  if (method === "instant") return "Instant";
  if (method === "standard") return "ACH";
  return method;
}

// ──────────────────────────────────────────────────────────
// WeeklyChart — inline SVG bar chart, no chart library.
// 12 weeks of $earned per week. Hover a bar for the week.
// ──────────────────────────────────────────────────────────
function WeeklyChart({ points }: { points: WeeklyEarningsPoint[] }) {
  const W = 700;
  const H = 180;
  const PAD = { top: 16, right: 12, bottom: 32, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxAmount = Math.max(1, ...points.map((p) => p.amount));
  const niceMax = Math.ceil(maxAmount / 50) * 50; // round up to nearest $50
  const barW = innerW / Math.max(points.length, 1);

  const total = points.reduce((s, p) => s + p.amount, 0);
  const totalHours = points.reduce((s, p) => s + p.hours, 0);
  const label = { fill: "var(--mute)", fontSize: 10, fontFamily: "var(--font-sans)" };

  return (
    <div>
      <p className="kp-meta">
        <Num>{fmt.format(total)}</Num> over <Num>{fmtHours(totalHours)}</Num>.
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Earnings per week for the last ${points.length} weeks`}
        style={{ display: "block", width: "100%", height: "auto", marginTop: 8 }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD.top + innerH - frac * innerH;
          return (
            <g key={frac}>
              <line
                x1={PAD.left}
                x2={PAD.left + innerW}
                y1={y}
                y2={y}
                stroke="var(--line)"
                strokeWidth="1"
                strokeDasharray={frac === 0 ? "none" : "2,3"}
              />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" style={label}>
                {fmt.format(frac * niceMax)}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => {
          const x = PAD.left + i * barW;
          const h = (p.amount / niceMax) * innerH;
          const y = PAD.top + innerH - h;
          const showLabel = i % 2 === 0 || i === points.length - 1;
          return (
            <g key={p.weekStart}>
              <rect
                x={x + barW * 0.15}
                y={y}
                width={barW * 0.7}
                height={h}
                fill={p.amount === 0 ? "var(--line)" : "var(--accent)"}
                rx="2"
              >
                <title>{`Week of ${p.weekStart}: ${fmt.format(p.amount)} · ${fmtHours(p.hours)} · ${p.sessions} session${p.sessions === 1 ? "" : "s"}`}</title>
              </rect>
              {showLabel && (
                <text x={x + barW / 2} y={H - 14} textAnchor="middle" style={label}>
                  {shortWeek(p.weekStart)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="wb-note">Each bar is one week, before fees. Hover a bar for the details.</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function studentDisplay(
  s: { first_name: string | null; last_name: string | null; email: string | null } | null
): string {
  if (!s) return "—";
  return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || "Student";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeSince(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
