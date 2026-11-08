// Karman opening intro. Self-contained: startIntro(markId, targetSelector, options) paints an overlay
// in the ground colour over a page that is already in the DOM, forms the mark in about 0.6 s
// (assembled parts, transform and opacity only, Web Animations API), holds 0.3 s, then flies and
// shrinks it into the header's mark slot while the page fades in beneath. Total under 1.2 s.
// Runs once per session (sessionStorage "karman-intro"). Under prefers-reduced-motion it is a
// 0.3 s fade with no travel. A tap, key, wheel, touch or scroll skips it. Never delays first paint:
// the overlay is added after the page exists.
//
// options: { container: element the overlay fills (default document.body, fixed to the viewport),
//            page: element to fade in beneath (default the container's [data-page] or nothing),
//            force: run even if the session already saw it (the Replay button),
//            size: mark size in px while it forms (default from the container width),
//            reducedMotion: true/false to override the media query (the gallery switch),
//            ground: CSS colour for the overlay (default var(--paper)) }
// returns a Promise of { ran, reason, reduced, durationMs, landing: {dx, dy, dw, dh} }.

import { mark, MARKS } from "./marks.js";

export const SESSION_KEY = "karman-intro";
const FORM = 600, HOLD = 300, TRAVEL = 250, REDUCED_FADE = 300;
const EASE_OUT = "cubic-bezier(.2,.7,.2,1)";
const EASE_IN_OUT = "cubic-bezier(.6,0,.2,1)";

