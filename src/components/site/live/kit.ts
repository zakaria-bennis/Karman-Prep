/* Karman's own loading and feedback kit (ported from the approved mock, 2026-10-25). No libraries: every
   shape here is drawn by this file. Browser only: call these from effects and event handlers.

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
   With reduced motion the orb turns slowly instead of stopping (a loader that never moves says nothing). */
import { iconSvg } from "./icons";

const MARIGOLD = [235, 162, 31] as const;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Fixed messages mount inside the site's root element so its colours and fonts apply. */
const host = () => document.getElementById("ks") ?? document.body;
const esc = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/* ---------- the orb: a marigold sphere with one satellite on a tilted orbit, like the line 100 km up ---------- */
export function orb(
  canvas: HTMLCanvasElement,
  {
    size = 20,
    dark = false,
    state = "working",
  }: { size?: number; dark?: boolean; state?: string } = {}
): () => void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.height = Math.round(size * dpr);
  canvas.style.width = canvas.style.height = `${size}px`;
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const [r, g, b] = MARIGOLD;
  const c = size / 2;
  const R = size * 0.2; // the sphere
  const ox = size * 0.42,
    oy = size * 0.15; // the orbit, an ellipse seen at an angle
  const tilt = -0.42;
  const period = state === "waiting" ? 2.6 : 1.35; // seconds per lap
  const slow = reduced();
  let raf = 0,
    alive = true;
  const t0 = performance.now();
  const at = (a: number): [number, number] => {
    const x = Math.cos(a) * ox,
      y = Math.sin(a) * oy;
    return [
      c + x * Math.cos(tilt) - y * Math.sin(tilt),
      c + x * Math.sin(tilt) + y * Math.cos(tilt),
    ];
  };
  function frame(now: number) {
    if (!alive || !ctx) return;
    const t = ((now - t0) / 1000) * (slow ? 0.35 : 1);
    const a = (t / period) * Math.PI * 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const behind = Math.sin(a) < 0; // the satellite passes behind the sphere on the far half of its lap
    const trail = (front: boolean) => {
      // the lit arc behind the satellite, fading out over a third of a lap
      for (let i = 0; i < 18; i++) {
        const aa = a - (i / 18) * 2.1;
        if (Math.sin(aa) >= 0 !== front) continue;
        const [x1, y1] = at(aa),
          [x2, y2] = at(aa - 0.12);
        ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - i / 18) * 0.9})`;
        ctx.lineWidth = Math.max(1, size * 0.045);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };
    // the faint orbit
    ctx.strokeStyle = dark ? "rgba(255,255,255,.16)" : "rgba(11,11,11,.12)";
    ctx.lineWidth = Math.max(0.75, size * 0.025);
    ctx.beginPath();
    ctx.ellipse(c, c, ox, oy, tilt, 0, Math.PI * 2);
    ctx.stroke();
    trail(false);
    const sat = () => {
      const [x, y] = at(a);
      ctx.fillStyle = dark ? "#fff" : "#0b0b0b";
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.2, size * 0.07), 0, Math.PI * 2);
      ctx.fill();
    };
    if (behind) sat();
    // the sphere, breathing very slightly
    const br = R * (1 + Math.sin(t * 2.4) * 0.05);
    const grad = ctx.createRadialGradient(c - br * 0.35, c - br * 0.4, br * 0.1, c, c, br);
    grad.addColorStop(0, "#ffd88a");
    grad.addColorStop(0.55, `rgb(${r},${g},${b})`);
    grad.addColorStop(1, "#b5760b");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, c, br, 0, Math.PI * 2);
    ctx.fill();
    trail(true);
    if (!behind) sat();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => {
    alive = false;
    cancelAnimationFrame(raf);
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
      const c = document.createElement("canvas");
      go.replaceChildren(c);
      button._stop = orb(c, { size: 20, dark: true });
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

/* ---------- the first visit's opening: the wordmark and the line, only while the first picture is not ready ---------- */
// Skipped when the picture arrives within 250 ms, on later visits in the same session, and with reduced
// motion. Never longer than 1.2 s: the page is the point, not the loader.
export function opening(src: string, word: string) {
  let seen = false;
  try {
    seen = sessionStorage.getItem("k-open") === "1";
    sessionStorage.setItem("k-open", "1");
  } catch {
    /* private windows: show it, nothing is remembered */
  }
  if (seen || reduced() || !src) return;
  const img = new Image();
  img.src = src;
  let el: HTMLDivElement | null = null;
  const t = setTimeout(() => {
    el = document.createElement("div");
    el.className = "k-open";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<span class="w">${esc(word)}</span><span class="ln"></span>`;
    host().append(el);
    const shown = el;
    requestAnimationFrame(() => shown.classList.add("on"));
  }, 250);
  const end = () => {
    clearTimeout(t);
    if (!el) return;
    const shown = el;
    el = null;
    shown.classList.add("out");
    setTimeout(() => shown.remove(), 500);
  };
  img.decode().then(end, end);
  setTimeout(end, 1200);
}
