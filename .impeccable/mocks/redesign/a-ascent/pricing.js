// The pricing page of direction A "Ascent": the free test and its one button on the first screen, six plans
// as one stacked list (21st.dev 28540 "Pricing Tiers List", ported: rows with name, price, text and one action
// each, never three cards), one real screen of the engine, the comparison as a real table (21st.dev 21218
// "Feature Comparison Table", ported, six columns) that becomes one list per plan on phones (21st.dev 24850
// "FAQ List", ported to <details>), the guarantee as plain headed text, and the close (21st.dev 18475 "Call to
// Action", ported: title, text, one button).
import { init, S, M, esc, list, pairs, btn, tlink, I, R, themeNow } from "./site.js";

const F = "../../decision/film/";
const E = "../engine/renders/";
const main = document.getElementById("main");
const bullets = (xs) => `<ul>${xs.map((x) => `<li>${I.bullet}<span>${esc(x)}</span></li>`).join("")}</ul>`;

const PLANS = [
  { k: "free", href: R.signUp, g: false },
  { k: "platform", href: R.signUp, g: false },
  { k: "plus", href: R.signUp, g: false },
  { k: "program", href: R.program, g: true, pic: "p-program" },
  { k: "private", href: R.private, g: true },
  { k: "school", href: `mailto:${S.email}?subject=${encodeURIComponent("School pilot")}`, g: false, pic: "p-school-class", wide: true },
];
const row = ({ k, href, g, pic, wide }) => {
  const name = S[`pricing ${k} name`], price = S[`pricing ${k} price`];
  const b = S[`pricing ${k} button plan`] || S[`pricing ${k} button`];
  const img = pic ? `<figure class="cut ppic ${wide ? "wide" : ""}"><img src="${F}photos/${pic}.webp" srcset="${F}photos/${pic}-800.webp 800w, ${F}photos/${pic}.webp ${wide ? 1600 : 1400}w" sizes="(max-width: 900px) 100vw, 300px" alt="${esc(S[`pricing ${k} photo alt`])}" width="${wide ? 1600 : 1400}" height="${wide ? 900 : 1750}" loading="lazy" decoding="async"></figure>` : "";
  return `<li class="plan ${g ? "guaranteed" : ""} ${pic ? "with-pic" : ""}" data-rise>
    <div><p class="name">${esc(name)}</p><p class="price">${esc(price)}</p></div>
    <div><p class="text">${esc(S[`pricing ${k} text`])}</p><p class="pnote">${esc(S[`pricing ${k} note`])}</p><div class="go">${tlink(b, href)}</div></div>
    ${img}
  </li>`;
};

/* the one real screen: the same answered question (conv-2, the Reading and Writing original) as the engine
   drew it on a desktop (1200 x 800 at 1x) and on a phone (440 x 956 at 1x); the phone capture is served
   under 800 px of viewport, both at their natural ratio, both following the theme */
const SHOT = { desktop: "conv-2-desktop-{m}-wrong", phone: "conv-2-phone-{m}-wrong" };
const src = (k, m) => `${E}${SHOT[k].replace("{m}", m)}.webp`;
const screen = () => {
  const m = themeNow() === "dark" ? "dark" : "light";
  return `<div class="bleed" data-ui><figure class="shot screen-shot"><picture>
    <source media="(max-width: 799px)" srcset="${src("phone", m)}" width="880" height="1912" data-shot="phone">
    <img src="${src("desktop", m)}" alt="${esc(S["pricing screen"])}" width="2400" height="1600" loading="lazy" decoding="async" data-shot="desktop">
  </picture></figure></div>`;
};

const G = M(8);
const bundles = pairs(S["pricing bundles"]);
const matrix = pairs(S["pricing matrix"]).map(([n, v]) => [n, v.split(",").map((x) => x.trim() === "1")]);
const names = list(S["pricing matrix names"]);
const phonePlan = (v, j) => {
  const yes = bundles.filter((_, i) => v[i]).map(([n]) => n);
  const no = bundles.filter((_, i) => !v[i]).map(([n]) => n);
  return `<details><summary>${esc(names[j])}${I.chevron}</summary><div class="inner">
    <h3>${esc(S["pricing yes"])}</h3>${bullets(yes)}
    ${no.length ? `<p class="small">${esc(S["pricing no"])}: ${esc(no.join(", "))}.</p>` : ""}
  </div></details>`;
};

