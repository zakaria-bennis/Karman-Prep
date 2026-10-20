// Built-in functions (FN-4, FN-6, FN-18 to FN-22, FN-60; NM-25), with the hyperbolic rules of
// hyperbolic.ts (FN-68) and the number theory rules of number-theory.ts (FN-76 to FN-78). Each one has a real rule in the current angle unit and a
// complex rule that is always in radians. The names and their
// argument counts come from BUILTIN_ARITY, so the allowlist stays the one source of both. Pure
// TypeScript: no DOM (AR-44).

import { cacos, casin, catan, ccos, cdiv, cexp, cln, csin, csub, ctan } from "../eval/complex";
import { complexValue, numberValue, UNDEFINED, type Complex, type Value } from "../eval/values";
import { BUILTIN_ARITY } from "./arity";
import { HYPERBOLIC_RULES } from "./hyperbolic";
import { NUMBER_THEORY_RULES } from "./number-theory";
import { arctan2, circular, inverseCircular, type CircularName, type InverseName } from "./trig";

export interface BuiltinFunction {
  name: string;
  arity: readonly number[]; // BUILTIN_ARITY
  angle: "input" | "output" | "none"; // FN-6
  extendsToComplex: boolean; // arcsin, arccos, arccsc, arcsec, ln, log: a real NaN falls back to complex()
  real(args: readonly number[], angleMode: "radians" | "degrees"): number;
  complex(args: readonly Complex[]): Complex; // always radians (NM-25)
}

export type Rule = Omit<BuiltinFunction, "name" | "arity">;

const NAN: Complex = Object.freeze({ re: NaN, im: NaN });
const ONE: Complex = Object.freeze({ re: 1, im: 0 });
const HALF_PI: Complex = Object.freeze({ re: Math.PI / 2, im: 0 });
const LN10: Complex = Object.freeze({ re: Math.LN10, im: 0 });

/** A circular function: the input is in the angle unit (FN-18, FN-19); csc, sec, cot = 1/sin, 1/cos, 1/tan. */
function circularRule(name: CircularName, complex: (z: Complex) => Complex): Rule {
  return {
    angle: "input",
    extendsToComplex: false,
    real: (args, angleMode) => circular(name, args[0], angleMode),
    complex: (args) => complex(args[0]),
  };
}

/** An inverse circular function: the output is in the angle unit (FN-20, FN-21, NM-28). */
function inverseRule(
  name: InverseName,
  extendsToComplex: boolean,
  complex: (z: Complex) => Complex
): Rule {
  return {
    angle: "output",
    extendsToComplex,
    real: (args, angleMode) => inverseCircular(name, args[0], angleMode),
    complex: (args) => complex(args[0]),
  };
}

/**
 * FN-60: log x (base 10) and log_b x, for x > 0, b > 0 and b ≠ 1, as Desmos computes them: the
 * library's exact log for base 10, 2 and e, ln x / ln b otherwise, and the nearest whole number k
 * whenever b^k is exactly x, so `\log_{3}(81)` is 4, not 4.000000000000001. An infinite base gives
 * 0 (`\log_{\infty}(5)`).
 */
function realLog(args: readonly number[]): number {
  const x = args[0],
    b = args.length === 1 ? 10 : args[1];
  if (!(x > 0) || !(b > 0) || b === 1) return NaN;
  const r = EXACT_LOGS.get(b)?.(x) ?? Math.log(x) / Math.log(b);
  const k = Math.round(r);
  return b ** k === x ? k : r;
}

const EXACT_LOGS: ReadonlyMap<number, (x: number) => number> = new Map([
  [10, Math.log10],
  [2, Math.log2],
  [Math.E, Math.log],
]);

/** FN-60, FN-17: the principal-branch log, Ln z / ln 10, or Ln z / Ln b with a base. */
function complexLog(args: readonly Complex[]): Complex {
  return cdiv(cln(args[0]), args.length === 1 ? LN10 : cln(args[1]));
}

