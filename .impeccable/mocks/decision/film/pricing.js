/* Pricing (rebuilt 2026-10-31 for the October 30 plan ladder): six plans, every price in full, the guarantee
   under them with its whole terms, and one comparison of the 13 bundles. Two layouts the founder can compare,
   switched by ?layout=a (the default) or ?layout=b:
     A: the three practice plans as one band, two program cards (the cohort by SAT date, Private 10 and 20),
        School as its own band; the free practice test as a line, never a card.
     B: the six plans as one vertical ladder, one row per plan, the price on the right, each row saying what it
        adds over the row above; the same free line, guarantee and comparison.
   Every word comes from copy.js. Prices appear only through copy: the Site block holds the practice and school
   prices, and the cohort's and Private's numbers are read from the copy lines that already state them:
     section 21 "facts", first pair ........ the March price and its note ("$995 = Founding price, March only")
     section 26 "headline" .................. the installment clause after ", or " ("three payments of $345")
     section 27 "text" ...................... the first $ amount is the later cohorts' price ($1,295)
     section 25 "form date options" ......... the SAT dates the picker offers (March 6 | May 1 | June 5)
     section 21 "text" and "button note" .... the March cohort's dates sentence and its enrollment close
     section 27 "text" ...................... the May and June cohorts' sentence
     section 33 "small package" / "large package" ... Private 10 and 20 (name = hours, price. note)
   Which plan includes which bundle is the plan ladder (docs/business/plan-ladder-2026-10-30.md), kept here as
   one table in the bundles' order; the real page reads offer.ts. ?slow=1 shows the plans' loading skeleton. */
