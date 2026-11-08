/*
 * The new Today, from the founder's decisions of 2026-11-07
 * (docs/design/student-portal-decisions-2026-11-07.md). Maya is simulated.
 * The review bar switches type style, day, time of day, season, weather and the SAT countdown.
 */
const $ = (s) => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem("td-" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("td-" + k, JSON.stringify(v)); } catch { /* still runs */ } },
};
const SAT = new Date("2027-03-06T08:00");
const view = {
  type: store.get("type", "bold"),
  day: store.get("day", "0"),
  hour: store.get("hour", "now"),
  season: store.get("season", "auto"),
  weather: store.get("weather", "clear"),
  countdown: store.get("countdown", "real"),
  daily: store.get("daily", "todo"),
};

/* ---------- Time, season and the countdown ---------- */
function clock() {
  const d = new Date();
  if (view.hour !== "now") d.setHours(+view.hour, 20, 0, 0);
  return d;
}
function daysLeft() {
  if (view.countdown !== "real") return +view.countdown;
  return Math.max(0, Math.ceil((SAT - clock()) / 864e5));
}
function season() {
  if (view.season !== "auto") return view.season;
  const m = clock().getMonth();
  return m <= 1 || m === 11 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "fall";
}
function band(h = clock().getHours()) {
  return h >= 22 || h < 5 ? "night" : h < 11 ? "morning" : h < 17 ? "day" : "evening";
}
window.SCENE = () => ({ band: band(), hour: clock().getHours() + clock().getMinutes() / 60, season: season(), weather: view.weather, dayOffset: +view.day, theme: document.documentElement.dataset.theme });

