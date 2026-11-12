/* Pieces of the parent's daily report: the day switcher and the note for plans without it. */
import Link from "next/link";
import { MoreLink } from "@/components/portal";
import { shiftDay } from "@/lib/parent/daily-report-build";

/** Previous day, next day (never past today) and a way back to today. */
export function DayNav({ base, day, today }: { base: string; day: string; today: string }) {
  const href = (d: string) => (d === today ? base : `${base}?day=${d}`);
  const next = shiftDay(day, 1);
  return (
    <nav
      aria-label="Choose a day"
      className="kp-meta"
      style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: 14 }}
    >
      <Link className="kp-link" href={href(shiftDay(day, -1))} rel="prev">
        Previous day
      </Link>
      {day < today && (
        <Link className="kp-link" href={href(next)} rel="next">
          Next day
        </Link>
      )}
      {day < today && (
        <Link className="kp-link" href={base}>
          Back to today
        </Link>
      )}
    </nav>
  );
}

/** Shown in place of the report for a child whose plan doesn't include it. No sales pitch. */
export function NoDailyReport({ childName, base }: { childName: string; base: string }) {
  return (
    <section aria-labelledby="report-main">
      <h2 className="kp-title" id="report-main">
        Daily report
      </h2>
      <p className="kp-meta">
        {childName}&rsquo;s plan doesn&rsquo;t include the daily report. The weekly email has the
        big picture.
      </p>
      <MoreLink href={`${base}/recap`}>Preview this week&rsquo;s email</MoreLink>
    </section>
  );
}
