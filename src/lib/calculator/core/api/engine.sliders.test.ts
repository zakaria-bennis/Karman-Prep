import { beforeEach, expect, it } from "vitest";
import { createTestEngine, type TestEngine } from "./__fixtures__/test-engine";
import type { CalculatorEngine } from "./engine";
import {
  changeSpeed,
  dragSlider,
  keySlider,
  setLoopMode,
  setSliderLimit,
  tickSliders,
  togglePlay,
} from "./sliders";

let t: TestEngine;
let e: CalculatorEngine;
beforeEach(() => {
  t = createTestEngine();
  e = t.engine;
});

const row = (id: string) => e.getSnapshot().rows.find((r) => r.id === id)!;
const sentLatex = (id: string) => {
  const last = [...t.posted].reverse().find((m) => m.type === "state");
  return last?.type === "state" ? last.rows.find((r) => r.id === id)?.latex : undefined;
};
const expression = (id: string) => e.getExpressions().find((x) => x.id === id)!;

it("SLIDERS-1 a literal definition is a slider row with no value readout", () => {
  e.setExpressions([
    { id: "1", latex: "y=ax" },
    { id: "a", latex: "a=1" },
    { id: "b", latex: "b=1+1" },
  ]);
  expect(row("a").slider).toMatchObject({ name: "a", value: 1, range: { min: -10, max: 10 } });
  expect(row("a").valueText).toBeNull();
  expect(row("b").slider).toBeNull();
});

it("SLIDERS-11 saves settings under `slider`, leaving defaults out; sliderBounds is hard", () => {
  e.setExpression({ id: "a", latex: "a=1" });
  expect(expression("a").slider).toBeUndefined();
  e.setExpression({ id: "a", sliderBounds: { min: "0", max: "5", step: "0.5" } });
  expect(expression("a").slider).toEqual({
    hardMin: true,
    hardMax: true,
    min: "0",
    max: "5",
    step: "0.5",
  });
  const state = e.getState();
  e.setBlank();
  e.setState(state);
  expect(expression("a").slider).toMatchObject({ max: "5", step: "0.5" });
  expect(() => e.setExpression({ id: "a", slider: { loopMode: "BOUNCE" as never } })).toThrow();
});

it("SLIDERS-22 evaluates the shown value while the stored latex keeps the typed one", () => {
  e.setExpression({ id: "a", latex: "a=15", slider: { hardMin: true, min: "0", hardMax: true } });
  expect(row("a").slider?.value).toBe(10);
  expect(sentLatex("a")).toBe("a=10");
  expect(expression("a").latex).toBe("a=15");
});

it("SLIDERS-18 a limit error is the row's error and its names are chips", () => {
  e.setExpression({ id: "a", latex: "a=1", slider: { hardMax: true, max: "b" } });
  expect(row("a").error).toMatchObject({
    code: "slider-limits",
    message: "The slider max must be a number.",
  });
  expect(row("a").chips).toEqual(["b"]);
});

it("SLIDERS-21, SLIDERS-26 a key moves by one step, saves the soft limits, one undo step each", () => {
  e.setExpression({ id: "a", latex: "a=12" });
  keySlider(e, "a", "down");
  expect(expression("a")).toMatchObject({ latex: "a=11", slider: { max: "12" } });
  keySlider(e, "a", "max");
  expect(expression("a").latex).toBe("a=12");
  e.undo();
  expect(expression("a").latex).toBe("a=11");
});

it("SLIDERS-24 a drag is one undo step", () => {
  e.setExpression({ id: "a", latex: "a=1" });
  dragSlider(e, "a", 2, true);
  dragSlider(e, "a", 3.5, false);
  dragSlider(e, "a", 4, false);
  expect(expression("a").latex).toBe("a=4");
  e.undo();
  expect(expression("a").latex).toBe("a=1");
});

it("SLIDERS-16 typed limits are hard; clearing one goes back to soft", () => {
  e.setExpression({ id: "a", latex: "a=1" });
  setSliderLimit(e, "a", "min", "0", 0);
  setSliderLimit(e, "a", "max", "5", 2000);
  setSliderLimit(e, "a", "step", "0.5", 4000);
  expect(expression("a").slider).toEqual({
    hardMin: true,
    min: "0",
    hardMax: true,
    max: "5",
    step: "0.5",
  });
  setSliderLimit(e, "a", "min", "", 6000);
  expect(expression("a").slider).toEqual({ hardMax: true, max: "5", step: "0.5" });
});