const RULES: ReadonlyMap<string, Rule> = new Map<string, Rule>([
  ["sin", circularRule("sin", csin)],
  ["cos", circularRule("cos", ccos)],
  ["tan", circularRule("tan", ctan)],
  ["csc", circularRule("csc", (z) => cdiv(ONE, csin(z)))],
  ["sec", circularRule("sec", (z) => cdiv(ONE, ccos(z)))],
  ["cot", circularRule("cot", (z) => cdiv(ONE, ctan(z)))],
  ["arcsin", inverseRule("arcsin", true, casin)],
  ["arccos", inverseRule("arccos", true, cacos)],
  [
    "arctan",
    {
      angle: "output",
      extendsToComplex: false,
      real: (args, angleMode) =>
        args.length === 2
          ? arctan2(args[0], args[1], angleMode)
          : inverseCircular("arctan", args[0], angleMode),
      // Two-argument arctan takes real coordinates only (FN-22).
      complex: (args) => (args.length === 2 ? { ...NAN } : catan(args[0])),
    },
  ],
  ["arccsc", inverseRule("arccsc", true, (z) => casin(cdiv(ONE, z)))],
  ["arcsec", inverseRule("arcsec", true, (z) => cacos(cdiv(ONE, z)))],
  ["arccot", inverseRule("arccot", false, (z) => csub(HALF_PI, catan(z)))],
  [
    "exp",
    {
      angle: "none",
      extendsToComplex: false,
      real: (args) => Math.exp(args[0]),
      complex: (args) => cexp(args[0]),
    },
  ],
  [
    "ln",
    {
      angle: "none",
      extendsToComplex: true,
      real: (args) => (args[0] > 0 ? Math.log(args[0]) : NaN),
      complex: (args) => cln(args[0]),
    },
  ],
  ["log", { angle: "none", extendsToComplex: true, real: realLog, complex: complexLog }],
  ...HYPERBOLIC_RULES,
  ...NUMBER_THEORY_RULES,
]);

/** A real result: a non-finite value (overflow, a pole) is NaN, which means undefined. */
function finite(v: number): number {
  return Number.isFinite(v) ? v : NaN;
}

/** Every shipped built-in with its BUILTIN_ARITY counts, in allowlist order. */
export const BUILTINS: ReadonlyMap<string, BuiltinFunction> = new Map(
  [...BUILTIN_ARITY].flatMap(([name, arity]) => {
    const rule = RULES.get(name);
    if (!rule) return [];
    const fn: BuiltinFunction = Object.freeze({
      name,
      arity,
      angle: rule.angle,
      extendsToComplex: rule.extendsToComplex,
      real: (args: readonly number[], angleMode: "radians" | "degrees") =>
        finite(rule.real(args, angleMode)),
      complex: rule.complex,
    });
    return [[name, fn] as const];
  })
);

/**
 * Applies a built-in to evaluated arguments (FN-4). An unknown name, an argument count outside
 * its arity, or an undefined, point or list argument gives UNDEFINED. All-real arguments use the
 * real rule; in complex mode a NaN from a function that extends to complex values falls back to
 * the complex rule (NM-19). Any non-real argument uses the complex rule, in radians whatever the
 * angle unit (NM-25). Results pass through numberValue or complexValue, so a non-finite result
 * is UNDEFINED and nothing throws.
 */
export function applyBuiltin(
  name: string,
  args: readonly Value[],
  angleMode: "radians" | "degrees",
  complex: boolean
): Value {
  const fn = BUILTINS.get(name);
  if (!fn || !fn.arity.includes(args.length)) return UNDEFINED;
  let allReal = true;
  for (const arg of args) {
    if (arg.type === "complex") allReal = false;
    else if (arg.type !== "number") return UNDEFINED;
  }
  if (!allReal) return fromComplex(fn.complex(args.map(toComplex)));
  const reals = args.map((arg) => (arg.type === "number" ? arg.value : NaN));
  const r = fn.real(reals, angleMode);
  if (Number.isNaN(r) && complex && fn.extendsToComplex) {
    return fromComplex(fn.complex(reals.map((re) => ({ re, im: 0 }))));
  }
  return numberValue(r);
}

/** A number or complex argument as a Complex (applyBuiltin has already refused other kinds). */
function toComplex(v: Value): Complex {
  if (v.type === "complex") return v.value;
  return { re: v.type === "number" ? v.value : NaN, im: 0 };
}

function fromComplex(z: Complex): Value {
  return complexValue(z.re, z.im);
}
