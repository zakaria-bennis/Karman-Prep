// Keypad key tables (K-1, K-3, K-6, K-9 to K-11). Node tests load this module, so it imports
// MathField types with `import type` only and never touches React or the vendored MathQuill.
import type { MathFieldAction } from "@/lib/calculator-v2/core/latex/operator-names";

export type KeyBehaviour =
  | { type: "insert"; action: MathFieldAction }
  | { type: "enter" }
  | { type: "letters" } // the ABC key: visible ABC or 123, accessible name "ABC" on both pages, aria-pressed
  | { type: "shift" } // aria-pressed
  | { type: "functions" } // aria-expanded
  | { type: "audio" }; // aria-disabled until Phase 4 (K-9)
// lucide-react component names, kept as strings so keys.ts and its node tests never import React
export type KeyIcon =
  | "ArrowLeft"
  | "ArrowRight"
  | "Delete"
  | "CornerDownLeft"
  | "ArrowBigUp"
  | "Volume2";
export interface KeyDef {
  id: string;
  label: string; // visible text; "" for an icon key
  icon?: KeyIcon; // set only on the six icon keys (table below); Keypad draws it aria-hidden
  name: string; // accessible name, in words
  behaviour: KeyBehaviour;
  span: 1 | 2 | 3 | 4;
  tone: "key" | "operator" | "accent"; // TH-3 roles key, keyOperator, accent
  repeat: boolean; // true for left, right and backspace only (K-11)
}
export type KeyGroupId = "left" | "centre" | "right" | "letters" | "phone";
export interface KeyGroup {
  id: KeyGroupId;
  columns: number;
  rows: readonly (readonly KeyDef[])[];
}
export interface KeypadLayout {
  id: "tray" | "phone";
  page: "main" | "letters";
  groups: readonly KeyGroup[];
}
export const PHONE_KEYPAD_BELOW = 600; // container width < 600 → phone keypad (K-6)

type Page = KeypadLayout["page"];
type FixedKey = Omit<KeyDef, "id" | "span">;

const insert = (op: MathFieldAction["op"], arg: string): KeyBehaviour => ({
  type: "insert",
  action: { op, arg },
});
const typed = (arg: string) => insert("typedText", arg);

function fixed(
  label: string,
  name: string,
  behaviour: KeyBehaviour,
  tone: KeyDef["tone"] = "operator"
): FixedKey {
  return { label, name, behaviour, tone, repeat: false };
}
function iconKey(
  icon: KeyIcon,
  name: string,
  behaviour: KeyBehaviour,
  tone: KeyDef["tone"] = "operator",
  repeat = false
): FixedKey {
  return { label: "", icon, name, behaviour, tone, repeat };
}

// Every key except digits, letters a to z and the ABC key, whose labels depend on the key or the
// page. Behaviours follow the package Decisions' reading E2 of K-10: `a²` is one write("^2"), the
// named symbols π, θ, ≤ and ≥ are cmd, every other character is typedText.
const FIXED_KEYS: Readonly<Record<string, FixedKey>> = {
  squared: fixed("a²", "Squared", insert("write", "^2")),
  power: fixed("aᵇ", "Power", insert("cmd", "^")),
  lparen: fixed("(", "Left parenthesis", typed("(")),
  rparen: fixed(")", "Right parenthesis", typed(")")),
  lt: fixed("<", "Less than", typed("<")),
  gt: fixed(">", "Greater than", typed(">")),
  abs: fixed("|a|", "Absolute value", insert("cmd", "|")),
  comma: fixed(",", "Comma", typed(",")),
  le: fixed("≤", "Less than or equal to", insert("cmd", "\\le")),
  ge: fixed("≥", "Greater than or equal to", insert("cmd", "\\ge")),
  sqrt: fixed("√", "Square root", insert("cmd", "\\sqrt")),
  pi: fixed("π", "Pi", insert("cmd", "\\pi")),
  point: fixed(".", "Decimal point", typed("."), "key"),
  divide: fixed("÷", "Divide", typed("/")),
  times: fixed("×", "Multiply", typed("*")),
  minus: fixed("−", "Minus", typed("-")),
  plus: fixed("+", "Plus", typed("+")),
  equals: fixed("=", "Equals", typed("=")),
  tilde: fixed("~", "Tilde", typed("~")),
  audio: iconKey("Volume2", "Audio trace, available later", { type: "audio" }),
  functions: fixed("functions", "Functions", { type: "functions" }),
  left: iconKey("ArrowLeft", "Left arrow", insert("keystroke", "Left"), "operator", true),
  right: iconKey("ArrowRight", "Right arrow", insert("keystroke", "Right"), "operator", true),
  backspace: iconKey("Delete", "Backspace", insert("keystroke", "Backspace"), "operator", true),
  enter: iconKey("CornerDownLeft", "Enter", { type: "enter" }, "accent"),
  theta: fixed("θ", "Theta", insert("cmd", "\\theta"), "key"),
  prime: fixed("′", "Prime", typed("'")),
  subscript: fixed("aₙ", "Subscript", insert("cmd", "_")),
  shift: iconKey("ArrowBigUp", "Shift", { type: "shift" }),
  factorial: fixed("!", "Factorial", typed("!")),
  percent: fixed("%", "Percent", typed("%")),
  lbracket: fixed("[", "Left bracket", typed("[")),
  lbrace: fixed("{", "Left brace", typed("{")),
  colon: fixed(":", "Colon", typed(":")),
};

