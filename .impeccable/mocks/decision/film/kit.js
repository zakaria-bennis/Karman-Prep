/* Karman's own loading and feedback kit (2026-10-25). No libraries: every shape here is drawn by this file.

   Which loader for which wait (the rules every page follows):
     under 400 ms .......... nothing. A loader that flashes on and off reads as a glitch (Doherty threshold).
     one tap, a short wait . the orb, 20 px, inside the button that was pressed, from 400 ms. The button keeps
                             its words and stays where it is, so the eye never loses its place.
     a section's content ... a skeleton shaped like what is coming, from 300 ms, held at least 500 ms once
                             shown so it never flickers. The sheen sweeps left to right (reading direction),
                             slowly: a slow sweep reads as calm, a fast pulse reads as strain.
     a page or a big file .. the line: a thin marigold bar at the very top. It jumps to 12% at once (people
                             wait more patiently for something already under way), runs quickly through the
                             first half, slows but never stops, and finishes fast: the end of a wait is the
                             part people remember (peak-end), and an ending that accelerates feels shorter
                             than the same wait at an even pace. Its ribbing drifts backward, which makes the
                             bar itself read as faster.
     the film is late ...... the large orb over the film, from 400 ms, with one line of words after 2.5 s.
     done .................. a message that says what happened, with a check that draws itself. Errors sit
                             next to their field and say what happened, why and what to do.
   With reduced motion: no sheen, no drift; the orb turns slowly instead of stopping (a loader that never
   moves says nothing). */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
    );
  const MARIGOLD = [235, 162, 31];

  /* ---------- the orb: a marigold sphere with one satellite on a tilted orbit, like the line 100 km up ---------- */
  function orb(canvas, { size = 20, dark = false, state = "working" } = {}) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(size * dpr);
    canvas.style.width = canvas.style.height = `${size}px`;
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    const [r, g, b] = MARIGOLD;
    const c = size / 2;
    const R = size * 0.2; // the sphere
    const ox = size * 0.42,
      oy = size * 0.15; // the orbit, an ellipse seen at an angle
    const tilt = -0.42;
    const period = state === "waiting" ? 2.6 : 1.35; // seconds per lap
    let raf = 0,
      alive = true;
    const t0 = performance.now();
    const at = (a) => {
      const x = Math.cos(a) * ox,
        y = Math.sin(a) * oy;
      return [
        c + x * Math.cos(tilt) - y * Math.sin(tilt),
        c + x * Math.sin(tilt) + y * Math.cos(tilt),
      ];
    };
    function frame(now) {
      if (!alive) return;
      const t = ((now - t0) / 1000) * (reduce.matches ? 0.35 : 1);
      const a = (t / period) * Math.PI * 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const behind = Math.sin(a) < 0; // the satellite passes behind the sphere on the far half of its lap
      const trail = (front) => {
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
  const line = (() => {
    let el,
      showT = 0,
      raf = 0,
      p = 0,
      shown = false,
      startAt = 0,
      expect = 900;
    const build = () => {
      if (el) return el;
      el = document.createElement("div");
      el.className = "k-line";
      el.setAttribute("role", "progressbar");
      el.setAttribute("aria-label", "Loading");
      el.setAttribute("aria-valuemin", "0");
      el.setAttribute("aria-valuemax", "100");
      el.innerHTML = '<span class="k-fill"></span>';
      document.body.append(el);
      return el;
    };
    const paint = () => {
      el.style.setProperty("--p", p.toFixed(4));
      el.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    };
    // where the bar should be after `ms`, for a wait expected to take `expect` ms:
    // 12% at once, fast through the first half, then slower and slower, but always moving, never past 94%
    const curve = (ms) => {
      const x = ms / expect;
      const main = 0.12 + 0.7 * (1 - Math.exp(-2.4 * x)); // reaches ~0.76 at the expected time
      const creep = Math.max(0, x - 1) * 0.04; // past the expected time: a slow, visible creep
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
          build();
          shown = true;
          p = 0.12;
          el.classList.remove("done");
          el.classList.add("on");
          paint();
          raf = requestAnimationFrame(tick);
        }, 400);
      },
      done() {
        clearTimeout(showT);
        cancelAnimationFrame(raf);
        if (!shown) return;
        shown = false;
        // the fast finish: 100% in 180 ms, a 120 ms hold so the eye registers "done", then away
        el.classList.add("done");
        p = 1;
        paint();
        setTimeout(() => el.classList.remove("on"), 300);
      },
    };
  })();

  /* ---------- skeletons: shaped like the content, from 300 ms, held at least 500 ms once shown ---------- */
  // wait(host, promise, shape): shows `shape` (HTML from SK) in host if the promise is slow, removes it when done.
  function wait(host, promise, shape) {
    let shownAt = 0;
    const holder = document.createElement("div");
    holder.className = "k-sk-wrap";
    holder.setAttribute("aria-hidden", "true");
    holder.innerHTML = shape;
    const t = setTimeout(() => {
      shownAt = performance.now();
      host.classList.add("k-waiting");
      host.append(holder);
    }, 300);
    host.setAttribute("aria-busy", "true");
    return Promise.resolve(promise).finally(() => {
      clearTimeout(t);
      const left = shownAt ? Math.max(0, 500 - (performance.now() - shownAt)) : 0;
      return new Promise((res) =>
        setTimeout(() => {
          holder.classList.add("out");
          host.classList.remove("k-waiting");
          host.removeAttribute("aria-busy");
          setTimeout(
            () => {
              holder.remove();
              res();
            },
            shownAt ? 260 : 0
          );
        }, left)
      );
    });
  }
  const bar = (w, h = 12, cls = "") =>
    `<i class="k-sk ${cls}" style="width:${w};height:${h}px"></i>`;
  const SK = {
    lines: (n = 3) =>
      `<div class="k-sk-lines">${Array.from({ length: n }, (_, i) => bar(i === n - 1 ? "62%" : "100%", 14)).join("")}</div>`,
    card: () =>
      `<div class="k-sk-card">${bar("40%", 18)}${bar("70%", 44, "big")}${bar("100%")}${bar("86%")}${bar("92%")}${bar("54%", 50, "pill")}</div>`,
    screen: () =>
      `<div class="k-sk-screen">${bar("34%", 14)}${bar("100%", 70, "block")}<div class="k-sk-row">${bar("48%", 56, "block")}${bar("48%", 56, "block")}</div>${bar("100%", 12)}${bar("80%", 12)}</div>`,
    map: () => `<div class="k-sk-map"><i class="k-sk blob"></i></div>`,
  };

  /* ---------- icons: one set, 24 px grid, 1.75 stroke, round ends ---------- */
  const P = {
    check: '<path d="M5 12.5 10 17.5 19 7"/>',
    alert: '<path d="M12 4 21 19.5H3Z"/><path d="M12 10v4.5"/><path d="M12 17.4v.1"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.6v.1"/>',
    class:
      '<rect x="3" y="4.5" width="18" height="12" rx="2.5"/><circle cx="9" cy="10" r="2"/><circle cx="15" cy="10" r="2"/><path d="M8 20.5h8"/>',
    review:
      '<path d="M6 3.5h8.5L19 8v12.5H6Z"/><path d="M14 3.5V8h5"/><circle cx="11.5" cy="13.5" r="2.6"/><path d="m13.4 15.4 2.4 2.4"/>',
    ten: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 9.5 10 8.5v7"/><rect x="12.6" y="8.5" width="3.6" height="7" rx="1.8"/>',
    parent: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6"/>',
    chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5Z"/>',
    date: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="15.5" cy="15" r="2.4"/>',
    hours: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4.2l2.6 1.6M9.5 3h5"/>',
    shield:
      '<path d="M12 3.5 19 6v5.5c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.6-7-9V6Z"/><path d="m8.8 12.2 2.2 2.2 4.2-4.6"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
    line: '<path d="M2.5 17c4-3.4 15-3.4 19 0"/><path d="M3 11.5h18" stroke-dasharray="1.2 2.6"/><circle cx="16" cy="11.5" r="1.6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
  };
  const icon = (name, cls = "") =>
    `<svg class="k-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${P[name] || ""}</svg>`;

  /* ---------- messages ---------- */
  // toast(title, text, kind): one message at a time, bottom centre on phones (thumb reach), top right on desktop.
  // It stays 5 s plus 60 ms per character (time to read it twice), longer while hovered or focused.
  let toastEl = null,
    toastT = 0;
  function toast(title, text = "", kind = "done") {
    toastEl?.remove();
    clearTimeout(toastT);
    const el = document.createElement("div");
    el.className = `k-toast ${kind}`;
    el.setAttribute("role", kind === "error" ? "alert" : "status");
    el.innerHTML = `<span class="k-badge">${icon(kind === "error" ? "alert" : "check", "draw")}</span><div><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ""}</div><button type="button" class="k-x" aria-label="Close message">${icon("plus")}</button>`;
    document.body.append(el);
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
    el.querySelector(".k-x").addEventListener("click", shut);
    arm();
    return shut;
  }
  // a field's own message, tied to it for screen readers
  function fieldMsg(input, text) {
    const id = `${input.id}-msg`;
    let m = document.getElementById(id);
    if (!text) {
      m?.remove();
      input.removeAttribute("aria-invalid");
      const help = input.dataset.help;
      help
        ? input.setAttribute("aria-describedby", help)
        : input.removeAttribute("aria-describedby");
      return;
    }
    if (!m) {
      m = document.createElement("p");
      m.id = id;
      m.className = "k-fieldmsg";
      input.closest(".k-field")?.append(m);
    }
    m.innerHTML = `${icon("alert")}<span>${esc(text)}</span>`;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", [input.dataset.help, id].filter(Boolean).join(" "));
  }

  /* ---------- busy buttons: words stay, the orb takes the arrow's place after 400 ms ---------- */
  function busy(button, on, label) {
    const go = button.querySelector(".go");
    if (on) {
      button.setAttribute("aria-busy", "true");
      button._label = button.querySelector(".lb")?.textContent;
      if (label && button.querySelector(".lb")) button.querySelector(".lb").textContent = label;
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
      if (button._label && button.querySelector(".lb"))
        button.querySelector(".lb").textContent = button._label;
      button.removeAttribute("aria-busy");
    }
  }

  /* ---------- the first visit's opening: the wordmark and the line, only while the first picture is not ready ---------- */
  // Skipped entirely when the picture arrives within 250 ms, on later visits in the same session, and with
  // reduced motion. Never longer than 1.2 s: the page is the point, not the loader.
  function opening(src, word = "Karman") {
    let seen = false;
    try {
      seen = sessionStorage.getItem("k-open") === "1";
      sessionStorage.setItem("k-open", "1");
    } catch (e) {}
    if (seen || reduce.matches || !src) return;
    const img = new Image();
    img.src = src;
    let el = null;
    const t = setTimeout(() => {
      el = document.createElement("div");
      el.className = "k-open";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = `<span class="w">${esc(word)}</span><span class="ln"></span>`;
      document.body.append(el);
      requestAnimationFrame(() => el.classList.add("on"));
    }, 250);
    const end = () => {
      clearTimeout(t);
      if (!el) return;
      el.classList.add("out");
      setTimeout(() => el.remove(), 500);
    };
    img.decode().then(end, end);
    setTimeout(end, 1200);
  }

  window.KIT = { orb, line, wait, SK, icon, toast, fieldMsg, busy, opening };
  window.karmanOrb = orb; // the name the film already uses
})();
