/* The inner pages of the mock (2026-10-25): the SAT Program, private tutoring, the free practice test, the
   guarantee, About and the FAQ. Each page's HTML file sets <body data-page="...">; this file builds its sections
   from copy.js (sections 21 to 71), the page drawings from art.js and the loaders and messages from kit.js.
   Prices and dates mirror src/lib/marketing/offer.ts; the real pages must read them from there. */
(function () {
  const K = window.KARMAN,
    KIT = window.KIT;
  const { M, esc, list, btn, ROUTES, ARROW, site, photo } = K;
  const pairs = (s) => list(s).map((x) => x.split(" = ").map((y) => y.trim()));
  const page = document.body.dataset.page;
  const main = document.getElementById("main");

  /* ---------- section builders ---------- */
  const eyebrow = (f) => (f.eyebrow ? `<p class="eyebrow rv">${esc(f.eyebrow)}</p>` : "");
  const h2 = (f, id) =>
    f.headline ? `<h2 class="rv"${id ? ` id="${id}"` : ""}>${esc(f.headline)}</h2>` : "";
  const lede = (f, d = 0.08) =>
    f.text ? `<p class="lede rv" style="--d:${d}s">${esc(f.text)}</p>` : "";
  const action = (f, href) =>
    f.button
      ? `<div class="act rv" style="--d:.16s">${btn(f.button, href)}${f["button note"] ? `<small>${esc(f["button note"])}</small>` : ""}</div>`
      : "";
  const facts = (f) =>
    f.facts
      ? `<dl class="i-facts rv${pairs(f.facts).some(([a]) => a.length > 6) ? " words" : ""}" style="--d:.24s">${pairs(
          f.facts
        )
          .map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b || "")}</dd></div>`)
          .join("")}</dl>`
      : "";

  // the opening: words on one side, the page's drawing at the outer edge
  const hero = (n, art, href, side = "") => {
    const f = M(n);
    return `<section class="i-hero" data-light id="s-${n}">
      <div class="in">
        <div class="i-words">${eyebrow(f)}<h1 class="rv" style="--d:.04s">${esc(f.headline)}</h1>${lede(f)}${action(f, href)}</div>
        <div class="i-art rv" style="--d:.2s" data-art="${art}"></div>
        ${side}
      </div>
      ${facts(f)}
    </section>`;
  };
  // label = text pairs, as a grid, as steps joined by a line, or as a timeline
  const rows = (n, style = "grid", tone = "") => {
    const f = M(n);
    const items = pairs(f.rows);
    const body =
      style === "steps"
        ? `<ol class="i-steps">${items.map(([a, b], k) => `<li class="rv" style="--d:${k * 0.08}s"><b>${esc(a)}</b><span>${esc(b || "")}</span></li>`).join("")}</ol>`
        : style === "time"
          ? `<ol class="i-time">${items.map(([a, b], k) => `<li class="rv${k === items.length - 1 ? " last" : ""}" style="--d:${k * 0.06}s"><b>${esc(a)}</b><span>${esc(b || "")}</span></li>`).join("")}</ol>`
          : `<dl class="i-grid">${items.map(([a, b], k) => `<div class="rv" style="--d:${k * 0.05}s"><dt>${esc(a)}</dt><dd>${esc(b || "")}</dd></div>`).join("")}</dl>`;
    return `<section class="i-sec ${tone}${style === "steps" ? "" : " rows"}" ${tone === "dark" ? "" : "data-light"} id="s-${n}"><div class="in">
      <div class="i-head">${h2(f)}${lede(f)}</div>${body}${f.button ? action(f, ROUTES.program) : ""}
    </div></section>`;
  };
  const textCard = (n) => {
    const f = M(n);
    return `<section class="i-sec" data-light id="s-${n}"><div class="in i-split">
      <div class="i-head">${h2(f)}${lede(f)}${f.proof ? `<p class="i-proof rv">${esc(f.proof)}</p>` : ""}</div>
      ${f["card title"] ? `<aside class="i-card rv" style="--d:.12s">${KIT.icon("plus")}<b>${esc(f["card title"])}</b><p>${esc(f["card text"] || "")}</p></aside>` : ""}
    </div></section>`;
  };
  // a list of plain statements; "no" marks things we refuse
  const statements = (n, mark = "check") => {
    const f = M(n);
    return `<section class="i-sec" data-light id="s-${n}"><div class="in i-split">
      <div class="i-head">${h2(f)}${lede(f)}</div>
      <ul class="i-list ${mark}">${list(f.list)
        .map(
          (x, k) =>
            `<li class="rv" style="--d:${k * 0.05}s">${mark === "no" ? KIT.icon("plus") : '<i class="mk"></i>'}<span>${esc(x)}</span></li>`
        )
        .join("")}</ul>
    </div></section>`;
  };
  const guarantee = () =>
    `<section class="panel dark guarantee" id="guarantee" aria-labelledby="g-h"><div class="in">${K.guarantee(M(8), "g-h")}</div></section>`;
  const close = (n, href = ROUTES.test) => {
    const f = M(n);
    return `<section class="i-close" id="s-${n}"><div class="in">
      ${h2(f)}${lede(f)}${f.objection ? `<p class="i-obj rv">${esc(f.objection)}</p>` : ""}${f["form button"] ? "" : action(f, href)}
    </div></section>`;
  };

  // a short form card: the fields come from the section's "form ..." labels, in a fixed order
  const formCard = (n, id) => {
    const f = M(n),
      F = (k) => f[`form ${k}`];
    const field = (k, input, help) =>
      `<div class="k-field"><label for="${id}-${k}">${esc(F(k))}</label>${input}${help ? `<p class="help" id="${id}-${k}-help">${esc(help)}</p>` : ""}</div>`;
    const helpAttr = (k) =>
      F(`${k} help`) ? ` data-help="${id}-${k}-help" aria-describedby="${id}-${k}-help"` : "";
    let html = "";
    if (F("email"))
      html += field(
        "email",
        `<input id="${id}-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false"${helpAttr("email")}>`,
        F("email help")
      );
    if (F("name"))
      html += field(
        "name",
        `<input id="${id}-name" name="name" type="text" autocomplete="off" autocapitalize="words">`
      );
    if (F("grade"))
      html += `<fieldset class="k-field"><legend>${esc(F("grade"))}</legend><div class="k-chips">${list(
        F("grade options")
      )
        .map(
          (g, i) =>
            `<label><input type="radio" name="grade" value="${esc(g)}"${i === 2 ? " checked" : ""}><span>${esc(g)}</span></label>`
        )
        .join("")}</div></fieldset>`;
    const score = (k) =>
      field(
        k,
        `<input id="${id}-${k}" name="${k}" type="text" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="1200"${helpAttr(k)}>`,
        F(`${k} help`)
      );
    if (F("latest") || F("target"))
      html += `<div class="k-pair">${F("latest") ? score("latest") : ""}${F("target") ? score("target") : ""}</div>`;
    if (F("date"))
      html += field(
        "date",
        `<select id="${id}-date" name="date">${list(F("date options"))
          .map((d) => `<option>${esc(d)}</option>`)
          .join("")}</select>`
      );
    return `<form class="k-form" id="${id}" novalidate data-done="${n}">${html}<div class="k-slot"></div>
      <button class="btn" type="submit"><span class="lb">${esc(F("button"))}</span><span class="go">${ARROW}</span></button>
      ${F("privacy") ? `<p class="help">${esc(F("privacy"))}</p>` : ""}</form>`;
  };

  /* ---------- pages ---------- */
  const PAGES = {
    program: () =>
      hero(21, "weeks", "#apply", photo("program", "ph-hero")) +
      rows(22) +
      rows(23, "time") +
      textCard(24) +
      guarantee() +
      rows(25, "steps").replace(
        "</div></section>",
        `<div class="i-formcard wide rv" id="apply">${formCard(25, "apply")}</div></div></section>`
      ) +
      `<section class="i-sec" data-light id="s-26"><div class="in i-split">
        <div class="i-head">${h2(M(26))}${lede(M(26))}</div>
        <div class="i-more rv"><a class="lk" href="${ROUTES.pricing}">${esc(site["pricing link"])}${ARROW}</a></div>
      </div></section>` +
      textCard(27),

    private: () => {
      const f = M(33);
      const pack = (s, hot) => {
        const [name, rest] = s.split(" = ");
        const [hours, price, ...more] = rest.split(", ");
        return `<article class="i-pack rv${hot ? " hot" : ""}"><h3>${esc(name)}</h3><p class="i-price"><b>${esc(price.split(".")[0])}</b><span>${esc(hours)}</span></p><p>${esc((price.split(".").slice(1).join(".") + " " + more.join(", ")).trim())}</p></article>`;
      };
      const rec = M(34);
      return (
        hero(31, "call", "#call", photo("private", "ph-hero")) +
        rows(32, "steps") +
        `<section class="i-sec" data-light id="s-33"><div class="in">
          <div class="i-head">${h2(f)}</div>
          <div class="i-packs">${pack(f["small package"])}${pack(f["large package"], true)}</div>
          <ul class="i-list check inline">${list(f.includes)
            .map((x) => `<li class="rv"><i class="mk"></i><span>${esc(x)}</span></li>`)
            .join("")}</ul>
        </div></section>` +
        `<section class="i-sec i-record" data-light id="s-34"><div class="in i-split">
          <p class="i-big rv">+285</p>
          <div class="i-head">${h2(rec)}${lede(rec)}<p class="i-proof rv">${esc(rec.proof)}</p></div>
        </div></section>` +
        rows(35) +
        close(36, "#call").replace(
          "</div></section>",
          `<div class="i-formcard rv" id="call">${formCard(36, "callf")}</div></div></section>`
        )
      );
    },

    test: () => {
      const f = M(42);
      const form = `<div class="i-formcard rv" style="--d:.15s" id="seat"><h2 class="i-formh">${esc(f.headline)}</h2>${formCard(42, "seatf")}</div>`;
      return (
        hero(41, "sitting", "#seat", form).replace(
          '<div class="i-art rv" style="--d:.2s" data-art="sitting"></div>',
          ""
        ) +
        rows(43) +
        rows(44, "time") +
        `<section class="i-sec" data-light id="s-45"><div class="in i-split">
          <div class="i-head">${h2(M(45))}${lede(M(45))}${action(M(45), "#seat")}</div><div class="i-art small rv" data-art="sitting"></div>${photo("test", "ph-side")}
        </div></section>`
      );
    },

    guarantee: () => {
      const ex = pairs(M(52).rows);
      return (
        hero(51, "report", ROUTES.test) +
        guarantee() +
        `<section class="i-sec" data-light id="s-52"><div class="in">
          <div class="i-split i-withphoto"><div class="i-head">${h2(M(52))}${lede(M(52))}</div>${photo("guarantee", "ph-side")}</div>
          <div class="i-ex">${ex
            .map(([a, b], k) => {
              const [base, sat] = a.split(", ");
              return `<div class="rv" style="--d:${k * 0.06}s"><p class="sc"><span>${esc(base)}</span>${KIT.icon("plus", "arrow")}<span>${esc(sat)}</span></p><p class="out">${esc(b)}</p></div>`;
            })
            .join("")}</div>
        </div></section>` +
        statements(53, "no") +
        rows(54) +
        close(55)
      );
    },

    about: () => {
      const f = M(62);
      const icons = ["hours", "eye", "parent"];
      return (
        hero(61, "line", ROUTES.program) +
        `<section class="i-sec" data-light id="s-62"><div class="in">
          <div class="i-split i-withphoto"><div class="i-head">${h2(f)}${lede(f)}</div>${photo("about", "ph-side")}</div>
          <div class="i-refuse">${pairs(f.rows)
            .map(
              ([a, b], k) =>
                `<article class="rv" style="--d:${k * 0.08}s">${KIT.icon(icons[k] || "check")}<h3>${esc(a)}</h3><p>${esc(b)}</p></article>`
            )
            .join("")}</div>
        </div></section>` +
        textCard(63) +
        statements(64) +
        close(65)
      );
    },

    faq: () => {
      const f = M(71);
      return (
        `<section class="i-hero i-faqhero" data-light id="s-71"><div class="in"><div class="i-words">${eyebrow(f)}<h1 class="rv">${esc(f.headline)}</h1></div></div></section>
        <section class="i-sec" data-light><div class="in">
          <div class="i-faq">${pairs(f.qa)
            .map(
              ([q, a], k) =>
                `<details class="rv" style="--d:${Math.min(k, 6) * 0.04}s"><summary><span>${esc(q)}</span>${KIT.icon("plus")}</summary><div class="ans"><p>${esc(a || "")}</p></div></details>`
            )
            .join("")}</div>
        </div></section>` + close(11)
      );
    },
  };

  main.innerHTML = (PAGES[page] || (() => ""))();
  // the phone dock carries each page's own main action
  const DOCK = {
    program: [M(21).button, "#apply"],
    private: [M(31).button, "#call"],
    test: [M(42)["form button"], "#seat"],
  };
  if (DOCK[page]) K.dock(...DOCK[page]);
  document.querySelectorAll("[data-art]").forEach((h) => window.KARMAN_ART?.draw(h, h.dataset.art));

  /* ---------- FAQ: answers open smoothly; one open at a time keeps the page short ---------- */
  document.querySelectorAll(".i-faq details").forEach((d) => {
    d.querySelector("summary").addEventListener("click", (e) => {
      if (K.reduce) return;
      e.preventDefault();
      const ans = d.querySelector(".ans");
      if (d.open) {
        ans.animate(
          [
            { height: `${ans.offsetHeight}px`, opacity: 1 },
            { height: "0px", opacity: 0 },
          ],
          { duration: 260, easing: "cubic-bezier(.22,1,.36,1)" }
        ).onfinish = () => (d.open = false);
      } else {
        document
          .querySelectorAll(".i-faq details[open]")
          .forEach((o) => o !== d && (o.open = false));
        d.open = true;
        ans.animate(
          [
            { height: "0px", opacity: 0 },
            { height: `${ans.offsetHeight}px`, opacity: 1 },
          ],
          { duration: 340, easing: "cubic-bezier(.22,1,.36,1)" }
        );
      }
    });
  });

  /* ---------- forms: a field is checked when you leave it, the button never blocks, every send says what happened ---------- */
  const okEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  const okScore = (v, lo) => {
    const n = +v.trim();
    return Number.isInteger(n) && n >= lo && n <= 1600 && n % 10 === 0;
  };
  document.querySelectorAll(".k-form").forEach((form) => {
    const q = (n) => form.querySelector(`[name="${n}"]`);
    const checks = [
      [q("email"), (el) => (okEmail(el.value) ? "" : site["form error email"])],
      [q("name"), (el) => (el.value.trim() ? "" : site["form error name"])],
      [
        q("latest"),
        (el) => (!el.value.trim() || okScore(el.value, 320) ? "" : site["form error score"]),
      ],
      [q("target"), (el) => (okScore(el.value, 400) ? "" : site["form error target"])],
    ].filter(([el]) => el);
    checks.forEach(([el, rule]) => {
      el.addEventListener("blur", () => el.value && KIT.fieldMsg(el, rule(el))); // empty fields aren't scolded on the way past
      el.addEventListener(
        "input",
        () => el.getAttribute("aria-invalid") && KIT.fieldMsg(el, rule(el))
      ); // clears the moment it's fixed
    });
    let sending = false;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending) return; // the button stays enabled; a second press waits for the first
      let first = null;
      checks.forEach(([el, rule]) => {
        const m = rule(el);
        KIT.fieldMsg(el, m);
        if (m && !first) first = el;
      });
      if (first) return first.focus();
      const slot = form.querySelector(".k-slot");
      slot.innerHTML = "";
      const b = form.querySelector('button[type="submit"]');
      sending = true;
      KIT.busy(b, true, site["form sending"]);
      // the mock has no server: a short wait stands in for the request (?fail=1 shows the error path once)
      const fail = K.Q.has("fail");
      await new Promise((r) => setTimeout(r, 1300));
      KIT.busy(b, false);
      sending = false;
      if (fail) {
        K.Q.delete("fail");
        slot.innerHTML = `<div class="k-banner" role="alert">${KIT.icon("alert")}<span>${esc(site["form error network"])}</span><button type="button">${esc(site["form retry"])}</button></div>`;
        slot.querySelector("button").addEventListener("click", () => form.requestSubmit());
        return;
      }
      const done = M(+form.dataset.done);
      const card = form.closest(".i-formcard") || form.parentElement;
      card.innerHTML = `<div class="k-done" tabindex="-1"><span class="k-badge">${KIT.icon("check", "draw")}</span><h3>${esc(done["form done title"])}</h3><p>${esc(done["form done text"])}</p></div>`;
      card.querySelector(".k-done").focus();
      // the card already says it; the message only appears if the card is off screen
      const r = card.getBoundingClientRect();
      if (r.bottom < 80 || r.top > innerHeight - 80)
        KIT.toast(done["form done title"], done["form done text"]);
    });
  });

  K.init();
})();
