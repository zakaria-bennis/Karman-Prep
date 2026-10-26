// Which key sound a key makes, and the listeners that play them (key-sounds.ts): one for keys typed
// into a math field, one for presses on the on-screen keypad (its keys carry data-key) and on the
// Functions panel (its buttons are .kc-function, named by the function). A physical key and the
// keypad key that types the same thing make the same sound. The listeners only read events, so
// typing and the keypad behave exactly as without them. A key sounds on its press.
//
// Names are read as the editor reads them (founder decision, 2026-10-26): MathQuill turns a run of
// typed letters into function names by taking, from the left, the longest name that starts at
// each letter (its autoOperatorNames), and turns an auto-command (pi, sqrt, …) into its symbol the
// moment its last letter is typed. So an auto-command sounds at once, and a function sounds only
// when its name is complete and committed: when the run of letters ends (the next key is not a
// letter) and the run's last name reaches the end of the run. Typing "distance" never sounds
// "tan" on the way, "sinh" never sounds "sin", and "arcsin" sounds once, as arcsin.

import {
  AUTO_COMMANDS,
  mathQuillAutoOperatorNames,
  panelCategories,
} from "@/lib/calculator/core/latex/operator-names";
import { DOUBLE_TAP_MS } from "../keypad/double-tap";
import { playKeySound } from "./key-sounds";
import { functionVariant, type KeySound } from "./sound-recipes";

/** A sound and its variant (semitones up, so each function sounds its own). */
export interface KeyHit {
  sound: KeySound;
  variant: number;
}

const hit = (sound: KeySound, variant = 0): KeyHit => ({ sound, variant });

const OPERATOR_NAMES: readonly string[] = mathQuillAutoOperatorNames().split(" ");
const LONGEST_NAME = Math.max(...OPERATOR_NAMES.map((n) => n.length));
const NAME_SET: ReadonlySet<string> = new Set(OPERATOR_NAMES);

/** What each auto-command becomes, as a sound. */
const COMMAND_SOUNDS: Readonly<Record<string, KeySound>> = {
  pi: "constant",
  tau: "constant",
  infinity: "constant",
  infty: "constant",
  sqrt: "sqrt",
  cbrt: "sqrt",
  nthroot: "sqrt",
  sum: "function",
  prod: "function",
  int: "function",
};

/**
 * The function names MathQuill makes of a run of letters: from the left, the longest name starting
 * at each letter, the letters between names staying letters. Each as [name, start, end).
 */
export function operatorNamesIn(run: string): [name: string, start: number, end: number][] {
  const found: [string, number, number][] = [];
  let i = 0;
  while (i < run.length) {
    let match = "";
    for (let len = Math.min(LONGEST_NAME, run.length - i); len > 0; len--) {
      const candidate = run.slice(i, i + len);
      if (NAME_SET.has(candidate)) {
        match = candidate;
        break;
      }
    }
    if (match === "") {
      i++;
    } else {
      found.push([match, i, i + match.length]);
      i += match.length;
    }
  }
  return found;
}

/**
 * The auto-command the run ends with now, as the vendored MathQuill converts it on its last
 * letter: the longest one ending the run, unless a longer ending of the run is a function name
 * (so "midpoint" stays a name rather than ending in ∫).
 */
function commandAtEnd(run: string): string | null {
  let best: string | null = null;
  for (const command of AUTO_COMMANDS)
    if (run.endsWith(command) && (best === null || command.length > best.length)) best = command;
  if (best === null) return null;
  for (let len = best.length + 1; len <= Math.min(run.length, LONGEST_NAME); len++)
    if (NAME_SET.has(run.slice(-len))) return null;
  return best;
}

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
  "%": "function",
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
  "∞": "constant",
  "√": "sqrt",
  ".": "digit",
};

/** The sound of one key on its own, with no run of letters in play. */
function soundOfKey(key: string): KeyHit | null {
  if (key === "Backspace" || key === "Delete") return hit("delete");
  if (key === "Enter") return hit("enter");
  if (key.startsWith("Arrow")) return hit("move");
  if (key.length !== 1) return null; // Shift, Tab, F-keys and the like
  if (Object.hasOwn(CHAR_SOUNDS, key)) return hit(CHAR_SOUNDS[key]);
  if (/^[xyθ]$/i.test(key)) return hit("variable");
  if (/^[a-z]$/i.test(key)) return hit("letter");
  if (/^[0-9]$/.test(key)) return hit("digit");
  if (key === " ") return null;
  return hit("symbol");
}

