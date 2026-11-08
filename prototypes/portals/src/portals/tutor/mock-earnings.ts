/**
 * Earnings and payouts, read-only. Pay follows src/lib/payouts/compute-amount.ts:
 * paid hours times the hourly rate, hours rounded down to the quarter hour.
 * Totals are summed from the sessions, never typed.
 */
export interface TaughtSession {
  id: string;
  date: string;
  studentId: string;
  minutes: number;
}
/** src/lib/payouts/compute-amount.ts: pay is paid hours times the hourly rate, hours rounded down to 15 minutes. */
export const RATE = 35;
export const payFor = (minutes: number) => ((Math.floor(minutes / 15) * 15) / 60) * RATE;
const taught = (studentId: string, dates: string[]) =>
  dates.map((date) => ({ id: `${studentId}-${date}`, date, studentId, minutes: 60 }));
export const SESSIONS_TAUGHT: TaughtSession[] = [
  ...taught("leila", ["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-22", "2026-10-29"]),
  ...taught("maya", ["2026-10-06", "2026-10-13", "2026-10-20", "2026-10-27"]),
  ...taught("jonah", ["2026-10-07", "2026-10-14", "2026-10-21", "2026-10-28"]),
  ...taught("owen", ["2026-10-10", "2026-10-24"]),
].sort((a, b) => b.date.localeCompare(a.date));
export const PAYOUTS = [
  { id: "p1", date: "2026-10-15", status: "paid" as const },
  { id: "p2", date: "2026-11-15", status: "pending" as const },
];
export const sessionsPaid = () => SESSIONS_TAUGHT.filter((s) => s.date <= PAYOUTS[0].date);
export const sessionsPending = () => SESSIONS_TAUGHT.filter((s) => s.date > PAYOUTS[0].date);
export const sum = (list: TaughtSession[]) => list.reduce((a, s) => a + payFor(s.minutes), 0);
export const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

console.assert(
  SESSIONS_TAUGHT.length === 15 && sum(SESSIONS_TAUGHT) === 525,
  "15 sessions in October, $525.00"
);
console.assert(
  sessionsPaid().length === 8 && sessionsPending().length === 7,
  "8 paid on Oct 15, 7 pending for Nov 15"
);
console.assert(
  payFor(75) === 43.75 && payFor(65) === 35,
  "the 15-minute rounding from compute-amount.ts"
);
