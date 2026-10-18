// Writes the committed reference values of NM-43 and FN-1: every Phase 1 operator and elementary
// function at fixed inputs, computed with mathjs's decimal.js BigNumber at 40 significant digits
// and stored to 25. The output is Prettier-formatted with the repo config and drift-tested by
// src/lib/calculator-v2/core/lib/elementary.reference.test.ts, which also checks the v2 evaluator
// against each value within FN-11's elementary tolerance.
//
//   node scripts/calculator-v2/reference-elementary.mjs           writes elementary.json
//   node scripts/calculator-v2/reference-elementary.mjs --check   exits 1 when the committed file differs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { all, create } from "mathjs";
import * as prettier from "prettier";

const math = create(all, { number: "BigNumber", precision: 40 });
const Big = math.BigNumber; // math.pi is a 40-digit Big

const GENERATOR = "scripts/calculator-v2/reference-elementary.mjs";
const SIGNIFICANT_DIGITS = 25;

/** The generated file, written only by this script. */
export const ELEMENTARY_PATH = fileURLToPath(
  new URL("../../src/lib/calculator-v2/core/corpus/reference/elementary.json", import.meta.url)
);

/**
 * Every reference input as [op, ...args], in case order; case ids are `<op>-<n>`, numbered per op
 * in this order. nthroot is (n, a), logBase (b, a) and arctan2 (y, x).
 * @type {readonly (readonly [string, ...number[]])[]}
 */
export const ELEMENTARY_INPUTS = [
  ["add", 0.1, 0.2],
  ["add", 1e16, 3],
  ["sub", 1, 1e-10],
  ["sub", 0.3, 0.1],
  ["mul", 0.1, 3],
  ["mul", 1.1, 1.1],
  ["div", 1, 3],
  ["div", 22, 7],
  ["pow", 2, 0.5],
  ["pow", 1.5, 10.25],
  ["pow", 10, -3],
  ["pow", 0.5, 100],
  ["sqrt", 2],
  ["sqrt", 12345.678],
  ["nthroot", 3, 10],
  ["nthroot", 5, 100],
  ["exp", 1],
  ["exp", -2.5],
  ["exp", 20],
  ["ln", 2],
  ["ln", 0.001],
  ["ln", 1e100],
  ["log", 2],
  ["log", 12345],
  ["logBase", 2, 10],
  ["logBase", 7, 3.5],
  ["sin", 1],
  ["sin", -2],
  ["sin", 100],
  ["sin", 100000],
  ["cos", 1],
  ["cos", 2.5],
  ["cos", 50],
  ["tan", 1],
  ["tan", 1.2],
  ["tan", -0.3],
  ["csc", 1],
  ["csc", 2],
  ["sec", 1],
  ["sec", 0.4],
  ["cot", 1],
  ["cot", 2],
  ["arcsin", 0.3],
  ["arcsin", -0.9],
  ["arccos", 0.3],
  ["arccos", -0.9],
  ["arctan", 0.5],
  ["arctan", -3],
  ["arctan2", 1, 2],
  ["arctan2", -1, -3],
  ["arccsc", 2.5],
  ["arccsc", -1.5],
  ["arcsec", 2.5],
  ["arcsec", -3],
  ["arccot", 0.5],
  ["arccot", -2],
];

/** Inverse trig names MathQuill writes as \operatorname{…}; every other op is a \name command. */
const OPERATORNAME_OPS = new Set(["arccsc", "arcsec", "arccot"]);

/**
 * The exact binary value of a finite double, at precision 40: its 53-bit mantissa times a power
 * of 2, so no input passes through its shortest decimal.
 */
function exactBig(x) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const hi = view.getUint32(0),
    lo = view.getUint32(4),
    e = (hi >>> 20) & 0x7ff;
  const mantissa = (hi & 0xfffff) * 2 ** 32 + lo + (e === 0 ? 0 : 2 ** 52); // < 2^53, exact
  return new Big(mantissa)
    .times(new Big(2).pow(e === 0 ? -1074 : e - 1075))
    .times(hi >>> 31 ? -1 : 1);
}

/** A number as LaTeX digits, never with an exponent. */
function latexNumber(x) {
  return new Big(String(x)).toFixed();
}

/**
 * The row LaTeX that evaluates `op` at `args`, as MathQuill writes it; `p` and `q` are the first
 * and second argument, so nthroot is \sqrt[n]{a}, logBase \log_{b}(a) and arctan2 \arctan(y,x).
 */
