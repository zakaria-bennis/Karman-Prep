// A parent's summary of their child's progress (founder, round 2, 2026-11-22): the score trend, time
// studied, the streak and the Reinforce skills from the last exam. Counts only, never a question.
// Read with the student portal's own loader (src/lib/portal/student-summary.ts). Server component.
import { Card, Num, Row, SectionHeader } from "@/components/portal";
import type { StudentSummary } from "@/lib/portal/student-summary";
import "./child-summary.css";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const hours = (minutes: number) =>
  minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10} h` : `${minutes} min`;

export function ChildSummary({
  summary,
  firstName,
}: {
  summary: StudentSummary;
  firstName: string;
}) {
  const { trend, weeks, streak, lastExam } = summary;
  const most = Math.max(1, ...weeks);
  const recent = trend.slice(-5);
  return (
    <Card label="Summary">
      <SectionHeader title="Summary" />

      <h3 className="kp-meta">Score trend</h3>
      {recent.length ? (
        recent.map((t, i) => {
          const before = i > 0 ? recent[i - 1].total : null;
          return (
            <Row
              key={t.at}
              title={`Full-length exam, ${day(t.at)}`}
              right={
                <>
                  <Num>{t.total}</Num>
                  {before !== null && t.total !== before && (
                    <span className="kp-meta">
                      {" "}
                      {t.total > before ? `+${t.total - before}` : t.total - before}
                    </span>
                  )}
                </>
              }
            />
          );
        })
      ) : (
        <p className="kp-meta">Shows after {firstName}&rsquo;s first full-length exam.</p>
      )}

      <h3 className="kp-meta">Time studied</h3>
      <div
        className="kp-weeks"
        role="img"
        aria-label={`Time studied in each of the last 8 weeks: ${weeks.map(hours).join(", ")}`}
      >
        {weeks.map((m, i) => (
          <i key={i} style={{ height: `${Math.max(4, Math.round((m / most) * 100))}%` }} />
        ))}
      </div>
      <p className="kp-meta">
        {hours(weeks.at(-1) ?? 0)} this week, {hours(weeks.reduce((a, b) => a + b, 0))} in the last
        8 weeks.
      </p>

      <h3 className="kp-meta">Streak</h3>
      <p>
        <Num>{streak}</Num> {streak === 1 ? "day" : "days"} in a row
      </p>

      <h3 className="kp-meta">Reinforce</h3>
      {lastExam?.reinforce.length ? (
        lastExam.reinforce.slice(0, 3).map((s) => <Row key={s.skillId} title={s.name} />)
      ) : (
        <p className="kp-meta">The skills to reinforce show after a full-length exam.</p>
      )}
    </Card>
  );
}
