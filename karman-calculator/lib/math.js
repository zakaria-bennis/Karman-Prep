const MAX_ROWS = 32,
  MAX_LENGTH = 2048,
  MAX_TOKENS = 512;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const format = (n) => {
  if (isComplex(n)) {
    const real = Math.abs(n.re) < 1e-12 ? 0 : n.re,
      imaginary = Math.abs(n.im);
    return (
      (real ? format(real) + (n.im < 0 ? " - " : " + ") : n.im < 0 ? "-" : "") +
      (Math.abs(imaginary - 1) < 1e-12 ? "" : format(imaginary)) +
      "i"
    );
  }
  return Number.isFinite(n) ? String(Number(n.toPrecision(10))) : "Undefined";
};
const arity = Object.freeze({
  sin: 1,
  cos: 1,
  tan: 1,
  asin: 1,
  acos: 1,
  atan: 1,
  sqrt: 1,
  abs: 1,
  log: 1,
  ln: 1,
  exp: 1,
  floor: 1,
  ceil: 1,
  round: 1,
  min: 2,
  max: 2,
});
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function parseMath(source, functions = new Set()) {
  if (!source.trim()) throw new Error("Enter an expression.");
  if (source.length > MAX_LENGTH) throw new Error("Expression is too long.");
  const tokens = [];
  for (let i = 0; i < source.length; ) {
    if (/\s/.test(source[i])) {
      i++;
      continue;
    }
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(source.slice(i));
    if (match) {
      const value = Number(match[0]);
      if (!Number.isFinite(value)) throw new Error("Number is too large.");
      tokens.push({ type: "number", value });
      i += match[0].length;
    } else if (/[a-z]/i.test(source[i])) {
      const word = /^[a-z]+(?:_?\d+)?/i.exec(source.slice(i))[0].toLowerCase().replace("_", "");
      if (
        word.length > 32 ||
        [
          "constructor",
          "prototype",
          "window",
          "globalthis",
          "document",
          "eval",
          "function",
        ].includes(word)
      )
        throw new Error(`Unknown symbol: ${word}`);
      tokens.push({ type: "name", value: word });
      i += word.length;
    } else if ("+-*/^(),".includes(source[i])) {
      tokens.push({ type: source[i++] });
    } else throw new Error("Use numbers, x, arithmetic, and supported functions.");
    if (tokens.length > MAX_TOKENS) throw new Error("Expression is too complex.");
  }
  tokens.push({ type: "end" });
  let index = 0,
    depth = 0;
  const peek = () => tokens[index].type;
  const take = (type) => {
    if (peek() !== type) throw new Error(`Expected ${type}.`);
    return tokens[index++];
  };
  function expression(minimum = 0) {
    if (++depth > 48) throw new Error("Too many nested operations.");
    let node;
    if (peek() === "+" || peek() === "-") {
      node = { type: "unary", op: tokens[index++].type, arg: expression(25) };
    } else if (peek() === "number") node = { type: "number", value: tokens[index++].value };
    else if (peek() === "(") {
      index++;
      node = expression();
      take(")");
    } else if (peek() === "name") {
      const name = tokens[index++].value;
      if (name === "pi" || name === "e")
        node = { type: "number", value: name === "pi" ? Math.PI : Math.E };
      else if (own(arity, name) || functions.has(name)) {
        take("(");
        const args = [expression()];
        while (peek() === ",") {
          index++;
          args.push(expression());
          if (args.length > 8) throw new Error("At most eight arguments.");
        }
        take(")");
        if (
          (own(arity, name) &&
            (args.length < arity[name] || (arity[name] === 1 && args.length !== 1))) ||
          (functions.has(name) && args.length !== 1)
        )
          throw new Error(
            `${name} needs ${arity[name] === 1 ? "one argument" : "at least two arguments"}.`
          );
        node = { type: "call", name, args, builtin: own(arity, name) };
      } else node = { type: "variable", name };
    } else throw new Error("Expected a number, x, or a parenthesized expression.");
    while (true) {
      const next = peek(),
        implicit =
          next === "name" || next === "(" || (next === "number" && tokens[index - 1].type === ")");
      const op = implicit ? "*" : next,
        priority = { "+": 10, "-": 10, "*": 20, "/": 20, "^": 30 }[op];
      if (!priority || priority < minimum) break;
      if (!implicit) index++;
      node = {
        type: "binary",
        op,
        left: node,
        right: expression(op === "^" ? priority : priority + 1),
      };
    }
    depth--;
    return node;
  }
  const tree = expression();
  take("end");
  return tree;
}
function emit(node) {
  if (node.type === "number") return String(node.value);
  if (node.type === "variable") return `s[${JSON.stringify(node.name)}]`;
  if (node.type === "call")
    return `${node.builtin ? "m" : "s"}[${JSON.stringify(node.name)}](${node.args.map(emit).join(",")})`;
  if (node.type === "unary") return node.op === "-" ? `m.neg(${emit(node.arg)})` : emit(node.arg);
  return `m.${{ "+": "add", "-": "sub", "*": "mul", "/": "div", "^": "pow" }[node.op]}(${emit(node.left)},${emit(node.right)})`;
}
function interpret(node, scope, math) {
  if (node.type === "number") return node.value;
  if (node.type === "variable") return scope[node.name];
  if (node.type === "call")
    return (node.builtin ? math : scope)[node.name](
      ...node.args.map((arg) => interpret(arg, scope, math))
    );
  if (node.type === "unary")
    return node.op === "-"
      ? math.neg(interpret(node.arg, scope, math))
      : interpret(node.arg, scope, math);
  const a = interpret(node.left, scope, math),
    b = interpret(node.right, scope, math);
  switch (node.op) {
    case "+":
      return math.add(a, b);
    case "-":
      return math.sub(a, b);
    case "*":
      return math.mul(a, b);
    case "/":
      return math.div(a, b);
    default:
      return math.pow(a, b);
  }
}
function compile(source, functions) {
  const tree = parseMath(source, functions),
    code = emit(tree);
  let fn;
  try {
    fn = new Function("s", "m", `"use strict";return ${code};`);
  } catch {
    fn = (scope, math) => interpret(tree, scope, math);
  }
  const references = new Set();
  function visit(node) {
    if (node.type === "variable" || (node.type === "call" && !node.builtin))
      references.add(node.name);
    if (node.arg) visit(node.arg);
    if (node.left) {
      visit(node.left);
      visit(node.right);
    }
    for (const arg of node.args || []) visit(arg);
  }
  visit(tree);
  return { fn, references: [...references] };
}
function mathFor(mode, enabled = false) {
  const unit = mode === "degrees" ? Math.PI / 180 : 1;
  return complexMath(
    {
      sin: (x) => Math.sin(x * unit),
      cos: (x) => Math.cos(x * unit),
      tan: (x) => (Math.abs(Math.cos(x * unit)) < 1e-14 ? NaN : Math.tan(x * unit)),
      asin: (x) => Math.asin(x) / unit,
      acos: (x) => Math.acos(x) / unit,
      atan: (x) => Math.atan(x) / unit,
      sqrt: Math.sqrt,
      abs: Math.abs,
      log: Math.log10,
      ln: Math.log,
      exp: Math.exp,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      min: Math.min,
      max: Math.max,
    },
    enabled,
    unit
  );
}
// Normalize display-only subscripts and common plain/LaTeX math; no HTML is interpreted.
function normalize(source) {
  if (source.length > MAX_LENGTH) throw new Error("Expression is too long.");
  source = source
    .trim()
    .replace(/\$/g, "")
    .replace(/\\(?:left|right|displaystyle)\s*/g, "")
    .replace(/\\(?:operatorname|mathrm)\{([a-z]+)\}/gi, "$1")
    .replace(/([a-z])_\{(\d+)\}/gi, "$1$2")
    .replace(/([a-z])_?(\d+)/gi, "$1$2")
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (c) => String("₀₁₂₃₄₅₆₇₈₉".indexOf(c)))
    .replace(/[−–]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=");
  const group = (at) => {
    while (source[at] === " ") at++;
    if (source[at] !== "{") throw new Error("Expected a braced math argument.");
    const start = ++at;
    let depth = 1;
    while (at < source.length && depth) {
      if (source[at] === "{") depth++;
      if (source[at] === "}") depth--;
      at++;
    }
    if (depth) throw new Error("Close the math braces.");
    return [source.slice(start, at - 1), at];
  };
  for (let i = 0; i < 100; i++) {
    const match = /\\(d?frac|tfrac|sqrt)/.exec(source);
    if (!match) break;
    const [a, end] = group(match.index + match[0].length);
    if (match[1] === "sqrt")
      source = source.slice(0, match.index) + `sqrt(${a})` + source.slice(end);
    else {
      const [b, last] = group(end);
      source = source.slice(0, match.index) + `((${a})/(${b}))` + source.slice(last);
    }
  }
  return source
    .replace(/\\(?:cdot|times)\s*/g, "*")
    .replace(/\\div\s*/g, "/")
    .replace(/\\leq?\b\s*/g, "<=")
    .replace(/\\geq?\b\s*/g, ">=")
    .replace(/\\(pi|sin|cos|tan|asin|acos|atan|ln|log|exp)\b\s*/g, "$1")
    .replace(/\^\{([^{}]*)\}/g, "^($1)")
    .replace(/\|([^|]+)\|/g, "abs($1)")
    .trim();
}
function subscript(source) {
  return source.replace(
    /(?<![\d.])([a-zA-Z]+)(?:_\{(\d+)\}|_(\d+)|([\d₀₁₂₃₄₅₆₇₈₉]+))/g,
    (_, name, a, b, c) =>
      name + [...(a || b || c)].map((d) => (/\d/.test(d) ? "₀₁₂₃₄₅₆₇₈₉"[Number(d)] : d)).join("")
  );
}
function splitTop(source, separator = ",") {
  let depth = 0,
    start = 0;
  const parts = [];
  for (let i = 0; i < source.length; i++) {
    if ("([{".includes(source[i])) depth++;
    if (")]}".includes(source[i])) depth--;
    if (!depth && source[i] === separator) {
      parts.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  return [...parts, source.slice(start).trim()];
}
function constant(source, math) {
  const c = compile(normalize(source));
  if (c.references.length) throw new Error("Use a numeric table cell.");
  const value = c.fn(Object.create(null), math);
  if (!Number.isFinite(value)) throw new Error("Table cells must be finite numbers.");
  return value;
}
