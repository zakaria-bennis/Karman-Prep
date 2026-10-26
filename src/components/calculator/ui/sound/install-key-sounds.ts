// Which key sound a key makes, and the listeners that play them (key-sounds.ts): one for keys typed
// into a math field, one for presses on the on-screen keypad (its keys carry data-key) and on the
// Functions panel (its buttons are .kc-function, named by the function). A physical key and the
// keypad key that types the same thing make the same sound. The listeners only read events, so
// typing and the keypad behave exactly as without them. A key sounds on its press, as a physical
// key clicks on the way down.

import { DOUBLE_TAP_MS } from "../keypad/double-tap";
import { playKeySound } from "./key-sounds";
import type { KeySound } from "./sound-recipes";

/** A sound and its variant (semitones up, so functions of one family differ). */
export interface KeyHit {
  sound: KeySound;
  variant: number;
}

const hit = (sound: KeySound, variant = 0): KeyHit => ({ sound, variant });

const CHAR_SOUNDS: Readonly<Record<string, KeySound>> = {
  "-": "minus",
  "−": "minus",
  "+": "plus",
  "*": "times",
  "×": "times",
  "/": "divide",
  "÷": "divide",
  "=": "equals",
  "^": "exponent",
  _: "subscript",
  "~": "regression",
  "%": "percent",
  "(": "openParen",
  ")": "closeParen",
  "[": "openBracket",
  "{": "openBracket",
  "]": "closeBracket",
  "}": "closeBracket",
  "<": "comparison",
  ">": "comparison",
  "≤": "comparison",
  "≥": "comparison",
  π: "constant",
  τ: "constant",
  "√": "sqrt",
  ".": "digit",
};

/** Words MathQuill turns into a function or symbol as their last letter is typed. */
const WORD_FAMILIES: readonly [KeySound, readonly string[]][] = [
  ["constant", ["pi", "tau"]],
  ["sqrt", ["sqrt"]],
  ["trig", ["sin", "cos", "tan", "sec", "csc", "cot", "sinh", "cosh", "tanh"]],
  ["log", ["ln", "log", "exp"]],
  ["stats", ["mean", "median", "stdev", "var", "total", "count", "max", "min"]],
];

/** The sound of a key typed into a math field; `recent` is the letters typed just before it. */
export function soundForTypedKey(key: string, recent: string): KeyHit | null {
  if (key === "Backspace" || key === "Delete") return hit("delete");
  if (key === "Enter") return hit("enter");
  if (key.startsWith("Arrow")) return hit("move");
  if (key.length !== 1) return null; // Shift, Tab, F-keys and the like
  if (Object.hasOwn(CHAR_SOUNDS, key)) return hit(CHAR_SOUNDS[key]);
  if (/[a-zθ]/i.test(key)) {
    const word = (recent + key).toLowerCase();
    // The longest word that ends here wins, so "sinh" is not heard as "in".
    let best: KeyHit | null = null;
    let length = 0;
    for (const [sound, words] of WORD_FAMILIES) {
      for (const [i, w] of words.entries()) {
        if (word.endsWith(w) && w.length > length) [best, length] = [hit(sound, i % 7), w.length];
      }
    }
    if (best !== null) return best;
    return hit(/^[xyθ]$/i.test(key) ? "variable" : "letter");
  }
  if (/[0-9]/.test(key)) return hit("digit");
  return hit("symbol");
}

const KEYPAD_SOUNDS: Readonly<Record<string, KeySound>> = {
  minus: "minus",
  plus: "plus",
  times: "times",
  divide: "divide",
  equals: "equals",
  squared: "exponent",
  power: "exponent",
  subscript: "subscript",
  tilde: "regression",
  sqrt: "sqrt",
  pi: "constant",
  lparen: "openParen",
  rparen: "closeParen",
  bracket: "openBracket",
  brace: "openBracket",
  lt: "comparison",
  gt: "comparison",
  le: "comparison",
  ge: "comparison",
  backspace: "delete",
  enter: "enter",
  left: "move",
  right: "move",
  point: "digit",
  x: "variable",
  y: "variable",
  theta: "variable",
};

