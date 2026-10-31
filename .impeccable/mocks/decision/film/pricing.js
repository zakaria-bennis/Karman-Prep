/* Pricing: every price and every promise on one page. Pick the SAT date and the program card, its dates and
   its price change to match; the guarantee sits right under the plans with its whole terms, no fine print.
   Numbers mirror src/lib/marketing/offer.ts (the real page must read them from there). Words are in copy.js. */
(function () {
  const K = window.KARMAN;
  const { site, esc, btn, ROUTES, M, list } = K;
  const S = (k) => esc(site[`pricing ${k}`] || "");

  /* ---------- the offer (from offer.ts, 2026-10-25) ---------- */
  const DATES = [
    {
      key: "mar",
      short: "March 6",
      test: "Saturday, March 6, 2027",
      start: "Monday, January 4",
      closes: "Wednesday, December 30",
      price: 995,
      was: 1295,
      split: [3, 345],
      name: "The March SAT Program",
    },
    {
      key: "may",
      short: "May 1",
      test: "Saturday, May 1, 2027",
      start: "Monday, March 1",
      closes: "Wednesday, February 24",
      price: 1295,
      name: "The May SAT Program",
    },
    {
      key: "jun",
      short: "June 5",
      test: "Saturday, June 5, 2027",
      start: "Monday, April 5",
      closes: "Wednesday, March 31",
      price: 1295,
      name: "The June SAT Program",
    },
  ];
  // Private 10 and Private 20 (offer.ts, 2026-10-30): 20 hours costs less per hour
  const PRIVATE = {
    packs: [
      [10, 1495],
      [20, 2495],
    ],
  };
  const FREE = {
    date: "Saturday, December 12",
    time: "10:00 a.m. ET",
    length: "About 75 minutes, live on Zoom with a proctor",
  };
  const INCLUDES = {
    free: [
      "An estimated score range",
      "A domain-by-domain breakdown",
      "A 20-minute results call with a Karman tutor",
    ],
    program: [
      "Two live classes a week, up to six students",
      "Five full-length practice tests",
      "Classes built on the skills your group missed",
      "A weekly live session",
      "Daily 10 and our own practice questions",
      "Your cohort's group chat, answered daily",
      "A weekly update for parents",
    ],
    private: [
      "60-minute sessions with a Karman tutor",
      "Booked when it suits you, planned back from your test date",
      "Practice tests, Daily 10 and our own questions",
      "The weekly live session",
      "A note to parents after every session",
    ],
  };
  // what each option includes, side by side ("" = not included)
  const COMPARE = [
    ["Live classes in a group of up to six", "", "Two a week, 18 in all", ""],
    [
      "Full-length practice tests",
      "One shorter test, 49 questions",
      "Five, the first and the last proctored live",
      "On the platform",
    ],
    ["One-on-one time with a Karman tutor", "A 20-minute results call", "", "Every session"],
    ["Weekly live session: test mechanics and workshops", "", "yes", "yes"],
    ["Daily 10 and our own practice questions", "", "yes", "yes"],
    ["Cohort group chat, answered by a tutor every day", "", "yes", ""],
    ["Updates for parents", "", "Every week", "After every session"],
    [
      "The guarantee: +100 points or a 1450",
      "",
      "Money back or the next cohort free",
      "On 20 hours: free hours, then half back",
    ],
  ];
  const money = (n) => "$" + n.toLocaleString("en-US");
  const CHECK =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.6 11.5 12.5 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const cell = (v) =>
    v === "yes"
      ? `<span class="yes">${CHECK}<span class="sr">Included</span></span>`
      : v
        ? esc(v)
        : '<span class="no"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="sr">Not included</span></span>';
  const g = M(8);

  /* ---------- the page ---------- */
  document.getElementById("main").innerHTML = `
  <section class="p-hero" data-light>
    <div class="in p-herogrid"><div class="p-words">
      <p class="eyebrow rv">${S("eyebrow")}</p>
      <h1 class="rv" style="--d:.05s">${S("headline")}</h1>
      <p class="lede rv" style="--d:.1s">${S("text")}</p>
      <fieldset class="dates rv" style="--d:.15s">
        <legend>${S("date question")}</legend>
        <div class="seg" role="radiogroup">
          ${DATES.map((d, i) => `<label><input type="radio" name="date" value="${d.key}"${i ? "" : " checked"}><span>${esc(d.short)}</span></label>`).join("")}
          <label><input type="radio" name="date" value="other"><span>${S("other date")}</span></label>
        </div>
      </fieldset>
    </div>${K.photo("pricing", "ph-hero only-wide")}</div>
  </section>

  <section class="plans" data-light aria-label="${esc(site["pricing link"] || "")}">
    <div class="in">
      <p class="other-note" hidden>${S("other note")}</p>
      <div class="freeline rv">
        <p><b>${esc(site["free test link"])}, $0.</b> ${esc(FREE.date)}, ${esc(FREE.time)}. ${esc(FREE.length)}. ${INCLUDES.free.map(esc).join(", ")}.</p>
        <a class="lk" href="${ROUTES.test}#seat">${S("free button")}${K.ARROW}</a>
      </div>
      <div class="cards">
        <article class="plan program rv">
          <a class="badge" href="#guarantee"><b>+100</b><span>${S("badge")}</span></a>
          <h2 class="pname">${esc(DATES[0].name)}</h2>
          <div class="pay" role="radiogroup" aria-label="${S("full")} / ${S("split")}">
            <label><input type="radio" name="pay" value="full" checked><span>${S("full")}</span></label>
            <label><input type="radio" name="pay" value="split"><span>${S("split")}</span></label>
          </div>
          <p class="price" aria-live="polite"><b class="amt"></b><s class="was"></s><span class="per"></span></p>
          <dl class="when">
            <div><dt>Classes start</dt><dd class="start"></dd></div>
            <div><dt>Ends on the SAT</dt><dd class="test"></dd></div>
            <div><dt>Enrollment closes</dt><dd class="closes"></dd></div>
          </dl>
          <ul>${INCLUDES.program.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <div class="cta">${btn(site["pricing program button"] || "", `${ROUTES.program}#apply`)}<small>${S("program deposit")}</small></div>
        </article>

        <article class="plan private rv" style="--d:.08s">
          <h2>${esc(site["private link"])}</h2>
          <div class="pay hours" role="radiogroup">
            ${PRIVATE.packs.map(([h], i) => `<label><input type="radio" name="hours" value="${i}"${i ? "" : " checked"}><span>${h} hours</span></label>`).join("")}
          </div>
          <p class="price" aria-live="polite"><b class="amt"></b><span class="per"></span></p>
          <a class="badge g20" href="#guarantee" hidden><b>+100</b><span>On 20 hours: +100 points or a 1450.</span></a>
          <p class="meta">Start any time. You book each session when it suits you.</p>
          <ul>${INCLUDES.private.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <a class="ghost" href="${ROUTES.private}#call">${S("private button")}${K.ARROW}</a>
        </article>
      </div>
      ${K.photo("pricing", "ph-side only-phone")}
    </div>
  </section>

  <section class="panel dark guarantee" id="guarantee" aria-labelledby="pg-h">
    <div class="in">${K.guarantee({ ...g, headline: site["pricing guarantee headline"], text: site["pricing guarantee text"] }, "pg-h")}</div>
  </section>

  <section class="compare" data-light aria-labelledby="cmp-h">
    <div class="in">
      <h2 id="cmp-h" class="rv">${S("compare title")}</h2>
      <details class="cmp rv"${matchMedia("(max-width: 700px)").matches ? "" : " open"}><summary>${S("compare open")}${KIT.icon("plus")}</summary>
      <div class="tablewrap">
        <table>
          <thead><tr><th scope="col"><span class="sr">Feature</span></th><th scope="col">${esc(site["free test link"])}</th><th scope="col" class="hot">${esc(site["program link"])}</th><th scope="col">${esc(site["private link"])}</th></tr></thead>
          <tbody>${COMPARE.map((r) => `<tr><th scope="row">${esc(r[0])}</th><td>${cell(r[1])}</td><td class="hot">${cell(r[2])}</td><td>${cell(r[3])}</td></tr>`).join("")}
            <tr class="cost"><th scope="row">Price</th><td>$0</td><td class="hot prog-cost"></td><td>From ${money(PRIVATE.packs[0][1])}</td></tr>
          </tbody>
        </table>
      </div></details>
      <div class="honest">
        <p class="rv">${S("honest note")}</p>
        <p class="rv" style="--d:.08s">${S("scholarship")}</p>
      </div>
    </div>
  </section>`;

  /* ---------- the choices: the SAT date, how to pay, how many private hours ---------- */
  const prog = document.querySelector(".plan.program"),
    priv = document.querySelector(".plan.private");
  const set = (el, sel, txt) => (el.querySelector(sel).textContent = txt);
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
    const key = document.querySelector('input[name="date"]:checked').value;
    const other = key === "other";
    const d = DATES.find((x) => x.key === key) || DATES[0];
    prog.classList.toggle("dim", other);
    priv.classList.toggle("lift", other);
    document.querySelector(".other-note").hidden = !other;
    set(prog, ".pname", d.name);
    set(prog, ".start", d.start);
    set(prog, ".test", d.test);
    set(prog, ".closes", d.closes);
    const payBox = prog.querySelector(".pay");
    payBox.hidden = !d.split;
    if (!d.split) prog.querySelector('input[value="full"]').checked = true;
    const split = d.split && prog.querySelector('input[name="pay"]:checked').value === "split";
    roll(prog.querySelector(".amt"), split ? money(d.split[1]) : money(d.price));
    prog.querySelector(".per").textContent = split ? `× ${d.split[0]} payments` : "";
    prog.querySelector(".was").textContent = d.was && !split ? money(d.was) : "";
    document.querySelector(".prog-cost").textContent = money(d.price);
    const h = +document.querySelector('input[name="hours"]:checked').value;
    roll(priv.querySelector(".amt"), money(PRIVATE.packs[h][1]));
    priv.querySelector(".per").textContent = `for ${PRIVATE.packs[h][0]} hours`;
    priv.querySelector(".g20").hidden = h !== 1;
  }
  document
    .querySelectorAll('input[type="radio"]')
    .forEach((r) => r.addEventListener("change", render));
  render();
  K.dock(site["pricing program button"], `${ROUTES.program}#apply`);
  K.init();
})();
