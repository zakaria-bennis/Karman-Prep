// Built-in and user-function calls (grammar contract G8 of the 02-parser plan; PR-23 to PR-27).
// A built-in takes a `(` argument list (a level-11 atom that takes postfix signs, PR-25) or, with
// no parenthesis, the PR-24 run of implicitly multiplied factors (level 9).

import type { Node, SourceSpan } from "./ast";
import { isDegreeSign, parsePostfix, takeArgument, takePostfix } from "./atoms";
import { isShippedBuiltin, OPERATOR_NAMES } from "./operator-names";
import {
  enter,
  fail,
  parseSum,
  peek,
  startsFactor,
  take,
  unexpected,
  type ParserState,
} from "./parser";
import type { Token } from "./tokens";

type CommandToken = Extract<Token, { t: "command" }>;
type CallNode = Extract<Node, { kind: "call" }>;

/** Allowlisted names with a category; `with`, `for`, `and`, `or` and `of` are operators (G8). */
const BUILTIN_NAMES: ReadonlySet<string> = new Set(
  OPERATOR_NAMES.filter((n) => n.category !== null).map((n) => n.name)
);

/** The circular and hyperbolic trig names whose `^{-1}` is the inverse function (PR-26). */
const INVERTIBLE_NAMES: ReadonlySet<string> = new Set([
  "sin",
  "cos",
  "tan",
  "csc",
  "sec",
  "cot",
  "sinh",
  "cosh",
  "tanh",
  "csch",
  "sech",
  "coth",
]);

/** True for a command naming a built-in function, shipped or not (G8). */
export function isBuiltinCommand(token: Token): token is CommandToken {
  return token.t === "command" && BUILTIN_NAMES.has(token.name);
}

/**
 * A built-in call (G8). An unshipped name is `unsupported` at the name before anything else is
 * read. After the name come an optional `_` base (`log` only) and `^` power, each once, in either
 * order; then a `(` argument list, or else the PR-24 run. A `^{-1}` power on a trig name renames
 * the call to its inverse; any other power raises the call to it (PR-26). `log`'s base is its last
 * argument (PR-27).
 */
export function parseBuiltinCall(state: ParserState, name: CommandToken): Node {
  if (!isShippedBuiltin(name.name)) {
    return fail("unsupported", name.span, `"${name.name}" is not supported`);
  }
  take(state);
  let base: Node | null = null;
  let power: Node | null = null;
  for (let token = peek(state); ; token = peek(state)) {
    if (base === null && name.name === "log" && isSymbol(token, "_")) {
      take(state);
      base = takeArgument(state).node;
    } else if (power === null && isSymbol(token, "^") && !isDegreeSign(state)) {
      take(state);
      power = takeArgument(state).node;
    } else {
      break;
    }
  }
  const open = peek(state);
  if (open.t === "open" && open.ch === "(") {
    const args = parseArgumentList(state);
    const call = callNode(name, args, base, previousEnd(state));
    return takePostfix(state, withPower(call, power));
  }
  const arg = parseRunArgument(state);
  return withPower(callNode(name, [arg], base, arg.span.end), power);
}

/**
 * The `(` group at the cursor holding one or more comma-separated sums (PR-25), one nesting level
 * deeper (G13). An empty argument is `syntax` at the token where its sum is due.
 */
export function parseArgumentList(state: ParserState): Node[] {
  const open = take(state);
  const args = enter(state, open, () => {
    const found = [parseSum(state)];
    for (let comma = peek(state); isSymbol(comma, ","); comma = peek(state)) {
      take(state);
      found.push(parseSum(state));
    }
    return found;
  });
  const close = peek(state);
  if (close.t !== "close" || close.ch !== ")") unexpected(state, close);
  take(state);
  return args;
}

/**
 * `callee` followed by `(` is a call when it is an identifier some row defines as a function
 * (PR-23, `ParseOptions.userFunctions`); otherwise `callee` is returned and the group multiplies.
 */
export function parseUserCall(state: ParserState, callee: Node): Node {
  const open = peek(state);
  if (callee.kind !== "id" || open.t !== "open" || open.ch !== "(") return callee;
  if (!state.options.userFunctions?.has(callee.name)) return callee;
  const args = parseArgumentList(state);
  const span = { start: callee.span.start, end: previousEnd(state) };
  return { kind: "call", name: callee.name, args, span };
}

/**
 * The PR-24 argument: leading signs, then factors while one starts and the next token is not a
 * built-in. An empty run before a built-in takes that call as its argument (`\sin\cos x`); any
 * other empty run is `syntax` at the token where the argument is due. Each `-` wraps the first
 * factor, as at level 8 (`-2x` is `(mul (neg (num 2)) (id x))`).
 */
function parseRunArgument(state: ParserState): Node {
  const minuses: Token[] = [];
  for (let sign = peek(state); isSign(sign); sign = peek(state)) {
    take(state);
    if (isSymbol(sign, "-")) minuses.push(sign);
  }
  let arg: Node | null = null;
  while (startsFactor(state) && !isBuiltinCommand(peek(state))) {
    const factor = parsePostfix(state);
    arg = arg === null ? negated(minuses, factor) : product(arg, factor);
  }
  if (arg !== null) return arg;
  const next = peek(state);
  if (!isBuiltinCommand(next)) return unexpected(state, next);
  return negated(minuses, parseBuiltinCall(state, next));
}

function callNode(name: CommandToken, args: Node[], base: Node | null, end: number): CallNode {
  const span: SourceSpan = { start: name.span.start, end };
  return { kind: "call", name: name.name, args: base === null ? args : [...args, base], span };
}

/** PR-26: `^{-1}` on a trig name is its inverse; any other power gives `pow(call, power)`. */
function withPower(call: CallNode, power: Node | null): Node {
  if (power === null) return call;
  if (INVERTIBLE_NAMES.has(call.name) && isMinusOne(power)) {
    const name = `arc${call.name}`;
    if (!isShippedBuiltin(name)) {
      return fail("unsupported", call.span, `"${name}" is not supported`);
    }
    return { ...call, name };
  }
  return { kind: "pow", left: call, right: power, span: call.span };
}

function isMinusOne(node: Node): boolean {
  return node.kind === "neg" && node.arg.kind === "num" && node.arg.value === 1;
}

/** Implicit multiplication inside the run, grouping left to right (PR-18). */
function product(left: Node, right: Node): Node {
  return { kind: "mul", left, right, span: { start: left.span.start, end: right.span.end } };
}

/** `node` inside one `neg` per minus sign, the first sign outermost (level 8). */
function negated(minuses: readonly Token[], node: Node): Node {
  let signed = node;
  for (let i = minuses.length - 1; i >= 0; i--) {
    signed = {
      kind: "neg",
      arg: signed,
      span: { start: minuses[i].span.start, end: signed.span.end },
    };
  }
  return signed;
}

/** The end of the token just taken: the closing parenthesis of an argument list. */
function previousEnd(state: ParserState): number {
  return state.tokens[state.pos - 1].span.end;
}

function isSign(token: Token): boolean {
  return isSymbol(token, "+") || isSymbol(token, "-");
}

function isSymbol(token: Token, ch: string): boolean {
  return token.t === "symbol" && token.ch === ch;
}
