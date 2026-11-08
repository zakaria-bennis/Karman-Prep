/* Student portal prototype. Screens read the plan config and never test a plan name. */
const { PLANS, ADDS, MAYA, SET, FOX } = window;
const ICON = {
  today: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  homework: '<path d="M6 4h12v16H6z"/><path d="M9 9h6M9 13h6M9 17h3"/>',
  practice: '<path d="M5 18 15 8l4-3-3 4L6 19z"/><path d="M13 6l5 5"/>',
  progress: '<path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/>',
  rewards: '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/>',
  live: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/>',
  test: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  star: '<path d="M12 4l2.4 5 5.6.7-4 3.8 1 5.5-5-2.7-5 2.7 1-5.5-4-3.8 5.6-.7z"/>',
  word: '<rect x="3" y="8" width="5" height="8" rx="1"/><rect x="9.5" y="8" width="5" height="8" rx="1"/><rect x="16" y="8" width="5" height="8" rx="1"/>',
  miss: '<circle cx="12" cy="12" r="8"/><path d="M9 9l6 6M15 9l-6 6"/>',
  timer: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4M10 3h4"/>',
};
const tile = (i) => `<i class="tile"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[i]}</svg></i>`;
const flame = (s = 18) => `<svg viewBox="0 0 24 30" width="${s}" height="${(s * 30) / 24}" aria-hidden="true"><path d="M12 1C14 8 21 11 21 19C21 25 17 29 12 29C7 29 3 25 3 19C3 13 8 11 9 5C11 9 11 11 12 13C13 9 12 5 12 1Z" fill="var(--accent)"/><path d="M12 14C13 18 16 19 16 23C16 26 14 28 12 28C10 28 8 26 8 23C8 20 11 18 12 14Z" fill="color-mix(in srgb,var(--accent) 60%,#fff)"/></svg>`;
const token = (s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><circle cx="12" cy="12" r="11.2" fill="#dba63c"/><circle cx="12" cy="12" r="8.6" fill="#f5c84f"/><path d="M12 6.6 13.5 10.2 17.3 10.4 14.3 12.8 15.3 16.5 12 14.4 8.7 16.5 9.7 12.8 6.7 10.4 10.5 10.2Z" fill="#fff3bd"/></svg>`;
let foxN = 0;
function fox(size = 96, mood = "n") {
  const c = `f${foxN++}`;
  const acc = state.wearing ? FOX.acc[state.wearing] : "";
  const closed = mood === "h";
  return `<svg class="fox ${c}" viewBox="-60 -112 120 128" width="${size}" height="${(size * 128) / 120}" aria-hidden="true"><style>.${c} .m-eN{opacity:${closed ? 0 : 1}}.${c} .m-eH{opacity:${closed ? 1 : 0}}.${c} .m-blush{opacity:${closed ? 0.85 : 0.5}}.${c} .m-mouth{d:path("${FOX.mouths[mood]}");fill:${mood === "n" ? "none" : "#7A2E24"}}</style><g transform="scale(${FOX.scale})">${FOX.head}${acc}</g></svg>`;
}
const box = (s = 120) => `<svg viewBox="0 0 120 110" width="${s}" height="${(s * 110) / 120}" aria-hidden="true"><rect x="18" y="44" width="84" height="60" rx="6" fill="#c4473b"/><rect x="10" y="28" width="100" height="24" rx="6" fill="#dd5a4c"/><rect x="52" y="28" width="16" height="76" fill="#f5c84f"/><path d="M60 28C44 4 22 12 34 26ZM60 28C76 4 98 12 86 26Z" fill="#f5c84f"/></svg>`;

const store = {
  get(k, d) { try { const v = localStorage.getItem("kp-" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("kp-" + k, JSON.stringify(v)); } catch { /* the demo still runs */ } },
};
const FRESH = { results: [], spent: 0, wearing: null, prize: null, runs: {}, hwDone: [], custom: [], removed: [], skipped: [], sessions: null, creditsUsed: null };
let state = { ...FRESH, ...store.get("state", {}) };
let planId = store.get("plan", "platform");
if (!PLANS[planId]) planId = "platform";
let ui = { picked: null, checked: false, err: false, hideTimer: false, hl: false, pad: false, as: "student" };
const save = () => store.set("state", state);
const P = () => PLANS[planId];
const $ = (s) => document.querySelector(s);
const law = (n, t) => `<p class="law"><b>${n}:</b> ${t}</p>`;
const row = (href, name, right, icon) => `<a class="row" href="${href}"><b>${icon ? tile(icon) : ""}<span>${name}</span></b><span>${right}</span></a>`;
const still = (name, right) => `<div class="row"><b>${name}</b><span>${right}</span></div>`;

const finished = () => state.results.length >= 10;
const correct = () => state.results.filter(Boolean).length;
const earned = () => (finished() ? 35 + correct() * 5 : 0);
const tokens = () => MAYA.tokens + earned() + state.hwDone.length * 20 - state.spent;
const streak = () => MAYA.streak + (finished() ? 1 : 0);
const daysLeft = () => Math.round((new Date(MAYA.sat) - new Date(MAYA.today)) / 864e5);
const setName = () => (P().daily ? "Your Daily 10" : "Practice set");

function head(t, lawHtml = "") {
  return `<div class="top"><h1 tabindex="-1">${t}</h1>${avatar()}</div>${lawHtml}`;
}
function strip() {
  return `<div class="strip">
    <a href="#/rewards" aria-label="${streak()} days in a row">${flame()}<span data-count="streak" data-to="${streak()}">${streak()}</span><small>days in a row</small></a>
    <a href="#/rewards" class="gold" aria-label="${tokens()} gold tokens">${token()}<span data-count="tokens" data-to="${tokens()}">${tokens()}</span></a>
    <a href="#/progress" aria-label="${daysLeft()} days to the SAT"><span>${daysLeft()}</span><small>days to the SAT</small></a>
  </div>${law("Jakob", "Duolingo and Brilliant keep streak and points in the same top strip, so students already know how to read it.")}`;
}
function segs(results = state.results, total = 10) {
  const n = results.length;
  return `<div class="segs" role="img" aria-label="${n} of ${total} answered, ${results.filter(Boolean).length} right">${Array.from({ length: total }, (_, i) => `<i class="${i < n ? (results[i] ? "ok" : "no") : i === n ? "now" : ""}"></i>`).join("")}</div>`;
}
/* The set being played: Your Daily 10, or a piece of homework. */
function currentRun() {
  const id = location.hash.split("/")[2] || "daily";
  if (id === "daily") return { id, title: setName(), qs: SET, results: state.results };
  const h = allHomework().find((x) => x.id === id);
  if (!h) return { id: "daily", title: setName(), qs: SET, results: state.results };
  state.runs[id] = state.runs[id] || [];
  const qs = SET.filter((q) => (/Math|Linear|Nonlinear|Percent/.test(h.title) ? q.section === "Math" : q.section !== "Math")).slice(0, 5);
  return { id, title: h.title, qs, results: state.runs[id], hw: h };
}
function heroAction() {
  const name = setName(), n = state.results.length;
  if (finished()) return { title: `${name} is done`, sub: `${correct()} of 10 right today`, cta: "Keep practicing", href: "#/practice", mood: "h" };
  if (n > 0) return { title: name, sub: `Due today. ${10 - n} questions left`, cta: `Continue ${name}`, href: "#/set", mood: "o" };
  return { title: name, sub: "Due today. Starts with Transitions", cta: P().daily ? "Start Your Daily 10" : "Start practicing", href: "#/set", mood: "n" };
}
function scoreCard(lawHtml = "") {
  return `<section class="card"><h2>Karman predicted score</h2>${lawHtml}
    <div class="score"><div class="num" data-count="score" data-to="${MAYA.predicted}" data-from="${MAYA.start}">${MAYA.predicted}</div></div>
    <p class="note">Up ${MAYA.predicted - MAYA.start} since June.</p>`;
}
function locked() {
  const u = P().upgrade;
  return `<section class="card"><h2>Karman predicted score</h2><p class="lock">Full-length tests and a Karman predicted score come with ${u}.</p><a class="link" href="#/plans">See what ${u} adds</a></section>`;
}
/* One series, so the title names it. Real tests only, scaled to her own scores, with no target line. */
function trendChart() {
  const pts = [...MAYA.tests.map((t) => ({ l: t.date, v: t.score })), { l: "Now", v: MAYA.predicted }];
  const W = 380, H = 150, base = 118, top = 30, n = pts.length, vals = pts.map((p) => p.v), lo = Math.min(...vals), hi = Math.max(...vals);
  const x = (i) => 24 + (i * (W - 48)) / (n - 1), y = (v) => base - ((v - lo) / (hi - lo || 1)) * (base - top);
  const line = pts.map((p, i) => `${x(i)},${y(p.v)}`).join(" ");
  const rx = 1;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Score rising from ${pts[0].v} to ${MAYA.predicted}">
    <polygon class="wash" points="${x(0)},${base + 8} ${line} ${x(n - 1)},${base + 8}"/>
    <line class="floor" x1="${x(0)}" x2="${x(n - 1)}" y1="${base + 8}" y2="${base + 8}"/>
    <polyline class="ln" pathLength="1" points="${line}"/>
    ${pts.map((p, i) => { const end = i === 0 || i === n - 1, r = i === n - 1 ? 6 : 4.5; return `<g class="pt${end ? " shown" : ""}" tabindex="0" aria-label="${p.l}: ${p.v}"><rect class="hit" x="${x(i) - 30}" y="0" width="60" height="${H}"/><rect class="mk" x="${x(i) - r}" y="${y(p.v) - r}" width="${r * 2}" height="${r * 2}" rx="${rx}"/><text class="val" x="${x(i)}" y="${y(p.v) - 12}" text-anchor="middle">${p.v}</text><text x="${x(i)}" y="${H - 4}" text-anchor="middle">${p.l}</text></g>`; }).join("")}</svg>`;
}

