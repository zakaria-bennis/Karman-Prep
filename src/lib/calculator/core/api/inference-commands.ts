// FN-59: an inference row's commands, each one undo step, as live Desmos (College Board version)
// does them (captured 2026-10-26):
// - changing a section, a field, the tails or a table checkbox;
// - "Export to the expression list" in the numerical outputs: an unnamed test is named T₁ (the
//   lowest free T_k), and a row reading the value, `T_{1}.\operatorname{score}`, goes right after
//   the test, so later exports sit above earlier ones. A set null value or level is written into
//   the member (`T_{1}.\operatorname{null}\left(0.4\right).\operatorname{pleft}`), and the p-value
//   follows the tails (`.p` for both, `.pleft`, `.pright`).
// Package-internal: the UI calls these.

import type { CalculatorEngine } from "./engine";
import type { HistoryStep, StoredRow } from "./document";
import { mergeInference, type InferenceState, type InferenceTails } from "./inference-state";

const at = (rows: readonly StoredRow[], id: string) => rows.findIndex((r) => r.id === id);

/**
 * FN-59: `patch` over the row's inference settings, as one undo step; typing in a field joins the
 * row's open typing group (KB-2).
 */
export function updateRowInference(
  engine: CalculatorEngine,
  rowId: string,
  patch: InferenceState,
  typing = false
): void {
  const step: HistoryStep = typing
    ? { kind: "group", rowId, at: performance.now() }
    : { kind: "step" };
  engine.editRows((rows) => {
    const i = at(rows, rowId);
    if (i < 0 || rows[i].type === "table") return null;
    const next: { -readonly [K in keyof StoredRow]: StoredRow[K] } = { ...rows[i] };
    const merged = mergeInference(rows[i].inference, patch);
    if (merged === undefined) delete next.inference;
    else next.inference = merged;
    return rows.map((r, k) => (k === i ? next : r));
  }, step);
}

/** The outputs a row's tables export. */
export type InferenceOutput = "lower" | "upper" | "estimate" | "stderr" | "dof" | "score" | "p";

const op = (name: string) => `\\operatorname{${name}}`;

/**
 * The member LaTeX that reads `output` from a test (`stage` "object"), its null test or its
 * interval, with the row's level, null value (LaTeX, "" when unset) and tails.
 */
export function outputMember(
  output: InferenceOutput,
  stage: "object" | "test" | "interval",
  settings: { level: string; hypothesis: string; tails: InferenceTails }
): string {
  if (output === "lower" || output === "upper") {
    if (stage === "interval") return `.${op(output)}`;
    const level = settings.level.trim() === "" ? "0.95" : settings.level;
    return `.${op("conf")}\\left(${level}\\right).${op(output)}`;
  }
  if (output === "estimate" || output === "stderr" || output === "dof") return `.${op(output)}`;
  const withNull =
    stage === "object" && settings.hypothesis.trim() !== ""
      ? `.${op("null")}\\left(${settings.hypothesis}\\right)`
      : "";
  if (output === "score") return `${withNull}.${op("score")}`;
  const p = settings.tails === "left" ? `.${op("pleft")}` : settings.tails === "right" ? `.${op("pright")}` : ".p"; // prettier-ignore
  return `${withNull}${p}`;
}

/** The name a definition row `T_{1}=…` gives, or null for any other row. */
function definedName(latex: string): string | null {
  const m = /^\s*([A-Za-z](?:_\{?[A-Za-z0-9]+\}?)?)\s*=(?!=)/.exec(latex);
  return m === null ? null : m[1];
}

/**
 * FN-59: exports `member` (outputMember's LaTeX) of row `rowId` as a new row right after it,
 * naming the row T_k first when it has no name. One undo step; the new row's id, or null.
 */
export function exportInferenceOutput(
  engine: CalculatorEngine,
  rowId: string,
  member: string
): string | null {
  let made: string | null = null;
  engine.editRows((rows, ctx) => {
    const i = at(rows, rowId);
    if (i < 0) return null;
    const row = rows[i];
    let name = definedName(row.latex);
    let latex = row.latex;
    if (name === null) {
      let k = 1;
      while (ctx.used.has(`T_{${k}}`)) k += 1;
      name = `T_{${k}}`;
      // Desmos's wizard writes a two-sample t test as `ittest`, which it names as `ttest`
      latex = `${name}=${row.latex.replace(/^\\operatorname\{ittest\}/, op("ttest"))}`;
    }
    const added: StoredRow = {
      id: ctx.nextId(),
      latex: `${name}${member}`,
      color: ctx.nextColour(),
      hidden: false,
    };
    made = added.id;
    const named = { ...row, latex };
    return [...rows.slice(0, i), named, added, ...rows.slice(i + 1)];
  });
  return made;
}
