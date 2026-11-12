"use client";

// The page's lists: cohort retention as a heat grid, refunds, past-due subscriptions, revenue
// per tutor, and the period switch.

import { useRef, type KeyboardEvent } from "react";
import { Row } from "@/components/portal/primitives";
import {
  PERIODS,
  type CohortRow,
  type DunningEntry,
  type PeriodId,
  type PeriodView,
  type TutorRevenueRow,
} from "../_types";
import { fmtDay, fmtMoney, fmtMonth, fmtPctRatio } from "./format";

const CHECKPOINTS = ["Month 0", "Month 1", "Month 3", "Month 6"];

/** Each cell is shaded by the share still subscribed: deep when most stayed, pale when few did. */
export function RetentionGrid({ cohorts }: { cohorts: CohortRow[] }) {
  if (cohorts.length === 0) return <p className="kp-rev-empty">No subscribers yet.</p>;
  return (
    <div className="kp-rev-table-scroll">
      <table className="kp-rev-heat">
        <caption className="sr-only">
          Subscribers by the month they started, and how many were still subscribed 0, 1, 3 and 6
          months later
        </caption>
        <thead>
          <tr>
            <th scope="col">Started</th>
            <th scope="col" data-num="">
              Size
            </th>
            {CHECKPOINTS.map((c) => (
              <th key={c} scope="col" data-num="">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c, row) => (
            <tr key={c.month}>
              <th scope="row">{fmtMonth(c.month)}</th>
              <td data-num="" className="kp-num">
                {c.size}
              </td>
              {c.counts.map((cnt, col) => {
                if (cnt === null) {
                  return (
                    <td key={col} data-num="" data-ahead="">
                      <span aria-label="Not yet">—</span>
                    </td>
                  );
                }
                const share = c.size > 0 ? cnt / c.size : 0;
                return (
                  <td
                    key={col}
                    data-num=""
                    data-low={share < 0.5 ? "" : undefined}
                    style={{ ["--s" as string]: share, ["--d" as string]: row + col }}
                  >
                    <b className="kp-num">{Math.round(share * 100)}%</b>
                    <small className="kp-num">{cnt}</small>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const REASONS: Record<string, string> = {
  requested_by_customer: "Asked by the customer",
  duplicate: "Duplicate charge",
  fraudulent: "Fraud",
  expired_uncaptured_charge: "Charge expired",
};

export function RefundsList({ view }: { view: PeriodView }) {
  const r = view.refunds;
  return (
    <>
      <div className="kp-rev-trio">
        <span>
          <b className="kp-num">{r.count}</b>
          <small>refunds</small>
        </span>
        <span>
          <b className="kp-num">{fmtMoney(r.total)}</b>
          <small>refunded</small>
        </span>
        <span>
          <b className="kp-num">{fmtPctRatio(r.rate)}</b>
          <small>of {fmtMoney(view.gross)} charged</small>
        </span>
      </div>
      {r.recent.length === 0 ? (
        <p className="kp-rev-empty">No refunds in this period.</p>
      ) : (
        <div className="kp-rev-rows">
          {r.recent.map((x, i) => (
            <Row
              key={`${x.issuedAt}-${i}`}
              title={fmtMoney(x.amount)}
              sub={(x.reason && REASONS[x.reason]) || "No reason given"}
              right={fmtDay(x.issuedAt)}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function DunningList({ entries }: { entries: DunningEntry[] }) {
  if (entries.length === 0) return <p className="kp-rev-empty">Nobody is past due.</p>;
  return (
    <div className="kp-rev-rows">
      {entries.map((d, i) => (
        <Row
          key={`${d.name}-${i}`}
          title={d.name}
          sub={[d.tier, d.email].filter(Boolean).join(" · ")}
          right={fmtMoney(d.amountOwed)}
          rightTone="late"
        />
      ))}
    </div>
  );
}

export function TutorList({ tutors }: { tutors: TutorRevenueRow[] }) {
  if (tutors.length === 0)
    return <p className="kp-rev-empty">No private sessions in this period.</p>;
  const max = Math.max(1, ...tutors.map((t) => t.revenue));
  return (
    <div className="kp-rev-rows">
      {tutors.map((t, i) => (
        <div key={t.tutorId} className="kp-rev-tutor" style={{ ["--i" as string]: i }}>
          <Row
            title={t.name}
            sub={`${t.sessions} ${t.sessions === 1 ? "session" : "sessions"}`}
            right={fmtMoney(t.revenue)}
          />
          <span className="kp-rev-meter" aria-hidden="true">
            <i style={{ ["--w" as string]: t.revenue / max }} />
          </span>
        </div>
      ))}
    </div>
  );
}

const PERIOD_NAMES: Record<PeriodId, string> = {
  "30d": "30 days",
  "90d": "90 days",
  "12m": "12 months",
};

/** A springy left-to-right switch: the pill slides under the picked period. */
export function PeriodSwitch({
  value,
  onChange,
}: {
  value: PeriodId;
  onChange: (p: PeriodId) => void;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = PERIODS.indexOf(value);
  function onKeyDown(e: KeyboardEvent) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = PERIODS[(index + step + PERIODS.length) % PERIODS.length];
    onChange(next);
    refs.current[PERIODS.indexOf(next)]?.focus();
  }
  return (
    <div
      className="kp-rev-switch"
      role="radiogroup"
      aria-label="Period"
      style={{ ["--at" as string]: index }}
      onKeyDown={onKeyDown}
    >
      <span className="kp-rev-switch-pill" aria-hidden="true" />
      {PERIODS.map((p, i) => (
        <button
          key={p}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={p === value}
          tabIndex={p === value ? 0 : -1}
          onClick={() => onChange(p)}
        >
          {PERIOD_NAMES[p]}
        </button>
      ))}
    </div>
  );
}
