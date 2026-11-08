import { describe, expect, it } from "vitest";
import { dayKeyIn, safeTimeZone, streakDays } from "./day";
import {
  rankSkills,
  selectDailyTen,
  skillsToLoad,
  targetDifficulty,
  type DailyCandidate,
  type DailySkill,
} from "./select";

const now = new Date("2026-11-08T15:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

function skill(
  id: string,
  section: "reading" | "math",
  extra: Partial<DailySkill> = {}
): DailySkill {
  return { skillId: id, section, level: 0, lastPracticedAt: null, mastery: null, ...extra };
}

function poolFor(skills: DailySkill[], answered: Record<string, string> = {}) {
  const map = new Map<string, DailyCandidate[]>();
  for (const s of skills) {
    map.set(
      s.skillId,
      Array.from({ length: 14 }, (_, i) => {
        const questionId = `${s.skillId}-q${i}`;
        return {
          questionId,
          skillId: s.skillId,
          difficulty: (i % 7) + 1,
          family: `${s.skillId}-f${i}`,
          answeredAt: answered[questionId] ?? null,
        };
      })
    );
  }
  return map;
}

describe("Daily 10 selection", () => {
  const skills = [
    skill("rw-a", "reading", { level: 1, mastery: 30, lastPracticedAt: daysAgo(1) }),
    skill("rw-b", "reading", { level: 2, mastery: 45, lastPracticedAt: daysAgo(1) }),
    skill("rw-c", "reading", { level: 3, mastery: 70, lastPracticedAt: daysAgo(10) }),
    skill("rw-d", "reading", { level: 4, mastery: 90, lastPracticedAt: daysAgo(2) }),
    skill("rw-e", "reading"),
    skill("rw-f", "reading"),
    skill("ma-a", "math", { level: 1, mastery: 20, lastPracticedAt: daysAgo(1) }),
    skill("ma-b", "math", { level: 4, mastery: 95, lastPracticedAt: daysAgo(20) }),
    skill("ma-c", "math"),
    skill("ma-d", "math"),
    skill("ma-e", "math"),
  ];

  it("gives ten questions, five per section, Reading and Writing first", () => {
    const picks = selectDailyTen({
      skills,
      candidates: poolFor(skills),
      maxDifficulty: 5,
      now,
      seed: "student-1:2026-11-08",
    });
    expect(picks).toHaveLength(10);
    expect(picks.slice(0, 5).every((p) => p.skillId.startsWith("rw-"))).toBe(true);
    expect(picks.slice(5).every((p) => p.skillId.startsWith("ma-"))).toBe(true);
    expect(new Set(picks.map((p) => p.skillId)).size).toBe(10);
  });

  it("puts weak skills first, then an overdue review, then a new skill", () => {
    const order = rankSkills(
      skills.filter((s) => s.section === "reading"),
      now,
      "seed"
    );
    expect(order.slice(0, 4).map((s) => [s.skill.skillId, s.why])).toEqual([
      ["rw-a", "weak"],
      ["rw-b", "weak"],
      ["rw-c", "review"],
      [order[3].skill.skillId, "new"],
    ]);
    expect(["rw-e", "rw-f"]).toContain(order[3].skill.skillId);
  });

  it("brings back a Conquered skill once its review is due", () => {
    const math = rankSkills(
      skills.filter((s) => s.section === "math"),
      now,
      "seed"
    );
    expect(math.find((s) => s.skill.skillId === "ma-b")?.why).toBe("review");
  });

  it("keeps difficulty inside the plan and matches the level", () => {
    expect(targetDifficulty(4, 7)).toBe(6);
    expect(targetDifficulty(4, 5)).toBe(5);
    const picks = selectDailyTen({
      skills,
      candidates: poolFor(skills),
      maxDifficulty: 5,
      now,
      seed: "x",
    });
    const difficulty = (id: string) => (Number(id.split("-q")[1]) % 7) + 1;
    expect(picks.every((p) => difficulty(p.questionId) <= 5)).toBe(true);
    const mixed = new Set(picks.map((p) => difficulty(p.questionId)));
    expect(mixed.size).toBeGreaterThan(1);
  });

  it("prefers questions never answered", () => {
    const answered = { "rw-a-q2": daysAgo(1) };
    const picks = selectDailyTen({
      skills,
      candidates: poolFor(skills, answered),
      maxDifficulty: 5,
      now,
      seed: "x",
    });
    expect(picks.map((p) => p.questionId)).not.toContain("rw-a-q2");
  });

  it("is the same all day for the same seed", () => {
    const run = () =>
      selectDailyTen({ skills, candidates: poolFor(skills), maxDifficulty: 7, now, seed: "s" });
    expect(run()).toEqual(run());
  });

  it("fills a brand-new student's set from new skills", () => {
    const fresh = skills.map((s) => ({ ...s, level: 0 as const, lastPracticedAt: null }));
    const picks = selectDailyTen({
      skills: fresh,
      candidates: poolFor(fresh),
      maxDifficulty: 5,
      now,
      seed: "new",
    });
    expect(picks).toHaveLength(10);
    expect(skillsToLoad(fresh, now, "new")).toHaveLength(11);
  });
});

describe("Daily 10 day and streak", () => {
  it("keys the day in the student's time zone", () => {
    const lateEvening = new Date("2026-11-09T04:30:00Z");
    expect(dayKeyIn(lateEvening, "America/Chicago")).toBe("2026-11-08");
    expect(dayKeyIn(lateEvening, "Europe/Paris")).toBe("2026-11-09");
    expect(safeTimeZone("Not/AZone")).toBe("America/Chicago");
  });

  it("counts days in a row, and today's open Daily 10 does not break it", () => {
    expect(streakDays(["2026-11-06", "2026-11-07", "2026-11-08"], "2026-11-08")).toBe(3);
    expect(streakDays(["2026-11-06", "2026-11-07"], "2026-11-08")).toBe(2);
    expect(streakDays(["2026-11-05", "2026-11-07"], "2026-11-08")).toBe(1);
    expect(streakDays([], "2026-11-08")).toBe(0);
  });
});