const VIEWS = {
  practice() {
    const p = P(), m = state.results.filter((r) => !r).length + MAYA.misses;
    return head("Practice", law("Hick", "one recommended mode leads. Everything else is a quiet list.")) + `
    <div class="cols"><div class="stack">
      <section class="card hero"><div class="hero-top"><div><h2>Endless practice</h2><p class="state">Starts with Nonlinear functions</p></div>${fox(84, "o")}</div><div style="height:18px"></div><a class="cta" href="#/set">Start practicing</a></section>
      <section class="card"><h2>By section</h2>
        <a class="skill" href="#/set"><div><b style="font-weight:500">Math</b><span>${MAYA.sections.Math}</span></div><div class="meter math"><i style="width:${(MAYA.sections.Math / 800) * 100}%"></i></div></a>
        <a class="skill" href="#/set"><div><b style="font-weight:500">Reading and Writing</b><span>${MAYA.sections["Reading and Writing"]}</span></div><div class="meter rw"><i style="width:${(MAYA.sections["Reading and Writing"] / 800) * 100}%"></i></div></a>
      </section>
    </div><div class="stack">
      <section class="card"><h2>More ways to practice</h2>${law("Similarity", "every row is built the same, so each one reads as something to open.")}
        ${p.tests ? row("#/set", MAYA.nextTest.name, `Due ${MAYA.nextTest.due}`, "test") : ""}
        ${row("#/set", "Challenge question", "Due today", "star")}${row("#/set", "Wordline", "Due today", "word")}
        ${row("#/set", "Time trials", "Best 6:12", "timer")}${row("#/set", "Mistake log", `${m} to review`, "miss")}</section>
      ${p.questions ? `<section class="card"><h2>Questions on your plan</h2><div class="meter" role="img" aria-label="${p.used} of ${p.questions} used"><i style="width:${(p.used / p.questions) * 100}%"></i></div><p class="note">${p.used} of ${p.questions.toLocaleString("en-US")} used</p></section>` : ""}
    </div></div>`;
  },
  progress() {
    const p = P();
    return head("Progress", law("Progressive disclosure", "am I improving comes first. Full stats stay collapsed.")) + `
    <div class="cols"><div class="stack">
      ${p.tests ? scoreCard() + trendChart() + "</section>" : locked()}
      <section class="card"><h2>Skills</h2>${skillStrip()}${legend()}<a class="link" href="#/skills">See all skills</a></section>
    </div><div class="stack">
      ${p.guarantee ? `<section class="card"><h2>Guarantee status</h2>${still("Status", "On track")}</section>` : ""}
      ${p.tests ? `<section class="card"><h2>Full-length tests</h2>${MAYA.tests.map((t) => still(`Test ${t.n}, ${t.date}`, `${t.score}`)).join("")}${still(MAYA.nextTest.name, `Due ${MAYA.nextTest.due}`)}</section>` : ""}
      <section class="card"><details><summary>All stats</summary>${MAYA.stats.map(([a, b]) => still(a, b)).join("")}${still("Days to the SAT", `${daysLeft()}, ${MAYA.satLabel}`)}${p.rank ? still("Cohort rank", p.rank.place) + still("Cohort average", `${p.rank.average}`) : ""}</details></section>
    </div></div>`;
  },
  rewards() {
    const t = tokens(), ready = t >= MAYA.boxCost && !state.prize;
    return head("Rewards") + strip() + `
    <div class="cols"><div class="stack">
      <section class="card hero"><h2>${state.prize === "open" ? MAYA.prize.name : "Mystery box"}</h2>
      ${state.prize === "open" ? `<p class="state">Try it on, or keep it for later</p><div class="boxart">${(() => { const w = state.wearing; state.wearing = MAYA.prize.id; const s = fox(150, "o"); state.wearing = w; return s; })()}</div>
        <button class="cta" id="wear">Wear it</button><button class="link" id="keep">Keep for later</button>`
      : ready ? `<p class="state">One box ready. Open it or save it for later</p><div class="boxart">${box(150)}</div><button class="cta" id="open">Open box</button>`
      : `<p class="state">${t} of ${MAYA.boxCost} tokens to your next box</p><div class="boxart">${box(120)}</div><div class="meter g"><i style="width:${Math.min(100, (t / MAYA.boxCost) * 100)}%"></i></div><div style="height:16px"></div><a class="cta" href="#/set">${finished() ? "Earn more tokens" : `Start ${setName()}`}</a>`}
      </section>
    </div><div class="stack">
      <section class="card"><h2>Your fox</h2><div class="foxrow">${fox(96, "h")}<div><p style="font-weight:500">${state.wearing ? `Wearing ${MAYA.prize.name.toLowerCase()}` : "Nothing on yet"}</p>${state.wearing ? '<button class="link" id="takeoff">Take it off</button>' : ""}</div></div></section>
      <section class="card"><h2>Streak</h2>${still("Days in a row", `${streak()}`)}${still("Longest streak", `${MAYA.bestStreak} days`)}</section>
    </div></div>`;
  },
  live() {
    const l = P().live;
    if (!l) return VIEWS.today();
    if (P().schedule) return scheduleView();
    return head(l.tab) + `<div class="stack" style="max-width:720px">
      <section class="card hero"><h2>${l.row}</h2><p class="state">${l.when}</p><div style="height:18px"></div><a class="cta" href="#/live">${l.cta}</a></section>
      <section class="card"><h2>Coming up</h2>${l.rows.map(([a, b]) => row("#/live", a, b, "live")).join("")}</section>
    </div>`;
  },
  plans() {
    const u = P().upgrade || "Platform";
    return head(`What ${u} adds`, law("Honest design", "says plainly what it adds, with one action and no pressure.")) + `
    <section class="card" style="max-width:620px">${ADDS[u].map((a) => `<div class="row"><b>${a}</b></div>`).join("")}<div style="height:12px"></div><button class="cta" id="moveplan">Move to ${u}</button><a class="link" href="#/today">Not now</a></section>`;
  },
  profile() {
    return head(MAYA.name) + `<section class="card" style="max-width:620px">${still("SAT date", MAYA.satLabel)}${P().upgrade ? row("#/plans", "Plan", P().label) : still("Plan", P().label)}${still("Parent account", P().daily ? "Connected" : "Not on this plan")}<a class="link" href="#/today">Back to Today</a></section>`;
  },
  set() {
    const run = currentRun();
    if (run.results.length >= run.qs.length) return VIEWS.done();
    const n = run.results.length, q = run.qs[n], last = n === run.qs.length - 1;
    const cls = (i) => (!ui.checked ? "" : i === q.c ? "ok" : i === ui.picked ? "no" : "");
    return `<div class="q">
      <div class="bar"><a class="link" href="${run.hw ? "#/homework" : "#/today"}">Save and exit</a><span style="min-width:0">${run.title}</span>
      <button class="tool" id="tTimer" aria-pressed="${ui.hideTimer}">${ui.hideTimer ? "Show timer" : "Hide timer"}</button></div>
      ${segs(run.results, run.qs.length)}${law("Focus", "the navigation disappears in a set, so the question is all there is. Rule 56 tools stay close.")}
      <div class="bar"><span>Question ${n + 1} of ${run.qs.length}</span>${ui.hideTimer ? "" : `<span>${String(Math.floor((n + 1) * 0.9)).padStart(2, "0")}:${String((n * 17 + 12) % 60).padStart(2, "0")}</span>`}</div>
      <div class="tools"><button class="tool" id="tHigh" aria-pressed="${ui.hl}">Highlight</button><button class="tool" id="tPad" aria-pressed="${ui.pad}">Scratch pad</button></div>
      ${ui.pad ? '<textarea class="pad" aria-label="Scratch pad" placeholder="Work it out here"></textarea>' : ""}
      <section class="card"><p class="skillname">${q.skill}</p><p class="qtext ${ui.hl ? "hl" : ""}">${q.q}</p></section>
      <div class="stack" style="gap:8px" role="radiogroup" aria-label="Answers">${q.a.map((t, i) => `<button class="ans ${cls(i)}" role="radio" aria-checked="${ui.picked === i}" data-a="${i}" ${ui.checked ? "disabled" : ""}><strong>${"ABCD"[i]}</strong><span>${t}</span></button>`).join("")}</div>
      ${ui.err ? '<p class="err" role="alert">Pick an answer to continue.</p>' : ""}
      ${ui.checked ? `<div class="card fb" role="status"><b style="color:var(--${ui.picked === q.c ? "pos" : "neg"})">${ui.picked === q.c ? "Right" : `The answer is ${"ABCD"[q.c]}`}</b>${q.why}</div>` : ""}
      <button class="cta" id="next">${!ui.checked ? "Check answer" : last ? "Finish" : "Next question"}</button></div>`;
  },
  done() {
    const run = currentRun();
    if (run.hw) return homeworkDone(run);
    if (!finished()) return VIEWS.today();
    const printEnd = `<div class="bleed hero-zone end-band"><span class="stamp-in">${sealMark(92)}</span></div>`;
    return `${printEnd}<div class="q"><div style="display:grid;justify-items:center;gap:8px;text-align:center"><h1>${correct() >= 8 ? "That was a strong set" : "Set complete"}</h1></div>
      ${law("Peak-end", "a simple stand-in for the approved end screen. It ends proud, and never shows the predicted score.")}
      <section class="card">${segs()}<div class="endnums"><div><strong>${correct()} of 10</strong><p>Right</p></div><div><strong class="gold">+${earned()}</strong><p>Gold tokens</p></div><div><strong>${streak()}</strong><p>Days in a row</p></div><div><strong>${SET.filter((_, i) => state.results[i] === false).length}</strong><p>To review</p></div></div></section>
      ${movedUp() ? `<section class="moved" data-rise><b>${movedUp()}</b>${bars(levelOf(MAYA.skills.find((s) => s.name === movedUp())))}<span>Up to ${LEVELS[levelOf(MAYA.skills.find((s) => s.name === movedUp()))]}</span></section>` : ""}
      <a class="cta" href="#/today">${tokens() >= MAYA.boxCost && !state.prize ? "Back to Today, your box is ready" : "Back to Today"}</a></div>`;
  },
};

