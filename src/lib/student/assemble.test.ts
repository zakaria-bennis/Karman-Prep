import { describe, expect, it } from "vitest";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { apportion, assembleDaily, assembleModule, type PoolItem } from "./assemble";

const pool = (subject: "math" | "reading", perSkill: number): PoolItem[] =>
  CATALOG_SKILLS.filter((s) => s.subject === subject).flatMap((s) =>
    Array.from({ length: perSkill }, (_, i) => ({
      id: `${s.id}-${i}`,
      skillId: s.id,
      difficulty: (i % 7) + 1,
    }))
  );

describe("apportion", () => {
  it("splits by weight and always adds up", () => {
    const q = apportion(22, { a: 0.35, b: 0.35, c: 0.15, d: 0.15 });
    expect(Object.values(q).reduce((n, v) => n + v, 0)).toBe(22);
    expect(q.a).toBeGreaterThanOrEqual(7);
  });
});

describe("assembleModule", () => {
  it("builds a full math module with no repeats and College Board weights", () => {
    const set = assembleModule("math", pool("math", 10), 22, 42);
    expect(set).toHaveLength(22);
    expect(new Set(set.map((q) => q.id)).size).toBe(22);
    const skills = new Map(CATALOG_SKILLS.map((s) => [s.id, s.domainId]));
    const algebra = set.filter((q) => skills.get(q.skillId) === "algebra").length;
    expect(algebra).toBeGreaterThanOrEqual(7);
    expect(algebra).toBeLessThanOrEqual(8);
  });
  it("is the same for the same seed", () => {
    const p = pool("reading", 6);
    expect(assembleModule("reading", p, 27, 7)).toEqual(assembleModule("reading", p, 27, 7));
  });
  it("avoids questions already seen while it can", () => {
    const p = pool("math", 3);
    const first = assembleModule("math", p, 22, 1);
    const second = assembleModule("math", p, 22, 2, new Set(first.map((q) => q.id)));
    expect(second.some((q) => first.some((f) => f.id === q.id))).toBe(false);
  });
  it("fills from other domains when one is thin", () => {
    const p = pool("math", 6).filter((q) => !q.skillId.includes("circles"));
    expect(assembleModule("math", p, 22, 3)).toHaveLength(22);
  });
});

describe("assembleDaily", () => {
  it("leans on weak skills and includes a hard question", () => {
    const p = pool("math", 8);
    const weak = [p[0].skillId];
    const set = assembleDaily(p, weak, 5, 9);
    expect(set).toHaveLength(5);
    expect(set.filter((q) => q.skillId === weak[0]).length).toBeGreaterThanOrEqual(3);
    expect(set.some((q) => q.difficulty >= 5)).toBe(true);
  });
});
