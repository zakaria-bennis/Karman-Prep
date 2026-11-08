"use client";

// ============================================================
// EarningsDataClient — detailed earning data view.
//
// Lives at /tutor/earnings/data. Owns:
//   · Time-range dropdown (URL-driven via ?range=)
//   · Compact period summary (range-scoped totals)
//   · Sessions table filtered by range
//   · Always-visible analytics chart (12 weeks, the centerpiece)
//   · Recent payouts list
//
// The slim /tutor/earnings page above keeps the lifetime metric
// cards + the two big CTAs.
// ============================================================

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Clock,
  DollarSign,
  CalendarClock,
  Mail,
  AlertCircle,
  BarChart3,
  Users as UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tierLabel } from "@/lib/scheduling/tiers";
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
  void summary; // surfaced as period summary below; lifetime stats live on /tutor/earnings

  function changeRange(r: TimeRange) {
    startTransition(() => {
      router.push(`/tutor/earnings/data?range=${r}`);
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Time-range selector + period summary ─────────── */}
      <section className="rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] p-5 dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_60%,transparent)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--mute)] dark:text-[color:var(--mute)]">
              Time range
            </div>
            <div className="mt-1 text-base font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
              {TIME_RANGE_LABELS[range]}
            </div>
          </div>
          <select
            value={range}
            disabled={isPending}
            onChange={(e) => changeRange(e.target.value as TimeRange)}
            className="rounded-md border border-[color:var(--line)] bg-[color:var(--card)] px-3 py-2 text-sm text-[color:var(--ink)] focus:border-[color-mix(in_srgb,var(--info)_40%,transparent)] focus:outline-none dark:border-[color:var(--line)] dark:bg-[color:var(--card)] dark:text-[color:var(--ink)]"
          >
            {RANGE_ORDER.map((r) => (
              <option key={r} value={r}>
                {TIME_RANGE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        {/* 4-card period summary (range-scoped totals, NOT lifetime) */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PeriodCard
            icon={<CalendarClock className="h-4 w-4" />}
            label="Sessions"
            value={String(sessions.length)}
          />
          <PeriodCard
            icon={<Clock className="h-4 w-4" />}
            label="Hours"
            value={fmtHours(filteredHours)}
          />
          <PeriodCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Earned"
            value={fmt.format(filteredAmount)}
            tone="emerald"
          />
          <PeriodCard
            icon={<Wallet className="h-4 w-4" />}
            label="Status"
            value={`${filteredPaid} paid · ${filteredPending} open`}
            tone="slate"
          />
        </div>
      </section>

      {/* ── Always-visible analytics chart ────────────────── */}
      <section className="rounded-xl border border-[color:var(--line)] bg-[color:var(--card)] p-5 dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_60%,transparent)]">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[color:var(--info)]" />
          <h2 className="text-lg font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">Earnings trend</h2>
          <span className="text-xs text-[color:var(--mute)]">last 12 weeks</span>
        </div>
        <WeeklyChart points={weekly} />
      </section>

      {/* ── Sessions table ───────────────────────────────── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
          <CalendarClock className="h-5 w-5 text-[color:var(--mute)]" />
          Sessions in this period
          <span className="text-xs font-normal text-[color:var(--mute)]">({sessions.length})</span>
        </h2>

        {sessions.length === 0 ? (
          <EmptyCard
            text={`No sessions in this range (${TIME_RANGE_LABELS[range]}). Try a wider window.`}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[color:var(--line)] dark:border-[color:var(--line)]">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--card)] dark:bg-[color:var(--card)]">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--mute)] dark:text-[color:var(--mute)]">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">For</th>
                  <th className="px-4 py-2.5">Tier</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5">Recap</th>
                  <th className="px-4 py-2.5">Payout</th>
                </tr>
              </thead>
              <tbody className="bg-[color:var(--card)] dark:bg-[color:var(--sunk)]">
                {sessions.map((s) => (
                  <SessionRow key={s.id} session={s} counts={studentSessionCounts} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Recent payouts ─────────────────────────────── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[color:var(--ink)] dark:text-[color:var(--ink)]">
          <Wallet className="h-5 w-5 text-[color:var(--mute)]" />
          Recent payouts ({payouts.length})
        </h2>

        {payouts.length === 0 ? (
          <EmptyCard text="No payout requests yet — pending sessions show in the table above." />
        ) : (
          <ul className="space-y-2">
            {payouts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--line)] bg-[color:var(--card)] px-4 py-3 dark:border-[color:var(--line)] dark:bg-[color-mix(in_srgb,var(--card)_60%,transparent)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <PayoutStatusPill status={p.status} />
                  <div className="min-w-0">
                    <div className="font-bold tabular-nums text-[color:var(--ink)] dark:text-[color:var(--ink)]">
                      {fmt.format(p.net_amount ?? p.total_amount)}
                    </div>
                    <div className="truncate text-xs text-[color:var(--mute)]">
                      {p.booking_count ?? 0} session{p.booking_count === 1 ? "" : "s"} ·{" "}
                      {fmtHours(p.total_hours)}
                      {p.payout_method && (
                        <>
                          <span className="mx-1.5">·</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--mute)] dark:text-[color:var(--mute)]">
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
                  Requested {timeSince(p.requested_at)} ago
                  {p.paid_at && <div className="text-[color:var(--good)]">Paid {timeSince(p.paid_at)} ago</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Components
// ──────────────────────────────────────────────────────────
function PeriodCard({
  icon,
  label,
  value,
  tone = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "slate" | "emerald";
}) {
  const tones = {
    slate: "bg-[color:var(--card)] dark:bg-[color-mix(in_srgb,var(--raised)_40%,transparent)] text-[color:var(--ink)] dark:text-[color:var(--ink)]",
    emerald: "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[color:var(--good)] dark:text-[color:var(--good)]",
  };
  return (
    <div className={cn("rounded-lg px-3 py-2.5", tones[tone])}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-base font-extrabold tabular-nums sm:text-lg">{value}</div>
    </div>
  );
}

function SessionRow({
  session: s,
  counts,
}: {
  session: TutorEarningsSession;
  counts: Record<string, number>;
}) {
  const isGroup = !!s.cohort_id;
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

  const forCol = isGroup ? (
    <div>
      <div className="flex items-center gap-1.5">
        <UsersIcon className="h-3.5 w-3.5 text-[color:var(--mute)]" />
        <span className="max-w-[18rem] truncate font-medium text-[color:var(--ink)] dark:text-[color:var(--ink)]">
          {s.cohort?.name ?? "(cohort missing)"}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--mute)]">
          {enrolled.length} enrolled
        </span>
      </div>
      {enrolled.length > 0 && (
        <div className="mt-0.5 max-w-[18rem] truncate text-[11px] text-[color:var(--mute)]">
          {enrolled.slice(0, 3).map(nameWithCount).join(", ")}
          {enrolled.length > 3 ? ` +${enrolled.length - 3}` : ""}
        </div>
      )}
    </div>
  ) : (
    <span className="max-w-[16rem] truncate font-medium text-[color:var(--ink)] dark:text-[color:var(--ink)]">
      {enrolled.length > 0 ? nameWithCount(enrolled[0]) : "—"}
    </span>
  );

  return (
    <tr className="border-t border-[color:var(--line)] dark:border-[color:var(--line)]">
      <td className="whitespace-nowrap px-4 py-2.5 align-top text-[color:var(--ink)] dark:text-[color:var(--ink)]">
        {formatDate(s.scheduled_start)}
      </td>
      <td className="px-4 py-2.5 align-top">{forCol}</td>
      <td className="px-4 py-2.5 align-top">
        <PlanTierBadge tier={s.tier} />
      </td>
      <td className="px-4 py-2.5 text-right align-top tabular-nums text-[color:var(--mute)] dark:text-[color:var(--mute)]">
        {s.tutor_hours != null ? fmtHours(s.tutor_hours) : "—"}
      </td>
      <td className="px-4 py-2.5 text-right align-top font-semibold tabular-nums text-[color:var(--ink)] dark:text-[color:var(--ink)]">
        {s.payout_amount != null ? fmt.format(s.payout_amount) : "—"}
      </td>
      <td className="px-4 py-2.5 align-top">
        <RecapPill sent={s.recap_email_sent} />
      </td>
      <td className="px-4 py-2.5 align-top">
        <PayoutStatusPill status={s.payout_status} compact />
      </td>
    </tr>
  );
}

function PlanTierBadge({ tier }: { tier: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    private: {
      label: tierLabel("private"),
      cls: "bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--warn)_15%,transparent)] text-[color:var(--warn)] dark:text-[color:var(--warn)]",
    },
    elite: {
      label: tierLabel("elite"),
      cls: "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[color:var(--accent-text)] dark:text-[color:var(--accent-text)]",
    },
    small_group: {
      label: tierLabel("small_group"),
      cls: "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--good)_15%,transparent)] text-[color:var(--good)] dark:text-[color:var(--good)]",
    },
    group: {
      label: tierLabel("group"),
      cls: "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[color:var(--accent-text)] dark:text-[color:var(--accent-text)]",
    },
  };
  const m = map[tier] ?? {
    label: tier,
    cls: "bg-[color:var(--card)] dark:bg-[color:var(--raised)] text-[color:var(--mute)] dark:text-[color:var(--ink)]",
  };
  return (
    <span
      className={cn(
        "inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        m.cls
      )}
    >
      {m.label}
    </span>
  );
}

function RecapPill({ sent }: { sent: boolean }) {
  if (sent) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--good)_10%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--good)] dark:bg-[color-mix(in_srgb,var(--good)_15%,transparent)] dark:text-[color:var(--good)]">
        <Mail className="h-3 w-3" /> Sent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-[color:var(--card)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--mute)] dark:bg-[color:var(--raised)] dark:text-[color:var(--mute)]">
      <AlertCircle className="h-3 w-3" /> Not sent
    </span>
  );
}

function PayoutStatusPill({ status, compact }: { status: string; compact?: boolean }) {
  const map: Record<string, { label: string; cls: string }> = {
    not_eligible: {
      label: "—",
      cls: "bg-[color:var(--card)] dark:bg-[color:var(--raised)] text-[color:var(--mute)] dark:text-[color:var(--mute)]",
    },
    pending: {
      label: "Pending",
      cls: "bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--warn)_15%,transparent)] text-[color:var(--warn)] dark:text-[color:var(--warn)]",
    },
    requested: {
      label: "Requested",
      cls: "bg-[color-mix(in_srgb,var(--info)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--info)_15%,transparent)] text-[color:var(--info)] dark:text-[color:var(--info)]",
    },
    pending_approval: {
      label: "Awaiting review",
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
        "inline-block whitespace-nowrap rounded text-[10px] font-bold uppercase tracking-wider",
        compact ? "px-2 py-0.5" : "px-3 py-1",
        m.cls
      )}
    >
      {m.label}
    </span>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--line)] px-6 py-8 text-center dark:border-[color:var(--line)]">
      <p className="text-sm text-[color:var(--mute)] dark:text-[color:var(--mute)]">{text}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// WeeklyChart — inline SVG bar chart, no chart library.
// 12 weeks of $earned per week. Hover shows tooltip.
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

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--mute)]">12-week total</div>
        <div className="text-lg font-extrabold tabular-nums text-[color:var(--ink)] dark:text-[color:var(--ink)]">
          {fmt.format(total)}
        </div>
        <div className="text-xs text-[color:var(--mute)]">· {fmtHours(totalHours)}</div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="none">
          {/* Y axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = PAD.top + innerH - frac * innerH;
            return (
              <g key={frac}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + innerW}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-[color:var(--ink)] dark:text-[color:var(--ink)]"
                  strokeWidth="1"
                  strokeDasharray={frac === 0 ? "none" : "2,3"}
                />
                <text
                  x={PAD.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[color:var(--mute)] text-[10px]"
                  fontFamily="system-ui"
                >
                  {fmt.format(frac * niceMax)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
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
                  className={cn(
                    "fill-[color:var(--info)] dark:fill-[color:var(--info)]",
                    p.amount === 0 && "fill-[color:var(--ink)] dark:fill-[color:var(--ink)]"
                  )}
                  rx="2"
                >
                  <title>{`Week of ${p.weekStart}: ${fmt.format(p.amount)} · ${fmtHours(p.hours)} · ${p.sessions} session${p.sessions === 1 ? "" : "s"}`}</title>
                </rect>
                {showLabel && (
                  <text
                    x={x + barW / 2}
                    y={H - 14}
                    textAnchor="middle"
                    className="fill-[color:var(--mute)] text-[10px]"
                    fontFamily="system-ui"
                  >
                    {shortWeek(p.weekStart)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 text-xs text-[color:var(--mute)]">
        Hover bars for week details. Bars represent gross earnings (pre-fee).
      </div>
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
