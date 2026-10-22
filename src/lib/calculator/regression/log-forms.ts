// D-27: the model forms log mode linearises, matched structurally on the syntax tree after
// flattening products and sums, so factor and term order do not matter: a·b^x, a·(1+r)^x,
// a·e^(bx), a·exp(bx), a·c^(bx) and c^(mx+k) with a numeric base c > 0, c ≠ 1, a·x^b and
// a + b·ln x, where x is the predictor list and a, b, r, m, k are distinct parameters. Pure
// TypeScript: no DOM.

import type { Node } from "../core/latex/ast";
import type { LogFormMatch } from "./fit";

const factors = (n: Node): Node[] =>
  n.kind === "mul" ? [...factors(n.left), ...factors(n.right)] : [n];
const terms = (n: Node): Node[] => (n.kind === "add" ? [...terms(n.left), ...terms(n.right)] : [n]);

export function matchLogForm(
  model: Node,
  params: readonly string[],
  predictor: string
): LogFormMatch | null {
  const param = (n: Node): number => (n.kind === "id" ? params.indexOf(n.name) : -1);
  const isX = (n: Node) => n.kind === "id" && n.name === predictor;
  const base = (n: Node): number | null =>
    n.kind === "num" && n.value > 0 && n.value !== 1 ? n.value : null;
  /** b·x in either order: the index of b, else -1. */
  const timesX = (n: Node): number => {
    const f = factors(n);
    if (f.length !== 2) return -1;
    const [p, q] = isX(f[0]) ? [f[1], f[0]] : [f[0], f[1]];
    return isX(q) ? param(p) : -1;
  };
  /** 1 + r in either order: the index of r, else -1 (live Desmos offers log mode for a(1+r)^x). */
  const onePlus = (n: Node): number => {
    const t = terms(n);
    if (t.length !== 2) return -1;
    const [one, r] = t[0].kind === "num" ? [t[0], t[1]] : [t[1], t[0]];
    return one.kind === "num" && one.value === 1 ? param(r) : -1;
  };
  const distinct = (...ix: number[]) =>
    ix.every((i) => i >= 0) && new Set(ix).size === ix.length && ix.length === params.length;

  const f = factors(model);
  if (f.length === 2) {
    for (const [first, other] of [
      [f[0], f[1]],
      [f[1], f[0]],
    ] as const) {
      const a = param(first);
      if (a < 0) continue;
      if (other.kind === "pow") {
        const { left, right } = other;
        if (param(left) >= 0 && isX(right) && distinct(a, param(left))) {
          return { kind: "exponential-base", a, b: param(left) };
        }
        const r = onePlus(left);
        if (isX(right) && distinct(a, r)) return { kind: "exponential-growth", a, r };
        if (isX(left) && param(right) >= 0 && distinct(a, param(right))) {
          return { kind: "power", a, b: param(right) };
        }
        const b = timesX(right);
        if (left.kind === "const" && left.name === "e" && distinct(a, b)) {
          return { kind: "exponential-e", a, b };
        }
        const c = base(left);
        if (c !== null && distinct(a, b)) return { kind: "exponential-ac", c, a, b };
      }
      if (other.kind === "call" && other.name === "exp" && other.args.length === 1) {
        const b = timesX(other.args[0]);
        if (distinct(a, b)) return { kind: "exponential-e", a, b };
      }
    }
  }
  if (model.kind === "pow") {
    const c = base(model.left),
      t = terms(model.right);
    if (c !== null && t.length === 2) {
      for (const [mx, kk] of [
        [t[0], t[1]],
        [t[1], t[0]],
      ] as const) {
        const m = timesX(mx),
          k = param(kk);
        if (distinct(m, k)) return { kind: "exponential-c", c, m, k };
      }
    }
  }
  const t = terms(model);
  if (t.length === 2) {
    for (const [aa, bl] of [
      [t[0], t[1]],
      [t[1], t[0]],
    ] as const) {
      const a = param(aa),
        g = factors(bl);
      if (g.length !== 2) continue;
      for (const [bb, ln] of [
        [g[0], g[1]],
        [g[1], g[0]],
      ] as const) {
        const b = param(bb);
        if (
          ln.kind === "call" &&
          ln.name === "ln" &&
          ln.args.length === 1 &&
          isX(ln.args[0]) &&
          distinct(a, b)
        ) {
          return { kind: "logarithmic", a, b };
        }
      }
    }
  }
  return null;
}
