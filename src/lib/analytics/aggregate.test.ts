import { describe, expect, it } from "vitest";
import {
  dailyActive,
  exitPages,
  rollupDailyPeople,
  studentEngagement,
  timeByFeature,
  topPages,
} from "./aggregate";
import type { AnalyticsEvent } from "./funnel";
import { loadAnalytics } from "./load";

function e(over: Partial<AnalyticsEvent>): AnalyticsEvent {
  return {
    at: "2026-11-12T18:00:00.000Z",
    userId: "s1",
    anonId: "d1",
    sessionId: "v1",
    surface: "portal",
    path: "/dashboard/student",
    name: "page_view",
    props: {},
    ...over,
  };
}

const events: AnalyticsEvent[] = [
  e({}),
  e({ name: "page_time", props: { seconds: 120 } }),
  e({ at: "2026-11-12T18:05:00.000Z", path: "/learn/practice/:id" }),
  e({
    at: "2026-11-12T18:06:00.000Z",
    path: "/learn/practice/:id",
    name: "page_time",
    props: { seconds: 300 },
  }),
  e({
    at: "2026-11-12T18:07:00.000Z",
    path: "/learn/practice/:id",
    name: "question_viewed",
    props: { questionId: "q" },
  }),
  e({ userId: null, anonId: "x", sessionId: "v2", surface: "site", path: "/pricing" }),
];

describe("roll-ups", () => {
  it("sums visible time by feature", () => {
    expect(timeByFeature(events)).toEqual([
      { feature: "Practice", minutes: 5, people: 1 },
      { feature: "Student home", minutes: 2, people: 1 },
    ]);
  });

  it("lists top pages with average time per view", () => {
    const pages = topPages(events);
    expect(pages.find((p) => p.path === "/dashboard/student")).toMatchObject({
      views: 1,
      avgSeconds: 120,
    });
  });

  it("finds where each visit ended", () => {
    expect(exitPages(events)).toEqual(
      expect.arrayContaining([
        { path: "/learn/practice/:id", visitsEnded: 1 },
        { path: "/pricing", visitsEnded: 1 },
      ])
    );
  });

  it("counts daily active students and site visitors from the per-person rollup", () => {
    const daily = rollupDailyPeople(events);
    expect(dailyActive(daily, ["2026-11-12"], () => true)).toEqual([
      { day: "2026-11-12", students: 1, visitors: 1 },
    ]);
  });

  it("gives tutors minutes, visits and where a student stalls", () => {
    const [s] = studentEngagement(events, rollupDailyPeople(events), ["s1"], new Map([["s1", 3]]));
    expect(s).toMatchObject({
      userId: "s1",
      minutes: 7,
      sessions: 1,
      activeDays: 1,
      topFeature: "Practice",
      stallsAt: "Practice",
      leftMidQuestion: 1,
      questionsSeen: 1,
      questionsAnswered: 3,
    });
  });
});

describe("sample mode", () => {
  it("is labelled sample and fills every chart", async () => {
    const d = await loadAnalytics(30, true, new Date("2026-11-12T18:00:00Z"));
    expect(d.mode).toBe("sample");
    expect(d.daily).toHaveLength(30);
    expect(d.funnel[0].reached).toBeGreaterThan(d.funnel[6].reached);
    expect(d.funnel[6].reached).toBeGreaterThan(0);
    expect(d.students.every((s) => s.name.startsWith("Sample Student"))).toBe(true);
    expect(d.features.length).toBeGreaterThan(2);
  });
});
