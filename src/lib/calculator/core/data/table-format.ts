// A computed table cell's text (RT-6, TABLES-26), as the reference shows it: 8 significant digits
// trimmed ("0.84147098", "1234.5679", "0.66666667") for 0.001 ≤ |v| < 10^7, else scientific with a
// mantissa of 7 significant digits trimmed ("1.234568×10^8", "1×10^-4"); "−" for minus, 0 for
// zero and "undefined" for no real value. Pure TypeScript: no DOM.

const trim = (s: string) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);

/** "1.234568×10^8", or the plain digits; `null` → "undefined". */
export function formatTableNumber(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "undefined";
  if (v === 0) return "0";
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 0.001 && a < 1e7) {
    const plain = trim(
      Number(a.toPrecision(8)).toFixed(Math.max(0, 7 - Math.floor(Math.log10(a))))
    );
    if (Number(plain) < 1e7) return sign + plain;
  }
  const [mantissa, exponent] = a.toExponential(6).split("e");
  return `${sign}${trim(mantissa)}×10^${Number(exponent)}`;
}
