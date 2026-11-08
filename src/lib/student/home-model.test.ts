import { describe, expect, it } from "vitest";
import { buildStudentHome } from "./home-model";
import { demoStudent } from "./demo-student";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";

const now = Date.parse("2026-10-27T15:00:00Z");

describe("buildStudentHome", () => {
  const input = demoStudent(now);
  const home = buildStudentHome(input, now, "/student-preview");

  it("shows every catalog skill once, grouped by its domain", () => {
    const ids = home.domains.flatMap((d) => d.skills.map((s) => s.id));
    expect(ids.sort()).toEqual(CATALOG_SKILLS.map((s) => s.id).sort());
  });
  it("leads with the Daily 10 until it is done, then the weakest skill", () => {
    expect(home.primary).toEqual({ label: "Start your Daily 10", href: "/student-preview/daily" });
    const done = buildStudentHome({ ...input, dailyDoneOn: "2026-10-27" }, now, "/s");
    expect(done.primary.href).toBe(`/s/practice/${done.weakest[0].id}`);
  });
  it("gives an untouched skill no band", () => {
    const s = home.domains
      .flatMap((d) => d.skills)
      .find((k) => k.id === "ma-skill-inference-from-sample-statistics-and-margin-of-error");
    expect(s?.band).toBeNull();
  });
  it("adds skill points up to the total", () => {
    const sum = home.domains.flatMap((d) => d.skills).reduce((n, s) => n + s.points, 0);
    expect(sum).toBe(home.points.total);
  });
  it("tracks the squeeze in each section and never goes under the goal", () => {
    expect(home.trials.math.steps).toHaveLength(4);
    expect(home.trials.math.target).toBeGreaterThanOrEqual(home.trials.math.goal);
    expect(home.trials.math.steps[1]).toBeLessThan(home.trials.math.steps[0]);
    expect(home.trials.math.steps[3]).toBe(home.trials.math.steps[2]); // the missed run held
  });
  it("counts days to the SAT", () => {
    expect(home.satDays).toBe(39);
  });
});
