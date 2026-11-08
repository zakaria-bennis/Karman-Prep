"use client";

import type { ReactNode } from "react";

/** A retention count with its share of the cohort, coloured by how much is left. */
export function CohortCell({ active, total }: { active: number; total: number }) {
  const pct = total > 0 ? active / total : 0;
  // Colour band: green when 80% or more stayed, amber 50 to 80%, red under 50%.
  const color = pct >= 0.8 ? "var(--good)" : pct >= 0.5 ? "var(--warn)" : "var(--late)";
  return (
    <span>
      <span style={{ color, fontWeight: 600 }}>{active}</span>
      <small>{Math.round(pct * 100)}%</small>
    </span>
  );
}

/** A signed number in green (zero or more) or red (below zero). */
export function Signed({ value, children }: { value: number; children: ReactNode }) {
  return (
    <b style={{ color: value >= 0 ? "var(--good)" : "var(--late)" }}>
      {value >= 0 ? "+" : ""}
      {children}
    </b>
  );
}
