/*
 * The four tabs beside Today, built from the founder's decisions of 2026-11-07. Each page fills
 * its box with cards (.card), so related things sit together with room between them.
 * Maya is simulated: every number here is demo data.
 */
/* Progress is always a ring (founder pick, 2026-11-08). Pass a fraction, the text inside, and a label for screen readers. */
const ring = (p, inner, label, size = 56) => `<span class="pring" style="--p:${p};--s:${size}px" role="img" aria-label="${label}"><b>${inner}</b></span>`;
const pct = (p) => `${Math.round(p * 100)}%`;
const skillRing = (lv) => {
  const total = lv.reduce((a, [, c]) => a + c, 0); let at = 0;
  const stops = lv.map(([, c, l]) => { const from = at, to = (at += c / total); return `var(--l${l}) ${from}turn ${to - 0.006}turn, transparent ${to - 0.006}turn ${to}turn`; }).join(", ");
  return `<span class="pring multi" style="--s:96px;--g:conic-gradient(${stops})" role="img" aria-label="${lv.map(([n, c]) => `${n} ${c}`).join(", ")}"><b>${total}<small>skills</small></b></span>`;
};
const LEVEL = ["Not started", "Learning", "Developing", "Proficient", "Mastered"];
/* Karman's 39 skills by domain, with simulated levels 0 to 4. */
const COURSES = [
  { name: "SAT Math", next: "Nonlinear functions", units: [
    ["Algebra", [4, 3, 3, 3, 2]], ["Advanced Math", [3, 1, 2]], ["Problem-Solving and Data Analysis", [4, 4, 3, 3, 2, 1, 1]], ["Geometry and Trigonometry", [3, 4, 2, 2]],
  ] },
  { name: "SAT Reading and Writing", next: "Transitions", units: [
    ["Information and Ideas", [3, 2, 3]], ["Craft and Structure", [4, 3, 2]], ["Expression of Ideas", [2, 2]], ["Standard English Conventions", [4, 3, 2, 1, 4, 3, 4, 3, 2, 3, 1, 3]],
  ] },
];
const squares = (levels) => levels.map((l) => `<i class="sq l${l}" title="${LEVEL[l]}"></i>`).join("");
const atLeast = (levels) => levels.filter((l) => l >= 3).length;
const row = (title, sub, right, stub, cls = "") => `<a class="row" href="#" data-stub="${stub}"><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</span><span class="${cls}">${right}</span></a>`;
const card = (title, small, inner, cls = "") => `<section class="card ${cls}"><div class="sec-h"><h2>${title}</h2>${small ? `<small>${small}</small>` : ""}</div>${inner}</section>`;
/* Typical time for each piece, from the student's own active time (pauses and rushed sets left out). */
const ESTIMATE = { h0: "about 18 min", h1: "about 18 min", h3: "about 12 min", h4: "about 35 min", h5: "2 hr 14 min" };

