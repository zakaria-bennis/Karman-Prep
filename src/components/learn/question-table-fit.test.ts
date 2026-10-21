import { describe, expect, it } from "vitest";
import {
  DENSITY_CELL,
  WORD_WRAP,
  fitDensity,
  isNumericCell,
  plainWords,
  scrollEdges,
  startingDensity,
  type TableDensity,
} from "./question-table-fit";

describe("startingDensity", () => {
  it("guesses tighter tiers for wider tables", () => {
    expect([1, 5, 6, 7, 8, 12].map(startingDensity)).toEqual([
      "roomy",
      "roomy",
      "compact",
      "compact",
      "dense",
      "dense",
    ]);
  });
});

describe("fitDensity", () => {
  const fitsFrom = (ok: TableDensity[]) => (t: TableDensity) => ok.includes(t);
  it("keeps the roomiest tier that fits", () => {
    expect(fitDensity("roomy", fitsFrom(["roomy", "compact", "dense"]))).toEqual({
      tier: "roomy",
      overflow: false,
    });
    expect(fitDensity("roomy", fitsFrom(["compact", "dense"]))).toEqual({
      tier: "compact",
      overflow: false,
    });
    expect(fitDensity("roomy", fitsFrom(["dense"]))).toEqual({ tier: "dense", overflow: false });
  });
  it("stops at dense and scrolls when nothing fits", () => {
    const tried: TableDensity[] = [];
    const result = fitDensity("roomy", (t) => (tried.push(t), false));
    expect(result).toEqual({ tier: "dense", overflow: true });
    expect(tried).toEqual(["roomy", "compact", "dense"]);
  });
  it("never tries a roomier tier than the start", () => {
    const tried: TableDensity[] = [];
    fitDensity("compact", (t) => (tried.push(t), false));
    expect(tried).toEqual(["compact", "dense"]);
  });
});

describe("scrollEdges", () => {
  it("reports no hidden edges when everything fits", () => {
    expect(scrollEdges(0, 300, 300)).toEqual({ left: false, right: false });
  });
  it("hints only at the side(s) with more content", () => {
    expect(scrollEdges(0, 300, 600)).toEqual({ left: false, right: true });
    expect(scrollEdges(150, 300, 600)).toEqual({ left: true, right: true });
    expect(scrollEdges(300, 300, 600)).toEqual({ left: true, right: false });
  });
  it("ignores sub-pixel rounding at the ends", () => {
    expect(scrollEdges(0.5, 300, 600)).toEqual({ left: false, right: true });
    expect(scrollEdges(299.5, 300, 600)).toEqual({ left: true, right: false });
  });
});

describe("isNumericCell", () => {
  it("treats counts, money, percents and ranges as numbers", () => {
    for (const v of ["12", "1,250", "3.5", "$4.99", "12.5%", "-3", "(42)", "1980-81", "10–20"])
      expect(isNumericCell(v), v).toBe(true);
  });
  it("leaves words and mixed text wrappable", () => {
    for (const v of ["Mexico", "United States", "12 countries", "Year 2", ""])
      expect(isNumericCell(v), v).toBe(false);
  });
});

describe("cell classes", () => {
  it("never break inside a word", () => {
    expect(WORD_WRAP).toContain("[word-break:normal]");
    expect(WORD_WRAP).toContain("[overflow-wrap:normal]");
    expect(WORD_WRAP).toContain("[hyphens:none]");
  });
  it("never go below 13px type", () => {
    const sizes = DENSITY_CELL.match(/text-(\[\d+px\]|xs|sm|base)/g) ?? [];
    expect(sizes).not.toContain("text-xs");
    for (const s of sizes) {
      const px = s.match(/\[(\d+)px\]/);
      if (px) expect(Number(px[1])).toBeGreaterThanOrEqual(13);
    }
  });
});

describe("plainWords", () => {
  it("splits plain text into words and the spaces between them", () => {
    expect(plainWords("Lake  Neusiedl 1980-81")).toEqual([
      "Lake",
      "  ",
      "Neusiedl",
      " ",
      "1980-81",
    ]);
  });
  it("leaves math and markup for MathText", () => {
    expect(plainWords("$x^2$")).toBeNull();
    expect(plainWords("\\frac{1}{2}")).toBeNull();
    expect(plainWords("<b>bold</b>")).toBeNull();
    expect(plainWords("___")).toBeNull();
  });
});
