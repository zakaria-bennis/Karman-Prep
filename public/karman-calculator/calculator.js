/* Generated from karman-calculator/lib by build.mjs. Original Karman code; no dependencies. */
(() => {
  "use strict";
  // Complex arithmetic stays local. Graphing and table coordinates require real values.
  const isComplex = (v) =>
    v && typeof v === "object" && Number.isFinite(v.re) && Number.isFinite(v.im);
  const parts = (v) => (isComplex(v) ? v : { re: v, im: 0 });
  const complex = (re, im) => (Math.abs(im) < 1e-14 ? re : { re, im });
  const addValue = (a, b) => {
    if (!isComplex(a) && !isComplex(b)) return a + b;
    a = parts(a);
    b = parts(b);
    return complex(a.re + b.re, a.im + b.im);
  };
  const negValue = (a) => (isComplex(a) ? complex(-a.re, -a.im) : -a);
  const multiplyValue = (a, b) => {
    if (!isComplex(a) && !isComplex(b)) return a * b;
    a = parts(a);
    b = parts(b);
    return complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  };
  const divideValue = (a, b) => {
    if (!isComplex(a) && !isComplex(b)) return a / b;
    a = parts(a);
    b = parts(b);
    const d = b.re * b.re + b.im * b.im;
    return complex((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  };
  function complexMath(base, enabled, unit) {
    const exp = (a) => {
      if (!isComplex(a)) return Math.exp(a);
      return complex(Math.exp(a.re) * Math.cos(a.im), Math.exp(a.re) * Math.sin(a.im));
    };
    const log = (a) => {
      if (!isComplex(a) && a >= 0) return Math.log(a);
      a = parts(a);
      return complex(Math.log(Math.hypot(a.re, a.im)), Math.atan2(a.im, a.re));
    };
    const pow = (a, b) => {
      if (!isComplex(a) && !isComplex(b) && (!(a < 0 && !Number.isInteger(b)) || !enabled))
        return a ** b;
      return exp(multiplyValue(b, log(a)));
    };
    const operations = {
      add: addValue,
      sub: (a, b) => addValue(a, negValue(b)),
      mul: multiplyValue,
      div: divideValue,
      pow,
      neg: negValue,
    };
    if (!enabled) return Object.freeze({ ...base, ...operations });
    return Object.freeze({
      ...base,
      ...operations,
      exp,
      ln: log,
      log: (a) => divideValue(log(a), Math.LN10),
      sqrt: (a) => pow(a, 0.5),
      abs: (a) => (isComplex(a) ? Math.hypot(a.re, a.im) : Math.abs(a)),
      sin: (a) => {
        if (!isComplex(a)) return base.sin(a);
        a = parts(multiplyValue(a, unit));
        return complex(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im));
      },
      cos: (a) => {
        if (!isComplex(a)) return base.cos(a);
        a = parts(multiplyValue(a, unit));
        return complex(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im));
      },
    });
  }

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
            next === "name" ||
            next === "(" ||
            (next === "number" && tokens[index - 1].type === ")");
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

  /* Original bounded least-squares solver. No remote service or external math library. */
  function solveLinear(matrix, vector, tolerance = 1e-12) {
    const a = matrix.map((row, i) => [...row, vector[i]]),
      n = vector.length;
    for (let i = 0; i < n; i++) {
      let pivot = i;
      for (let j = i + 1; j < n; j++) if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
      [a[i], a[pivot]] = [a[pivot], a[i]];
      if (!Number.isFinite(a[i][i]) || Math.abs(a[i][i]) <= tolerance) return null;
      const divisor = a[i][i];
      for (let k = i; k <= n; k++) a[i][k] /= divisor;
      for (let j = 0; j < n; j++)
        if (j !== i) {
          const factor = a[j][i];
          for (let k = i; k <= n; k++) a[j][k] -= factor * a[i][k];
        }
    }
    return a.map((row) => row[n]);
  }
  function regressionMetrics(xs, ys, predicted) {
    const n = ys.length,
      mean = ys.reduce((sum, v) => sum + v, 0) / n;
    const residuals = ys.map((v, i) => v - predicted[i]);
    const sse = residuals.reduce((sum, v) => sum + v * v, 0);
    const sst = ys.reduce((sum, v) => sum + (v - mean) ** 2, 0);
    let r = NaN;
    if (xs?.length === n && n > 1) {
      const mx = xs.reduce((sum, v) => sum + v, 0) / n;
      const xx = xs.reduce((sum, v) => sum + (v - mx) ** 2, 0);
      if (xx > 0 && sst > 0)
        r = clamp(
          xs.reduce((sum, v, i) => sum + (v - mx) * (ys[i] - mean), 0) / Math.sqrt(xx * sst),
          -1,
          1
        );
    }
    return { r2: sst > 0 ? 1 - sse / sst : NaN, r, rmse: Math.sqrt(sse / n), residuals };
  }
  function fitModel(target, expression, scope, math) {
    const ys = scope[target];
    if (!Array.isArray(ys) || !ys.length || ys.length > 1000)
      throw new Error("Regression needs a table with 1–1,000 numeric pairs.");
    const predictors = expression.references.filter((name) => Array.isArray(scope[name]));
    if (
      predictors.length > 1 ||
      predictors.some((name) => scope[name].length !== ys.length || name === target)
    )
      throw new Error("Use one matching independent table column, such as x₁.");
    const parameters = expression.references.filter((name) => !own(scope, name));
    if (!parameters.length || parameters.length > 8 || parameters.length > ys.length)
      throw new Error("Use 1–8 unknown parameters and at least one data pair per parameter.");
    if (parameters.some((name) => name === "x" || name === "y"))
      throw new Error("Use x₁ for table regression, not x.");
    const predictor = predictors[0];
    const evaluate = (values) =>
      ys.map((_, i) =>
        expression.fn(
          { ...scope, ...values, ...(predictor ? { [predictor]: scope[predictor][i] } : {}) },
          math
        )
      );
    const valuesFor = (p) => Object.fromEntries(parameters.map((name, i) => [name, p[i]]));
    const score = (predicted) => predicted.reduce((sum, v, i) => sum + (v - ys[i]) ** 2, 0);
    let best = null;
    for (const seed of [1, 0.1, -1, 0, 10]) {
      let p = parameters.map(() => seed),
        predicted = evaluate(valuesFor(p)),
        error = score(predicted),
        damping = 0.01,
        converged = false;
      for (let iteration = 0; iteration < 100 && Number.isFinite(error); iteration++) {
        if (error < 1e-24) {
          converged = true;
          break;
        }
        const columns = p.map((v, j) => {
          const h = 1e-5 * (1 + Math.abs(v)),
            next = [...p];
          next[j] += h;
          return evaluate(valuesFor(next)).map((w, i) => (w - predicted[i]) / h);
        });
        const gram = p.map((_, j) =>
          p.map((__, k) => columns[j].reduce((sum, v, i) => sum + v * columns[k][i], 0))
        );
        const gradient = p.map((_, j) =>
          columns[j].reduce((sum, v, i) => sum + v * (ys[i] - predicted[i]), 0)
        );
        if (Math.max(...gradient.map(Math.abs)) < 1e-10) {
          converged = true;
          break;
        }
        gram.forEach((row, j) => {
          row[j] += damping * (1 + row[j]);
        });
        const step = solveLinear(gram, gradient, 1e-24);
        if (!step || step.some((v) => !Number.isFinite(v))) break;
        const next = p.map((v, i) => v + step[i]),
          trial = evaluate(valuesFor(next)),
          nextError = score(trial);
        if (Number.isFinite(nextError) && nextError < error) {
          const improvement = error - nextError;
          p = next;
          predicted = trial;
          error = nextError;
          damping = Math.max(1e-12, damping / 3);
          if (improvement < 1e-13 * (1 + error)) {
            converged = true;
            break;
          }
        } else damping *= 10;
        if (damping > 1e15) break;
      }
      if (Number.isFinite(error) && (!best || error < best.error))
        best = { p, error, predicted, converged };
    }
    if (!best) throw new Error("This model could not be fitted to the data. Check its domain.");
    const columns = best.p.map((v, j) => {
      const next = [...best.p],
        h = 1e-5 * (1 + Math.abs(v));
      next[j] += h;
      return evaluate(valuesFor(next)).map((w, i) => (w - best.predicted[i]) / h);
    });
    const lengths = columns.map((c) => Math.hypot(...c));
    const gram = columns.map((c, j) =>
      columns.map(
        (other, k) => c.reduce((sum, v, i) => sum + v * other[i], 0) / (lengths[j] * lengths[k])
      )
    );
    if (
      lengths.some((v) => !Number.isFinite(v) || v < 1e-12) ||
      !solveLinear(
        gram,
        parameters.map(() => 1),
        1e-8
      )
    )
      throw new Error("These data do not uniquely determine the model parameters.");
    return {
      parameters: valuesFor(best.p),
      converged: best.converged,
      predictor,
      ys,
      xs: predictor ? scope[predictor] : null,
      evaluate,
      predict: (x, parameters) =>
        expression.fn({ ...scope, ...parameters, ...(predictor ? { [predictor]: x } : {}) }, math),
    };
  }

  /* Resolve tables, constants, and functions before plotting, irrespective of row order. */
  function buildScene(rows, mode, enabled = false) {
    const math = mathFor(mode, enabled),
      scope = Object.create(null),
      functions = new Set(),
      definitions = new Map();
    if (enabled) scope.i = { re: 0, im: 1 };
    const setError = (row, error) => {
      row.error = error.message;
      row.plot = null;
    };
    for (const row of rows) {
      row.error = "";
      row.plot = null;
      row.result = "";
      row.definition = null;
      row.regression = null;
    }
    for (const row of rows) {
      try {
        if (row.type === "table") {
          const pairs = row.data.filter((pair) => pair.some((v) => String(v).trim()));
          if (!pairs.length) continue;
          if (pairs.some((pair) => pair.some((v) => !String(v).trim())))
            throw new Error("Complete both cells in each data row.");
          const values = pairs.map((pair) => pair.map((value) => constant(String(value), math)));
          scope[`x${row.tableIndex}`] = values.map((pair) => pair[0]);
          scope[`y${row.tableIndex}`] = values.map((pair) => pair[1]);
          row.plot = { kind: "points", points: values };
          continue;
        }
        const source = normalize(row.text),
          fn = /^([a-z]+\d*)\(x\)\s*=([^=]+)$/i.exec(source);
        const variable = /^([a-z]+\d*)\s*=([^=]+)$/i.exec(source);
        if (fn) {
          functions.add(fn[1].toLowerCase());
          row.definition = { name: fn[1].toLowerCase(), source: fn[2], fn: true };
        } else if (variable && !["x", "y", "pi", "e"].includes(variable[1].toLowerCase()))
          row.definition = { name: variable[1].toLowerCase(), source: variable[2], fn: false };
        if (row.definition) {
          if (definitions.has(row.definition.name) || own(arity, row.definition.name))
            throw new Error("Each variable or function needs a unique name.");
          definitions.set(row.definition.name, row);
        }
      } catch (error) {
        setError(row, error);
      }
    }
    for (const [name, row] of definitions)
      if (own(scope, name))
        setError(row, new Error("This name belongs to a table column or reserved constant."));
    const resolving = new Set();
    const resolve = (name) => {
      if (own(scope, name)) return scope[name];
      const row = definitions.get(name);
      if (!row || row.error) throw new Error(`Define ${subscript(name)} first.`);
      if (resolving.has(name)) throw new Error("Circular definitions are not supported.");
      resolving.add(name);
      try {
        const def = row.definition,
          compiled = compile(def.source, functions);
        for (const reference of compiled.references)
          if (!(def.fn && reference === "x")) resolve(reference);
        if (def.fn) scope[name] = (x) => compiled.fn({ ...scope, x }, math);
        else {
          const value = compiled.fn(scope, math);
          if (!Number.isFinite(value) && !isComplex(value))
            throw new Error("Undefined in the real numbers.");
          scope[name] = value;
          row.result = format(value);
        }
        return scope[name];
      } finally {
        resolving.delete(name);
      }
    };
    for (const [name, row] of definitions)
      if (!row.error)
        try {
          resolve(name);
        } catch {
          /* A regression may define this dependency below. */
        }
    // Regression coefficients become available to later curves, while manual slider
    // adjustments remain tied to the data/model key and never leak across questions.
    for (const row of rows)
      if (row.type !== "table" && !row.error && row.text.includes("~")) {
        try {
          const parts = normalize(row.text).split("~");
          if (parts.length !== 2 || !/^y\d+$/.test(parts[0].trim()))
            throw new Error("Use y₁ ~ m*x₁+b with a data table.");
          const target = parts[0].trim(),
            expression = compile(parts[1], functions);
          const dependencies = new Set([target, ...expression.references]);
          for (const name of dependencies) {
            const definition = definitions.get(name)?.definition;
            if (definition)
              for (const reference of compile(definition.source, functions).references)
                dependencies.add(reference);
          }
          const key = JSON.stringify([
            parts,
            mode,
            enabled,
            [...dependencies]
              .sort()
              .map((name) => [
                name,
                definitions.get(name)?.definition.source,
                typeof scope[name] === "function" ? null : scope[name],
              ]),
          ]);
          if (row.fitCache?.key !== key) {
            const changed = !!row.fitCache;
            row.fitCache = { key, fit: fitModel(target, expression, scope, math) };
            if (changed) row.manual = null;
          }
          const fit = row.fitCache.fit,
            parameters = row.manual || fit.parameters;
          const predicted = fit.evaluate(parameters);
          if (predicted.some((v) => !Number.isFinite(v)))
            throw new Error("Adjusted parameters are outside the model domain.");
          row.regression = {
            ...fit,
            parameters,
            adjusted: !!row.manual,
            ...regressionMetrics(fit.xs, fit.ys, predicted),
          };
          row.plot = { kind: "curve", fn: (x) => fit.predict(x, parameters) };
          Object.assign(scope, parameters);
        } catch (error) {
          row.regression = null;
          setError(row, error);
        }
      }
    for (const [name, row] of definitions)
      if (!row.error)
        try {
          resolve(name);
        } catch (error) {
          setError(row, error);
        }
    const evaluate = (source, allowed = []) => {
      const compiled = compile(source, functions);
      for (const name of compiled.references) {
        if (allowed.includes(name)) continue;
        if (!own(scope, name)) resolve(name);
        if (Array.isArray(scope[name]))
          throw new Error("Use table columns in a regression expression.");
      }
      return (vars) => compiled.fn({ ...scope, ...vars }, math);
    };
    for (const row of rows)
      if (row.type !== "table" && !row.error && !row.text.includes("~") && row.text.trim()) {
        try {
          if (row.definition) {
            if (row.definition.fn) row.plot = { kind: "curve", fn: scope[row.definition.name] };
            continue;
          }
          const source = normalize(row.text);
          if (source.startsWith("(") && source.endsWith(")")) {
            const parts = splitTop(source.slice(1, -1));
            if (parts.length === 2) {
              const point = parts.map((part) => evaluate(part)({}));
              if (!point.every(Number.isFinite))
                throw new Error("Point coordinates must be finite.");
              row.plot = { kind: "point", point };
              row.result = `(${point.map(format).join(", ")})`;
              continue;
            }
          }
          const relation = /^(.*?)\s*(<=|>=|=|<|>)\s*(.*?)$/.exec(source);
          if (relation) {
            const [, lhs, operator, rhs] = relation;
            if (
              operator === "=" &&
              lhs.trim() === "y" &&
              !compile(rhs, functions).references.includes("y")
            ) {
              const fn = evaluate(rhs, ["x"]);
              row.plot = { kind: "curve", fn: (x) => fn({ x }) };
            } else if (
              operator === "=" &&
              lhs.trim() === "x" &&
              !compile(rhs, functions).references.some((v) => v === "x" || v === "y")
            ) {
              const value = evaluate(rhs)({});
              if (!Number.isFinite(value)) throw new Error("Use a finite coordinate.");
              row.plot = { kind: "vertical", value };
            } else {
              const left = evaluate(lhs, ["x", "y"]),
                right = evaluate(rhs, ["x", "y"]);
              row.plot = {
                kind: "implicit",
                fn: (x, y) => left({ x, y }) - right({ x, y }),
                operator,
              };
            }
          } else {
            const compiled = compile(source, functions),
              fn = evaluate(source, ["x"]);
            if (compiled.references.includes("x"))
              row.plot = { kind: "curve", fn: (x) => fn({ x }) };
            else {
              const value = fn({});
              if (!Number.isFinite(value) && !isComplex(value))
                throw new Error("Undefined in the real numbers.");
              row.result = format(value);
            }
          }
        } catch (error) {
          setError(row, error);
        }
      }
    return scope;
  }

  class KarmanViewport {
    home() {
      this.resize();
      const rect = this.canvas.getBoundingClientRect(),
        ratio = rect.height > 0 ? rect.height / Math.max(1, rect.width) : 1;
      this.setViewport({ xMin: -10, xMax: 10, yMin: -10 * ratio, yMax: 10 * ratio });
    }
    setViewport(bounds) {
      const { xMin, xMax, yMin, yMax } = bounds;
      if (
        ![xMin, xMax, yMin, yMax].every(Number.isFinite) ||
        xMax - xMin < 1e-6 ||
        yMax - yMin < 1e-6 ||
        Math.max(xMax - xMin, yMax - yMin) > 1e10 ||
        Math.max(...Object.values(bounds).map(Math.abs)) > 1e12
      )
        return false;
      Object.assign(this, { xMin, xMax, yMin, yMax });
      this.scheduleDraw();
      return true;
    }
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const oldWidth = this.width,
        oldHeight = this.height;
      this.width = rect.width;
      this.height = rect.height;
      const scale = Math.min(window.devicePixelRatio || 1, 3);
      const pixelWidth = Math.round(this.width * scale),
        pixelHeight = Math.round(this.height * scale);
      // Reassigning either canvas dimension erases it, even when the size is unchanged.
      if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
        this.canvas.width = pixelWidth;
        this.canvas.height = pixelHeight;
      }
      this.context.setTransform(scale, 0, 0, scale, 0, 0);
      if (oldWidth && oldHeight) {
        const cx = (this.xMax + this.xMin) / 2,
          cy = (this.yMax + this.yMin) / 2;
        const sx = ((this.xMax - this.xMin) * this.width) / oldWidth / 2,
          sy = ((this.yMax - this.yMin) * this.height) / oldHeight / 2;
        this.setViewport({ xMin: cx - sx, xMax: cx + sx, yMin: cy - sy, yMax: cy + sy });
      }
      this.scheduleDraw();
    }
    project(x, y) {
      return {
        x: ((x - this.xMin) / (this.xMax - this.xMin)) * this.width,
        y: ((this.yMax - y) / (this.yMax - this.yMin)) * this.height,
      };
    }
    unproject(x, y) {
      return {
        x: this.xMin + (x / this.width) * (this.xMax - this.xMin),
        y: this.yMax - (y / this.height) * (this.yMax - this.yMin),
      };
    }
    position(event) {
      const rect = this.canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    pan(dx, dy) {
      this.setViewport({
        xMin: this.xMin + dx,
        xMax: this.xMax + dx,
        yMin: this.yMin + dy,
        yMax: this.yMax + dy,
      });
    }
    zoom(factor, px = this.width / 2, py = this.height / 2) {
      if (!this.width || !this.height) return;
      const point = this.unproject(px, py);
      this.setViewport({
        xMin: point.x + (this.xMin - point.x) * factor,
        xMax: point.x + (this.xMax - point.x) * factor,
        yMin: point.y + (this.yMin - point.y) * factor,
        yMax: point.y + (this.yMax - point.y) * factor,
      });
    }
    movePointer(event) {
      if (this.dragPoint && this.pointers.has(event.pointerId)) {
        const point = this.position(event),
          world = this.unproject(point.x, point.y),
          row = this.dragPoint;
        row.text = `(${format(world.x)},${format(world.y)})`;
        row.input.value = row.text;
        this.record();
        this.compute();
        return;
      }
      const next = this.position(event),
        previous = this.pointers.get(event.pointerId);
      if (previous) {
        const other = [...this.pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
        if (other) {
          const before = Math.hypot(previous.x - other.x, previous.y - other.y),
            after = Math.hypot(next.x - other.x, next.y - other.y);
          if (before > 4 && after > 4)
            this.zoom(
              clamp(before / after, 0.5, 2),
              (previous.x + other.x) / 2,
              (previous.y + other.y) / 2
            );
        }
        const divisor = other ? 2 : 1;
        this.pan(
          (((previous.x - next.x) / this.width) * (this.xMax - this.xMin)) / divisor,
          (((next.y - previous.y) / this.height) * (this.yMax - this.yMin)) / divisor
        );
        this.pointers.set(event.pointerId, next);
      }
      const p = this.unproject(next.x, next.y);
      this.get("graph-coordinates").textContent = `(${format(p.x)}, ${format(p.y)})`;
    }
    scheduleDraw() {
      if (!this.frame && !this.destroyed)
        this.frame = requestAnimationFrame(() => {
          this.frame = 0;
          this.draw();
        });
    }
    draw() {
      if (!this.width || !this.height) return;
      const ctx = this.context,
        color = (name) => this.resolvedColor(name);
      ctx.fillStyle = color("primary-bg");
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.width, this.height);
      ctx.clip();
      this.drawGrid(ctx, color);
      this.rows.forEach((row, index) => {
        const plot = row.plot;
        if (!row.visible || !plot || plot.kind === "scalar") return;
        ctx.strokeStyle = ctx.fillStyle = color(`plot-${(index % 6) + 1}`);
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        if (plot.kind === "implicit") {
          this.drawImplicit(plot, ctx);
        } else if (plot.kind === "points") {
          for (const point of plot.points) {
            const p = this.project(...point);
            ctx.moveTo(p.x + 4, p.y);
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          }
          ctx.fill();
        } else if (plot.kind === "point") {
          const p = this.project(...plot.point);
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (plot.kind === "vertical") {
          const p = this.project(plot.value, 0);
          ctx.moveTo(p.x, 0);
          ctx.lineTo(p.x, this.height);
          ctx.stroke();
        } else {
          const samples = Math.min(2048, Math.ceil(this.width));
          let previous = null;
          for (let i = 0; i <= samples; i++) {
            const x = this.xMin + (i / samples) * (this.xMax - this.xMin),
              y = plot.fn(x),
              p = this.project(x, y);
            if (!Number.isFinite(y) || Math.abs(p.y) > this.height * 100) {
              previous = null;
              continue;
            }
            const mid = previous
              ? this.project((previous.x + x) / 2, plot.fn((previous.x + x) / 2))
              : p;
            const continuous =
              previous &&
              Number.isFinite(mid.y) &&
              Math.abs(p.y - previous.py) < this.height * 1.5 &&
              Math.abs(mid.y - (p.y + previous.py) / 2) < this.height * 0.1;
            if (continuous) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
            previous = { x, py: p.y };
          }
          ctx.stroke();
        }
      });
      ctx.restore();
      this.canvas.setAttribute(
        "aria-label",
        `Graph from x=${format(this.xMin)} to ${format(this.xMax)}, y=${format(this.yMin)} to ${format(this.yMax)}. ${this.rows.filter((row) => row.visible && row.plot && row.plot.kind !== "scalar").length} plots. Arrow keys pan; plus and minus zoom; Home resets.`
      );
    }
    drawGrid(ctx, color) {
      const stepFor = (span, pixels) => {
        const raw = span / Math.max(2, pixels / 70),
          base = 10 ** Math.floor(Math.log10(raw));
        return [1, 2, 5, 10].find((n) => n * base >= raw) * base;
      };
      const sx = stepFor(this.xMax - this.xMin, this.width),
        sy = stepFor(this.yMax - this.yMin, this.height),
        origin = this.project(0, 0);
      const line = (x1, y1, x2, y2) => {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      };
      ctx.strokeStyle = color("grid");
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (this.gridMode === "square") {
        for (let x = Math.ceil(this.xMin / sx) * sx, n = 0; x <= this.xMax && n++ < 200; x += sx) {
          const p = this.project(x, 0);
          line(p.x, 0, p.x, this.height);
        }
        for (let y = Math.ceil(this.yMin / sy) * sy, n = 0; y <= this.yMax && n++ < 200; y += sy) {
          const p = this.project(0, y);
          line(0, p.y, this.width, p.y);
        }
      } else if (this.gridMode === "radial") {
        const maxR = Math.hypot(
          Math.max(Math.abs(this.xMin), Math.abs(this.xMax)),
          Math.max(Math.abs(this.yMin), Math.abs(this.yMax))
        );
        const nearX = this.xMin > 0 ? this.xMin : this.xMax < 0 ? this.xMax : 0,
          nearY = this.yMin > 0 ? this.yMin : this.yMax < 0 ? this.yMax : 0;
        const step = Math.max(sx, sy, stepFor(maxR - Math.hypot(nearX, nearY), 700));
        for (
          let r = Math.max(step, Math.floor(Math.hypot(nearX, nearY) / step) * step), n = 0;
          r <= maxR && n++ < 120;
          r += step
        ) {
          const rx = (r / (this.xMax - this.xMin)) * this.width,
            ry = (r / (this.yMax - this.yMin)) * this.height;
          ctx.moveTo(origin.x + rx, origin.y);
          ctx.ellipse(origin.x, origin.y, rx, ry, 0, 0, 2 * Math.PI);
        }
        for (let i = 0; i < 12; i++) {
          const p = this.project(
            maxR * Math.cos((i * Math.PI) / 6),
            maxR * Math.sin((i * Math.PI) / 6)
          );
          line(origin.x, origin.y, p.x, p.y);
        }
      }
      ctx.stroke();
      if (!this.showAxes) return;
      ctx.strokeStyle = color("axis");
      ctx.beginPath();
      line(origin.x, 0, origin.x, this.height);
      line(0, origin.y, this.width, origin.y);
      ctx.stroke();
      ctx.fillStyle = color("muted");
      ctx.font = `11px ${getComputedStyle(this.root).fontFamily}`;
      ctx.textAlign = "center";
      for (let x = Math.ceil(this.xMin / sx) * sx, n = 0; x <= this.xMax && n++ < 100; x += sx) {
        const p = this.project(x, 0);
        if (Math.abs(x) > sx * 1e-8)
          ctx.fillText(
            format(x),
            clamp(p.x, 22, this.width - 22),
            clamp(origin.y + 17, 15, this.height - 8)
          );
      }
      ctx.textAlign = "right";
      for (let y = Math.ceil(this.yMin / sy) * sy, n = 0; y <= this.yMax && n++ < 100; y += sy) {
        const p = this.project(0, y);
        if (Math.abs(y) > sy * 1e-8)
          ctx.fillText(
            format(y),
            clamp(origin.x - 7, 42, this.width - 8),
            clamp(p.y + 4, 14, this.height - 8)
          );
      }
    }
  }

  Object.assign(KarmanViewport.prototype, {
    resolvedColor(name) {
      if (!this.swatch) {
        this.swatch = document.createElement("span");
        this.swatch.hidden = true;
        this.root.append(this.swatch);
      }
      this.swatch.style.color = `var(--karman-${name})`;
      return getComputedStyle(this.swatch).color;
    },
    // Marching squares, with bounded samples and bisection to reject pole crossings.
    drawImplicit(plot, ctx) {
      const nx = Math.min(180, Math.max(20, Math.ceil(this.width / 7))),
        ny = Math.min(160, Math.max(20, Math.ceil(this.height / 7)));
      const dx = (this.xMax - this.xMin) / nx,
        dy = (this.yMax - this.yMin) / ny;
      const values = new Float64Array((nx + 1) * (ny + 1));
      for (let j = 0; j <= ny; j++)
        for (let i = 0; i <= nx; i++)
          values[j * (nx + 1) + i] = plot.fn(this.xMin + i * dx, this.yMax - j * dy);
      const inequality = plot.operator !== "=";
      const interpolate = (a, b) => {
        if (a.v === 0) return a;
        if (b.v === 0) return b;
        if (!Number.isFinite(a.v) || !Number.isFinite(b.v) || Math.sign(a.v) === Math.sign(b.v))
          return null;
        let left = a,
          right = b;
        for (let k = 0; k < 9; k++) {
          const t = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
          t.v = plot.fn(t.x, t.y);
          if (!Number.isFinite(t.v)) return null;
          if (Math.sign(t.v) === Math.sign(left.v)) left = t;
          else right = t;
        }
        const point = Math.abs(left.v) < Math.abs(right.v) ? left : right;
        return Math.abs(point.v) <= Math.max(1e-10, Math.max(Math.abs(a.v), Math.abs(b.v)) * 0.03)
          ? point
          : null;
      };
      const segment = (a, b) => {
        if (!a || !b) return;
        const p = this.project(a.x, a.y),
          q = this.project(b.x, b.y);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
      };
      ctx.beginPath();
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const x = this.xMin + i * dx,
            y = this.yMax - j * dy;
          const v = [
            values[j * (nx + 1) + i],
            values[j * (nx + 1) + i + 1],
            values[(j + 1) * (nx + 1) + i + 1],
            values[(j + 1) * (nx + 1) + i],
          ];
          if (v.some((n) => !Number.isFinite(n))) continue;
          if (inequality) {
            const center = plot.fn(x + dx / 2, y - dy / 2),
              inside = plot.operator.startsWith("<") ? center <= 0 : center >= 0;
            if (inside) {
              ctx.save();
              ctx.globalAlpha = 0.15;
              ctx.fillRect(
                (i * this.width) / nx,
                (j * this.height) / ny,
                this.width / nx + 0.5,
                this.height / ny + 0.5
              );
              ctx.restore();
            }
          }
          const corners = [
            { x, y, v: v[0] },
            { x: x + dx, y, v: v[1] },
            { x: x + dx, y: y - dy, v: v[2] },
            { x, y: y - dy, v: v[3] },
          ];
          const edges = corners.map((a, k) => interpolate(a, corners[(k + 1) % 4]));
          // Two adjacent edges may meet the contour at the same exact vertex.
          // Deduplicate that endpoint so a three-hit cell still draws its segment.
          const hits = edges.filter(
            (point, index, all) =>
              point &&
              all.findIndex((other) => other && other.x === point.x && other.y === point.y) ===
                index
          );
          if (hits.length === 2) segment(hits[0], hits[1]);
          else if (hits.length === 4) {
            const same = Math.sign(plot.fn(x + dx / 2, y - dy / 2)) === Math.sign(v[0]);
            if (same) {
              segment(edges[0], edges[1]);
              segment(edges[2], edges[3]);
            } else {
              segment(edges[0], edges[3]);
              segment(edges[1], edges[2]);
            }
          }
        }
      ctx.stroke();
    },
  });

  class KarmanExtras extends KarmanViewport {
    snapshot() {
      return this.rows.map(
        ({ id, externalId, type, text, visible, data, tableIndex, slider, sliders, manual }) => ({
          id,
          externalId,
          type,
          text,
          visible,
          data: data?.map((pair) => [...pair]),
          tableIndex,
          slider: slider && { ...slider },
          sliders: sliders && structuredClone(sliders),
          manual: manual && { ...manual },
        })
      );
    }
    restoreRow(saved) {
      const row =
        saved.type === "table"
          ? this.createTable(saved.data, saved.tableIndex)
          : this.createRow(saved.text, saved.visible);
      Object.assign(row, {
        visible: saved.visible,
        externalId: saved.externalId,
        slider: saved.slider,
        sliders: saved.sliders,
        manual: saved.manual,
      });
      return row;
    }
    subscribe(callback) {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
    getExpressions() {
      return this.rows.map((row) =>
        row.type === "table"
          ? {
              id: row.externalId || `row-${row.id}`,
              type: "table",
              columns: [0, 1].map((i) => ({
                latex: `${i ? "y" : "x"}_${row.tableIndex}`,
                values: row.data.map((pair) => pair[i]),
              })),
            }
          : {
              id: row.externalId || `row-${row.id}`,
              type: "expression",
              latex: row.text,
              hidden: !row.visible,
              slider: row.slider,
            }
      );
    }
    setExpressions(expressions) {
      if (!Array.isArray(expressions) || expressions.length > MAX_ROWS)
        throw new Error("Use up to 32 expressions.");
      const previous = new Map(this.rows.map((row) => [row.externalId || `row-${row.id}`, row]));
      const incoming = new Set(expressions.map((expression) => expression.id));
      if (incoming.size !== expressions.length)
        throw new Error("Each expression needs a unique identifier.");
      expressions = [
        ...this.getExpressions().filter(
          (expression) =>
            !incoming.has(expression.id) &&
            (expression.type === "table" || expression.latex?.trim())
        ),
        ...expressions,
      ];
      if (expressions.length > MAX_ROWS) throw new Error("Use up to 32 expressions.");
      const saved = expressions.map((expression) => {
        if (expression.type === "table") {
          const columns = expression.columns;
          if (
            columns?.length !== 2 ||
            (columns[0].values?.length || 0) > 1000 ||
            columns[0].values?.length !== columns[1].values?.length
          )
            throw new Error("A table requires two columns and at most 1,000 pairs.");
          const data = (columns[0].values || []).map((value, i) => [
            String(value),
            String(columns[1].values[i]),
          ]);
          data.forEach((pair) =>
            pair.forEach((value) => {
              if (value.trim()) constant(value, mathFor(this.angleMode));
            })
          );
          return {
            type: "table",
            data,
            tableIndex: Number(normalize(columns[0].latex).match(/\d+$/)?.[0] || 1),
            externalId: expression.id,
            visible: true,
          };
        }
        const text = normalize(String(expression.latex || ""));
        if (text.length > MAX_LENGTH) throw new Error("Expression is too long.");
        const old = previous.get(expression.id);
        const unchanged = old?.type !== "table" && old && normalize(old.text) === text;
        return {
          type: "expression",
          text,
          externalId: expression.id,
          visible: !expression.hidden,
          slider: expression.slider,
          sliders: unchanged ? old.sliders : undefined,
          manual: unchanged ? old.manual : undefined,
          fitCache: unchanged ? old.fitCache : undefined,
        };
      });
      const tables = saved.filter((entry) => entry.type === "table");
      if (new Set(tables.map((entry) => entry.tableIndex)).size !== tables.length)
        throw new Error("A table already uses these columns. Remove it before importing another.");
      this.get("expression-rows-container").replaceChildren();
      this.rows = [];
      for (const entry of saved) {
        const row = this.restoreRow(entry);
        row.fitCache = entry.fitCache;
      }
      if (!this.rows.length) this.createRow();
      this.activeRow = this.rows.find((row) => row.input) || this.rows[0];
      this.record();
      this.compute();
    }
    createTable(
      data = [
        ["", ""],
        ["", ""],
      ],
      tableIndex = ++this.tableSequence
    ) {
      this.tableSequence = Math.max(this.tableSequence, tableIndex);
      const row = this.createRow();
      row.input.remove();
      row.input = null;
      row.type = "table";
      row.data = data.map((pair) => [...pair]);
      row.tableIndex = tableIndex;
      const table = document.createElement("table");
      table.className = "data-table";
      table.setAttribute("aria-label", `Data table ${tableIndex}`);
      const head = table.createTHead().insertRow();
      for (const name of [`x${tableIndex}`, `y${tableIndex}`, ""]) {
        const cell = document.createElement("th");
        cell.textContent = subscript(name);
        cell.scope = "col";
        head.append(cell);
      }
      const body = table.createTBody();
      const rebuild = () => {
        body.replaceChildren();
        row.data.forEach((pair, index) => {
          const tr = body.insertRow();
          pair.forEach((value, col) => {
            const input = document.createElement("input");
            input.type = "text";
            input.inputMode = "decimal";
            input.value = value;
            input.maxLength = 128;
            input.setAttribute("aria-label", `${col ? "y" : "x"}${tableIndex} row ${index + 1}`);
            input.addEventListener("input", () => {
              row.data[index][col] = input.value;
              this.record();
              this.compute();
            });
            input.addEventListener("focus", () => {
              this.activeRow = row;
            });
            input.addEventListener("paste", (event) => {
              const text = event.clipboardData?.getData("text/plain") || "";
              if (event.clipboardData?.files.length || /[\t\n]/.test(text)) {
                event.preventDefault();
                if (!event.clipboardData.files.length) this.importText(text);
              }
            });
            tr.insertCell().append(input);
          });
          const remove = document.createElement("button");
          remove.type = "button";
          remove.textContent = "×";
          remove.setAttribute("aria-label", `Delete table ${tableIndex} row ${index + 1}`);
          remove.addEventListener("click", () => {
            row.data.splice(index, 1);
            if (!row.data.length) row.data.push(["", ""]);
            rebuild();
            this.record();
            this.compute();
          });
          tr.insertCell().append(remove);
        });
      };
      row.output.before(table);
      rebuild();
      const actions = document.createElement("div");
      actions.className = "table-actions";
      const add = document.createElement("button");
      add.textContent = "Add data row";
      add.type = "button";
      add.onclick = () => {
        if (row.data.length >= 1000) return;
        row.data.push(["", ""]);
        rebuild();
        this.record();
        this.compute();
        body.lastElementChild.querySelector("input").focus();
      };
      const model = document.createElement("select");
      model.setAttribute("aria-label", `Regression model ${tableIndex}`);
      for (const [label, value] of [
        ["Linear", "m*x+b"],
        ["Quadratic", "a*x^2+b*x+c"],
        ["Exponential", "a*b^x"],
        ["Constant", "b"],
      ]) {
        const option = document.createElement("option");
        option.textContent = label;
        option.value = value;
        model.append(option);
      }
      const fit = document.createElement("button");
      fit.type = "button";
      fit.textContent = "Add regression";
      fit.onclick = () =>
        this.addExpression(`y${tableIndex}~${model.value.replace(/x/g, `x${tableIndex}`)}`);
      actions.append(add, model, fit);
      row.output.before(actions);
      row.table = table;
      return row;
    }
    addTable(data) {
      if (this.rows.length >= MAX_ROWS) {
        this.announce("Up to 32 expressions per question.");
        return;
      }
      const row = this.createTable(data);
      this.activeRow = row;
      this.record();
      this.compute();
      row.table.querySelector("input")?.focus({ preventScroll: true });
      return row.id;
    }
    renderExtras(row) {
      // Retain focused range controls during pointer drags and keyboard adjustments.
      const active = this.root.getRootNode().activeElement || document.activeElement;
      if (!row.error && row.extra.contains(active) && active?.matches("input")) {
        for (const output of row.extra.querySelectorAll("[data-parameter]"))
          output.textContent = format(
            row.regression?.parameters[output.dataset.parameter] ?? this.scope[row.definition?.name]
          );
        const metrics = row.extra.querySelector(".fit-metrics");
        if (metrics && row.regression) metrics.textContent = this.fitSummary(row.regression);
        return;
      }
      row.extra.replaceChildren();
      if (row.error) {
        if (row.manual) {
          const reset = document.createElement("button");
          reset.type = "button";
          reset.textContent = "Refit data";
          reset.onclick = () => {
            row.manual = null;
            this.record();
            this.compute();
          };
          row.extra.append(reset);
        }
        return;
      }
      if (row.regression) {
        const result = row.regression,
          metrics = document.createElement("div");
        metrics.className = "fit-metrics";
        metrics.setAttribute("aria-label", "Regression results");
        metrics.textContent = this.fitSummary(result);
        row.extra.append(metrics);
        for (const [name, value] of Object.entries(result.parameters))
          this.sliderControl(row, name, value, (next) => {
            row.manual = { ...row.regression.parameters, [name]: next };
            this.record();
            this.compute();
          });
        const reset = document.createElement("button");
        reset.type = "button";
        reset.textContent = "Refit data";
        reset.onclick = () => {
          row.manual = null;
          this.record();
          this.compute();
        };
        row.extra.append(reset);
      } else if (
        row.definition &&
        Number.isFinite(this.scope[row.definition.name]) &&
        !row.definition.fn &&
        /^[-+]?\d*\.?\d+(?:e[-+]?\d+)?$/i.test(row.definition.source.trim())
      ) {
        const name = row.definition.name,
          value = this.scope[name];
        this.sliderControl(row, name, value, (next) => {
          row.text = subscript(`${name}=${Number(next.toPrecision(10))}`);
          row.input.value = row.text;
          this.record();
          this.compute();
        });
      }
    }
    fitSummary(fit) {
      return `${fit.adjusted ? "Adjusted model" : fit.converged ? "Regression fit" : "Approximate fit"} · R² = ${format(fit.r2)} · r = ${format(fit.r)} · RMSE = ${format(fit.rmse)}`;
    }
    sliderControl(row, name, value, onChange) {
      const span = Math.max(10, Math.ceil(Math.abs(value) * 2)),
        bounds = (row.regression ? row.sliders?.[name] : row.slider) || {
          min: -span,
          max: span,
          step: span / 1000,
        };
      const group = document.createElement("div");
      group.className = "parameter-control";
      const label = document.createElement("label"),
        output = document.createElement("output");
      output.dataset.parameter = name;
      output.textContent = format(value);
      label.append(`${subscript(name)} = `, output);
      const range = document.createElement("input");
      range.type = "range";
      range.min = String(Math.min(bounds.min, value));
      range.max = String(Math.max(bounds.max, value));
      range.step = String(bounds.step);
      range.value = String(value);
      range.setAttribute("aria-label", `Slider ${subscript(name)}`);
      range.addEventListener("input", () => onChange(Number(range.value)));
      label.append(range);
      group.append(label);
      const settings = document.createElement("div");
      settings.className = "slider-bounds";
      for (const key of ["min", "max", "step"]) {
        const input = document.createElement("input");
        input.type = "number";
        input.value = String(bounds[key]);
        input.setAttribute("aria-label", `${subscript(name)} slider ${key}`);
        input.step = "any";
        input.onchange = () => {
          const next = { ...bounds, [key]: Number(input.value) };
          if (
            !Object.values(next).every(Number.isFinite) ||
            next.min >= next.max ||
            next.step <= 0
          ) {
            input.value = String(bounds[key]);
            return;
          }
          Object.assign(bounds, next);
          if (row.regression) row.sliders = { ...row.sliders, [name]: next };
          else row.slider = next;
          range.min = String(next.min);
          range.max = String(next.max);
          range.step = String(next.step);
          this.record();
        };
        settings.append(input);
      }
      group.append(settings);
      row.extra.append(group);
    }
    importText(text) {
      try {
        if (
          typeof text !== "string" ||
          text.length > 200000 ||
          /<\/?[a-z]|https?:|data:|blob:|graphState|"expressions"/i.test(text)
        )
          throw new Error(
            "Paste plain-text math or a two-column table. Images and graphs are not accepted."
          );
        let lines = text
          .trim()
          .split(/\r?\n/)
          .filter((line) => line.trim());
        if (!lines.length) return;
        if (
          lines.some((line) => line.includes("\t")) ||
          (lines.length > 1 && lines.every((line) => line.split(",").length === 2))
        ) {
          let pairs = lines.map((line) =>
            line.split(line.includes("\t") ? "\t" : ",").map((value) => value.trim())
          );
          if (pairs[0].every((value) => /^[xy]_?[1₁]?$/.test(value))) pairs = pairs.slice(1);
          if (!pairs.length || pairs.length > 1000 || pairs.some((pair) => pair.length !== 2))
            throw new Error("Paste two columns and up to 1,000 pairs.");
          pairs.forEach((pair) =>
            pair.forEach((value) => constant(value, mathFor(this.angleMode)))
          );
          const expressions = this.getExpressions().filter(
            (entry) => entry.id !== "karman-imported-table"
          );
          expressions.push({
            id: "karman-imported-table",
            type: "table",
            columns: ["x_1", "y_1"].map((latex, i) => ({
              latex,
              values: pairs.map((pair) => pair[i]),
            })),
          });
          this.setExpressions(expressions);
          return;
        }
        const replace = this.activeRow?.input && !this.activeRow.text.trim();
        if (
          lines.length + this.rows.length - (replace ? 1 : 0) > MAX_ROWS ||
          lines.some((line) => line.length > MAX_LENGTH)
        )
          throw new Error("Use up to 32 expressions of 2,048 characters each.");
        if (replace) {
          this.activeRow.text = subscript(lines.shift());
          this.activeRow.input.value = this.activeRow.text;
        }
        for (const line of lines) this.activeRow = this.createRow(line);
        this.record();
        this.compute();
        this.activeRow.input?.focus();
        this.announce("Math pasted.");
      } catch (error) {
        this.announce(error.message);
      }
    }
  }

  class KarmanGraphingEngine extends KarmanExtras {
    constructor(canvas) {
      super();
      if (!(canvas instanceof HTMLCanvasElement))
        throw new TypeError("A canvas element is required.");
      this.canvas = canvas;
      this.context = canvas.getContext("2d");
      if (!this.context) throw new Error("Canvas rendering is unavailable.");
      this.root = canvas.closest("#karman-calculator");
      this.rows = [];
      this.pointers = new Map();
      this.listeners = new Set();
      this.abort = new AbortController();
      this.generation = 0;
      this.frame = 0;
      this.width = 0;
      this.height = 0;
      this.bindControls();
      this.listen(this.get("add-table"), "click", () => this.addTable());
      this.clearGraphExpressionsData();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      this.themeObserver = new MutationObserver(() => this.scheduleDraw());
      for (let node = this.root; node; node = node.parentElement || node.getRootNode().host)
        this.themeObserver.observe(node, {
          attributes: true,
          attributeFilter: ["class", "style", "data-theme"],
        });
      this.syncParentTheme();
      this.resize();
    }
    get(id) {
      return this.root.querySelector(`#${id}`);
    }
    listen(target, type, callback, options = {}) {
      target.addEventListener(type, callback, { ...options, signal: this.abort.signal });
    }
    announce(message) {
      this.get("calculator-status").textContent = message;
    }
    bindControls() {
      const actions = {
        "add-expression": () => this.addExpression(),
        undo: () => this.undo(-1),
        redo: () => this.undo(1),
        "clear-expressions": () => this.clearGraphExpressionsData(),
        "zoom-in": () => this.zoom(0.8),
        "zoom-out": () => this.zoom(1.25),
        "graph-home": () => this.home(),
        "keypad-toggle": () => this.setKeypad(!this.keypadOpen),
        "paste-expression": () => this.pasteClipboard(),
      };
      for (const [id, action] of Object.entries(actions))
        this.listen(this.get(id), "click", action);
      for (const button of this.root.querySelectorAll("[data-angle]"))
        this.listen(button, "click", () => this.setAngleMode(button.dataset.angle));
      for (const [toggle, panel, close] of [
        ["graph-settings-toggle", "graph-settings", "close-settings"],
        ["calculator-help-toggle", "calculator-help", "close-help"],
      ]) {
        this.listen(this.get(toggle), "click", () => this.togglePanel(toggle, panel));
        this.listen(this.get(close), "click", () => this.togglePanel(toggle, panel, false));
      }
      this.listen(this.get("complex-mode"), "change", (event) => {
        this.complexMode = event.target.checked;
        this.compute();
      });
      this.listen(this.get("grid-mode"), "change", (event) => {
        this.gridMode = event.target.value;
        this.scheduleDraw();
      });
      this.listen(this.get("show-axes"), "change", (event) => {
        this.showAxes = event.target.checked;
        this.scheduleDraw();
      });
      this.listen(this.get("toggle-sidebar"), "click", () => {
        const hidden = this.root.classList.toggle("sidebar-hidden"),
          button = this.get("toggle-sidebar");
        button.setAttribute("aria-expanded", String(!hidden));
        button.setAttribute("aria-label", hidden ? "Show expressions" : "Hide expressions");
        button.textContent = hidden ? "›" : "‹";
      });
      const keypad = this.get("karman-virtual-keypad");
      this.listen(keypad, "pointerdown", (event) => {
        if (event.target.closest("button")) event.preventDefault();
      });
      this.listen(keypad, "click", (event) => {
        const key = event.target.closest("button");
        if (key) this.insertKey(key.dataset);
      });
      this.listen(this.root, "keydown", (event) => this.keyboard(event));
      this.listen(this.root, "dragover", (event) => event.preventDefault());
      this.listen(this.root, "drop", (event) => {
        event.preventDefault();
        this.announce("Use Paste for plain-text math; figures and graph files are not accepted.");
      });
      this.listen(
        this.canvas,
        "wheel",
        (event) => {
          event.preventDefault();
          const p = this.position(event);
          this.zoom(Math.exp(clamp(event.deltaY, -100, 100) * 0.002), p.x, p.y);
        },
        { passive: false }
      );
      this.listen(this.canvas, "pointerdown", (event) => {
        if (event.button !== 0) return;
        this.canvas.focus({ preventScroll: true });
        this.canvas.setPointerCapture(event.pointerId);
        this.pointers.set(event.pointerId, this.position(event));
        if (this.pointers.size === 1) {
          const at = this.position(event);
          this.dragPoint = this.rows.find(
            (row) =>
              row.visible &&
              row.plot?.kind === "point" &&
              /^\([\d.,eE+\s-]+\)$/.test(row.text) &&
              Math.hypot(
                this.project(...row.plot.point).x - at.x,
                this.project(...row.plot.point).y - at.y
              ) < 14
          );
        } else this.dragPoint = null;
      });
      this.listen(this.canvas, "pointermove", (event) => this.movePointer(event));
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        this.listen(this.canvas, type, (event) => {
          this.pointers.delete(event.pointerId);
          this.dragPoint = null;
        });
      this.listen(this.canvas, "pointerleave", () => {
        if (!this.pointers.size) this.get("graph-coordinates").textContent = "";
      });
      this.listen(window, "resize", () => this.resize());
    }
    togglePanel(toggle, panel, open = this.get(panel).hidden) {
      this.get(panel).hidden = !open;
      this.get(toggle).setAttribute("aria-expanded", String(open));
      if (open) this.get(panel).querySelector("button").focus();
      else this.get(toggle).focus();
    }
    createRow(text = "", visible = true) {
      const row = { type: "expression", text: subscript(text), visible, id: ++this.sequence },
        article = document.createElement("article");
      article.className = "expression-row";
      const toggle = document.createElement("button"),
        field = document.createElement("div"),
        input = document.createElement("input"),
        output = document.createElement("output"),
        remove = document.createElement("button");
      toggle.type = remove.type = "button";
      toggle.className = "plot-toggle";
      remove.className = "remove-expression";
      remove.textContent = "×";
      input.type = "text";
      input.className = "expression-input";
      input.value = row.text;
      input.maxLength = MAX_LENGTH;
      input.placeholder = "Enter an expression";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.inputMode = this.keypadOpen ? "none" : "text";
      output.id = `karman-result-${row.id}`;
      output.className = "expression-result";
      output.setAttribute("aria-live", "polite");
      input.setAttribute("aria-describedby", output.id);
      const extra = document.createElement("div");
      extra.className = "row-extra";
      field.append(input, output, extra);
      article.append(toggle, field, remove);
      this.get("expression-rows-container").append(article);
      Object.assign(row, { element: article, input, output, toggle, remove, extra });
      this.rows.push(row);
      // Per-row listeners are owned by the DOM, so clearing rows also releases closures/history.
      input.addEventListener("focus", () => {
        this.activeRow = row;
      });
      input.addEventListener("input", () => {
        const start = input.selectionStart,
          end = input.selectionEnd;
        const before = input.value;
        input.value = subscript(before);
        if (start !== null)
          input.setSelectionRange(
            subscript(before.slice(0, start)).length,
            subscript(before.slice(0, end)).length
          );
        row.text = input.value;
        this.record();
        this.compute();
      });
      input.addEventListener("paste", (event) => {
        if (event.clipboardData?.files.length) {
          event.preventDefault();
          this.announce("Paste plain-text math, not images or files.");
        } else if (/\r|\n/.test(event.clipboardData?.getData("text/plain") || "")) {
          event.preventDefault();
          this.pasteText(event.clipboardData.getData("text/plain"));
        }
      });
      toggle.addEventListener("click", () => {
        row.visible = !row.visible;
        this.record();
        this.compute();
      });
      remove.addEventListener("click", () => {
        const index = this.rows.indexOf(row);
        row.element.remove();
        this.rows.splice(index, 1);
        if (!this.rows.length) this.createRow();
        this.activeRow = this.rows[Math.min(index, this.rows.length - 1)];
        this.record();
        this.compute();
        this.activeRow.input?.focus();
      });
      return row;
    }
    addExpression(text = "") {
      if (typeof text !== "string" || text.length > MAX_LENGTH)
        throw new TypeError("Expression must be a string of at most 2048 characters.");
      if (this.rows.length >= MAX_ROWS) {
        this.announce("Up to 32 expressions per question.");
        return null;
      }
      const row = this.createRow(text);
      this.activeRow = row;
      this.record();
      this.compute();
      row.input.focus({ preventScroll: true });
      const list = this.get("expression-rows-container");
      list.scrollTop +=
        row.element.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom;
      return row.id;
    }
    record() {
      const snapshot = this.snapshot();
      if (JSON.stringify(snapshot) === JSON.stringify(this.history[this.historyIndex])) return;
      this.history.splice(this.historyIndex + 1);
      this.history.push(snapshot);
      if (this.history.length > 100) this.history.shift();
      this.historyIndex = this.history.length - 1;
    }
    undo(direction) {
      const index = this.historyIndex + direction;
      if (index < 0 || index >= this.history.length) return;
      this.historyIndex = index;
      this.get("expression-rows-container").replaceChildren();
      this.rows = [];
      for (const row of this.history[index]) this.restoreRow(row);
      this.activeRow = this.rows[this.rows.length - 1];
      this.compute();
      this.activeRow.input?.focus();
    }
    compute() {
      this.scope = buildScene(this.rows, this.angleMode, this.complexMode);
      this.rows.forEach((row, i) => {
        row.element.style.setProperty("--row-color", `var(--karman-plot-${(i % 6) + 1})`);
        row.toggle.textContent = String(i + 1);
        row.toggle.setAttribute("aria-label", `Show plot ${i + 1}`);
        row.toggle.setAttribute("aria-pressed", String(row.visible));
        row.input?.setAttribute("aria-label", `Expression ${i + 1}`);
        row.remove.setAttribute("aria-label", `Delete expression ${i + 1}`);
        row.output.setAttribute("aria-label", `Result ${i + 1}`);
        row.output.textContent = row.error || row.result;
        row.output.classList.toggle("is-error", !!row.error);
        if (row.error) row.input?.setAttribute("aria-invalid", "true");
        else row.input?.removeAttribute("aria-invalid");
        this.renderExtras(row);
      });
      this.get("undo").disabled = this.historyIndex <= 0;
      this.get("redo").disabled = this.historyIndex >= this.history.length - 1;
      this.scheduleDraw();
      this.listeners.forEach((callback) => callback());
    }
    setAngleMode(mode) {
      if (!["degrees", "radians"].includes(mode))
        throw new TypeError("Angle mode must be degrees or radians.");
      this.angleMode = mode;
      for (const button of this.root.querySelectorAll("[data-angle]"))
        button.setAttribute("aria-pressed", String(button.dataset.angle === mode));
      this.announce(mode === "degrees" ? "Degrees" : "Radians");
      this.compute();
    }
    setTheme(theme) {
      if (!["light", "dark"].includes(theme)) throw new TypeError("Theme must be light or dark.");
      this.root.classList.toggle("karman-theme-dark", theme === "dark");
      this.root.classList.toggle("karman-theme-light", theme === "light");
      if (this.root.getRootNode() === document) {
        document.body.classList.toggle("karman-theme-dark", theme === "dark");
        document.body.classList.toggle("karman-theme-light", theme === "light");
      }
      this.scheduleDraw();
    }
    syncParentTheme() {
      if (window.parent === window) return;
      try {
        const host = window.frameElement,
          parent = window.parent.document;
        const sync = () => {
          let theme;
          for (let node = host; node; node = node.parentElement) {
            if (node.matches(".karman-theme-dark, .dark, [data-theme='dark']")) {
              theme = "dark";
              break;
            }
            if (node.matches(".karman-theme-light, .light, [data-theme='light']")) {
              theme = "light";
              break;
            }
          }
          if (theme) this.setTheme(theme);
          const styles = window.parent.getComputedStyle(host);
          for (const token of [
            "--background",
            "--surface",
            "--border",
            "--text-primary",
            "--text-secondary",
            "--font-plex-sans",
          ]) {
            const value = styles.getPropertyValue(token);
            if (value) document.body.style.setProperty(token, value);
            else document.body.style.removeProperty(token);
          }
          this.scheduleDraw();
        };
        this.parentObserver = new MutationObserver(sync);
        for (let node = host; node; node = node.parentElement)
          this.parentObserver.observe(node, {
            attributes: true,
            attributeFilter: ["class", "style", "data-theme"],
          });
        this.listen(parent, "change", sync);
        sync();
      } catch {
        /* Cross-origin hosts can use their own same-origin embedding bridge. */
      }
    }
    setKeypad(open) {
      const tray = this.get("karman-virtual-keypad");
      if (!open && tray.contains(this.root.getRootNode().activeElement || document.activeElement))
        this.get("keypad-toggle").focus();
      const changed = this.keypadOpen !== Boolean(open);
      this.keypadOpen = Boolean(open);
      if (changed)
        this.root.dispatchEvent(
          new CustomEvent("karmankeypadchange", {
            detail: this.keypadOpen,
            bubbles: true,
            composed: true,
          })
        );
      this.root.classList.toggle("keypad-open", this.keypadOpen);
      tray.inert = !open;
      tray.setAttribute("aria-hidden", String(!open));
      this.get("keypad-toggle").setAttribute("aria-expanded", String(Boolean(open)));
      this.get("keypad-chevron").textContent = open ? "⌄" : "⌃";
      for (const row of this.rows) if (row.input) row.input.inputMode = open ? "none" : "text";
    }
    insertKey({ insert, action }) {
      if (action === "enter") {
        this.addExpression();
        return;
      }
      if (!this.activeRow?.input) this.addExpression();
      const row = this.rows.includes(this.activeRow) ? this.activeRow : this.rows[0],
        input = row.input;
      let start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      if (action === "backspace" && start === end) start = Math.max(0, start - 1);
      const value = action === "backspace" ? "" : insert || "";
      if (input.value.length - (end - start) + value.length > MAX_LENGTH) return;
      input.setRangeText(value, start, end, "end");
      const caret = subscript(input.value.slice(0, input.selectionStart)).length;
      input.value = subscript(input.value);
      input.setSelectionRange(caret, caret);
      row.text = input.value;
      this.record();
      this.compute();
      input.focus({ preventScroll: true });
    }
    async pasteClipboard() {
      const generation = this.generation;
      try {
        const text = await navigator.clipboard.readText();
        if (generation === this.generation) this.pasteText(text);
      } catch {
        if (generation === this.generation)
          this.announce("Select a row and use Ctrl/Cmd+V, or your device’s Paste command.");
      }
    }
    pasteText(text) {
      this.importText(text);
    }
    keyboard(event) {
      if (event.isComposing) return;
      if (
        (event.ctrlKey || event.metaKey) &&
        ["z", "y"].includes(event.key.toLowerCase()) &&
        !event.altKey
      ) {
        event.preventDefault();
        this.undo(event.shiftKey || event.key.toLowerCase() === "y" ? 1 : -1);
        return;
      }
      if (event.key === "Escape") {
        for (const [toggle, panel] of [
          ["graph-settings-toggle", "graph-settings"],
          ["calculator-help-toggle", "calculator-help"],
        ])
          if (!this.get(panel).hidden) {
            event.preventDefault();
            event.stopPropagation();
            this.togglePanel(toggle, panel, false);
            return;
          }
        if (this.keypadOpen) {
          event.preventDefault();
          event.stopPropagation();
          this.setKeypad(false);
        }
        return;
      }
      const row = this.rows.find((item) => item.input === event.target);
      if (event.key === "Enter" && (row || event.altKey)) {
        event.preventDefault();
        this.addExpression();
        return;
      }
      if (row && ["ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        this.rows[
          clamp(
            this.rows.indexOf(row) + (event.key === "ArrowUp" ? -1 : 1),
            0,
            this.rows.length - 1
          )
        ].input?.focus();
        return;
      }
      if (event.target !== this.canvas) return;
      const dx = (this.xMax - this.xMin) * 0.1,
        dy = (this.yMax - this.yMin) * 0.1;
      const pan = {
        ArrowLeft: [-dx, 0],
        ArrowRight: [dx, 0],
        ArrowUp: [0, dy],
        ArrowDown: [0, -dy],
      }[event.key];
      if (pan) {
        event.preventDefault();
        this.pan(...pan);
      } else if (["+", "=", "-", "Home"].includes(event.key)) {
        event.preventDefault();
        if (event.key === "Home") this.home();
        else this.zoom(event.key === "-" ? 1.25 : 0.8);
      }
    }
    clearGraphExpressionsData() {
      this.generation++;
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      for (const id of this.pointers.keys())
        if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
      this.pointers.clear();
      this.dragPoint = null;
      this.rows = [];
      this.history = [];
      this.historyIndex = -1;
      this.sequence = 0;
      this.tableSequence = 0;
      this.get("expression-rows-container").replaceChildren();
      this.activeRow = this.createRow();
      this.record();
      this.complexMode = false;
      this.get("complex-mode").checked = false;
      this.gridMode = "square";
      this.showAxes = true;
      this.get("grid-mode").value = "square";
      this.get("show-axes").checked = true;
      this.get("graph-coordinates").textContent = "";
      this.setKeypad(false);
      for (const [panel, toggle] of [
        ["graph-settings", "graph-settings-toggle"],
        ["calculator-help", "calculator-help-toggle"],
      ]) {
        this.get(panel).hidden = true;
        this.get(toggle).setAttribute("aria-expanded", "false");
      }
      this.root.classList.remove("sidebar-hidden");
      this.get("toggle-sidebar").setAttribute("aria-expanded", "true");
      this.get("toggle-sidebar").setAttribute("aria-label", "Hide expressions");
      this.get("toggle-sidebar").textContent = "‹";
      this.setAngleMode("degrees");
      this.home();
      this.announce("Cleared · Degrees");
    }
    destroy() {
      this.generation++;
      this.destroyed = true;
      this.abort.abort();
      this.resizeObserver.disconnect();
      this.themeObserver.disconnect();
      this.parentObserver?.disconnect();
      cancelAnimationFrame(this.frame);
      this.pointers.clear();
      this.dragPoint = null;
      this.listeners.clear();
      this.rows = [];
      this.history = [];
      this.activeRow = null;
      this.get("expression-rows-container").replaceChildren();
      this.context.clearRect(0, 0, this.width, this.height);
      if (window.KarmanEngineInstance === this) delete window.KarmanEngineInstance;
    }
  }

  window.KarmanGraphingEngine = KarmanGraphingEngine;
  const start = () => {
    if (!document.getElementById("karman-graph-canvas")) return;
    window.KarmanEngineInstance = new KarmanGraphingEngine(
      document.getElementById("karman-graph-canvas")
    );
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