(function () {
  const K = window.KARMAN,
    KIT = window.KIT;
  const { site, esc, btn, ghost, ROUTES, M, list, ARROW, phone, photo, Q } = K;
  const S = (k) => esc(site[`pricing ${k}`] || "");
  const pairs = (s) => list(s).map((x) => x.split(" = ").map((y) => y.trim()));
  const SCR = (name) => (window.KARMAN_SCREENS?.[name] || (() => ""))();
  const layout = Q.get("layout") === "b" ? "b" : "a";
  document.body.dataset.layout = layout;
  const amounts = (s) => (s || "").match(/\$[\d,]+/g) || [];
  // "$29 a month" splits into the figure and the words after it
  const priceParts = (s) => {
    const m = (s || "").match(/^(\$[\d,]+)\s*(.*)$/);
    return m ? [m[1], m[2]] : [s || "", ""];
  };
  const price = (s, cls = "") => {
    const [amt, rest] = priceParts(s);
    return `<p class="p-price ${cls}"><b>${esc(amt)}</b>${rest ? `<span>${esc(rest)}</span>` : ""}</p>`;
  };

  /* ---------- the cohort's numbers, from the program page's copy ---------- */
  const P21 = M(21),
    P25 = M(25),
    P26 = M(26),
    P27 = M(27),
    P33 = M(33),
    g = M(8);
  const fact0 = pairs(P21.facts)[0] || ["", ""];
  const marchPrice = fact0[0]; // "$995"
  const marchNote = fact0[1]; // "Founding price, March only"
  const splitClause = ((P26.headline || "").split(", or ")[1] || "").replace(/\.\s*$/, ""); // "three payments of $345"
  const splitAmount = amounts(splitClause)[0] || "";
  const laterPrice = amounts(P27.text)[0] || "";
  const DATES = list(P25["form date options"]); // March 6 | May 1 | June 5
  const dateSentence = (i) =>
    i === 0 ? [P21.text, P21["button note"]].filter(Boolean).join(" ") : P27.text || "";

  /* ---------- Private 10 and 20, from the private page's copy ---------- */
  const pack = (s) => {
    const [name = "", rest = ""] = (s || "").split(" = ");
    const [hours = "", ...more] = rest.split(", ");
    const pr = more.join(", ");
    return { name, hours, price: pr.split(".")[0], note: pr.split(".").slice(1).join(".").trim() };
  };
  const PRIVATE = [pack(P33["small package"]), pack(P33["large package"])];

  /* ---------- the ladder: which plan includes which bundle, in the order of "pricing bundles" (13 rows) ---------- */
  const PLANS = ["free", "practice", "pro", "program", "private", "school"];
  const INCLUDED = [
    [1, 1, 1, 1, 1, 1], // Quiz engine
    [0, 1, 1, 1, 1, 1], // Built-in graphing calculator (not in Free: the founder's choice)
    [0, 1, 1, 1, 1, 1], // Your Daily 10
    [1, 1, 1, 1, 1, 1], // Challenge question and Wordline
    [0, 1, 1, 1, 1, 1], // Full-length tests
    [1, 1, 1, 1, 1, 1], // Progress and rewards
    [0, 1, 1, 1, 1, 1], // Planning tools
    [0, 0, 0, 1, 1, 0], // The weekly live session (cohort and private)
    [0, 0, 0, 1, 0, 0], // Live classes
    [0, 0, 0, 0, 1, 0], // 1:1 sessions
    [0, 1, 1, 1, 1, 1], // Parent account and updates
    [0, 0, 0, 1, 1, 0], // Score guarantee (the cohort and both private packages)
    [0, 0, 0, 0, 0, 1], // School tools
  ];
  const BUNDLES = pairs(site["pricing bundles"]);
  if (BUNDLES.length !== INCLUDED.length)
    console.warn(
      `pricing: ${BUNDLES.length} bundle lines in copy.js, ${INCLUDED.length} rows in the ladder`
    );
  const CHECK =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.6 11.5 12.5 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const DASH =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  // the two words a screen reader needs for a check and a dash are the only English this page holds outside copy.js
  const cell = (v) =>
    v === 2
      ? `<span class="yes">${CHECK}<span class="sr">Included</span><em>${esc(PRIVATE[1].name)}</em></span>`
      : v
        ? `<span class="yes">${CHECK}<span class="sr">Included</span></span>`
        : `<span class="no">${DASH}<span class="sr">Not included</span></span>`;
  const planName = {
    free: S("free name"),
    platform: S("platform name"),
    plus: S("plus name"),
    program: S("program name"),
    private: S("private name"),
    school: S("school name"),
  };
  const planPrice = {
    free: `<b>${S("free price")}</b>`,
    platform: `<b>${esc(priceParts(site["pricing platform price"])[0])}</b><span>${esc(priceParts(site["pricing platform price"])[1])}</span>`,
    plus: `<b>${esc(priceParts(site["pricing plus price"])[0])}</b><span>${esc(priceParts(site["pricing plus price"])[1])}</span>`,
    program: `<b>${esc(marchPrice)}</b><span>${esc(marchNote)}</span>`,
    private: PRIVATE.map((p) => `<b>${esc(p.price)}</b><span>${esc(p.hours)}</span>`).join(""),
    school: `<b>${esc(priceParts(site["pricing school price"])[0])}</b><span>${esc(priceParts(site["pricing school price"])[1])}</span>`,
  };

  /* ---------- pieces both layouts share ---------- */
  const dateSeg = `<fieldset class="dates rv" style="--d:.15s">
        <legend>${S("date question")}</legend>
        <div class="seg">
          ${DATES.map((d, i) => `<label><input type="radio" name="date" value="${i}"${i ? "" : " checked"}><span>${esc(d)}</span></label>`).join("")}
          <label><input type="radio" name="date" value="other"><span>${S("other date")}</span></label>
        </div>
      </fieldset>`;
  const freeLine = `<div class="freeline rv">
        <p>${S("free line")}</p>
        <a class="lk" href="${ROUTES.test}#seat">${S("free button")}${ARROW}</a>
      </div>`;
  // the cohort: its price follows the SAT date chosen above; the installments only for March
  const cohortInner = `
        <h2 class="pname">${S("program name")}</h2>
        <p class="p-price big prog-price" aria-live="polite"><b class="amt"></b><span class="per"></span></p>
        <p class="pdate"><span class="prog-date"></span></p>
        <div class="pay" role="radiogroup" aria-label="${S("full")} / ${S("split")}">
          <label><input type="radio" name="pay" value="full" checked><span>${S("full")}</span></label>
          <label><input type="radio" name="pay" value="split"><span>${S("split")}</span></label>
        </div>
        <p class="ptext">${S("program text")}</p>
        <p class="pwhen prog-sentence"></p>
        <a class="badge" href="#guarantee"><span>${S("badge")}</span></a>
        <div class="pshot" aria-hidden="true"><figure class="wide laptop"><div class="lid"><div class="lcd">${SCR("calendar")}</div></div><div class="deck"></div></figure><div class="turn twin">${phone(SCR("calendarPhone"))}</div></div>
        <div class="cta">${btn(site["pricing program button"] || "", `${ROUTES.program}#apply`)}<small>${S("program deposit")}</small></div>`;
  const privateInner = `
        <h2 class="pname">${S("private name")}</h2>
        <p class="ptext">${S("private text")}</p>
        <div class="packs">${PRIVATE.map(
          (p, i) =>
            `<div class="packrow${i ? " hot" : ""}"><b>${esc(p.name)}</b><span class="hrs">${esc(p.hours)}</span><span class="amt">${esc(p.price)}</span>${i ? `<a class="mini" href="#guarantee">${esc(g.promise || "")}</a>` : ""}</div>`
        ).join("")}</div>
        <p class="pnote">${S("private note")}</p>
        <div class="pshot" aria-hidden="true"><div class="turn">${phone(SCR("sessionPhone"), "left")}</div></div>
        ${ghost(site["pricing private button"] || "", `${ROUTES.private}#call`)}`;
  const practiceRung = (key, button, href) => `<div class="rung" id="plan-${key}">
          <h3>${planName[key]}</h3>
          ${price(site[`pricing ${key} price`])}
          <p class="ptext">${S(`${key} text`)}</p>
          ${button ? ghost(button, href) : ""}
          <p class="pnote">${S(`${key} note`)}</p>
        </div>`;
  const signUp = (plan) => `${ROUTES.signUp}?plan=${plan}`;
  const schoolMail = `mailto:${site.email || ""}?subject=${encodeURIComponent(site["pricing school button"] || "")}`;
  const schoolInner = `<h2>${S("school name")}</h2>
          ${price(site["pricing school price"])}
          <p class="ptext">${S("school text")}</p>
          ${ghost(site["pricing school button"] || "", schoolMail)}
          <p class="pnote">${S("school note")}</p>`;

  /* ---------- layout A: a practice band, two program cards, a school band ---------- */
  const layoutA = `
      <section class="band practice" aria-labelledby="pp-h">
        <div class="band-words rv"><h2 id="pp-h">${S("practice title")}</h2><p>${S("practice text")}</p></div>
        <div class="ladder rv" style="--d:.08s">
          ${practiceRung("free")}
          ${practiceRung("platform", site["pricing platform button"], signUp("platform"))}
          ${practiceRung("plus", site["pricing plus button"], signUp("plus"))}
        </div>
        <div class="band-media rv" style="--d:.16s" aria-hidden="true"><div class="turn">${phone(SCR("daily10"))}</div></div>
      </section>
      <div class="programs">
        <article class="plan program rv">${cohortInner}</article>
        <article class="plan private rv" style="--d:.08s">${privateInner}</article>
      </div>
      <section class="band school" aria-labelledby="ps-h">
        <div class="band-words rv">${schoolInner.replace("<h2>", '<h2 id="ps-h">')}</div>
        <div class="band-media rv" style="--d:.1s" aria-hidden="true"><div class="turn">${phone(SCR("parent"), "left")}</div></div>
      </section>`;

  /* ---------- layout B: one vertical ladder of six ---------- */
  const rung6 = (key, inner, cls = "") =>
    `<article class="rung6 ${cls}" id="plan-${key}">${inner}</article>`;
  const simpleRung = (key, button, href) => `
        <div class="r-words"><h2>${planName[key]}</h2><p class="ptext">${S(`${key} text`)}</p><p class="pnote">${S(`${key} note`)}</p>${button ? ghost(button, href) : ""}</div>
        <div class="r-price">${price(site[`pricing ${key} price`])}</div>`;
  const layoutB = `
      <div class="ladder6">
        ${rung6("free", simpleRung("free"))}
        ${rung6("platform", simpleRung("platform", site["pricing platform button"], signUp("platform")))}
        ${rung6("plus", simpleRung("plus", site["pricing plus button"], signUp("plus")))}
        ${rung6(
          "program",
          `<div class="r-words">
            <h2>${S("program name")}</h2>
            <p class="pdate"><span class="prog-date"></span></p>
            <p class="ptext">${S("program text")}</p>
            <p class="pwhen prog-sentence"></p>
            <a class="badge" href="#guarantee"><span>${S("badge")}</span></a>
            <div class="cta">${btn(site["pricing program button"] || "", `${ROUTES.program}#apply`)}<small>${S("program deposit")}</small></div>
          </div>
          <div class="r-price">
            <p class="p-price big prog-price" aria-live="polite"><b class="amt"></b><span class="per"></span></p>
            <div class="pay" role="radiogroup" aria-label="${S("full")} / ${S("split")}">
              <label><input type="radio" name="pay" value="full" checked><span>${S("full")}</span></label>
              <label><input type="radio" name="pay" value="split"><span>${S("split")}</span></label>
            </div>
          </div>`,
          "program"
        )}
        ${rung6(
          "private",
          `<div class="r-words">
            <h2>${S("private name")}</h2>
            <p class="ptext">${S("private text")}</p>
            <p class="pnote">${S("private note")}</p>
            ${ghost(site["pricing private button"] || "", `${ROUTES.private}#call`)}
          </div>
          <div class="r-price">${PRIVATE.map(
            (p, i) =>
              `<p class="p-price"><b>${esc(p.price)}</b><span>${esc(p.name)}, ${esc(p.hours)}</span>${i ? `<a class="mini" href="#guarantee">${esc(g.promise || "")}</a>` : ""}</p>`
          ).join("")}</div>`
        )}
        ${rung6("school", simpleRung("school", site["pricing school button"], schoolMail))}
      </div>
      <div class="ladder-media" aria-hidden="true">
        <div class="turn">${phone(SCR("daily10"))}</div>
        <div class="turn">${phone(SCR("parent"), "left")}</div>
      </div>`;

  /* ---------- the comparison: one table of the 13 bundles by six plans; on phones, the same table one plan at a time ---------- */
  const table = `<table class="cmp-table">
        <thead><tr><th scope="col"><span class="sr">${S("compare title")}</span></th>${PLANS.map((p) => `<th scope="col"${p === "program" ? ' class="hot"' : ""}><b>${planName[p]}</b><span class="tprice">${planPrice[p]}</span></th>`).join("")}</tr></thead>
        <tbody>${BUNDLES.map(
          ([name, text], i) =>
            `<tr><th scope="row"><b>${esc(name)}</b><span>${esc(text || "")}</span></th>${(INCLUDED[i] || []).map((v, j) => `<td${PLANS[j] === "program" ? ' class="hot"' : ""}>${cell(v)}</td>`).join("")}</tr>`
        ).join("")}</tbody>
      </table>`;
  const stack = `<div class="cmp-stack">${PLANS.map(
    (p, j) => `<section class="cmp-plan${p === "program" ? " hot" : ""}">
          <h3>${planName[p]}</h3>
          <p class="tprice">${planPrice[p]}</p>
          <ul>${BUNDLES.map(([name], i) => {
            const v = (INCLUDED[i] || [])[j];
            return v
              ? `<li>${CHECK}<span>${esc(name)}${v === 2 ? `: ${esc(PRIVATE[1].name)}` : ""}</span></li>`
              : "";
          }).join("")}</ul>
        </section>`
  ).join("")}</div>`;

  /* ---------- the page ---------- */
  document.getElementById("main").innerHTML = `
  <section class="p-hero" data-light>
    <div class="in p-herogrid"><div class="p-words">
      <h1 class="rv" style="--d:.05s">${S("headline")}</h1>
      <p class="lede rv" style="--d:.1s">${S("text")}</p>
      ${dateSeg}
      <nav class="layout-switch rv" aria-label="Layout options for the founder's review" data-review style="--d:.2s">
        <a href="pricing.html?layout=a"${layout === "a" ? ' aria-current="page"' : ""}>A</a><a href="pricing.html?layout=b"${layout === "b" ? ' aria-current="page"' : ""}>B</a>
      </nav>
    </div>${photo("pricing", "ph-hero only-wide")}</div>
  </section>

  <section class="plans" data-light aria-label="${esc(site["pricing link"] || "")}">
    <div class="in">
      <p class="other-note" hidden>${S("other note")}</p>
      ${layout === "b" ? layoutB + freeLine : freeLine + layoutA}
      ${photo("pricing", "ph-side only-phone")}
    </div>
  </section>

  <section class="panel dark guarantee" id="guarantee" aria-labelledby="pg-h">
    <div class="in">
      ${K.guarantee({ ...g, headline: site["pricing guarantee headline"], text: site["pricing guarantee text"], link: site["pricing guarantee link"] || g.link }, "pg-h")}
      ${site["pricing covered"] ? `<p class="covered rv">${S("covered")}</p>` : ""}
    </div>
  </section>

  <section class="compare" data-light aria-labelledby="cmp-h">
    <div class="in">
      <h2 id="cmp-h" class="rv">${S("compare title")}</h2>
      <details class="cmp rv" open><summary>${S("compare open")}${KIT.icon("plus")}</summary>
        ${table}
        ${stack}
      </details>
      <div class="honest">
        <p class="rv">${S("honest note")}</p>
        <p class="rv" style="--d:.08s">${S("scholarship")}</p>
      </div>
    </div>
  </section>`;

  /* ---------- the choices: the SAT date and how to pay ---------- */
  const all = (sel) => [...document.querySelectorAll(sel)];
  function roll(el, txt) {
    if (el.textContent === txt) return;
    el.textContent = txt;
    if (!K.reduce)
      el.animate(
        [
          { transform: "translateY(35%)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" }
      );
  }
  function render() {
    const v = document.querySelector('input[name="date"]:checked').value;
    const other = v === "other";
    const i = other ? 0 : +v;
    document.querySelector(".other-note").hidden = !other;
    all(".plan.program, .rung6.program").forEach((el) => el.classList.toggle("dim", other));
    all(".prog-date").forEach((el) => (el.textContent = DATES[i] || ""));
    all(".prog-sentence").forEach((el) => (el.textContent = dateSentence(i)));
    const march = i === 0;
    all(".pay").forEach((p) => (p.hidden = !march || !splitAmount));
    if (!march) all('input[name="pay"][value="full"]').forEach((r) => (r.checked = true));
    const split = march && document.querySelector('input[name="pay"]:checked')?.value === "split";
    all(".prog-price").forEach((p) => {
      roll(p.querySelector(".amt"), split ? splitAmount : march ? marchPrice : laterPrice);
      p.querySelector(".per").textContent = split ? splitClause : march ? marchNote : "";
    });
  }
  // the two pay groups (one per layout) stay in step
  document.querySelectorAll('input[type="radio"]').forEach((r) =>
    r.addEventListener("change", () => {
      if (r.name === "pay")
        all(`input[name="pay"][value="${r.value}"]`).forEach((x) => (x.checked = true));
      render();
    })
  );
  render();
  // the comparison folds on phones; it opens by itself on wider screens
  const cmp = document.querySelector(".cmp");
  const fold = () =>
    (cmp.open = !matchMedia("(max-width: 700px)").matches || cmp.dataset.touched === "1");
  cmp.querySelector("summary").addEventListener("click", () => (cmp.dataset.touched = "1"));
  fold();
  // ?slow=1: the plans arrive late, so the skeleton shows (design rule 29)
  if (Q.has("slow") && KIT) {
    const host = document.querySelector(".plans > .in");
    KIT.wait(
      host,
      new Promise((r) => setTimeout(r, 1800)),
      `<div class="k-sk-plans">${KIT.SK.lines(2)}${KIT.SK.card()}${KIT.SK.card()}</div>`
    );
  }
  K.dock(site["pricing program button"], `${ROUTES.program}#apply`);
  K.init();
})();
