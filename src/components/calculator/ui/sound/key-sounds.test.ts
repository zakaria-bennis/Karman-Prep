// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { panelCategories } from "@/lib/calculator/core/latex/operator-names";
import {
  installKeySounds,
  operatorNamesIn,
  soundForFunction,
  soundForKeypadKey,
  TypedKeySounds,
} from "./install-key-sounds";
import {
  KEY_SOUNDS_STORAGE_KEY,
  keySoundsEnabled,
  playKeySound,
  resetKeySoundsForTest,
  setKeySoundsEnabled,
  subscribeKeySounds,
} from "./key-sounds";
import { functionVariant, KEY_SOUNDS, RECIPES } from "./sound-recipes";

/** A Web Audio stand-in that counts contexts and records each voice it starts. */
class FakeParam {
  value = 0;
  setValueAtTime(v: number) {
    this.value = v;
  }
  exponentialRampToValueAtTime() {}
}
class FakeNode {
  frequency = new FakeParam();
  gain = new FakeParam();
  Q = new FakeParam();
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
  type = "";
  buffer: unknown = null;
  connect<T>(next: T): T {
    return next;
  }
  start() {
    FakeContext.voices.push(
      this.buffer !== null ? "noise" : `${this.type}@${this.frequency.value}`
    );
  }
  stop() {}
}
class FakeContext {
  static made = 0;
  static voices: string[] = [];
  state = "running";
  currentTime = 0;
  sampleRate = 8000;
  destination = new FakeNode();
  constructor() {
    FakeContext.made++;
  }
  createOscillator() {
    return new FakeNode();
  }
  createGain() {
    return new FakeNode();
  }
  createBiquadFilter() {
    return new FakeNode();
  }
  createDynamicsCompressor() {
    return new FakeNode();
  }
  createBufferSource() {
    return new FakeNode();
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
}

beforeEach(() => {
  resetKeySoundsForTest();
  localStorage.clear();
  FakeContext.made = 0;
  FakeContext.voices = [];
  vi.stubGlobal("AudioContext", FakeContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("every category has its own recipe, none alike", () => {
  expect([...KEY_SOUNDS].sort()).toEqual(
    [
      "digit",
      "letter",
      "variable",
      "constant",
      "minus",
      "plus",
      "times",
      "divide",
      "exponent",
      "subscript",
      "regression",
      "equals",
      "sqrt",
      "function",
      "openParen",
      "closeParen",
      "openBracket",
      "closeBracket",
      "comparison",
      "symbol",
      "delete",
      "enter",
      "move",
    ].sort()
  );
  const recipes = KEY_SOUNDS.map((k) => JSON.stringify(RECIPES[k]));
  expect(new Set(recipes).size).toBe(KEY_SOUNDS.length);
});

it("digits, letters and constants are only a quiet tick; constants are softer and rounder", () => {
  for (const k of ["digit", "letter", "variable"] as const) {
    const r = RECIPES[k];
    expect(r.bodyLevel, k).toBe(0); // no body: a click and nothing more
    expect(r.clickLevel, k).toBeLessThanOrEqual(0.17);
    expect(r.clickDecay, k).toBeLessThanOrEqual(0.01);
    expect(r.taps, k).toBeUndefined();
  }
  const c = RECIPES.constant;
  expect(c.clickLevel).toBeLessThan(RECIPES.digit.clickLevel);
  expect(c.click).toBeLessThan(RECIPES.digit.click); // rounder: a lower, wider band
  expect(c.clickQ).toBeLessThan(RECIPES.digit.clickQ);
  expect(c.bodyLevel).toBeLessThanOrEqual(0.1);
  expect(c.taps).toBeUndefined();
  expect("vowel" in c).toBe(false); // no talking blip any more
});

it("the sounds the founder kept are unchanged: ~, the sin/cos/tan family and √", () => {
  expect(RECIPES.regression).toMatchObject({
    body: 180,
    glide: 1,
    taps: [
      { delay: 0.05, body: 240, level: 0.24 },
      { delay: 0.1, body: 320, level: 0.18 },
    ],
  });
  expect(RECIPES.function).toMatchObject({ body: 260, glide: 0.95, click: 1000, clickQ: 3 });
  expect(RECIPES.sqrt).toMatchObject({ body: 210, glide: 1.2, decay: 0.08, click: 900 });
});

it("every recipe is soft and warm: a low-mid body, a click under 2.4 kHz, short and quiet", () => {
  for (const k of KEY_SOUNDS) {
    const r = RECIPES[k];
    expect(r.body * Math.max(1, r.glide) * 2 ** (6 / 12), k).toBeLessThanOrEqual(600);
    expect(r.click, k).toBeLessThanOrEqual(2400);
    expect(r.decay, k).toBeLessThanOrEqual(0.12);
    expect(r.bodyLevel, k).toBeLessThanOrEqual(0.5);
    for (const tap of r.taps ?? []) expect(tap.body, k).toBeLessThanOrEqual(400);
  }
  expect(RECIPES.openParen.glide).toBeGreaterThan(1);
  expect(RECIPES.closeParen.glide).toBeLessThan(1);
  expect(RECIPES.openBracket.glide).toBeGreaterThan(1);
  expect(RECIPES.closeBracket.glide).toBeLessThan(1);
});

it("is off by default and, while off, plays nothing and never creates an audio context", () => {
  expect(keySoundsEnabled()).toBe(false);
  for (const sound of KEY_SOUNDS) playKeySound(sound);
  expect(FakeContext.made).toBe(0);
  expect(FakeContext.voices).toEqual([]);
});

it("turning it on creates one context, confirms with a tick, remembers the choice and tells subscribers", () => {
  const heard = vi.fn();
  subscribeKeySounds(heard);
  setKeySoundsEnabled(true);
  expect(heard).toHaveBeenCalledOnce();
  expect(localStorage.getItem(KEY_SOUNDS_STORAGE_KEY)).toBe("on");
  expect(FakeContext.made).toBe(1);
  expect(FakeContext.voices).toEqual(["noise"]); // the digit tick: a click with no body
  resetKeySoundsForTest();
  expect(keySoundsEnabled()).toBe(true); // read back from the device
  setKeySoundsEnabled(false);
  FakeContext.voices = [];
  playKeySound("enter");
  expect(FakeContext.voices).toEqual([]);
  expect(localStorage.getItem(KEY_SOUNDS_STORAGE_KEY)).toBe("off");
});

it("a sound plays its click, its body and its taps; a variant raises the body", () => {
  vi.useFakeTimers();
  setKeySoundsEnabled(true);
  const voicesOf = (sound: Parameters<typeof playKeySound>[0], variant = 0) => {
    vi.advanceTimersByTime(50); // past the repeat guard
    FakeContext.voices = [];
    playKeySound(sound, variant);
    return [...FakeContext.voices];
  };
  expect(voicesOf("plus")).toEqual(["noise", "triangle@170", "triangle@255"]);
  expect(voicesOf("regression")).toEqual(["noise", "triangle@180", "triangle@240", "triangle@320"]);
  expect(voicesOf("letter")).toEqual(["noise"]);
  expect(voicesOf("constant")).toEqual(["noise", "triangle@320"]);
  const [, raised] = voicesOf("function", 2); // tan
  expect(Number(raised.split("@")[1])).toBeCloseTo(260 * 2 ** (2 / 12), 6);
});

it("blocked storage keeps the sounds off and never throws", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("SecurityError");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("QuotaExceededError");
  });
  expect(keySoundsEnabled()).toBe(false);
  expect(() => setKeySoundsEnabled(true)).not.toThrow();
  expect(keySoundsEnabled()).toBe(true); // for this page
  vi.restoreAllMocks();
});

/** The sounds a typed sequence makes, key by key: ["letter"], ["function:2"], []… */
function typeKeys(keys: string[]): string[][] {
  const typed = new TypedKeySounds();
  return keys.map((k) =>
    typed.key(k).map((h) => (h.sound === "function" ? `function:${h.variant}` : h.sound))
  );
}
const chars = (text: string) => [...text];

it("names are read as the editor reads them: longest name from the left, as MathQuill does", () => {
  expect(operatorNamesIn("distance")).toEqual([["distance", 0, 8]]);
  expect(operatorNamesIn("distan")).toEqual([["tan", 3, 6]]);
  expect(operatorNamesIn("tanh")).toEqual([["tanh", 0, 4]]);
  expect(operatorNamesIn("sinh")).toEqual([["sinh", 0, 4]]);
  expect(operatorNamesIn("arcsin")).toEqual([["arcsin", 0, 6]]);
  expect(operatorNamesIn("median")).toEqual([["median", 0, 6]]);
  expect(operatorNamesIn("asin")).toEqual([["sin", 1, 4]]);
});

it("a function sounds once, only when its whole name is committed: distance never sounds tan", () => {
  const distance = typeKeys([...chars("distance"), "("]);
  expect(distance.slice(0, 8).flat()).toEqual(Array(8).fill("letter")); // no tan on "dis"+"tan"
  expect(distance[8]).toEqual([`function:${functionVariant("distance")}`]);
  const tanh = typeKeys([...chars("tanh"), "("]);
  expect(tanh.slice(0, 4).flat()).toEqual(["letter", "letter", "letter", "letter"]);
  expect(tanh[4]).toEqual([`function:${functionVariant("tanh")}`]);
  expect(functionVariant("tanh")).not.toBe(functionVariant("tan"));
  const sinh = typeKeys([...chars("sinh"), " "]);
  expect(sinh.flat()).toEqual([
    "letter",
    "letter",
    "letter",
    "letter",
    `function:${functionVariant("sinh")}`,
  ]);
  const arcsin = typeKeys([...chars("arcsin"), "("]);
  expect(arcsin.flat().filter((s) => s.startsWith("function"))).toEqual([
    `function:${functionVariant("arcsin")}`,
  ]);
  // sin, cos and tan keep the three sounds the founder chose.
  expect(typeKeys([...chars("sin"), "("])[3]).toEqual(["function:0"]);
  expect(typeKeys([...chars("cos"), "("])[3]).toEqual(["function:1"]);
  expect(typeKeys([...chars("tan"), "("])[3]).toEqual(["function:2"]);
  // A run that ends between names commits nothing; letters after a name end it as letters.
  expect(typeKeys([...chars("sinx"), "+"])[4]).toEqual(["plus"]);
  // Backspace shortens the run: "tanh" back to "tan" commits tan.
  expect(typeKeys([...chars("tanh"), "Backspace", "("]).at(-1)).toEqual(["function:2"]);
  // Shift between letters keeps the run.
  expect(typeKeys(["s", "Shift", "i", "n", "("]).at(-1)).toEqual(["function:0"]);
});

it("auto-commands sound the moment the editor converts them; midpoint stays a name", () => {
  expect(typeKeys(chars("pi"))).toEqual([["letter"], ["constant"]]);
  expect(typeKeys(chars("sqrt")).at(-1)).toEqual(["sqrt"]);
  const midpoint = typeKeys([...chars("midpoint"), "("]);
  expect(midpoint.slice(0, 8).flat()).not.toContain("function:0");
  expect(midpoint[8]).toEqual([`function:${functionVariant("midpoint")}`]);
});

it("typed keys: each operator and pair has its sound; digits, letters and x, y tick", () => {
  const s = (key: string) => typeKeys([key])[0][0] ?? null;
  expect([s("7"), s("."), s("q"), s("x"), s("y")]).toEqual([
    "digit",
    "digit",
    "letter",
    "variable",
    "variable",
  ]);
  expect(["-", "+", "*", "/", "="].map(s)).toEqual(["minus", "plus", "times", "divide", "equals"]);
  expect(["(", ")", "[", "]"].map(s)).toEqual([
    "openParen",
    "closeParen",
    "openBracket",
    "closeBracket",
  ]);
  expect([s("^"), s("_"), s("~"), s("<"), s("π")]).toEqual([
    "exponent",
    "subscript",
    "regression",
    "comparison",
    "constant",
  ]);
  expect(s("%")).toMatch(/^function/);
  expect([s("Backspace"), s("Delete"), s("Enter"), s("ArrowLeft")]).toEqual([
    "delete",
    "delete",
    "enter",
    "move",
  ]);
  expect([s("Shift"), s("Tab")]).toEqual([null, null]);
  expect(s(",")).toBe("symbol");
});

it("keypad keys sound as the same typed keys do; the second = of a quick pair is a regression; page keys are silent", () => {
  const k = (id: string, double = false) => soundForKeypadKey(id, double)?.sound ?? null;
  const t = (key: string) => typeKeys([key])[0][0] ?? null;
  for (const [id, key] of [
    ["7", "7"],
    ["point", "."],
    ["x", "x"],
    ["q", "q"],
    ["minus", "-"],
    ["plus", "+"],
    ["times", "*"],
    ["divide", "/"],
    ["equals", "="],
    ["power", "^"],
    ["subscript", "_"],
    ["tilde", "~"],
    ["lparen", "("],
    ["rparen", ")"],
    ["bracket", "["],
    ["lt", "<"],
    ["backspace", "Backspace"],
    ["enter", "Enter"],
    ["left", "ArrowLeft"],
  ])
    expect(k(id), id).toBe(t(key));
  expect([k("squared"), k("sqrt"), k("pi"), k("abs")]).toEqual([
    "exponent",
    "sqrt",
    "constant",
    "function",
  ]);
  expect(k("equals", true)).toBe("regression");
  for (const id of ["letters", "shift", "functions", "audio"]) expect(k(id), id).toBeNull();
});

it("Functions panel buttons are the function family, pitched as the same typed function", () => {
  const entries = panelCategories().flatMap((c) => c.entries);
  for (const entry of entries.filter((e) => ["sin", "cos", "tan", "ln"].includes(e.name)))
    expect(soundForFunction(entry.spoken), entry.spoken).toEqual({
      sound: "function",
      variant: functionVariant(entry.name),
    });
  expect(entries.some((e) => e.name === "sin")).toBe(true);
  const variants = new Set(
    ["mean", "median", "ln", "log", "exp", "stdev"].map((n) => soundForFunction(n).variant)
  );
  expect(variants.size).toBeGreaterThan(2);
  expect(soundForFunction("mean").sound).toBe("function");
});

it("the listeners play for keys typed in a math field and pressed on the keypad or Functions panel, and nothing while off", () => {
  vi.useFakeTimers();
  const root = document.body.appendChild(document.createElement("div"));
  root.innerHTML =
    '<span class="mq-editable-field"><textarea></textarea></span>' +
    '<input class="plain" />' +
    '<div class="kc-keypad"><button class="kc-key" data-key="pi"></button></div>' +
    '<div class="kc-functions-panel" role="group" aria-label="Functions">' +
    '<div role="group" aria-label="Trig"><button class="kc-function" aria-label="sine"></button></div></div>';
  const off = installKeySounds(root);
  const textarea = root.querySelector("textarea")!;
  const key = root.querySelector<HTMLButtonElement>(".kc-key")!;
  const fn = root.querySelector<HTMLButtonElement>(".kc-function")!;
  const typeIn = (target: Element, k: string) =>
    target.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
  const press = (el: Element) =>
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
  typeIn(textarea, "7");
  press(key);
  expect(FakeContext.made).toBe(0); // off: no sound and no context
  setKeySoundsEnabled(true);
  const heard = (act: () => void) => {
    vi.advanceTimersByTime(50);
    FakeContext.voices = [];
    act();
    return [...FakeContext.voices];
  };
  expect(heard(() => typeIn(textarea, "^"))).toEqual(["noise", "triangle@200"]);
  expect(heard(() => press(key))).toEqual(["noise", "triangle@320"]); // π: the round tick
  expect(heard(() => press(fn))[0]).toBe("noise");
  expect(heard(() => typeIn(root.querySelector(".plain")!, "7"))).toEqual([]); // not maths
  off();
  expect(heard(() => typeIn(textarea, "7"))).toEqual([]);
  root.remove();
});
