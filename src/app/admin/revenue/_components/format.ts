export function fmtMoney(n: number): string {
  return Math.round(n).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** "$12.4k" for axis ticks. */
export function fmtMoneyShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `${sign}$${(a / 1_000).toFixed(a >= 10_000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(a)}`;
}

export function fmtPctRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function fmtPct(num: number, den: number): string {
  if (den === 0) return "0%";
  return `${Math.round((num / den) * 100)}%`;
}

export function fmtMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Nov 12, 2026" in Austin time. */
export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });
}

export type DeltaTone = "up" | "down" | "flat";

/**
 * The change against the period before: a percentage for money and counts, points for a rate.
 * `good` says which way is good news (churn: down).
 */
export function delta(
  value: number | null,
  prior: number | null,
  kind: "relative" | "points",
  good: "up" | "down" = "up"
): { text: string; tone: DeltaTone; better: boolean | null } {
  if (value === null || prior === null) {
    return { text: "No earlier figure", tone: "flat", better: null };
  }
  const diff = value - prior;
  const tone: DeltaTone = Math.abs(diff) < 1e-9 ? "flat" : diff > 0 ? "up" : "down";
  const better = tone === "flat" ? null : tone === good;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  if (kind === "points") {
    return { text: `${sign}${Math.abs(diff * 100).toFixed(1)} pts`, tone, better };
  }
  if (prior === 0) return { text: value === 0 ? "No change" : "New", tone, better };
  return { text: `${sign}${Math.abs((diff / Math.abs(prior)) * 100).toFixed(1)}%`, tone, better };
}

/** Round tick steps (1, 2, 2.5, 5 × 10ⁿ) from 0 to at least `max`. */
export function niceTicks(max: number, count = 4, integer = false): number[] {
  if (!(max > 0)) return integer ? [0, 1] : [0];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const found = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const step = integer ? Math.max(1, Math.ceil(found)) : found;
  const ticks: number[] = [];
  for (let v = 0; v < max + step * 0.999; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}
