/*
 * The "school" side of Cohort and Private: homework the way Canvas shows it,
 * the tutor's side of assigning it, and the 1:1 schedule with credits. The move
 * and cancel rules mirror src/app/api/bookings/reschedule/route.ts.
 */
const NOW = new Date(window.DEMO_NOW);
const { HOMEWORK, HW_TYPES, SUGGESTIONS, DUE_OPTIONS, RULES, CREDITS, SESSIONS, PAST_SESSIONS } = window;
const dayLabel = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const timeLabel = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const whenText = (iso) => { const d = new Date(iso); return `${dayLabel(d)}, ${timeLabel(d)}`; };
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/* ---------- Homework ---------- */
const dailyItem = () => ({ id: "daily", type: "daily", title: "Your Daily 10", size: "10 questions", due: `${dayKey(NOW)}T23:59` });
function allHomework() {
  return [dailyItem(), ...HOMEWORK, ...state.custom].filter((h) => !state.removed.includes(h.id));
}
const isDone = (h) => h.doneAt || (h.id === "daily" ? finished() : state.hwDone.includes(h.id));
/* Your Daily 10 always comes first; everything else runs in due order. */
const openHomework = () => allHomework().filter((h) => !isDone(h)).sort((a, b) => (b.id === "daily") - (a.id === "daily") || a.due.localeCompare(b.due));
const nextHomework = () => openHomework()[0];
function dueText(h) {
  const d = new Date(h.due), diff = Math.round((new Date(dayKey(d)) - new Date(dayKey(NOW))) / 864e5);
  if (diff === 0) return "Tonight, 11:59 PM";
  return `${dayLabel(d)}, 11:59 PM`;
}
const isLate = (h) => dayKey(new Date(h.due)) < dayKey(NOW);
const dueTonightCount = () => (P().homework ? openHomework().filter((h) => dayKey(new Date(h.due)) <= dayKey(NOW)).length : 0);
function hwGroups() {
  const today = dayKey(NOW), tomorrow = dayKey(addDays(NOW, 1)), weekEnd = dayKey(addDays(NOW, 7));
  const g = { late: [], tonight: [], tomorrow: [], week: [], later: [] };
  openHomework().forEach((h) => {
    const k = dayKey(new Date(h.due));
    if (k < today) g.late.push(h);
    else if (k === today) g.tonight.push(h);
    else if (k === tomorrow) g.tomorrow.push(h);
    else if (k <= weekEnd) g.week.push(h);
    else g.later.push(h);
  });
  return g;
}
function homeworkRow(h, opts = {}) {
  const done = isDone(h), t = HW_TYPES[h.type];
  const right = done ? (h.doneAt || "Today") : isLate(h) ? `<span class="late">Was due ${dayLabel(new Date(h.due))}</span>` : dueText(h);
  return `<button class="row btnrow" data-hw="${h.id}"><b>${done ? `<i class="tile good"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9"/></svg></i>` : tile(t.icon)}<span>${h.title}${opts.size ? `<span class="t2">${h.size}</span>` : ""}</span></b><span>${right}</span></button>`;
}
const hwHref = (h) => (h.id === "daily" ? "#/set" : `#/set/${h.id}`);
function openHomeworkSheet(id) {
  const h = allHomework().find((x) => x.id === id);
  if (!h) return;
  const done = isDone(h), lesson = h.type === "lesson", demoShort = !["daily", "lesson"].includes(h.type);
  M.open(`<h2>${h.title}</h2>
    <p class="meta">${h.size}.</p>
    ${still("Due", done ? `Done ${h.doneAt || "today"}` : isLate(h) ? `Was due ${dayLabel(new Date(h.due))}` : dueText(h))}
    ${h.result ? still("Result", h.result) : ""}
    ${h.note ? `<div class="noteb">${h.note}</div>` : ""}
    ${done ? '<button class="btn" data-close>Close</button>' : lesson ? '<button class="cta" id="lessonDone">Mark lesson as done</button>' : `<a class="cta" href="${hwHref(h)}">${h.id === "daily" ? "Start Your Daily 10" : "Start this homework"}</a>`}
    ${demoShort && !done ? '<p class="meta" style="font-size:14px">The demo shortens this to 5 questions.</p>' : ""}
    ${done ? "" : '<button class="link" data-close>Not now</button>'}`, {
    label: h.title,
    bind(s) {
      s.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => M.close()));
      const l = s.querySelector("#lessonDone");
      if (l) l.onclick = () => { state.hwDone.push(h.id); save(); M.close(); render(true); M.counts($("#view")); M.toast("Lesson done. +20 gold tokens"); };
    },
  });
}
function homeworkDone(run) {
  const n = run.results.filter(Boolean).length, nxt = nextHomework();
  return `<div class="q"><div style="display:grid;justify-items:center;gap:8px;text-align:center">${fox(130, "o")}<h1>Homework done</h1><p class="state">${run.title}</p></div>
    <section class="card">${segs(run.results, run.qs.length)}<div class="endnums"><div><strong>${n} of ${run.qs.length}</strong><p>Right</p></div><div><strong class="gold">+20</strong><p>Gold tokens</p></div></div></section>
    ${nxt ? `<a class="cta" href="#/homework">See what's next: ${nxt.title}</a>` : '<a class="cta" href="#/today">All caught up. Back to Today</a>'}</div>`;
}
VIEWS.homework = () => (P().homework ? homeworkView() : VIEWS.today());

