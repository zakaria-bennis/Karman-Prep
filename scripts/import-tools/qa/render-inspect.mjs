// In-page checks for render-audit.mjs. inspectPage runs inside the browser through
// page.evaluate, so it must stay self-contained (no imports, no outer variables).
// It looks at #qa-render (the question card), records layout problems, then opens up any
// inner scroll container so the screenshot shows everything.

export function inspectPage({ expected }) {
  const failures = {};
  const info = { opened: 0 };
  const put = (k, v) => {
    const list = (failures[k] ??= []);
    if (list.length < 6) list.push(v);
  };
  const root = document.querySelector("#qa-render");
  const describe = (el) => {
    const cls =
      typeof el.className === "string"
        ? el.className.trim().split(/\s+/).slice(0, 3).join(".")
        : "";
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `<${el.tagName.toLowerCase()}${cls ? "." + cls : ""}>${text ? ` "${text}"` : ""}`;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && cs.display !== "none";
  };
  const inKatexInside = (el) => !!el.parentElement?.closest(".katex");
  const all = [root, ...root.querySelectorAll("*")];

  // Sideways page scroll.
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 1)
    put("page_overflow", `page is ${doc.scrollWidth}px wide in a ${doc.clientWidth}px window`);

  // Boxes that must be scrolled sideways. A wide data table scrolls on purpose (pinned first
  // column, data-table-overflow); that is counted, not failed.
  info.table_scrolls = 0;
  for (const el of all) {
    if (inKatexInside(el) || !visible(el)) continue;
    const ox = getComputedStyle(el).overflowX;
    if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 2) {
      if (el.closest("[data-table-overflow='true']")) info.table_scrolls++;
      else
        put(
          "inner_horizontal_scroll",
          `${describe(el)} hides ${el.scrollWidth - el.clientWidth}px sideways`
        );
    }
  }

  // Anything sticking out past the card that no ancestor clips.
  const card = root.getBoundingClientRect();
  const clippedByAncestor = (el) => {
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== "visible") return true;
    }
    return false;
  };
  const reported = [];
  for (const el of all) {
    if (el === root || inKatexInside(el) || !visible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.position === "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.right <= card.right + 1 && r.left >= card.left - 1) continue;
    if (clippedByAncestor(el) || reported.some((p) => p.contains(el))) continue;
    reported.push(el);
    put(
      "element_overflow",
      `${describe(el)} is ${Math.round(Math.max(r.right - card.right, card.left - r.left))}px outside the card`
    );
  }

  // KaTeX could not parse.
  for (const el of root.querySelectorAll(".katex-error"))
    put("katex_error", (el.getAttribute("title") || el.textContent || "").slice(0, 120));

  // Images.
  for (const img of root.querySelectorAll("img")) {
    if (!img.complete || img.naturalWidth === 0)
      put("image_failed", `${(img.currentSrc || img.src).slice(0, 120)} did not load`);
    else if (!visible(img)) put("figure_empty", `image drawn at zero size`);
  }

  // The row's figure must be drawn, and not at zero size.
  if (expected) {
    const figures = [...root.querySelectorAll(".themed-question-figure")].filter(
      (f) => !f.closest("fieldset")
    );
    if (!figures.length) put("figure_missing", `${expected} figure is not on the screen`);
    for (const fig of figures) {
      const r = fig.getBoundingClientRect();
      const drawn = fig.querySelector("img, svg, table");
      const dr = drawn?.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || !drawn || !dr || dr.width < 8 || dr.height < 8)
        put(
          "figure_empty",
          `${expected} figure is ${Math.round(dr?.width ?? r.width)}x${Math.round(dr?.height ?? r.height)}`
        );
      else if (
        drawn.tagName.toLowerCase() === "svg" &&
        !drawn.querySelector("path, line, polyline, polygon, rect, circle, ellipse, text")
      )
        put("figure_empty", `${expected} svg has nothing drawn`);
    }
  }

  // Overlap: choice text under the absolutely placed choice tools, and block siblings on top of
  // each other (in normal flow they never should be).
  const textRects = (el) => {
    const out = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim() || n.parentElement?.closest(".katex")) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) out.push(r);
    }
    // KaTeX wraps across lines: one box per line piece (.base), not the whole span.
    for (const k of el.querySelectorAll(".katex-html .base")) out.push(...k.getClientRects());
    return out;
  };
  const hit = (a, b, pad = 1) =>
    a.left + pad < b.right &&
    b.left + pad < a.right &&
    a.top + pad < b.bottom &&
    b.top + pad < a.bottom;
  for (const tools of root.querySelectorAll("[data-calculator-cluster], [class*='choiceTools']")) {
    const label = tools.parentElement?.querySelector("label");
    if (!label || !visible(tools)) continue;
    const buttons = [...tools.querySelectorAll("button")]
      .filter(visible)
      .map((b) => b.getBoundingClientRect());
    const over = textRects(label).find((t) => buttons.some((b) => hit(t, b)));
    if (over) put("text_overlap", `choice text runs under the choice buttons: ${describe(label)}`);
  }
  const flow = (el) => {
    const cs = getComputedStyle(el);
    return (
      cs.position !== "absolute" &&
      cs.position !== "fixed" &&
      !cs.display.startsWith("inline") &&
      cs.display !== "contents" &&
      visible(el)
    );
  };
  for (const parent of all) {
    if (inKatexInside(parent) || parent.closest(".katex") || parent.closest("svg")) continue;
    const kids = [...parent.children].filter(flow);
    for (let i = 0; i < kids.length; i++)
      for (let j = i + 1; j < kids.length; j++) {
        const a = kids[i].getBoundingClientRect();
        const b = kids[j].getBoundingClientRect();
        if (hit(a, b, 2)) put("text_overlap", `${describe(kids[i])} overlaps ${describe(kids[j])}`);
      }
  }

  // The figure/passage column is shown (the row has a figure kind) but holds nothing visible:
  // the question is squeezed into half the screen next to an empty column.
  const layout = root.querySelector("[data-question-layout]");
  const side = layout?.firstElementChild;
  if (
    side &&
    !side.hidden &&
    getComputedStyle(side).display !== "none" &&
    ![...side.children].some(visible)
  )
    put("empty_column", "the figure/passage column is shown with nothing in it");

  // Open up scroll containers (vertical) so the screenshot shows the whole question.
  for (const el of all) {
    if (el.closest(".katex")) continue;
    const oy = getComputedStyle(el).overflowY;
    if (oy !== "visible" && el.scrollHeight > el.clientHeight + 4) {
      el.style.overflowY = "visible";
      el.style.maxHeight = "none";
      el.style.height = "auto";
      info.opened++;
    }
  }
  info.width = Math.round(card.width);
  info.height = Math.round(root.getBoundingClientRect().height);
  return { failures, info };
}
