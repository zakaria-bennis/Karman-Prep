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
  emerald: "border-[color-mix(in_srgb,var(--good)_40%,transparent)] text-[color:var(--good)] bg-[color-mix(in_srgb,var(--good)_10%,transparent)]",
  blue: "border-[color-mix(in_srgb,var(--info)_40%,transparent)] text-[color:var(--info)] bg-[color-mix(in_srgb,var(--info)_10%,transparent)]",
  violet: "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] text-[color:var(--accent-text)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]",
  amber: "border-[color-mix(in_srgb,var(--warn)_40%,transparent)] text-[color:var(--warn)] bg-[color-mix(in_srgb,var(--warn)_10%,transparent)]",
  rose: "border-[color-mix(in_srgb,var(--late)_40%,transparent)] text-[color:var(--late)] bg-[color-mix(in_srgb,var(--late)_10%,transparent)]",
  slate: "border-[color-mix(in_srgb,var(--line)_40%,transparent)] text-[color:var(--ink)] bg-[color-mix(in_srgb,var(--raised)_10%,transparent)]",
  teal: "border-[color-mix(in_srgb,var(--good)_40%,transparent)] text-[color:var(--good)] bg-[color-mix(in_srgb,var(--good)_10%,transparent)]",
};
