import { describe, expect, it } from "vitest";
import { dailyHtml, dailyLines, dailySubject } from "./daily-email";
import {
  buildDailyReport,
  hasDailyReport,
  isDayKey,
  resolveReportDay,
  shiftDay,
  type DailyReportRows,
  type ReportAnswerRow,
} from "./daily-report-build";

const ZONE = "America/Chicago";
// 2026-11-12 18:00 UTC is noon in Chicago.
const NOW = new Date("2026-11-12T18:00:00Z");
const SKILL = "ma-skill-area-and-volume";
const SUB = "ma-skill-area-and-volume--area";

function answer(
  at: string,
  correct: boolean,
  extra: Partial<ReportAnswerRow> = {}
): ReportAnswerRow {
  return { skillId: SKILL, subSkillId: SUB, correct, at, seconds: 60, ...extra };
}

function rows(over: Partial<DailyReportRows> = {}): DailyReportRows {
  return { answers: [], homework: [], scores: [], notes: [], ...over };
}

const build = (r: DailyReportRows, day = "2026-11-12") =>
  buildDailyReport(r, { day, timeZone: ZONE, now: NOW });

describe("daily report builder", () => {
  it("counts only the day's answers, in the parent's zone", () => {
    const report = build(
      rows({
        answers: [
          answer("2026-11-12T15:00:00Z", true),
          answer("2026-11-12T15:01:00Z", false),
          answer("2026-11-12T15:02:00Z", true, { seconds: 90 }),
          // 11:30 PM on Nov 11 in Chicago, though Nov 12 in UTC: not today.
          answer("2026-11-12T05:30:00Z", true),
          // 1 AM on Nov 13 in Chicago.
          answer("2026-11-13T07:00:00Z", true),
        ],
      })
    );
    expect(report.answered).toBe(3);
    expect(report.correct).toBe(2);
    expect(report.accuracy).toBe(67);
    expect(report.minutes).toBe(4);
    expect(report.isToday).toBe(true);
    expect(report.quiet).toBe(false);
    expect(report.skills).toHaveLength(1);
    expect(report.skills[0].answered).toBe(3);
    expect(report.skills[0].firstTry).toBe(false);
  });

  it("names a level-up when a run of right answers moves a skill up", () => {
    // First answer on Nov 11 makes the skill New; three right in a row on Nov 12 reach Learning.
    const report = build(
      rows({
        answers: [
          answer("2026-11-11T15:00:00Z", false),
          answer("2026-11-12T15:00:00Z", true),
          answer("2026-11-12T15:01:00Z", true),
          answer("2026-11-12T15:02:00Z", true),
        ],
      })
    );
    expect(report.skills[0].levelUp).toEqual({ from: 1, to: 2 });
    expect(report.skills[0].label).toMatch(/Area/);
  });

  it("does not count a first try or a hinted run as a level-up", () => {
    const first = build(rows({ answers: [answer("2026-11-12T15:00:00Z", true)] }));
    expect(first.skills[0]).toMatchObject({ firstTry: true, levelUp: null });
    const hinted = build(
      rows({
        answers: [
          answer("2026-11-11T15:00:00Z", true),
          answer("2026-11-12T15:00:00Z", true, { usedHint: true }),
          answer("2026-11-12T15:01:00Z", true, { usedHint: true }),
          answer("2026-11-12T15:02:00Z", true, { usedHint: true }),
        ],
      })
    );
    expect(hinted.skills[0].levelUp).toBeNull();
  });

  it("sorts homework into finished, due and past due as of the day's end", () => {
    const report = build(
      rows({
        homework: [
          { title: "Done today", dueOn: "2026-11-13", completedAt: "2026-11-12T20:00:00Z" },
          { title: "Due today", dueOn: "2026-11-12", completedAt: null },
          { title: "Due tomorrow", dueOn: "2026-11-13", completedAt: null },
          { title: "Late", dueOn: "2026-11-10", completedAt: null },
          { title: "Done later", dueOn: "2026-11-11", completedAt: "2026-11-14T15:00:00Z" },
          { title: "Done before", dueOn: "2026-11-09", completedAt: "2026-11-09T15:00:00Z" },
        ],
      })
    );
    expect(report.homework.completed.map((h) => h.title)).toEqual(["Done today"]);
    expect(report.homework.dueToday.map((h) => h.title)).toEqual(["Due today"]);
    expect(report.homework.dueTomorrow.map((h) => h.title)).toEqual(["Due tomorrow"]);
    expect(report.homework.pastDue.map((h) => h.title)).toEqual(["Late", "Done later"]);
  });

  it("shows one predicted score as of the day, never a later one", () => {
    const scores = [
      { takenAt: "2026-11-01T15:00:00Z", low: 1180, high: 1240 },
      { takenAt: "2026-11-12T15:00:00Z", low: 1260, high: 1300 },
    ];
    const today = build(rows({ scores }));
    expect(today.score).toEqual({ current: 1280, measuredThatDay: true, previous: 1210 });
    const before = build(rows({ scores }), "2026-11-05");
    expect(before.score).toEqual({ current: 1210, measuredThatDay: false, previous: null });
  });

  it("takes the tutor's note last edited that day", () => {
    const report = build(
      rows({
        notes: [
          {
            body: "Old note",
            from: "Zak",
            createdAt: "2026-11-01T15:00:00Z",
            updatedAt: "2026-11-10T15:00:00Z",
          },
          {
            body: " Strong work on transitions. ",
            from: "Zak",
            createdAt: "2026-11-02T15:00:00Z",
            updatedAt: "2026-11-12T16:00:00Z",
          },
        ],
      })
    );
    expect(report.tutorNote).toMatchObject({ body: "Strong work on transitions.", from: "Zak" });
    expect(build(rows(), "2026-11-11").tutorNote).toBeNull();
  });

  it("marks an empty day as quiet instead of a wall of zeros", () => {
    const report = build(rows());
    expect(report.quiet).toBe(true);
    expect(report.accuracy).toBeNull();
    expect(report.skills).toEqual([]);
  });
});

