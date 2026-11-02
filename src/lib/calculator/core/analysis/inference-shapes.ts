// The static types of inference values (FN-53 to FN-58), read before anything evaluates: which
// test a call makes from its arguments' shapes, what a member gives, and how errors name them.
// Desmos tells the eight test kinds apart in its errors ("Function '.dof' cannot be applied to a
// one-sample z-inference object."; captured 2026-10-26); Karman's own copy names them plainly.
// Pure TypeScript: no DOM (AR-44).

import type { Node } from "../latex/ast";

type Call = Extract<Node, { kind: "call" }>;

export type InferenceShape =
  | "test-z1"
  | "test-z2"
  | "test-t1"
  | "test-t2"
  | "test-zp1"
  | "test-zp2"
  | "test-chiind"
  | "test-chigof"
  | "null-z" // `T.null(h)` of a z test
  | "null-t" // `T.null(h)` of a t test
  | "interval"; // `T.conf(c)`

export const INFERENCE_SHAPE_NAMES: Readonly<Record<InferenceShape, string>> = {
  "test-z1": "a one-sample z test",
  "test-z2": "a two-sample z test",
  "test-t1": "a one-sample t test",
  "test-t2": "a two-sample t test",
  "test-zp1": "a one-proportion z test",
  "test-zp2": "a two-proportion z test",
  "test-chiind": "a χ² test for independence",
  "test-chigof": "a χ² goodness of fit test",
  "null-z": "a z test with a null value",
  "null-t": "a t test with a null value",
  interval: "a confidence interval",
};

/** The test functions; `ittest` is Desmos's hidden name for the two-sample t test of two lists. */
export const INFERENCE_CALLS: ReadonlySet<string> = new Set([
  "ztest",
  "ttest",
  "ittest",
  "zproptest",
  "chisqtest",
  "chisqgof",
]);

/** The members each kind of value has (live Desmos, 2026-10-26). */
const OBJECT_MEMBERS = ["estimate", "stderr", "score", "p", "pleft", "pright", "conf", "null"];
const MEMBERS: Readonly<Record<InferenceShape, readonly string[]>> = {
  "test-z1": OBJECT_MEMBERS,
  "test-z2": OBJECT_MEMBERS,
  "test-t1": [...OBJECT_MEMBERS, "dof"],
  "test-t2": [...OBJECT_MEMBERS, "dof"],
  "test-zp1": OBJECT_MEMBERS,
  "test-zp2": OBJECT_MEMBERS,
  "test-chiind": ["score", "p", "dof"],
  "test-chigof": ["score", "p", "dof"],
  "null-z": ["score", "p", "pleft", "pright"],
  "null-t": ["score", "p", "pleft", "pright", "dof"],
  interval: ["lower", "upper"],
};

/** The members that take a number in parentheses. */
export const INFERENCE_METHODS: ReadonlySet<string> = new Set(["conf", "null"]);

export function isInferenceShape(s: string | null): s is InferenceShape {
  return s !== null && Object.prototype.hasOwnProperty.call(INFERENCE_SHAPE_NAMES, s);
}

/** True when a value of shape `s` has `member`. */
export function hasInferenceMember(s: InferenceShape, member: string): boolean {
  return MEMBERS[s].includes(member);
}

type Arg = string | null; // a Shape, or null when unknown
const scalar = (a: Arg) => a === "number";
const many = (a: Arg) => a === "numbers";
const scalarOrMany = (a: Arg) => scalar(a) || many(a);

/**
 * The argument patterns each test function accepts, by count: `L` a list of numbers (data), `s` a
 * number or a list of numbers (broadcast, as Desmos maps a stats form over lists).
 */
const PATTERNS: Readonly<Record<string, Readonly<Record<number, string>>>> = {
  ztest: { 2: "Ls", 3: "sss", 4: "LsLs", 6: "ssssss" },
  ttest: { 1: "L", 2: "LL", 3: "sss", 6: "ssssss" },
  ittest: { 2: "LL" },
  zproptest: { 2: "ss", 4: "ssss" },
  chisqgof: { 1: "L", 2: "LL" },
};

/** True when `args` fit test function `name`'s pattern for their count (all known). */
export function fitsPattern(name: string, args: readonly Arg[]): boolean {
  if (name === "chisqtest") return args.length >= 2 && args.every(many);
  const pattern = PATTERNS[name]?.[args.length];
  if (pattern === undefined) return false;
  return [...pattern].every((p, k) => (p === "L" ? many(args[k]) : scalarOrMany(args[k])));
}

/** The kind of test a call of `name` with fitting arguments makes. */
function testShape(name: string, args: readonly Arg[]): InferenceShape {
  const k = args.length;
  switch (name) {
    case "ztest":
      return k === 2 || k === 3 ? "test-z1" : "test-z2";
    case "ttest":
    case "ittest":
      return k === 1 || k === 3 ? "test-t1" : "test-t2";
    case "zproptest":
      return k === 2 ? "test-zp1" : "test-zp2";
    case "chisqtest":
      return "test-chiind";
    default:
      return "test-chigof";
  }
}

/** Whether a broadcast stats form (a list where a scalar goes) makes a list of tests. */
function broadcasts(name: string, args: readonly Arg[]): boolean {
  const pattern = name === "chisqtest" ? "" : (PATTERNS[name]?.[args.length] ?? "");
  return [...pattern].some((p, k) => p === "s" && many(args[k]));
}

/**
 * The shape of a test function call or a member of an inference value; null where analysis cannot
 * tell (a list of tests, unknown arguments, a member the value lacks), undefined for any other
 * call. Members give numbers, or lists of numbers for a list in the parentheses; `.null` and
 * `.conf` of a test give its null test and its interval.
 */
export function inferenceCallShape(
  node: Call,
  args: readonly Arg[]
): InferenceShape | "number" | "numbers" | null | undefined {
  if (node.member === undefined) {
    if (!INFERENCE_CALLS.has(node.name)) return undefined;
    if (!fitsPattern(node.name, args) || broadcasts(node.name, args)) return null;
    return testShape(node.name, args);
  }
  const target = args[0] ?? null;
  if (!isInferenceShape(target)) return undefined;
  if (!hasInferenceMember(target, node.name)) return null;
  const rest = args.slice(1);
  if (rest.some(many)) return node.name === "null" || node.name === "conf" ? null : "numbers";
  if (node.name === "conf") return "interval";
  if (node.name === "null")
    return target === "test-t1" || target === "test-t2" ? "null-t" : "null-z";
  return "number";
}
