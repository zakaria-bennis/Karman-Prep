/*
 * Today, Homework and the shared pieces of the print world. It comes in two looks
 * for the founder to compare, ink and woodblock. Same student, same data, same rules.
 */
const LOOKS = { ink: "Ink", wood: "Woodblock" };
let look = store.get("look", "ink");
if (!LOOKS[look]) look = "ink";
const applyLook = () => { document.documentElement.dataset.look = look; };
applyLook();

/* ---------- What tonight holds, for any plan ---------- */
const shortName = (t) => t.replace("Skill practice: ", "").replace("Time trial: ", "a time trial on ").replace("Lesson: ", "a lesson on ");
function stops() {
  const p = P(), out = [];
  if (p.homework) {
    openHomework().slice(0, 4).forEach((h) => out.push({ title: h.title, short: shortName(h.title), size: h.id === "daily" ? "" : h.size, when: isLate(h) ? `Was due ${dayLabel(new Date(h.due))}` : dueText(h).replace(", 11:59 PM", ""), late: isLate(h), attr: h.id === "daily" ? `href="#/set"` : `data-hw="${h.id}"`, id: h.id, type: h.id === "daily" ? "daily" : h.type }));
    return out;
  }
  if (!finished()) { const a = heroAction(); out.push({ title: a.title, short: a.title, when: "Tonight", attr: `href="${a.href}"` }); }
  out.push({ title: "Challenge question", short: "the Challenge question", when: "Tonight", attr: 'href="#/set"' });
  out.push({ title: "Wordline", short: "Wordline", when: "Tonight", attr: 'href="#/set"' });
  if (p.tests) out.push({ title: MAYA.nextTest.name, short: MAYA.nextTest.name, when: MAYA.nextTest.due, attr: 'href="#/practice"' });
  return out;
}
const tag = (s, cls, inner) => (s.attr.startsWith("href") ? `<a class="${cls}" ${s.attr}>${inner}</a>` : `<button class="${cls}" ${s.attr}>${inner}</button>`);
function mainAction() {
  const p = P();
  if (p.homework) {
    const n = nextHomework();
    if (!n) return { cta: "Keep practicing", attr: 'href="#/practice"', title: "All caught up", done: true };
    if (n.id === "daily") return { cta: state.results.length ? "Continue Your Daily 10" : "Start Your Daily 10", attr: 'href="#/set"', title: n.title, due: n };
    if (n.type === "lesson") return { cta: "Open this lesson", attr: `data-hw="${n.id}"`, title: n.title, due: n };
    return { cta: "Start this homework", attr: `href="${hwHref(n)}"`, title: n.title, due: n };
  }
  const a = heroAction();
  return { cta: a.cta, attr: `href="${a.href}"`, title: a.title, sub: a.sub };
}
const ctaEl = (a, cls = "") => (a.attr.startsWith("href") ? `<a class="cta ${cls}" ${a.attr}>${a.cta}</a>` : `<button class="cta ${cls}" ${a.attr}>${a.cta}</button>`);
const countNum = (key, to, from) => `<span data-count="${key}" data-to="${to}" ${from ? `data-from="${from}"` : ""}>${to}</span>`;
const dueLine = (a) => (!a.due ? a.sub || "" : isLate(a.due) ? `Was due ${dayLabel(new Date(a.due.due))}` : dueText(a.due).startsWith("Tonight") ? "Due tonight, 11:59 PM" : `Due ${dueText(a.due)}`);
const avatar = () => `<button class="me-top" type="button" aria-label="Account menu" aria-haspopup="menu" aria-expanded="false">${fox(48)}</button>`;
const lawNote = (a, b) => law(a, b);

