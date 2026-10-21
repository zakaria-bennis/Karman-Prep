// Keypad key tables, drawn to the reference keypad (rea-targets visual keypad.md, VIS-KEYPAD-3 to
// 23). Node tests load this module, so it imports MathField types with `import type` only and
// never touches React or the vendored MathQuill.
//
// Both pages are rows of cells sized as a fraction of the key block's inner width. The 123 page is
// an 11-unit grid (4 keys, a half-unit gap, 4 keys, a half-unit gap, 2 units); the letters page is
// a 10-column grid whose third and fourth rows mix 1.5- and 2-unit keys of the 11-unit grid with
// spacers that share what is left. Every width, phones included, uses the same two pages.
import type { MathFieldAction } from "@/lib/calculator/core/latex/operator-names";

export type KeyBehaviour =
  | { type: "insert"; action: MathFieldAction }
  | { type: "enter" }
  | { type: "letters" } // the ABC key: "A B C" or "1 2 3", accessible name "ABC" on the main page and "Toggle Numbers" on the letters page
  | { type: "shift" } // aria-pressed
  | { type: "functions" } // aria-expanded
  | { type: "audio" }; // K-9: starts and stops the keyboard trace (POI-20)

/** The keypad's own drawn icons (keypad-icons.tsx). */
export type KeyIcon = "left" | "right" | "backspace" | "enter" | "audio" | "shift";

/**
 * How a key's face is drawn: plain maths text (italic for variables), a word in the UI font, an
 * icon, or one of the typeset glyphs Keypad draws itself.
 */
export type KeyFace =
  | { kind: "math"; text: string; italic?: boolean }
  | { kind: "word"; text: string }
  | { kind: "icon"; icon: KeyIcon }
  | { kind: "power"; exponent: string; italic: boolean } // a² and aᵇ
  | { kind: "subscript" } // aᵦ
  | { kind: "abs" } // |a|
  | { kind: "sqrt" }
  | { kind: "dual"; first: string; second: string; selected: 0 | 1; raised?: boolean };

/** Light keys are white, dark keys grey, the accent key is Enter (VIS-KEYPAD-6 to 8). */
export type KeyTone = "light" | "dark" | "accent";

export interface KeyDef {
  id: string;
  label: string; // visible text in words or symbols; "" for an icon key
  face: KeyFace;
  name: string; // accessible name, in words
  behaviour: KeyBehaviour;
  width: number; // fraction of the key block's inner width taken by the key's cell
  tone: KeyTone;
}
/** An empty cell: a fixed fraction of the inner width, or "fill" to share what the row leaves. */
export interface KeySpacer {
  spacer: number | "fill";
}
export type RowItem = KeyDef | KeySpacer;

export interface KeypadLayout {
  page: "main" | "letters";
  rows: readonly (readonly RowItem[])[];
}

export const isSpacer = (item: RowItem): item is KeySpacer => "spacer" in item;

/** VIS-KEYPAD-39: "functions" reads "funcs" in the narrow layout. */
export const NARROW_BELOW = 450;
/** VIS-KEYPAD-39: "A B C" reads "ABC" at 600 px and under. */
export const SPACED_ABC_ABOVE = 600;

type Page = KeypadLayout["page"];
type FixedKey = Omit<KeyDef, "id" | "width">;

const insert = (op: MathFieldAction["op"], arg: string): KeyBehaviour => ({
  type: "insert",
  action: { op, arg },
});
const typed = (arg: string) => insert("typedText", arg);
const math = (text: string, italic = false): KeyFace => ({ kind: "math", text, italic });

function fixed(
  label: string,
  name: string,
  behaviour: KeyBehaviour,
  tone: KeyTone = "light",
  face: KeyFace = math(label)
): FixedKey {
  return { label, face, name, behaviour, tone };
}
function iconKey(
  icon: KeyIcon,
  name: string,
  behaviour: KeyBehaviour,
  tone: KeyTone = "dark"
): FixedKey {
  return { label: "", face: { kind: "icon", icon }, name, behaviour, tone };
}

