// FN-59: how an inference row writes its numbers, as live Desmos (College Board version) shows them
// (captured 2026-10-26 over scores from 0.00001 to 123456.7 and p-values from 1 down to 10⁻⁷):
// - a diagram value (an interval bound, a score, df) has 4 significant digits and at most 3
//   decimals (`12.35`, `1.234`, `0.123`, `0.012`), one more decimal when that rounds it to 0
//   (`0.0005`), and is m×10ⁿ with 2 significant digits from 10⁴ up and below 10⁻⁴;
// - a p-value has 3 decimals, 4 below 0.001 and from 0.995 up (`0.0007`, `0.9976`), and is
//   "< 0.0001" below that;
// - the numerical outputs table has 6 significant digits, m×10ⁿ with 2 below 10⁻⁴.
// Pure TypeScript: no DOM.

const MINUS = "−";

/** Trailing zeros after a decimal point dropped, and "-" as U+2212. */
function tidy(text: string): string {
  const trimmed = text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
  const signed = trimmed === "-0" ? "0" : trimmed;
  return signed.replace("-", MINUS);
}

/** m×10ⁿ with `digits` significant digits, as plain text: "1.2×10^4" becomes { m, n }. */
export function scientific(v: number, digits: number): { mantissa: string; exponent: string } {
  const [m, e] = v.toExponential(digits - 1).split("e");
  return { mantissa: tidy(m), exponent: String(Number(e)).replace("-", MINUS) };
}

export type Shown =
  | { kind: "plain"; text: string }
  | { kind: "scientific"; mantissa: string; exponent: string }
  | { kind: "less"; text: string } // "< 0.0001"
  | { kind: "undefined" };

/** The text form of a Shown: "1.2×10^4" with a caret, "< 0.0001", "undefined". */
export function shownText(s: Shown): string {
  switch (s.kind) {
    case "plain":
      return s.text;
    case "scientific":
      return `${s.mantissa}×10^${s.exponent}`;
    case "less":
      return `< ${s.text}`;
    default:
      return "undefined";
  }
}

/** The LaTeX of a Shown, for typeset labels. */
export function shownLatex(s: Shown): string {
  switch (s.kind) {
    case "plain":
      return s.text.replace(MINUS, "-");
    case "scientific":
      return `${s.mantissa.replace(MINUS, "-")}\\times10^{${s.exponent.replace(MINUS, "-")}}`;
    case "less":
      return `<${s.text}`;
    default:
      return "\\operatorname{undefined}";
  }
}

/** A diagram value: 4 significant digits, at most 3 decimals. */
export function diagramValue(v: number): Shown {
  if (!Number.isFinite(v)) return { kind: "undefined" };
  if (v === 0) return { kind: "plain", text: "0" };
  const a = Math.abs(v);
  if (a < 1e-4 || Number(v.toPrecision(4)) >= 1e4 || Number(v.toPrecision(4)) <= -1e4) {
    return { kind: "scientific", ...scientific(v, 2) };
  }
  if (a >= 1) return { kind: "plain", text: tidy(v.toPrecision(4)) };
  const three = v.toFixed(3);
  return { kind: "plain", text: tidy(Number(three) === 0 ? v.toFixed(4) : three) };
}

/** A p-value: 3 decimals, 4 below 0.001 and from 0.995, "< 0.0001" below that. */
export function pValue(p: number): Shown {
  if (!Number.isFinite(p)) return { kind: "undefined" };
  if (p < 0.0001 && p > 0) return { kind: "less", text: "0.0001" };
  if (p === 0) return { kind: "less", text: "0.0001" };
  return { kind: "plain", text: tidy(p.toFixed(p < 0.001 || p >= 0.995 ? 4 : 3)) };
}

/** A numerical outputs value: 6 significant digits, m×10ⁿ with 2 below 10⁻⁴. */
export function outputValue(v: number): Shown {
  if (!Number.isFinite(v)) return { kind: "undefined" };
  if (v === 0) return { kind: "plain", text: "0" };
  if (Math.abs(v) < 1e-4) return { kind: "scientific", ...scientific(v, 2) };
  const text = v.toPrecision(6);
  if (text.includes("e")) return { kind: "scientific", ...scientific(v, 6) };
  return { kind: "plain", text: tidy(text) };
}
