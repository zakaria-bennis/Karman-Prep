import { expect, it } from "vitest";
import { tokenize, type Token } from "./tokens";
const sp = (start: number, end: number) => ({ start, end });
const kinds = (s: string) => (tokenize(s) as Token[]).map((k) => (k.t === "digits" ? k.text : k.t));
it("tokenize joins digits across spaces and keeps at most one decimal point", () => {
  expect(tokenize("2 3+.5")).toEqual([
    { t: "digits", text: "23", span: sp(0, 3) },
    { t: "symbol", ch: "+", span: sp(3, 4) },
    { t: "digits", text: ".5", span: sp(4, 6) },
    { t: "end", span: sp(6, 6) },
  ]);
  expect([kinds("1.2.3"), (tokenize("ab") as Token[])[1]]).toEqual([
    ["1.2", "symbol", "3", "end"],
    { t: "letter", ch: "b", span: sp(1, 2) },
  ]);
});
it("PR-3 tokenize reads commands, allowlisted operator names and escaped symbols", () => {
  expect(tokenize("\\operatorname{sin}x\\%\\{")).toEqual([
    { t: "command", name: "sin", span: sp(0, 18) },
    { t: "letter", ch: "x", span: sp(18, 19) },
    { t: "symbol", ch: "%", span: sp(19, 21) },
    { t: "command", name: "{", span: sp(21, 23) },
    { t: "end", span: sp(23, 23) },
  ]);
  expect(kinds("\\operatorname{}")).toEqual(["command", "open", "close", "end"]);
});
it("tokenize reports a character outside the grammar with its span", () => {
  expect([tokenize("x@y"), tokenize("[1;2]")]).toMatchObject([
    { code: "syntax", span: sp(1, 2) },
    { code: "unsupported", span: sp(2, 3) },
  ]);
});
it("MATHS-CORE-10 tokenize reads three adjacent dots as one ellipsis symbol between numbers", () => {
  expect(tokenize("1...10")).toEqual([
    { t: "digits", text: "1", span: sp(0, 1) },
    { t: "symbol", ch: "...", span: sp(1, 4) },
    { t: "digits", text: "10", span: sp(4, 6) },
    { t: "end", span: sp(6, 6) },
  ]);
  expect(kinds("1.5...3")).toEqual(["1.5", "symbol", "3", "end"]);
  expect(kinds("1 ... .5")).toEqual(["1", "symbol", ".5", "end"]);
});
it("MATHS-CORE-10 tokenize reads the ellipsis inside brackets and comma lists", () => {
  const ellipses = (s: string) =>
    (tokenize(s) as Token[]).filter((k) => k.t === "symbol" && k.ch === "...").map((k) => k.span);
  expect(kinds("[1...3]")).toEqual(["open", "1", "symbol", "3", "close", "end"]);
  expect(ellipses("[1...3]")).toEqual([sp(2, 5)]);
  expect(kinds("1,3,...,9")).toEqual([
    "1",
    "symbol",
    "3",
    "symbol",
    "symbol",
    "symbol",
    "9",
    "end",
  ]);
  expect(ellipses("1,3,...,9")).toEqual([sp(4, 7)]);
});
it("MATHS-CORE-10 tokenize still reads a single decimal point as part of one number", () => {
  expect(tokenize("1.5")).toEqual([
    { t: "digits", text: "1.5", span: sp(0, 3) },
    { t: "end", span: sp(3, 3) },
  ]);
  expect([kinds("5."), kinds("1 .5")]).toEqual([
    ["5.", "end"],
    ["1.5", "end"],
  ]);
});
