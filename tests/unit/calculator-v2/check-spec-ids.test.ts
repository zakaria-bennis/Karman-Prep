import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as C from "../../../scripts/calculator-v2/check-spec-ids.mjs";
import { EXPECTED_FIELDS, type CorpusCase } from "../../../src/lib/calculator-v2/core/corpus/types";

describe("check-spec-ids", () => {
  it("expandIds expands ranges, commas, semicolons and a trailing period", () => {
    expect([
      C.expandIds("QQ-7 to QQ-9, QQ-12; ZZ-1."),
      C.expandIds("V1-1 to V1-2, A11Y-2"),
    ]).toEqual([
      ["QQ-7", "QQ-8", "QQ-9", "QQ-12", "ZZ-1"],
      ["V1-1", "V1-2", "A11Y-2"],
    ]);
    for (const bad of ["QQ-3 to ZZ-5", "QQ-9 to QQ-3", "QQ"])
      expect(() => C.expandIds(bad)).toThrow(bad);
  });
  it("packageIds reads the 00-index allocation: 29 IDs for 02 and 391 unique in 14 packages", () => {
    expect(C.INDEX_PATH).toBe("docs/superpowers/plans/2026-10-16-calculator-v2-phase1/00-index.md");
    const map = C.packageIds(readFileSync(C.INDEX_PATH, "utf8")),
      all = [...map.values()].flat();
    expect([[...map.keys()].join(" "), all.length, new Set(all).size]).toEqual([
      "02 03 04 05 06 07 08 09 10 11 12 13 14 15",
      391,
      391,
    ]);
    expect(map.get("02")).toEqual(
      C.expandIds("PR-3, PR-4, PR-7 to PR-27, PR-29, PR-37 to PR-40, PR-42")
    );
  });
  it("titledIds reads IDs leading it, test, describe and test.describe titles only", () => {
    const source = [
      'it("QQ-1 a", f);',
      'test("QQ-2, QQ-3 and QQ-4 b", f);',
      'describe("QQ-5 c", f);',
      'test.describe("QQ-6 d", f);',
      "it(`QQ-7 ${name}`, f);",
      'it.skip("QQ-8 e", f);',
      'it.todo("QQ-9 f");',
      'split("QQ-10 g");',
      'it("see QQ-11 h", f);',
      'it("QQ-12x i", f);',
      "it('QQ-130 j', f);",
    ].join("\n");
    expect([...C.titledIds(source)].sort()).toEqual([
      "QQ-1",
      "QQ-130",
      "QQ-2",
      "QQ-3",
      "QQ-4",
      "QQ-5",
      "QQ-6",
      "QQ-7",
    ]);
  });
  it("corpusIds counts rules of cases with an expected field; missingIds keeps order and drops found and repeats", () => {
    const bare = { id: "a-1", rules: ["QQ-1"], input: { latex: "1" } } as CorpusCase;
    expect([
      C.corpusIds([bare]),
      ...EXPECTED_FIELDS.map((f) => C.corpusIds([{ ...bare, [f]: "x" } as unknown as CorpusCase])),
    ]).toEqual([new Set(), ...Array(6).fill(new Set(["QQ-1"]))]);
    expect(C.missingIds(["QQ-2", "QQ-1", "QQ-2", "QQ-3"], new Set(["QQ-3"]))).toEqual([
      "QQ-2",
      "QQ-1",
    ]);
  });
  it("scanFiles finds regular test files by anchored SCANNED_GLOBS", () => {
    const files = C.scanFiles(process.cwd()),
      want = [
        "tests/unit/calculator-v2/check-spec-ids.test.ts",
        "src/lib/calculator-v2/core/corpus/corpus.test.ts",
        "tests/calculator/layout.spec.ts",
      ];
    expect([
      C.SCANNED_GLOBS,
      want.every((f) => files.includes(f)),
      files.some((f) => f.includes("node_modules") || f.endsWith(".mjs")),
      files.every((f) => /\.(spec|test)\.tsx?$/.test(f)) &&
        !files.some((f) => f.includes("-snapshots/")),
    ]).toEqual([
      ["src/**/*.test.{ts,tsx}", "tests/**/*.spec.ts", "tests/unit/**/*.test.ts"],
      true,
      false,
      true,
    ]);
  });
  it("the CLI exits 1 naming an untested ID, 0 for a titled one, 2 for a bad package or glob, and 1 when --files leaves out the titling file", () => {
    const run = (...a: string[]) =>
      spawnSync(
        process.execPath,
        ["--import", "tsx", "scripts/calculator-v2/check-spec-ids.mjs", ...a],
        { encoding: "utf8" }
      );
    const missing = run("--ids", "QQ-999"),
      qq1 = (globs: string) => run("--ids", "QQ-1", "--files", globs).status; // only this file's titledIds fixture titles QQ-1
    expect([
      missing.status,
      missing.stderr.includes("  QQ-999"),
      run("--ids", "PR-39").status,
      run("--packages", "99").status,
    ]).toEqual([1, true, 0, 2]);
    expect(
      [
        "tests/unit/**/*.test.ts",
        "src/**/*.test.{ts,tsx},tests/**/*.spec.ts",
        "nope/*.test.ts",
        "",
      ].map(qq1)
    ).toEqual([0, 1, 2, 2]);
  }, 60_000);
});
