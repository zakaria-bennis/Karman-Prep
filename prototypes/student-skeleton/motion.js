/*
 * One motion system for the whole prototype (docs/design/student-portal-laws.md).
 * Everything moves on damped springs, never on a straight line. Press feedback
 * lands on pointer-down, every spring retargets from where the element is now,
 * and only transform and opacity animate. Reduced motion swaps it all for short
 * cross-fades.
 */
const M = (() => {
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => mq.matches;

  /* A spring as Apple describes it: damping ratio and response in seconds. */
  function sample(damping, response) {
    const k = (2 * Math.PI / response) ** 2, c = 2 * damping * Math.sqrt(k);
    let x = 0, v = 0, t = 0, settle = 0;
    const dt = 1 / 240, pts = [];
    while (t < 3) {
      v += (k * (1 - x) - c * v) * dt;
      x += v * dt;
      t += dt;
      pts.push(x);
      if (Math.abs(1 - x) > 0.002 || Math.abs(v) > 0.02) settle = t;
    }
    const n = 48, used = Math.ceil(settle * 240), out = [];
    for (let i = 0; i <= n; i++) out.push(pts[Math.min(used - 1, Math.floor((i / n) * (used - 1)))].toFixed(4));
    out[n] = "1";
    return { easing: `linear(${out.join(",")})`, ms: Math.round(settle * 1000) };
  }
  const S = {
    bounce: sample(0.55, 0.42), // releases and rewards: bubbly
    pop: sample(0.72, 0.42), // things arriving
    soft: sample(1, 0.42), // large surfaces: no overshoot
  };
  const root = document.documentElement.style;
  root.setProperty("--bounce", S.bounce.easing);
  root.setProperty("--bounce-ms", `${S.bounce.ms}ms`);
  root.setProperty("--pop", S.pop.easing);

  /* Interruptible value spring: retargeting keeps position and velocity. */
  function spring(from, to, { damping = 1, response = 0.4, velocity = 0, onUpdate, onDone }) {
    if (reduced()) { onUpdate(to); if (onDone) onDone(); return { stop() { return { x: to, v: 0 }; } }; }
    const k = (2 * Math.PI / response) ** 2, c = 2 * damping * Math.sqrt(k);
    let x = from, v = velocity, last = performance.now(), id = 0, live = true;
    const step = (now) => {
      if (!live) return;
      let left = Math.min(0.05, (now - last) / 1000);
      last = now;
      while (left > 0) {
        const dt = Math.min(left, 1 / 240);
        v += (k * (to - x) - c * v) * dt;
        x += v * dt;
        left -= dt;
      }
      if (Math.abs(to - x) < 0.001 * Math.max(1, Math.abs(to)) && Math.abs(v) < 0.01 * Math.max(1, Math.abs(to))) {
        live = false; onUpdate(to); if (onDone) onDone(); return;
      }
      onUpdate(x);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return { stop() { live = false; cancelAnimationFrame(id); return { x, v }; } };
  }

  const anim = (el, frames, curve, opts = {}) => {
    if (!el || !el.animate) return null;
    if (reduced()) return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 0, fill: "backwards" });
    return el.animate(frames, { duration: curve.ms, easing: curve.easing, fill: "backwards", ...opts });
  };

  /* Press: instant on pointer-down, springs back on release. */
  const TAP = ".cta,.row[href],.row[data-open],.skill,.tool,.ans,.chip,.nav a,.strip a,.link,.btn,.slot,.dayc,.me-top";
  let lastPress = null;
  document.addEventListener("pointerdown", (e) => {
    const t = e.target.closest(TAP);
    if (!t || t.disabled) return;
    t.classList.add("pressed");
    lastPress = { x: e.clientX, y: e.clientY };
    const up = () => { t.classList.remove("pressed"); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
    addEventListener("pointerup", up);
    addEventListener("pointercancel", up);
  });
  document.addEventListener("pointerdown", (e) => { const f = e.target.closest(".fox"); if (f) squish(f); });

  function pop(el) { return anim(el, [{ transform: "scale(.82)" }, { transform: "scale(1)" }], S.bounce); }
  function squish(el) {
    return anim(el, [{ transform: "scale(1.16,.82)" }, { transform: "scale(.94,1.08)", offset: 0.35 }, { transform: "scale(1)" }], { easing: "cubic-bezier(.2,.8,.2,1)", ms: 520 });
  }
  function shake(el) {
    if (reduced() || !el) return;
    el.animate([0, -9, 8, -6, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })), { duration: 420, easing: "cubic-bezier(.2,.7,.3,1)" });
  }

  /* Numbers roll to their new value from the last value seen. */
  const seen = {};
  function counts(root_) {
    root_.querySelectorAll("[data-count]").forEach((el) => {
      const key = el.dataset.count, to = +el.dataset.to, prev = seen[key];
      seen[key] = to;
      const from = prev === undefined ? (el.dataset.from ? +el.dataset.from : to) : prev;
      if (from === to || reduced()) { el.textContent = String(to); return; }
      el.textContent = String(from);
      spring(from, to, {
        damping: 1, response: 0.8,
        onUpdate: (x) => { if (el.isConnected) el.textContent = String(Math.round(x)); },
      });
      anim(el, [{ transform: "scale(1.14)" }, { transform: "scale(1)" }], S.bounce, { delay: 120 });
    });
  }

  function meters(root_) {
    root_.querySelectorAll(".meter i").forEach((el, i) => anim(el, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], S.pop, { delay: 160 + i * 45 }));
    root_.querySelectorAll(".day.done i").forEach((el, i) => anim(el, [{ transform: "scale(0)" }, { transform: "scale(1)" }], S.bounce, { delay: 140 + i * 40 }));
    root_.querySelectorAll(".segs i.ok,.segs i.no").forEach((el, i) => anim(el, [{ transform: "scaleY(.2)" }, { transform: "scaleY(1)" }], S.bounce, { delay: 100 + i * 25 }));
  }

  /* Screens: new blocks rise in a loose stagger; tabs slide along their order. */
  function enter(view, { dir = 0, grow = false } = {}) {
    const blocks = view.querySelectorAll(".card,.q>*,[data-rise],:scope>.top,:scope>.strip");
    if (grow && lastPress && !reduced()) {
      view.style.transformOrigin = `${lastPress.x}px ${lastPress.y + scrollY}px`;
      view.animate([{ transform: "scale(.9)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: S.pop.ms, easing: S.pop.easing });
    }
    blocks.forEach((el, i) => {
      const delay = Math.min(i, 8) ** 0.8 * 42;
      anim(el, [{ opacity: 0, transform: `translate(${dir * 30}px,${dir ? 8 : 20}px) scale(.975)` }, { opacity: 1, transform: "none" }], S.pop, { delay });
    });
    view.querySelectorAll(".hero .fox").forEach((f) => anim(f, [{ transform: "scale(.4) rotate(-14deg)" }, { transform: "none" }], S.bounce, { delay: 170 }));
    meters(view);
    counts(view);
    if (window.styleEnter) window.styleEnter(view);
  }
  let exiting = null;
  function exit(view, dir, shrink) {
    if (exiting) exiting.cancel();
    if (reduced()) return Promise.resolve();
    exiting = view.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: shrink ? "scale(.95)" : `translateX(${dir * -18}px)` }],
      { duration: 110, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }
    );
    const a = exiting;
    return a.finished.then(() => { if (exiting === a) exiting = null; }, () => {}).then(() => a);
  }

  /* The approved "burst into blocks": pieces fly on an arc, then the prize arrives. */
  function burst(el) {
    if (reduced() || !el) return Promise.resolve();
    const r = el.getBoundingClientRect(), colors = ["#c4473b", "#dd5a4c", "#f5c84f", "#dba63c"];
    const all = Array.from({ length: 16 }, (_, i) => {
      const b = document.createElement("i");
      b.className = "block";
      b.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${colors[i % 4]}`;
      document.body.append(b);
      const ang = (i / 16) * Math.PI * 2 + Math.random() * 0.4, d = 70 + Math.random() * 90;
      const x = Math.cos(ang) * d, y = Math.sin(ang) * d;
      return b.animate(
        [{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: `translate(calc(-50% + ${x * 0.8}px),calc(-50% + ${y * 0.8 - 26}px)) rotate(${i * 40}deg) scale(1)`, opacity: 1, offset: 0.5 }, { transform: `translate(calc(-50% + ${x}px),calc(-50% + ${y + 60}px)) rotate(${i * 80}deg) scale(.4)`, opacity: 0 }],
        { duration: 620 + Math.random() * 160, easing: "cubic-bezier(.15,.7,.4,1)" }
      ).finished.then(() => b.remove());
    });
    el.animate([{ transform: "scale(1)" }, { transform: "scale(1.2,.8)", offset: 0.5 }, { transform: "scale(.2)", opacity: 0 }], { duration: 240, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
    return new Promise((res) => setTimeout(res, 230)).then(() => { Promise.all(all); });
  }

  /* Sheet: follows the finger on phone, retargets from wherever it is. */
  const scrim = document.createElement("div"), sheet = document.createElement("div");
  scrim.className = "scrim";
  sheet.className = "sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.tabIndex = -1;
  document.body.append(scrim, sheet);
  let p = 0, pv = 0, run = null, isOpen = false, returnTo = null, bindFn = null, onClose = null;
  const phone = () => innerWidth < 768;
  function paint() {
    scrim.style.opacity = Math.min(1, Math.max(0, p));
    if (reduced()) { sheet.style.opacity = p; sheet.style.transform = phone() ? "none" : "translate(-50%,-50%)"; return; }
    if (phone()) {
      sheet.style.opacity = 1;
      sheet.style.transform = `translateY(${(1 - p) * sheet.offsetHeight}px)`;
    } else {
      sheet.style.opacity = Math.min(1, Math.max(0, p * 1.6));
      sheet.style.transform = `translate(-50%,calc(-50% + ${(1 - p) * 34}px)) scale(${0.9 + 0.1 * p})`;
    }
  }
  function go(target, velocity = 0, done) {
    if (run) { const s = run.stop(); p = s.x; pv = s.v; }
    run = spring(p, target, {
      damping: target ? 0.78 : 1, response: target ? 0.42 : 0.3, velocity: velocity || pv,
      onUpdate: (x) => { p = x; paint(); },
      onDone: () => { pv = 0; if (done) done(); },
    });
  }
  function setSheet(html, label, bind) {
    const keep = sheet.scrollTop;
    if (bind) bindFn = bind;
    sheet.innerHTML = `<div class="grab" aria-hidden="true"><i></i></div><div class="sheet-body">${html}</div>`;
    if (label) sheet.setAttribute("aria-label", label);
    sheet.scrollTop = keep;
    if (bindFn) bindFn(sheet);
  }
  function open(html, { label = "Details", bind, closed } = {}) {
    bindFn = bind; onClose = closed;
    clearTimeout(toastT); toastEl.classList.remove("on");
    returnTo = document.activeElement;
    setSheet(html, label);
    sheet.scrollTop = 0;
    scrim.classList.add("on"); sheet.classList.add("on");
    document.getElementById("app").inert = true;
    document.querySelector(".review").inert = true;
    isOpen = true;
    paint();
    sheet.focus({ preventScroll: true });
    sheet.querySelectorAll(".sheet-body>*").forEach((el, i) => anim(el, [{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], S.pop, { delay: 50 + i * 28 }));
    go(1);
  }
  function close(after) {
    if (!isOpen) { if (after) after(); return; }
    isOpen = false;
    document.getElementById("app").inert = false;
    document.querySelector(".review").inert = false;
    go(0, 0, () => {
      if (isOpen) return;
      scrim.classList.remove("on"); sheet.classList.remove("on");
      sheet.innerHTML = "";
      if (onClose) onClose();
    });
    if (returnTo && returnTo.isConnected) returnTo.focus({ preventScroll: true });
    if (after) after();
  }
  scrim.addEventListener("click", () => close());
  addEventListener("keydown", (e) => {
    if (!isOpen) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      const f = [...sheet.querySelectorAll("a,button,select,textarea,input")].filter((x) => !x.disabled);
      if (!f.length) return;
      const a = document.activeElement;
      if (e.shiftKey && (a === f[0] || a === sheet)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  /* Drag down from the handle: 1:1, rubber-band upward, flick by projection. */
  let drag = null;
  sheet.addEventListener("pointerdown", (e) => {
    if (!phone() || !e.target.closest(".grab") || reduced()) return;
    if (run) { const s = run.stop(); p = s.x; }
    sheet.setPointerCapture(e.pointerId);
    drag = { y: e.clientY, p, last: e.clientY, t: performance.now(), v: 0 };
  });
  sheet.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const h = sheet.offsetHeight, dy = e.clientY - drag.y, now = performance.now();
    drag.v = ((e.clientY - drag.last) / Math.max(1, now - drag.t)) * 1000;
    drag.last = e.clientY; drag.t = now;
    const over = Math.max(0, -dy);
    const y = dy >= 0 ? dy : -(over * 40) / (40 + over);
    p = drag.p - y / h;
    paint();
  });
  const release = () => {
    if (!drag) return;
    const h = sheet.offsetHeight, proj = ((drag.v / 1000) * 0.99) / 0.01;
    const moved = (1 - p) * h + proj, v = -drag.v / h;
    drag = null;
    if (moved > h * 0.45) { pv = v; close(); } else go(1, v);
  };
  sheet.addEventListener("pointerup", release);
  sheet.addEventListener("pointercancel", release);

  /* Toast */
  const toastEl = document.createElement("div");
  toastEl.className = "toast";
  toastEl.setAttribute("role", "status");
  document.body.append(toastEl);
  let toastT = 0;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("on");
    anim(toastEl, [{ opacity: 0, transform: "translate(-50%,24px) scale(.9)" }, { opacity: 1, transform: "translate(-50%,0) scale(1)" }], S.bounce);
    clearTimeout(toastT);
    toastT = setTimeout(() => {
      const a = reduced() ? null : toastEl.animate([{ opacity: 1, transform: "translate(-50%,0)" }, { opacity: 0, transform: "translate(-50%,16px)" }], { duration: 180, easing: "ease-in" });
      if (a) a.finished.then(() => toastEl.classList.remove("on"), () => {}); else toastEl.classList.remove("on");
    }, 3200);
  }

  /* The fox blinks now and then. */
  (function blink() {
    setTimeout(() => {
      const f = document.querySelector("#view .hero .fox");
      if (f && !reduced() && !document.hidden) {
        const eN = f.querySelectorAll(".m-eN"), eH = f.querySelectorAll(".m-eH");
        eN.forEach((e) => (e.style.opacity = 0)); eH.forEach((e) => (e.style.opacity = 1));
        setTimeout(() => { eN.forEach((e) => (e.style.opacity = "")); eH.forEach((e) => (e.style.opacity = "")); }, 130);
      }
      blink();
    }, 3500 + Math.random() * 4000);
  })();

  return { S, spring, anim, pop, squish, shake, counts, meters, enter, exit, burst, open, close, setSheet, toast, reduced, get isOpen() { return isOpen; } };
})();
