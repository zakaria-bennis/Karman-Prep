import { expect, it } from "vitest";
import { splitLetterRuns } from "./letters";
import { tokenize, type Token } from "./tokens";

it("PR-13 splitLetterRuns takes the longest name, breaks runs at whitespace and leaves subscripts and members alone", () => {
  const split = (s: string) =>
    splitLetterRuns(tokenize(s) as Token[])
      .map((k) => (k.t === "command" ? `\\${k.name}` : k.t === "letter" ? k.ch : k.t))
      .join(" ");
  expect(["arcsinx", "2pix", "pleft", "si n", "v_{max}"].map(split)).toEqual([
    "\\arcsin x end",
    "digits \\pi x end",
    "p l e f t end",
    "s i n end",
    "v symbol open m a x close end",
  ]);
  expect(splitLetterRuns(tokenize("sinx") as Token[])[0]).toEqual({
    t: "command",
    name: "sin",
    span: { start: 0, end: 3 },
  });
});
