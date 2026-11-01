/* 21st.dev component 23570 (ddoemonn/tabs, "Tabs"), ported from React and motion/react to plain JavaScript:
   a tablist with role=tab buttons, roving tabindex, arrow, Home and End keys, and an indicator that slides
   under the selected tab (Web Animations API, transform only, no travel under reduced motion). The stone
   palette, the card chrome and the focus ring colours became Karman's tokens (components/tabs.css).
   Usage: karmanTabs(root) where root holds [role=tablist] > button[data-tab] and [data-panel] elements. */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.karmanTabs = function (root, onChange) {
    const list = root.querySelector("[role=tablist]");
    const tabs = [...list.querySelectorAll("[role=tab]")];
    const bar = list.querySelector(".tab-ind");
    let current = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    if (current < 0) current = 0;
    const place = (animate) => {
      const t = tabs[current];
      if (!bar || !t) return;
      const x = t.offsetLeft, w = t.offsetWidth;
      const to = `translateX(${x}px) scaleX(${w / 100})`;
      if (animate && !reduce) bar.animate([{ transform: bar.style.transform || to }, { transform: to }], { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" });
      bar.style.transform = to;
    };
    const select = (i, focus) => {
      current = i;
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const p = root.querySelector(`[data-panel="${t.dataset.tab}"]`);
        if (p) p.hidden = !on;
      });
      if (focus) tabs[i].focus();
      place(true);
      onChange?.(tabs[i].dataset.tab, i);
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(i));
      t.addEventListener("keydown", (e) => {
        const n = tabs.length;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); select((i + 1) % n, true); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); select((i - 1 + n) % n, true); }
        else if (e.key === "Home") { e.preventDefault(); select(0, true); }
        else if (e.key === "End") { e.preventDefault(); select(n - 1, true); }
      });
    });
    new ResizeObserver(() => place(false)).observe(list);
    select(current);
    return { select };
  };
})();
