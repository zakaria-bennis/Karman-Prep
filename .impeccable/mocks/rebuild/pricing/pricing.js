/* Karman, the Pricing page.
   Ports, credited here and in 21st.md:
   - Paddle Billing starter kit (github.com/PaddleHQ/paddle-nextjs-starter-kit, Apache-2.0):
     the pricing card anatomy and the control that changes every card at once
     (src/components/home/pricing/*.tsx), rebuilt as plain DOM.
   - 21st.dev 40206 Pricing Table (my): prices that roll digit by digit to the new value, right to
     left with a 0.03 s stagger, about 0.6 s; rebuilt in GSAP without motion/react.
   - 21st.dev 26923 Segmented Tabs (micka_design): the sliding pill, arrow keys, Home and End.
   - 21st.dev 23530 Accordion (ddoemonn): one panel open, measured height, chevron turn,
     arrow keys, Home and End; rebuilt in GSAP without motion/react.
   - 21st.dev 18090 Floating Navbar (arihantcodes), as ported in ../numbers.
   Every word comes from copy.js; every price from offer.ts through copy.js. */

const CLIPS = "../../motion/out/";
const FRAME = "../../motion/device/iphone-17-pro-max-orange.svg";
const VIEWS = {
  own: ["plan_free", "plan_platform", "plan_plus"],
  tutor: ["plan_cohort", "plan_private10", "plan_private20"],
};

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {
        /* private window: the page still works, the choice is just not kept */
      }
    },
  };

  /* ---------- words ---------- */
  const COPY = {};
  let section = "";
  for (const line of (window.KARMAN_COPY || "").split("\n")) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      section = h[1].trim();
      continue;
    }
    const m = line.match(/^([a-z0-9_]+):\s?(.*)$/i);
    if (m && section) COPY[`${section}.${m[1]}`] = m[2].trim();
  }
  const get = (k) => COPY[k] ?? "";
  $$("[data-copy]").forEach((n) => (n.textContent = get(n.dataset.copy)));
  $$("[data-copy-aria]").forEach((n) => n.setAttribute("aria-label", get(n.dataset.copyAria)));
  $$("[data-href]").forEach((n) => (n.href = get(n.dataset.href)));
  if (get("meta.title")) document.title = get("meta.title");
  const desc = $('meta[name="description"]');
  if (desc && get("meta.description")) desc.content = get("meta.description");

  const plan = (id) => {
    const f = [];
    for (let i = 1; i <= 8; i++) if (get(`${id}.f${i}`)) f.push(get(`${id}.f${i}`));
    return {
      id,
      icon: get(`${id}.icon`),
      name: get(`${id}.name`),
      price: Number(get(`${id}.price`)) || 0,
      suffix: get(`${id}.suffix`),
      for: get(`${id}.for`),
      cta: get(`${id}.cta`),
      href: get(`${id}.href`),
      badge: get(`${id}.badge`),
      featured: get(`${id}.featured`).toLowerCase() === "yes",
      feats: f,
      guarantee: get(`${id}.guarantee`),
    };
  };
  const money = (n) => n.toLocaleString("en-US");

  /* FAQPage structured data, from the same words */
  const faq = [];
  for (let i = 1; i <= 12; i++)
    if (get(`faq.q${i}`)) faq.push([get(`faq.q${i}`), get(`faq.a${i}`)]);
  const ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  });
  document.head.appendChild(ld);

  /* ---------- theme (rule 33) ---------- */
  const root = document.documentElement;
  const lightMQ = matchMedia("(prefers-color-scheme: light)");
  const scheme = () => {
    const t = root.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return lightMQ.matches ? "light" : "dark";
  };
  const themeToggle = $("#themeToggle");
  function paintTheme() {
    themeToggle.setAttribute(
      "aria-label",
      get(scheme() === "dark" ? "header.theme_to_light" : "header.theme_to_dark")
    );
    const chosen = root.getAttribute("data-theme") || "auto";
    $$("[data-theme-set]").forEach((b) =>
      b.setAttribute("aria-checked", String(b.dataset.themeSet === chosen))
    );
    document.dispatchEvent(new CustomEvent("karman-scheme"));
  }
  function setTheme(t) {
    if (t === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
    store.set("karman-theme", t);
    paintTheme();
  }
  themeToggle.addEventListener("click", () => setTheme(scheme() === "dark" ? "light" : "dark"));
  $$("[data-theme-set]").forEach((b) =>
    b.addEventListener("click", () => setTheme(b.dataset.themeSet))
  );
  lightMQ.addEventListener("change", paintTheme);

  /* ---------- reduced motion and the page's motion control ---------- */
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = store.get("karman-motion") === "paused";
  const moving = () => !reduceMQ.matches && !paused && !!window.gsap;
  const motionBtn = $("#motionToggle");
  const paintMotion = () => (motionBtn.textContent = get(paused ? "footer.play" : "footer.pause"));
  paintMotion();

  /* ---------- phone menu: focus stays inside, Escape and links close it ---------- */
  const sheet = $("#sheet"),
    menuBtn = $("#menuBtn");
  function openSheet() {
    sheet.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    $("#sheetClose").focus();
    document.body.style.overflow = "hidden";
  }
  function closeSheet(focusBack = true) {
    sheet.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (focusBack) menuBtn.focus();
  }
  menuBtn.addEventListener("click", openSheet);
  $("#sheetClose").addEventListener("click", () => closeSheet());
  $$("a", sheet).forEach((a) => a.addEventListener("click", () => closeSheet(false)));
  sheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (e.key !== "Tab") return;
    const f = $$("button, a", sheet);
    const first = f[0],
      last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ---------- the floating nav hides while scrolling down, returns on the way up ---------- */
  const navWrap = $("#header");
  let lastY = scrollY;
  addEventListener(
    "scroll",
    () => {
      const y = scrollY;
      const d = y - lastY;
      if (Math.abs(d) < 4) return;
      navWrap.classList.toggle(
        "away",
        d > 0 && y > 120 && !navWrap.contains(document.activeElement)
      );
      lastY = y;
    },
    { passive: true }
  );
  navWrap.addEventListener("focusin", () => navWrap.classList.remove("away"));

  /* ---------- the cards ---------- */
  const slots = $$(".slot");
  slots.forEach((s) => {
    s.innerHTML = `
      <div class="glow" aria-hidden="true"><div class="glow-in"></div></div>
      <article class="card">
        <div class="fx" aria-hidden="true"><div class="fx-col"></div><div class="fx-band"></div><div class="fx-hard"></div><div class="fx-line"></div></div>
        <div class="card-head">
          <div class="card-title swap">
            <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><use></use></svg></span>
            <h3 class="name"></h3>
          </div>
          <span class="badge swap"></span>
        </div>
        <p class="price"><span aria-hidden="true">$</span><span class="num" aria-hidden="true"></span><span class="vh price-sr"></span></p>
        <p class="suffix swap"></p>
        <hr class="hair" />
        <p class="for swap"></p>
        <a class="btn cta swap"></a>
        <ul class="feats swap"></ul>
      </article>`;
    s.num = $(".num", s);
    s.shown = "";
  });

  function fill(s, p) {
    const card = $(".card", s);
    s.classList.toggle("is-feat", p.featured);
    $(".icon use", s).setAttribute("href", `#i-${p.icon}`);
    $(".name", s).textContent = p.name;
    card.setAttribute("aria-label", p.name);
    $(".badge", s).textContent = p.featured ? p.badge : "";
    $(".price-sr", s).textContent = `$${money(p.price)} ${p.suffix}`;
    $(".suffix", s).textContent = p.suffix;
    $(".for", s).textContent = p.for;
    const a = $(".cta", s);
    a.textContent = p.cta;
    a.href = p.href;
    a.classList.toggle("btn-hi", p.featured);
    const ul = $(".feats", s);
    ul.textContent = "";
    const li = (text, icon, cls) => {
      const n = document.createElement("li");
      if (cls) n.className = cls;
      n.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true"><use href="#${icon}"></use></svg><span></span>`;
      $("span", n).textContent = text;
      ul.appendChild(n);
    };
    p.feats.forEach((f) => li(f, "i-mark"));
    if (p.guarantee) li(p.guarantee, "i-seal", "g");
  }

  /* Price roll (after 21st.dev 40206): the old figure leaves upward, the new one rolls up into
     place, character by character, right to left. */
  const chars = (t) => [...t].map((c) => `<span class="ch">${c}</span>`).join("");
  function roll(s, text, at, tl) {
    const old = s.shown;
    s.shown = text;
    if (!moving() || !tl) {
      s.num.innerHTML = `<span class="layer">${chars(text)}</span>`;
      return;
    }
    s.num.innerHTML =
      (old ? `<span class="layer old">${chars(old)}</span>` : "") +
      `<span class="layer new">${chars(text)}</span>`;
    const outs = $$(".old .ch", s.num).reverse();
    const ins = $$(".new .ch", s.num).reverse();
    if (outs.length)
      tl.to(outs, { yPercent: -110, duration: 0.32, ease: "power2.in", stagger: 0.03 }, at);
    tl.fromTo(
      ins,
      { yPercent: 110 },
      { yPercent: 0, duration: 0.6, ease: "power3.out", stagger: 0.03 },
      at + (outs.length ? 0.1 : 0)
    );
    tl.add(() => {
      const o = $(".old", s.num);
      if (o && s.shown === text) o.remove();
    });
  }

  /* ---------- the comparison table follows the control ---------- */
  const table = $("#table");
  const cell = (v, feat) => {
    const cls = feat ? ' class="is-feat"' : "";
    if (v.toLowerCase() === "yes")
      return `<td${cls}><svg viewBox="0 0 20 20" aria-hidden="true"><use href="#i-mark"></use></svg><span class="vh">${get("compare.yes")}</span></td>`;
    if (v.toLowerCase() === "no")
      return `<td${cls}><span class="none" aria-hidden="true"></span><span class="vh">${get("compare.no")}</span></td>`;
    const td = document.createElement("td");
    td.textContent = v;
    return `<td${cls}>${td.innerHTML}</td>`;
  };
  function paintTable(view) {
    const featIdx = VIEWS[view].findIndex((id) => plan(id).featured);
    const heads = get(`compare.${view}_heads`)
      .split("|")
      .map((x) => x.trim());
    const esc = (t) => {
      const d = document.createElement("span");
      d.textContent = t;
      return d.innerHTML;
    };
    $("thead", table).innerHTML =
      `<tr><th scope="col">${esc(get("compare.feature"))}</th>` +
      heads
        .map((h, i) => `<th scope="col"${i === featIdx ? ' class="is-feat"' : ""}>${esc(h)}</th>`)
        .join("") +
      "</tr>";
    let rows = "";
    for (let i = 1; i <= 20; i++) {
      const r = get(`compare.${view}${i}`);
      if (!r) continue;
      const [name, ...vals] = r.split("|").map((x) => x.trim());
      rows += `<tr><th scope="row">${esc(name)}</th>${vals.map((v, j) => cell(v, j === featIdx)).join("")}</tr>`;
    }
    $("tbody", table).innerHTML = rows;
    if (!$("colgroup", table)) {
      const cg = document.createElement("colgroup");
      cg.innerHTML = '<col class="c-feat"><col><col><col>';
      table.insertBefore(cg, $("thead", table));
    }
  }

  /* ---------- the control (Segmented Tabs, 26923) ---------- */
  const tabs = $$("#seg [role=tab]");
  const ind = $(".seg-ind");
  const panel = $("#plans");
  let view = new URLSearchParams(location.search).get("view") === "tutor" ? "tutor" : "own";
  function placeInd(animate) {
    const t = tabs.find((b) => b.dataset.view === view);
    const s = { x: t.offsetLeft, y: t.offsetTop, width: t.offsetWidth, height: t.offsetHeight };
    if (animate && moving()) gsap.to(ind, { ...s, duration: 0.25, ease: "power3.inOut" });
    else
      Object.assign(ind.style, {
        transform: `translate(${s.x}px,${s.y}px)`,
        width: s.width + "px",
        height: s.height + "px",
      });
  }
  function paintTabs() {
    tabs.forEach((b) => {
      const on = b.dataset.view === view;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", `tab-${view}`);
  }
  function show(next, { animate = true } = {}) {
    if (next === view && animate) return;
    view = next;
    paintTabs();
    placeInd(animate);
    paintTable(view);
    const plans = VIEWS[view].map(plan);
    if (!animate || !moving()) {
      slots.forEach((s, i) => {
        fill(s, plans[i]);
        roll(s, money(plans[i].price));
      });
      return;
    }
    const tl = gsap.timeline();
    const sw = $$(".swap", panel);
    tl.to(sw, { autoAlpha: 0, y: -6, duration: 0.14, ease: "power1.in" }, 0);
    slots.forEach((s, i) => roll(s, money(plans[i].price), i * 0.05, tl));
    tl.add(() => slots.forEach((s, i) => fill(s, plans[i])), 0.15);
    tl.fromTo(
      sw,
      { autoAlpha: 0, y: 8 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
        stagger: 0.008,
        immediateRender: false,
      },
      0.16
    );
  }
  tabs.forEach((b, i) => {
    b.addEventListener("click", () => show(b.dataset.view));
    b.addEventListener("keydown", (e) => {
      let j = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % tabs.length;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") j = 0;
      if (e.key === "End") j = tabs.length - 1;
      if (j === null) return;
      e.preventDefault();
      tabs[j].focus();
      show(tabs[j].dataset.view);
    });
  });
  addEventListener("resize", () => placeInd(false));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeInd(false));

  /* ---------- first paint: cards rise in order, prices roll in ---------- */
  paintTabs();
  placeInd(false);
  paintTable(view);
  const first = VIEWS[view].map(plan);
  slots.forEach((s, i) => fill(s, first[i]));
  if (moving()) {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".hero-text > *", { autoAlpha: 0, y: 18, duration: 0.6, stagger: 0.08 }, 0);
    tl.from(slots, { autoAlpha: 0, y: 36, duration: 0.8, stagger: 0.1 }, 0.2);
    slots.forEach((s, i) => roll(s, money(first[i].price), 0.35 + i * 0.1, tl));
    tl.from(".school", { autoAlpha: 0, duration: 0.5 }, 0.7);
  } else slots.forEach((s, i) => roll(s, money(first[i].price)));

  /* the featured glow breathes, very slowly */
  let breathe = null;
  function startBreathe() {
    if (breathe) breathe.kill();
    breathe = null;
    $$(".glow-in").forEach((g) => (g.style.transform = g.style.opacity = ""));
    if (!moving()) return;
    breathe = gsap.fromTo(
      ".glow-in",
      { opacity: 0.72, scale: 0.96 },
      { opacity: 1, scale: 1.04, duration: 7, ease: "sine.inOut", repeat: -1, yoyo: true }
    );
  }
  startBreathe();

  /* ---------- FAQ accordion (23530) ---------- */
  const acc = $("#acc");
  faq.forEach(([q, a], i) => {
    const item = document.createElement("div");
    item.className = "acc-item";
    item.innerHTML = `<h3><button class="acc-btn" type="button" id="q${i}" aria-expanded="false" aria-controls="a${i}"><span></span><svg viewBox="0 0 20 20" aria-hidden="true"><use href="#i-chev"></use></svg></button></h3><div class="acc-panel" id="a${i}" role="region" aria-labelledby="q${i}" hidden><p></p></div>`;
    $("button span", item).textContent = q;
    $("p", item).textContent = a;
    acc.appendChild(item);
  });
  const qs = $$(".acc-btn", acc);
  function setOpen(btn, open) {
    const p = $("#" + btn.getAttribute("aria-controls"));
    const chev = $("svg", btn);
    btn.setAttribute("aria-expanded", String(open));
    if (!moving()) {
      p.hidden = !open;
      p.style.height = "";
      chev.style.transform = open ? "rotate(180deg)" : "";
      return;
    }
    gsap.to(chev, { rotation: open ? 180 : 0, duration: 0.2, ease: "power2.out" });
    if (open) {
      p.hidden = false;
      gsap.fromTo(p, { height: 0 }, { height: "auto", duration: 0.28, ease: "power3.out" });
    } else
      gsap.to(p, {
        height: 0,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          if (btn.getAttribute("aria-expanded") === "false") p.hidden = true;
          p.style.height = "";
        },
      });
  }
  qs.forEach((b, i) => {
    b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      qs.forEach((o) => o !== b && o.getAttribute("aria-expanded") === "true" && setOpen(o, false));
      setOpen(b, open);
    });
    b.addEventListener("keydown", (e) => {
      let j = null;
      if (e.key === "ArrowDown") j = (i + 1) % qs.length;
      if (e.key === "ArrowUp") j = (i - 1 + qs.length) % qs.length;
      if (e.key === "Home") j = 0;
      if (e.key === "End") j = qs.length - 1;
      if (j === null) return;
      e.preventDefault();
      qs[j].focus();
    });
  });

  /* ---------- the iPhone: a lab clip cropped to its screen, under the hand-drawn frame ---------- */
  const phones = $$("[data-phone]").map((el) => {
    el.innerHTML = `<div class="phone-screen"><img class="still crop" alt="" decoding="async"><video class="crop" muted playsinline loop preload="none" aria-hidden="true" tabindex="-1"></video></div><img class="phone-frame" src="${FRAME}" alt="">`;
    const p = {
      el,
      img: $("img", el),
      video: $("video", el),
      clip: el.dataset.clip,
      inView: false,
    };
    p.video.addEventListener("playing", () => p.video.classList.add("on"));
    return p;
  });
  function paintPhone(p) {
    p.base = `${CLIPS}${p.clip}-9x16-${scheme() === "dark" ? "night" : "pine"}`;
    p.img.src = p.base + ".webp";
    p.video.classList.remove("on");
    p.video.removeAttribute("src");
    p.video.load();
    p.loaded = false;
    if (p.inView) play(p);
  }
  function play(p) {
    if (!moving()) return;
    if (!p.loaded) {
      p.video.src = p.base + ".mp4";
      p.loaded = true;
    }
    const r = p.video.play();
    if (r && r.catch) r.catch(() => {});
  }
  phones.forEach(paintPhone);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          const p = phones.find((x) => x.el === e.target);
          p.inView = e.isIntersecting;
          if (p.inView) play(p);
          else p.video.pause();
        }),
      { threshold: 0.3 }
    );
    phones.forEach((p) => io.observe(p.el));
  }
  document.addEventListener("karman-scheme", () => phones.forEach(paintPhone));

  function applyMotion() {
    paintMotion();
    startBreathe();
    phones.forEach((p) => (moving() ? p.inView && play(p) : p.video.pause()));
  }
  motionBtn.addEventListener("click", () => {
    paused = !paused;
    store.set("karman-motion", paused ? "paused" : "playing");
    applyMotion();
  });
  reduceMQ.addEventListener("change", applyMotion);

  paintTheme();
})();