const SCREENS = {
  homework() {
    const item = (h) => `<a class="row" href="#" data-stub="This would open ${h.title}."><span><b>${h.title}</b><small>${[h.size, ESTIMATE[h.id]].filter(Boolean).join(" · ")}</small></span><span class="${h.in < 0 ? "late" : ""}">${dueText(h.in)}</span></a>`;
    const group = (name, f, cls = "") => { const list = HOMEWORK.filter(f); return list.length ? card(name, `${list.length}`, list.map(item).join(""), cls) : ""; };
    const done = [
      ["Time trial: Percentages", "9 of 10 right · 11 min", "Wed, Nov 4", "Fast and accurate. Try the 20-question trial next."],
      ["Lesson: Transitions", "Watched · 8 min", "Thu, Nov 5", "Good. Tonight's practice builds on this."],
      ["Skill practice: Words in Context", "13 of 15 right · 16 min", "Mon, Nov 2", "Nice work."],
    ];
    return {
      title: "Homework",
      body: `<div class="p-main">
          ${group("Past due", (h) => h.in < 0, "late-card").replace("</section>", `<p class="nudge">One piece is late. It still counts, so start with it tonight.</p></section>`)}
          ${group("Tonight", (h) => h.in === 0)}
          ${group("Tomorrow", (h) => h.in === 1)}
          ${group("This week", (h) => h.in > 1)}
        </div>
        <div class="p-side">
          ${card("Your week", "", `<div class="stat-row"><div><b>6</b><span>assigned</span></div><div><b>2</b><span>done</span></div><div><b>about 3 hr 50 min</b><span>left to do</span></div>${ring(2 / 6, "2/6", "2 of 6 done", 52)}</div>`)}
          ${card("Done", `${done.length}`, done.map(([t, sub, when, note]) => `<a class="row done" href="#" data-stub="This would open your answers and the review."><span><b>${t}</b><small>${sub}</small><em class="note-line">${note} <span>David</span></em></span><span>${when}</span></a>`).join(""))}
        </div>`,
    };
  },
  library() {
    const course = (c) => {
      const all = c.units.flatMap((u) => u[1]), done = atLeast(all), p = all.reduce((a, l) => a + l, 0) / (all.length * 4);
      return card(c.name, "", `<div class="ring-row">${ring(p, pct(p), `${c.name}: ${pct(p)}`, 64)}<span><b>${pct(p)} of the course</b><small>${done} of ${all.length} skills at Proficient or above</small></span></div>
        <a class="upnext-row" href="#" data-stub="This would open ${c.next}: a short video, one try-it question, then practice."><span><small>Up next</small><b>${c.next}</b></span><span class="go">Start</span></a>
        ${c.units.map(([u, lv]) => `<a class="unit" href="#" data-stub="This would open the ${u} unit and its unit test."><span class="unit-h"><b>${u}</b><small>${atLeast(lv)} of ${lv.length}</small></span><span class="sqs">${squares(lv)}</span></a>`).join("")}
        <div class="course-foot"><a class="more" href="#" data-stub="This would open the course challenge.">Course challenge</a></div>`);
    };
    return {
      title: "Library",
      body: `<div class="banner"><div><b>Challenge question</b><span>Two hard questions, one Math and one Reading and Writing, the same for every student today.</span></div><button class="cta small" data-stub="This would open today's Challenge question."><span>Try it</span>${chev}</button><button class="x" aria-label="Dismiss" onclick="this.closest('.banner').remove()">×</button></div>
        <div class="p-main">${COURSES.map(course).join("")}</div>
        <div class="p-side">
          ${card("Practice", "", `${row("Endless mode", "Untimed, adapts as you go, and brings back questions you missed", "Start", "This would start endless mode.")}${row("Time trials", "Shorter than a full test, at real SAT pace", "Best 6:12", "This would start a time trial.")}`)}
          ${card("Full-length tests", "", `${row("Full-length test 4", "98 questions, 2 hr 14 min", "Sat, Nov 14", "This would open the test.")}${row("Full-length test 3", "Review your answers", "1360", "This would open your review.")}${row("Full-length test 2", "Review your answers", "1340", "This would open your review.")}${row("Full-length test 1", "Review your answers", "1300", "This would open your review.")}`)}
          ${card("Mastery", "", `<div class="legend">${[4, 3, 2, 1, 0].map((l) => `<span><i class="sq l${l}"></i>${LEVEL[l]}</span>`).join("")}</div><p class="small-note">Mastered needs a mixed review. Unit tests can move several skills at once.</p>`)}
        </div>`,
    };
  },
  calendar() {
    const base = dayOf(0), y = base.getFullYear(), m = base.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    const marks = { [dayOf(1).getDate()]: "s", [dayOf(4).getDate()]: "s", [dayOf(6).getDate()]: "t", [dayOf(11).getDate()]: "s" };
    const cells = Array.from({ length: first }, () => `<i></i>`).concat(Array.from({ length: days }, (_, i) => { const d = i + 1, today = d === base.getDate(); return `<button class="day${today ? " today" : ""}${marks[d] ? " has " + marks[d] : ""}" data-stub="${marks[d] === "s" ? "This would show the session on this day." : marks[d] === "t" ? "Full-length test 4 is due this day." : "Nothing booked this day."}">${d}</button>`; })).join("");
    return {
      title: "Calendar",
      body: `<div class="p-main">
          ${card("Booked", "3", `${[["Full-length review", "Tomorrow, 4:00 PM"], ["1:1 session", `${short(dayOf(4))}, 4:00 PM`], ["1:1 session", `${short(dayOf(11))}, 4:00 PM`]].map(([t, when]) => `<div class="session"><span><b>${t}</b><small>${when} · David, on Zoom</small></span><span class="actions"><button class="ghost" data-stub="This would move the session. Free until 24 hours before.">Move</button><button class="ghost" data-stub="This would cancel the session.">Cancel</button></span></div>`).join("")}<p class="small-note">7 of 20 hours used. Moving is free until 24 hours before a session.</p><button class="cta" data-stub="This would open booking."><span>Book a session</span>${chev}</button>`)}
          ${card("Workshops and office hours", "", `${row("Live workshop: Command of Evidence", "With David, on Zoom", `${short(dayOf(3))}`, "This would save you a spot.")}${row("Office hours with David", "Drop in with questions", `${short(dayOf(5))}`, "This would save you a spot.")}`)}
        </div>
        <div class="p-side">
          ${card(base.toLocaleDateString("en-US", { month: "long", year: "numeric" }), "", `<div class="cal-h">${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<span>${d}</span>`).join("")}</div><div class="cal">${cells}</div><div class="legend"><span><i class="dot s"></i>Session</span><span><i class="dot t"></i>Test due</span></div>`)}
          ${card("Recordings", "", `${row("1:1 session with David", "48 min", "Tue, Nov 3", "This would play the recording.")}${row("Full-length review session", "55 min", "Tue, Oct 27", "This would play the recording.")}${row("Live workshop: Transitions", "42 min", "Wed, Oct 21", "This would play the recording.")}`)}
        </div>`,
    };
  },
  progress() {
    const tests = [["Jul 18", 1300], ["Aug 29", 1340], ["Oct 3", 1360], ["Now", 1390]], lo = 1280, hi = 1400, W = 300, H = 90;
    const px = (i) => 12 + (i * (W - 24)) / (tests.length - 1), py = (v) => H - 14 - ((v - lo) / (hi - lo)) * (H - 28);
    const chart = `<svg class="trend" viewBox="0 0 ${W} ${H + 18}" role="img" aria-label="Predicted score from 1300 in July to 1390 now"><polyline points="${tests.map((t, i) => `${px(i)},${py(t[1])}`).join(" ")}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${tests.map((t, i) => `<circle cx="${px(i)}" cy="${py(t[1])}" r="4"/><text x="${px(i)}" y="${py(t[1]) - 9}" text-anchor="middle" class="v">${t[1]}</text><text x="${px(i)}" y="${H + 14}" text-anchor="middle">${t[0]}</text>`).join("")}</svg>`;
    const lv = [["Mastered", 8, 4], ["Proficient", 15, 3], ["Developing", 11, 2], ["Learning", 5, 1]];
    const weeks = [["Oct 12", 2.1], ["Oct 19", 3.4], ["Oct 26", 2.8], ["Nov 2", 4.2], ["This week", 3.1]];
    return {
      title: "Progress",
      body: `<div class="p-main">
          ${card("Karman predicted score", "", `<div class="score-row"><p class="score">1390</p><p class="meta">Up 30 since Test 3</p></div>${chart}<div class="stat-row"><div><b>700</b><span>Math</span></div><div><b>690</b><span>Reading and Writing</span></div></div>`)}
          ${card("Skills", "23 of 39 at Proficient or above", `<div class="ring-row">${skillRing(lv)}<div class="legend">${lv.map(([n, c, l]) => `<span><i class="sq l${l}"></i>${n} <b>${c}</b></span>`).join("")}</div></div><a class="more" href="#/library">See every skill</a>`)}
          ${card("What moved this week", "", `${row("Transitions", "Developing to Proficient, after Tuesday's set", "Up", "This would open the skill.", "up")}${row("Percentages", "Proficient to Mastered, in a mixed review", "Up", "This would open the skill.", "up")}${row("Circles", "Proficient to Developing, missed 2 of 3 on Test 3", "Down", "This would explain why it moved and how to win it back.", "down")}`)}
        </div>
        <div class="p-side">
          ${card("Time and effort", "Hours per week", `<div class="weeks">${weeks.map(([w, h]) => `<div><span class="wbar" style="height:${(h / 4.5) * 100}%"></span><small>${w}</small><b>${h}</b></div>`).join("")}</div><div class="stat-row"><div><b>412</b><span>questions this month</span></div><div><b>58 s</b><span>average pace</span></div></div>`)}
          ${card("Personal bests", "", `<div class="bests"><div><b>10 of 10</b><span>Best Daily 10</span></div><div><b>6:12</b><span>Fastest clean time trial</span></div><div><b>12 days</b><span>Longest streak</span></div></div>`)}
          ${card("Streak and rewards", "", `<div class="streak-big"><b>7</b><span>days in a row</span><small>One rest day a week keeps it going.</small></div><a class="row ring-line" href="#" data-stub="This would open Rewards.">${ring(240 / 300, "80%", "240 of 300 tokens", 44)}<span><b>Mystery box</b><small>240 of 300 tokens</small></span><span>60 to go</span></a>${row("Your fox", "Wearing reading glasses", "Change", "This would open the wardrobe.")}`)}
        </div>`,
    };
  },
};
