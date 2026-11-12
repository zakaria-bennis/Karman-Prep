import { describe, expect, it } from "vitest";
import { changeLabel, noteTimeline, sendMessageInput, weekStats } from "./messages-model";
import { daysLeftLabel, officialScoreInput, testDay } from "./test-day";
import {
  isAlertTick,
  pickAlerts,
  runParentAlerts,
  type AlertDeps,
  type AlertLink,
} from "./alerts-run";

const ID = "00000000-0000-4000-8000-000000000001";
const ans = (at: string, correct: boolean, skillId = "s1") =>
  ({ at, correct, skillId }) as unknown as Parameters<typeof weekStats>[0][number];

describe("messages model", () => {
  it("needs a session to miss or move one, not to ask a question", () => {
    expect(
      sendMessageInput.safeParse({ studentId: ID, kind: "miss_class", body: "Sick" }).success
    ).toBe(false);
    expect(
      sendMessageInput.safeParse({ studentId: ID, kind: "message", body: " Hi \r\n" }).data?.body
    ).toBe("Hi");
    expect(
      sendMessageInput.safeParse({ studentId: ID, kind: "message", body: "   " }).success
    ).toBe(false);
  });

  it("counts a week of practice and compares each note with the one before", () => {
    const answers = [
      ans("2026-11-10T12:00:00Z", true),
      ans("2026-11-10T13:00:00Z", false, "s2"),
      ans("2026-11-03T12:00:00Z", false),
    ];
    expect(weekStats(answers, "2026-11-11T00:00:00Z")).toEqual({
      answered: 2,
      correct: 1,
      accuracy: 50,
      skills: 2,
      activeDays: 1,
    });
    const notes = noteTimeline(
      [
        { id: "a", from: "Sam", body: "Week 1", at: "2026-11-04T00:00:00Z" },
        { id: "b", from: "Sam", body: "Week 2", at: "2026-11-11T00:00:00Z" },
      ],
      answers
    );
    expect(notes.map((n) => n.id)).toEqual(["b", "a"]);
    expect(notes[0].accuracyChange).toBe(50);
    expect(notes[0].answeredChange).toBe(1);
    expect(notes[1].answeredChange).toBeNull();
    expect(changeLabel(0, "pts")).toBe("No change");
    expect(changeLabel(-3, "pts")).toBe("−3 pts");
  });
});

describe("test day", () => {
  it("counts the days and measures the gap from the best score", () => {
    const day = testDay({
      today: "2026-11-12",
      testDate: "2026-12-05",
      target: 1450,
      predicted: 1380,
      official: [{ testDate: "2026-10-04", readingWriting: 700, math: 710, total: 1410 }],
    });
    expect(day.daysLeft).toBe(23);
    expect(day.from).toEqual({ score: 1410, kind: "official" });
    expect(day.gap).toBe(40);
    expect(
      testDay({
        today: "2026-11-12",
        testDate: "2026-11-01",
        target: null,
        predicted: null,
        official: [],
      }).daysLeft
    ).toBeNull();
    expect(daysLeftLabel(1)).toBe("Tomorrow");
  });

  it("takes only real digital SAT scores", () => {
    const input = officialScoreInput("2026-11-12");
    const ok = { studentId: ID, testDate: "2026-10-04", readingWriting: "700", math: "710" };
    expect(input.safeParse(ok).success).toBe(true);
    expect(input.safeParse({ ...ok, math: "715" }).success).toBe(false);
    expect(input.safeParse({ ...ok, testDate: "2023-10-04" }).success).toBe(false);
    expect(input.safeParse({ ...ok, testDate: "2026-12-05" }).success).toBe(false);
  });
});

describe("parent alerts", () => {
  const link: AlertLink = {
    parentUserId: "p",
    parentEmail: "parent@example.invalid",
    parentFirstName: "Pat",
    student: { id: "s", clerkId: "c", firstName: "Maya", name: "Maya Example" },
  };
  const now = new Date("2026-11-12T15:02:00Z");
  const facts = {
    lateHomework: [
      { title: "Algebra set", dueOn: "2026-11-11" },
      { title: "Old set", dueOn: "2026-10-01" },
    ],
    missedSessions: [{ id: "x", kind: "1:1", startsAt: "2026-11-11T22:00:00Z" }],
  };

  it("alerts only on fresh facts, as the parent chose", () => {
    const all = pickAlerts(link, facts, { lateHomework: true, missedSession: true }, now);
    expect(all.map((a) => a.kind)).toEqual(["late_homework", "missed_session"]);
    expect(pickAlerts(link, facts, { lateHomework: false, missedSession: false }, now)).toEqual([]);
    expect(isAlertTick(new Date("2026-11-12T15:30:00Z"))).toBe(false);
  });

  it("is a dry run that writes and sends nothing unless PARENT_ALERTS=on", async () => {
    const calls: string[] = [];
    const deps: AlertDeps = {
      loadLinks: async () => [link],
      loadPrefs: async () => ({ lateHomework: true, missedSession: true }),
      loadFacts: async () => facts,
      claim: async (_, key) => (calls.push(`claim:${key}`), !key.startsWith("session")),
      send: async (_, a) => void calls.push(`send:${a.kind}`),
      markSent: async () => undefined,
      log: () => undefined,
    };
    const dry = await runParentAlerts(deps, now, {});
    expect(dry).toMatchObject({ mode: "dry-run", alerts: 2, sent: 0 });
    expect(calls).toEqual([]);
    const live = await runParentAlerts(deps, now, { PARENT_ALERTS: "on" });
    expect(live).toMatchObject({ mode: "send", sent: 1, alreadySent: 1 });
    expect(calls).toContain("send:late_homework");
    expect(calls).not.toContain("send:missed_session");
  });
});