/**
 * The sounds of keys typed into one math field, in order. It keeps the run of letters typed just
 * before, so a function sounds when its name is committed (see the header).
 */
export class TypedKeySounds {
  private run = "";

  /** The sounds `key` makes (none, one, or a committed function then nothing else). */
  key(key: string): KeyHit[] {
    if (key.length === 1 && /^[a-z]$/i.test(key)) {
      this.run += key;
      const command = commandAtEnd(this.run);
      if (command !== null) {
        this.run = ""; // MathQuill has replaced those letters with the command's symbol
        return [hit(COMMAND_SOUNDS[command] ?? "constant")];
      }
      return [soundOfKey(key)!];
    }
    if (key === "Backspace" || key === "Delete") {
      this.run = key === "Backspace" ? this.run.slice(0, -1) : this.run;
      return [hit("delete")];
    }
    if (key.length !== 1 && !["Enter", "Tab"].includes(key) && !key.startsWith("Arrow")) return []; // Shift and other modifiers leave the run as it is
    // Any other key ends the run of letters: a function whose name reaches its end is committed.
    const names = operatorNamesIn(this.run);
    const last = names.at(-1);
    const committed = last !== undefined && last[2] === this.run.length ? last[0] : null;
    this.run = "";
    if (committed !== null) return [hit("function", functionVariant(committed))];
    const own = soundOfKey(key);
    return own === null ? [] : [own];
  }

  /** Forgets the run (focus moved, or a click placed the caret elsewhere). */
  reset(): void {
    this.run = "";
  }
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
  abs: "function",
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

/** Each Functions panel entry's function name, by the spoken name its button carries. */
const PANEL_NAMES: ReadonlyMap<string, string> = new Map(
  panelCategories().flatMap((c) => c.entries.map((e) => [e.spoken, e.name] as const))
);

/** The sound of a Functions panel button: the function family, pitched for that function. */
export function soundForFunction(spoken: string): KeyHit {
  const name = PANEL_NAMES.get(spoken) ?? spoken;
  if (Object.hasOwn(COMMAND_SOUNDS, name) && COMMAND_SOUNDS[name] !== "function")
    return hit(COMMAND_SOUNDS[name]);
  return hit("function", functionVariant(name));
}

/** Installs the listeners on the calculator's root; returns the function that removes them. */
export function installKeySounds(root: HTMLElement): () => void {
  const typed = new TypedKeySounds();
  let lastEquals = -Infinity;
  const play = (hits: readonly (KeyHit | null)[]) => {
    for (const h of hits) if (h !== null) playKeySound(h.sound, h.variant);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.composedPath()[0];
    if (!(target instanceof Element) || target.closest(".mq-editable-field") === null) return;
    play(typed.key(event.key));
  };
  const press = (button: HTMLElement) => {
    typed.reset();
    if (button.classList.contains("kc-function")) {
      play([soundForFunction(button.getAttribute("aria-label") ?? "")]);
      return;
    }
    const id = button.dataset.key ?? "";
    const now = performance.now();
    const double = id === "equals" && now - lastEquals <= DOUBLE_TAP_MS;
    lastEquals = id === "equals" && !double ? now : -Infinity;
    play([soundForKeypadKey(id, double)]);
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
    else typed.reset(); // a click elsewhere moves the caret: the run is over
  };
  // A key pressed from the keyboard (Enter or Space on a focused key) clicks with no pointer.
  const onClick = (event: MouseEvent) => {
    if (event.detail !== 0) return;
    const button = keyOf(event);
    if (button !== null) press(button);
  };
  const onFocusIn = () => typed.reset();
  root.addEventListener("keydown", onKeyDown, true);
  root.addEventListener("pointerdown", onPointerDown, true);
  root.addEventListener("click", onClick, true);
  root.addEventListener("focusin", onFocusIn, true);
  return () => {
    root.removeEventListener("keydown", onKeyDown, true);
    root.removeEventListener("pointerdown", onPointerDown, true);
    root.removeEventListener("click", onClick, true);
    root.removeEventListener("focusin", onFocusIn, true);
  };
}
