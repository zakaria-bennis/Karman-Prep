// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installKeySounds, soundForKeypadKey, soundForTypedKey } from "./install-key-sounds";
import {
  KEY_SOUNDS_STORAGE_KEY,
  keySoundsEnabled,
  playKeySound,
  resetKeySoundsForTest,
  setKeySoundsEnabled,
  subscribeKeySounds,
} from "./key-sounds";

/** A Web Audio stand-in that counts contexts and the voices each sound starts. */
class FakeParam {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class FakeNode {
  frequency = new FakeParam();
  gain = new FakeParam();
  Q = new FakeParam();
  type = "";
  connect<T>(next: T): T {
    return next;
  }
  start() {
    FakeContext.voices.push(this.type);
  }
  stop() {}
}
class FakeContext {
  static made = 0;
  static voices: string[] = [];
  state = "running";
  currentTime = 0;
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

it("is off by default and, while off, plays nothing and never creates an audio context", () => {
  expect(keySoundsEnabled()).toBe(false);
  for (const sound of ["digit", "operator", "constant", "regression"] as const) playKeySound(sound);
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
  expect(FakeContext.voices.length).toBeGreaterThan(0);
  resetKeySoundsForTest();
  expect(keySoundsEnabled()).toBe(true); // read back from the device
  setKeySoundsEnabled(false);
  FakeContext.voices = [];
  playKeySound("enter");
  expect(FakeContext.voices).toEqual([]);
  expect(localStorage.getItem(KEY_SOUNDS_STORAGE_KEY)).toBe("off");
});

it("each kind of key has its own sound: the constant's is a voice through formant filters", () => {
  vi.useFakeTimers();
  setKeySoundsEnabled(true);
  const voicesOf = (sound: Parameters<typeof playKeySound>[0]) => {
    vi.advanceTimersByTime(50); // past the repeat guard
    FakeContext.voices = [];
    playKeySound(sound);
    return [...FakeContext.voices];
  };
  expect(voicesOf("digit")).toEqual(["triangle"]);
  expect(voicesOf("operator")).toEqual(["triangle", "sine"]);
  expect(voicesOf("exponent")).toEqual(["sine"]);
  expect(voicesOf("regression")).toEqual(["sine", "sine", "sine"]);
  expect(voicesOf("constant")).toEqual(["sawtooth"]);
  expect(voicesOf("delete")).toEqual(["sine"]);
  expect(voicesOf("enter")).toEqual(["sine", "sine"]);
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

it("typed keys: digits, operators, ^ raises, ~ runs a regression, π and the word pi are constants", () => {
  expect(soundForTypedKey("7", "")).toBe("digit");
  expect(soundForTypedKey(".", "")).toBe("digit");
  expect(soundForTypedKey("x", "")).toBe("digit");
  for (const k of ["+", "-", "*", "/", "=", "<", "(", ")"])
    expect(soundForTypedKey(k, ""), k).toBe("operator");
  expect(soundForTypedKey("^", "")).toBe("exponent");
  expect(soundForTypedKey("~", "")).toBe("regression");
  expect(soundForTypedKey("π", "")).toBe("constant");
  expect(soundForTypedKey("i", "p")).toBe("constant");
  expect(soundForTypedKey("u", "ta")).toBe("constant");
  expect(soundForTypedKey("i", "s")).toBe("digit");
  expect(soundForTypedKey("Backspace", "")).toBe("delete");
  expect(soundForTypedKey("Delete", "")).toBe("delete");
  expect(soundForTypedKey("Enter", "")).toBe("enter");
  expect(soundForTypedKey("ArrowLeft", "")).toBe("move");
  expect(soundForTypedKey("Shift", "")).toBeNull();
  expect(soundForTypedKey("Tab", "")).toBeNull();
});

it("keypad keys: the same kinds, the second = of a quick pair is a regression, page keys are silent", () => {
  expect(soundForKeypadKey("7", false)).toBe("digit");
  expect(soundForKeypadKey("point", false)).toBe("digit");
  expect(soundForKeypadKey("plus", false)).toBe("operator");
  expect(soundForKeypadKey("sqrt", false)).toBe("operator");
  expect(soundForKeypadKey("squared", false)).toBe("exponent");
  expect(soundForKeypadKey("power", false)).toBe("exponent");
  expect(soundForKeypadKey("tilde", false)).toBe("regression");
  expect(soundForKeypadKey("equals", false)).toBe("operator");
  expect(soundForKeypadKey("equals", true)).toBe("regression");
  expect(soundForKeypadKey("pi", false)).toBe("constant");
  expect(soundForKeypadKey("backspace", false)).toBe("delete");
  expect(soundForKeypadKey("enter", false)).toBe("enter");
  for (const id of ["letters", "shift", "functions", "audio"])
    expect(soundForKeypadKey(id, false), id).toBeNull();
});

it("the listeners play for keys typed in a math field and pressed on the keypad, and nothing while off", () => {
  vi.useFakeTimers();
  const root = document.body.appendChild(document.createElement("div"));
  root.innerHTML =
    '<span class="mq-editable-field"><textarea></textarea></span>' +
    '<input class="plain" />' +
    '<div class="kc-keypad"><button class="kc-key" data-key="pi"></button></div>';
  const off = installKeySounds(root);
  const textarea = root.querySelector("textarea")!;
  const key = root.querySelector<HTMLButtonElement>(".kc-key")!;
  const typeIn = (target: Element, k: string) =>
    target.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
  typeIn(textarea, "7");
  key.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
  expect(FakeContext.made).toBe(0); // off: no sound and no context
  setKeySoundsEnabled(true);
  vi.advanceTimersByTime(50);
  FakeContext.voices = [];
  typeIn(textarea, "^");
  expect(FakeContext.voices).toEqual(["sine"]);
  vi.advanceTimersByTime(50);
  FakeContext.voices = [];
  key.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
  expect(FakeContext.voices).toEqual(["sawtooth"]);
  vi.advanceTimersByTime(50);
  FakeContext.voices = [];
  typeIn(root.querySelector(".plain")!, "7"); // a plain text field is not typing maths
  expect(FakeContext.voices).toEqual([]);
  off();
  typeIn(textarea, "7");
  expect(FakeContext.voices).toEqual([]);
  root.remove();
});
