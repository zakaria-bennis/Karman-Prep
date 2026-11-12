"use client";

// Sales by plan, Free to Schools: who holds each plan now and what it brought in over the
// period, each as a bar that grows in, so the funnel and the money read side by side.
// It is a real table, so it is its own text alternative.

import type { PlanRow } from "../_types";
import { fmtMoney, fmtPct } from "./format";

const FAMILY_COLOR: Record<string, string> = {
  practice: "var(--rev-practice)",
  pro: "var(--rev-pro)",
  cohort: "var(--rev-cohort)",
  "private-10": "var(--rev-private)",
  "private-20": "var(--rev-private)",
  "tutor-affiliate": "var(--rev-affiliate)",
};

export function PlanLadder({ plans, periodLabel }: { plans: PlanRow[]; periodLabel: string }) {
  const maxCustomers = Math.max(1, ...plans.map((p) => p.customers));
  const maxRevenue = Math.max(1, ...plans.map((p) => p.revenue));
  const total = plans.reduce((s, p) => s + p.revenue, 0);
  return (
    <div className="kp-rev-ladder-wrap">
      <table className="kp-rev-ladder">
        <caption className="sr-only">Sales by plan, {periodLabel.toLowerCase()}</caption>
        <thead>
          <tr>
            <th scope="col">Plan</th>
            <th scope="col">Holding it now</th>
            <th scope="col">Charged, {periodLabel.toLowerCase()}</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p, i) => {
            const color = FAMILY_COLOR[p.id] ?? "var(--rev-free)";
            return (
              <tr key={p.id} style={{ ["--i" as string]: i, ["--c" as string]: color }}>
                <th scope="row">
                  <span className="kp-rev-step" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>
                    <b>{p.label}</b>
                    <small>{p.price}</small>
                  </span>
                </th>
                <td>
                  <span className="kp-rev-meter" data-kind="count">
                    <i style={{ ["--w" as string]: p.customers / maxCustomers }} />
                  </span>
                  <span className="kp-rev-cell">
                    <b className="kp-num">{p.customers.toLocaleString("en-US")}</b>{" "}
                    {p.customers === 1 ? p.unit.replace(/s$/, "") : p.unit}
                    {p.note && <small>{p.note}</small>}
                  </span>
                </td>
                <td>
                  <span className="kp-rev-meter">
                    <i style={{ ["--w" as string]: p.revenue / maxRevenue }} />
                  </span>
                  <span className="kp-rev-cell">
                    <b className="kp-num">{fmtMoney(p.revenue)}</b>
                    <span className="kp-rev-share"> {fmtPct(p.revenue, total)}</span>
                    {p.mrr !== null && p.mrr > 0 && <small>{fmtMoney(p.mrr)} MRR now</small>}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total charged</th>
            <td />
            <td>
              <b className="kp-num">{fmtMoney(total)}</b>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
