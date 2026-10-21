import { describe, expect, it } from "vitest";
import { analyzeRows } from "../core/analysis";
import { advance, playOnceDone } from "./animation";
import {
  DEFAULT_SLIDER,
  nextPeriod,
  savedSlider,
  sliderFromBounds,
  sliderFromSaved,
  speedText,
  type SliderSettings,
} from "./model";
import { describeSlider, sliderTarget, spokenName, withSliderValue } from "./slider";

const SETTINGS = { angleMode: "radians", complex: false } as const;
const target = (latex: string) => {
  const a = analyzeRows([{ id: "1", latex, hidden: false }], SETTINGS);
  return sliderTarget(latex, a.byId.get("1"));
};
const settings = (over: Partial<SliderSettings>) => sliderFromSaved(over);
const view = (latex: string, over: Partial<SliderSettings> = {}, known = new Map()) =>
  describeSlider(target(latex)!, settings(over), known);

describe("sliderTarget (SLIDERS-1, SLIDERS-2)", () => {
  it.each([
    ["a=1", "a", 1],
    ["a=-3", "a", -3],
    ["a=+3", "a", 3],
    ["a=2.5", "a", 2.5],
    ["a=-0", "a", -0],
    ["a=0.0001", "a", 0.0001],
    ["a_{1}=4", "a_{1}", 4],
    ["\\alpha=3", "\\alpha", 3],
    ["a=3\\ ", "a", 3],
    ["x=3", "x", 3],
    ["y=3", "y", 3],
    ["t=2", "t", 2],
    ["a=100", "a", 100],
  ])("%s is a slider", (latex, name, typed) => {
    expect(target(latex)).toEqual({ name, typed });
  });

  it.each([
    "a=1+1",
    "a=\\frac{1}{2}",
    "a=1/2",
    "a=\\pi",
    "a=e",
    "a=2\\pi",
    "a=\\sqrt{2}",
    "a=10^{3}",
    "a=(3)",
    "a=1e3",
    "a=\\infty",
    "e=2",
    "f(x)=1",
    "a=[1,2]",
    "a=(1,2)",
    "a=b",
    "y=x",
  ])("%s is not a slider", (latex) => {
    expect(target(latex)).toBeNull();
  });
});

describe("describeSlider", () => {
  it("defaults to −10..10 and grows soft limits to fit (SLIDERS-11, SLIDERS-20)", () => {
    expect(view("a=1").range).toMatchObject({ min: -10, max: 10, step: 0 });
    expect(view("a=25").range).toMatchObject({ min: -10, max: 25 });
    expect(view("a=-12.3").range).toMatchObject({ min: -12.3, max: 10 });
    expect(view("a=1", { step: "3" }).range).toMatchObject({ min: -12, max: 12, step: 3 });
  });

  it("shows the snapped value and keeps the typed one (SLIDERS-22)", () => {
    const capped = view("a=15", { hardMin: true, min: "0", hardMax: true, max: "10" });
    expect([capped.typed, capped.value]).toEqual([15, 10]);
    expect(view("a=0.37", { step: "0.25" }).value).toBe(0.25);
    expect(view("a=1", { step: "3" }).value).toBe(0);
  });

  it("evaluates limits and reports errors in order (SLIDERS-16 to SLIDERS-19)", () => {
    expect(view("a=1", { hardMin: true, min: "\\pi" }).range.min).toBeCloseTo(Math.PI);
    expect(view("a=1", { hardMin: true, min: "b" })).toMatchObject({
      error: "The slider min must be a number.",
      limitNames: ["b"],
      invalid: { min: true, max: false, step: false },
    });
    expect(view("a=1", { hardMax: true, max: "\\frac{1}{0}" }).error).toBe(
      "The slider max must be a number."
    );
    expect(view("a=1", { step: "q" }).error).toBe("The slider step must be a number.");
    expect(view("a=1", { hardMin: true, min: "5", hardMax: true, max: "2" })).toMatchObject({
      error: "The slider min must be less than the max.",
      invalid: { min: true, max: true },
      value: 5, // break-ui S01: the reference reads the value as the min
    });
    expect(view("a=3", { hardMin: true, min: "10", hardMax: true, max: "0" }).value).toBe(10);
    expect(view("a=1", { hardMin: true, min: "a" }).error).toBe(
      "Slider limits can't use a itself."
    );
    expect(view("a=1", { step: "0" }).range.step).toBe(0);
    expect(view("a=1", { step: "-2" }).range.step).toBe(2);
    expect(view("a=1", { hardMin: true, min: "1", hardMax: true, max: "1" }).disabled).toBe(true);
  });

  it("reads a limit on the slider's own name beside an undefined name as Too many variables (Desmos)", () => {
    // Live reference 2026-10-19: min a, max b+c names b then c, in source order, with chips.
    expect(view("a=1", { hardMin: true, min: "a", hardMax: true, max: "b+c" })).toMatchObject({
      error: "b and c are not defined.",
      limitNames: ["b", "c"],
    });
    expect(view("a=1", { hardMin: true, min: "a+b" }).error).toBe("b is not defined.");
    expect(view("a=1", { hardMin: true, min: "b", step: "a" }).limitNames).toEqual(["b"]);
  });

  it("lets limits use other sliders' values", () => {
    const v = view("a=1", { hardMax: true, max: "b" }, new Map([["b", 4]]));
    expect([v.error, v.range.max]).toEqual([null, 4]);
  });
});

