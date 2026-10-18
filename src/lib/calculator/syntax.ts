/** Translate commonly pasted mathematical LaTeX into the local parser's syntax. */
export function plainMath(input: string): string {
  if (input.length > 4096) throw new Error("Use at most 4,096 characters in one expression.");
  let source = input
    .trim()
    .replace(/\$/g, "")
    .replace(/\\(?:left|right|displaystyle)\s*/g, "")
    .replace(/\\(?:operatorname|mathrm|text)\{([^{}]*)\}/g, "$1")
    .replace(/([a-zA-Z])_\{(\w+)\}/g, "$1_$2")
    .replace(
      /([a-zA-Z])([₀₁₂₃₄₅₆₇₈₉]+)/g,
      (_, a: string, b: string) => `${a}_${[...b].map((c) => "₀₁₂₃₄₅₆₇₈₉".indexOf(c)).join("")}`
    )
    .replace(/[−–]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/θ/g, "theta")
    .replace(/∞/g, "Infinity")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=");
  function group(at: number): [string, number] {
    while (source[at] === " ") at++;
    if (source[at] !== "{") throw new Error("Expected a braced math argument.");
    const start = ++at;
    let depth = 1;
    while (at < source.length && depth) {
      if (source[at] === "{") depth++;
      if (source[at] === "}") depth--;
      at++;
    }
    if (depth) throw new Error("Close the math argument's braces.");
    return [source.slice(start, at - 1), at];
  }
  for (let limit = 0; limit < 100; limit++) {
    const match = /\\(d?frac|tfrac|sqrt)(?:\[([^\]]+)\])?/.exec(source);
    if (!match) break;
    const [a, end] = group(match.index + match[0].length);
    if (match[1] === "sqrt") {
      source =
        source.slice(0, match.index) +
        (match[2] ? `((${a})^(1/(${match[2]})))` : `sqrt(${a})`) +
        source.slice(end);
    } else {
      const [b, last] = group(end);
      source = source.slice(0, match.index) + `((${a})/(${b}))` + source.slice(last);
    }
  }
  source = source
    .replace(/\\(?:cdot|times)\s*/g, "*")
    .replace(/\\div\s*/g, "/")
    .replace(/\\(?:leq?|leqslant)\b\s*/g, "<=")
    .replace(/\\(?:geq?|geqslant)\b\s*/g, ">=")
    .replace(/\\ne(?:q)?\b\s*/g, "!=")
    .replace(/\\(?:,|!|;|:|quad| )/g, " ")
    .replace(
      /\\(pi|theta|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh|ln|log|exp)\b\s*/g,
      "$1"
    )
    .replace(/\barcsin\b/g, "asin")
    .replace(/\barccos\b/g, "acos")
    .replace(/\barctan\b/g, "atan")
    .replace(/(sin|cos|tan)\^\{?-1\}?\s*\(/g, "a$1(");
  if (source.includes("\\"))
    throw new Error("This math command is not supported. Use plain math notation.");
  // Exponent braces are groups, while trailing braces describe a domain restriction.
  source = source.replace(/\^\{([^{}]*)\}/g, "^($1)");
  source = source.replace(/\|([^|]+)\|/g, "abs($1)");
  // Piecewise {condition: value, condition: value, otherwise} or y=x{x>0}.
  for (let i = 0; i < 16 && /\{[^{}]+\}/.test(source); i++) {
    source = source.replace(/\{([^{}]+)\}/g, (_all, inner: string, offset: number) => {
      const pieces = splitTopLevel(inner, ",");
      if (inner.includes(":")) {
        let result = "NaN";
        for (let j = pieces.length - 1; j >= 0; j--) {
          const pair = splitTopLevel(pieces[j], ":");
          result =
            pair.length === 2 ? `((${pair[0]}) ? (${pair[1]}) : (${result}))` : `(${pair[0]})`;
        }
        return result;
      }
      if (/[<>!=]/.test(inner) && offset > 0) return ` * ((${inner}) ? 1 : NaN)`;
      return `(${inner})`;
    });
  }
  // Conventional trig powers: sin^2(x) = (sin(x))^2.
  source = source.replace(/\b(sin|cos|tan|sec|csc|cot)\^(\d+)\(([^()]*)\)/g, "($1($3))^$2");
  source = source.replace(/\blog_(\d+)\(([^()]*)\)/g, "log($2,$1)");
  // A short explicit list range, independent of the parser's unbounded RangeNode.
  source = source.replace(/\[\s*(-?\d+)\s*\.\.\.\s*(-?\d+)\s*\]/g, (_, a: string, b: string) => {
    const first = Number(a),
      last = Number(b),
      length = Math.abs(last - first) + 1;
    if (length > 1000) throw new Error("List ranges are limited to 1,000 values.");
    return `[${Array.from({ length }, (_, i) => first + i * (last >= first ? 1 : -1)).join(",")}]`;
  });
  return source.trim();
}
export function splitTopLevel(source: string, separator: string): string[] {
  const result: string[] = [];
  let depth = 0,
    start = 0;
  for (let i = 0; i < source.length; i++) {
    if ("([{".includes(source[i])) depth++;
    if (")]}".includes(source[i])) depth--;
    if (!depth && source[i] === separator) {
      result.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  result.push(source.slice(start).trim());
  return result;
}
