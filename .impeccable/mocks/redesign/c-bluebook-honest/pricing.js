/* The pricing page, direction C: six plans on one page, prices from copy.js (which mirrors offer.ts). The SAT
   date switch (21st.dev 23552) is the live thing: the cohort ticket (21st.dev 22433) changes with the date, on
   the first screen with its price and the screen's one marigold button (Apply for a seat). The free practice
   test is one line, never a card, with a text link; the other five plans are rows (21st.dev 28540) with the
   13-bundle table (21st.dev 21218) folded under them in a details element; the close carries the free test's
   marigold button and the page's photograph. */
import { shell, C, esc, list, pairs, btn, lk, ROUTES } from "./shell.js";

const P = Object.assign({}, C.Pricing || {}, C["Pricing close"] || {}), PH = C["90 Photos"] || {};
const FILM = "../../decision/film/";
const photo = (name, alt, cls) => `<div class="${cls}"><img src="${FILM}photos/${name}.webp" srcset="${FILM}photos/${name}-800.webp 800w, ${FILM}photos/${name}.webp 1400w" sizes="(max-width: 900px) 100vw, 420px" width="1400" height="1750" alt="${esc(alt)}" loading="lazy"></div>`;
const CHEV = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

function build(main) {
  const dates = list(P.dates);
  const cols = list(P["compare columns"]);
  const bundles = pairs(P.bundles);
  const matrix = Object.fromEntries(pairs(P.matrix).map(([k, v]) => [k, v.split(",").map((x) => x.trim())]));
  const PIC = { private: ["p-private", PH["private alt"]], school: ["p-school-class", PH["school alt"]] };
  const ROUTE_FOR = { free: ROUTES.signUp, platform: ROUTES.signUp + "?plan=platform", plus: ROUTES.signUp + "?plan=plus", private: ROUTES.private, school: `mailto:${esc((C.Site || {}).email)}?subject=${encodeURIComponent("School pilot")}` };
  const tier = (id, i) => `<div class="tier rv${PIC[id] ? " with-pic" : ""}" style="--d:${i * 0.06}s">${PIC[id] ? photo(PIC[id][0], PIC[id][1], "tpic") : ""}<div><p class="name">${esc(P[`${id} name`])}</p><p class="price">${esc(P[`${id} price`])}</p></div><p class="text">${esc(P[`${id} text`])}</p><div class="action">${lk(P[`${id} action`], ROUTE_FOR[id])}</div></div>`;

  main.innerHTML = `
  <section class="p-hero" id="prices" aria-labelledby="h1">
    <div class="wrap">
      <h1 id="h1" class="rv">${esc(P.headline)}</h1>
      <p class="lede rv" style="--d:.06s">${esc(P.text)}</p>
      <div class="choose rv" style="--d:.12s">
        <p class="q" id="date-q">${esc(P["date question"])}</p>
        <div class="seg" role="radiogroup" aria-labelledby="date-q" id="date-seg"><span class="seg-thumb" aria-hidden="true"></span>
          ${dates.map((d, i) => `<button type="button" role="radio" data-value="${i}" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(d)}</button>`).join("")}
          <button type="button" role="radio" data-value="other" aria-checked="false" tabindex="-1">${esc(P["other date"])}</button>
        </div>
        <p class="other" id="other-note" hidden>${esc(P["other note"])}</p>
      </div>
      <div class="ticket rv" id="ticket" aria-live="polite" style="--d:.18s">
        <div class="main"><h2 id="t-name">${esc(P["ticket name"])}</h2><p class="deposit" id="t-when"></p><ul class="rows">${list(P["ticket rows"]).map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p class="deposit">${esc(P["ticket deposit"])}</p></div>
        <div class="stub"><p class="price" id="t-price"></p><p class="price-note" id="t-note"></p><p class="deposit" id="t-close"></p>${btn(P["ticket button"], ROUTES.program)}</div>
      </div>
    </div>
  </section>

  <section class="freeline" id="free" aria-label="${esc(P["free button"])}">
    <div class="wrap">${photo("p-test", PH["test alt"], "fpic rv")}<p class="rv" style="--d:.06s">${esc(P["free line"])}</p><div class="rv" style="--d:.12s">${lk(P["free button"], ROUTES.test)}</div></div>
  </section>

  <section class="sec plans" id="plans" aria-labelledby="h-plans">
    <div class="wrap">
      <h2 id="h-plans" class="rv">${esc(P["plans title"])}</h2>
      <p class="lede rv" style="--d:.06s">${esc(P["plans text"])}</p>
      <div class="tiers">${["free", "platform", "plus", "private", "school"].map(tier).join("")}</div>
      <details class="compare rv" id="compare-details">
        <summary>${esc(P["compare open"])}${CHEV}</summary>
        <div id="compare-body"></div>
      </details>
    </div>
  </section>

  <section class="sec p-guarantee" id="guarantee" aria-labelledby="h-pg">
    <div class="wrap">
      <div class="words rv">
        <h2 id="h-pg">${esc(P["guarantee headline"])}</h2>
        <p class="badge">${esc(P["guarantee badge"])}</p>
        <p class="lede">${esc(P["guarantee text"])}</p>
        <p class="covered">${esc(P["guarantee covered"])}</p>
        ${lk(P["guarantee link"], ROUTES.guarantee)}
      </div>
      <div class="aside rv" style="--d:.1s">${photo("p-guarantee", PH["guarantee alt"], "gpic")}<p>${esc(P["honest note"])}</p><p>${esc(P.scholarship)}</p></div>
    </div>
  </section>

  <section class="p-close" id="start" aria-labelledby="h-start">
    <div class="wrap">
      <div class="words">
        <h2 id="h-start" class="rv">${esc(P["close headline"])}</h2>
        <p class="lede rv" style="--d:.06s">${esc(P["close text"])}</p>
        <div class="rv" style="--d:.12s">${btn(P["close button"], ROUTES.test)}</div>
      </div>
      ${photo("p-pricing", PH["pricing alt"], "cpic rv")}
    </div>
  </section>`;

  /* the comparison table is built when the details opens (13 rows, six columns, nothing hidden in the DOM before) */
  const det = main.querySelector("#compare-details"), body = main.querySelector("#compare-body");
  det.addEventListener("toggle", () => {
    if (!det.open || body.children.length) return;
    body.innerHTML = `<table>
      <thead><tr><th scope="col"><span class="vh">${esc(P["compare title"])}</span></th>${cols.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${bundles.map(([name, what]) => `<tr><td><span class="bundle">${esc(name)}</span><span class="what">${esc(what)}</span></td>${cols.map((c) => (matrix[name] || []).includes(c) ? `<td><span class="yes">${esc(P["compare yes"])}</span></td>` : `<td><span class="no">${esc(P["compare no"])}</span></td>`).join("")}</tr>`).join("")}</tbody>
    </table>
    <ul class="stack-list">${bundles.map(([name, what]) => `<li><b>${esc(name)}</b><span class="what">${esc(what)}</span><span class="in">${esc((matrix[name] || []).join(", "))}</span></li>`).join("")}</ul>`;
  });

  /* the live thing: pick the SAT date, the ticket changes */
  const T = [P["ticket march"], P["ticket may"], P["ticket june"]].map((s) => s.split(" = ").map((x) => x.trim()));
  const ticket = main.querySelector("#ticket"), other = main.querySelector("#other-note");
  const paintTicket = (v) => {
    if (v === "other") { ticket.hidden = true; other.hidden = false; return; }
    ticket.hidden = false; other.hidden = true;
    const [when, close, price, note] = T[+v] || T[0];
    main.querySelector("#t-when").textContent = when;
    main.querySelector("#t-close").textContent = close;
    main.querySelector("#t-price").textContent = price;
    main.querySelector("#t-note").textContent = note;
  };
  window.karmanSegmented(main.querySelector("#date-seg"), paintTicket);
  window.karmanTicket(ticket);
}

shell("pricing", build);
