import { expect, it } from "vitest";
import { overRowLimit, pastedLatex, pastedLines } from "./paste-text";

it("break-ui pasted text splits into trimmed lines, dropping blank lines and CRLF", () => {
  expect(pastedLines("y=1\r\ny=2\n\n  y=3  \r")).toEqual(["y=1", "y=2", "y=3"]);
  expect(pastedLines("\n\n \t \n")).toEqual([]);
  expect(pastedLines("\t1\t")).toEqual(["1"]);
});

it("break-ui control, zero-width, bidi and terminal colour characters never reach a row", () => {
  expect(pastedLines("\u0000y\u0001=​x‮﻿")).toEqual(["y=x"]);
  expect(pastedLines("\u001b[31my=2\u001b[0m")).toEqual(["y=2"]);
});

it("break-ui pasted Unicode math goes through the shared normalizer", () => {
  expect(pastedLatex("x²")).toBe("x^{2}");
  expect(pastedLatex("2×3")).toContain("\\cdot");
});

it("break-ui a line over 2,048 characters (spaces not counted) is refused before MathQuill", () => {
  expect(overRowLimit("x".repeat(2048))).toBe(false);
  expect(overRowLimit("x ".repeat(2048))).toBe(false);
  expect(overRowLimit("x".repeat(2049))).toBe(true);
  expect(overRowLimit("x+".repeat(50000))).toBe(true);
});

it("break-ui pasted spaces are dropped except between letters, which may end a command", () => {
  expect(pastedLatex("  a = 5 ")).toBe("a=5");
  expect(pastedLatex("\\sin x + 1")).toBe(pastedLatex("\\sin x+1"));
  expect(pastedLatex("\\sin x")).toContain(" ");
});
