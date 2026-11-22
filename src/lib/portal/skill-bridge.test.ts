import { describe, expect, it } from "vitest";
import { SUB_SKILLS } from "@/lib/subskills/taxonomy";
import { SECTIONS, SKILLS } from "@/app/dev/shell/skills72";
import { BRIDGE, bridgedLevel, bridgedQuestions, toPortalLevel } from "./skill-bridge";

const names = SECTIONS.flatMap((s) => SKILLS[s].flatMap((d) => d.skills.map((k) => k.name)));
const ids = new Set(SUB_SKILLS.map((s) => s.id));

describe("the bridge from sub-skills to the 72", () => {
  it("covers each of the 72 and nothing else", () => {
    expect(names).toHaveLength(72);
    expect(Object.keys(BRIDGE).sort()).toEqual([...names].sort());
  });

  it("names only sub-skills that exist", () => {
    for (const [name, subs] of Object.entries(BRIDGE)) {
      expect(subs.length, name).toBeGreaterThan(0);
      for (const id of subs) expect(ids.has(id), `${name}: ${id}`).toBe(true);
    }
  });

  it("leaves no sub-skill out", () => {
    const used = new Set(Object.values(BRIDGE).flat());
    expect([...ids].filter((id) => !used.has(id))).toEqual([]);
  });

  it("says the stored five in the portal's four", () => {
    expect([0, 1, 2, 3, 4].map((l) => toPortalLevel(l as 0 | 1 | 2 | 3 | 4))).toEqual([
      0, 1, 1, 2, 3,
    ]);
  });

  it("averages the practiced sub-skills, rounding down", () => {
    const tr = BRIDGE["Transitions: adding on"];
    expect(bridgedLevel("Transitions: adding on", new Map())).toBe(0);
    // one practiced to Conquered, two untouched: Proficient on what was practiced
    expect(bridgedLevel("Transitions: adding on", new Map([[tr[0], 4]]))).toBe(3);
    // Conquered and New: (3 + 1) / 2 = 2, Understanding
    expect(
      bridgedLevel(
        "Transitions: adding on",
        new Map([
          [tr[0], 4],
          [tr[1], 1],
        ])
      )
    ).toBe(2);
    // Understanding and Learning: (2 + 1) / 2 rounds down to 1
    expect(
      bridgedLevel("Transitions: adding on", {
        [tr[0]]: 3,
        [tr[2]]: 2,
      })
    ).toBe(1);
  });

  it("adds up the questions behind a skill", () => {
    expect(bridgedQuestions("Percentages", () => 10)).toBe(20);
    expect(bridgedQuestions("not a skill", () => 10)).toBe(0);
    // Reading tables and Reading graphs share one sub-skill: half its questions each
    expect(bridgedQuestions("Reading tables", () => 10)).toBe(5);
  });
});