/** Keys that only change the keypad itself (pages, Shift, Functions, audio trace) stay silent. */
const SILENT_KEYS = new Set(["letters", "shift", "functions", "audio"]);

/** The sound of an on-screen keypad key; `doubleEquals` is the second = of a quick pair (~). */
export function soundForKeypadKey(id: string, doubleEquals: boolean): KeyHit | null {
  if (SILENT_KEYS.has(id)) return null;
  if (id === "equals" && doubleEquals) return hit("regression");
  if (Object.hasOwn(KEYPAD_SOUNDS, id)) return hit(KEYPAD_SOUNDS[id]);
  if (/^[0-9]$/.test(id)) return hit("digit");
  if (/^[a-z]$/.test(id)) return hit("letter");
  return hit("symbol");
}

/** The Functions panel's families, by the heading of the panel group a function is in. */
const PANEL_FAMILIES: readonly [RegExp, KeySound][] = [
  [/trig/i, "trig"],
  [/statistic|list|distribution|inference|visuali/i, "stats"],
  [/calculus/i, "calculus"],
];

/** The sound of a Functions panel button: its family, varied per function by its name. */
export function soundForFunction(heading: string, name: string): KeyHit {
  if (/percent/i.test(name)) return hit("percent");
  if (/square root/i.test(name)) return hit("sqrt");
  if (/^(ln|log|exp)/i.test(name)) return hit("log");
  const family = PANEL_FAMILIES.find(([pattern]) => pattern.test(heading))?.[1] ?? "function";
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % 7;
  return hit(family, hash);
}

/** Installs the listeners on the calculator's root; returns the function that removes them. */
export function installKeySounds(root: HTMLElement): () => void {
  let recent = "";
  let lastEquals = -Infinity;
  const play = (h: KeyHit | null) => {
    if (h !== null) playKeySound(h.sound, h.variant);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.composedPath()[0];
    if (!(target instanceof Element) || target.closest(".mq-editable-field") === null) return;
    play(soundForTypedKey(event.key, recent));
    recent = /^[a-z]$/i.test(event.key) ? (recent + event.key).slice(-5) : "";
  };
  const press = (button: HTMLElement) => {
    if (button.classList.contains("kc-function")) {
      const group = button.closest("[role='group'][aria-label]:not(.kc-functions-panel)");
      play(soundForFunction(group?.getAttribute("aria-label") ?? "", button.ariaLabel ?? ""));
      return;
    }
    const id = button.dataset.key ?? "";
    const now = performance.now();
    const double = id === "equals" && now - lastEquals <= DOUBLE_TAP_MS;
    lastEquals = id === "equals" && !double ? now : -Infinity;
    play(soundForKeypadKey(id, double));
  };
  const keyOf = (event: Event): HTMLElement | null => {
    const target = event.composedPath()[0];
    const button =
      target instanceof Element
        ? target.closest<HTMLElement>(".kc-key[data-key], .kc-function")
        : null;
    return button !== null && root.contains(button) ? button : null;
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const button = keyOf(event);
    if (button !== null) press(button);
  };
  // A key pressed from the keyboard (Enter or Space on a focused key) clicks with no pointer.
  const onClick = (event: MouseEvent) => {
    if (event.detail !== 0) return;
    const button = keyOf(event);
    if (button !== null) press(button);
  };
  root.addEventListener("keydown", onKeyDown, true);
  root.addEventListener("pointerdown", onPointerDown, true);
  root.addEventListener("click", onClick, true);
  return () => {
    root.removeEventListener("keydown", onKeyDown, true);
    root.removeEventListener("pointerdown", onPointerDown, true);
    root.removeEventListener("click", onClick, true);
  };
}
