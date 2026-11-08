/* Karman home page, option B (2026-10-31): the printed annual.
   The second home page for the founder's review, beside option A (film.js): index.html?home=b. Both share the
   film (stage.js), the header, the menu and the footer (site.js), the product screens (screens.js) and every
   word (copy.js). The taste-skill direction dealt for it is "The printed annual" (editorial-report, seed
   399637216): a masthead band across the top of the first screen, a title on a fixed axis at 42% of the width,
   text hanging from that axis with the figures in the zone left of it, colour in whole pages, no print furniture.

   The idea: on this page, Your Daily 10 (the ten questions Ava works through on the shuttle at 6:52 a.m. in the
   film's second chapter) becomes the page's first figure: one real Karman question the parent answers with a
   thumb, and the page shows when a miss would come back (2, 7 and 21 days from today). That question is the one
   live thing (screens.js daily10Try: radio inputs, so the answer shows with CSS alone; tryLive fills the dates).

   Sections, in the order of the argument, each with the copy section it reads:
     the opening (1, the "b" labels; the guarantee's promise from 8 beside the claim; the one button)
     the method, four lines that step across the page: 4, 2, 3, 5, the last three with their screens
     a school day (13): four stills from the film, each with its character's first name and the time
     everything else on the platform (3 "tools", 6): one table without lines, two phones beside it
     the guarantee (8), in full, as one black page (the block is shared with A: K.guarantee)
     the campus chapters (9): a strip of three clips, the captions on the black band under them (rule 47)
     testimonials (12) and student messages (10): nothing while their copy is empty
     the close (11): the orbit, the one button, the line (the same as A)

   The founder's laws, where each one shaped a section: Hick (one action on every screen: the first screen's
   button and the dock on phones; the question's four choices are the product's own controls, not page actions);
   Jakob (the shared header with the button top right, a table that reads as a table, choices that look like
   the app's); Fitts (the dock within thumb reach, every choice at least 44px tall, the button full width on
   phones); Peak-End (the kitchen before dawn in the masthead first, the orbit and the one button last);
   Von Restorff (one marigold button per screen; the table's "which plan" column is ink, not marigold);
   Tesler (the page does the arithmetic: the dates a miss returns, which plan has which tool). */