describe("report day", () => {
  it("defaults to today in the parent's zone, Central when unknown", () => {
    expect(resolveReportDay(undefined, null, NOW)).toMatchObject({
      day: "2026-11-12",
      timeZone: ZONE,
    });
    // 2 AM UTC on Nov 13 is still Nov 12 in Chicago, but Nov 13 in Tokyo.
    const late = new Date("2026-11-13T02:00:00Z");
    expect(resolveReportDay(undefined, "Not/AZone", late).day).toBe("2026-11-12");
    expect(resolveReportDay(undefined, "Asia/Tokyo", late).day).toBe("2026-11-13");
  });

  it("accepts a past day and refuses a future or malformed one", () => {
    expect(resolveReportDay("2026-11-03", ZONE, NOW).day).toBe("2026-11-03");
    expect(resolveReportDay("2026-11-20", ZONE, NOW).day).toBe("2026-11-12");
    expect(resolveReportDay("2026-02-30", ZONE, NOW).day).toBe("2026-11-12");
    expect(isDayKey("12-11-2026")).toBe(false);
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("daily report plan gate", () => {
  it("opens for Cohort, Private and Pro plan ids", () => {
    for (const id of ["pro", "cohort", "private-10", "private-20"])
      expect(hasDailyReport(["practice", id])).toBe(true);
  });

  it("stays closed for Free, Practice, School and tutor-affiliate seats", () => {
    expect(hasDailyReport(["free"])).toBe(false);
    expect(hasDailyReport(["practice", "school", "tutor-affiliate"])).toBe(false);
  });

  it("counts an older active subscription tier, but not a cancelled one", () => {
    expect(hasDailyReport(["free"], { tier: "elite", status: "active" })).toBe(true);
    expect(hasDailyReport([], { tier: "group", status: "trialing" })).toBe(true);
    expect(hasDailyReport(["free"], { tier: "pro", status: "canceled" })).toBe(false);
    expect(hasDailyReport(["free"], { tier: "practice", status: "active" })).toBe(false);
  });
});

describe("daily report email", () => {
  const report = build(
    rows({
      answers: [answer("2026-11-12T15:00:00Z", true), answer("2026-11-12T15:01:00Z", false)],
      homework: [{ title: "Practice: Percentages", dueOn: "2026-11-12", completedAt: null }],
      scores: [{ takenAt: "2026-11-01T15:00:00Z", low: 1180, high: 1240 }],
      notes: [
        {
          body: "Keep going <3",
          from: "Zak",
          createdAt: "2026-11-12T16:00:00Z",
          updatedAt: null,
        },
      ],
    })
  );
  const input = {
    childFirstName: "Maya",
    parentFirstName: "Rachel",
    report,
    portalUrl: "http://localhost:3201/dashboard/parent/x/report",
  };

  it("says the day in counts, the score and the note", () => {
    expect(dailySubject(input)).toBe("Maya's Thursday at Karman");
    const lines = dailyLines(input);
    expect(lines).toContain("Practice: 2 minutes, 2 questions, 50% right.");
    expect(lines).toContain("Due today: Practice: Percentages.");
    expect(lines).toContain("Predicted score: 1210.");
    const html = dailyHtml(input);
    expect(html).toContain("Keep going &lt;3");
    expect(html).not.toMatch(/question_id|student_answer|is_correct/);
  });

  it("says a quiet day in one line", () => {
    const quiet = { ...input, report: build(rows(), "2026-11-10") };
    expect(dailyLines(quiet)).toEqual(["Maya didn't practice on this day."]);
  });
});