// Behaviours follow the package Decisions' reading E2 of K-10: `a²` is one write("^2"), the named
// symbols π, θ, τ, ≤ and ≥ are cmd, every other character is typedText.
const FIXED_KEYS: Readonly<Record<string, FixedKey>> = {
  x: fixed("x", "x", typed("x"), "light", math("x", true)),
  y: fixed("y", "y", typed("y"), "light", math("y", true)),
  squared: fixed("a²", "Squared", insert("write", "^2"), "light", {
    kind: "power",
    exponent: "2",
    italic: false,
  }),
  power: fixed("aᵇ", "Power", insert("cmd", "^"), "light", {
    kind: "power",
    exponent: "b",
    italic: true,
  }),
  lparen: fixed("(", "Left parenthesis", typed("(")),
  rparen: fixed(")", "Right parenthesis", typed(")")),
  lt: fixed("<", "Less than", typed("<")),
  gt: fixed(">", "Greater than", typed(">")),
  abs: fixed("|a|", "Absolute value", insert("cmd", "|"), "light", { kind: "abs" }),
  comma: fixed(",", "Comma", typed(",")),
  le: fixed("≤", "Less than or equal to", insert("cmd", "\\le")),
  ge: fixed("≥", "Greater than or equal to", insert("cmd", "\\ge")),
  sqrt: fixed("√", "Square root", insert("cmd", "\\sqrt"), "light", { kind: "sqrt" }),
  pi: fixed("π", "Pi", insert("cmd", "\\pi")),
  point: fixed(".", "Decimal point", typed("."), "dark"),
  divide: fixed("÷", "Divide", typed("/")),
  times: fixed("×", "Multiply", typed("*")),
  minus: fixed("−", "Minus", typed("-")),
  plus: fixed("+", "Plus", typed("+")),
  equals: fixed("=", "Equals", typed("=")),
  audio: iconKey("audio", "Audio trace", { type: "audio" }),
  left: iconKey("left", "Left arrow", insert("keystroke", "Left")),
  right: iconKey("right", "Right arrow", insert("keystroke", "Right")),
  backspace: iconKey("backspace", "Backspace", insert("keystroke", "Backspace")),
  enter: iconKey("enter", "Enter", { type: "enter" }, "accent"),
  shift: iconKey("shift", "Shift", { type: "shift" }),
};

/** VIS-KEYPAD-22, 23: the keys whose Shift state is a second symbol, and θ/τ and aᵦ/aᵇ. */
function shiftableKey(id: string, shift: boolean): FixedKey | null {
  const dual = (
    first: string,
    second: string,
    names: [string, string],
    inserts: [KeyBehaviour, KeyBehaviour],
    raised = false
  ): FixedKey => {
    const i = shift ? 1 : 0;
    const face: KeyFace = { kind: "dual", first, second, selected: i, raised };
    return {
      label: `${first} ${second}`,
      face,
      name: names[i],
      behaviour: inserts[i],
      tone: "light",
    };
  };
  switch (id) {
    case "theta":
      return shift
        ? fixed("τ", "Tau", insert("cmd", "\\tau"), "light", math("τ", true))
        : fixed("θ", "Theta", insert("cmd", "\\theta"), "light", math("θ", true));
    case "subscript":
      return shift
        ? fixed("aᵇ", "Superscript", insert("cmd", "^"), "light", {
            kind: "power",
            exponent: "b",
            italic: true,
          })
        : fixed("aᵦ", "Subscript", insert("cmd", "_"), "light", { kind: "subscript" });
    case "bang":
      return dual("!", "′", ["!", "'"], [typed("!"), typed("'")]);
    case "bracket":
      return dual("[", "]", ["[", "]"], [typed("["), typed("]")]);
    case "brace":
      return dual("{", "}", ["{", "}"], [typed("{"), typed("}")]);
    case "tilde":
      return dual("~", "%", ["~", "%"], [typed("~"), typed("%")], true);
    case "colon":
      return dual(":", ";", [":", ";"], [typed(":"), typed(";")]);
    default:
      return null;
  }
}

