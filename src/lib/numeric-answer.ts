/** SAT numeric forms: signed decimals and fractions; never expressions or units. */
export function parseNumericAnswer(value: string): number | null {
  const text = value.trim();
  if (/^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(text)) {
    const [top, bottom] = text.split("/").map((part) => Number(part.trim()));
    const result = top / bottom;
    return bottom !== 0 && Number.isFinite(result) ? result : null;
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const result = Number(text);
  return Number.isFinite(result) ? result : null;
}
