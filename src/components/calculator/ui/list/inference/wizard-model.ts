// FN-59: the inference wizard's forms and the row each one writes, as live Desmos (College Board
// version) does (captured 2026-10-26). Cells hold LaTeX; a data cell typed `1,2,3` is the list
// `\left[1,2,3\right]` and anything else (a list name, a bracketed list) is used as written.
// - z-test: Data `ztest(L, σ)` or Stats `ztest(n, x̄, σ)`, each with an optional second sample;
// - t-test: Data `ttest(L)` or Stats `ttest(n, x̄, s)`, likewise (Desmos writes a two-list t test
//   as `ittest`, which it shows as `ttest`; this writes `ttest`, the same test);
// - z-test for proportions: `zproptest(x, n)` and the four-number form;
// - χ² test for independence: the filled table's columns, `chisqtest([…],[…],…)`;
// - χ² goodness of fit: `chisqgof([observed])` or with `[expected]`;
// - a probability distribution: the shipped constructors with the fields up to the last one filled
//   (earlier blanks take their defaults), `normaldist()` when all are blank.
// Create is offered once the required cells are filled. Pure TypeScript: no DOM.

export type TestKind = "z" | "t" | "zprop" | "chiind" | "chigof";
export type SampleMode = "data" | "stats";

const op = (name: string) => `\\operatorname{${name}}`;
const call = (name: string, args: readonly string[]) =>
  `${op(name)}\\left(${args.join(",")}\\right)`;
const filled = (cell: string | undefined) => cell !== undefined && cell.trim() !== "";

/** A data cell as a list: `1,2,3` becomes `\left[1,2,3\right]`; anything else stays. */
export function listCell(latex: string): string {
  const text = latex.trim();
  if (text.startsWith("\\left[") || !hasTopLevelComma(text)) return text;
  return `\\left[${text}\\right]`;
}

function hasTopLevelComma(text: string): boolean {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith("\\left", i)) depth += 1;
    else if (text.startsWith("\\right", i)) depth -= 1;
    else if (text[i] === "{") depth += 1;
    else if (text[i] === "}") depth -= 1;
    else if (text[i] === "," && depth === 0) return true;
  }
  return false;
}

/** The column headers of a sample's cells. */
export function sampleHeaders(kind: "z" | "t" | "zprop", mode: SampleMode): string[] {
  if (kind === "zprop") return ["successes", "sample size"];
  if (mode === "data") return kind === "z" ? ["list of data", "pop stdev"] : ["list of data"];
  return ["sample size", "mean", kind === "z" ? "pop stdev" : "stdev"];
}

/**
 * The row a sample form writes, or null while a required cell is empty; `second` is null with no
 * second sample, and a second sample with every cell empty counts as none.
 */
export function sampleLatex(
  kind: "z" | "t" | "zprop",
  mode: SampleMode,
  first: readonly string[],
  second: readonly string[] | null
): string | null {
  const width = sampleHeaders(kind, mode).length;
  const complete = (cells: readonly string[]) =>
    Array.from({ length: width }, (_, k) => cells[k]).every(filled);
  if (!complete(first)) return null;
  const two = second !== null && second.some(filled);
  if (two && !complete(second)) return null;
  const data = kind !== "zprop" && mode === "data";
  const cells = (c: readonly string[]) =>
    c.slice(0, width).map((v, k) => (data && k === 0 ? listCell(v) : v.trim()));
  const args = two ? [...cells(first), ...cells(second!)] : cells(first);
  const name = kind === "z" ? "ztest" : kind === "t" ? "ttest" : "zproptest";
  return call(name, args);
}

/** The filled rectangle of a grid of cells, `grid[r][c]`: its row and column counts. */
function extent(grid: readonly (readonly string[])[]): { rows: number; cols: number } {
  let rows = 0,
    cols = 0;
  grid.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (filled(cell)) {
        rows = Math.max(rows, r + 1);
        cols = Math.max(cols, c + 1);
      }
    })
  );
  return { rows, cols };
}

