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
            if (!point.every(Number.isFinite)) throw new Error("Point coordinates must be finite.");
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
          if (compiled.references.includes("x")) row.plot = { kind: "curve", fn: (x) => fn({ x }) };
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
