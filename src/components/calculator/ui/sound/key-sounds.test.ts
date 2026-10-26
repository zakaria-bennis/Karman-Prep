// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  installKeySounds,
  soundForFunction,
  soundForKeypadKey,
  soundForTypedKey,
} from "./install-key-sounds";
import {
  KEY_SOUNDS_STORAGE_KEY,
  keySoundsEnabled,
  playKeySound,
  resetKeySoundsForTest,
  setKeySoundsEnabled,
  subscribeKeySounds,
} from "./key-sounds";
import { KEY_SOUNDS, RECIPES } from "./sound-recipes";

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
  expect(KEY_SOUNDS).toEqual(
    expect.arrayContaining([
      "digit",
      "letter",
      "variable",
      "minus",
      "plus",
      "times",
      "divide",
      "exponent",
      "subscript",
      "regression",
      "equals",
      "sqrt",
      "percent",
      "trig",
      "log",
      "stats",
      "calculus",
      "function",
      "openParen",
      "closeParen",
      "openBracket",
      "closeBracket",
      "constant",
      "delete",
      "enter",
    ])
  );
  const recipes = KEY_SOUNDS.map((k) => JSON.stringify(RECIPES[k]));
  expect(new Set(recipes).size).toBe(KEY_SOUNDS.length);
});

it("every recipe is soft and warm: a low-mid body, a click under 2.4 kHz, short and quiet", () => {
  for (const k of KEY_SOUNDS) {
    const r = RECIPES[k];
    expect(r.body, k).toBeGreaterThanOrEqual(110);
    expect(r.body * Math.max(1, r.glide) * 2 ** (6 / 12), k).toBeLessThanOrEqual(600);
    expect(r.click, k).toBeLessThanOrEqual(2400);
    expect(r.decay, k).toBeLessThanOrEqual(0.12);
    expect(r.bodyLevel, k).toBeLessThanOrEqual(0.5);
    for (const tap of r.taps ?? []) expect(tap.body, k).toBeLessThanOrEqual(400);
  }
  // Open and close pairs run opposite ways.
  expect(RECIPES.openParen.glide).toBeGreaterThan(1);
  expect(RECIPES.closeParen.glide).toBeLessThan(1);
  expect(RECIPES.openBracket.glide).toBeGreaterThan(1);
  expect(RECIPES.closeBracket.glide).toBeLessThan(1);
  expect(RECIPES.constant.vowel).toHaveLength(2); // the talky blip
});

it("is off by default and, while off, plays nothing and never creates an audio context", () => {
  expect(keySoundsEnabled()).toBe(false);
  for (const sound of KEY_SOUNDS) playKeySound(sound);
  expect(FakeContext.made).toBe(0);
  expect(FakeContext.voices).toEqual([]);
});

it("turning it on creates one context, confirms with a key, remembers the choice and tells subscribers", () => {
  const heard = vi.fn();
  subscribeKeySounds(heard);
  setKeySoundsEnabled(true);
  expect(heard).toHaveBeenCalledOnce();
  expect(localStorage.getItem(KEY_SOUNDS_STORAGE_KEY)).toBe("on");
  expect(FakeContext.made).toBe(1);
  expect(FakeContext.voices).toEqual(["noise", "triangle@190"]);
  resetKeySoundsForTest();
  expect(keySoundsEnabled()).toBe(true); // read back from the device
  setKeySoundsEnabled(false);
  FakeContext.voices = [];
  playKeySound("enter");
  expect(FakeContext.voices).toEqual([]);
  expect(localStorage.getItem(KEY_SOUNDS_STORAGE_KEY)).toBe("off");
});

it("a sound plays its click, its body, its taps and (for constants) its voice; a variant raises the body", () => {
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
  expect(voicesOf("constant")).toEqual(["noise", "sawtooth@180", "triangle@180"]);
  const [, raised] = voicesOf("trig", 3);
  expect(Number(raised.split("@")[1])).toBeCloseTo(260 * 2 ** (3 / 12), 6);
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

it("typed keys: each operator, pair and family has its sound; words become their function or constant", () => {
  const s = (key: string, recent = "") => soundForTypedKey(key, recent)?.sound ?? null;
  expect(s("7")).toBe("digit");
  expect(s(".")).toBe("digit");
  expect(s("q")).toBe("letter");
  expect([s("x"), s("y")]).toEqual(["variable", "variable"]);
  expect(["-", "+", "*", "/", "="].map((k) => s(k))).toEqual([
    "minus",
    "plus",
    "times",
    "divide",
    "equals",
  ]);
  expect(["(", ")", "[", "]"].map((k) => s(k))).toEqual([
    "openParen",
    "closeParen",
    "openBracket",
    "closeBracket",
  ]);
  expect([s("^"), s("_"), s("~"), s("%"), s("<")]).toEqual([
    "exponent",
    "subscript",
    "regression",
    "percent",
    "comparison",
  ]);
  expect([s("π"), s("i", "p"), s("u", "ta")]).toEqual(["constant", "constant", "constant"]);
  expect([s("n", "si"), s("h", "sin"), s("n", "l"), s("n", "mea"), s("t", "sqr")]).toEqual([
    "trig",
    "trig",
    "log",
    "stats",
    "sqrt",
  ]);
  expect(soundForTypedKey("n", "si")).not.toEqual(soundForTypedKey("s", "co")); // sin ≠ cos
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
  const t = (key: string) => soundForTypedKey(key, "")?.sound ?? null;
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
  expect([k("squared"), k("sqrt"), k("pi")]).toEqual(["exponent", "sqrt", "constant"]);
  expect(k("equals", true)).toBe("regression");
  for (const id of ["letters", "shift", "functions", "audio"]) expect(k(id), id).toBeNull();
});

it("Functions panel buttons sound by family and vary by function", () => {
  expect(soundForFunction("Trig", "sine").sound).toBe("trig");
  expect(soundForFunction("Hyperbolic trig", "hyperbolic sine").sound).toBe("trig");
  expect(soundForFunction("Statistics", "mean").sound).toBe("stats");
  expect(soundForFunction("Probability distributions", "normal distribution").sound).toBe("stats");
  expect(soundForFunction("Calculus", "derivative").sound).toBe("calculus");
  expect(soundForFunction("Number theory", "least common multiple").sound).toBe("function");
  expect(soundForFunction("Advanced", "percent of").sound).toBe("percent");
  expect(soundForFunction("Advanced", "natural log").sound).toBe("function");
  expect(soundForFunction("Advanced", "ln").sound).toBe("log");
  const variants = new Set(
    ["sine", "cosine", "tangent", "secant", "cosecant", "cotangent"].map(
      (n) => soundForFunction("Trig", n).variant
    )
  );
  expect(variants.size).toBeGreaterThan(2);
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
  expect(heard(() => press(key))).toEqual(["noise", "sawtooth@180", "triangle@180"]);
  expect(heard(() => press(fn))[0]).toBe("noise");
  expect(heard(() => typeIn(root.querySelector(".plain")!, "7"))).toEqual([]); // not maths
  off();
  expect(heard(() => typeIn(textarea, "7"))).toEqual([]);
  root.remove();
});