/** The table a χ² test for independence shows: one more empty row and column than are filled. */
export function independenceSize(grid: readonly (readonly string[])[]): {
  rows: number;
  cols: number;
} {
  const { rows, cols } = extent(grid);
  return { rows: Math.max(3, rows + 1), cols: Math.max(3, cols + 1) };
}

/** `chisqtest` of the filled table's columns, or null until it is 2 × 2 or more and full. */
export function independenceLatex(grid: readonly (readonly string[])[]): string | null {
  const { rows, cols } = extent(grid);
  if (rows < 2 || cols < 2) return null;
  const columns: string[] = [];
  for (let c = 0; c < cols; c++) {
    const column: string[] = [];
    for (let r = 0; r < rows; r++) {
      const cell = grid[r]?.[c];
      if (!filled(cell)) return null;
      column.push(cell!.trim());
    }
    columns.push(`\\left[${column.join(",")}\\right]`);
  }
  return call("chisqtest", columns);
}

/** The rows a goodness of fit form shows: one more than are filled, at least 3. */
export function fitRows(observed: readonly string[], expected: readonly string[]): number {
  return Math.max(3, extent([observed, expected].map((c) => [...c])).cols + 1);
}

/**
 * `chisqgof([observed])`, or with `[expected]` when that column is filled as far as the observed
 * one; null until 2 or more observed counts are filled with no gap, or while expected is partial.
 */
export function fitLatex(observed: readonly string[], expected: readonly string[]): string | null {
  const n = Math.max(...[...observed.keys()].filter((k) => filled(observed[k])).map((k) => k + 1), 0); // prettier-ignore
  if (n < 2 || observed.slice(0, n).some((c) => !filled(c))) return null;
  const given = expected.filter(filled).length;
  if (given > 0 && (given !== n || expected.slice(0, n).some((c) => !filled(c)))) return null;
  const list = (cells: readonly string[]) => `\\left[${cells.slice(0, n).map((c) => c.trim()).join(",")}\\right]`; // prettier-ignore
  return call("chisqgof", given > 0 ? [list(observed), list(expected)] : [list(observed)]);
}

/** True when the expected counts, all given, add up to something other than the observed total. */
export function fitTotalsDiffer(observed: readonly string[], expected: readonly string[]): boolean {
  const numbers = (cells: readonly string[]) => cells.filter(filled).map(Number);
  const o = numbers(observed),
    e = numbers(expected);
  if (e.length === 0 || e.length !== o.length || [...o, ...e].some(Number.isNaN)) return false;
  const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
  return Math.abs(sum(o) - sum(e)) > 1e-9 * Math.max(1, Math.abs(sum(o)));
}

export interface DistributionChoice {
  name: "normaldist" | "tdist" | "binomialdist";
  label: string;
  fields: readonly { header: string; placeholder: string }[]; // "" placeholder: required
}

/** The distributions this calculator ships, with Desmos's headers and defaults. */
export const DISTRIBUTIONS: readonly DistributionChoice[] = [
  {
    name: "normaldist",
    label: "Normal distribution",
    fields: [
      { header: "mean", placeholder: "0" },
      { header: "stdev", placeholder: "1" },
    ],
  },
  {
    name: "tdist",
    label: "t-distribution",
    fields: [
      { header: "degrees of freedom", placeholder: "" },
      { header: "shift", placeholder: "0" },
      { header: "scale", placeholder: "1" },
    ],
  },
  {
    name: "binomialdist",
    label: "Binomial distribution",
    fields: [
      { header: "trials", placeholder: "" },
      { header: "success probability", placeholder: "0.5" },
    ],
  },
];

/** The distribution row, or null while a field with no default is empty. */
export function distributionLatex(
  choice: DistributionChoice,
  cells: readonly string[]
): string | null {
  const required = choice.fields.findIndex((f, k) => f.placeholder === "" && !filled(cells[k]));
  if (required >= 0) return null;
  const last = Math.max(-1, ...choice.fields.map((_, k) => (filled(cells[k]) ? k : -1)));
  const args = choice.fields
    .slice(0, last + 1)
    .map((f, k) => (filled(cells[k]) ? cells[k].trim() : f.placeholder));
  return call(choice.name, args);
}
