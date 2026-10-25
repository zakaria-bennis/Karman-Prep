/* Karman landing page (2026-10-25): a white page with framed films that play once when they come into view.
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

  /* the seven messages and their films, in the order copy.js lists them (### lines are the films) */
  const FILMS = [
    ["c1", "c2"],
    ["c3"],
    ["c4"],
    ["c5", "c6"],
    ["night", "c7"],
    ["c8a", "c8b", "c8c"],
    ["c9"],
  ];
  const SCREENS = {
    c2: "img/daily10.webp",
    c3: "img/parent-update.webp",
    c4: "img/word-game.webp",
    c5: "img/schedule.webp",
    c6: "img/review.webp",
  };

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
      m = h2[1] === "Site" ? null : { name: h2[2].trim(), top: {}, beats: [] };
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
  const esc = (s) =>
    (s || "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
    );
  // a message without ### lines has one film whose words sit at the top
  msgs.forEach((x) => {
    if (!x.beats.length) x.beats.push({ name: "", f: x.top });
  });
  const pick = (x, k) => x.top[k] ?? x.beats.map((b) => b.f[k]).find(Boolean);

  /* ---------- logo, site words and links ---------- */
  fetch("logo.svg")
    .then((r) => r.text())
    .then((svg) => document.querySelectorAll("[data-logo]").forEach((el) => (el.innerHTML = svg)))
    .catch(() => {});
  document.querySelectorAll("[data-t]").forEach((el) => {
    const v = site[el.dataset.t];
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-route]").forEach((a) => (a.href = ROUTES[a.dataset.route]));
  document.querySelectorAll("[data-mail]").forEach((a) => (a.href = `mailto:${site.email || ""}`));

  /* ---------- building blocks ---------- */
  const film = (id, stamp, ratio) =>
    `<figure class="frame" data-films="${id}"${ratio ? ` style="aspect-ratio:${ratio}"` : ""}>${stamp || ""}</figure>`;
  const stampOf = (f) =>
    f.time
      ? `<figcaption class="stamp"><b>${esc(f.time.split(" ")[0])}</b><span>${esc(f.time.split(" ").slice(1).join(" "))}${f.name ? ` · ${esc(f.name)}` : ""}</span></figcaption>`
      : "";
  const button = (f) =>
    f.button
      ? `<div class="act"><a class="btn" href="${ROUTES.test}">${esc(f.button)}</a>${f["button note"] ? `<small>${esc(f["button note"])}</small>` : ""}</div>`
      : "";
  function feats(b, id) {
    const f = b.f;
    let out = "";
    const title = f["screen title"] || f["feature title"];
    if (title || f["feature text"]) {
      const img = SCREENS[id] ? `<img src="${SCREENS[id]}" alt="" loading="lazy">` : "";
      out += `<div class="feat${img ? "" : " noimg"}">${img}<div>${f["screen title"] ? `<h3>${esc(f["screen title"])}</h3>` : ""}<p>${f["feature title"] ? `<b>${esc(f["feature title"])}</b> ` : ""}${esc(f["feature text"])}</p></div></div>`;
    }
    if (f["card title"])
      out += `<div class="feat noimg"><div><h3>${esc(f["card title"])}</h3><p>${esc(f["card text"])}</p></div></div>`;
    if (f["card date"])
      out += `<div class="date">${f["card intro"] ? `<p>${esc(f["card intro"])}</p>` : ""}<span class="d">${esc(f["card date"])}</span>${f["card later"] ? `<span class="l">${esc(f["card later"])}</span>` : ""}${f["card text"] && !f["card title"] ? `<p>${esc(f["card text"])}${f["card link"] ? ` <a href="${ROUTES.guarantee}">${esc(f["card link"])}</a>` : ""}</p>` : ""}</div>`;
    return out;
  }

  /* ---------- the sections ---------- */
  const main = document.getElementById("main");
  let html = "";
  msgs.forEach((x, i) => {
    const ids = FILMS[i] || [];
    const n = i + 1;
    if (i === 0) {
      // hero: the kitchen film, then the bus as its own short section
      const h = x.beats[0].f;
      html += `<section class="sec hero" id="m-1"><div class="grid"><div class="words rv"><h1>${esc(h.headline)}</h1>${h.text ? `<p class="lede">${esc(h.text)}</p>` : ""}${button(h)}${h.proof ? `<p class="proof">${esc(h.proof)}</p>` : ""}</div><div class="media rv">${film(ids[0])}</div></div></section>`;
      const b = x.beats[1];
      if (b)
        html += `<section class="sec flip" id="m-1-b"><div class="grid"><div class="words rv">${b.f.time ? `<p class="eyebrow">${esc(b.f.time)}${b.f.name ? ` · ${esc(b.f.name)}` : ""}</p>` : ""}<h2>${esc(b.f["screen title"] || b.f.headline || "")}</h2><div class="feats">${feats({ f: { ...b.f, "screen title": "" } }, ids[1])}</div></div><div class="media rv">${film(ids[1], stampOf(b.f))}</div></div></section>`;
      return;
    }
    if (i === 5) {
      // next fall: three students side by side
      const proof = pick(x, "proof");
      html += `<section class="sec" id="m-6"><div class="center rv"><p class="eyebrow">${esc(x.name || "Next fall")}</p></div><div class="results">${x.beats.map((b, k) => `<div class="res rv">${film(ids[k] + "-p", "", "3 / 4")}<p class="who">${esc(b.f.result)}</p><p class="sch">${esc(b.f.school)}</p></div>`).join("")}</div>${proof ? `<p class="proof center" style="margin-top:28px">${esc(proof)}</p>` : ""}</section>`;
      return;
    }
    if (i === msgs.length - 1) {
      const f = x.beats[0].f;
      html += `<section class="sec edge" id="m-${n}"><div class="center rv"><h2>${esc(f.headline)}</h2>${f.text ? `<p class="lede">${esc(f.text)}</p>` : ""}${button(f)}</div><div class="rv" style="max-width:1360px;margin:0 auto">${film(ids[0])}</div></section>`;
      return;
    }
    const head = pick(x, "headline") || x.beats.map((b) => b.f["screen title"]).find(Boolean) || "";
    const first = x.beats.find((b) => b.f.time) || x.beats[0];
    html += `<section class="sec${i % 2 ? "" : " flip"}" id="m-${n}"><div class="grid"><div class="words rv">${first.f.time ? `<p class="eyebrow">${esc(first.f.time)}${first.f.name ? ` · ${esc(first.f.name)}` : ""}</p>` : ""}<h2>${esc(head)}</h2><div class="feats">${x.beats.map((b, k) => feats(b, ids[k])).join("")}</div></div><div class="media rv">${film(ids.join(","), x.beats.map((b, k) => stampOf(b.f).replace("<figcaption", `<figcaption data-k="${k}"${k ? " hidden" : ""}`)).join(""))}</div></div></section>`;
  });
  main.innerHTML = html;

  /* ---------- films: play once in view, back to back inside a frame, then rest on the last frame ---------- */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let paused = false;
  try {
    paused = localStorage.getItem("karman-motion") === "off";
  } catch (e) {}
  const frames = [...document.querySelectorAll(".frame")];
  frames.forEach((fr) => {
    const list = fr.dataset.films.split(",");
    fr._vids = list.map((id, k) => {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = k === 0 && fr.closest(".hero") ? "auto" : "none";
      v.poster = `${id}.jpg`;
      v.src = `${id}.mp4`;
      v.setAttribute("aria-hidden", "true");
      if (k === 0) v.classList.add("on");
      v.addEventListener("ended", () => {
        const nx = fr._vids[k + 1];
        if (nx) {
          nx.currentTime = 0;
          nx.classList.add("on");
          v.classList.remove("on");
          showStamp(fr, k + 1);
          nx.play().catch(() => {});
        }
      });
      return v;
    });
    fr._vids
      .slice()
      .reverse()
      .forEach((v) => fr.prepend(v));
  });
  function start(fr) {
    if (reduce || paused) return;
    const vs = fr._vids,
      done = vs.every((v) => v.ended) || vs[vs.length - 1].ended;
    if (done || fr._fresh !== false) {
      vs.forEach((v, k) => {
        v.classList.toggle("on", k === 0);
        v.currentTime = 0;
      });
      showStamp(fr, 0);
      fr._fresh = false;
    }
    const cur = vs.find((v) => v.classList.contains("on"));
    cur.preload = "auto";
    cur.play().catch(() => {});
  }
  function showStamp(fr, k) {
    const all = fr.querySelectorAll(".stamp[data-k]");
    if (!all.length) return;
    let last = null;
    all.forEach((st) => {
      const mine = +st.dataset.k <= k;
      if (mine) last = st;
      st.hidden = true;
    });
    if (last) last.hidden = false;
  }
  function stop(fr) {
    fr._vids.forEach((v) => v.pause());
  }
  // load a frame's films about half a screen before it arrives
  const near = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) e.target._vids.forEach((v) => (v.preload = "auto"));
      }),
    { rootMargin: "50% 0px" }
  );
  frames.forEach((f) => near.observe(f));
  // play when half the frame is on screen; leaving resets it so it plays from the start next time
  const io2 = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) start(e.target);
        else {
          stop(e.target);
          e.target._fresh = true;
        }
      }),
    { threshold: 0.5 }
  );
  frames.forEach((f) => io2.observe(f));

  /* pause / play every film (header), remembered */
  const motion = document.querySelector("[data-motion]");
  const label = () => {
    if (!motion) return;
    motion.textContent = paused ? site.play || "Play" : site.pause || "Pause";
    motion.setAttribute(
      "aria-label",
      `${motion.textContent} ${site["pause words"] || "the films"}`
    );
    motion.hidden = reduce;
  };
  label();
  motion?.addEventListener("click", () => {
    paused = !paused;
    try {
      localStorage.setItem("karman-motion", paused ? "off" : "on");
    } catch (e) {}
    frames.forEach((fr) =>
      paused
        ? stop(fr)
        : fr.getBoundingClientRect().top < innerHeight &&
          fr.getBoundingClientRect().bottom > 0 &&
          start(fr)
    );
    label();
  });

  /* words rise in once */
  const rio = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          rio.unobserve(e.target);
        }
      }),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".rv").forEach((el) => rio.observe(el));

  /* header hairline, phone menu */
  const hd = document.querySelector(".hd");
  addEventListener("scroll", () => hd.classList.toggle("scrolled", scrollY > 8), { passive: true });
  const sheet = document.getElementById("menu"),
    mbtn = document.querySelector(".hd .menu");
  const close = () => {
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
  sheet.querySelector(".close").addEventListener("click", close);
  sheet.addEventListener("click", (e) => {
    if (e.target.closest("a")) close();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sheet.hidden) close();
  });

  /* the copy editor's preview opens at a message: ?m=N (&b=K for the bus beat of message 1) */
  const mq = +Q.get("m");
  if (mq) {
    const t = document.getElementById(mq === 1 && +Q.get("b") > 0 ? "m-1-b" : `m-${mq}`);
    if (t) t.scrollIntoView({ block: "start" });
  }
  if (Q.has("rec")) document.querySelectorAll(".rv").forEach((el) => el.classList.add("in"));
  window.__max = () => document.documentElement.scrollHeight - innerHeight;
  window.__go = async (y) => {
    scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  };
})();
