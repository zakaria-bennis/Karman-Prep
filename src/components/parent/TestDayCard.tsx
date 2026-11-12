/*
 * Test-day countdown for the parent (founder, 2026-11-12): days to the SAT the student picked,
 * the score to aim for, and the points left from the best score so far, real or predicted.
 */
import { Card, Num, Ring, SectionHeader } from "@/components/portal";
import { daysLeftLabel, type TestDay } from "@/lib/parent/test-day";
import { sessionWhen } from "./parts";

export function TestDayCard({ day, childName }: { day: TestDay; childName: string }) {
  if (day.daysLeft === null || !day.testDate) {
    return (
      <Card label="Test day">
        <SectionHeader title="Test day" />
        <p className="kp-meta">
          No SAT date yet. {childName} can pick one in their settings, and the countdown shows here.
        </p>
      </Card>
    );
  }
  const reached = day.gap === 0;
  // The ring fills as the day comes closer, over a 120-day prep window.
  const fill = Math.max(0, Math.min(1, 1 - day.daysLeft / 120));
  return (
    <Card label="Test day">
      <SectionHeader
        title="Test day"
        note={sessionWhen(`${day.testDate}T12:00:00Z`, { date: true })}
      />
      <div className="kp-ring-row">
        <Ring value={fill} label={`Test day: ${daysLeftLabel(day.daysLeft)}`}>
          <Num>{day.daysLeft}</Num>
        </Ring>
        <span className="kp-meta">
          {day.daysLeft === 0
            ? "Test day is today. Good luck!"
            : `${day.daysLeft === 1 ? "1 day" : `${day.daysLeft} days`} to the SAT.`}
        </span>
      </div>
      {day.target !== null && day.from && (
        <p className="kp-meta">
          {reached ? (
            <>
              {childName}&rsquo;s {day.from.kind === "official" ? "real" : "predicted"} score of{" "}
              <Num>{day.from.score}</Num> already meets the goal of <Num>{day.target}</Num>.
            </>
          ) : (
            <>
              <Num>{day.gap ?? 0}</Num> points to the goal of <Num>{day.target}</Num>, from the{" "}
              {day.from.kind === "official" ? "real SAT score" : "predicted score"} of{" "}
              <Num>{day.from.score}</Num>.
            </>
          )}
        </p>
      )}
    </Card>
  );
}