/* ---------- Tutor ---------- */
function tutorView() {
  const list = allHomework().filter((h) => !isDone(h) && h.id !== "daily").sort((a, b) => a.due.localeCompare(b.due));
  const sug = SUGGESTIONS.filter((s) => !state.skipped.includes(s.id) && !state.custom.some((c) => c.sugId === s.id));
  return `<div class="top"><h1>Maya's homework</h1>${fox(48)}</div>
  <p class="state" style="margin-bottom:16px">Predicted ${MAYA.predicted}. ${P().label}.</p>
  ${law("Tesler", "Karman drafts the homework from the data, and the tutor only decides. Suggestions here are simulated.")}
  <div class="cols"><div class="stack">
    <section class="card"><h2>Suggested for Maya</h2>${sug.length ? sug.map((s) => `<div class="sug" data-sug="${s.id}"><b>${s.title}</b><p>${s.size}. Due ${dueText(s).replace(", 11:59 PM", "")}.<br>${s.why}</p><div class="actions"><button class="btn" data-add="${s.id}">Add to homework</button><button class="link" data-skip="${s.id}">Skip</button></div></div>`).join("") : '<p class="state">No more suggestions today.</p>'}</section>
    <button class="cta" id="newHw">Add your own homework</button>
  </div><div class="stack">
    <section class="card"><h2>Assigned</h2>${still("Your Daily 10", "Every day, automatic")}${list.map((h) => `<div class="row" data-assigned="${h.id}"><b>${tile(HW_TYPES[h.type].icon)}<span>${h.title}<span class="t2">${isLate(h) ? `Was due ${dayLabel(new Date(h.due))}` : dueText(h).replace(", 11:59 PM", "")}</span></span></b><button class="link" data-remove="${h.id}" aria-label="Remove ${h.title}">Remove</button></div>`).join("")}</section>
  </div></div>`;
}
/* A row collapses away, springing, then the list redraws. */
function leave(el, then) {
  if (M.reduced()) { then(); return; }
  const h = el.offsetHeight;
  el.style.overflow = "hidden";
  el.animate([{ opacity: 1, transform: "scale(1)", height: `${h}px` }, { opacity: 0, transform: "scale(.92)", height: "0px", paddingTop: 0, paddingBottom: 0 }], { duration: 240, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }).finished.then(then, then);
}
let form = { type: "skill", topic: 0, size: 0, due: 1, note: "", to: "maya" };
const formHtml = () => {
  const t = HW_TYPES[form.type], rank = P().rank;
  const opt = (arr, cur) => arr.map((a, i) => `<option value="${i}" ${i === cur ? "selected" : ""}>${a}</option>`).join("");
  return `<h2>Add homework</h2>
  <div class="field"><span id="ftype">Type</span><div class="chips" role="group" aria-labelledby="ftype">${Object.entries(HW_TYPES).filter(([k]) => k !== "daily").map(([k, v]) => `<button class="chip" data-type="${k}" aria-pressed="${k === form.type}">${v.label}</button>`).join("")}</div></div>
  <label class="field"><span>What</span><select id="fTopic">${opt(t.topics, form.topic)}</select></label>
  <label class="field"><span>Size</span><select id="fSize">${opt(t.sizes, form.size)}</select></label>
  <label class="field"><span>Due, at 11:59 PM</span><select id="fDue">${opt(DUE_OPTIONS.map((d) => d[1]), form.due)}</select></label>
  ${rank ? `<label class="field"><span>Assign to</span><select id="fTo"><option value="maya" ${form.to === "maya" ? "selected" : ""}>Maya</option><option value="all" ${form.to === "all" ? "selected" : ""}>The whole cohort</option></select></label>` : ""}
  <label class="field"><span>Note to Maya (optional)</span><textarea id="fNote" rows="2">${form.note}</textarea></label>
  <button class="cta" id="fSave">Assign homework</button><button class="link" data-close>Not now</button>`;
};
function openForm() {
  M.open(formHtml(), { label: "Add homework", bind: bindForm });
}
function bindForm(s) {
  s.querySelectorAll("[data-type]").forEach((b) => (b.onclick = () => { form = { ...form, type: b.dataset.type, topic: 0, size: 0 }; M.setSheet(formHtml(), "Add homework", bindForm); M.pop(s.querySelector(`[data-type="${form.type}"]`)); }));
  const val = (id, k) => { const e = s.querySelector(id); if (e) e.onchange = () => { form[k] = k === "to" ? e.value : +e.value; }; };
  val("#fTopic", "topic"); val("#fSize", "size"); val("#fDue", "due"); val("#fTo", "to");
  s.querySelector("#fNote").oninput = (e) => { form.note = e.target.value; };
  s.querySelector("[data-close]").onclick = () => M.close();
  s.querySelector("#fSave").onclick = () => {
    const t = HW_TYPES[form.type], topic = t.topics[form.topic];
    const title = form.type === "skill" ? `Skill practice: ${topic}` : form.type === "lesson" ? `Lesson: ${topic}` : form.type === "trial" ? `Time trial: ${topic}` : topic;
    state.custom.push({ id: `c${Date.now()}`, type: form.type, title, size: t.sizes[form.size], due: DUE_OPTIONS[form.due][0], note: form.note || undefined });
    const who = form.to === "all" ? "the whole cohort" : "Maya";
    form = { type: "skill", topic: 0, size: 0, due: 1, note: "", to: "maya" };
    save(); M.close(); render(true); M.toast(`Assigned to ${who}`);
  };
}

