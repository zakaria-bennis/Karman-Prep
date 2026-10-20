// The Keyboard Shortcuts dialog's tables (SETTINGS-33): the reference's sections and wording, kept
// to what this calculator does. Rows for features it does not have (audio graph sonification,
// sliders' trace mode, Braille input, folders, notes, images, saving and sharing) are left out.
//
// A shortcut string is read by `shortcutParts`: alternatives are separated by ", " (or ", or "),
// keys by " + ", and parentheses are plain text. A part starting with "~" is typed letter by letter,
// each letter its own key cap (typing "sqrt" makes a square root).

export type SymbolId =
  | "power"
  | "subscript"
  | "le"
  | "ge"
  | "prime"
  | "fraction"
  | "sqrt"
  | "cbrt"
  | "nthroot"
  | "sum"
  | "int"
  | "prod"
  | "pi"
  | "theta";

export interface ShortcutRow {
  /** The function as words, or a typeset symbol drawn by the dialog (its words are `speech`). */
  label: string | { symbol: SymbolId; speech: string };
  win: string;
  mac: string;
}

export interface ShortcutSection {
  title: string;
  column: 0 | 1;
  rows: readonly ShortcutRow[];
}

const same = (label: ShortcutRow["label"], keys: string): ShortcutRow => ({
  label,
  win: keys,
  mac: keys,
});

const SYMBOLS: readonly ShortcutRow[] = [
  same({ symbol: "power", speech: "a to the power b" }, "^ (SHIFT + 6)"),
  same({ symbol: "subscript", speech: "a subscript b" }, "_ (SHIFT + -)"),
  same({ symbol: "le", speech: "less than or equal to" }, "~<="),
  same({ symbol: "ge", speech: "greater than or equal to" }, "~>="),
  same({ symbol: "prime", speech: "a prime" }, "'"),
  same({ symbol: "fraction", speech: "a over b" }, "/"),
  same({ symbol: "sqrt", speech: "square root of a" }, "~sqrt"),
  same({ symbol: "cbrt", speech: "cube root of a" }, "~cbrt"),
  same({ symbol: "nthroot", speech: "n-th root of a" }, "~nthroot"),
  same({ symbol: "sum", speech: "sum from n equals a to b" }, "~sum"),
  same({ symbol: "int", speech: "integral from a to b" }, "~int"),
  same({ symbol: "prod", speech: "product from n equals a to b" }, "~prod"),
  same({ symbol: "pi", speech: "pi" }, "~pi"),
  same({ symbol: "theta", speech: "theta" }, "~theta"),
];

const TABLES: readonly ShortcutRow[] = [
  same("Previous Cell", "SHIFT + TAB"),
  same("Next Cell", "TAB"),
  same("Previous Row", "UP ARROW"),
  same("Next Row", "DOWN ARROW"),
  same("Previous Column", "LEFT ARROW"),
  same("Next Column", "RIGHT ARROW"),
];

const ENTRY: readonly ShortcutRow[] = [
  same("Move to Previous Expression", "UP ARROW, SHIFT + Tab"),
  same("Move to Next Expression", "DOWN ARROW, Tab"),
  { label: "Remove Selected Empty Expression", win: "Backspace", mac: "Delete" },
  same("Previous Character", "LEFT ARROW"),
  same("Next Character", "RIGHT ARROW"),
  same("Move to Numerator Within Fraction", "UP ARROW"),
  same("Move to Denominator Within Fraction", "DOWN ARROW"),
  { label: "Beginning of Current Block", win: "Home", mac: "Fn + LEFT ARROW" },
  { label: "End of Current Block", win: "End", mac: "Fn + RIGHT ARROW" },
  { label: "Beginning of Current Expression", win: "CTRL + Home", mac: "CTRL + Fn + LEFT ARROW" },
  { label: "End of Current Expression", win: "CTRL + End", mac: "CTRL + Fn + RIGHT ARROW" },
  same("Increase Selection Left", "SHIFT + LEFT ARROW"),
  same("Increase Selection Right", "SHIFT + RIGHT ARROW"),
  { label: "Delete Selection", win: "Backspace", mac: "Delete" },
  { label: "Select All", win: "CTRL + A", mac: "COMMAND + A" },
];

const ACTIONS: readonly ShortcutRow[] = [
  same("Close a Dialog", "ESC"),
  { label: "Toggle Between Degrees and Radians", win: "ALT + D", mac: "CTRL + D" },
  { label: "Show or Hide the Keypad", win: "ALT + K", mac: "CTRL + K" },
  { label: "Add an Expression", win: "ALT + ENTER", mac: "OPTION + ENTER" },
  { label: "Enable or Disable Audio Trace Mode", win: "ALT + T", mac: "OPTION + T" },
  { label: "Undo", win: "CTRL + Z", mac: "COMMAND + Z" },
  { label: "Redo", win: "CTRL + SHIFT + Z", mac: "COMMAND + SHIFT + Z" },
  { label: "Zoom In", win: "ALT + +", mac: "CTRL + +" },
  { label: "Zoom Out", win: "ALT + -", mac: "CTRL + -" },
  { label: "Restore Default Viewport", win: "ALT + 0", mac: "CTRL + 0" },
  same(
    "Pan Graph in Given Direction (when focused)",
    "UP ARROW, DOWN ARROW, LEFT ARROW, or RIGHT ARROW"
  ),
  {
    label: "Open or Close the Graph Settings Menu",
    win: "CTRL + ALT + G",
    mac: "CTRL + COMMAND + G",
  },
  { label: "Open Keyboard Shortcuts Dialog", win: "CTRL + /", mac: "COMMAND + /" },
];

/** Left column first, then the right, each top to bottom (VIS-POPOVERS-MENUS-35). */
export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = [
  { title: "Common Symbols", column: 0, rows: SYMBOLS },
  { title: "Tables", column: 0, rows: TABLES },
  { title: "Expression Entry and Navigation", column: 1, rows: ENTRY },
  { title: "Common Actions", column: 1, rows: ACTIONS },
];

export type ShortcutPart = { cap: string } | { text: string };

/** A shortcut string as key caps and the plain text between them (see the header). */
export function shortcutParts(keys: string): ShortcutPart[] {
  const parts: ShortcutPart[] = [];
  for (const chunk of keys.split(/( \+ |, or |, |\(|\))/)) {
    const piece = chunk.trim();
    if (piece === "") continue;
    // A bare "+" is the plus key ("ALT + +"); the separator is " + " with its spaces.
    if (chunk === " + " || piece === "(" || piece === ")") parts.push({ text: piece });
    else if (piece === "," || piece === ", or") parts.push({ text: piece });
    else if (piece === "or") parts.push({ text: ", or" });
    else if (piece.startsWith("~") && piece.length > 1)
      for (const letter of piece.slice(1)) parts.push({ cap: letter });
    else parts.push({ cap: piece });
  }
  return parts;
}
