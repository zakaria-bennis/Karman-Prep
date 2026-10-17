import { expect, it } from "vitest";
import { CORPUS } from "@/lib/calculator-v2/core/corpus";
import { groupIntegerDigits } from "./digit-groups";

it("T-10 integer parts of results group in threes with U+2009; fractions, exponents and words do not", () => {
  const t = "\u2009";
  expect(groupIntegerDigits("1234567.891")).toBe(`1${t}234${t}567.891`);
  expect(groupIntegerDigits("-1234")).toBe(`-1${t}234`);
  expect(groupIntegerDigits("999")).toBe("999");
  expect(groupIntegerDigits("0.123456")).toBe("0.123456");
  expect(groupIntegerDigits("1.09951162778×10^12")).toBe("1.09951162778×10^12");
  expect(groupIntegerDigits("1234+5678i")).toBe(`1${t}234+5${t}678i`);
  expect(groupIntegerDigits("(1234, -5678)")).toBe(`(1${t}234, -5${t}678)`);
  expect(groupIntegerDigits("undefined")).toBe("undefined");
});
it("T-10 corpus display strings never contain U+2009", () => {
  for (const c of CORPUS)
    if (c.display !== undefined) expect(c.display, c.id).not.toContain("\u2009");
});