(function () {
  const K = window.KARMAN;
  const { M, esc, list, btn, phone, ROUTES, reduce, Q, site, ARROW } = K;
  const pairs = (s) => list(s).map((x) => x.split(" = ").map((y) => y.trim()));
  const SCR = (name) => (window.KARMAN_SCREENS?.[name] || (() => ""))();
  const laptop = (screen) =>
    `<figure class="wide laptop" aria-hidden="true"><div class="lid"><div class="lcd">${SCR(screen)}</div></div><div class="deck"></div></figure>`;
  const action = (f) =>
    f.button
      ? `<div class="act">${btn(f.button, ROUTES.test)}${f["button note"] ? `<small>${esc(f["button note"])}</small>` : ""}</div>`
      : "";

  const hero = M(1),
    ten = M(4),
    tut = M(2),
    cal = M(3),
    par = M(5),
    btw = M(6),
    g = M(8),
    campus = M(9),
    day = M(13),
    msgs = M(10),
    voices = M(12),
    end = M(11);

  /* ---------- the opening: the masthead (45% of the first screen is the film), the figure in the left zone, the
     title on the axis ---------- */
  const title = hero["headline b"] || hero.headline;
  const stand = hero["text b"] || hero.text;
  const opening = `
  <section class="window b-hero" id="m-1">
    <div class="b-mast" aria-hidden="true"></div>
    <div class="panel b-lead" data-light>
      <div class="in">
        <div class="b-title">
          <h1>${esc(title)}</h1>
          ${stand ? `<p class="b-stand">${esc(stand)}</p>` : ""}
          ${action(hero)}
          ${g.promise ? `<p class="b-gline"><b>${esc(g.promise)}</b>${g.headline ? `<a class="lk" href="#m-8">${esc(g.headline)}${ARROW}</a>` : ""}</p>` : ""}
          ${hero.proof ? `<p class="proof">${esc(hero.proof)}</p>` : ""}
          <nav class="layout-switch" aria-label="Home page options for the founder's review" data-review><a href="index.html?home=a">A</a><a href="index.html?home=b" aria-current="page">B</a></nav>
        </div>
        <div class="b-fig">
          <div class="b-live">${phone(SCR("daily10Try"))}</div>
          ${hero["try b"] ? `<p class="b-try">${esc(hero["try b"])}</p>` : ""}
        </div>
      </div>
    </div>
  </section>`;

  /* ---------- the method: four lines that step across the page, each with its sentence and its screen ---------- */
  const sent = (f) =>
    f["feature title"] || f["feature text"]
      ? `<p class="b-sent"><b>${esc(f["feature title"] || "")}</b> ${esc(f["feature text"] || "")}</p>`
      : "";
  const note = (f) =>
    f["card title"] ? `<p class="note"><b>${esc(f["card title"])}</b>${esc(f["card text"] || "")}</p>` : "";
  const stage = (n, f, k, media) => `
    <article class="b-stage s${k}${media ? ` m-${media.kind}` : ""}" id="m-${n}" style="--c:${k}">
      ${f.headline ? `<h2 class="rv">${esc(f.headline)}</h2>` : ""}
      <div class="b-words rv" style="--d:.08s">
        ${f.text ? `<p class="lede">${esc(f.text)}</p>` : ""}
        ${sent(f)}${note(f)}
      </div>
      ${media ? `<div class="media rv" style="--d:.16s" aria-hidden="true">${media.html}</div>` : ""}
    </article>`;
  const method = `
  <section class="panel b-method" id="method">
    <div class="in">
      ${stage(4, ten, 1, { kind: "phone", html: `<div class="turn">${phone(SCR("daily10"))}</div>` })}
      ${stage(2, tut, 2, { kind: "laptop", html: laptop("session") + `<div class="turn twin">${phone(SCR("sessionPhone"))}</div>` })}
      ${stage(3, cal, 3, { kind: "laptop", html: laptop("calendar") + `<div class="turn twin">${phone(SCR("calendarPhone"))}</div>` })}
      ${stage(5, par, 4, { kind: "phone", html: `<div class="turn">${phone(SCR("parent"))}</div>` })}
    </div>
  </section>`;

  /* ---------- a school day: four stills from the film, unequal widths, each with its character's first name and
     the time (design rule 47). The still is chosen by the first name in the caption. ---------- */
  const STILL = { ava: "c2", "ava's mother": "c3", priya: "c5", david: "c6" };
  const panes = pairs(day.captions)
    .map(([who, what], i) => {
      const id = STILL[who.split(",")[0].trim().toLowerCase()];
      if (!id) return "";
      return `<figure class="b-pane rv" data-still="${id}" style="--d:${i * 0.08}s">
        <picture><source media="(max-width: 760px)" srcset="${id}-p.jpg"><img src="${id}.jpg" alt="${esc(`${who}: ${what || ""}`)}" width="1440" height="810" loading="lazy" decoding="async"></picture>
        <figcaption><b>${esc(who)}</b><span>${esc(what || "")}</span></figcaption>
      </figure>`;
    })
    .join("");
  const dayHTML =
    day.headline || panes
      ? `
  <section class="panel b-day" id="m-13"${day.headline ? ' aria-labelledby="d-h"' : ""}>
    <div class="in">${day.headline ? `<h2 class="rv" id="d-h">${esc(day.headline)}</h2>` : ""}</div>
    <div class="b-band">${panes}</div>
  </section>`
      : "";

  /* ---------- everything else on the platform: the "tools" pairs of section 3 and the two items of section 6 as
     one table without lines. In each pair the last sentence names the plan or the season ("In Platform and up",
     "Free for everyone", "Coming spring 2027"); it becomes the third column. ---------- */
  const splitPlan = (s) => {
    const t = (s || "").trim().replace(/\.$/, "");
    const m = t.match(/^(.*?)(?:\.\s+)?((?:In |Free|Coming)[^.]*)$/);
    return m ? [m[1].trim(), m[2].trim()] : [t, ""];
  };
  const rows = pairs(cal.tools).map(([name, v]) => [name, ...splitPlan(v)]);
  if (btw["feature title"]) rows.push([btw["feature title"].replace(/\.$/, ""), ...splitPlan(btw["feature text"])]);
  if (btw["card title"]) {
    const [nm, ...rest] = btw["card title"].replace(/\.$/, "").split(",");
    const [what, plan] = splitPlan(btw["card text"]);
    const when = rest.join(",").trim();
    rows.push([nm.trim(), what, [plan, when].filter(Boolean).join(", ")]);
  }
  const cols = list(cal["tools columns b"]);
  const th = (i) => esc(cols[i] || "");
  const table = rows.length
    ? `<table class="b-table rv" style="--d:.08s">
      <thead><tr>${cols.map((c, i) => `<th scope="col"${i === 2 ? ' class="b-plan"' : ""}>${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map(
          ([n, w, p]) =>
            `<tr><th scope="row">${esc(n)}</th>${
              w
                ? `<td data-th="${th(1)}">${esc(w)}.</td><td class="b-plan" data-th="${th(2)}">${esc(p)}</td>`
                : `<td class="b-plan" colspan="2" data-th="${th(2)}">${esc(p)}</td>`
            }</tr>`
        )
        .join("")}</tbody>
    </table>`
    : "";
  const toolsHTML = `
  <section class="panel b-tools" id="m-6" aria-labelledby="t-h">
    <div class="in">
      <div class="b-tools-words">
        ${cal["tools headline b"] ? `<h2 class="rv" id="t-h">${esc(cal["tools headline b"])}</h2>` : ""}
        ${table}
      </div>
      <div class="b-tools-media rv" style="--d:.12s" aria-hidden="true"><div class="turn">${phone(SCR("test"))}</div><div class="turn">${phone(SCR("challenge"), "left")}</div></div>
    </div>
  </section>`;

  /* ---------- the guarantee, in full, as one black page (the block is K.guarantee, shared with A) ---------- */
  const guaranteeHTML = `
  <section class="panel dark guarantee b-guarantee" id="m-8" aria-labelledby="g-h">
    <div class="in">${K.guarantee(g, "g-h")}</div>
  </section>`;

  /* ---------- the campus chapters (design rule 47): three real Karman 1:1 students, the clips edge to edge, each
     caption under its clip on the black band, and the tutoring line. Clip ids from assets/manifest.json. ---------- */
  const CLIP = { ava: "c8c", mateo: "c8a", priya: "c8b" };
  const caps = pairs(campus.captions).filter(([name]) => CLIP[name.toLowerCase()]);
  const clips = caps
    .map(
      ([name, rest], k) =>
        `<figure class="clip rv" style="--d:${k * 0.1}s">
        <div class="fr"><video muted playsinline preload="none" data-src="${CLIP[name.toLowerCase()]}-r.mp4" data-poster="${CLIP[name.toLowerCase()]}-r${reduce ? "" : "0"}.jpg" aria-hidden="true"></video></div>
        <figcaption><b>${esc(name)}</b><span>${esc(rest || "")}</span></figcaption>
      </figure>`
    )
    .join("");
  const campusHTML = `
  <section class="panel dark campus b-campus" id="m-9"${campus.headline ? ' aria-labelledby="c-h"' : ""}>
    <div class="in b-cband">
      ${campus.headline ? `<h2 class="rv" id="c-h">${esc(campus.headline)}</h2>` : ""}
      <p class="cline rv" style="--d:.15s">${campus.line ? esc(campus.line) : ""}${site["students link"] ? `<a class="lk" href="${ROUTES.students}">${esc(site["students link"])}${ARROW}</a>` : ""}</p>
    </div>
    <div class="b-strip">${clips}</div>
    ${caps.length ? `<dl class="b-caps3 rv">${caps.map(([n, r]) => `<div><dt>${esc(n)}</dt><dd>${esc(r || "")}</dd></div>`).join("")}</dl>` : ""}
  </section>`;

  /* ---------- testimonials and student messages: nothing while their copy is empty (the same as A) ---------- */
  const quotes = list(voices.quotes).map((q) => {
    const [words, who = ""] = q.split(" = ");
    const [name, ...role] = who.split(",");
    return `<figure class="vq rv"><blockquote><p>“${esc(words.trim())}”</p></blockquote>${who ? `<figcaption><b>${esc(name.trim())}</b>${role.length ? `<span>${esc(role.join(",").trim())}</span>` : ""}</figcaption>` : ""}</figure>`;
  });
  const voicesHTML = quotes.length
    ? `<section class="panel voices" id="m-12" aria-labelledby="v-h">
      <div class="in">
        ${voices.headline ? `<h2 class="rv" id="v-h">${esc(voices.headline)}</h2>` : ""}
        ${voices.format ? `<p class="vfmt rv">${esc(voices.format)}</p>` : ""}
        <div class="vgrid">${quotes.join("")}</div>
      </div>
    </section>`
    : "";
  const msgsHTML =
    msgs.headline || msgs.text
      ? `<section class="panel messages" id="m-10">
      <div class="in">
        ${msgs.headline ? `<h2 class="rv">${esc(msgs.headline)}</h2>` : ""}
        ${msgs.text ? `<p class="lede rv" style="--d:.1s">${esc(msgs.text)}</p>` : ""}
      </div>
    </section>`
      : "";

  /* ---------- the close: the day dissolves into orbit, the one button, the line (the same as A) ---------- */
  const closeHTML = `
  <section class="window end" id="m-11">
    <div class="in">
      <h2 class="rv">${esc(end.headline)}</h2>
      ${end.text ? `<p class="lede rv" style="--d:.1s">${esc(end.text)}</p>` : ""}
      ${end["honest note"] ? `<p class="obj rv" style="--d:.15s">${esc(end["honest note"])}</p>` : ""}
      <div class="rv" style="--d:.2s">${action(end)}</div>
    </div>
    ${end["line note"] ? `<div class="kline rv" style="--d:.35s"><span class="bar" aria-hidden="true"></span><p>${esc(end["line note"])}</p></div>` : ""}
  </section>`;

  document.getElementById("main").innerHTML =
    opening + method + dayHTML + toolsHTML + guaranteeHTML + campusHTML + voicesHTML + msgsHTML + closeHTML;

  // the film, shared with A (stage.js), then the live question's dates
  window.KARMAN_STAGE.start();
  document.querySelectorAll(".b-live").forEach((h) => window.KARMAN_SCREENS?.tryLive?.(h));

  // the first visit's opening (kit.js): the wordmark and the line, only while the first picture isn't ready yet
  if (!Q.has("rec") && !Q.has("m")) window.KIT?.opening(`day${window.KARMAN_STAGE.sfx}.jpg`, K.site.logo);

  K.init();

  /* the copy editor's preview opens at a section: ?m=N */
  const mq = +Q.get("m");
  const t = mq && document.getElementById(`m-${mq}`);
  if (t) {
    t.scrollIntoView({ block: t.classList.contains("b-stage") ? "center" : "start" });
    t.querySelectorAll(".rv").forEach((el) => el.classList.add("on"));
  }
})();
