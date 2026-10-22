import { describe, expect, it } from "vitest";
import {
  DENSITY_CELL,
  WORD_WRAP,
  fitDensity,
  fitTable,
  isNumericCell,
  plainWords,
  scrollEdges,
  startingDensity,
  tightenUnits,
  type TableDensity,
} from "./question-table-fit";

describe("startingDensity", () => {
  it("guesses tighter tiers for wider tables", () => {
    expect([1, 4, 5, 6, 7, 8, 12].map(startingDensity)).toEqual([
      "large",
      "large",
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
  it("starts large, so small tables get bigger type", () => {
    const tried: TableDensity[] = [];
    fitDensity("large", (t) => (tried.push(t), false));
    expect(tried).toEqual(["large", "roomy", "compact", "dense"]);
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

describe("fitTable", () => {
  it("keeps the roomiest tier that is both narrow and short enough", () => {
    const measure = (t: TableDensity) => ({
      width: t !== "large",
      height: t === "compact" || t === "dense",
    });
    expect(fitTable("large", measure)).toEqual({ tier: "compact", overflow: false });
  });
  it("takes dense without sideways scroll when only the height never fits", () => {
    expect(fitTable("large", () => ({ width: true, height: false }))).toEqual({
      tier: "dense",
      overflow: false,
    });
  });
  it("scrolls sideways only when even dense is too wide", () => {
    expect(fitTable("large", () => ({ width: false, height: true }))).toEqual({
      tier: "dense",
      overflow: true,
    });
  });
});

describe("tightenUnits", () => {
  it("keeps currency and unit symbols against the number", () => {
    expect(tightenUnits("$ 4.99")).toBe("$4.99");
    expect(tightenUnits("€ 1,250")).toBe("€1,250");
    expect(tightenUnits("12 %")).toBe("12%");
    expect(tightenUnits("(−$ 3)")).toBe("(−$3)");
    expect(tightenUnits("45 ¢")).toBe("45¢");
  });
  it("leaves tight values and words alone", () => {
    for (const v of ["$4.99", "12.5%", "12 countries", "Year 2", "$x$"])
      expect(tightenUnits(v)).toBe(v);
  });
});