main.innerHTML = `
<section class="panel first" aria-labelledby="h1"><div class="wrap"><div class="p-hero">
  <div class="words"><h1 id="h1" data-rise>${esc(S["pricing headline"])}</h1><p class="lede" data-rise style="--d:60ms">${esc(S["pricing text"])}</p>
    <p class="freeline" data-rise style="--d:120ms">${esc(S["pricing free line"])}</p>
    <div data-rise style="--d:120ms">${btn(S["pricing free button"], R.test)}</div></div>
  <figure class="cut" data-rise style="--d:60ms"><img src="${F}photos/p-pricing.webp" srcset="${F}photos/p-pricing-800.webp 800w, ${F}photos/p-pricing.webp 1400w" sizes="(max-width: 900px) 100vw, 40vw" alt="${esc(S["pricing photo alt"])}" width="1400" height="1750" decoding="async" fetchpriority="high"></figure>
</div></div></section>
<section class="panel" aria-labelledby="h2"><div class="wrap">
  <h2 id="h2" data-rise>${esc(S["pricing plans title"])}</h2>
  <p class="lede" data-rise style="--d:60ms; margin-top: 16px">${esc(S["pricing practice text"])}</p>
  <ul class="plans">${PLANS.map(row).join("")}</ul>
</div></section>
<section class="panel" aria-labelledby="h6" style="padding-top:0"><div class="wrap">
  <h2 id="h6" data-rise>${esc(S["pricing screens title"])}</h2>
  <p class="lede" data-rise style="--d:60ms">${esc(S["pricing screens text"])}</p>
  <div data-rise style="--d:120ms">${screen()}</div>
</div></section>
<section class="panel" aria-labelledby="h3" style="padding-top:0"><div class="wrap">
  <h2 id="h3" data-rise>${esc(S["pricing compare title"])}</h2>
  <p class="lede" data-rise style="--d:60ms">${esc(S["pricing compare text"])}</p>
  <div class="cmp" data-rise>
    <table><thead><tr><th>${esc(S["pricing compare column"])}</th>${names.map((n) => `<th class="c">${esc(n)}</th>`).join("")}</tr></thead>
    <tbody>${bundles.map(([n, t], i) => `<tr><td><b>${esc(n)}</b><span>${esc(t)}</span></td>${matrix.map(([, v]) => `<td class="c ${v[i] ? "yes" : "no"}">${v[i] ? I.yes : I.no}<span class="sr">${esc(v[i] ? S["pricing yes"] : S["pricing no"])}</span></td>`).join("")}</tr>`).join("")}</tbody></table>
    <div class="cmp-phone">${matrix.map(([, v], j) => phonePlan(v, j)).join("")}</div>
  </div>
  <p class="plans-note lede" data-rise>${esc(S["pricing scholarship"])}</p>
</div></section>
<section class="panel" aria-labelledby="h4" style="padding-top:0"><div class="wrap">
  <h2 id="h4" data-rise>${esc(S["pricing guarantee headline"])}</h2>
  <p class="lede" data-rise style="--d:60ms">${esc(S["pricing guarantee text"])}</p>
  <div class="guar" data-rise style="--d:120ms">
    <div><p class="promise">${esc(G.promise)}</p><p class="promise-note small">${esc(G["promise note"])}</p>
      <dl class="outs">${pairs(G.outcomes).map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join("")}</dl></div>
    <div class="lists">
      <div><h3>${esc(G["we do title"])}</h3>${bullets(list(G["we do"]))}</div>
      <div><h3>${esc(G["you do title"])}</h3>${bullets(list(G["you do"]))}</div>
    </div>
    <div class="covers"><p>${esc(S["pricing covered"])}</p><p class="small">${esc(S["pricing honest note"])}</p>${tlink(G.link, R.guarantee)}</div>
  </div>
</div></section>
<section class="panel p-close" aria-labelledby="h5" style="background:var(--field)"><div class="wrap inner">
  <h2 id="h5" data-rise>${esc(S["pricing close headline"])}</h2>
  <p class="lede" data-rise style="--d:60ms">${esc(S["pricing close text"])}</p>
  <div data-rise style="--d:120ms">${btn(S["pricing close button"], R.test)}</div>
</div></section>`;

document.addEventListener("karman-theme", (e) => {
  const m = e.detail === "dark" ? "dark" : "light";
  document.querySelectorAll("[data-shot]").forEach((el) => { if (el.tagName === "SOURCE") el.srcset = src("phone", m); else el.src = src("desktop", m); });
});
init({ page: "pricing", withFilm: false });
