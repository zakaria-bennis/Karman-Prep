export function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
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

export const ACCENT_RING: Record<string, string> = {
  emerald: "border-success/40 text-success-bright bg-success/10",
  blue: "border-info/40 text-info-bright bg-info/10",
  violet: "border-gold/40 text-gold-bright bg-gold/10",
  amber: "border-warning/40 text-warning-bright bg-warning/10",
  rose: "border-error/40 text-error-bright bg-error/10",
  slate: "border-bronze/40 text-ivory bg-surface-raised/10",
  teal: "border-success/40 text-success-bright bg-success/10",
};
