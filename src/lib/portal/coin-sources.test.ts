import { describe, expect, it } from "vitest";
import { runOf, sourceOf } from "./coin-sources";

const RUN = "3f2b8c1e-0000-4000-8000-000000000001";
const kinds: Record<string, string> = { [RUN]: "daily-ten" };
const kindOf = (id: string) => kinds[id];

describe("sourceOf", () => {
  it("names a run's answers by the run's kind", () => {
    expect(runOf(`run:${RUN}:q-1`)).toBe(RUN);
    expect(sourceOf(`run:${RUN}:q-1`, kindOf)).toBe("Daily 10");
    expect(sourceOf("run:another:q-1", kindOf)).toBe("Skill levels");
  });

  it("names the portal's activities, the exams and the challenge", () => {
    expect(sourceOf("play:skill-set:run:abc")).toBe("Skill sets");
    expect(sourceOf("play:endless:run:abc")).toBe("Endless mode");
    expect(sourceOf("play:challenge:challenge:2026-11-22")).toBe("Challenge");
    expect(sourceOf("exam:sitting-1")).toBe("Exams");
    expect(sourceOf("daily:2026-11-22:math")).toBe("Challenge");
  });

  it("counts catalog practice and lessons as skill levels", () => {
    expect(sourceOf("catalog:session:q")).toBe("Skill levels");
    expect(sourceOf("lesson:abc")).toBe("Skill levels");
    expect(runOf("lesson:abc")).toBeNull();
  });
});
