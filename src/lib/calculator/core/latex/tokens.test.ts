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
  // Desmos: "Sorry, I don't know what to do with adjacent numbers '1.2' and '.3'. …"
  expect([tokenize("1.2.3"), (tokenize("ab") as Token[])[1]]).toMatchObject([
    { code: "adjacent-numbers", span: sp(0, 5), names: ["1.2", ".3"] },
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
    { code: "unknown-symbol", span: sp(1, 2), feature: "@" },
    { code: "unsupported", span: sp(2, 3) },
  ]);
});
