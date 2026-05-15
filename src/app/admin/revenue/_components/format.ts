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
  emerald: "border-emerald-400/40 text-emerald-300 bg-emerald-400/10",
  blue: "border-blue-400/40 text-blue-300 bg-blue-400/10",
  violet: "border-violet-400/40 text-violet-300 bg-violet-400/10",
  amber: "border-amber-400/40 text-amber-300 bg-amber-400/10",
  rose: "border-rose-400/40 text-rose-300 bg-rose-400/10",
  slate: "border-slate-600/40 text-slate-300 bg-slate-600/10",
  teal: "border-teal-400/40 text-teal-300 bg-teal-400/10",
};