function route() {
  const r = location.hash.replace("#/", "").split("/")[0];
  return VIEWS[r] ? r : "today";
}
/* Bottom tabs on phone, rail on iPad and desktop. At most five, with one sliding pill. */
const NAV_ICON = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[id]}</svg>`;
let navKey = "", pillRun = null, pillPos = { x: 0, y: 0 };
function navItems() {
  const p = P();
  if (p.homework) return [["today", "Today"], ["homework", "Homework"], ["live", p.live.tab], ["practice", "Practice"], ["progress", "Progress"]];
  const items = [["today", "Today"], ["practice", "Practice"], ["progress", "Progress"], ["rewards", "Rewards"]];
  if (p.live) items.splice(1, 0, ["live", p.live.tab]);
  return items;
}
function renderNav() {
  const items = navItems(), key = items.map((i) => i[1]).join() + (state.wearing || "");
  const nav = $("#nav");
  if (key !== navKey) {
    navKey = key;
    nav.innerHTML = `<i class="pill"></i><a class="brand" href="#/today" aria-label="Karman, Today">K</a>` + items.map(([id, l]) => `<a href="#/${id}" data-nav="${id}">${NAV_ICON(id)}<span>${l}</span></a>`).join("") ;
    pillPos = null;
  }
  const cur = route();
  nav.querySelectorAll("[data-nav]").forEach((a) => {
    const on = a.dataset.nav === cur;
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    const n = a.dataset.nav === "homework" ? dueTonightCount() : 0;
    let b = a.querySelector(".badge");
    if (n && !b) { b = document.createElement("b"); b.className = "badge"; a.append(b); }
    if (!n && b) b.remove();
    if (n && b && b.textContent !== String(n)) { b.textContent = n; M.pop(b); }
  });
  movePill();
}
function movePill() {
  const nav = $("#nav"), pill = nav.querySelector(".pill"), a = nav.querySelector("[aria-current=page]");
  if (!pill) return;
  if (!a) { pill.style.opacity = 0; return; }
  const n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
  if (!r.width) return;
  pill.style.opacity = 1;
  pill.style.width = `${r.width}px`;
  pill.style.height = `${r.height}px`;
  const to = { x: r.left - n.left, y: r.top - n.top };
  if (!pillPos) { pillPos = to; pill.style.transform = `translate(${to.x}px,${to.y}px)`; return; }
  const from = { ...pillPos };
  if (pillRun) pillRun.stop();
  const horizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y);
  pillRun = M.spring(0, 1, { damping: 0.72, response: 0.42, onUpdate: (t) => {
    pillPos = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    const stretch = 1 + Math.sin(Math.min(1, Math.max(0, t)) * Math.PI) * 0.1;
    pill.style.transform = `translate(${pillPos.x}px,${pillPos.y}px) scale(${horizontal ? stretch : 1},${horizontal ? 1 : stretch})`;
  } });
}
addEventListener("resize", () => { if (pillRun) pillRun.stop(); pillPos = null; movePill(); });
/* Desktop rail: a pane of liquid glass. It slides out when the pointer reaches the
   left edge and slides back the moment the pointer leaves it. Touch keeps it fixed. */
const railAuto = matchMedia("(min-width:768px) and (hover:hover) and (pointer:fine)");
const nav0 = $("#nav"), railZone = Object.assign(document.createElement("div"), { className: "rail-zone" });
document.body.append(railZone);
let railRun = null, railX = -1, railV = 0, railOpen = false;
const railPaint = (x) => { railX = x; nav0.style.transform = `translate3d(${(x * (nav0.offsetWidth + 20)).toFixed(2)}px,0,0)`; nav0.style.visibility = x <= -0.995 ? "hidden" : "visible"; };
function setRail(open) {
  if (open === railOpen) return;
  railOpen = open;
  nav0.classList.toggle("open", open);
  if (railRun) railV = railRun.stop().v;
  if (open) { nav0.style.visibility = "visible"; movePill(); }
  railRun = M.spring(railX, open ? 0 : -1, { damping: open ? 0.78 : 1, response: open ? 0.36 : 0.2, velocity: railV, onUpdate: railPaint, onDone: () => { railRun = null; railV = 0; } });
}
function railMode() {
  if (railRun) { railRun.stop(); railRun = null; }
  if (railAuto.matches) { railOpen = false; railPaint(-1); nav0.classList.remove("open"); }
  else { nav0.style.transform = ""; nav0.style.visibility = ""; railX = -1; railOpen = false; }
}
railAuto.addEventListener("change", railMode);
railZone.addEventListener("pointerenter", () => { if (railAuto.matches) setRail(true); });
nav0.addEventListener("pointerleave", (e) => { if (railAuto.matches && e.clientX > 16 && !nav0.matches(":focus-visible, :has(:focus-visible)")) setRail(false); });
railZone.addEventListener("pointerleave", (e) => { if (railAuto.matches && !nav0.contains(e.relatedTarget)) setRail(false); });
nav0.addEventListener("focusin", (e) => { if (railAuto.matches && e.target.matches(":focus-visible")) setRail(true); });
nav0.addEventListener("focusout", (e) => { if (railAuto.matches && !nav0.contains(e.relatedTarget)) setRail(false); });
nav0.addEventListener("click", () => { if (document.activeElement && nav0.contains(document.activeElement)) document.activeElement.blur(); });
railMode();
/* Real refraction where the browser can do it: the edges of the pane bend what is behind them. */
function buildLens() {
  if (!navigator.userAgentData || !railAuto.matches) return;
  const w = nav0.offsetWidth, h = nav0.offsetHeight, band = 13, rad = 24;
  if (!w || !h) return;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"), im = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x + 0.5 - w / 2, py = y + 0.5 - h / 2, qx = Math.abs(px) - (w / 2 - rad), qy = Math.abs(py) - (h / 2 - rad);
    const dx = Math.max(qx, 0), dy = Math.max(qy, 0), sd = Math.hypot(dx, dy) + Math.min(Math.max(qx, qy), 0) - rad;
    const t = Math.max(0, 1 + sd / band), m = t * t;
    let nx = 0, ny = 0;
    if (qx > 0 && qy > 0) { const l = Math.hypot(dx, dy) || 1; nx = (dx / l) * Math.sign(px); ny = (dy / l) * Math.sign(py); }
    else if (qx > qy) nx = Math.sign(px); else ny = Math.sign(py);
    const k = (x + y * w) * 4;
    im.data[k] = 128 - nx * m * 127; im.data[k + 1] = 128 - ny * m * 127; im.data[k + 2] = 128; im.data[k + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const url = c.toDataURL();
  let svg = document.getElementById("lensDefs");
  if (!svg) { svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.id = "lensDefs"; svg.setAttribute("width", 0); svg.setAttribute("height", 0); svg.style.position = "absolute"; document.body.append(svg); }
  svg.innerHTML = `<filter id="lens" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${url}" x="0" y="0" width="${w}" height="${h}" result="map" preserveAspectRatio="none"/><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="soft"/><feDisplacementMap in="soft" in2="map" scale="30" xChannelSelector="R" yChannelSelector="G" result="bent"/><feColorMatrix in="bent" type="saturate" values="1.55"/></filter>`;
  nav0.classList.add("lensed");
}
addEventListener("load", buildLens);
addEventListener("resize", buildLens);