// Shift applies only on the letters page, the one page with a Shift key (K-3).
function keyDef(id: string, span: KeyDef["span"], page: Page, shift: boolean): KeyDef {
  if (/^[0-9]$/.test(id))
    return { id, label: id, name: id, behaviour: typed(id), span, tone: "key", repeat: false };
  if (/^[a-z]$/.test(id)) {
    const letter = shift && page === "letters" ? id.toUpperCase() : id;
    const behaviour = typed(letter);
    return { id, label: letter, name: letter, behaviour, span, tone: "key", repeat: false };
  }
  if (id === "letters") {
    const label = page === "main" ? "ABC" : "123";
    const behaviour: KeyBehaviour = { type: "letters" };
    return { id, label, name: "ABC", behaviour, span, tone: "operator", repeat: false };
  }
  const key = FIXED_KEYS[id];
  if (!key) throw new Error(`Unknown keypad key "${id}"`);
  return { id, ...key, span };
}

// Rows are written as space-separated key ids, `id*n` for a key n columns wide.
type RowSpec = readonly string[];
const TRAY_LEFT: RowSpec = [
  "x y squared power",
  "lparen rparen lt gt",
  "abs comma le ge",
  "letters audio sqrt pi",
];
const TRAY_CENTRE: RowSpec = ["7 8 9 divide", "4 5 6 times", "1 2 3 minus", "0 point equals plus"];
const TRAY_RIGHT: Record<"fine" | "coarse", RowSpec> = {
  fine: ["functions*2", "left right", "backspace*2", "enter*2"],
  coarse: ["functions*2", "left right", "tilde backspace", "enter*2"], // K-6 adds ~
};
const TRAY_LETTERS: RowSpec = [
  "q w e r t y u i o p",
  "a s d f g h j k l theta",
  "shift z x c v b n m prime tilde",
  "letters*4 subscript factorial percent lbracket lbrace colon",
];
const PHONE_MAIN: RowSpec = [
  "functions*2 left right tilde backspace*2",
  "x y squared 7 8 9 divide",
  "lparen rparen power 4 5 6 times",
  "lt gt sqrt 1 2 3 minus",
  "le ge pi 0 point equals plus",
  "letters abs comma audio enter*3",
];
const PHONE_LETTERS: RowSpec = [
  "a b c d e f g",
  "h i j k l m n",
  "o p q r s t u",
  "v w x y z theta shift",
  "subscript factorial percent lbracket lbrace tilde colon",
  "letters prime left right backspace enter*2",
];

function group(
  id: KeyGroupId,
  columns: number,
  rows: RowSpec,
  page: Page,
  shift: boolean
): KeyGroup {
  return {
    id,
    columns,
    rows: rows.map((row) =>
      row.split(" ").map((token) => {
        const [keyId, span = "1"] = token.split("*");
        return keyDef(keyId, Number(span) as KeyDef["span"], page, shift);
      })
    ),
  };
}

export function keypadLayout(
  page: "main" | "letters",
  containerWidth: number,
  pointer: "fine" | "coarse",
  shift: boolean
): KeypadLayout {
  if (containerWidth < PHONE_KEYPAD_BELOW) {
    const rows = page === "main" ? PHONE_MAIN : PHONE_LETTERS;
    return { id: "phone", page, groups: [group("phone", 7, rows, page, shift)] };
  }
  const right = group("right", 2, TRAY_RIGHT[pointer], page, shift);
  const groups =
    page === "main"
      ? [group("left", 4, TRAY_LEFT, page, shift), group("centre", 4, TRAY_CENTRE, page, shift)]
      : [group("letters", 10, TRAY_LETTERS, page, shift)];
  return { id: "tray", page, groups: [...groups, right] };
}
