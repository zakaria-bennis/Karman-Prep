"use client";

// The pie and the plan table, linked by hover.

import { useState } from "react";
import { fmtMoney, fmtPct } from "./format";
import { PieChart } from "./PieChart";
import type { TierBreakdown } from "../_types";

// Plan colours from the painted shell, so the pie follows light and dark mode.
const PLAN_COLOR: Record<string, string> = {
  practice: "var(--info)",
  pro: "var(--good)",
  "tutor-affiliate": "var(--warn)",
  cohort: "var(--accent)",
  "private-10": "var(--late)",
  "private-20": "var(--mute)",
};

export function PlanBreakdown({
  tiers,
  totalMrr,
  monthRevenue,
}: {
  tiers: TierBreakdown[];
  totalMrr: number;
  monthRevenue: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const colorOf = (t: TierBreakdown) => PLAN_COLOR[t.tier] ?? t.color;
  const slices = tiers.map((t) => ({
    tier: t.tier,
    label: t.label,
    value: t.revenue,
    color: colorOf(t),
  }));

  return (
    <div className="wb-grid" data-columns="2">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <PieChart slices={slices} total={totalMrr} hovered={hovered} onHover={setHovered} />
      </div>
      <div className="wb-table-wrap">
        <table className="wb-table">
          <caption className="sr-only">Revenue by plan</caption>
          <thead>
            <tr>
              <th scope="col">Plan</th>
              <th scope="col" style={{ textAlign: "right" }}>
                Students
              </th>
              <th scope="col" style={{ textAlign: "right" }}>
                Revenue a month
              </th>
              <th scope="col" style={{ textAlign: "right" }}>
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr
                key={t.tier}
                onMouseEnter={() => setHovered(t.tier)}
                onMouseLeave={() => setHovered(null)}
                style={
                  hovered === t.tier
                    ? { background: "color-mix(in srgb, var(--ink) 6%, transparent)" }
                    : undefined
                }
              >
                <td data-label="Plan">
                  <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 10,
                        height: 10,
                        flex: "none",
                        borderRadius: 2,
                        background: colorOf(t),
                      }}
                    />
                    <span>
                      <b>{t.label}</b>
                      <small>
                        {t.model === "subscription"
                          ? `${fmtMoney(t.price)} a month`
                          : `${fmtMoney(t.price)} one-time`}
                      </small>
                    </span>
                  </span>
                </td>
                <td data-label="Students" data-num="">
                  {t.studentCount}
                </td>
                <td data-label="Revenue a month" data-num="">
                  <b>{fmtMoney(t.revenue)}</b>
                  <small>{t.unitsLabel}</small>
                </td>
                <td data-label="Share" data-num="">
                  {fmtPct(t.revenue, monthRevenue)}
                </td>
              </tr>
            ))}
            <tr>
              <td data-label="">
                <b>Total</b>
              </td>
              <td data-label="Students" data-num="">
                <b>{tiers.reduce((sum, t) => sum + t.studentCount, 0)}</b>
              </td>
              <td data-label="Revenue a month" data-num="">
                <b style={{ color: "var(--good)" }}>{fmtMoney(monthRevenue)}</b>
              </td>
              <td data-label="Share" data-num="">
                100%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