/* ---------- Ink and woodblock: printmaking looks over a plain, Canvas-like dashboard ---------- */
const sealMark = (size = 64) => `<svg class="seal" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><rect x="5" y="5" width="54" height="54" rx="3" filter="url(#rough)"/><path d="M23 16v32M42 16 25 33l18 15" fill="none" stroke-width="6" stroke-linecap="square" filter="url(#rough)"/></svg>`;
const inkRing = (s) => `<i class="ink-ring${s && s.late ? " late" : ""}" aria-hidden="true"></i>`;
/* What's next after the to-do list, so nobody has to go looking. */
function comingUp(listed = []) {
  const p = P(), rows = [], seen = (t) => listed.some((s) => s.title === t);
  if (p.schedule && sessions().length) { const n = sessions()[0]; rows.push(`<button class="row btnrow" data-session="${n.id}"><b><span>${n.kind} with David</span></b><span>${dayLabel(new Date(n.at))}</span></button>`); }
  if (p.live && p.live.rows) p.live.rows.slice(0, 2).forEach(([a, b]) => rows.push(`<a class="row" href="#/live"><b><span>${a}</span></b><span>${b}</span></a>`));
  if (p.tests && !seen(MAYA.nextTest.name)) rows.push(`<a class="row" href="#/practice"><b><span>${MAYA.nextTest.name}</span></b><span>${MAYA.nextTest.due}</span></a>`);
  return rows.length ? `<section class="coming" data-rise><h2>Coming up</h2>${rows.slice(0, 3).join("")}</section>` : "";
}
/* The predicted score, its real history and its two sections. */
function scorePanel() {
  if (!P().tests) return `<div class="scorep" data-rise>${locked()}</div>`;
  const last = MAYA.tests[MAYA.tests.length - 1], up = MAYA.predicted - last.score;
  return `<section class="scorep" data-rise><h2>Karman predicted score</h2>
    <a class="score-now" href="#/progress"><span class="num">${countNum("score", MAYA.predicted, MAYA.start)}</span><small>${up >= 0 ? "Up" : "Down"} ${Math.abs(up)} since Test ${last.n}</small></a>
    ${trendChart()}
    <div class="sect-pair"><a href="#/progress"><span>Math</span><b>${MAYA.sections.Math}</b></a><a href="#/progress"><span>Reading and Writing</span><b>${MAYA.sections["Reading and Writing"]}</b></a></div>
  </section>`;
}
/* More ways in, each with the one number that makes it worth opening. */
function morePractice() {
  const p = P(), m = state.results.filter((r) => !r).length + MAYA.misses;
  const items = [["#/set", "miss", "Mistake log", `${m} to review`], ["#/set", "timer", "Time trials", "Best 6:12"]];
  if (p.homework) items.unshift(["#/set", "star", "Challenge question", "Today"], ["#/set", "word", "Wordline", "Today"]);
  return `<section class="more" data-rise><h2>More practice</h2>${items.map(([h, i, a, b]) => row(h, a, b, i)).join("")}<a class="link" href="#/practice">All practice</a></section>`;
}
/* The next thing to do, said plainly: what it is, how big it is, when it's due. */
function nextUp(a) {
  const n = a.due, size = n && n.size ? n.size : (a.title === setName() ? "10 questions" : "");
  const meta = [size, dueLine(a)].filter(Boolean).join(" · ");
  const going = state.results.length > 0 && !finished() && a.title === setName();
  return `<div class="next" data-rise><h2 class="next-t">${a.done ? "You're all caught up" : a.title}</h2>${meta ? `<p>${meta}</p>` : ""}${going ? segs() : ""}<div class="next-cta">${ctaEl(a)}</div></div>`;
}
function printToday() {
  const p = P(), a = mainAction(), list = stops().slice(0, 4);
  return `<div class="bleed hero-zone"><div class="w hero-in">
      <div class="top" data-rise><h1>Welcome back, ${MAYA.name}</h1><div class="top-right"><div class="tally"><a href="#/rewards" aria-label="${streak()} days in a row">${flame()}<span data-count="streak" data-to="${streak()}">${streak()}</span><small>days in a row</small></a><a href="#/progress"><span>${daysLeft()}</span><small>days to the SAT</small></a></div>${avatar()}</div></div>
      ${nextUp(a)}${lawNote("Fitts and Hick", "one main action, with its size and due date, so the student knows what she's starting.")}
    </div></div>
    <div class="bleed"><div class="w dash">
      <div class="d-a">
        <section class="todo" data-rise><div class="group"><h2>To do</h2><small>${list.length ? `${list.length} open` : "All clear"}</small></div>${list.map((s) => tag(s, "row btnrow", `<b>${inkRing(s)}<span>${s.title}${s.size ? `<span class="t2">${s.size}</span>` : ""}</span></b><span class="${s.late ? "late" : ""}">${s.when}</span>`)).join("")}${p.homework ? `<a class="link" href="#/homework">See all homework</a>` : ""}${lawNote("Jakob", "a plain to-do list with due dates, as in Canvas. No one has to learn it.")}</section>
        ${comingUp(list)}
      </div>
      <div class="d-b">${skillsPanel()}</div>
      <div class="d-c">${scorePanel()}${morePractice()}</div>
    </div></div>`;
}

/* ---------- Homework ---------- */
function hwSections() {
  const g = hwGroups(), all = allHomework(), today = all.filter((h) => dayKey(new Date(h.due)) === dayKey(NOW)), doneT = today.filter(isDone).length;
  const sec = (title, list, sub, cls) => (list.length ? `<section class="hwg ${cls}" data-rise><div class="group"><h2>${title}</h2><small>${sub}</small></div>${list.map((h) => homeworkRow(h, { size: true })).join("")}</section>` : "");
  return { past: sec("Past due", g.late, `${g.late.length} to catch up`, "late"), tonight: sec("Tonight", g.tonight, `${doneT} of ${today.length} done`, "tn"), tomorrow: sec("Tomorrow", g.tomorrow, dayLabel(addDays(NOW, 1)), "tm"), week: sec("This week", g.week, "Next 7 days", "wk"), later: sec("Later", g.later, "", "lt"), done: `<section class="hwg dn" data-rise><details><summary>Done (${all.filter(isDone).length})</summary>${all.filter(isDone).map((h) => homeworkRow(h)).join("")}</details></section>` };
}
function homeworkView() {
  const a = mainAction(), s = hwSections(), left = openHomework().length;
  const lead = `<div class="bleed hero-zone hero-short"><div class="w band-text"><div class="top" data-rise><h1>${left ? `${left} left` : "You made it"}</h1>${avatar()}</div><p class="said" data-rise>${dueLine(a)}</p></div></div><div class="w stage-cta hw-cta" data-rise>${ctaEl(a)}</div>`;
  return lead + `<div class="bleed ground"><div class="w hw-grid"><div class="hw-col">${s.past}${s.tonight}${s.tomorrow}</div><div class="hw-col">${s.week}${s.later}${s.done}</div></div></div>`;
}
VIEWS.today = printToday;

/* One authored moment: the score line draws in and the finish stamp lands. */
function styleEnter(view) {
  if (M.reduced()) return;
  const line = view.querySelector(".chart .ln");
  if (line) line.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1100, delay: 200, easing: "cubic-bezier(.5,.05,.2,1)", fill: "backwards" });
  const seal = view.querySelector(".stamp-in");
  if (seal) M.anim(seal, [{ opacity: 0, transform: "scale(2.6) rotate(-12deg)" }, { opacity: 1, transform: "rotate(-4deg)" }], M.S.pop, { delay: 620 });
}
const lookSel = document.getElementById("style");
lookSel.innerHTML = Object.entries(LOOKS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
lookSel.value = look;
lookSel.onchange = (e) => { look = e.target.value; store.set("look", look); applyLook(); worldRefresh(); render(); };
