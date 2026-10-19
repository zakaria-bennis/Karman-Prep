// The editor's status-region copy (01-interfaces-integration.md section 11): the text the spec
// leaves open, fixed here. 10, 13 and the browser specs import it, so every path that announces
// one of these says exactly the same words. Node tests load this module; it imports nothing.

export const EDITOR_MESSAGES = {
  value: (n: number, valueText: string) => `Expression ${n} equals ${valueText}`, // A11Y-2
  error: (n: number, message: string) => `Expression ${n}: ${message}`, // A11Y-2
  clearAll: "All expressions cleared. Undo is available.", // KB-5
  undone: "Undone.",
  redone: "Redone.",
  rowLimit: "The calculator holds at most 100 expressions.", // MAX_ROWS (NM-42); 10's ROW_LIMIT_MESSAGE text
  charLimit: "Each expression can be up to 2,048 characters.", // MAX_ROW_CHARACTERS (T-13)
  tilde: "tilde", // K-7
  added: (kind: "Expression" | "Table", n: number) => `${kind} ${n} added`, // S-13
  angle: (mode: "radians" | "degrees") => `Angle set to ${mode}.`, // S-6, A11Y-2
  boundNotNumber: "Enter an expression with a finite value.", // S-7
  boundOrder: "The minimum must be less than the maximum.", // S-7
  stepInvalid: "Enter a positive number, or leave blank for automatic.", // S-7
} as const;
