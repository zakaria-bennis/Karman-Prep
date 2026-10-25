/* Karman landing page (2026-10-25).
   One continuous film plays behind the whole page in real time; the page scrolls normally over it. White panels
   carry the reading and leave "windows" where the film keeps running. Nothing is tied to the scroll position.
   Markup in index.html, styles in film.css, every word in copy.js (edited with edit.html). */
(function () {
  const ROUTES = {
    test: "/free-practice-test",
    program: "/program",
    private: "/private-tutoring",
    pricing: "/pricing",
    cookies: "/cookies",
    signIn: "/auth/sign-in",
    guarantee: "/guarantee",
    faq: "/faq",
    about: "/about",
    terms: "/terms",
    privacy: "/privacy",
  };
  // the product screen shown with each moment of the day, in the order the moments appear
  const SCREENS = [
    ["img/daily10.webp", "phone"],
    ["img/parent-update.webp", "phone"],
    ["img/word-game.webp", "phone"],
    ["img/schedule.webp", "wide"],
    ["img/review.webp", "wide"],
  ];
  // the three results clips, in the order message 6 lists the students
  const RESULTS = ["c8a", "c8b", "c8c"];

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- words: copy.js, or the copy editor's unsaved draft with ?draft=1 ---------- */
  const Q = new URLSearchParams(location.search);
  let draft = null;
  try {
    draft = Q.has("draft") ? localStorage.getItem("karman-copy-draft") : null;
  } catch (e) {}
  const msgs = [];
  const site = {};
  let m = null,
    beat = null;
  (draft ?? window.KARMAN_COPY ?? "").split("\n").forEach((line) => {
    const h2 = line.match(/^##\s+(\d+|Site)\s*(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    if (h2) {
      m = h2[1] === "Site" ? null : { n: +h2[1], name: h2[2].trim(), top: {}, beats: [] };
      if (m) msgs.push(m);
      beat = null;
      return;
    }
    if (h3 && m) {
      beat = { name: h3[1].trim(), f: {} };
      m.beats.push(beat);
      return;
    }
    const kv = line.match(/^\s*([a-z ]+):\s*(.*)$/i);
    if (!kv) return;
    const k = kv[1].trim().toLowerCase(),
      v = kv[2].trim();
    if (!m) site[k] = v;
    else (beat ? beat.f : m.top)[k] = v;
  });
  msgs.forEach((x) => {
    if (!x.beats.length) x.beats.push({ name: "", f: x.top });
  });
  const M = (n) => msgs.find((x) => x.n === n) || { beats: [{ f: {} }], top: {}, name: "" };
  const pick = (x, k) => x.top[k] ?? x.beats.map((b) => b.f[k]).find(Boolean);
  const esc = (s) =>
    (s || "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
    );

  /* ---------- site words and links ---------- */
  document.querySelectorAll("[data-t]").forEach((el) => {
    const v = site[el.dataset.t];
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-route]").forEach((a) => (a.href = ROUTES[a.dataset.route]));
  document.querySelectorAll("[data-mail]").forEach((a) => (a.href = `mailto:${site.email || ""}`));

  /* ---------- building blocks ---------- */
  const ARROW =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 4 12.5 8l-4 4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const btn = (label, href) =>
    `<a class="btn" href="${href}"><span class="lb">${esc(label)}</span><span class="go">${ARROW}</span></a>`;
  const action = (f) =>
    f.button
      ? `<div class="act">${btn(f.button, ROUTES.test)}${f["button note"] ? `<small>${esc(f["button note"])}</small>` : ""}</div>`
      : "";
  const split = (t) => {
    const [d, ...rest] = (t || "").split(" ");
    return [d, rest.join(" ")];
  };
  // the hero line, word by word, so it can rise in on arrival
  const kinetic = (s) =>
    esc(s)
      .split(" ")
      .map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`)
      .join(" ");

  /* the moments of the day: the bus, pickup, tennis, the live class, the review */
  const moments = [];
  const m1 = M(1),
    m4 = M(4);
  if (m1.beats[1]) moments.push({ id: "m-1-b", f: m1.beats[1].f, figure: "ten" });
  [2, 3].forEach((n) => moments.push({ id: `m-${n}`, f: { ...M(n).top, ...M(n).beats[0].f } }));
  m4.beats.forEach((b, k) => moments.push({ id: k ? "m-4-b" : "m-4", f: b.f }));

  function moment(x, k) {
    const f = x.f;
    const [d, ap] = split(f.time);
    const head = f.headline || f["screen title"] || "";
    const [src, kind] = SCREENS[k] || [];
    const note = f["card title"]
      ? `<p class="note"><b>${esc(f["card title"])}</b>${esc(f["card text"])}</p>`
      : "";
    const fig = x.figure
      ? `<div class="fig" data-fig="${x.figure}"><div class="hl"></div><span class="read" aria-live="polite"></span></div>`
      : "";
    return `<article class="moment rv" id="${x.id}" data-k="${k}">
      <div class="words">
        ${f.time ? `<p class="tag"><b>${esc(d)} ${esc(ap)}</b>${f.name ? ` · ${esc(f.name)}` : ""}</p>` : ""}
        ${head ? `<h3>${esc(head)}</h3>` : ""}
        ${f["feature title"] || f["feature text"] ? `<p>${f["feature title"] ? `<b>${esc(f["feature title"])}</b> ` : ""}${esc(f["feature text"])}</p>` : ""}
        ${note}${fig}
      </div>
      ${src ? `<figure class="shot ${kind}"><img src="${src}" alt="" loading="lazy" decoding="async"></figure>` : ""}
    </article>`;
  }

  /* ---------- the page ---------- */
  const main = document.getElementById("main");
  const hero = m1.beats[0].f;
  const m5 = M(5),
    night = m5.beats.find((b) => b.f.time)?.f || {},
    plan = m5.beats.find((b) => b.f["card date"] || b.f.headline)?.f || {};
  const m6 = M(6);
  const end = M(7).beats[0].f;

  main.innerHTML = `
  <section class="window hero" id="m-1">
    <div class="in">
      <h1>${kinetic(hero.headline)}</h1>
      ${hero.text ? `<p class="lede rv" style="--d:.45s">${esc(hero.text)}</p>` : ""}
      <div class="rv" style="--d:.6s">${action(hero)}</div>
      ${hero.proof ? `<p class="proof rv" style="--d:.75s">${esc(hero.proof)}</p>` : ""}
    </div>
    <span class="cue" aria-hidden="true"></span>
  </section>

  <section class="panel day" id="day" aria-labelledby="day-h">
    <div class="in">
      ${site["day eyebrow"] ? `<p class="eyebrow rv">${esc(site["day eyebrow"])}</p>` : ""}
      <h2 class="rv" id="day-h">${esc(site["day heading"] || "")}</h2>
      <div class="day-grid">
        <aside class="clock" aria-label="${esc(site["day eyebrow"] || "")}">
          <p class="t" aria-hidden="true"></p>
          <p class="ap" aria-hidden="true"></p>
          <p class="who" aria-hidden="true"></p>
          <ol class="hours">${moments
            .map((x, k) => {
              const [d, ap] = split(x.f.time);
              return `<li><button type="button" data-go="${x.id}" data-k="${k}"><span class="dot"></span><b>${esc(d)}</b> ${esc(ap)}</button></li>`;
            })
            .join("")}</ol>
        </aside>
        <div class="moments">${moments.map(moment).join("")}</div>
      </div>
    </div>
  </section>

  <section class="window statement" id="m-5">
    <div class="in">
      ${night.time ? `<p class="eyebrow rv">${esc(night.time)}${night.name ? ` · ${esc(night.name)}` : ""}</p>` : ""}
      ${plan.headline ? `<h2 class="rv">${esc(plan.headline)}</h2>` : ""}
      ${
        plan["card date"]
          ? `<div class="datecard rv" style="--d:.15s">
        ${plan["card intro"] ? `<p class="i">${esc(plan["card intro"])}</p>` : ""}
        <p class="d">${esc(plan["card date"])}</p>
        ${plan["card later"] ? `<p class="l">${esc(plan["card later"])}</p>` : ""}
        ${plan["card text"] ? `<p class="x">${esc(plan["card text"])}</p>` : ""}
        ${plan["card link"] ? `<a class="lk" href="${ROUTES.guarantee}">${esc(plan["card link"])}${ARROW}</a>` : ""}
      </div>`
          : ""
      }
    </div>
  </section>

  <section class="panel" id="m-6" aria-labelledby="m6-h">
    <div class="in">
      <p class="eyebrow rv" id="m6-h">${esc(site["results eyebrow"] || m6.name)}</p>
      <div class="results">${m6.beats
        .map((b, k) => {
          const id = RESULTS[k];
          const [who, score] = (b.f.result || "").split("·").map((s) => s.trim());
          return `<figure class="res rv" style="--d:${k * 0.12}s">
          <div class="frame">${id ? `<video muted playsinline preload="none" poster="${id}-r${reduce ? "" : "0"}.jpg" data-src="${id}-r.mp4" aria-hidden="true"></video>` : ""}</div>
          <figcaption><span class="who">${esc(who)}</span>${score ? `<span class="score">${esc(score)}</span>` : ""}<span class="sch">${esc(b.f.school)}</span></figcaption>
        </figure>`;
        })
        .join("")}</div>
      ${pick(m6, "proof") ? `<p class="label rv">${esc(pick(m6, "proof"))}</p>` : ""}
    </div>
  </section>

  <section class="window end" id="m-7">
    <div class="in">
      <h2 class="rv">${esc(end.headline)}</h2>
      ${end.text ? `<p class="lede rv" style="--d:.1s">${esc(end.text)}</p>` : ""}
      <div class="rv" style="--d:.2s">${action(end)}</div>
    </div>
    ${end["line note"] ? `<div class="kline rv" style="--d:.35s"><span class="bar" aria-hidden="true"></span><p>${esc(end["line note"])}</p></div>` : ""}
  </section>`;

  // the menu's button gets the same arrow as the page's
  document.querySelectorAll(".sheet .btn").forEach((a) => {
    a.innerHTML = `<span class="lb">${esc(a.textContent)}</span><span class="go">${ARROW}</span>`;
  });

  /* ---------- the film ---------- */
  let paused = false;
  try {
    paused = localStorage.getItem("karman-motion") === "off";
  } catch (e) {}
  const stage = document.querySelector(".stage");
  const day = stage.querySelector(".day"),
    edge = stage.querySelector(".edge");
  const tall = matchMedia("(max-width: 760px) and (orientation: portrait)").matches;
  const sfx = tall ? "-p" : "";
  day.poster = `day${sfx}.jpg`;
  edge.poster = `c9${sfx}.jpg`;
  if (!reduce) {
    day.src = `day${sfx}.mp4`;
    edge.src = `c9${sfx}.mp4`;
  }

  // the orb shows only when the film takes longer than 400 ms to arrive
  let waitT = 0;
  const waitOn = () => {
    clearTimeout(waitT);
    waitT = setTimeout(() => stage.classList.add("waiting"), 400);
  };
  const waitOff = () => {
    clearTimeout(waitT);
    stage.classList.remove("waiting");
  };
  [day, edge].forEach((v) => {
    v.addEventListener("waiting", () => v === cur() && want() && waitOn());
    v.addEventListener("playing", waitOff);
    v.addEventListener("pause", waitOff);
  });

  const seen = new Set(); // windows on screen
  let ending = false;
  const cur = () => (ending ? edge : day);
  const want = () => !reduce && !paused && !document.hidden && seen.size > 0;
  let swapT = 0;
  function sync() {
    if (reduce) return;
    const on = cur(),
      off = ending ? day : edge;
    if (want()) {
      if (on.paused) {
        if (on.readyState < 3) waitOn();
        on.play().catch(() => {});
      }
    } else {
      on.pause();
      waitOff();
    }
    // the other film keeps going through the 1.4 s crossfade, then rests
    clearTimeout(swapT);
    swapT = setTimeout(() => off.pause(), 1500);
  }
  const wio = new IntersectionObserver((es) => {
    es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
    sync();
  });
  document.querySelectorAll(".window").forEach((w) => wio.observe(w));
  document.addEventListener("visibilitychange", sync);

  // the close: the day dissolves into orbit while the last window is on screen
  const close = document.getElementById("m-7");
  new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting === ending) return;
        ending = e.isIntersecting;
        if (ending && (edge.ended || edge.currentTime === 0)) edge.currentTime = 0;
        stage.classList.toggle("ending", ending);
        sync();
      }),
    { threshold: 0.3 }
  ).observe(close);
  new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (edge.preload = "auto")), {
    rootMargin: "120% 0px",
  }).observe(close);

  /* ---------- the three results: each plays once when it comes on screen, one after another, and rests on
     its last frame (the school); coming back after it ended plays it again ---------- */
  const rvids = [...document.querySelectorAll(".res video")];
  const rio = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        const v = e.target;
        clearTimeout(v._t);
        if (e.isIntersecting && !reduce && !paused) {
          if (!v.src) v.src = v.dataset.src;
          if (v.ended) v.currentTime = 0;
          v._t = setTimeout(() => v.play().catch(() => {}), rvids.indexOf(v) * 260);
        } else v.pause();
      }),
    { threshold: 0.45 }
  );
  rvids.forEach((v) => rio.observe(v));
  new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting && !reduce) rvids.forEach((v) => !v.src && (v.src = v.dataset.src));
      }),
    { rootMargin: "80% 0px" }
  ).observe(document.getElementById("m-6"));

  /* ---------- pause / play every film (header), remembered ---------- */
  const motion = document.querySelector("[data-motion]");
  const label = () => {
    if (!motion) return;
    motion.textContent = paused ? site.play || "Play" : site.pause || "Pause";
    motion.setAttribute("aria-label", `${motion.textContent} ${site["pause words"] || "the film"}`);
    motion.setAttribute("aria-pressed", String(paused));
    motion.hidden = reduce;
  };
  label();
  motion?.addEventListener("click", () => {
    paused = !paused;
    try {
      localStorage.setItem("karman-motion", paused ? "off" : "on");
    } catch (e) {}
    sync();
    rvids.forEach((v) => {
      const r = v.getBoundingClientRect();
      if (paused) v.pause();
      else if (r.top < innerHeight && r.bottom > 0) v.play().catch(() => {});
    });
    label();
  });

  /* ---------- the clock follows the moment in the middle of the screen ---------- */
  const clock = document.querySelector(".clock");
  const tEl = clock.querySelector(".t"),
    apEl = clock.querySelector(".ap"),
    whoEl = clock.querySelector(".who");
  const hourBtns = [...clock.querySelectorAll("[data-go]")];
  const EASE = "cubic-bezier(.22,1,.36,1)";
  let now = -1;
  function setNow(k) {
    if (k === now || !moments[k]) return;
    const back = k < now;
    now = k;
    const [d, ap] = split(moments[k].f.time);
    const old = tEl.querySelector("span:not(.old)");
    const nu = document.createElement("span");
    nu.textContent = d;
    tEl.append(nu);
    if (old) {
      if (reduce) old.remove();
      else {
        old.classList.add("old");
        const dir = back ? 1 : -1;
        old.animate(
          [
            { transform: "none", opacity: 1 },
            { transform: `translateY(${dir * 55}%)`, opacity: 0 },
          ],
          { duration: 450, easing: EASE }
        ).onfinish = () => old.remove();
        nu.animate(
          [
            { transform: `translateY(${-dir * 55}%)`, opacity: 0 },
            { transform: "none", opacity: 1 },
          ],
          { duration: 650, easing: EASE }
        );
      }
    }
    apEl.textContent = ap;
    whoEl.textContent = moments[k].f.name || "";
    hourBtns.forEach((b, i) => b.toggleAttribute("aria-current", i === k));
    document.querySelectorAll(".moment").forEach((el, i) => el.classList.toggle("now", i === k));
  }
  setNow(0);
  const mio = new IntersectionObserver(
    (es) => es.forEach((e) => e.isIntersecting && setNow(+e.target.dataset.k)),
    { rootMargin: "-45% 0px -45% 0px" }
  );
  document.querySelectorAll(".moment").forEach((el) => mio.observe(el));
  hourBtns.forEach((b) =>
    b.addEventListener("click", () => {
      const t = document.getElementById(b.dataset.go);
      const y =
        t.getBoundingClientRect().top +
        scrollY -
        innerHeight * 0.5 +
        Math.min(t.offsetHeight, innerHeight * 0.6) / 2;
      scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
    })
  );

  /* ---------- the Daily 10 figure (Hairline): the tile under your finger lifts, its neighbours follow ---------- */
  window.hairline = (figure) => {
    const host = document.querySelector(`[data-fig="${figure.name}"]`);
    if (!host || !window.HL) return;
    HL.inject(document);
    const st = host.querySelector(".hl");
    st.setAttribute("data-hairline", figure.name);
    st.setAttribute("role", "img");
    st.setAttribute("aria-label", figure.means);
    const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, st);
    const out = host.querySelector(".read");
    let text = "";
    const read = {
      get textContent() {
        return text;
      },
      set textContent(v) {
        text = v == null ? "" : String(v);
        out.textContent = text === "rest" ? "" : text;
        host.classList.toggle("live", text !== "rest" && text !== "");
      },
    };
    figure.mount({ stage: st, svg, read }, figure.range[1]);
    // a slow lap while it is on screen, for hands that cannot hover; a real pointer takes over at once
    let lap = null;
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting && !lap && !reduce) lap = HL.tour(st, figure.tour || HL.LAP);
          else if (!e.isIntersecting && lap) {
            lap.stop();
            lap = null;
          }
        }),
      { threshold: 0.6 }
    ).observe(st);
  };
  const hs = document.createElement("script");
  hs.src = "hairline/ten.js";
  document.body.append(hs);

  /* ---------- buttons: answer the press at once; a 20 px orb only if the next page takes over 400 ms ---------- */
  addEventListener("touchstart", () => {}, { passive: true }); // lets :active show on iOS
  document.addEventListener("click", (e) => {
    const a = e.target.closest(".btn");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const go = a.querySelector(".go");
    setTimeout(() => {
      if (!document.body.contains(a) || !window.karmanOrb || !go) return;
      a.setAttribute("aria-busy", "true");
      const c = document.createElement("canvas");
      go.replaceChildren(c);
      a._stop = window.karmanOrb(c, {
        state: "working",
        size: 20,
        dark: true,
        tint: { r: 235, g: 162, b: 31 },
      });
    }, 400);
  });
  addEventListener("pageshow", () =>
    document.querySelectorAll('.btn[aria-busy="true"]').forEach((a) => {
      a._stop?.();
      a.removeAttribute("aria-busy");
      a.querySelector(".go").innerHTML = ARROW;
    })
  );

  /* ---------- words rise in once ---------- */
  const vio = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("on");
          vio.unobserve(e.target);
        }
      }),
    { threshold: 0.12 }
  );
  document.querySelectorAll(".rv").forEach((el) => vio.observe(el));
  requestAnimationFrame(() => document.documentElement.classList.add("ready"));

  /* ---------- header: white words over the film, black on the white panels ---------- */
  const hd = document.querySelector(".hd");
  const panels = [...document.querySelectorAll(".panel, .datecard")];
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = 36;
    const light = panels.some((p) => {
      const r = p.getBoundingClientRect();
      return r.top <= y && r.bottom >= y;
    });
    const down = scrollY > 40;
    hd.classList.toggle("light", light);
    hd.classList.toggle("dim", down && !light); // a soft shade so the links never sit on busy footage
    document.documentElement.classList.toggle("scrolled", down);
  };
  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  addEventListener("resize", onScroll);
  onScroll();

  /* ---------- phone menu ---------- */
  const sheet = document.getElementById("menu"),
    mbtn = document.querySelector(".hd .menu");
  const shut = () => {
    sheet.hidden = true;
    document.documentElement.classList.remove("lock");
    mbtn.setAttribute("aria-expanded", "false");
    mbtn.focus();
  };
  mbtn.addEventListener("click", () => {
    sheet.hidden = false;
    document.documentElement.classList.add("lock");
    mbtn.setAttribute("aria-expanded", "true");
    sheet.querySelector(".close").focus();
  });
  sheet.querySelector(".close").addEventListener("click", shut);
  sheet.addEventListener("click", (e) => {
    if (e.target.closest("a")) shut();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sheet.hidden) shut();
  });

  /* ---------- the copy editor's preview opens at a message: ?m=N (&b=K for a later film in it) ---------- */
  const mq = +Q.get("m");
  if (mq) {
    const t =
      (+Q.get("b") > 0 && document.getElementById(`m-${mq}-b`)) ||
      document.getElementById(`m-${mq}`);
    if (t) {
      t.scrollIntoView({ block: t.classList.contains("moment") ? "center" : "start" });
      t.querySelectorAll(".rv").forEach((el) => el.classList.add("on"));
      t.classList.add("on");
    }
  }
  if (Q.has("rec")) document.querySelectorAll(".rv").forEach((el) => el.classList.add("on"));
  window.__max = () => document.documentElement.scrollHeight - innerHeight;
  window.__go = async (y) => {
    scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  };
})();
