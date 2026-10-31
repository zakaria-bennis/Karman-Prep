import { describe, expect, it } from "vitest";
import { isSatShortenedDecimal } from "./numeric-answer";

const accepts = (answer: string, entries: string[]) =>
  entries.forEach((entry) => expect(isSatShortenedDecimal(entry, answer), entry).toBe(true));
const rejects = (answer: string, entries: string[]) =>
  entries.forEach((entry) => expect(isSatShortenedDecimal(entry, answer), entry).toBe(false));

describe("SAT shortened decimal entries", () => {
  it("accepts the official 2/3 examples and rejects the short ones", () => {
    accepts("2/3", [".6666", ".6667", "0.666", "0.667", " 0.667 "]);
    rejects("2/3", [".66", ".67", "0.66", "0.67", ".666", ".667", "0.6667", ".6668", ".6665"]);
  });

  it("only allows the last digit to be truncated or rounded", () => {
    accepts("2/7", [".2857", "0.285", "0.286"]);
    rejects("2/7", ["0.28", ".2858", ".2856", "0.287", "0.284", ".286", ".285"]);
  });

  it("gives negative answers six characters, minus sign included", () => {
    accepts("-1/3", ["-.3333", "-0.333"]);
    accepts("1/-3", ["-.3333", "-0.333"]);
    accepts("-13/14", ["-0.928", "-0.929", "-.9285", "-.9286"]);
    rejects("-1/3", ["-.333", "-0.33", ".3333", "0.333", "-.33333", "-0.3333"]);
    rejects("1/3", ["-.3333", "-0.333"]);
  });

  it("rounds negative answers away from zero and truncates toward zero", () => {
    accepts("-187/2700", ["-.0692", "-.0693", "-0.069"]);
    rejects("-187/2700", ["-.0691", "-.0694", "-0.070", "-0.068"]);
  });

  it("works for answers with whole-number parts", () => {
    accepts("47/3", ["15.66", "15.67"]);
    accepts("14/3", ["4.666", "4.667"]);
    accepts("292/3", ["97.33"]);
    rejects("47/3", ["15.6", "15.7", "15.65", "15.68", "015.6"]);
    rejects("14/3", ["4.66", "4.67", "4.6666"]);
  });

  it("uses whole numbers when no decimal place fits", () => {
    accepts("123457/7", ["17636", "17637"]);
    rejects("123457/7", ["17635", "17638", "1763", "17636.", "17637."]);
  });

  it("applies to terminating decimals that are too long to fit", () => {
    accepts("3.1205", ["3.120", "3.121"]);
    accepts("116.823", ["116.8"]);
    accepts("116.82", ["116.8"]);
    rejects("3.1205", ["3.12", "3.122", "3.119"]);
  });

  it("requires the exact answer when it fits in the box", () => {
    // Exact entries such as ".0625" are graded by value, not by this rule.
    rejects("1/2", ["0.500", ".5000", "0.501"]);
    rejects("1/16", ["0.063", "0.062", ".0625"]);
    rejects("-3/8", ["-0.375", "-.3750", "-0.376"]);
    rejects("12.5", ["12.50"]);
  });

  it("does not let padding zeros fill the box", () => {
    rejects("1/3", ["00.33", "000.3"]);
    rejects("1/100000", [".0000", "0.000"]);
  });

  it("only treats plain decimals as shortened entries", () => {
    rejects("2/7", ["2/7", "4/14", "+.2857", "+0.285", ".2857%", "1 2/7", "", ".", "-", "0,285"]);
    rejects("not a number", [".2857"]);
    rejects("2/0", [".2857"]);
  });
});