function keyDef(
  id: string,
  width: number,
  page: Page,
  shift: boolean,
  containerWidth: number
): KeyDef {
  if (/^[0-9]$/.test(id)) {
    return {
      id,
      label: id,
      face: math(id),
      name: id,
      behaviour: typed(id),
      width,
      tone: "dark",
    };
  }
  if (/^[a-z]$/.test(id) && page === "letters") {
    const letter = shift ? id.toUpperCase() : id;
    const behaviour = typed(letter);
    const face = math(letter, true);
    return {
      id,
      label: letter,
      face,
      name: letter,
      behaviour,
      width,
      tone: "light",
    };
  }
  if (id === "letters") {
    const spaced = containerWidth > SPACED_ABC_ABOVE;
    const text = page === "main" ? (spaced ? "A B C" : "ABC") : "1 2 3";
    const behaviour: KeyBehaviour = { type: "letters" };
    const face: KeyFace = { kind: "word", text };
    // Desmos names the letters page's key "Toggle Numbers" (owner decision, 2026-10-21).
    const name = page === "main" ? "ABC" : "Toggle Numbers";
    return { id, label: text, face, name, behaviour, width, tone: "dark" };
  }
  if (id === "functions") {
    const text = containerWidth < NARROW_BELOW ? "funcs" : "functions";
    const face: KeyFace = { kind: "word", text };
    const behaviour: KeyBehaviour = { type: "functions" };
    return {
      id,
      label: text,
      face,
      name: "Functions",
      behaviour,
      width,
      tone: "dark",
    };
  }
  const key = shiftableKey(id, shift) ?? FIXED_KEYS[id];
  if (!key) throw new Error(`Unknown keypad key "${id}"`);
  return { id, ...key, width };
}

// Rows are space-separated tokens: a key id, `id*n` for a key n grid units wide, `_n` for an
// n-unit spacer and `_` for a spacer that shares what the row leaves.
type RowSpec = { grid: number; tokens: string };
const MAIN: readonly RowSpec[] = [
  { grid: 11, tokens: "x y squared power _0.5 7 8 9 divide _0.5 functions*2" },
  { grid: 11, tokens: "lparen rparen lt gt _0.5 4 5 6 times _0.5 left right" },
  { grid: 11, tokens: "abs comma le ge _0.5 1 2 3 minus _1 backspace*1.5" },
  { grid: 11, tokens: "letters audio sqrt pi _0.5 0 point equals plus _0.5 enter*2" },
];
const LETTERS: readonly RowSpec[] = [
  { grid: 10, tokens: "q w e r t y u i o p" },
  { grid: 10, tokens: "a s d f g h j k l theta" },
  { grid: 10, tokens: "shift*1.5/11 _ z x c v b n m _ backspace*1.5/11" },
  { grid: 10, tokens: "letters*2/11 _ subscript bang bracket brace tilde colon _ enter*2/11" },
];

function parseWidth(spec: string | undefined, grid: number): number {
  if (spec === undefined) return 1 / grid;
  const [units, ownGrid] = spec.split("/");
  return Number(units) / (ownGrid === undefined ? grid : Number(ownGrid));
}

function rows(specs: readonly RowSpec[], page: Page, shift: boolean, containerWidth: number) {
  return specs.map(({ grid, tokens }) =>
    tokens.split(" ").map((token): RowItem => {
      if (token === "_") return { spacer: "fill" };
      if (token.startsWith("_")) return { spacer: Number(token.slice(1)) / grid };
      const [keyId, span] = token.split("*");
      return keyDef(keyId, parseWidth(span, grid), page, shift, containerWidth);
    })
  );
}

export function keypadLayout(page: Page, containerWidth: number, shift: boolean): KeypadLayout {
  const specs = page === "main" ? MAIN : LETTERS;
  return { page, rows: rows(specs, page, shift && page === "letters", containerWidth) };
}

/** Every key of a layout, in row order. */
export function layoutKeys(layout: KeypadLayout): KeyDef[] {
  return layout.rows.flatMap((row) => row.filter((item): item is KeyDef => !isSpacer(item)));
}

/** A key's cell: its left edge and width as fractions of the key block's inner width. */
export interface KeyPlacement {
  key: KeyDef;
  x: number;
  width: number;
}

/** The cells of one row, with "fill" spacers sharing what the keys and fixed spacers leave. */
export function placeRow(row: readonly RowItem[]): KeyPlacement[] {
  const fixed = row.reduce(
    (sum, item) => sum + (isSpacer(item) ? (item.spacer === "fill" ? 0 : item.spacer) : item.width),
    0
  );
  const fills = row.filter((item) => isSpacer(item) && item.spacer === "fill").length;
  const fill = fills === 0 ? 0 : Math.max(0, 1 - fixed) / fills;
  const out: KeyPlacement[] = [];
  let x = 0;
  for (const item of row) {
    if (isSpacer(item)) {
      x += item.spacer === "fill" ? fill : item.spacer;
    } else {
      out.push({ key: item, x, width: item.width });
      x += item.width;
    }
  }
  return out;
}