describe("spokenName (SLIDERS-25, SLIDERS-29)", () => {
  it.each([
    ["a", "a"],
    ["a_{1}", "a_1"],
    ["A_{bc}", "A_bc"],
    ["\\alpha", "alpha"],
    ["\\alpha_{2}", "alpha_2"],
  ])("%s is spoken %s", (name, spoken) => {
    expect(spokenName(name)).toBe(spoken);
  });
});

describe("withSliderValue (SLIDERS-3)", () => {
  it("rewrites only the text after the first =", () => {
    expect(withSliderValue("a=1", 2.5)).toBe("a=2.5");
    expect(withSliderValue("a_{1}=1", 1e-7)).toBe("a_{1}=0.0000001");
    expect(withSliderValue("a=1.0", 1)).toBe("a=1.0");
  });
});

describe("saved settings (SLIDERS-11)", () => {
  it("leaves out defaults and reads the older sliderBounds as hard limits", () => {
    expect(savedSlider(DEFAULT_SLIDER)).toBeUndefined();
    expect(
      savedSlider(settings({ hardMin: true, min: "0", hardMax: true, max: "10", step: "0.5" }))
    ).toEqual({ hardMin: true, min: "0", hardMax: true, step: "0.5" });
    expect(sliderFromBounds({ min: "0", max: "", step: "1" })).toEqual({
      hardMin: true,
      min: "0",
      step: "1",
    });
  });

  it("walks the speed list and reads it back (SLIDERS-33)", () => {
    let period: number | null = 4000;
    const seen: string[] = [];
    while (period !== null) {
      seen.push(speedText(period));
      period = nextPeriod(period, 1);
    }
    expect(seen).toEqual(
      ["1", "1.5", "2", "3.5", "5", "7.5", "10", "15", "20"].map((s) => `${s}x`)
    );
    expect(nextPeriod(80000, -1)).toBeNull();
    expect(nextPeriod(4000, -1)).toBeCloseTo(4000 / 0.75);
  });
});

describe("advance (SLIDERS-30, SLIDERS-31)", () => {
  const range = { min: -10, max: 10, step: 0, hardMin: false, hardMax: false };
  const run = (loopMode: Parameters<typeof advance>[0]["loopMode"], from: number, ms: number) => {
    let frame = { target: from, direction: 1 as 1 | -1, value: from };
    for (let t = 0; t < ms; t += 1000 / 60) {
      frame = advance({ range, loopMode, period: 4000, elapsed: 1000 / 60, ...frame });
    }
    return frame;
  };

  it("moves (max−min)/period per ms and writes short numbers", () => {
    const f = run("LOOP_FORWARD_REVERSE", 0, 1000);
    expect(f.value).toBeGreaterThan(4.8);
    expect(f.value).toBeLessThan(5.2);
    expect(String(f.value).length).toBeLessThanOrEqual(4);
  });

  it("turns at max, wraps, stops once and grows indefinitely", () => {
    expect(run("LOOP_FORWARD_REVERSE", 0, 3000)).toMatchObject({ direction: -1 });
    expect(run("LOOP_FORWARD", 0, 3000).value).toBeLessThan(0);
    const once = run("PLAY_ONCE", 0, 3000);
    expect(once.value).toBe(10);
    expect(playOnceDone("PLAY_ONCE", once.value, range)).toBe(true);
    const forever = run("PLAY_INDEFINITELY", 0, 6000);
    expect(forever.value).toBeGreaterThan(5.8);
    expect(forever.value).toBeLessThan(6.2);
  });

  it("snaps the shown value to the step while the target moves smoothly", () => {
    const stepped = { ...range, min: 0, max: 10, step: 1 };
    const f = advance({
      range: stepped,
      loopMode: "LOOP_FORWARD_REVERSE",
      period: 4000,
      elapsed: 100,
      target: 0,
      direction: 1,
    });
    expect([f.target, f.value]).toEqual([0.25, 0]);
  });
});
