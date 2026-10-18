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
    for (const [id, action] of Object.entries(actions)) this.listen(this.get(id), "click", action);
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
        clamp(this.rows.indexOf(row) + (event.key === "ArrowUp" ? -1 : 1), 0, this.rows.length - 1)
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
