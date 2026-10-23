/* Karman landing film: behaviour. Markup in index.html, styles in film.css, words in copy.js. */
(function () {
  /* ---------- every link target in one place (pages marked "to build" don't exist in src/app yet) ---------- */
  const ROUTES = {
    test: "/free-practice-test", // to build
    program: "/program", // to build
    private: "/private-tutoring", // to build
    pricing: "/pricing", // to build
    cookies: "/cookies", // to build
    signIn: "/auth/sign-in",
    guarantee: "/guarantee",
    faq: "/faq",
    about: "/about",
    terms: "/terms",
    privacy: "/privacy",
  };

  /* ---------- the seven messages: one headline and one idea each, their clips played back to back ---------- */
  // Per clip: film (file name), len [wide, phone] its share of the scroll in vh;
  // span: the part of the clip the scroll plays, in seconds, kept to the moments with a person in focus;
  // pspan: the same for the portrait crop phones get, where it differs (the person leaves the narrow crop sooner).
  // feat: a product screen shown as a cropped detail, crop = [x, y, width, height] in screen points
  // (phone screens are 440 x 956, laptop screens 1440 x 900); psrc is the phone-width layout of the same screen shown on
  // phones held upright, [file, width, height] in points (film/screens-phone.mjs), so every line and card is whole;
  // ptight: a tighter crop of that phone layout, [x, y, width, height] in its points, used where the whole one would draw too small.
  // A re-shot clip needs only a re-encode (encode.mjs) and its numbers here.
  // eye: where the eyes sit in the portrait crop at mid-span (fraction of its height), for overlap-scan's face check on phones.
  // headTo: the message's headline leaves after this clip (its index in the message) instead of holding to the end.
  const MESSAGES = [
    // stack + side: the opening words in a left column on wide screens, so the girl at the counter (centre frame) stays clear.
    // The headline holds over the bus; the Daily 10 screen is the message's second beat.
    {
      name: "Morning",
      stack: true,
      side: true,
      clips: [
        // idleTo: a reader who doesn't scroll sees the film play on only to 4.6 s, while the window still frames her at a
        // readable size (after it the camera pulls back to the roof and she shrinks to a figure at the bottom edge)
        { film: "c1", eye: 0.48, autoplay: 4, span: [0, 6.5], idleTo: 4.6, len: [160, 160] },
        // from 3 s, after the dark shot the clip opens on, to 6.6 s: after that a reflection in the bus window grows into a ghostly sweater.
        // The Daily 10 crop starts at the tools row: the question-set row above it draws sparkle stars (rule 23)
        {
          film: "c2",
          eye: 0.36,
          span: [3, 6.6],
          len: [150, 180],
          feat: {
            src: "img/daily10.webp",
            kind: "phone",
            crop: [0, 198, 440, 594],
            psrc: ["img/daily10-p.webp", 360, 325],
            ptight: [0, 66, 360, 186],
          },
        },
      ],
    },
    // low: on wide screens a face sits left of centre where the headline would go, so the headline drops to the lower left
    {
      name: "Pickup",
      low: true,
      clips: [
        {
          film: "c3",
          eye: 0.42,
          span: [0, 5.2],
          len: [150, 180],
          feat: {
            src: "img/parent-update.webp",
            kind: "phone",
            crop: [0, 56, 440, 292],
            psrc: ["img/parent-update-p.webp", 360, 343],
            ptight: [0, 50, 360, 160],
          },
        },
      ],
    },
    {
      name: "Tennis",
      low: true,
      clips: [
        // from his face to the bench, ending before the wide shot; Wordline: five whole rows of tiles
        {
          film: "c4",
          eye: 0.32,
          span: [1.4, 5],
          ppos: "50% 0%",
          len: [150, 180],
          feat: { src: "img/word-game.webp", kind: "phone", crop: [0, 56, 440, 358] },
        },
      ],
    },
    // the headline (six students, live) holds over Priya's class only; the review's own screen title carries David's 1:1 beat
    {
      name: "Classes and reviews",
      low: true,
      headTo: 0,
      clips: [
        // pspan: on phones the clip ends at 6.4 s, before she drops low in the portrait crop.
        // the calendar: Monday to Wednesday at full size so event labels read; on phones Tuesday and Thursday only.
        // fw: on wide screens the calendar is kept to 36% of the width, so its left edge stays clear of Priya's glasses
        {
          film: "c5",
          eye: 0.37,
          wide: true,
          span: [1.1, 7],
          pspan: [1.1, 6.4],
          len: [150, 180],
          feat: {
            src: "img/schedule.webp",
            kind: "lap",
            crop: [102, 110, 562, 402],
            psrc: ["img/schedule-p.webp", 360, 194],
            fw: 36,
          },
        },
        // ppos (phones): the portrait crop sits high, so his eyes stay below the header row once the screen joins him.
        // fw 40: the review panel stays clear of David's face as he leans in; the span ends at 6.0 s, before the camera pushes in
        // and he slides off the left edge (6.1 s on); on phones the crop loses him from about 5.5 s
        {
          film: "c6",
          eye: 0.24,
          wide: true,
          span: [1.4, 6.0],
          pspan: [1.4, 5.4],
          ppos: "50% 8%",
          len: [150, 180],
          feat: {
            src: "img/review.webp",
            kind: "lap",
            crop: [755, 26, 665, 512],
            psrc: ["img/review-p.webp", 400, 243],
            fw: 40,
          },
        },
      ],
    },
    {
      name: "Test day",
      low: true,
      clips: [
        // the night: no words, the clear sky from 10 s; the test-day clock arrives at clockAt (film time), about a fifth of a
        // screen after the cut, and carries into the morning, so the sky is never on screen for long with nothing to read
        { film: "night", night: true, span: [10, 19.2], clockAt: 12, len: [90, 90] },
        // ppos: on phones the crop sits at the top of the frame, so her eyes clear the header on small screens.
        // From the first frame with her whole face in a 16:9 crop (before 4.5 s, as browsers seek, it reads as a headless torso)
        { film: "c7", eye: 0.36, test: true, ppos: "50% 4%", span: [4.5, 5.85], len: [150, 180] },
      ],
    },
    // next fall: three Karman 1:1 students, each in their university's clothing (rule 47, founder exception cleared by
    // Karman's lawyer, 2026-10-22). words: [wide, phone] is the film time when the student and the lettering are both on
    // screen; the result waits for it. The dip to black between clips keeps two people from sharing a frame.
    {
      name: "Next fall",
      result: true,
      clips: [
        // on phones only 2.4 to 4.1 s: his face smears in the head turns after it
        {
          film: "c8a",
          eye: 0.33,
          result: true,
          span: [1.6, 6],
          pspan: [2.4, 4.1],
          words: [2.4, 2.6],
          len: [150, 170],
        },
        // STANFORD is fully in frame from about 4.5 s; on phones the frame sits low enough to keep the lettering under her face
        {
          film: "c8b",
          eye: 0.53,
          result: true,
          ppos: "50% 85%",
          span: [3.3, 6],
          pspan: [4.1, 6],
          words: [4.8, 4.6],
          len: [150, 170],
        },
        // the 2026-10-23 retake: she walks down the steps toward the camera as it tilts up to the Campanile. Measured on the
        // frames, her face grows slowly all through (about 8% of the frame height at 3.5 s, 10% at 6 s) and settles near the
        // middle of the frame from 4.4 s, BERKELEY under it. Until about 3.9 s her face is at the top edge (under the header).
        // zoom (wide screens only): the camera sits 1.3x closer, so her face reads at about Mateo's size; she stays centred,
        // clear of the result on the left. Phones: ppos keeps the crop's top, so her face clears the header from 4.15 s, on 320-point phones too
        {
          film: "c8c",
          eye: 0.4,
          result: true,
          zoom: 1.3,
          ppos: "50% 0%",
          span: [4.3, 6],
          pspan: [4.15, 6],
          words: [4.4, 4.15],
          len: [150, 170],
        },
      ],
    },
    {
      name: "The edge",
      stack: true,
      orbit: true,
      clips: [{ film: "c9", orbit: true, len: [170, 170] }],
    },
  ];
  const SCENES = MESSAGES.flatMap((M, m) => M.clips.map((c, b) => ({ ...c, m, b })));
  const first = (m) => SCENES.findIndex((s) => s.m === m),
    lastOf = (m) => first(m) + MESSAGES[m].clips.length - 1;
  const SCREEN = { phone: [440, 956, 880, 1912], lap: [1440, 900, 2160, 1350] }; // points, then image pixels
  const setVars = (el, vars) =>
    vars.split(";").forEach((d) => {
      const k = d.indexOf(":");
      el.style.setProperty(d.slice(0, k), d.slice(k + 1));
    });
  const cropVars = (crop, [W], p) => {
    const [x, y, w, h] = crop;
    return `--${p}ar:${w} / ${h};--${p}r:${(w / h).toFixed(4)};--${p}w:${w};--${p}iw:${((W / w) * 100).toFixed(3)}%;--${p}il:${((-x / w) * 100).toFixed(3)}%;--${p}it:${((-y / h) * 100).toFixed(3)}%`;
  };

  /* ---------- the words: "## N" starts a message, "### " a film inside it, then "label: words" lines ---------- */
  // ?draft=1 previews unsaved words from the copy editor (film/edit.html) instead of copy.js
  const Q = new URLSearchParams(location.search);
  let draft = null;
  try {
    draft = Q.has("draft") ? localStorage.getItem("karman-copy-draft") : null;
  } catch (e) {}
  // "## Site" (after the seven messages) holds the words around the film: header, menu, footer and the page controls
  const COPY = [],
    SITE = {};
  let msg = null,
    named = false;
  (draft ?? window.KARMAN_COPY ?? "").split("\n").forEach((line) => {
    if (/^##\s*site\b/i.test(line)) {
      msg = [SITE];
      named = true;
      return;
    }
    const h = line.match(/^##\s*(\d+)/);
    if (h) {
      msg = COPY[+h[1] - 1] = [{}];
      named = false;
      return;
    }
    if (/^###/.test(line)) {
      if (msg) {
        if (named) msg.push({});
        named = true;
      }
      return;
    }
    const m = line.match(/^\s*([a-z ]+):\s*(.*)$/i);
    if (m && msg) msg[msg.length - 1][m[1].trim().toLowerCase()] = m[2].trim();
  });
  document.querySelectorAll("[data-route]").forEach((a) => {
    a.href = ROUTES[a.dataset.route];
  });
  document.querySelectorAll("[data-t]").forEach((e) => {
    const v = SITE[e.dataset.t] || "";
    e.textContent = e.dataset.t === "pause words" && v ? " " + v : v;
  });
  document.querySelectorAll("[data-motion] .lbl").forEach((e) => {
    e.textContent = SITE.pause || "";
  }); // setHeld swaps it to Play
  document.querySelectorAll("[data-mail]").forEach((a) => {
    if (SITE.email) a.href = "mailto:" + SITE.email;
  });
  document.getElementById("menu").setAttribute("aria-label", SITE.menu || "Menu");
  const beatsOf = (m) => MESSAGES[m].clips.map((_, b) => (COPY[m] || [])[b] || {});
  const esc = (s) =>
    (s || "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
    );

  const REC = Q.has("rec"); // frame-exact mode for the screenshot and overlap scripts
  const root = document.documentElement;
  if (REC) root.classList.add("rec");
  const HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const still = (reduce.matches || !HAS_GSAP) && !REC; // reduced motion (or no animation library): posters, fades, no playback
  if (still) root.classList.add("still");
  reduce.addEventListener?.("change", () => location.reload());
  // phones held upright get a portrait crop of each film; everything else gets the 1440px version
  const portrait = innerWidth <= 900 && innerWidth / innerHeight < 0.8;
  const sfx = portrait ? "-p" : "";
  const spanFor = (i) => (portrait && SCENES[i].pspan) || SCENES[i].span;
  const last = SCENES.length - 1,
    lastM = MESSAGES.length - 1;

  /* ---------- build: one section per message; a wrapper (data-from / data-to: clip numbers) per piece of it ---------- */
  const climb = document.getElementById("climb"),
    films = document.querySelector(".films");
  const piece = (role, from, to, html) =>
    html
      ? `<div class="bt" data-role="${role}" data-from="${from}" data-to="${to}">${html}</div>`
      : "";
  const clock = (c) => {
    const [d, ...rest] = c.time.split(" ");
    return `<p class="time"><span class="digits" aria-hidden="true">${[...d].map((ch) => `<span class="c"><span>${esc(ch)}</span></span>`).join("")}</span><span class="vh">${esc(c.time)}${c.name ? ", " + esc(c.name) : ""}</span><span class="meta" aria-hidden="true"><span>${esc(rest.join(" "))}</span><b>${esc(c.name)}</b></span></p>`;
  };
  MESSAGES.forEach((M, m) => {
    const n = m + 1,
      beats = beatsOf(m),
      i0 = first(m),
      iZ = lastOf(m),
      H = m === 0 ? 1 : 2,
      hZ = M.headTo != null ? i0 + M.headTo : iZ;
    const hb = beats.findIndex((c) => c.headline),
      head = hb >= 0 ? beats[hb].headline : "";
    const kin = head ? `<h${H} class="kin" id="h-${n}">${esc(head)}</h${H}>` : "";
    let html = "";
    if (M.stack) {
      // the opening and the close: headline, text, proof, button and its note, centred (or in the left column)
      const c = beats[0];
      const more = `${c.text ? `<p class="lede">${esc(c.text)}</p>` : ""}${c.proof ? `<p class="proof lede">${esc(c.proof)}</p>` : ""}${c.button ? `<div class="act"><a class="btn" href="${ROUTES.test}">${esc(c.button)}</a>${c["button note"] ? `<small>${esc(c["button note"])}</small>` : ""}${m === 0 && c.skip ? `<a class="skipfilm" href="#m-${MESSAGES.length}" data-skip tabindex="-1">${esc(c.skip)}</a>` : ""}</div>` : ""}`;
      // the line's visible label is the line note's opening words ("100 km up"), so it reads as something to tap
      const lbl = (c["line note"] || "").split(",")[0].trim(),
        short = lbl.length <= 24 && lbl !== c["line note"];
      let line = "";
      if (M.orbit && c["line note"])
        line = `<button class="kline" type="button" aria-expanded="false" aria-controls="kline-tip">${short ? `<span class="kl">${esc(lbl)}</span><span class="vh">: what is this line?</span>` : `<span class="vh">What is this line?</span>`}</button><p class="tip" id="kline-tip" aria-live="polite">${esc(c["line note"])}</p>`;
      // the line follows the words in the page's order, so a keyboard reaches the headline and the button before it
      html += `<div class="stack bt" data-role="head" data-from="${i0 + Math.max(hb, 0)}" data-to="${iZ}">${kin}${more ? `<div class="more bt" data-role="more" data-from="${i0}" data-to="${i0}">${more}</div>` : ""}</div>${line}`;
    } else {
      html += piece("head", i0 + hb, hZ, kin);
      // one proof line for the whole message (the results' format), under the results
      const pf = beats.find((c) => c.proof)?.proof;
      if (pf)
        html += piece(
          "proof",
          i0 + beats.findIndex((c) => c.proof),
          iZ,
          `<p class="mproof">${esc(pf)}</p>`
        );
    }
    // a clock holds from its film until the next clock in the message
    beats.forEach((c, b) => {
      if (!c.time) return;
      let e = b + 1;
      while (e < beats.length && !beats[e].time) e++;
      html += piece("clock", i0 + b, i0 + e - 1, clock(c));
    });
    beats.forEach((c, b) => {
      const i = i0 + b,
        sc = SCENES[i];
      let bt = "";
      if (M.stack && b === 0) return;
      const noteIn =
          (c["card title"] || c["card text"]) && !c["card intro"] && !c["card date"]
            ? `<b>${esc(c["card title"])}</b>${esc(c["card text"])}`
            : "",
        note = noteIn && `<div class="note">${noteIn}</div>`;
      const ttl = c["screen title"]
        ? `<span class="ttl" role="heading" aria-level="${H + 1}">${esc(c["screen title"])}</span>`
        : "";
      const line =
        c["feature title"] || c["feature text"]
          ? `<span><b>${esc(c["feature title"])}</b> ${esc(c["feature text"])}</span>`
          : "";
      const cap = ttl || line ? `<figcaption>${ttl ? ttl + "<br>" : ""}${line}</figcaption>` : "";
      if (sc.feat) {
        const f = sc.feat,
          S = SCREEN[f.kind],
          P = f.psrc,
          pv = P ? cropVars([0, 0, P[1], P[2]], [P[1]], "p") : cropVars(f.crop, S, "p");
        const img = `<img src="${f.src}" width="${S[2]}" height="${S[3]}" alt="${cap ? "" : esc(c["feature title"] || "A Karman screen")}" loading="lazy" decoding="async">`;
        const pic = P
          ? `<picture><source media="(max-width: 760px)" srcset="${P[0]}" width="${P[1] * 2}" height="${P[2] * 2}">${img}</picture>`
          : img;
        bt += `<figure class="feat${f.kind === "lap" ? " lap" : ""}" style="${cropVars(f.crop, S, "")};${pv}${f.fw ? `;--fw:${f.fw}vw` : ""}"><div class="shot">${pic}</div>${cap}${note}</figure>`;
        if (note) bt += `<div class="pnote">${noteIn}</div>`;
      } // phones: the second card joins the words, above the clock
      if (c["card intro"] || c["card date"])
        bt += `<div class="feat card">${c["card intro"] ? `<p>${esc(c["card intro"])}</p>` : ""}${c["card date"] ? `<p class="date">${esc(c["card date"])}</p>` : ""}${c["card later"] ? `<p class="later">${esc(c["card later"])}</p>` : ""}${c["card text"] ? `<p>${esc(c["card text"])}${c["card link"] ? ` <a href="${ROUTES.guarantee}">${esc(c["card link"])}</a>` : ""}</p>` : ""}</div>`;
      if (sc.result && c.result)
        bt += `<div class="res"><h2 class="kin" id="r-${i}">${esc(c.result)}</h2>${c.school ? `<p class="s">${esc(c.school)}</p>` : ""}</div>`;
      html += piece("beat", i, i, bt);
    });
    const el = document.createElement("section");
    el.className =
      "sc" +
      (m === 0 ? " first" : "") +
      (m === lastM ? " last" : "") +
      ["side", "low", "result", "orbit"]
        .filter((k) => M[k])
        .map((k) => " " + k)
        .join("");
    el.id = `m-${n}`;
    el.tabIndex = -1;
    if (kin) el.setAttribute("aria-labelledby", `h-${n}`);
    else el.setAttribute("aria-label", M.name);
    // the message's length is the sum of its clips; a marker shows where each clip starts
    let ad = 0,
      ap = 0,
      marks = "";
    M.clips.forEach((c) => {
      marks += `<i class="mk" style="--ad:${ad}vh;--ap:${ap}vh"></i>`;
      ad += c.len[0];
      ap += c.len[1];
    });
    el.style.cssText = `--ld:${ad}vh;--lp:${ap}vh`;
    el.innerHTML = `${marks}<div class="copy">${html}</div>`;
    climb.appendChild(el);
  });
  SCENES.forEach((sc, i) => {
    const M = MESSAGES[sc.m],
      fr = document.createElement("div");
    fr.className =
      "frame" +
      (M.stack && sc.b === 0 ? " center" : "") +
      (sc.feat ? " has-feat" : "") +
      ["wide", "orbit", "test", "result", "night"]
        .filter((k) => sc[k])
        .map((k) => " " + k)
        .join("") +
      (M.side && sc.b === 0 ? " side" : "");
    fr.innerHTML = `<div class="cam"><video poster="${sc.film}${sfx}.jpg"${sc.ppos ? ` style="--pop:${sc.ppos}"` : ""} muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video><div class="scrim"></div></div>`;
    if (sc.zoom && !portrait) fr.style.setProperty("--z", sc.zoom); // reduced motion: the still frame sits as close (film.css)
    films.appendChild(fr);
  });

  // headlines: split into words (never letters, so kerning survives); the full line stays readable to screen readers
  document.querySelectorAll(".kin").forEach((k) => {
    const text = k.textContent.trim();
    k.innerHTML = `<span class="vh">${esc(text)}</span><span aria-hidden="true">${text
      .split(/\s+/)
      .map((w) => `<span class="w"><span>${esc(w)}</span></span>`)
      .join(" ")}</span>`;
  });

  // product screens load lazily: each holds a skeleton fill until its picture has arrived
  document.querySelectorAll(".shot img").forEach((img) => {
    if (img.complete && img.naturalWidth) return;
    const s = img.closest(".shot");
    s.classList.add("ld");
    const done = () => s.classList.remove("ld");
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
  const secs = [...climb.querySelectorAll(".sc")],
    frames = [...films.children],
    marks = [...climb.querySelectorAll(".mk")];
  const pieces = [...climb.querySelectorAll(".bt")].map((el) => ({
    el,
    role: el.dataset.role,
    from: +el.dataset.from,
    to: +el.dataset.to,
  }));
  const beatEl = (i) => pieces.find((p) => p.role === "beat" && p.from === i)?.el;
  const dip = document.createElement("div");
  dip.className = "dip";
  films.appendChild(dip);
  const vids = frames.map((f) => f.querySelector("video"));
  // a film that fails to load keeps its poster; the words and the button never wait for it
  vids.forEach((v) =>
    v.addEventListener("error", () => {
      v._failed = true;
    })
  );
  // the menu's one button carries the page's own call to action
  const ctaText = beatsOf(lastM)[0].button || beatsOf(0)[0].button;
  if (ctaText)
    document.querySelectorAll("[data-cta]").forEach((a) => {
      a.textContent = ctaText;
    });
  const dock = document.createElement("a"),
    foot = document.querySelector(".ft"),
    hd = document.querySelector(".hd");
  if (ctaText) {
    dock.className = "btn dock";
    dock.href = ROUTES.test;
    dock.textContent = ctaText;
    document.body.insertBefore(dock, foot);
  }
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  // "Skip the film" is the first tab stop on the page, ahead of the header, shown when it has focus (the hero's own copy of
  // the link is for pointers and stays out of the tab order)
  const skip0 = beatsOf(0)[0].skip;
  if (skip0) {
    const a = document.createElement("a");
    a.className = "skiptop";
    a.href = `#m-${MESSAGES.length}`;
    a.dataset.skip = "";
    a.textContent = skip0;
    document.body.prepend(a);
  }

  /* ---------- motion preference: a plain-text Pause / Play control in the header, on screen whenever a film can move ---------- */
  let held = false;
  try {
    held = localStorage.getItem("karman-pause") === "1";
  } catch (e) {}
  const motionBtns = document.querySelectorAll("[data-motion]");
  function setHeld(on, save) {
    held = on;
    root.classList.toggle("held", on);
    motionBtns.forEach((b) => {
      b.querySelector(".lbl").textContent = on ? SITE.play || "Play" : SITE.pause || "Pause";
      b.hidden = still;
    });
    if (on) {
      stopOpening();
      vids.forEach((v) => v.pause());
      idle = false;
      restOff();
    }
    if (save)
      try {
        localStorage.setItem("karman-pause", on ? "1" : "0");
      } catch (e) {}
  }
  motionBtns.forEach((b) => b.addEventListener("click", () => setHeld(!held, true)));
  // one motion control on screen at a time: while the footer's own is in view, the header's steps aside (keeping its place)
  const footMotion = document.querySelector(".ft [data-motion]");
  if (footMotion && window.IntersectionObserver)
    new IntersectionObserver(([e]) =>
      document.querySelector(".hd").classList.toggle("footmotion", e.isIntersecting)
    ).observe(footMotion);
  const themeBtn = document.querySelector("[data-theme-toggle]");
  const paintTheme = () => themeBtn.setAttribute("aria-pressed", root.dataset.theme === "light");
  themeBtn.addEventListener("click", () => {
    const light = root.dataset.theme !== "light";
    if (light) root.dataset.theme = "light";
    else delete root.dataset.theme;
    try {
      localStorage.setItem("karman-theme", light ? "light" : "dark");
    } catch (e) {}
    paintTheme();
  });
  paintTheme();

  /* ---------- menu sheet (phones) ---------- */
  const sheet = document.getElementById("menu"),
    menuBtn = document.querySelector(".menu");
  let menuOpen = false;
  function menu(open) {
    menuOpen = open;
    sheet.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open);
    root.classList.toggle("lock", open);
    (open ? sheet.querySelector(".close") : menuBtn).focus();
  }
  menuBtn.addEventListener("click", () => menu(!menuOpen));
  sheet.querySelector(".close").addEventListener("click", () => menu(false));
  sheet.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menu(false)));

  /* ---------- geometry ---------- */
  const portraitUI = () => innerWidth <= 760;
  let vh = innerHeight,
    geo = [],
    need = [];
  const clipTop = (i) => secs[SCENES[i].m].offsetTop + marks[i].offsetTop; // live, from the DOM
  function measure() {
    setFade();
    vh = innerHeight;
    geo = SCENES.map((_, i) => ({ top: clipTop(i) }));
    fitScreens();
    fhAt = "";
    setFilmHeight(filmOn);
    placeLine();
  }
  /* phones: how tall the film is. The band under it holds the words. Every clip of a message gets the same height, so a
     headline that holds through the message never jumps at a cut; the night and the orbit, with no face, fill the screen */
  const baseFH = () => Math.round(vh * (vh <= 760 ? 0.53 : 0.56));
  const full = (i) => SCENES[i].orbit || SCENES[i].night;
  function ownHeight(i) {
    if (i === 0) {
      const st = secs[0].querySelector(".stack");
      return Math.round(clamp(vh - (st ? st.offsetHeight : 0) - 16, 0.4 * vh, baseFH()));
    }
    if (SCENES[i].result) return Math.round(vh * 0.68); // a result needs only a few lines, so its film is taller and the student larger
    // a product screen takes up to a sixth of the screen from the film (never below 40%) when it needs the room to draw near its real size
    if (need[i]) return Math.round(clamp(vh - need[i], 0.4 * vh, baseFH()));
    return baseFH();
  }
  const filmHeight = (i) =>
    full(i)
      ? vh
      : Math.min(
          ...SCENES.map((s, j) => j)
            .filter((j) => SCENES[j].m === SCENES[i].m && !full(j))
            .map(ownHeight)
        );
  /* the hold: before a clip's screen or card arrives, the band holds only its headline, clock and any second card. The
     film then grows down to them, so they sit right above the button's reserve and the band never shows an empty stretch;
     as the screen arrives the film's edge eases back up to the message's height and the screen rises into the room */
  const holdAt = (i, y) => portraitUI() && hasCard(i) && y < split(i);
  function holdHeight(i) {
    const kin = kinFor(i),
      clk = pieces.find((p) => p.role === "clock" && p.from <= i && p.to >= i),
      note = beatEl(i)?.querySelector(".pnote");
    const group =
      (kin ? kin.offsetHeight + 16 : 0) +
      (clk ? clk.el.querySelector(".time").offsetHeight : 0) +
      (note ? note.offsetHeight + 14 : 0);
    return Math.round(clamp(vh - DOCKR() - group - 18, filmHeight(i), 0.8 * vh));
  }
  let fhAt = "",
    filmOn = 0;
  function setFilmHeight(i, y = lastY) {
    const hold = holdAt(i, y),
      key = i + (hold ? "h" : "");
    if (fhAt === key) return;
    const within = fhAt === String(i) || fhAt === i + "h";
    fhAt = key;
    if (!portraitUI()) {
      root.style.removeProperty("--fh");
      films.classList.remove("full");
      return;
    }
    // only the hold's own change eases; a cut to another clip (inside the dip) sets the new height at once
    root.classList.toggle("fhease", within && !REC && !still);
    root.style.setProperty("--fh", (hold ? holdHeight(i) : filmHeight(i)) + "px");
    films.classList.toggle("full", !!full(i));
    if (SCENES[i].orbit) placeLine();
  }
  // the message headline on screen during clip i (phones: the screen or card sits under it)
  const kinFor = (i) => {
    const p = pieces.find((p) => p.role === "head" && p.from <= i && p.to >= i);
    return p && p.el.querySelector(".kin");
  };
  // phones: each product screen is drawn as wide as the band allows once its caption is set under it, and never below
  // 0.85 of its design width (or the band's full width) so its smallest text stays readable; the film above gives way for it
  const DOCKR = () => (portraitUI() && ctaText ? 72 : 14); // phones: the band's foot stays clear for the floating button (--dockr)
  function fitScreens() {
    const fit = [],
      bot = DOCKR();
    // phones: a clock sits right under its message's headline (none over the review, whose screen title carries it)
    const tm = climb.querySelector(".time");
    root.style.setProperty("--ch", (tm ? tm.offsetHeight : 40) + "px");
    pieces.forEach((p) => {
      if (p.role !== "clock") return;
      const kin = portraitUI() && kinFor(p.to);
      p.el.style.setProperty("--kh", (kin ? kin.offsetHeight + 16 : 0) + "px");
    });
    const rs = [...climb.querySelectorAll(".res")],
      pf = climb.querySelector(".mproof");
    root.style.setProperty("--rh", Math.max(0, ...rs.map((r) => r.offsetHeight)) + "px");
    root.style.setProperty("--ph", (pf ? pf.offsetHeight : 0) + "px");
    SCENES.forEach((sc, i) => {
      const bw = beatEl(i);
      need[i] = 0;
      if (!bw) return;
      const f = bw.querySelector(".feat:not(.card)"),
        card = bw.querySelector(".feat.card"),
        kin = kinFor(i);
      const kh = portraitUI() && kin && (f || card) ? kin.offsetHeight + 16 : 0;
      bw.style.setProperty("--kh", kh + "px");
      if (card && portraitUI()) need[i] = Math.ceil(card.offsetHeight + kh + bot + 8);
      if (!f) return;
      if (!portraitUI()) {
        f.style.removeProperty("--fitw");
        if (f.matches(".lap")) return f.style.removeProperty("--dw");
        // wide screens: a phone screen as wide as its design (up to 30% of the window), narrowed until it and the
        // captions under it fit between the header and the floating button (104px clear at top and bottom)
        const r = parseFloat(getComputedStyle(f).getPropertyValue("--r")),
          w0 = Math.min(sc.feat.crop[2], 0.3 * innerWidth);
        const capsH = () =>
          [...f.children]
            .filter((c) => !c.matches(".shot"))
            .reduce((h, c) => h + c.offsetHeight + 12, 0);
        let dw = w0;
        for (let k = 0; k < 3; k++) {
          f.style.setProperty("--dw", Math.round(dw) + "px");
          dw = Math.min(w0, (vh - 208 - capsH()) * r);
        }
        return f.style.setProperty("--dw", Math.round(dw) + "px");
      }
      f.style.removeProperty("--dw");
      const P = sc.feat.psrc,
        dw = P ? P[1] : sc.feat.crop[2];
      if (P) setVars(f, cropVars([0, 0, P[1], P[2]], [P[1]], "p")); // the whole phone layout first
      const r = parseFloat(getComputedStyle(f).getPropertyValue("--pr"));
      const cap = f.querySelector("figcaption"),
        W = f.clientWidth || innerWidth - 32,
        capH = cap ? cap.offsetHeight + 10 : 0;
      need[i] = Math.ceil(Math.min(W, 0.85 * dw) / r + capH + kh + bot + 12);
      fit.push([f, i, W, r, kh, capH, dw]);
    });
    /* a screen that would draw below 0.85 of its design width (its smallest text under about 11px) switches to its tighter
       phone crop (ptight: the quiz stem and two answers, or two stat tiles), which can be drawn near full size */
    const fitW = ([, i, W, r, kh, capH]) =>
      Math.min(W, (vh - filmHeight(i) - kh - bot - 12 - capH) * r);
    fit.forEach((e) => {
      const [f, i, W, , kh, capH, dw] = e,
        T = SCENES[i].feat.ptight;
      if (!T || fitW(e) >= 0.85 * dw) return;
      setVars(f, cropVars(T, [SCENES[i].feat.psrc[1]], "p"));
      e[3] = T[2] / T[3];
      need[i] = Math.ceil(Math.min(W, 0.85 * dw) / e[3] + capH + kh + bot + 12);
    });
    // the film height of a message depends on all its clips' needs, so the screens are sized once every need is known
    fit.forEach((e) => e[0].style.setProperty("--fitw", Math.round(fitW(e)) + "px"));
  }
  // the orbit film's airglow band starts 26.5% down the frame (measured on c9, NASA master); the line sits on its upper edge
  const kline = document.querySelector(".kline"),
    tip = document.getElementById("kline-tip");
  const OVER = 0.03; // the camera box's overscan on each side (.frame .cam inset)
  function placeLine() {
    if (!kline) return;
    const W = innerWidth * (1 + 2 * OVER),
      Hc = vh * (1 + 2 * OVER),
      ar = portrait ? 0.6 : 16 / 9;
    const s = Math.max(W / (Hc * ar), 1),
      Hd = Hc * s; // cover: the film's drawn height inside the camera box
    let y = -OVER * vh + (Hc - Hd) / 2 + 0.265 * Hd - 3;
    kline._y = y; // where the line sits on screen, for the moment it leaves
    // as the footer arrives the closing words scroll up with their message; the line stays on the band, which does not
    y -= kline.parentElement.getBoundingClientRect().top;
    // follow the film's slow drift (a CSS scale and lift about the frame's centre), so the line stays on the band
    const m = getComputedStyle(vids[last]).transform.match(/matrix\(([^)]+)\)/);
    if (m) {
      const [, , , d, , ty] = m[1].split(",").map(Number);
      y = vh / 2 + (y - vh / 2) * d + ty;
    }
    const ky = `${Math.round(y)}px`;
    if (kline._ky !== ky) {
      kline._ky = ky;
      kline.parentElement.style.setProperty("--ky", ky);
    }
  }
  // while the orbit is on screen, re-place the line every frame as the film drifts
  (function follow() {
    if (kline && frames[last]._show && !still) placeLine();
    requestAnimationFrame(follow);
  })();

  /* ---------- the films: crossfade by scroll, scrub by scroll, keep playing when the reader stops ---------- */
  // film i takes over when its clip is 0.85 screens away: over 10% of a screen the picture dips to black, the films swap at
  // the darkest point, and the new one rises out of the dark (on phones the cut comes a little earlier, 0.95). The outgoing
  // words hold until the cut and the new words pin at it (PIN = the cut, the same as --pin in the CSS)
  let FADE_AT = 0.85,
    PIN = 0.8;
  const FADE = 0.1;
  function setFade() {
    const ph = innerWidth <= 760;
    FADE_AT = ph ? 0.95 : 0.85;
    PIN = FADE_AT - FADE / 2;
  }
  setFade();
  const cutAt = (i) => (geo[i + 1] ? geo[i + 1].top : clipTop(i + 1)) - (FADE_AT - FADE / 2) * vh; // clip i hands over to i + 1
  const pinAt = (i) => (i === 0 ? -Infinity : cutAt(i - 1)); // clip i's words pin
  // where the scroll plays film i: from where it starts to rise until it has handed over to the next
  const filmA = (i) => (i === 0 ? 0 : clipTop(i) - FADE_AT * vh);
  const filmB = (i) =>
    i === last ? root.scrollHeight - innerHeight : clipTop(i + 1) - (FADE_AT - FADE) * vh;
  // where playback for a reader at rest stops (idleTo); a film the scroll has already carried past it rests where it is
  const idleEnd = (v, i, end) => (SCENES[i].idleTo ? Math.min(SCENES[i].idleTo, end) : end);
  const spanOf = (v, i) => {
    const s = spanFor(i) || [0, v.duration];
    return [Math.max(s[0], SCENES[i].lead || 0), Math.min(s[1], v.duration)];
  };
  // load a film ahead of time and park it on the first frame of its span, so the cut never shows the clip's opening frame
  const warm = (v) => {
    if (v._warm || still) return;
    v._warm = true;
    const i = vids.indexOf(v);
    v.preload = "auto";
    v.src = `${SCENES[i].film}${sfx}.mp4`;
    v.addEventListener(
      "loadedmetadata",
      () => {
        const t = spanOf(v, i)[0];
        if (v.paused && !v._auto && v.currentTime < t) v.currentTime = t;
        applyFilm(i);
      },
      { once: true }
    );
  };
  vids.forEach((v, i) => {
    v.addEventListener("seeked", () => {
      if (v._target != null && Math.abs(v.currentTime - v._target) > 1 / 30 && v.paused)
        v.currentTime = v._target;
    });
    v.addEventListener("timeupdate", () => {
      // idle playback slows into its last frame instead of stopping dead
      if (v.paused || v._auto) return;
      const [from, end] = spanOf(v, i),
        to = idleEnd(v, i, end),
        left = to - v.currentTime;
      if (left < Math.min(1.4, 0.4 * (to - from)) && !v._slow && HAS_GSAP) {
        v._slow = true;
        gsap.to(v, { playbackRate: 0.3, duration: 1.2, ease: "power1.out" });
      }
      if (left < 0.08) {
        v.pause();
        if (idle) restOn(i);
      }
      if (SCENES[i].result) syncResults();
    });
    v.addEventListener("pause", () => {
      if (HAS_GSAP) gsap.killTweensOf(v);
      v._slow = false;
      v.playbackRate = 1;
    });
    if (SCENES[i].result) v.addEventListener("seeked", () => syncResults());
  });
  /* the dip: the half before the cut follows the scroll; at the cut the screen holds dark only until the new film's
     frame is ready, then rises out of it on a short timer. A reader who stops inside the dip is never left on black:
     after a short rest the dip clears back to the film on screen. */
  const DIP = { cur: 0, goal: 0, mode: "follow", t0: 0, from: 0, wait: null };
  const RISE = 350,
    HOLD_MAX = 600;
  function paintDip(o) {
    const d = o.toFixed(3);
    DIP.cur = o;
    if (dip._d !== d) {
      dip.style.opacity = d;
      dip._d = d;
    }
    paintWords();
  }
  /* no word crosses a cut: over the half of the dip before it, a piece's words go dark with its film (by scroll position,
     never a timer that can lag a brisk scroll), and from the cut on they are gone in the same frame as the film. Inside a
     message the headline spans several clips, so it holds through their dips. Nothing shows before its own film is on. */
  function paintWords(y = lastY) {
    pieces.forEach((p) => {
      let o = 1;
      if (p.from > 0 && y < pinAt(p.from)) o = 0;
      else if (p.to < last) {
        const c = cutAt(p.to);
        o = y >= c ? 0 : y > c - (FADE / 2) * vh ? 1 - DIP.cur : 1;
      }
      const d = o.toFixed(2);
      if (p.el._o !== d) {
        p.el._o = d;
        p.el.style.opacity = d;
      }
    });
  }
  function dipCut(v) {
    // the films swap now: hold dark until the new frame is drawn, then rise out of it
    if (REC) return paintDip(0);
    DIP.mode = "cut";
    DIP.t0 = performance.now();
    DIP.from = Math.max(DIP.cur, 0.85);
    DIP.wait = v;
    paintDip(DIP.from);
    dipLoop();
  }
  function dipRest() {
    if (DIP.mode !== "follow" || DIP.cur < 0.05) return;
    DIP.mode = "rest";
    DIP.t0 = performance.now();
    DIP.from = DIP.cur;
    dipLoop();
  }
  let dipRaf = 0;
  function dipLoop() {
    if (!dipRaf) dipRaf = requestAnimationFrame(dipTick);
  }
  function dipTick(now) {
    dipRaf = 0;
    if (DIP.mode === "follow") {
      // trail the scroll by a few frames so a sudden change never flashes
      const o = DIP.cur + (DIP.goal - DIP.cur) * 0.35;
      paintDip(Math.abs(o - DIP.goal) < 0.01 ? DIP.goal : o);
      if (DIP.cur !== DIP.goal) dipLoop();
      return;
    }
    if (DIP.mode === "cut" && DIP.wait) {
      const v = DIP.wait,
        ready = still || !v.src || v._failed || (v.readyState >= 2 && !v.seeking);
      if (!ready && now - DIP.t0 < HOLD_MAX) return dipLoop();
      DIP.wait = null;
      DIP.t0 = now;
    }
    const k = clamp((now - DIP.t0) / RISE),
      o = DIP.from * (1 - k) * (1 - k); // ease out of the dark
    if (DIP.mode === "cut" && DIP.goal > o) {
      DIP.mode = "follow";
      return dipLoop();
    } // already heading into the next cut
    paintDip(o);
    if (k < 1) dipLoop();
    else DIP.mode = DIP.mode === "rest" ? "rested" : "follow";
  }
  /* the film and the camera follow the scroll through ScrollTrigger's scrub, with a short smoothing so a wheel's steps play
     as motion; the page itself scrolls natively. prog[i] is how far through its range clip i's film is. */
  const prog = SCENES.map(() => ({ k: 0 }));
  let told = false; // the line's note opens by itself once, the first time the line draws (not after "Skip the film")
  function applyFilm(i) {
    const f = frames[i],
      v = vids[i],
      sc = SCENES[i],
      k = prog[i].k;
    if (!f._show || still) return;
    if (!sc.orbit) {
      // the camera cranes up slowly as the clip passes; test day starts lower and closer (her face sits near the top)
      const t = sc.wide
        ? `translate3d(0, ${(-1 + 2 * k).toFixed(2)}%, 0) scale(1.01)`
        : sc.test
          ? `translate3d(0, ${(1 + 1.5 * k).toFixed(2)}%, 0) scale(1.02)`
          : `translate3d(0, ${(-2 + 4 * k).toFixed(2)}%, 0) scale(${((1.05 - 0.04 * k) * ((!portrait && sc.zoom) || 1)).toFixed(4)})`;
      if (f.firstChild._t !== t) {
        f.firstChild.style.transform = t;
        f.firstChild._t = t;
      }
    }
    if (v._auto || !v.duration) return;
    const [from, to] = spanOf(v, i),
      base = from + k * (to - from - 0.05);
    v._base = base;
    if (!v.paused) {
      v.pause();
      v._ahead = Math.max(0, v.currentTime - base);
    } // scrolling again: carry on from the frame it reached
    seek(v, Math.min(to - 0.05, base + (v._ahead || 0)));
    if (sc.result) syncResults();
  }
  let lastY = -1,
    velocity = 0,
    dir = 1;
  function update(y = scrollY) {
    const dy = y - (lastY < 0 ? y : lastY);
    velocity = Math.abs(dy);
    if (dy) dir = Math.sign(dy);
    lastY = y;
    const alpha = geo.map((g, i) =>
      i === 0 ? 1 : clamp((y - (g.top - FADE_AT * vh)) / (FADE * vh))
    );
    // only the half of the dip on the reader's side of the cut follows the scroll
    DIP.goal = Math.max(
      0,
      ...alpha.slice(1).map((a) => ((dir > 0 ? a < 0.5 : a >= 0.5) ? Math.sin(Math.PI * a) : 0))
    );
    if (REC) paintDip(DIP.goal);
    else if (
      DIP.mode === "follow" ||
      ((DIP.mode === "rest" || DIP.mode === "rested") && velocity > 1)
    ) {
      DIP.mode = "follow";
      dipLoop();
    }
    let cutTo = null;
    frames.forEach((f, i) => {
      const a = alpha[i] >= 0.5 ? 1 : 0,
        covered = i < last && alpha[i + 1] >= 0.5,
        show = a > 0 && !covered,
        v = vids[i];
      if (f._a !== a) {
        f.style.opacity = a;
        f._a = a;
      }
      if (f._show !== show) {
        if (show && f._show === false) cutTo = v;
        f.style.visibility = show ? "visible" : "hidden";
        f._show = show;
        if (!show) {
          v.pause();
          v._ahead = 0;
        } else applyFilm(i);
      }
      if (geo[i].top - y < 2.5 * vh) warm(v); // load a film about a screen and a half before it is needed
    });
    if (cutTo) dipCut(cutTo);
    paintWords(y);
    for (let i = last; i >= 0; i--)
      if (frames[i]._show) {
        filmOn = i;
        setFilmHeight(i, y);
        break;
      }
    // phones: the opening headline is centred over the hero, then sits left like every other message once the bus clip's
    // clock and screen join it (it swaps inside the cut's dip, with a short fade so it never jumps)
    const band = portraitUI() && filmOn >= 1;
    if (band !== secs[0]._band) {
      secs[0]._band = band;
      secs[0].classList.toggle("band", band);
      const k = secs[0].querySelector(".stack .kin");
      if (k && HAS_GSAP && !REC && !still && filmOn <= 1)
        gsap.fromTo(
          k,
          { opacity: 0 },
          { opacity: 1, duration: 0.35, ease: "power1.out", overwrite: true }
        );
    }
    if (frames[last]._show) placeLine(); // the line keeps to the airglow in the same frame as the scroll
    dockAt(y);
    syncResults();
    hd.classList.toggle("solid", foot.getBoundingClientRect().top < 72);
  }
  /* the floating button (wide screens): on from just after the opening button leaves (the first cut) until just before the
     closing one arrives, off while the footer is in view. It switches off at once, so two buttons never share the screen, but
     switches on only after the reader has been inside its range for a quarter second, and the range is a little narrower for
     coming on than for staying on, so a reader hovering at an edge never sees it blink. */
  let dockOn = false,
    dockWant = false,
    dockTimer = 0;
  function dockAt(y) {
    if (!ctaText) return;
    const footIn = foot.offsetTop - y < vh + 24,
      m = dockOn ? 0 : 0.06 * vh;
    const want = !footIn && y > cutAt(0) + 0.02 * vh + m && y < pinAt(last) - 0.03 * vh - m;
    if (!want) {
      clearTimeout(dockTimer);
      dockWant = false;
      if (dockOn) {
        dockOn = false;
        dock.classList.remove("on");
      }
      return;
    }
    if (dockOn || dockWant) return;
    dockWant = true;
    const go = () => {
      dockWant = false;
      dockOn = true;
      dock.classList.add("on");
    };
    if (REC) go();
    else dockTimer = setTimeout(go, 250);
  }
  function seek(v, t) {
    v._target = t;
    if (v.seeking || Math.abs(v.currentTime - t) <= 1 / 30) return;
    if (velocity > 60 && v.fastSeek) v.fastSeek(t);
    else v.currentTime = t;
  }

  /* ---------- the words: one reveal style (a short rise, one easing), triggered by position, so they always settle ---------- */
  const T = (s) => (REC ? 0 : still ? Math.min(s, 0.3) : s);
  const Y = (v) => (still ? 0 : v);
  const TO = {
    words: { yPercent: 0, opacity: 1 },
    rest: { y: 0, opacity: 1 },
    digits: { yPercent: 0 },
  };
  // in the frame-exact recording mode every reveal lands instantly, so screenshots show settled states
  const tween = (els, props, vars) => {
    if (REC) {
      gsap.killTweensOf(els);
      gsap.set(els, props);
    } else gsap.to(els, { ...props, ...vars, overwrite: true });
  };
  function reveal(els, kind) {
    if (!els.length) return null;
    const from = {
      words: { yPercent: Y(105), opacity: 0 },
      rest: { y: Y(24), opacity: 0 },
      digits: { yPercent: Y(105) },
    }[kind];
    gsap.set(els, from);
    let on = false;
    return {
      show(delay = 0) {
        if (on) return;
        on = true;
        els.forEach((e) => {
          if (kind === "digits" || +gsap.getProperty(e, "opacity") < 0.05) gsap.set(e, from);
        });
        tween(els, TO[kind], { duration: T(0.9), ease: "expo.out", delay, stagger: 0.06 });
      },
      hide(d = 1) {
        if (!on) return;
        on = false;
        const to =
          kind === "digits"
            ? { yPercent: Y(d > 0 ? -105 : 105) }
            : kind === "words"
              ? { yPercent: Y(d > 0 ? -30 : 40), opacity: 0 }
              : { y: Y(d > 0 ? -24 : 24), opacity: 0 };
        tween(els, to, { duration: T(0.35), ease: "power2.in", stagger: 0.02 });
      },
    };
  }
  function when(trigger, groups, { start, end }) {
    groups = groups.filter(([g]) => g);
    if (!groups.length) return;
    const go = () => groups.forEach(([g, delay]) => g.show(delay)),
      stop = (d) => groups.forEach(([g]) => g.hide(d));
    ScrollTrigger.create({
      trigger,
      start,
      end,
      onEnter: go,
      onEnterBack: go,
      onLeave: () => stop(1),
      onLeaveBack: () => stop(-1),
    });
  }
  // the scroll position at which film i reaches time t (the inverse of the scrub)
  const scrollAtTime = (i, t) => {
    const [from, to] = spanFor(i),
      A = filmA(i),
      B = filmB(i);
    return Math.round(A + clamp((t - from) / (to - from - 0.05)) * (B - A));
  };
  const hasCard = (i) => !!beatEl(i)?.querySelector(".feat");
  // phones: the clock (and any second card) sits under the headline first, then the screen or card rises into its place
  const split = (i) => Math.round(pinAt(i) + 0.42 * vh);
  // a result rises once its film shows the student and the lettering (words: the film time when both are in frame);
  // on phones the result has the band to itself and the phone span holds only clean frames, so it rises at the cut
  const resultAt = (i) =>
    portraitUI() ? pinAt(i) : Math.max(pinAt(i), scrollAtTime(i, SCENES[i].words[0]));
  /* a result follows its film, not only the scroll: it is on while its clip is on screen and the film (scrubbed, or playing
     on for a reader at rest) has reached the student. The message's proof line (the results' format) is on only while a
     result is: it leaves in the dips and waits for each student, so it never sits alone under a student with no score.
     A film that hasn't loaded falls back to the scroll position, so the words never wait for it. */
  const resG = {};
  let proofG = null;
  const groupsOn = (g, on) => {
    if (g.on === on) return;
    g.on = on;
    g.groups.forEach(([x, d]) => (on ? x.show(d) : x.hide(dir)));
  };
  function syncResults() {
    if (still || !HAS_GSAP) return;
    let any = false;
    for (const k in resG) {
      const i = +k,
        v = vids[i],
        f = frames[i];
      const ready = v.duration > 0 && !v._failed,
        t = v.seeking && v._target != null ? v._target : v.currentTime;
      const on =
        !!f._show &&
        (ready
          ? t >= (portraitUI() ? spanFor(i)[0] : SCENES[i].words[0]) - 0.03
          : lastY >= resultAt(i));
      groupsOn(resG[k], on);
      if (on) any = true;
    }
    if (proofG) groupsOn(proofG, any);
  }
  const own = (p, sel) => [...p.el.querySelectorAll(sel)].filter((e) => e.closest(".bt") === p.el);

  if (HAS_GSAP) {
    gsap.registerPlugin(ScrollTrigger);
    // the closing words stay as the footer rises and scroll up with their message; they leave as the headline nears the header
    const lastSec = secs[lastM],
      kinTop = () => {
        const k = lastSec.querySelector(".stack .kin");
        return k ? k.offsetTop : 0.3 * vh;
      };
    // on phones they leave as the headline reaches the bright airglow under the line, so no white text crosses it (white on cyan)
    const e0 = () => {
      const base = lastSec.offsetTop + lastSec.offsetHeight - vh + kinTop() - 84;
      return portraitUI()
        ? Math.min(base, base + 84 - ((kline && kline._y) || 0.26 * vh) - 40)
        : base;
    };
    const endOf = (i) => (i === last ? e0() : cutAt(i));
    const S = (i) => () => (i === 0 ? -1 : pinAt(i));
    pieces.forEach((p) => {
      const sec = p.el.closest(".sc");
      const words = reveal(own(p, ".kin .w > span"), "words"),
        rest = reveal(own(p, ".lede, .act, .proof, .time, .pnote, .res .s, .mproof"), "rest");
      const digits = reveal(own(p, ".time .c > span"), "digits"),
        feat = reveal(own(p, ".feat"), "rest");
      const E = () => endOf(p.to);
      if (p.role === "head")
        when(sec, [[words, p.from === 0 ? 0.2 : 0]], { start: S(p.from), end: E });
      if (p.role === "more") when(sec, [[rest, 0.6]], { start: S(0), end: E });
      if (p.role === "clock") {
        const st = SCENES[p.from].clockAt
          ? () => scrollAtTime(p.from, SCENES[p.from].clockAt)
          : S(p.from);
        when(
          sec,
          [
            [digits, 0.1],
            [rest, 0.25],
          ],
          { start: st, end: () => (portraitUI() && hasCard(p.to) ? split(p.to) : E()) }
        );
      }
      if (p.role === "proof") {
        if (still) when(sec, [[rest, 0.25]], { start: () => resultAt(p.from), end: E });
        else proofG = { from: p.from, groups: [[rest, 0.25]].filter(([g]) => g), on: false };
      }
      if (p.role === "beat") {
        const i = p.from,
          res = SCENES[i].result;
        if (res && still)
          when(
            sec,
            [
              [words, 0],
              [rest, 0.25],
            ],
            { start: () => resultAt(i), end: E }
          );
        else if (res)
          resG[i] = {
            groups: [
              [words, 0],
              [rest, 0.25],
            ].filter(([g]) => g),
            on: false,
          };
        else {
          when(sec, [[rest, 0.25]], { start: S(i), end: () => (portraitUI() ? split(i) : E()) }); // the phone's second card
          // product screens arrive with their clip on wide screens; on phones they take the clock's place
          when(sec, [[feat, 0.15]], {
            start: () => (portraitUI() ? split(i) + 1 : S(i)()),
            end: E,
          });
        }
      }
    });
    if (kline) {
      // the line draws itself once the closing words hold, says what it is once, then waits for a tap
      gsap.set(kline, { "--draw": 0, visibility: "hidden" });
      const close = () => {
        tip.classList.remove("open");
        kline.setAttribute("aria-expanded", "false");
      };
      // it leaves just before the rising headline would reach it; the words carry on up to the header
      const lineEnd = () =>
        Math.min(
          e0(),
          lastSec.offsetTop + lastSec.offsetHeight - vh + kinTop() - (kline._y || 0.26 * vh) - 34
        );
      ScrollTrigger.create({
        trigger: lastSec,
        start: "top 10%",
        end: lineEnd,
        onEnter: draw,
        onEnterBack: draw,
        onLeave: undraw,
        onLeaveBack: undraw,
      });
      function draw() {
        kline.style.visibility = "visible";
        if (REC) return gsap.set(kline, { "--draw": 1 });
        gsap.to(kline, {
          "--draw": 1,
          duration: T(1.2),
          ease: "power2.inOut",
          overwrite: true,
          onComplete: () => {
            if (told || REC || still) return;
            told = true;
            tip.classList.add("open");
            setTimeout(() => {
              if (kline.getAttribute("aria-expanded") !== "true") close();
            }, 2500);
          },
        });
      }
      function undraw() {
        close();
        if (REC) gsap.set(kline, { "--draw": 0, visibility: "hidden" });
        else
          gsap.to(kline, {
            "--draw": 0,
            duration: 0.3,
            overwrite: true,
            onComplete: () => {
              kline.style.visibility = "hidden";
            },
          });
      }
      kline.addEventListener("click", () => {
        const open = !tip.classList.contains("open");
        tip.classList.toggle("open", open);
        kline.setAttribute("aria-expanded", open);
      });
      addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });
      addEventListener("pointerdown", (e) => {
        if (!kline.contains(e.target)) close();
      });
    }
    // the scrub: one ScrollTrigger per film, its range in pixels, a quarter second of smoothing (none when recording)
    if (!still)
      SCENES.forEach((_, i) =>
        gsap.to(prog[i], {
          k: 1,
          ease: "none",
          onUpdate: () => applyFilm(i),
          scrollTrigger: {
            start: () => filmA(i),
            end: () => Math.max(filmA(i) + 1, filmB(i)),
            scrub: REC ? true : 0.25,
            invalidateOnRefresh: true,
          },
        })
      );
    ScrollTrigger.addEventListener("refreshInit", measure);
  } else if (kline) {
    kline.style.setProperty("--draw", 1);
    kline.addEventListener("click", () => {
      const open = !tip.classList.contains("open");
      tip.classList.toggle("open", open);
      kline.setAttribute("aria-expanded", open);
    });
  }
  if (still && kline) kline.style.setProperty("--draw", 1);

  measure();
  document.fonts?.ready.then(() => {
    measure();
    update();
    if (HAS_GSAP) ScrollTrigger.refresh();
  }); // captions re-wrap once the fonts arrive
  addEventListener("resize", () => {
    measure();
    update();
  });
  if (HAS_GSAP)
    ScrollTrigger.addEventListener("refresh", () => {
      measure();
      update();
    });

  // where a clip's words hold: the place the copy editor, keyboard focus and "Skip the film" bring the reader to
  function clipHold(i) {
    if (i === 0) return 0;
    if (i === last) return Math.round(geo[last].top);
    const A = pinAt(i),
      C = cutAt(i);
    let y = A + 0.55 * (C - A);
    if (SCENES[i].words) y = Math.max(y, resultAt(i) + 0.05 * vh);
    if (SCENES[i].clockAt) y = Math.max(y, scrollAtTime(i, SCENES[i].clockAt) + 0.05 * vh);
    return Math.round(Math.min(y, C - 0.08 * vh));
  }
  const goTo = (y) => scrollTo({ top: y, behavior: "instant" });

  if (REC) {
    window.__go = async (y) => {
      scrollTo(0, y);
      update(y);
      ScrollTrigger.update();
      await Promise.all(
        vids
          .filter((v) => v.seeking)
          .map(
            (v) =>
              new Promise((r) => {
                v.addEventListener("seeked", r, { once: true });
                setTimeout(r, 900);
              })
          )
      );
    };
    window.__max = () => root.scrollHeight - innerHeight;
    window.__hold = (m, b = 0) => clipHold(first(m) + b);
    // the clips, for the checking scripts: film, span used here, and the scroll position at which it reaches time t
    window.__clips = () =>
      SCENES.map((s, i) => ({
        film: s.film,
        m: s.m,
        eye: s.eye,
        span: spanFor(i),
        pin: Math.round(pinAt(i)),
        cut: i < last ? Math.round(cutAt(i)) : __max(),
      }));
    window.__at = (i, t) => scrollAtTime(i, t);
    vids.forEach(warm);
    update(0);
    return;
  }

  // the header (with the pause control) stays put; scrolling only moves the film and the words
  let ticking = false;
  function onScroll() {
    update(scrollY);
    ticking = false;
  }
  addEventListener(
    "scroll",
    () => {
      activity();
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  update();

  // when the reader stops scrolling, the film on screen keeps playing in real time from where it is, once, then rests
  let lastScroll = performance.now(),
    idle = false;
  // the slow camera push for a reader at rest (see .frame.rest); the orbit has its own drift, which the line follows
  let restAt = -1,
    restTimer = 0;
  function restOn(i) {
    if (restAt === i || SCENES[i].orbit || still || held) return;
    restOff();
    restAt = i;
    frames[i].classList.add("rest");
    restTimer = setInterval(() => frames[i].classList.toggle("back"), 12000);
  }
  function restOff() {
    if (restAt < 0) return;
    clearInterval(restTimer);
    frames[restAt].classList.remove("rest", "back");
    restAt = -1;
  }
  function activity() {
    lastScroll = performance.now();
    stopOpening();
    restOff();
    if (idle) {
      idle = false;
      vids.forEach((v) => {
        if (!v.paused && !v._auto) {
          v.pause();
          v._ahead = Math.max(0, v.currentTime - (v._base ?? v.currentTime));
        }
      });
    }
  }
  const topFilm = () => {
    for (let i = last; i >= 0; i--) if (frames[i]._show && frames[i]._a >= 0.5) return vids[i];
    return null;
  };
  setInterval(() => {
    if (!document.hidden && performance.now() - lastScroll >= 450) dipRest(); // stopped inside a dip: clear it to the film on screen
    if (held || still || document.hidden || idle || performance.now() - lastScroll < 450) return;
    idle = true;
    const v = topFilm(),
      i = vids.indexOf(v);
    if (!v || v._auto || !v.duration || v._failed) return;
    const [from, end] = spanOf(v, i),
      to = idleEnd(v, i, end),
      left = to - v.currentTime;
    if (left < 0.2) return restOn(i); // the film has played out: the camera carries on
    // a short span (test day, the results) plays slowly, so a reader at rest still sees it move for a few seconds;
    // with little film left the camera push starts at once as well
    if (left < 1.5) restOn(i);
    const go = () => {
      if (idle && !held) {
        v.playbackRate = left < 1.5 ? 0.35 : to - from < 2.5 ? 0.5 : 1;
        v.play().catch(() => {});
      }
    };
    v.readyState >= 3 ? go() : v.addEventListener("canplay", go, { once: true });
  }, 150);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      vids.forEach((v) => v.pause());
      idle = false;
    }
  });

  // keyboard focus brings its clip to the point where its words hold, so nothing is focused while invisible
  document.addEventListener("focusin", (e) => {
    const p = e.target.closest?.(".bt");
    if (!p || !e.target.matches(":focus-visible")) return;
    const from = +p.dataset.from,
      to = +p.dataset.to,
      y = scrollY;
    let jumped = false;
    if (y < pinAt(from) || (to < last && y >= cutAt(to) - 0.06 * vh)) {
      goTo(clipHold(p.dataset.role === "head" ? from : to));
      jumped = true;
    }
    // the close: short of its hold point the line is not drawn yet, so it could not take the next Tab; bring the page there
    // (and past it, once the closing words have left for the footer, a Shift-Tab back brings them back the same way)
    else if (secs[lastM].contains(p)) {
      const host = e.target.closest(".act, .lede, .kin");
      if (y < clipHold(last) || (HAS_GSAP && host && +gsap.getProperty(host, "opacity") < 0.5)) {
        goTo(clipHold(last));
        jumped = true;
      }
    }
    // a jump shows the focused words at once (their usual reveal waits up to 0.6 s), so focus never sits on an invisible control
    if (jumped && HAS_GSAP)
      for (let b = p; b; b = b.parentElement?.closest(".bt")) {
        if (b.dataset.role !== "head" && b.dataset.role !== "more") continue;
        const els = [...b.querySelectorAll(".kin .w > span, .lede, .act")].filter(
          (x) => x.closest(".bt") === b
        );
        gsap.killTweensOf(els);
        els.forEach((x) =>
          gsap.set(
            x,
            x.matches(".kin .w > span") ? { yPercent: 0, opacity: 1 } : { y: 0, opacity: 1 }
          )
        );
      }
  });
  // "Skip the film": straight to the offer at the end, focus on it
  document.querySelectorAll("[data-skip]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      stopOpening();
      told = true;
      goTo(clipHold(last));
      const h = secs[lastM].querySelector(".kin") || secs[lastM];
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    })
  );
  // ?m=N&b=K opens the page at message N, film K (used by the copy editor's preview)
  const jm = (+Q.get("m") || 1) - 1,
    jb = (+Q.get("b") || 1) - 1,
    jump = MESSAGES[jm] && MESSAGES[jm].clips[jb] ? first(jm) + jb : 0;
  if (jump > 0) goTo(clipHold(jump));

  // the opening film plays its first seconds by itself (under five), then hands over to the scroll from the frame it reached
  const v0 = vids[0],
    lead0 = SCENES[0].autoplay || 0;
  // after it, the usual rest playback carries the film on to the end of its span if the reader still hasn't scrolled
  function stopOpening() {
    if (!v0._auto) return;
    v0._auto = false;
    v0.pause();
    SCENES[0].lead = v0.currentTime;
    idle = false;
    update();
    applyFilm(0);
  }
  addEventListener("keydown", (e) => {
    if (!menuOpen) return;
    if (e.key === "Escape") menu(false);
    if (e.key === "Tab") {
      const f = [...sheet.querySelectorAll("a, button")],
        a = f[0],
        z = f[f.length - 1]; // keep focus inside the open menu
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    }
  });
  setHeld(held, false);
  if (!still && !held && lead0 && jump === 0 && scrollY < 2) {
    v0._auto = true;
    warm(v0);
    v0.play().catch(stopOpening);
    v0.addEventListener("timeupdate", () => {
      if (v0._auto && v0.currentTime >= lead0) stopOpening();
    });
    ["wheel", "touchmove", "pointerdown"].forEach((t) =>
      addEventListener(t, stopOpening, { once: true, passive: true })
    );
  }
})();
