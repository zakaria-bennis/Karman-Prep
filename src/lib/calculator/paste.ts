import type { CalculatorInstance, Expression } from "./types";

export type PastePayload =
  | { kind: "math"; latex: string[] }
  | { kind: "points"; pairs: [string, string][] }
  | { kind: "table"; rows: [string, string][] };

export const IMPORTED_TABLE = "karman-imported-table";
// Expression identifiers need uniqueness within this page, not secure randomness.
// A sequence also works during the documented local-network phone review.
let importSequence = 0;
const MAX_LENGTH = 1_000_000;
const IMPORT_ERROR =
  "Paste math or a two-column numeric table. Figures and saved graphs cannot be imported.";

export function normalizeMath(value: string): string {
  let text = value
    .trim()
    .replace(/^\${1,2}|\${1,2}$/g, "")
    .trim();
  if (
    !text ||
    text.length > MAX_LENGTH ||
    /[a-z]+:\/\/|https?:|data:|blob:|<\/?[a-z][^>]*>|```|javascript:|\\(?:includegraphics|href|html|url)\b/i.test(
      text
    )
  ) {
    throw new Error(IMPORT_ERROR);
  }
  text = text
    .replace(/[−–]/g, "-")
    .replace(/[×·]/g, "\\cdot ")
    .replace(/÷/g, "/")
    .replace(/≤/g, "\\le ")
    .replace(/≥/g, "\\ge ")
    .replace(/π/g, "\\pi ")
    .replace(/θ/g, "\\theta ")
    .replace(
      /([a-zA-Z])([₀₁₂₃₄₅₆₇₈₉]+)/g,
      (_, name: string, sub: string) =>
        `${name}_{${[...sub].map((c) => "₀₁₂₃₄₅₆₇₈₉".indexOf(c)).join("")}}`
    );
  // Preserve canonical LaTeX for the local math parser.
  if (!value.includes("\\")) {
    text = text.replace(
      /(?<![\\a-zA-Z])\b(sin|cos|tan|csc|sec|cot|arcsin|arccos|arctan|sinh|cosh|tanh|ln|log|pi|theta)\b/g,
      "\\$1 "
    );
    text = text.replace(
      /(?<![\\a-zA-Z])\b(abs|mean|median|stdev|stdevp|var|varp|total|count|min|max|round|floor|ceil|mod|gcd|lcm|nCr|nPr|exp|corr|cov|quantile|quartile|normaldist|binomialdist)\b/g,
      "\\operatorname{$1}"
    );
    while (/\bsqrt\(/.test(text)) {
      const start = text.search(/\bsqrt\(/);
      let depth = 1,
        end = start + 5;
      for (; end < text.length && depth; end++) {
        if (text[end] === "(") depth++;
        if (text[end] === ")") depth--;
      }
      if (depth) throw new Error("Close the square root's parentheses before pasting.");
      text = `${text.slice(0, start)}\\sqrt{${text.slice(start + 5, end - 1)}}${text.slice(end)}`;
    }
  }
  if (/^\s*[\[{]\s*["']|^\s*<|\b(?:graphState|expressions)\s*:/i.test(text))
    throw new Error(IMPORT_ERROR);
  return text;
}

function numericCell(value: string): string {
  const text = normalizeMath(value).replace(/(\d+(?:\.\d+)?)[eE]([+-]?\d+)/g, "$1\\cdot 10^{$2}");
  const stripped = text.replace(/\\(?:pi|sqrt|frac|cdot|left|right)\s*/g, "");
  if (!/^[\d\s.eE+*/^(){}\-]*$/.test(stripped)) {
    throw new Error(
      "Table cells must contain numbers or numeric expressions; select two numeric columns."
    );
  }
  const stack: string[] = [];
  for (const char of stripped) {
    if (char === "(" || char === "{") stack.push(char);
    if (char === ")" && stack.pop() !== "(") throw new Error("Unbalanced table cell.");
    if (char === "}" && stack.pop() !== "{") throw new Error("Unbalanced table cell.");
  }
  if (stack.length || !/[0-9]|\\pi|\be\b/.test(text))
    throw new Error("Invalid numeric table cell.");
  return text;
}

export function tablePayload(rows: string[][]): PastePayload {
  if (!rows.length || rows.length > 10_000 || rows.some((row) => row.length !== 2)) {
    throw new Error(
      "Select exactly two columns and between 1 and 10,000 rows. No data was imported."
    );
  }
  return { kind: "table", rows: rows.map((row) => [numericCell(row[0]), numericCell(row[1])]) };
}

/** Split only commas at the coordinate pair's outer level, keeping function
 * arguments and fractions intact. Return null for ordinary math expressions. */
function coordinatePairs(value: string): [string, string][] | null {
  const text = value.replace(/\\(?:left|right)\s*/g, "");
  const pairs: [string, string][] = [];
  let cursor = 0;
  while (cursor < text.length) {
    while (/[\s,;]/.test(text[cursor] ?? "") && cursor < text.length) cursor++;
    if (cursor === text.length) break;
    if (text[cursor] !== "(") return null;
    const start = cursor++;
    const stack = ["("];
    let comma = -1;
    for (; cursor < text.length && stack.length; cursor++) {
      const char = text[cursor];
      if ("({[".includes(char)) stack.push(char);
      else if (")}]".includes(char)) {
        if (stack.pop() !== "({["[")}]".indexOf(char)]) return null;
      } else if (char === "," && stack.length === 1) {
        if (comma !== -1) return null;
        comma = cursor;
      }
    }
    if (stack.length || comma === -1) return null;
    pairs.push([
      normalizeMath(text.slice(start + 1, comma)),
      normalizeMath(text.slice(comma + 1, cursor - 1)),
    ]);
  }
  return pairs.length ? pairs : null;
}

/** CSV/TSV parser with quoted fields, escaped quotes, and embedded newlines. */
function delimited(text: string, separator: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i <= text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (char === separator || char === "\n" || char === undefined)) {
      row.push(cell.trim());
      cell = "";
      if (char !== separator) {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else if (char !== undefined) cell += char;
  }
  if (quoted) throw new Error("The pasted table contains an unclosed quote.");
  return rows;
}

export function parseText(text: string): PastePayload {
  if (text.length > MAX_LENGTH)
    throw new Error("That paste is too large. Select up to 10,000 rows.");
  const value = text.replace(/\r\n?/g, "\n").trim();
  if (!value) throw new Error("There is no math to paste.");
  // Coordinate pairs must be recognized before CSV (commas inside points).
  const pairs = coordinatePairs(value);
  if (pairs) return { kind: "points", pairs };
  if (
    value.includes("\t") ||
    (value.includes("\n") && value.includes(",")) ||
    /^[\d.+-]+\s*,\s*[\d.+-]+$/.test(value)
  ) {
    const rows = delimited(value, value.includes("\t") ? "\t" : ",");
    const isHeader =
      rows[0]?.length === 2 &&
      rows[0].every(
        (cell) => /^[a-zA-Z][a-zA-Z\s_₀₁₂₃₄₅₆₇₈₉0-9]*$/.test(cell) && !/^(?:pi|e)$/i.test(cell)
      );
    if (rows.length > 1 && isHeader) rows.shift();
    return tablePayload(rows);
  }
  return {
    kind: "math",
    latex: value
      .split("\n")
      .filter((line) => line.trim())
      .map(normalizeMath),
  };
}

export function parseTransfer(
  transfer: Pick<DataTransfer, "types" | "files" | "getData">
): PastePayload {
  if (
    transfer.files.length ||
    transfer.types.some((type) => /image|pdf|svg|files|graph/i.test(type))
  )
    throw new Error(IMPORT_ERROR);
  const html = transfer.getData("text/html");
  if (html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc.querySelector("img,svg,canvas,script,iframe,object,embed"))
      throw new Error(IMPORT_ERROR);
    const tables = doc.querySelectorAll("table");
    if (tables.length) {
      if (tables.length !== 1) throw new Error("Paste one two-column table at a time.");
      const rows = [...tables[0].rows]
        .filter(
          (row) =>
            !row.closest("thead,tfoot") &&
            ![...row.cells].every((cell) => cell.tagName === "TH" && cell.scope !== "row")
        )
        .map((row) =>
          [...row.cells].map((cell) => {
            const copy = cell.cloneNode(true) as HTMLElement;
            // KaTeX includes visual HTML and MathML for the same number. Read
            // the source once; concatenating textContent would silently triple it.
            copy.querySelectorAll(".katex-html").forEach((el) => el.remove());
            copy.querySelectorAll("math").forEach((math) => {
              const source = math.querySelector('annotation[encoding="application/x-tex"]');
              if (source) math.replaceWith(doc.createTextNode(source.textContent ?? ""));
            });
            return copy.textContent ?? "";
          })
        );
      return tablePayload(rows);
    }
  }
  return parseText(transfer.getData("text/plain"));
}

export async function readClipboard(): Promise<PastePayload> {
  if (!navigator.clipboard?.read) throw new Error("Use the text box below to paste your math.");
  const items = await navigator.clipboard.read();
  const types = items.flatMap((item) => item.types);
  if (types.some((type) => /image|pdf|svg/i.test(type))) throw new Error(IMPORT_ERROR);
  const data: Record<string, string> = {};
  for (const item of items)
    for (const type of item.types) {
      if (type === "text/plain" || type === "text/html")
        data[type] = await (await item.getType(type)).text();
    }
  return parseTransfer({
    types,
    files: { length: 0 } as FileList,
    getData: (type) => data[type] ?? "",
  });
}

export function insertPayload(
  calc: CalculatorInstance,
  payload: PastePayload,
  pointsAsTable: boolean
): void {
  let expressions: Expression[];
  if (payload.kind === "table" || (payload.kind === "points" && pointsAsTable)) {
    const collision = calc
      .getExpressions()
      .some(
        (e) =>
          e.id !== IMPORTED_TABLE &&
          (e.columns?.some((c) => /^[xy]_(?:1|\{1\})$/.test(c.latex)) ||
            /^[xy]_(?:1|\{1\})\s*=/.test(e.latex ?? ""))
      );
    if (collision)
      throw new Error(
        "x₁ or y₁ already belongs to your work. Rename or remove it before importing a table."
      );
    const checked = tablePayload(payload.kind === "table" ? payload.rows : payload.pairs);
    const rows = checked.kind === "table" ? checked.rows : [];
    expressions = [
      {
        id: IMPORTED_TABLE,
        type: "table",
        columns: [
          { latex: "x_1", values: rows.map((row) => row[0]) },
          { latex: "y_1", values: rows.map((row) => row[1]) },
        ],
      },
    ];
  } else {
    const latex =
      payload.kind === "math" ? payload.latex : payload.pairs.map(([x, y]) => `(${x},${y})`);
    expressions = latex.map((value) => ({
      id: `karman-expression-${++importSequence}`,
      latex: value,
    }));
  }
  if (!expressions.length) throw new Error("There is no math to paste.");
  calc.setExpressions(expressions);
}
