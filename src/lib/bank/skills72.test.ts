import { describe, expect, it } from "vitest";
import { SKILLS72 } from "@/lib/skills/ids72";
import { countsByName, skill72IdOfName, skillNamesByQuestion } from "./skills72";

describe("bank 72-skill tags", () => {
  it("maps every Library name to its ID and back", () => {
    for (const s of SKILLS72) expect(skill72IdOfName(s.name)).toBe(s.id);
    expect(skill72IdOfName("Not a skill")).toBeNull();
  });

  it("counts live questions by skill name and drops unknown IDs", () => {
    const counts = countsByName([
      { skill_id: "m-circles", questions: 120 },
      { skill_id: "rw-main-idea", questions: 7 },
      { skill_id: "m-bogus", questions: 99 },
    ]);
    expect(counts.get("Circles")).toBe(120);
    expect(counts.get("Main idea")).toBe(7);
    expect(counts.size).toBe(2);
  });

  it("names the skill of each tagged question", () => {
    const names = skillNamesByQuestion([
      { question_id: "q1", skill_id: "m-radians" },
      { question_id: "q2", skill_id: "nope" },
    ]);
    expect(names.get("q1")).toBe("Radians");
    expect(names.has("q2")).toBe(false);
  });
});
