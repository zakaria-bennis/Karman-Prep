/* 21st.dev component 554 (campsite/theme-toggle, "Theme Toggle"), ported to plain JavaScript. The original is a
   three-state radio group (light, dark, system) with next-themes; Karman's rule 33 wants the device's mode
   first and one visible switch that overrides it and is remembered, so it is reduced to one button that
   flips light and dark and writes localStorage "karman-theme". The Lucide sun and the preview SVGs became
   Karman's own drawn sun and moon. Every toggle on the page (header, sheet, footer) shares the same state. */
(function () {
  const SUN = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>';
  const MOON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.3 8.3 0 1 0 10.2 10.2Z"/></svg>';
  const root = document.documentElement;
  function paint() {
    const dark = root.dataset.theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      const words = b.dataset.words === "yes";
      const label = dark ? b.dataset.light || "Light mode" : b.dataset.dark || "Dark mode";
      b.innerHTML = (dark ? SUN : MOON) + (words ? `<span>${label}</span>` : "");
      b.setAttribute("aria-label", label);
      b.setAttribute("aria-pressed", String(dark));
    });
    // the engine fragments follow the page's mode (observatory is the app's dark default, ivory its light)
    document.querySelectorAll(".karman-engine").forEach((e) => {
      e.classList.toggle("dark", dark);
      e.setAttribute("data-theme", dark ? "observatory" : "ivory");
    });
    document.dispatchEvent(new CustomEvent("karman:theme", { detail: dark ? "dark" : "light" }));
  }
  function flip() {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("karman-theme", next); } catch (e) {}
    paint();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme-toggle]");
    if (b) flip();
  });
  window.KARMAN_THEME = { paint, flip };
})();