function latexFor(op, args) {
  const [p, q] = args.map(latexNumber);
  switch (op) {
    case "add":
      return `${p}+${q}`;
    case "sub":
      return `${p}-${q}`;
    case "mul":
      return `${p}\\cdot ${q}`;
    case "div":
      return `\\frac{${p}}{${q}}`;
    case "pow":
      return `${p}^{${q}}`;
    case "sqrt":
      return `\\sqrt{${p}}`;
    case "nthroot": // (n, a)
      return `\\sqrt[${p}]{${q}}`;
    case "logBase": // (b, a)
      return `\\log_{${p}}\\left(${q}\\right)`;
    case "arctan2": // (y, x)
      return `\\arctan\\left(${p},${q}\\right)`;
    default:
      return OPERATORNAME_OPS.has(op)
        ? `\\operatorname{${op}}\\left(${p}\\right)`
        : `\\${op}\\left(${p}\\right)`;
  }
}

/** The 40-digit reference value of `op` at `args`, using decimal.js methods only. */
function referenceFor(op, args) {
  const exact = args.map(exactBig);
  const [a, b] = exact;
  const one = new Big(1);
  switch (op) {
    case "add":
      return a.plus(b);
    case "sub":
      return a.minus(b);
    case "mul":
      return a.times(b);
    case "div":
      return a.div(b);
    case "pow":
      return a.pow(b);
    case "sqrt":
      return a.sqrt();
    case "nthroot": {
      const [n, radicand] = exact;
      return radicand.pow(one.div(n));
    }
    case "exp":
      return a.exp();
    case "ln":
      return a.ln();
    case "log":
      return a.log(10);
    case "logBase": {
      const [base, x] = exact;
      return x.ln().div(base.ln());
    }
    case "sin":
      return a.sin();
    case "cos":
      return a.cos();
    case "tan":
      return a.tan();
    case "csc":
      return one.div(a.sin());
    case "sec":
      return one.div(a.cos());
    case "cot":
      return one.div(a.tan());
    case "arcsin":
      return a.asin();
    case "arccos":
      return a.acos();
    case "arctan":
      return a.atan();
    case "arctan2": {
      const [y, x] = exact;
      return Big.atan2(y, x);
    }
    case "arccsc":
      return one.div(a).asin();
    case "arcsec":
      return one.div(a).acos();
    case "arccot":
      return math.pi.div(2).minus(a.atan());
    default:
      throw new Error(`No reference rule for ${op}`);
  }
}

/**
 * The reference document: every ELEMENTARY_INPUTS case with its id, row LaTeX and expected value
 * to 25 significant digits.
 * @returns {{ generator: string; library: string; precision: 40; cases: { id: string; op: string; args: number[]; latex: string; expected: string }[] }}
 */
export function buildElementaryReference() {
  const counts = new Map();
  const cases = ELEMENTARY_INPUTS.map(([op, ...args]) => {
    const n = (counts.get(op) ?? 0) + 1;
    counts.set(op, n);
    return {
      id: `${op}-${n}`,
      op,
      args,
      latex: latexFor(op, args),
      expected: referenceFor(op, args).toSignificantDigits(SIGNIFICANT_DIGITS).toString(),
    };
  });
  return {
    generator: GENERATOR,
    library: `mathjs ${math.version} (decimal.js BigNumber)`,
    precision: 40,
    cases,
  };
}

/**
 * The reference document as the committed file's text: JSON formatted by Prettier with the repo
 * config that applies to ELEMENTARY_PATH.
 * @param {object} reference
 * @returns {Promise<string>}
 */
export async function formatElementaryReference(reference) {
  return prettier.format(JSON.stringify(reference), {
    ...(await prettier.resolveConfig(ELEMENTARY_PATH)),
    parser: "json",
  });
}

async function main(check) {
  const text = await formatElementaryReference(buildElementaryReference());
  if (!check) {
    mkdirSync(dirname(ELEMENTARY_PATH), { recursive: true });
    writeFileSync(ELEMENTARY_PATH, text);
    console.log(`Wrote ${ELEMENTARY_PATH}`);
    return;
  }
  let committed = null;
  try {
    committed = readFileSync(ELEMENTARY_PATH, "utf8");
  } catch {
    committed = null;
  }
  if (committed !== text) {
    console.error(`elementary.json is out of date. Run node ${GENERATOR}`);
    process.exitCode = 1;
  } else {
    console.log("elementary.json is up to date.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.includes("--check")).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