/* ---------- Schedule ---------- */
const sessions = () => (state.sessions || SESSIONS).slice().sort((a, b) => a.at.localeCompare(b.at));
const creditsUsed = () => (state.creditsUsed === null || state.creditsUsed === undefined ? CREDITS.used : state.creditsUsed);
const creditsFree = () => CREDITS.total - creditsUsed() - sessions().length;
const within24 = (s) => new Date(s.at) - NOW < RULES.noticeHours * 36e5;
/* Same decisions as the booking route: one move per session, free outside 24 hours,
   one credit inside, refused with no spare credit. A move by the tutor never costs. */
function moveRule(s) {
  if (s.moved >= RULES.movesPerSession) return { ok: false, why: "This session has already been moved once." };
  if (within24(s) && creditsFree() < 1) return { ok: false, why: "Moving inside 24 hours needs a spare credit, and you have none." };
  return { ok: true, cost: within24(s) ? 1 : 0 };
}
const HOURS = ["15:00", "16:00", "17:00", "18:00", "19:00"];
const slotDays = () => Array.from({ length: RULES.bookAheadDays }, (_, i) => addDays(NOW, i + 1));
function slotTaken(key, t) {
  const n = [...`${key}${t}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  return Math.abs(n) % 3 === 0 || sessions().some((s) => s.at === `${key}T${t}`);
}
const openDay = (d) => d.getDay() !== 0;
function dayGrid({ selected, onlyOpen }) {
  const has = new Set(sessions().map((s) => s.at.slice(0, 10)));
  return `<div class="dayg" ${onlyOpen ? 'role="radiogroup" aria-label="Day"' : ""}>${slotDays().map((d) => {
    const k = dayKey(d), label = d.toLocaleDateString("en-US", { weekday: "short" });
    if (!onlyOpen) return `<div class="dayc plain ${has.has(k) ? "has" : ""}" ${has.has(k) ? 'aria-label="Session on ' + dayLabel(d) + '"' : ""}>${label}<b>${d.getDate()}</b></div>`;
    return `<button class="dayc" role="radio" aria-checked="${selected === k}" data-day="${k}" ${openDay(d) ? "" : "disabled"}>${label}<b>${d.getDate()}</b></button>`;
  }).join("")}</div>`;
}
function scheduleView() {
  const up = sessions(), free = creditsFree(), used = creditsUsed();
  return head("Schedule", law("Tesler", "the rules live in the app. Every move shows its cost before it happens.")) + `
  <div class="cols"><div class="stack">
    <section class="card hero"><div class="bigcredit"><div class="num" data-count="credits" data-to="${free}">${free}</div><h2 style="margin:0">credits left</h2></div>
      <div class="meter" role="img" aria-label="${used} used, ${up.length} booked, ${free} free, of ${CREDITS.total}"><i style="width:${((used + up.length) / CREDITS.total) * 100}%"></i></div>
      <p class="state" style="margin:8px 0 16px">${used} used, ${up.length} booked, of ${CREDITS.total}. One session is one credit.</p>
      <button class="cta" id="bookBtn" ${free < 1 ? "disabled" : ""}>Book a session</button></section>
    <section class="card"><h2>Upcoming</h2>${law("Proximity", "each session sits with its own state: soon, or moved once.")}${up.length ? up.map((s) => `<button class="row btnrow" data-session="${s.id}"><b>${tile("live")}<span>${s.kind} with David${s.moved ? '<br><i class="tag" style="font-style:normal">Moved once</i>' : within24(s) ? '<br><i class="tag" style="font-style:normal">Inside 24 hours</i>' : ""}</span></b><span>${whenText(s.at)}</span></button>`).join("") : '<p class="state">Nothing booked yet.</p>'}</section>
  </div><div class="stack">
    <section class="card"><h2>Next 14 days</h2>${dayGrid({})}</section>
    <section class="card"><h2>The rules</h2><p class="rulebox" style="border:0;padding:0">Moves are free up to 24 hours before. Inside 24 hours, a move costs 1 credit. Each session can move once. If David moves a session, it never costs you.</p></section>
    <section class="card"><details><summary>Past sessions</summary>${PAST_SESSIONS.map((p) => still(p.kind, p.when)).join("")}</details></section>
  </div></div>`;
}
function openSession(id) {
  const s = sessions().find((x) => x.id === id);
  if (!s) return;
  const rule = moveRule(s), late = within24(s);
  M.open(`<h2>${s.kind}</h2><p class="meta">With David, on Zoom</p>
    ${still("When", whenText(s.at))}
    ${rule.ok ? `<p class="cost ${rule.cost ? "pay" : "free"}">${rule.cost ? "Moving now costs 1 credit, because it's inside 24 hours." : "Moving this session is free."}</p>` : `<p class="rulebox">${rule.why}</p>`}
    <button class="cta" id="doMove" ${rule.ok ? "" : "disabled"}>Move this session</button>
    <div class="actions"><button class="link" id="doCancel">Cancel session</button><button class="link" data-close>Not now</button></div>`, {
    label: s.kind,
    bind(sh) {
      sh.querySelector("[data-close]").onclick = () => M.close();
      sh.querySelector("#doCancel").onclick = () => confirmCancel(s, late);
      const m = sh.querySelector("#doMove");
      if (rule.ok) m.onclick = () => openPicker(s, rule.cost);
    },
  });
}
function confirmCancel(s, late) {
  M.setSheet(`<h2>Cancel this session?</h2><p class="meta">${whenText(s.at)}</p>
    <p class="cost ${late ? "pay" : "free"}">${late ? "It's inside 24 hours, so you lose this credit." : "It's more than 24 hours away, so your credit comes back."}</p>
    <button class="cta" id="yesCancel">Cancel session</button><button class="link" data-close>Keep it</button>`, "Cancel session", (sh) => {
    sh.querySelector("[data-close]").onclick = () => M.close();
    sh.querySelector("#yesCancel").onclick = () => {
      state.sessions = sessions().filter((x) => x.id !== s.id);
      if (late) state.creditsUsed = creditsUsed() + 1;
      save(); M.close(); render(true);
      M.toast(late ? "Cancelled. The credit is used" : "Cancelled. Your credit is back");
    };
  });
}
function openPicker(s, cost) {
  let pick = { day: null, time: null };
  const firstOpen = slotDays().find(openDay);
  pick.day = dayKey(firstOpen);
  const title = s ? "Move session" : "Book a session";
  const html = () => {
    const chosen = pick.time ? whenText(`${pick.day}T${pick.time}`) : null;
    return `<h2>${title}</h2>${s ? `<p class="meta">Now ${whenText(s.at)}</p>` : '<p class="meta">One hour with David, on Zoom. Up to 14 days ahead.</p>'}
    ${dayGrid({ selected: pick.day, onlyOpen: true })}
    <div class="slots" role="radiogroup" aria-label="Time">${HOURS.map((t) => { const taken = slotTaken(pick.day, t); return `<button class="slot" role="radio" aria-checked="${pick.time === t}" data-time="${t}" ${taken ? 'disabled aria-label="' + t + ', taken"' : ""}>${timeLabel(new Date(`${pick.day}T${t}`))}</button>`; }).join("")}</div>
    <p class="meta" style="font-size:14px">Times are Eastern.</p>
    ${s ? `<p class="cost ${cost ? "pay" : "free"}">${cost ? "This move costs 1 credit." : "This move is free."} A session can only move once.</p>` : '<p class="cost pay">This uses 1 credit.</p>'}
    <button class="cta" id="pickGo">${chosen ? `${s ? "Move to" : "Book"} ${chosen}` : "Pick a time"}</button><button class="link" data-close>Not now</button>`;
  };
  const bindP = (sh) => {
    sh.querySelectorAll("[data-day]").forEach((b) => (b.onclick = () => { pick = { day: b.dataset.day, time: null }; draw(); M.pop(document.querySelector(`[data-day="${pick.day}"]`)); }));
    sh.querySelectorAll("[data-time]").forEach((b) => (b.onclick = () => { pick.time = b.dataset.time; draw(); M.pop(document.querySelector(`[data-time="${pick.time}"]`)); }));
    sh.querySelector("[data-close]").onclick = () => M.close();
    sh.querySelector("#pickGo").onclick = () => {
      if (!pick.time) { M.shake(document.querySelector(".slots")); return; }
      const at = `${pick.day}T${pick.time}`, label = whenText(at);
      if (s) {
        state.sessions = sessions().map((x) => (x.id === s.id ? { ...x, at, moved: x.moved + 1 } : x));
        if (cost) state.creditsUsed = creditsUsed() + 1;
      } else {
        state.sessions = [...sessions(), { id: `n${Date.now()}`, kind: "1:1 session", at, moved: 0 }];
      }
      save(); M.close(); render(true);
      M.toast(`${s ? "Moved to" : "Booked for"} ${label}`);
    };
  };
  const draw = () => M.setSheet(html(), title, bindP);
  if (M.isOpen) draw();
  else { M.open(html(), { label: title, bind: bindP }); }
}

/* ---------- Wiring ---------- */
function bindSchool() {
  document.querySelectorAll("[data-hw]").forEach((b) => (b.onclick = () => openHomeworkSheet(b.dataset.hw)));
  document.querySelectorAll("[data-session]").forEach((b) => (b.onclick = () => openSession(b.dataset.session)));
  on("bookBtn", () => openPicker(null, 0));
  on("newHw", openForm);
  document.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => {
    const s = SUGGESTIONS.find((x) => x.id === b.dataset.add);
    leave(b.closest(".sug"), () => { state.custom.push({ ...s, id: `c${s.id}`, sugId: s.id }); save(); render(true); M.toast("Added to Maya's homework"); });
  }));
  document.querySelectorAll("[data-skip]").forEach((b) => (b.onclick = () => leave(b.closest(".sug"), () => { state.skipped.push(b.dataset.skip); save(); render(true); })));
  document.querySelectorAll("[data-remove]").forEach((b) => (b.onclick = () => leave(b.closest(".row"), () => { state.removed.push(b.dataset.remove); save(); render(true); M.toast("Removed"); })));
}
$("#asWrap").hidden = !P().homework;
lastRoute = route();
render();
