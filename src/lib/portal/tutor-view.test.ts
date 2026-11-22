import { describe, expect, it } from "vitest";
import { weakestSkills } from "./tutor-view";

const asked = (skill: string, rights: boolean[]) => rights.map((right) => ({ skill, right }));

describe("a student's weakest skills", () => {
  it("finds a skill that dropped in the last two weeks", () => {
    const weak = weakestSkills(
      [
        { day: 70, asked: asked("Transitions", [false, false, true, false]) },
        { day: 40, asked: asked("Transitions", [true, true, true, true]) },
      ],
      { Transitions: { level: 3 } },
      75
    );
    expect(weak).toEqual([
      { skill: "Transitions", reason: "Dropped", recent: 25, before: 100, answers: 8 },
    ]);
  });

  it("finds a skill stalled at Learning and mostly missed", () => {
    const weak = weakestSkills(
      [
        {
          day: 50,
          asked: asked("Circles", [false, false, true, false, false, true, false, false]),
        },
      ],
      { Circles: { level: 1 } },
      60
    );
    expect(weak[0]).toMatchObject({ skill: "Circles", reason: "Stalled", recent: 25 });
  });

  it("leaves out skills that are going well, too new or too old", () => {
    const weak = weakestSkills(
      [
        { day: 58, asked: asked("Ratios", [true, true, true, false, true, true, true, true]) },
        { day: 59, asked: asked("Lines", [false, false]) },
        { day: -50, asked: asked("Old", [false, false, false, false, false, false, false, false]) },
      ],
      { Ratios: { level: 2 }, Lines: { level: 1 }, Old: { level: 1 } },
      60
    );
    expect(weak).toEqual([]);
  });

  it("puts drops before stalls and keeps at most five", () => {
    const sittings = [
      ...["A", "B", "C", "D", "E", "F"].map((s) => ({
        day: 55,
        asked: asked(s, [false, false, false, false, false, false, false, false]),
      })),
      { day: 58, asked: asked("Z", [false, false, false]) },
      { day: 30, asked: asked("Z", [true, true, true]) },
    ];
    const levels = Object.fromEntries(
      ["A", "B", "C", "D", "E", "F", "Z"].map((s) => [s, { level: 1 }])
    );
    const weak = weakestSkills(sittings, levels, 60);
    expect(weak).toHaveLength(5);
    expect(weak[0]).toMatchObject({ skill: "Z", reason: "Dropped" });
  });
});