const FOCUS_VIEWS = ["set", "done"];
const order = () => navItems().map((i) => i[0]);
let lastRoute = null, navToken = 0;
function paintView(r, keep) {
  foxN = 0;
  const tutor = ui.as === "tutor";
  $("#app").classList.toggle("focus", tutor || FOCUS_VIEWS.includes(r));
  renderNav();
  $("#view").innerHTML = tutor ? tutorView() : VIEWS[r]();
  document.title = `${tutor ? "Tutor" : (navItems().find((i) => i[0] === r) || [r, r[0].toUpperCase() + r.slice(1)])[1]} · Student Portal Prototype`;
  if (!keep) scrollTo(0, 0);
  bind();
}
function render(keep) {
  paintView(route(), keep);
  if (keep) M.counts($("#view"));
  else M.enter($("#view"));
}
/* A route change: quick exit, then the new screen arrives along the tab order. */
async function navigate() {
  const r = route(), view = $("#view"), token = ++navToken;
  const o = order(), dir = o.includes(r) && o.includes(lastRoute) ? Math.sign(o.indexOf(r) - o.indexOf(lastRoute)) : 0;
  const opening = FOCUS_VIEWS.includes(r) && !FOCUS_VIEWS.includes(lastRoute);
  const closing = !FOCUS_VIEWS.includes(r) && FOCUS_VIEWS.includes(lastRoute);
  lastRoute = r;
  renderNav();
  M.close();
  const a = await M.exit(view, dir, opening || closing);
  if (token !== navToken) return;
  paintView(r);
  if (a && a.cancel) a.cancel();
  M.enter(view, { dir, grow: opening });
}
const on = (id, fn) => { const e = document.getElementById(id); if (e) e.onclick = fn; };
function bind() {
  document.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => {
    ui.picked = +b.dataset.a; ui.err = false; render(true);
    M.pop(document.querySelector(`[data-a="${b.dataset.a}"]`));
  }));
  on("tTimer", () => { ui.hideTimer = !ui.hideTimer; render(true); });
  on("tHigh", () => { ui.hl = !ui.hl; render(true); });
  on("tPad", () => { ui.pad = !ui.pad; render(true); const p = document.querySelector(".pad"); if (p) M.pop(p); });
  on("next", () => {
    const run = currentRun();
    if (ui.picked === null) { ui.err = true; render(true); M.shake(document.querySelector("[role=radiogroup]")); return; }
    const q = run.qs[run.results.length];
    if (!ui.checked) {
      ui.checked = true; render(true);
      const right = ui.picked === q.c;
      if (right) M.pop(document.querySelector(`[data-a="${q.c}"]`));
      else M.shake(document.querySelector(`[data-a="${ui.picked}"]`));
      M.anim(document.querySelector(".fb"), [{ opacity: 0, transform: "translateY(12px) scale(.96)" }, { opacity: 1, transform: "none" }], M.S.bounce);
      return;
    }
    run.results.push(ui.picked === q.c);
    ui.picked = null; ui.checked = false; ui.err = false;
    if (run.hw && run.results.length >= run.qs.length && !state.hwDone.includes(run.id)) state.hwDone.push(run.id);
    save();
    paintView(route());
    const v = $("#view");
    if (run.results.length >= run.qs.length) M.enter(v, { grow: false });
    else {
      M.anim(v.querySelector(".card"), [{ opacity: 0, transform: "translateX(36px) scale(.97)" }, { opacity: 1, transform: "none" }], M.S.pop);
      v.querySelectorAll(".ans").forEach((el, i) => M.anim(el, [{ opacity: 0, transform: "translateX(36px)" }, { opacity: 1, transform: "none" }], M.S.pop, { delay: 30 + i * 30 }));
      const seg = v.querySelectorAll(".segs i")[run.results.length - 1];
      M.anim(seg, [{ transform: "scaleY(.2)" }, { transform: "scaleY(1)" }], M.S.bounce);
    }
  });
  on("open", () => {
    const art = document.querySelector(".boxart svg");
    M.burst(art).then(() => { state.spent += MAYA.boxCost; state.prize = "open"; save(); paintView(route()); const f = document.querySelector(".boxart .fox"); M.anim(f, [{ transform: "scale(.2) rotate(-20deg)" }, { transform: "none" }], M.S.bounce); M.counts($("#view")); });
  });
  on("wear", () => { state.wearing = MAYA.prize.id; state.prize = "kept"; save(); render(); M.toast("Your fox is wearing it"); });
  on("keep", () => { state.prize = "kept"; save(); render(); });
  on("takeoff", () => { state.wearing = null; save(); render(); });
  on("moveplan", () => { setPlan((P().upgrade || "platform").toLowerCase()); location.hash = "#/today"; });
  bindSchool();
}
function setPlan(id) {
  planId = id; store.set("plan", id); $("#plan").value = id;
  state = { ...FRESH, runs: {}, results: [], hwDone: [], custom: [], removed: [], skipped: [] }; save(); ui.picked = null; ui.checked = false;
  if (!P().homework) { ui.as = "student"; $("#viewAs").value = "student"; }
  $("#asWrap").hidden = !P().homework;
  navKey = "";
  render();
}
window.setPlan = setPlan;
$("#plan").innerHTML = Object.entries(PLANS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
$("#plan").value = planId;
$("#plan").onchange = (e) => { setPlan(e.target.value); const known = navItems().map((i) => i[0]).concat(["set", "done", "plans", "profile", "rewards", "skills"]); if (!known.includes(route())) location.hash = "#/today"; };
$("#viewAs").onchange = (e) => { ui.as = e.target.value; render(); };
$("#lawsBtn").onclick = (e) => { const o = document.body.classList.toggle("laws"); e.target.textContent = o ? "Hide the laws" : "Show the laws"; };
$("#resetBtn").onclick = () => { setPlan(planId); location.hash = "#/today"; };
/* Follows the device, and dark when the device states no preference. */
const lightDevice = matchMedia("(prefers-color-scheme: light)");
const themeChoice = () => store.get("theme", "device");
const applyTheme = () => { const c = themeChoice(); document.documentElement.dataset.theme = c === "device" ? (lightDevice.matches ? "light" : "dark") : c; };
const setTheme = (c) => { store.set("theme", c); applyTheme(); };
lightDevice.addEventListener("change", applyTheme);
applyTheme();
$("#themeBtn").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
addEventListener("hashchange", navigate);
