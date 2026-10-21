import {
  mathQuillAutoCommands,
  mathQuillAutoOperatorNames,
} from "@/lib/calculator/core/latex/operator-names";

// MathQuill options for every calculator field. This module imports nothing from
// vendor/mathquill/: MathField.ts is its only importer, and it adds the four hooks
// (substituteTextarea, overrideTypedText, overrideKeystroke, handlers) to these options.

/** Typed in a non-empty superscript or subscript, these leave it first (T-6, T-1). */
export const CHARS_THAT_BREAK_OUT_OF_SUPSUB = "+-=<>~,";

/** MathQuill key names of the undo and redo chords that never reach MathQuill. */
export const NATIVE_HISTORY_CHORDS: readonly string[] = Object.freeze([
  "Ctrl-Z",
  "Meta-Z",
  "Ctrl-Shift-Z",
  "Meta-Shift-Z",
  "Ctrl-Y",
  "Meta-Y",
]);

export function isNativeHistoryChord(key: string): boolean {
  return NATIVE_HISTORY_CHORDS.includes(key);
}

/** The members of mathquill.d.ts `MathQuillConfig` minus the four hooks. */
export interface MathQuillOptions {
  autoOperatorNames: string;
  autoCommands: string;
  charsThatBreakOutOfSupSub: string;
  autoSubscriptNumerals: boolean;
  disableAutoSubstitutionInSubscripts: boolean;
  restrictMismatchedBrackets: boolean;
  enableDigitGrouping: boolean;
  disableCopyPaste: boolean;
  typingAsteriskWritesTimesSymbol: boolean;
  typingPercentWritesPercentOf: boolean;
  typingSlashWritesDivisionSymbol: boolean;
  typingSlashCreatesNewFraction: boolean;
}

/**
 * A new options object on each call. autoParenthesizedFunctions is deliberately not set (T-9),
 * and every option not listed keeps MathQuill's default.
 */
export function mathQuillOptions(): MathQuillOptions {
  return {
    // T-3: the 02 allowlist (member names excluded) and the typed auto-commands
    autoOperatorNames: mathQuillAutoOperatorNames(),
    autoCommands: mathQuillAutoCommands(),
    // T-1, T-6: only from a non-empty block, so x^{-1} still types
    charsThatBreakOutOfSupSub: CHARS_THAT_BREAK_OUT_OF_SUPSUB,
    // T-4: typed a1 becomes a_{1}, and v_max stays v_{max}
    autoSubscriptNumerals: true,
    disableAutoSubstitutionInSubscripts: true,
    // T-8, with patch 0006
    restrictMismatchedBrackets: true,
    // T-10: CSS margins only; the LaTeX is unchanged
    enableDigitGrouping: true,
    // AR-42, AR-14: the clipboard bridge and the adapter's own listeners own copy and paste
    disableCopyPaste: true,
    // T-7: * types \cdot and % types \%
    typingAsteriskWritesTimesSymbol: false,
    typingPercentWritesPercentOf: false,
    // T-2: / makes a fraction with the preceding term as its numerator
    typingSlashWritesDivisionSymbol: false,
    typingSlashCreatesNewFraction: false,
  };
}
