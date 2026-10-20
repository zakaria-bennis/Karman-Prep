// Built-in and user-function calls (grammar contract G8 of ; PR-23 to PR-27).
// A built-in takes a `(` argument list (a level-11 atom that takes postfix signs, PR-25) or, with
// no parenthesis, the PR-24 run of implicitly multiplied factors (level 9).

import type { Node, SourceSpan } from "./ast";
import { isDegreeSign, parsePostfix, takeArgument, takePostfix } from "./atoms";
import {
  HIDDEN_OPERATOR_NAMES,
  isShippedBuiltin,
  OPERATOR_NAMES,
  operatorName,
  PREFIX_FORM_NAMES,
} from "./operator-names";
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

/**
 * Allowlisted and hidden names with a category; `with`, `for`, `and`, `or` and `of` are operators
 * (G8).
 */
const BUILTIN_NAMES: ReadonlySet<string> = new Set(
  [...OPERATOR_NAMES, ...HIDDEN_OPERATOR_NAMES]
    .filter((n) => n.category !== null)
    .map((n) => n.name)
);

/**
 * The circular and hyperbolic trig names whose `^{-1}` is the inverse function (PR-26). On their
 * inverses, `^{-1}` is the forward function, as in Desmos: `\arcsin^{-1}(0.5)` is sin(0.5).
 */
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
 * read. After the name come an optional `_` base and `^` power, each once, in either order; then
 * a `(` argument list, or else the PR-24 run. A `^{-1}` power on a trig name renames the call to
 * its inverse; on `log` and `ln` only `^2` is allowed (`log-power`), and on a circular or
 * hyperbolic trig name or its inverse only `^2` and `^{-1}` (`trig-power`, Desmos's "Only sin^2
 * and sin^-1 are supported. Otherwise, use parens."); `^2` raises the call to it (PR-26). `log`'s base is its last argument, marked `base` (PR-27), and an empty base
 * is `empty-subscript`; any other name in PREFIX_FORM_NAMES (trig, hyperbolic, `ln`) takes no
 * subscript, so `_` after it is `name-subscript` at the name, whatever follows, Desmos's "'ln'
 * cannot have a subscript.". A prime on the name (`\sin'(x)`, like `f'(x)`) is `unsupported`
 * (PR-9). The run and the power on the name are for PREFIX_FORM_NAMES only; any other built-in
 * written without `(`, or with a power on its name, is `function-parentheses`, as in Desmos.
 */
export function parseBuiltinCall(state: ParserState, name: CommandToken): Node {
  if (!isShippedBuiltin(name.name)) {
    return fail("unsupported", name.span, `"${name.name}" is not supported`);
  }
  take(state);
  let base: Node | null = null;
  let power: Node | null = null;
  let form: PowerForm = null;
  for (let token = peek(state); ; token = peek(state)) {
    if (base === null && isSymbol(token, "_") && PREFIX_FORM_NAMES.has(name.name)) {
      if (name.name !== "log") return fail("name-subscript", name.span, "a subscript", name.name);
      take(state);
      failIfEmptyGroup(state);
      base = takeArgument(state).node;
    } else if (power === null && isSymbol(token, "^") && !isDegreeSign(state)) {
      take(state);
      form = powerForm(state);
      power = takeArgument(state).node;
    } else {
      break;
    }
  }
  const prefixForm = PREFIX_FORM_NAMES.has(name.name);
  if (power !== null && !prefixForm) return needsParentheses(name);
  if (power !== null && LOG_NAMES.has(name.name) && form !== "two") {
    return fail("log-power", name.span, `only ${name.name}^2 is supported`, name.name);
  }
  const open = peek(state);
  if (isSymbol(open, "'")) return fail("unsupported", open.span, `"'" is not supported`);
  if (open.t === "open" && open.ch === "(") {
    if (needsArguments(name.name) && takeEmptyList(state)) {
      // An empty `()` on a built-in that needs arguments is RC-20's arity error, as in Desmos
      // ("Function 'sin' requires an argument", "Function 'mean' requires at least one
      // argument"), not a syntax error; a log base does not count as an argument (`\log_{2}()`
      // reads "Function 'log' requires an argument"), but it stays on the call.
      return takePostfix(
        state,
        withPower(name, callNode(name, [], base, previousEnd(state)), power, form)
      );
    }
    const args = parseArgumentList(state);
    const call = callNode(name, args, base, previousEnd(state));
    return takePostfix(state, withPower(name, call, power, form));
  }
  if (!prefixForm) return needsParentheses(name);
  const arg = parseRunArgument(state, name);
  return withPower(name, callNode(name, [arg], base, arg.span.end), power, form);
}

/** PR-26: the names whose only power is `^2`, Desmos's "Only log^2 is supported." */
const LOG_NAMES: ReadonlySet<string> = new Set(["log", "ln"]);

/** PR-27: `empty-subscript` at an empty `{}` group, Desmos's "Subscripts cannot be empty." */
function failIfEmptyGroup(state: ParserState): void {
  const [open, close] = [peek(state), peek(state, 1)];
  if (open.t !== "open" || open.ch !== "{" || close.t !== "close" || close.ch !== "}") return;
  fail("empty-subscript", { start: open.span.start, end: close.span.end }, "an empty subscript");
}

/** PR-24: Desmos's "'floor' is a function. Try using parentheses." at the name. */
function needsParentheses(name: CommandToken): never {
  return fail("function-parentheses", name.span, `"${name.name}" needs (`, name.name);
}

/** Whether a built-in needs one or more arguments: a variadic one, or a fixed count above 0. */
function needsArguments(name: string): boolean {
  const arity = operatorName(name)?.arity;
  return arity !== undefined && (arity === "variadic" || !arity.includes(0));
}

/** Takes an empty `()` at the cursor and returns true, or leaves the cursor and returns false. */
function takeEmptyList(state: ParserState): boolean {
  const close = peek(state, 1);
  if (close.t !== "close" || close.ch !== ")") return false;
  take(state);
  take(state);
  return true;
}

/**
 * The `(` group at the cursor holding one or more comma-separated sums (PR-25), one nesting level
 * deeper (G13). An empty argument beside a comma (`(,2)`, `(1,)`, `(1,,2)`) is `comma-side` at
 * that comma, Desmos's "You need something on both sides of the ',' symbol."; any other empty
 * argument is `syntax` at the token where its sum is due.
 */
export function parseArgumentList(state: ParserState): Node[] {
  const open = take(state);
  const args = enter(state, open, () => {
    const first = peek(state);
    if (isSymbol(first, ","))
      fail("comma-side", first.span, "an argument is missing before a comma");
    const found = [parseSum(state)];
    for (let comma = peek(state); isSymbol(comma, ","); comma = peek(state)) {
      take(state);
      failIfCommaSide(comma, peek(state));
      found.push(parseSum(state));
    }
    return found;
  });
  const close = peek(state);
  if (close.t !== "close" || close.ch !== ")") unexpected(state, close);
  take(state);
  return args;
}

/** `comma-side` at `comma` when `next`, where an argument is due, is a comma or the closing `)`. */
function failIfCommaSide(comma: Token, next: Token): void {
  if (!isSymbol(comma, ",")) return;
  if (isSymbol(next, ",") || (next.t === "close" && next.ch === ")")) {
    fail("comma-side", comma.span, "an argument is missing beside a comma");
  }
}

/**
 * `callee` followed by `(` is a call when it is an identifier some row defines as a function
 * (PR-23, `ParseOptions.userFunctions`); otherwise `callee` is returned and the group multiplies.
 */
export function parseUserCall(state: ParserState, callee: Node): Node {
  const open = peek(state);
  if (callee.kind !== "id" || open.t !== "open" || open.ch !== "(") return callee;
  if (!state.options.userFunctions?.has(callee.name)) return callee;
  // An empty `()` is a call with no arguments, so it is RC-20's arity error, as in Desmos
  // ("Function 'f' requires an argument"), not a syntax error.
  const args = takeEmptyList(state) ? [] : parseArgumentList(state);
  const span = { start: callee.span.start, end: previousEnd(state) };
  return { kind: "call", name: callee.name, args, span };
}

/**
 * The PR-24 argument: leading signs, then factors while one starts and the next token is not a
 * built-in. An empty run before a built-in takes that call as its argument (`\sin\cos x`), while a
 * run followed by a built-in (`\sin 2\cos 1`) is `argument-parentheses` at the name, Desmos's "Use
 * parentheses around the argument of 'sin'."; an empty run at the end of the row is
 * `function-parentheses` at the name (Desmos's "Function 'sin' requires an argument"); any other
 * empty run is `syntax` at the token where the argument is due.
 * Each `-` wraps the first factor, as at level 8 (`-2x` is `(mul (neg (num 2)) (id x))`).
 */
function parseRunArgument(state: ParserState, name: CommandToken): Node {
  const start = state.pos;
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
  const next = peek(state);
  if (arg !== null && isBuiltinCommand(next)) {
    return fail("argument-parentheses", name.span, `"${name.name}" needs (`, name.name);
  }
  if (arg !== null) return arg;
  if (next.t === "end" && state.pos === start) return needsParentheses(name);
  if (!isBuiltinCommand(next)) return unexpected(state, next);
  return negated(minuses, parseBuiltinCall(state, next));
}

function callNode(name: CommandToken, args: Node[], base: Node | null, end: number): CallNode {
  const span: SourceSpan = { start: name.span.start, end };
  if (base === null) return { kind: "call", name: name.name, args, span };
  return { kind: "call", name: name.name, args: [...args, base], base: true, span };
}

/**
 * PR-26: `^{-1}` on a trig name is its inverse and on an inverse trig name the forward function;
 * `^2` gives `pow(call, power)`, and any other power on a trig name is `trig-power` at the name,
 * once the argument has been read (Desmos reads `\sin^{-1x}` as a missing argument first).
 */
function withPower(name: CommandToken, call: CallNode, power: Node | null, form: PowerForm): Node {
  if (power === null) return call;
  if (!LOG_NAMES.has(call.name) && form === null) {
    return fail("trig-power", name.span, `only ${name.name}^2 and ^-1 are supported`, name.name);
  }
  const forward = call.name.slice(3);
  if (call.name.startsWith("arc") && INVERTIBLE_NAMES.has(forward) && form === "minus-one") {
    return { ...call, name: forward };
  }
  if (INVERTIBLE_NAMES.has(call.name) && form === "minus-one") {
    const name = `arc${call.name}`;
    if (!isShippedBuiltin(name)) {
      return fail("unsupported", call.span, `"${name}" is not supported`);
    }
    return { ...call, name };
  }
  return { kind: "pow", left: call, right: power, span: call.span };
}

/**
 * PR-26: which of the two allowed powers on a function name the `^` argument at the cursor is,
 * read from its tokens as Desmos does: the digit `2` alone (`^2`, `^{2}`) or a minus sign before
 * the digit `1` alone (`^{-1}`). Any other spelling, even of the same number (`^{2.0}`, `^{02}`,
 * `^{(2)}`, `^{-1.0}`), is neither, so it is `trig-power` or `log-power`.
 */
type PowerForm = "two" | "minus-one" | null;

function powerForm(state: ParserState): PowerForm {
  const [first, second, third, fourth] = [0, 1, 2, 3].map((k) => peek(state, k));
  if (first.t === "digits") return first.text[0] === "2" ? "two" : null; // one digit is taken
  if (first.t !== "open" || first.ch !== "{") return null;
  if (isDigits(second, "2") && isClose(third)) return "two";
  return isSymbol(second, "-") && isDigits(third, "1") && isClose(fourth) ? "minus-one" : null;
}

function isDigits(token: Token, text: string): boolean {
  return token.t === "digits" && token.text === text;
}

function isClose(token: Token): boolean {
  return token.t === "close" && token.ch === "}";
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
