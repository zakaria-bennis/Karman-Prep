import { describe, expect, it } from "vitest";
import {
  difficultyBand,
  flagInputSchema,
  likePattern,
  planSearch,
  resolveFlagInputSchema,
  summarizeBank,
  uuidPrefixRange,
} from "./bank";

const ID = "bcdb21e4-1345-4e62-aa09-ffb14772b819";

describe("difficultyBand", () => {
  it("splits core (1 to 5) from mastery (6 and 7)", () => {
    expect([1, 2, 3, 4, 5].map(difficultyBand)).toEqual(Array(5).fill("core"));
    expect([6, 7].map(difficultyBand)).toEqual(["mastery", "mastery"]);
    expect([0, 8, 4.5, null].map(difficultyBand)).toEqual([null, null, null, null]);
  });
});

describe("search planning", () => {
  it("pads an id prefix into the lowest and highest matching ids", () => {
    expect(uuidPrefixRange("BCDB21E4")).toEqual({
      lo: "bcdb21e4-0000-0000-0000-000000000000",
      hi: "bcdb21e4-ffff-ffff-ffff-ffffffffffff",
    });
    expect(uuidPrefixRange("bcdb21e4-13").lo).toBe("bcdb21e4-1300-0000-0000-000000000000");
  });

  it("looks up a full id directly", () => {
    expect(planSearch(` ${ID.toUpperCase()} `)).toEqual({ id: ID, range: null, text: null });
  });

  it("tries both the id prefix and the stem for short hex input", () => {
    const plan = planSearch("bcdb");
    expect(plan.range?.lo).toBe("bcdb0000-0000-0000-0000-000000000000");
    expect(plan.text).toBe("bcdb");
  });

  it("searches only the stem for words, and needs 2 characters", () => {
    expect(planSearch("slope  of the line")).toEqual({
      id: null,
      range: null,
      text: "slope of the line",
    });
    expect(planSearch("x")).toEqual({ id: null, range: null, text: null });
    expect(planSearch("   ")).toEqual({ id: null, range: null, text: null });
  });

  it("escapes LIKE wildcards and drops the PostgREST * wildcard", () => {
    expect(likePattern("50%_a\\b*")).toBe("%50\\%\\_a\\\\b%");
  });
});

describe("flag input", () => {
  it("accepts a reason with an empty note as no note", () => {
    const parsed = flagInputSchema.parse({ questionId: ID, reason: "typo", note: "  " });
    expect(parsed).toEqual({ questionId: ID, reason: "typo", note: null });
  });

  it("rejects unknown reasons, bad ids and long notes", () => {
    expect(flagInputSchema.safeParse({ questionId: ID, reason: "spam" }).success).toBe(false);
    expect(flagInputSchema.safeParse({ questionId: "abc", reason: "typo" }).success).toBe(false);
    const note = "a".repeat(2001);
    expect(flagInputSchema.safeParse({ questionId: ID, reason: "typo", note }).success).toBe(false);
  });

  it("needs both ids to resolve a flag", () => {
    expect(resolveFlagInputSchema.safeParse({ flagId: ID, questionId: ID }).success).toBe(true);
    expect(resolveFlagInputSchema.safeParse({ flagId: ID }).success).toBe(false);
  });
});

describe("summarizeBank", () => {
  it("counts live rows by domain and skill, and keeps archived rows out", () => {
    const summary = summarizeBank([
      { domain: "algebra", level: 2, skillId: "ma-skill-linear-functions", archived: false },
      { domain: "algebra", level: 7, skillId: "ma-skill-linear-functions", archived: false },
      { domain: "algebra", level: 3, skillId: null, archived: false },
      { domain: "algebra", level: 6, skillId: null, archived: true },
      { domain: "mystery", level: 9, skillId: "ma-skill-made-up", archived: false },
    ]);
    expect(summary).toMatchObject({ total: 4, core: 2, mastery: 1, unrated: 1, archived: 1 });
    expect(summary.untagged).toBe(1);
    const algebra = summary.domains.find((d) => d.id === "algebra");
    expect(algebra).toMatchObject({ label: "Algebra", core: 2, mastery: 1 });
    expect(summary.domains.find((d) => d.id === "mystery")?.unrated).toBe(1);
    const linear = summary.skills.find((s) => s.id === "ma-skill-linear-functions");
    expect(linear).toMatchObject({ label: "Linear functions", core: 1, mastery: 1 });
    expect(summary.skills.at(-1)).toMatchObject({ id: null, label: "No skill tag", core: 1 });
    expect(summary.skills.find((s) => s.id === "ma-skill-made-up")?.domainLabel).toBe(
      "Unknown skill id"
    );
  });
});
