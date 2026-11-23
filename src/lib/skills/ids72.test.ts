import { describe, expect, it } from "vitest";
import { SECTIONS, SKILLS } from "@/app/dashboard/student/_portal/skills72";
import { SKILLS72, isSkill72Id, skill72 } from "./ids72";

describe("the 72 skill IDs", () => {
  it("match the Library's list, in order", () => {
    const library = SECTIONS.flatMap((section) =>
      SKILLS[section].flatMap((d) => d.skills.map((s) => [section, d.name, s.name, s.tests]))
    );
    expect(SKILLS72.map((s) => [s.section, s.domain, s.name, s.tests])).toEqual(library);
  });

  it("are unique and well formed", () => {
    expect(SKILLS72).toHaveLength(72);
    expect(new Set(SKILLS72.map((s) => s.id)).size).toBe(72);
    for (const s of SKILLS72) expect(s.id).toMatch(/^(rw|m)-[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(skill72("m-circles")?.name).toBe("Circles");
    expect(isSkill72Id("m-nope")).toBe(false);
  });
});
