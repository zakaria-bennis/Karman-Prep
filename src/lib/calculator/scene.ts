import type { Expression, Settings } from "./types";
import { COLORS } from "./types";
import {
  at,
  compileMath,
  makeScope,
  real,
  resultText,
  unwrap,
  type Scope,
  type CompiledMath,
} from "./math";
import { plainMath, splitTopLevel } from "./syntax";
import { fitRegression, type RegressionResult } from "./regression";
import { roots } from "./numerics";

export interface Plot {
  id: string;
  color: string;
  kind: "function" | "implicit" | "points" | "parametric" | "vertical" | "horizontal";
  fn?: (x: number, y?: number) => number;
  xy?: (t: number) => [number, number];
  points?: [number, number][];
  inequality?: "<" | ">" | "<=" | ">=";
  draggable?: boolean;
  range?: [number, number];
}
export interface RowResult {
  value?: string;
  error?: string;
  tex?: string;
  slider?: { name: string; value: number };
  missing?: string[];
  regression?: RegressionResult;
}
export interface Scene {
  plots: Plot[];
  rows: Record<string, RowResult>;
  scope: Scope;
}
function coordinates(text: string): string[] | null {
  if (!text.startsWith("(") || !text.endsWith(")")) return null;
  const parts = splitTopLevel(text.slice(1, -1), ",");
  return parts.length === 2 ? parts : null;
}
const assignment = (text: string) => /^([a-zA-Z][a-zA-Z0-9_]*)\s*=(?!=)(.+)$/.exec(text);
export function buildScene(expressions: Expression[], settings: Settings): Scene {
  const scope = makeScope(settings),
    rows: Record<string, RowResult> = {},
    plots: Plot[] = [];
  const sources = new Map<string, string>();
  for (const e of expressions) {
    rows[e.id] = {};
    if (e.type === "text" || e.type === "folder") continue;
    try {
      sources.set(e.id, plainMath(e.latex ?? ""));
    } catch (err) {
      rows[e.id].error = (err as Error).message;
    }
    if (e.type === "table") {
      try {
        const columns = e.columns ?? [];
        const length = Math.max(0, ...columns.map((c) => c.values?.length ?? 0));
        const used = Array.from({ length }, (_, i) => i).filter((i) =>
          columns.some((c) => c.values?.[i]?.trim())
        );
        const parsed = columns.map((c) => {
          const values = used.map((i) => {
            const text = c.values?.[i]?.trim();
            if (!text) throw new Error("Complete both cells of each table row.");
            return real(compileMath(text, scope).evaluate());
          });
          if (values.some((v) => !Number.isFinite(v)))
            throw new Error("Table cells must have finite numeric values.");
          return [plainMath(c.latex), values] as const;
        });
        parsed.forEach(([name, values]) => scope.set(name, values));
      } catch (err) {
        rows[e.id].error = (err as Error).message;
      }
    }
  }
  // Definitions can refer to rows above or below them. Cycles stay unresolved.
  const definitions = expressions.filter((e) => {
    const s = sources.get(e.id) ?? "",
      m = assignment(s);
    return (m && !["x", "y", "r"].includes(m[1])) || /^([a-zA-Z]\w*)\(([a-zA-Z]\w*)\)\s*=/.test(s);
  });
  const functions = new Set<string>();
  for (const e of definitions) {
    const m = /^(\w+)\((\w+)\)\s*=/.exec(sources.get(e.id)!);
    if (m) {
      functions.add(m[1]);
      scope.set(m[1], () => NaN);
    }
  }
  const pending = new Set(definitions.map((e) => e.id));
  for (let pass = 0; pass < Math.min(20, definitions.length + 1) && pending.size; pass++) {
    for (const e of definitions) {
      if (!pending.has(e.id)) continue;
      try {
        const s = sources.get(e.id)!,
          f = /^(\w+)\((\w+)\)\s*=\s*(.+)$/.exec(s);
        if (f) {
          const local = new Map(scope);
          local.set(f[2], 0);
          const c = compileMath(f[3], local, true);
          if (c.symbols.length) throw new Error(`Define ${c.symbols.join(", ")} first.`);
          let depth = 0;
          scope.set(f[1], (v: number) => {
            if (++depth > 32) {
              depth--;
              throw new Error("Recursive functions are not supported.");
            }
            try {
              return c.evaluate(new Map([...scope, [f[2], v]]));
            } finally {
              depth--;
            }
          });
          if (f[2] === "x")
            plots.push({
              id: e.id,
              color: e.color ?? COLORS[0],
              kind: "function",
              fn: (x) => {
                try {
                  return real((scope.get(f[1]) as (n: number) => unknown)(x));
                } catch {
                  return NaN;
                }
              },
            });
          rows[e.id].tex = compileMath(f[3], local, true).tex;
        } else {
          const m = assignment(s)!,
            c = compileMath(m[2], scope, true);
          if (c.symbols.length) throw new Error(`Define ${c.symbols.join(", ")} first.`);
          const value = c.evaluate();
          rows[e.id].value = resultText(value, settings.complex);
          scope.set(m[1], value);
          if (
            typeof value === "number" &&
            Number.isFinite(value) &&
            /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(m[2].trim())
          )
            rows[e.id].slider = { name: m[1], value };
        }
        delete rows[e.id].error;
        pending.delete(e.id);
      } catch (err) {
        rows[e.id].error = (err as Error).message;
      }
    }
  }
  for (const e of expressions) {
    const source = sources.get(e.id);
    if (!source?.includes("~")) continue;
    try {
      const parts = splitTopLevel(source, "~");
      if (parts.length !== 2) throw new Error("Use one regression relation (~).");
      const fit = fitRegression(parts[0], parts[1], scope);
      rows[e.id].regression = fit;
      for (const [name, value] of Object.entries(fit.parameters)) scope.set(name, value);
    } catch (err) {
      rows[e.id].error = (err as Error).message;
    }
  }
  for (const e of expressions) {
    if (e.type === "folder" || e.type === "text" || definitions.some((d) => d.id === e.id))
      continue;
    const row = rows[e.id],
      color = e.color ?? COLORS[expressions.indexOf(e) % COLORS.length];
    try {
      if (e.type === "table") {
        if (row.error) continue;
        const a = e.columns ?? [];
        const x = (scope.get(plainMath(a[0]?.latex ?? "x_1")) as number[]) ?? [],
          y = (scope.get(plainMath(a[1]?.latex ?? "y_1")) as number[]) ?? [];
        plots.push({
          id: e.id,
          color,
          kind: "points",
          points: x.slice(0, y.length).map((v, i) => [v, y[i]]),
        });
        continue;
      }
      const s = sources.get(e.id);
      if (!s) continue;
      if (s.includes("~")) {
        if (row.regression)
          plots.push({ id: e.id, color, kind: "function", fn: row.regression.predict });
        continue;
      }
      const pair = coordinates(s);
      if (pair) {
        const a = compileMath(pair[0], scope, true),
          b = compileMath(pair[1], scope, true);
        const missing = [...new Set([...a.symbols, ...b.symbols])];
        if (missing.length === 1 && missing[0] === "t")
          plots.push({
            id: e.id,
            color,
            kind: "parametric",
            xy: (t) => [at(a, scope, { t }), at(b, scope, { t })],
            range: [0, 1],
          });
        else if (missing.length) row.missing = missing;
        else {
          const av = unwrap(a.evaluate()),
            bv = unwrap(b.evaluate()),
            x = Array.isArray(av) ? av : [av],
            y = Array.isArray(bv) ? bv : [bv];
          const points = Array.from(
            { length: Math.max(x.length, y.length) },
            (_, i) =>
              [real(x[x.length === 1 ? 0 : i]), real(y[y.length === 1 ? 0 : i])] as [number, number]
          ).filter((p) => p.every(Number.isFinite));
          plots.push({
            id: e.id,
            color,
            kind: "points",
            points,
            draggable: points.length === 1 && pair.every((v) => /^[-+\d.eE]+$/.test(v.trim())),
          });
          row.value = points
            .map((p) => `(${resultText(p[0], false)}, ${resultText(p[1], false)})`)
            .join(", ");
        }
        continue;
      }
      const relation = /^(.*?)\s*(<=|>=|=|<|>)\s*(.+)$/.exec(s);
      let c: CompiledMath;
      if (relation) {
        const [, left, op, right] = relation;
        if (left.trim() === "y") {
          c = compileMath(right, scope, true);
          const missing = c.symbols.filter((v) => v !== "x");
          if (missing.length) {
            row.missing = missing;
            continue;
          }
          if (op === "=")
            plots.push({ id: e.id, color, kind: "function", fn: (x) => at(c, scope, { x }) });
          else
            plots.push({
              id: e.id,
              color,
              kind: "implicit",
              fn: (x, y = 0) => y - at(c, scope, { x }),
              inequality: op as Plot["inequality"],
            });
          row.tex = c.tex;
          continue;
        }
        if (left.trim() === "r" && op === "=") {
          c = compileMath(right, scope, true);
          if (c.symbols.some((v) => v !== "theta")) {
            row.missing = c.symbols.filter((v) => v !== "theta");
            continue;
          }
          plots.push({
            id: e.id,
            color,
            kind: "parametric",
            range: [0, 2 * Math.PI],
            xy: (t) => {
              const r = at(c, scope, { theta: settings.degrees ? (t * 180) / Math.PI : t });
              return [r * Math.cos(t), r * Math.sin(t)];
            },
          });
          continue;
        }
        c = compileMath(`(${left})-(${right})`, scope, true);
        const missing = c.symbols.filter((v) => v !== "x" && v !== "y");
        if (missing.length && !(op === "=" && c.symbols.length === 1)) {
          row.missing = missing;
          continue;
        }
        if (op === "=" && c.symbols.length === 1) {
          const variable = c.symbols[0],
            limits =
              variable === "y" ? [settings.ymin, settings.ymax] : [settings.xmin, settings.xmax];
          if (
            [0.13, 0.37, 0.71, 0.93].every(
              (t) => at(c, scope, { [variable]: limits[0] + t * (limits[1] - limits[0]) }) === 0
            )
          ) {
            row.value = "Identity in the sampled view";
            continue;
          }
          const values = roots((v) => at(c, scope, { [variable]: v }), limits[0], limits[1]);
          if (variable === "x" || variable === "y")
            plots.push({
              id: e.id,
              color,
              kind: variable === "x" ? "vertical" : "horizontal",
              points: values.map((v) => [v, v]),
            });
          row.value = values.length
            ? `${variable} = ${values.map((v) => resultText(v, false)).join(", ")}`
            : "No roots in this view";
        } else if (c.symbols.length === 0) {
          const difference = real(c.evaluate());
          const truth =
            op === "="
              ? Math.abs(difference) < 1e-10
              : op === "<"
                ? difference < 0
                : op === ">"
                  ? difference > 0
                  : op === "<="
                    ? difference <= 0
                    : difference >= 0;
          row.value = Number.isFinite(difference) ? String(truth) : "undefined";
        } else
          plots.push({
            id: e.id,
            color,
            kind: "implicit",
            fn: (x, y = 0) => at(c, scope, { x, y }),
            inequality: op === "=" ? undefined : (op as Plot["inequality"]),
          });
      } else {
        c = compileMath(s, scope, true);
        row.tex = c.tex;
        const missing = c.symbols.filter((v) => v !== "x");
        if (missing.length) row.missing = missing;
        else if (c.symbols.includes("x"))
          plots.push({ id: e.id, color, kind: "function", fn: (x) => at(c, scope, { x }) });
        else row.value = resultText(c.evaluate(), settings.complex);
      }
    } catch (err) {
      row.error = (err as Error).message;
    }
  }
  const hidden = new Set(expressions.filter((e) => e.hidden).map((e) => e.id));
  return {
    scope,
    rows,
    plots: plots.filter(
      (p) =>
        !hidden.has(p.id) && !hidden.has(expressions.find((e) => e.id === p.id)?.folderId ?? "")
    ),
  };
}