// How each mark forms, part by part: keyframes of transform and opacity only.
const CHOREO = {
  ascent: [
    { part: "rise", frames: [{ transform: "scale(0)", opacity: 1 }, { transform: "scale(1)" }], at: 0, dur: 380 },
    { part: "level", frames: [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], at: 330, dur: 270 },
  ],
  threshold: [
    { part: "ground", frames: [{ transform: "translateY(16px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], at: 0, dur: 420 },
    { part: "cap", frames: [{ transform: "translateY(-16px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], at: 180, dur: 420 },
  ],
  answer: [
    { part: "ring", frames: [{ transform: "scale(.7)", opacity: 0 }, { transform: "scale(1)", opacity: 1, offset: .45 }, { transform: "scale(1)", opacity: 1, offset: .7 }, { transform: "scale(1)", opacity: 0 }], at: 0, dur: 600 },
    { part: "fill", frames: [{ transform: "scale(.55)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], at: 300, dur: 300 },
  ],
  fullstop: [
    { part: "k", frames: [{ transform: "translateY(10px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], at: 0, dur: 360 },
    { part: "dot", frames: [{ transform: "scale(0)" }, { transform: "scale(1.18)", offset: .7 }, { transform: "scale(1)" }], at: 360, dur: 240 },
  ],
};

export function sessionSeen() {
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}
export function markSessionSeen() {
  try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* private mode: the intro simply runs again */ }
}

export function startIntro(markId, targetSelector, options = {}) {
  const t0 = performance.now();
  const m = MARKS[markId];
  if (!m) return Promise.resolve({ ran: false, reason: "unknown mark" });
  if (!options.force && sessionSeen()) return Promise.resolve({ ran: false, reason: "seen this session" });
  if (!document.body) return Promise.resolve({ ran: false, reason: "no body" });
  markSessionSeen();

  const container = options.container || document.body;
  const fixed = container === document.body;
  const page = options.page || container.querySelector?.("[data-page]") || null;
  const reduced = options.reducedMotion ?? matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = fixed ? document.documentElement : container;
  const target = root.querySelector(targetSelector) || document.querySelector(targetSelector);
  const lockup = target?.closest?.(".k-lockup") || target;
  const cw = fixed ? innerWidth : container.clientWidth;
  const size = options.size || Math.round(Math.max(64, Math.min(cw * 0.22, 128)));

  // The overlay: a ground, then the forming mark centred in it.
  const ov = document.createElement("div");
  ov.className = "k-intro";
  ov.setAttribute("aria-hidden", "true");
  ov.style.cssText = `position:${fixed ? "fixed" : "absolute"};inset:0;z-index:50;display:grid;place-items:center;pointer-events:none;overflow:hidden;color:var(--ink)`;
  const ground = document.createElement("div");
  ground.className = "k-intro-ground";
  ground.style.cssText = `position:absolute;inset:0;background:${options.ground || "var(--paper)"}`;
  const fly = document.createElement("div");
  fly.className = "k-intro-mark";
  fly.style.cssText = `position:relative;width:${size}px;height:${size}px;transform-origin:50% 50%;will-change:transform`;
  fly.innerHTML = mark(markId, { size });
  ov.append(ground, fly);
  if (!fixed && getComputedStyle(container).position === "static") container.style.position = "relative";
  if (lockup) lockup.setAttribute("data-intro-wait", "");
  container.appendChild(ov);

  const anims = [];
  let done = false;
  let landing = null;

  const finish = (resolve) => {
    if (done) return;
    done = true;
    anims.forEach((a) => { try { a.finish(); } catch { /* already finished */ } });
    // Where did the flying mark end against the header slot?
    if (target) {
      const a = fly.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      landing = { dx: +(a.left - b.left).toFixed(2), dy: +(a.top - b.top).toFixed(2), dw: +(a.width - b.width).toFixed(2), dh: +(a.height - b.height).toFixed(2) };
    }
    if (lockup) lockup.removeAttribute("data-intro-wait");
    if (page) page.style.opacity = "";
    ov.remove();
    removeSkip();
    resolve({ ran: true, reduced, durationMs: Math.round(performance.now() - t0), landing });
  };

  let removeSkip = () => {};

  return new Promise((resolve) => {
    const skip = () => finish(resolve);
    const evs = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"];
    const scope = fixed ? window : container;
    evs.forEach((e) => scope.addEventListener(e, skip, { passive: true, once: true }));
    removeSkip = () => evs.forEach((e) => scope.removeEventListener(e, skip));

    if (reduced) {
      // A 0.3 s fade, no forming, no travel: the finished mark is simply there, then the page is.
      if (page) page.style.opacity = "0";
      const fade = ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: REDUCED_FADE, easing: "linear", fill: "forwards" });
      anims.push(fade);
      if (page) anims.push(page.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_FADE, easing: "linear", fill: "forwards" }));
      fade.onfinish = () => finish(resolve);
      return;
    }

    if (page) page.style.opacity = "0";

    // 1. Form (0 to 600 ms).
    for (const step of CHOREO[markId] || []) {
      const el = fly.querySelector(`[data-part="${step.part}"]`);
      if (!el) continue;
      const first = step.frames[0];
      // Hold the part at its first frame until its cue, so nothing pops in before it forms.
      if (first.opacity === 0 || /scale\(0\)|scaleX\(0\)/.test(first.transform || "")) {
        el.style.opacity = first.opacity ?? 1;
        el.style.transform = first.transform || "";
      }
      const a = el.animate(step.frames, { duration: step.dur, delay: step.at, easing: EASE_OUT, fill: "both" });
      anims.push(a);
    }

    // 2. Hold (600 to 900 ms), then 3. travel (900 to 1150 ms).
    const travelAt = FORM + HOLD;
    let tf = { transform: "translate(0,0) scale(1)" };
    if (target) {
      const c = fly.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const s = b.height / c.height;
      const dx = b.left + b.width / 2 - (c.left + c.width / 2);
      const dy = b.top + b.height / 2 - (c.top + c.height / 2);
      tf = { transform: `translate(${dx}px,${dy}px) scale(${s})` };
    }
    const flight = fly.animate([{ transform: "translate(0,0) scale(1)" }, tf], { duration: TRAVEL, delay: travelAt, easing: EASE_IN_OUT, fill: "forwards" });
    anims.push(flight);
    anims.push(ground.animate([{ opacity: 1 }, { opacity: 0 }], { duration: TRAVEL, delay: travelAt, easing: "linear", fill: "forwards" }));
    if (page) anims.push(page.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TRAVEL, delay: travelAt, easing: "linear", fill: "forwards" }));
    flight.onfinish = () => finish(resolve);
    // Failsafe: if an animation never fires onfinish (hidden tab), end on the clock.
    setTimeout(() => finish(resolve), travelAt + TRAVEL + 100);
  });
}
