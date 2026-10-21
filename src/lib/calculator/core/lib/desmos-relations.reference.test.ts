// PR-29, PR-31, PR-32, RC-14, RC-15: every live Desmos capture for comparisons, relation operators
// and chains (desmos-relations.fixture.json, copied from the catalogue's ALL.values.json), and every
// restriction or piecewise row the matrices-advanced capture found graphable. A key's rows are
// separated by " ;; ", the last one being the case. Not yet matched, each an expected failure that
// fails once matched, by the notation they use that has not shipped: matrices, parametric curves
// in t and polar curves.
import { expect, it } from "vitest";
import { analyzeRows } from "../analysis";
import { evaluateRows } from "../eval/compile";
import { NO_DEADLINE } from "../deadline";
import relations from "./desmos-relations.fixture.json";
import { karmanCopy } from "../analysis/__fixtures__/desmos-copy";

const SETTINGS = { angleMode: "radians", complex: false } as const;
const GAPS: readonly RegExp[] = [/bmatrix/, /^\\left\(t,/, /\\theta/];
const isGap = (key: string) => GAPS.some((gap) => gap.test(key));

/** The case row's analysis and the value the engine shows for it (undefined when none). */
function lastRow(key: string) {
  const rows = key.split(" ;; ").map((latex, i) => ({ id: `row-${i}`, latex, hidden: false }));
  const analysis = analyzeRows(rows, SETTINGS);
  const row = analysis.rows[rows.length - 1];
  return { row, shown: evaluateRows(analysis, SETTINGS, () => NO_DEADLINE).get(row.id) };
}

const ERRORS = Object.entries(relations.errors);
const VALUES = Object.entries(relations.values);
const GRAPHABLE = Object.entries(relations.graphable);

it("PR-29 RC-14 all 7 relation errors, 5 relation values and 16 graphable rows are checked", () =>
  expect([ERRORS.length, VALUES.length, GRAPHABLE.length]).toEqual([7, 5, 16]));

for (const [key, message] of ERRORS) {
  const check = () => expect(lastRow(key).row.error?.message).toBe(karmanCopy(message));
  if (isGap(key)) it.fails(`not yet matched: ${key} reads "${message}" in Desmos`, check);
  else it(`PR-29 PR-31 ${key} reads "${message}", as in Desmos`, check);
}

for (const [key] of VALUES) {
  it(`RC-14 ${key} shows no value and no error, as in Desmos`, () => {
    const { row, shown } = lastRow(key);
    expect([row.error, shown]).toEqual([null, undefined]);
  });
}

for (const [key, expected] of GRAPHABLE) {
  const check = () => {
    const { row, shown } = lastRow(key);
    expect([row.error, row.isGraphable]).toEqual([null, true]);
    if (expected !== "graphable") {
      expect([row.kind, shown]).toEqual(["point", { type: "point", value: [1, 2] }]);
    }
  };
  if (isGap(key)) it.fails(`not yet matched: ${key} graphs in Desmos`, check);
  else
    it(
      `G-2 RC-15 ${key} graphs${expected === "graphable" ? "" : ` as ${expected}`}, as in Desmos`,
      check
    );
}
