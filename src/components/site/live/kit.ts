/* Karman's own loading and feedback kit (ported from the approved mock, 2026-10-25). The line and the
   messages are drawn by this file; the orb is the Thinking Orb library's. Browser only: call these from effects and event handlers.

   Which loader for which wait (the rules every page follows):
     under 400 ms .......... nothing. A loader that flashes on and off reads as a glitch (Doherty threshold).
     one tap, a short wait . the orb, 20 px, inside the button that was pressed, from 400 ms. The button keeps
                             its words and stays where it is, so the eye never loses its place.
     a section's content ... a skeleton shaped like what is coming (design rule 29). No section of the
                             marketing pages loads on its own today, so none is drawn yet.
     a page or a big file .. the line: a thin marigold bar at the very top. It jumps to 12% at once, runs
                             quickly through the first half, slows but never stops, and finishes fast.
     the film is late ...... the large orb over the film, from 400 ms, with one line of words after 2.5 s.
     done .................. a message that says what happened, with a check that draws itself. Errors sit
                             next to their field and say what happened, why and what to do.
   With reduced motion the orb shows one still frame (the library's own behaviour). */
import { iconSvg } from "./icons";

/** Fixed messages mount inside the site's root element so its colours and fonts apply. */
const host = () => document.getElementById("ks") ?? document.body;
const esc = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/* ---------- the orb: the Thinking Orb, from the thinking-orbs library (MIT, by Jakub Antalik,
   github.com/Jakubantalik/Libraries.dev), in its small "working" form. Founder, 2026-11-25: the real one,
   not a drawing of our own. It is fetched only when a wait first lasts long enough to show it, and is
   drawn in one ink, pale or dark, to match the words beside it. ---------- */
/** True when a CSS colour ("rgb(13, 36, 28)") is a pale one. */
const pale = (color: string) => {
  const [r, g, b] = (color.match(/[\d.]+/g) ?? []).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
};
/** Puts the orb in `host` (an empty span). Returns the way to take it out again. */
export function orb(host: HTMLElement, { size = 20 }: { size?: 20 | 32 | 64 } = {}): () => void {
  let alive = true;
  let unmount = () => {};
  host.setAttribute("aria-hidden", "true");
  host.style.cssText += `;display:inline-grid;flex:none;width:${size}px;height:${size}px`;
  // pale words mean a dark button, so pale dots
  const theme = pale(getComputedStyle(host).color) ? "dark" : "light";
  void Promise.all([import("thinking-orbs"), import("react"), import("react-dom/client")]).then(
    ([{ ThinkingOrb }, { createElement }, { createRoot }]) => {
      if (!alive) return;
      const root = createRoot(host);
      root.render(createElement(ThinkingOrb, { state: "working", size, theme }));
      unmount = () => root.unmount();
    }
  );
  return () => {
    alive = false;
    unmount();
  };
}

/* ---------- the line: the page loading bar ---------- */
export const line = (() => {
  let el: HTMLDivElement | null = null;
  let showT: ReturnType<typeof setTimeout> | undefined;
  let raf = 0,
    p = 0,
    shown = false,
    startAt = 0,
    expect = 900;
  const build = () => {
    if (el && el.isConnected) return el;
    el = document.createElement("div");
    el.className = "k-line";
    el.setAttribute("role", "progressbar");
    el.setAttribute("aria-label", "Loading");
    el.setAttribute("aria-valuemin", "0");
    el.setAttribute("aria-valuemax", "100");
    el.innerHTML = '<span class="k-fill"></span>';
    host().append(el);
    return el;
  };
  const paint = () => {
    el?.style.setProperty("--p", p.toFixed(4));
    el?.setAttribute("aria-valuenow", String(Math.round(p * 100)));
  };
  // 12% at once, fast through the first half, then slower and slower, but always moving, never past 94%
  const curve = (ms: number) => {
    const x = ms / expect;
    const main = 0.12 + 0.7 * (1 - Math.exp(-2.4 * x));
    const creep = Math.max(0, x - 1) * 0.04;
    return Math.min(0.94, main + creep);
  };
  function tick() {
    p = Math.max(p, curve(performance.now() - startAt));
    paint();
    raf = requestAnimationFrame(tick);
  }
  return {
    start(ms = 900) {
      expect = ms;
      clearTimeout(showT);
      cancelAnimationFrame(raf);
      startAt = performance.now();
      // nothing for the first 400 ms: most waits end before anyone would see the bar
      showT = setTimeout(() => {
        const bar = build();
        shown = true;
        p = 0.12;
        bar.classList.remove("done");
        bar.classList.add("on");
        paint();
        raf = requestAnimationFrame(tick);
      }, 400);
    },
    done() {
      clearTimeout(showT);
      cancelAnimationFrame(raf);
      if (!shown || !el) return;
      shown = false;
      // the fast finish: 100% in 180 ms, a short hold so the eye registers "done", then away
      const bar = el;
      bar.classList.add("done");
      p = 1;
      paint();
      setTimeout(() => bar.classList.remove("on"), 300);
    },
  };
})();

/* ---------- messages ---------- */
// One message at a time, bottom centre on phones (thumb reach), top right on desktop. It stays 5 s plus
// 60 ms per character (time to read it twice), longer while hovered or focused.
let toastEl: HTMLDivElement | null = null;
let toastT: ReturnType<typeof setTimeout> | undefined;
export function toast(title: string, text = "", kind: "done" | "error" = "done"): () => void {
  toastEl?.remove();
  clearTimeout(toastT);
  const el = document.createElement("div");
  el.className = `k-toast ${kind}`;
  el.setAttribute("role", kind === "error" ? "alert" : "status");
  el.innerHTML = `<span class="k-badge">${iconSvg(kind === "error" ? "alert" : "check", "draw")}</span><div><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ""}</div><button type="button" class="k-x" aria-label="Close message">${iconSvg("plus")}</button>`;
  host().append(el);
  toastEl = el;
  requestAnimationFrame(() => el.classList.add("on"));
  const shut = () => {
    el.classList.remove("on");
    setTimeout(() => el.remove(), 320);
  };
  const life = 5000 + (title + text).length * 60;
  const arm = () => (toastT = setTimeout(shut, life));
  el.addEventListener("pointerenter", () => clearTimeout(toastT));
  el.addEventListener("pointerleave", arm);
  el.addEventListener("focusin", () => clearTimeout(toastT));
  el.querySelector(".k-x")?.addEventListener("click", shut);
  arm();
  return shut;
}

/* ---------- busy buttons: words stay, the orb takes the arrow's place after 400 ms ---------- */
type BusyButton = HTMLElement & {
  _busyT?: ReturnType<typeof setTimeout>;
  _stop?: (() => void) | null;
  _arrow?: string;
  _label?: string | null;
};
export function busy(el: HTMLElement, on: boolean, label?: string) {
  const button = el as BusyButton;
  const go = button.querySelector<HTMLElement>(".go");
  const lb = button.querySelector<HTMLElement>(".lb");
  if (on) {
    button.setAttribute("aria-busy", "true");
    button._label = lb?.textContent ?? null;
    if (label && lb) lb.textContent = label;
    button._busyT = setTimeout(() => {
      if (!go) return;
      button._arrow = go.innerHTML;
      const c = document.createElement("span");
      go.replaceChildren(c);
      button._stop = orb(c);
    }, 400);
  } else {
    clearTimeout(button._busyT);
    button._stop?.();
    button._stop = null;
    if (go && button._arrow) go.innerHTML = button._arrow;
    if (button._label != null && lb) lb.textContent = button._label;
    button.removeAttribute("aria-busy");
  }
}
