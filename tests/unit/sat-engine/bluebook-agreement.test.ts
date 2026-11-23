// The exam grader against real Bluebook results (founder, 2026-11-22: the score must be "accurate to
// the actual SAT"). Each data point is a published Bluebook practice result: the section, the Module 2
// route, how many questions were right and the score Bluebook gave
// (scripts/sat-engine/bluebook/datapoints.json; sources in bluebook/sources.md). The grader scores
// the same counts on a form built to the release-exam blueprint and must stay as close as it is now.
//
// Why these limits: on 2026-11-22, across 171 results, the grader was 21 points off per section on
// average with no lean either way (bias under 1 point), 73% within 20 and 91% within 40. Bluebook's
// own practice tests differ by 14 (Math) to 18 (Reading and Writing) points at the same number wrong,
// and College Board reports a section score as ±30. A change that pushes the grader past these limits
// has made it less like the real SAT.
import { describe, expect, it } from "vitest";
import points from "../../../scripts/sat-engine/bluebook/datapoints.json";
import { compareAll, type DataPoint } from "../../../scripts/sat-engine/compare-bluebook";

// the same rows and the same engine score as the report (npx tsx scripts/sat-engine/compare-bluebook.ts)
const scored = compareAll(points as DataPoint[]);

const errors = (section?: "rw" | "math") =>
  scored.filter((r) => !section || r.section === section).map((r) => r.karman - r.official);
const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;

describe("exam grading against Bluebook", () => {
  it("has enough published results to judge by", () => {
    expect(scored.length).toBeGreaterThanOrEqual(150);
  });

  it("is about 21 points off a section on average, never more than 25", () => {
    expect(mean(errors().map(Math.abs))).toBeLessThan(25);
    expect(mean(errors("rw").map(Math.abs))).toBeLessThan(27);
    expect(mean(errors("math").map(Math.abs))).toBeLessThan(25);
  });

  it("leans neither high nor low", () => {
    expect(Math.abs(mean(errors()))).toBeLessThan(8);
  });

  it("lands within 40 points of Bluebook nine times in ten", () => {
    const close = errors().filter((e) => Math.abs(e) <= 40).length;
    expect(close / scored.length).toBeGreaterThanOrEqual(0.88);
  });
});
