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
          !incoming.has(expression.id) && (expression.type === "table" || expression.latex?.trim())
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
        if (!Object.values(next).every(Number.isFinite) || next.min >= next.max || next.step <= 0) {
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
        pairs.forEach((pair) => pair.forEach((value) => constant(value, mathFor(this.angleMode))));
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
