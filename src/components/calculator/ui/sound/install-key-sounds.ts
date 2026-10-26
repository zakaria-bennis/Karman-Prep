// Which key sound a key makes, and the two listeners that play them (key-sounds.ts): one for keys
// typed into a math field, one for presses on the on-screen keypad (its keys carry data-key). The
// listeners only read events, so typing and the keypad behave exactly as without them. A key makes
// a sound on its press, as a physical key clicks on the way down.

import { DOUBLE_TAP_MS } from "../keypad/double-tap";
import { playKeySound, type KeySound } from "./key-sounds";

const OPERATOR_CHARS = new Set([..."+-*/=<>(),[]{}|!:", "−", "×", "÷", "≤", "≥"]);
const CONSTANT_CHARS = new Set(["π", "τ"]);
/** Constants typed as their names; MathQuill turns these words into the symbol. */
const CONSTANT_WORDS = ["pi", "tau"];

/** The sound of a key typed into a math field; `recent` is the letters typed just before it. */
export function soundForTypedKey(key: string, recent: string): KeySound | null {
  if (key === "Backspace" || key === "Delete") return "delete";
  if (key === "Enter") return "enter";
  if (key.startsWith("Arrow")) return "move";
  if (key.length !== 1) return null; // Shift, Tab, F-keys and the like
  if (key === "^") return "exponent";
  if (key === "~") return "regression";
  if (CONSTANT_CHARS.has(key)) return "constant";
  if (/[a-z]/i.test(key)) {
    const word = (recent + key).toLowerCase();
    return CONSTANT_WORDS.some((w) => word.endsWith(w)) ? "constant" : "digit";
  }
  if (OPERATOR_CHARS.has(key)) return "operator";
  return "digit";
}

const KEYPAD_SOUNDS: Readonly<Record<string, KeySound>> = {
  squared: "exponent",
  power: "exponent",
  tilde: "regression",
  pi: "constant",
  backspace: "delete",
  enter: "enter",
  left: "move",
  right: "move",
  point: "digit",
  x: "digit",
  y: "digit",
  theta: "digit",
  subscript: "digit",
};

/** Keys that only change the keypad itself (pages, Shift, Functions, audio trace) stay silent. */
const SILENT_KEYS = new Set(["letters", "shift", "functions", "audio"]);

/** The sound of an on-screen keypad key; `doubleEquals` is the second = of a quick pair (~). */
export function soundForKeypadKey(id: string, doubleEquals: boolean): KeySound | null {
  if (SILENT_KEYS.has(id)) return null;
  if (id === "equals" && doubleEquals) return "regression";
  if (Object.hasOwn(KEYPAD_SOUNDS, id)) return KEYPAD_SOUNDS[id];
  if (/^[0-9]$/.test(id) || /^[a-z]$/.test(id)) return "digit";
  return "operator";
}

/** Installs both listeners on the calculator's root; returns the function that removes them. */
export function installKeySounds(root: HTMLElement): () => void {
  let recent = "";
  let lastEquals = -Infinity;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.composedPath()[0];
    if (!(target instanceof Element) || target.closest(".mq-editable-field") === null) return;
    const sound = soundForTypedKey(event.key, recent);
    recent = /^[a-z]$/i.test(event.key) ? (recent + event.key).slice(-3) : "";
    if (sound !== null) playKeySound(sound);
  };
  const press = (key: HTMLElement) => {
    const id = key.dataset.key ?? "";
    const now = performance.now();
    const double = id === "equals" && now - lastEquals <= DOUBLE_TAP_MS;
    lastEquals = id === "equals" && !double ? now : -Infinity;
    const sound = soundForKeypadKey(id, double);
    if (sound !== null) playKeySound(sound);
  };
  const keypadKey = (event: Event): HTMLElement | null => {
    const target = event.composedPath()[0];
    const key = target instanceof Element ? target.closest<HTMLElement>(".kc-key[data-key]") : null;
    return key !== null && root.contains(key) ? key : null;
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const key = keypadKey(event);
    if (key !== null) press(key);
  };
  // A key pressed from the keyboard (Enter or Space on a focused key) clicks with no pointer.
  const onClick = (event: MouseEvent) => {
    if (event.detail !== 0) return;
    const key = keypadKey(event);
    if (key !== null) press(key);
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
