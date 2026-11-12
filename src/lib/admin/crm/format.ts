// Money formatting for the CRM, safe in client components (no imports).

/** "$1,495" or "$39.50" from cents; "—" for null. */
export function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = abs % 100 === 0;
  return `${sign}$${(abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

/** "Nov 1" from "2026-11-01" (a calendar day, shown the same in every time zone). */
export function dayLabel(day: string): string {
  const d = new Date(`${day.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** The CRM's working day (the founder's, Central time), as YYYY-MM-DD. */
export function crmToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