it("SLIDERS-29 to SLIDERS-31 playback writes values each frame with no undo steps", () => {
  e.setExpression({ id: "a", latex: "a=0" });
  togglePlay(e, "a");
  expect(row("a").slider?.settings.isPlaying).toBe(true);
  let now = 1000;
  tickSliders(e, now);
  for (let k = 0; k < 60; k++) tickSliders(e, (now += 1000 / 60));
  const v = row("a").slider!.value;
  expect(v).toBeGreaterThan(4.5);
  expect(v).toBeLessThan(5.5);
  togglePlay(e, "a");
  expect(expression("a").slider).toBeUndefined(); // paused at defaults: no saved settings
  e.undo();
  expect(row("a").slider?.settings.isPlaying).toBe(true);
});

it("SLIDERS-31 Play once stops at max and Play restarts from min", () => {
  e.setExpression({ id: "a", latex: "a=9.9" });
  setLoopMode(e, "a", "PLAY_ONCE");
  togglePlay(e, "a");
  let now = 0;
  for (let k = 0; k < 60; k++) tickSliders(e, (now += 1000 / 60));
  expect(row("a").slider?.value).toBe(10);
  expect(tickSliders(e, (now += 16))).toBe(false);
  togglePlay(e, "a");
  expect(expression("a").latex).toBe("a=-10");
  expect(row("a").slider?.settings.isPlaying).toBe(true);
});

it("SLIDERS-31, SLIDERS-33 Play indefinitely clears the limits; speed steps the list", () => {
  e.setExpression({ id: "a", latex: "a=1", slider: { hardMin: true, min: "0" } });
  setLoopMode(e, "a", "PLAY_INDEFINITELY");
  expect(expression("a").slider).toEqual({
    min: "",
    max: "",
    loopMode: "PLAY_INDEFINITELY",
  });
  expect(changeSpeed(e, "a", 1)).toBe(4000 / 1.5);
  for (let k = 0; k < 20; k++) changeSpeed(e, "a", 1);
  expect(expression("a").slider?.animationPeriod).toBe(200);
});

it("SLIDERS-22 typing a value past a hard limit or off the step makes it soft (Desmos)", () => {
  e.setExpression({ id: "a", latex: "a=1", sliderBounds: { min: "0", max: "10", step: "" } });
  e.editRow("a", "a=15", "typing");
  expect(row("a").slider).toMatchObject({ value: 15, range: { min: 0, max: 15 } });
  expect(expression("a").slider).toEqual({ hardMin: true, min: "0" });
  e.undo(); // one typing step: the hard max comes back with the old value
  expect(expression("a")).toMatchObject({ latex: "a=1", slider: { hardMax: true } });
  e.editRow("a", "a=-3", "typing");
  expect(expression("a").slider).toEqual({ hardMax: true });
  e.setExpression({ id: "a", latex: "a=1", sliderBounds: { min: "0", max: "10", step: "0.5" } });
  e.editRow("a", "a=1.2", "typing");
  expect(expression("a").slider).toEqual({ hardMin: true, min: "0", hardMax: true });
  // An API write keeps the limits and shows the snapped value.
  e.setExpression({ id: "a", latex: "a=15", sliderBounds: { min: "0", max: "10", step: "" } });
  expect(row("a").slider).toMatchObject({ typed: 15, value: 10 });
  expect(sentLatex("a")).toBe("a=10");
  // A row that was not a slider before the edit has no step to clear: a=3 on step 2 shows 4.
  e.setExpression({ id: "a", latex: "a=", sliderBounds: { min: "0", max: "10", step: "2" } });
  e.editRow("a", "a=3", "typing");
  expect(row("a").slider).toMatchObject({ value: 4, settings: { step: "2" } });
  e.setExpression({ id: "a", latex: "a=1", sliderBounds: { min: "0", max: "10", step: "" } });
  e.editRow("a", "a=-", "typing"); // not a slider: typing on to a=-3 keeps the hard min
  e.editRow("a", "a=-3", "typing");
  expect(row("a").slider).toMatchObject({ value: 0, settings: { hardMin: true } });
});

it("SLIDERS-30 the first frame after Play moves by one frame, so values fall on whole frames", () => {
  e.setExpression({ id: "a", latex: "a=0" });
  togglePlay(e, "a");
  let now = 5000;
  tickSliders(e, now);
  expect(expression("a").latex).toBe("a=0.08"); // 20 units per 4 s, for 1/60 s
  tickSliders(e, (now += 1000 / 60));
  expect(expression("a").latex).toBe("a=0.17");
});