/* ---------- Greetings: many lines, voice by time of day, and day lines only on their day ---------- */
const N = "Maya";
const LINES = {
  night: [`Still up, ${N}?`, "Quiet hours.", `The house is asleep, ${N}.`, "Late one tonight.", "One thing, then rest.", `Midnight focus, ${N}.`, "Soft light, clear head.", "The world's quiet. Good time to think.", `Night owl mode, ${N}.`, "Short and sharp tonight.", "Moon's out. So are you.", "Small steps count at this hour too."],
  morning: [`Morning, ${N}.`, "Early start. Nice.", `Good morning, ${N}.`, "Fresh brain, fresh start.", `Up and at it, ${N}.`, "Coffee and Transitions?", "A clear morning for clear answers.", `Rise and focus, ${N}.`, "The day's still yours."],
  schoolMorning: ["Before school? Respect.", "A few questions before first period?"],
  day: [`Afternoon, ${N}.`, `Good to see you, ${N}.`, "Snack first, then the Daily 10.", `Hey ${N}. Ready when you are.`, "Midday reset.", "A good hour for a good set.", `Let's make it count, ${N}.`],
  schoolDay: ["Back from school?", "School's out. Brain's still on."],
  evening: [`Evening, ${N}.`, `Back at it, ${N}.`, "Golden hour.", "Tonight's yours.", `Good evening, ${N}.`, "Dinner done? Let's go.", `Here we go, ${N}.`, "A calm evening for good work.", "Settle in.", `Nice to see you tonight, ${N}.`],
  weekend: ["Weekend mode: brain on.", `Weekend, and you're here, ${N}.`, "No school. All gains.", "Lazy day, sharp mind."],
  saturday: ["Saturday scholar.", "Saturday plans: crush the Daily 10."],
  sunday: ["Sunday study. Legend move.", "Sunday reset. Set up the week."],
  friday: ["Friday night study. Respect.", `It's Friday, ${N}. You're built different.`, "Friday. One set, then freedom."],
};
const MILESTONES = { 100: "100 days to the SAT. Plenty of time, if you use it.", 60: "Two months to go. This is where it adds up.", 30: "30 days out. Every night counts now.", 14: "Two weeks. Time to sharpen, not cram.", 7: "One week. You've done the work." };
function greeting() {
  const d = clock(), h = d.getHours(), day = d.getDay(), left = daysLeft(), weekend = day === 0 || day === 6;
  if (MILESTONES[left]) return MILESTONES[left];
  let pool = LINES[band(h)];
  if (!weekend && band(h) === "morning") pool = pool.concat(LINES.schoolMorning);
  if (!weekend && band(h) === "day") pool = pool.concat(LINES.schoolDay);
  if (weekend && h >= 9 && h < 21) pool = LINES.weekend.concat(day === 6 ? LINES.saturday : LINES.sunday);
  if (day === 5 && h >= 17 && h < 23) pool = LINES.friday.concat(LINES.evening);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------- Content, dated from today so it never goes stale ---------- */
const HOMEWORK = [
  { id: "h0", title: "Skill practice: Command of Evidence", size: "15 questions", in: -2 },
  { id: "h1", title: "Skill practice: Transitions", size: "15 questions", in: 0 },
  { id: "h2", title: "Lesson: Nonlinear functions", size: "12 min", in: 0 },
  { id: "h3", title: "Time trial: Linear equations", size: "10 questions, 12 min", in: 1 },
  { id: "h4", title: "Reading and Writing, module 1", size: "27 questions, 32 min", in: 2 },
  { id: "h5", title: "Full-length test 4", size: "98 questions, 2 hr 14 min", in: 6 },
];
const dayOf = (n) => { const d = clock(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const short = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const dueText = (n) => (n < 0 ? `Was due ${short(dayOf(n))}` : n === 0 ? "Tonight, 11:59 PM" : n === 1 ? "Tomorrow" : short(dayOf(n)));
const ICON = {
  today: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  homework: '<path d="M6 4h12v16H6z"/><path d="M9 9h6M9 13h6M9 17h3"/>',
  library: '<path d="M5 4v16M10 4v16M15 5l4 15"/>',
  calendar: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M9 3v5M15 3v5"/>',
  progress: '<path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/>',
};
const icon = (k, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">${ICON[k]}</svg>`;
function fox(size) {
  const F = window.FOX;
  return `<svg class="fox" viewBox="-60 -112 120 128" width="${size}" height="${(size * 128) / 120}" aria-hidden="true"><style>.fox .m-eH{opacity:0}.fox .m-mouth{d:path("${F.mouths.n}");fill:none}</style><g transform="scale(${F.scale})">${F.head}</g></svg>`;
}

function mainAction() {
  const left = daysLeft();
  if (left <= 14) return { title: "Test-Day Playbook", meta: `${left} days to go · 10 min`, cta: "Open the playbook" };
  if (view.daily === "todo") return { title: "Your Daily 10", meta: "10 questions · about 12 min · due tonight", cta: "Start Your Daily 10" };
  return { title: "Skill practice: Transitions", meta: "15 questions · about 18 min · due tonight", cta: "Start this homework" };
}
const chev = `<svg class="chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
const route = () => (location.hash.replace("#/", "") || "today").split("/")[0];
function todayView() {
  const a = mainAction(), late = HOMEWORK.filter((h) => h.in < 0).length;
  return {
    title: greeting(),
    body: `<div class="p-main">
    <section class="act">
      <h2 class="act-t">${a.title}</h2>
      <p class="meta">${a.meta}</p>
      <button class="cta" data-stub="This would open ${a.title}."><span>${a.cta}</span>${chev}</button>
    </section>
    <a class="resume" href="#" data-stub="This would reopen the lesson at minute 5.">
      <span class="ring" style="--p:.4" aria-hidden="true"></span>
      <span><b>Lesson: Nonlinear functions</b><small>5 of 12 min watched</small></span>
      <span class="go">Resume</span>
    </a>
    <figure class="note">
      <span class="who" aria-hidden="true">D</span>
      <blockquote><p>Nice work on Tuesday's set. Read the sentence before the blank first, then pick the transition.</p><figcaption>David</figcaption></blockquote>
    </figure>
    <section class="next">
      <div class="sec-h"><h2>Coming up</h2></div>
      <a class="row session" href="#/calendar"><span><b>Full-length review session with David</b><small>On Zoom</small></span><span>Tomorrow, 4:00 PM</span></a>
      <a class="row session" href="#/calendar"><span><b>1:1 session with David</b><small>On Zoom</small></span><span>${short(dayOf(4))}, 4:00 PM</span></a>
    </section>
    </div><div class="p-side">
    <section class="due">
      <div class="sec-h"><h2>Homework</h2><small>${HOMEWORK.length} open${late ? `, ${late} late` : ""}</small></div>
      ${[["Past due", (h) => h.in < 0], ["Tonight", (h) => h.in === 0], ["Tomorrow", (h) => h.in === 1], ["This week", (h) => h.in > 1]].map(([name, f]) => { const list = HOMEWORK.filter(f); return list.length ? `<h3 class="when">${name}</h3>` + list.map((h) => `<a class="row" href="#" data-stub="This would open ${h.title}."><span><b>${h.title}</b><small>${h.size}</small></span><span class="${h.in < 0 ? "late" : ""}">${dueText(h.in)}</span></a>`).join("") : ""; }).join("")}
      <a class="more" href="#/homework">See all homework</a>
    </section></div>`,
  };
}
let opened = false;
function render() {
  const r = route(), v = r === "today" ? todayView() : SCREENS[r] ? SCREENS[r]() : todayView();
  $("#view").innerHTML = `<header class="top"><h1 class="greet" id="greet"></h1></header><div class="panel" data-screen="${r}">${v.body}</div>`;
  $("#appbar").innerHTML = `<a class="streak" href="#/progress" aria-label="7 days in a row"><svg viewBox="0 0 24 30" width="15" height="19" aria-hidden="true"><path d="M12 1C14 8 21 11 21 19C21 25 17 29 12 29C7 29 3 25 3 19C3 13 8 11 9 5C11 9 11 11 12 13C13 9 12 5 12 1Z"/></svg>7</a><button class="avatar" data-stub="The account menu works in the main prototype." aria-label="Account menu">${fox(40)}</button>`;
  const p = window.paintingOfTheDay ? window.paintingOfTheDay(+view.day) : null;
  $("#credit").textContent = p ? `${p.title} · ${p.by}` : "";
  document.title = `${r[0].toUpperCase() + r.slice(1)} · Directions`;
  nav();
  if (!opened && window.paintIn) { $(".panel").style.opacity = 0; if (!typedWithPaint) $("#greet").textContent = ""; return; }
  arrive(v.title);
}
/* The box slides down from the top while the heading types in. */
function arrive(title, opening = false) {
  const panel = $(".panel"), still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  panel.style.opacity = "";
  if (!still) panel.animate([{ opacity: 0, transform: "translateY(-28px)" }, { opacity: 1, transform: "none" }], { duration: 700, easing: "cubic-bezier(.2,.9,.25,1)", fill: "backwards", delay: 120 });
  if (!(opening && typedWithPaint)) typeIn(title);
}
/* The greeting starts typing as the painting starts, and finishes with its last stroke. */
let typedWithPaint = false;
const firstTitle = () => { const r = route(); return r === "today" ? greeting() : SCREENS[r] ? SCREENS[r]().title : greeting(); };
addEventListener("paintstart", (e) => { if (opened || typedWithPaint) return; typedWithPaint = true; typeIn(firstTitle(), e.detail.ms); });
addEventListener("paintdone", () => { if (opened) return; opened = true; arrive(firstTitle(), true); });
addEventListener("hashchange", render);
function nav() {
  const items = [["today", "Today"], ["homework", "Homework"], ["library", "Library"], ["calendar", "Calendar"], ["progress", "Progress"]], r = route();
  $("#nav").innerHTML = `<span class="brand">K</span>` + items.map(([k, l]) => `<a href="#/${k}" ${k === r ? 'aria-current="page"' : ""}>${icon(k)}<span>${l}</span>${k === "homework" ? `<b class="badge">${HOMEWORK.length}</b>` : ""}</a>`).join("");
}

/* The greeting types itself in, like someone writing to you. Screen readers get the whole line at once. */
let typing = 0;
/* With `total`, the typing is paced to take exactly that long, pauses after punctuation included. */
function typeIn(text, total) {
  const el = $("#greet"), run = ++typing;
  el.setAttribute("aria-label", text);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = text; return; }
  el.innerHTML = `<span class="typed" aria-hidden="true"></span><span class="caret" aria-hidden="true"></span>`;
  const out = el.querySelector(".typed");
  const weight = (ch) => (/[.,?!:]/.test(ch) ? 5 : ch === " " ? 1.4 : 1);
  const lead = total ? 250 : 380, unit = total ? (total - lead) / [...text].reduce((n, ch) => n + weight(ch), 0) : 0;
  const start = performance.now();
  let i = 0, due = lead;
  const next = () => {
    if (run !== typing) return;
    if (i >= text.length) { setTimeout(() => { const c = el.querySelector(".caret"); if (c && run === typing) c.classList.add("done"); }, 900); return; }
    out.textContent += text[i];
    const ch = text[i++];
    if (total) { due += weight(ch) * unit; setTimeout(next, Math.max(0, start + due - performance.now())); }
    else setTimeout(next, /[.,?!:]/.test(ch) ? 260 : ch === " " ? 70 : 34 + Math.random() * 38);
  };
  setTimeout(next, lead);
}

/* Links that lead to screens not built yet say so, instead of doing nothing. */
let toastTimer = 0;
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-stub]");
  if (!el) return;
  e.preventDefault();
  const t = $("#toast");
  t.textContent = el.dataset.stub; t.hidden = false;
  t.animate([{ opacity: 0, transform: "translate(-50%,10px)" }, { opacity: 1, transform: "translate(-50%,0)" }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
});

/* ---------- Review bar ---------- */
function apply() {
  const r = document.documentElement.dataset;
  r.type = view.type; r.band = band(); r.season = season();
  if (window.redrawBackdrop) window.redrawBackdrop();
}
function control(id, key, after) {
  const el = $(id);
  el.value = view[key];
  el.onchange = () => { view[key] = el.value; store.set(key, view[key]); apply(); if (after) after(); };
}
control("#type", "type", render);
control("#day", "day", render);
control("#hour", "hour", render);
control("#season", "season");
control("#weather", "weather");
control("#countdown", "countdown", render);
control("#daily", "daily", render);
const lightDevice = matchMedia("(prefers-color-scheme: light)");
let themeChoice = store.get("theme", "device");
const applyTheme = () => { document.documentElement.dataset.theme = themeChoice === "device" ? (lightDevice.matches ? "light" : "dark") : themeChoice; if (window.redrawBackdrop) window.redrawBackdrop(); };
lightDevice.addEventListener("change", applyTheme);
$("#theme").onclick = () => { themeChoice = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; store.set("theme", themeChoice); applyTheme(); };
$("#again").onclick = () => typeIn(greeting());
applyTheme(); apply(); nav(); render();
setInterval(() => { if (view.hour === "now") { const b = band(); if (document.documentElement.dataset.band !== b) apply(); } }, 60000);
