import { describe, expect, it } from "vitest";
import map from "@/data/curriculum/sub-skill-map.json";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { subSkillKey } from "./rules";
import {
  SUB_SKILLS,
  fallbackSubSkill,
  officialSkillsIn,
  subSkillTitle,
  subSkillsOfSkill,
} from "./taxonomy";

describe("sub-skill tree", () => {
  it("covers every catalog skill with unique sub-skills, about 90 in all", () => {
    expect(new Set(SUB_SKILLS.map((s) => s.id)).size).toBe(SUB_SKILLS.length);
    expect(SUB_SKILLS.length).toBeGreaterThanOrEqual(85);
    for (const skill of CATALOG_SKILLS)
      expect(subSkillsOfSkill(skill.id).length).toBeGreaterThan(0);
  });

  it("keeps the official skills as headings, with SEC's 12 under its two", () => {
    expect(officialSkillsIn("algebra")).toHaveLength(5);
    expect(officialSkillsIn("expression_ideas").map((o) => o.label)).toEqual([
      "Rhetorical Synthesis",
      "Transitions",
    ]);
    const sec = officialSkillsIn("conventions");
    expect(sec.map((o) => o.label)).toEqual(["Boundaries", "Form, Structure, and Sense"]);
    expect(sec.flatMap((o) => o.subSkills)).toHaveLength(12);
    // A skill with one sub-skill keeps its own id, so older saved levels still count.
    const sva = "rw-skill-subject-verb-agreement";
    expect(subSkillsOfSkill(sva).map((s) => s.id)).toEqual([sva]);
  });

  it("names a sub-skill with its official skill", () => {
    expect(subSkillTitle("rw-skill-transitions--contrast")).toBe("Transitions: Contrast");
    expect(subSkillTitle("rw-skill-subject-verb-agreement")).toBe("Subject-verb agreement");
    expect(fallbackSubSkill("rw-skill-transitions")).toBe("rw-skill-transitions--clarify");
  });
});

describe("sorting questions into sub-skills", () => {
  const key = (skill: string, text: string, correct = "", figure = false) =>
    subSkillKey(skill, { text, correct, figure });

  it("reads the question's words", () => {
    const lin = "ma-skill-linear-equations-in-one-variable";
    expect(key(lin, "How many solutions does the given equation have?")).toBe("count");
    expect(key(lin, "A plumber charges $85 for a visit and $40 per hour.")).toBe("story");
    expect(key(lin, "If 3x + 5 = 20, what is the value of x?")).toBe("solve");
    // LaTeX money signs are not money.
    expect(key(lin, "$$ (p+3)+8=10 $$ What value of $p$ is the solution?")).toBe("solve");
    expect(
      key(
        "rw-skill-words-in-context",
        "Which choice completes the text with the most logical and precise word?"
      )
    ).toBe("precise");
  });

  it("reads the right answer for Transitions", () => {
    const t = "rw-skill-transitions";
    expect(key(t, "Which choice completes the text?", "However,")).toBe("contrast");
    expect(key(t, "Which choice completes the text?", "For example,")).toBe("example");
    expect(key(t, "Which choice completes the text?", "Indeed,")).toBe("clarify");
  });
});

describe("the stored map", () => {
  it("names only real sub-skills and holds every live question once", () => {
    const known = new Set(SUB_SKILLS.map((s) => s.id));
    const all: string[] = [];
    for (const [id, list] of Object.entries(map.subSkills as Record<string, string>)) {
      expect(known.has(id)).toBe(true);
      if (list) all.push(...list.split(" "));
    }
    expect(all).toHaveLength(map.questions);
    expect(new Set(all).size).toBe(all.length);
  });
});
