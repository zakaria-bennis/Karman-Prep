import { expect, it } from "vitest";
import { CORPUS } from "../corpus/index";
import type { CorpusCase } from "../corpus/types";
import { functionDefinitionHead, parseLatex, treesEqual } from "./index";
import { printLatex } from "./printer";

const latexOf = (c: CorpusCase) => (c.input as { latex: string }).latex;
const optionsFor = (c: CorpusCase) => ({
  userFunctions: new Set(
    [...(c.rows ?? []), latexOf(c)].flatMap((r) => functionDefinitionHead(r)?.name ?? [])
  ),
});

it("PR-37 printing any parsed corpus tree and parsing it again gives the same tree", () => {
  let checked = 0;
  for (const c of CORPUS.filter((k) => "latex" in k.input)) {
    const first = parseLatex(latexOf(c), optionsFor(c));
    if (!first.ok) continue;
    const printed = printLatex(first.tree),
      again = parseLatex(printed, optionsFor(c));
    expect(
      again.ok && treesEqual(again.tree, first.tree) && printLatex(again.tree) === printed,
      `${c.id}: ${printed}`
    ).toBe(true);
    checked++;
  }
  const big = parseLatex("1" + "0".repeat(400));
  expect([checked > 150, big.ok && printLatex(big.tree)]).toEqual([true, "1" + "0".repeat(309)]);
});
