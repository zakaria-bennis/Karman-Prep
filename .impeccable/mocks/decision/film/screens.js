/* Karman's product screens, drawn in code (2026-10-25, rebuilt 2026-10-31 for the October 30 offer).
   They replace screenshots, so they match the white, black and marigold site and stay sharp at every size.
   Every word on them is the product's own interface text, not marketing copy, so it lives here rather than in
   copy.js. Content follows the founder's app rules: "Your Daily 10", a solid underline blank, highlight, scratch
   pad and a timer you can hide, a question-set indicator that shows right and wrong, a tutor named David, due
   dates on everything, a slim icon rail, a parent view that leads with skill mastery and questions answered in
   words (never a level or a meter), and no attendance number. Only features in the offer appear; a feature that
   has not shipped carries its "Coming" season on the screen itself. The students and the questions are fictional
   Karman originals; nobody on a screen is a generated face, and no generated face sits beside a score.
   Each screen's root carries data-ui, so the inspector reads it as an interface fragment (its own lines).
   Laptop screens have a phone twin (name + "Phone") for widths where a laptop screen would shrink to 6px type
   (design rule 44). window.KARMAN_SCREENS[name]() returns the screen's HTML. */
(function () {
  const ic = (d) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    home: ic('<path d="M4 11 12 4.5 20 11v8.5h-5.5v-5h-5v5H4Z"/>'),
    ten: ic(
      '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 9.5 10 8.5v7"/><rect x="12.6" y="8.5" width="3.6" height="7" rx="1.8"/>'
    ),
    cal: ic(
      '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'
    ),
    test: ic('<path d="M6 3.5h8.5L19 8v12.5H6Z"/><path d="M9 12h6M9 15.5h4"/>'),
    chat: ic(
      '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5Z"/>'
    ),
    bell: ic(
      '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'
    ),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    pen: ic('<path d="m14.5 5 4.5 4.5L9 19.5H4.5V15Z"/>'),
    pad: ic(
      '<rect x="5" y="4" width="14" height="16.5" rx="2"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/>'
    ),
    eye: ic('<path d="M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6Z"/><path d="M4 20 20 4"/>'),
    back: ic('<path d="M15 5 8 12l7 7"/>'),
    calc: ic(
      '<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h2M13.5 12h2M8.5 16h2M13.5 16h2"/>'
    ),
    mic: ic(
      '<rect x="9" y="4" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3"/>'
    ),
    cam: ic(
      '<rect x="3.5" y="7" width="12" height="10" rx="2.5"/><path d="m15.5 10.5 5-2.5v8l-5-2.5"/>'
    ),
    send: ic('<path d="M4 12 20 4l-4 16-4-7Z"/>'),
    flame: ic(
      '<path d="M12 3.5c1 3.5 4.5 5 4.5 9a4.5 4.5 0 0 1-9 0c0-1.6.6-2.8 1.6-3.8.2 1.4 1 2.3 1.9 2.6C10.3 8.8 11 6 12 3.5Z"/>'
    ),
  };
  const status =
    '<div class="sb"><span>9:41</span><span class="sb-r"><i></i><i></i><b></b></span></div>';
  const rail = (on, who) =>
    `<nav class="rail"><span class="logo">K</span>${["home", "ten", "cal", "test", "chat"]
      .map((k) => (k === on ? `<span class="on">${I[k]}</span>` : I[k]))
      .join("")}<span class="sp"></span>${I.bell}<span class="av">${who}</span></nav>`;

  /* ---------- the student's calendar (laptop): every due date on one week ---------- */
  function calendar() {
    const ev = (kind, title, when) =>
      `<div class="ev ${kind}"><b>${title}</b><span>${when}</span></div>`;
    const day = (name, n, items, cls = "") =>
      `<div class="day ${cls}"><div class="dh"><span>${name}</span><b>${n}</b></div>${items.join("")}</div>`;
    const ten = ev("hw", "Your Daily 10", "Due today");
    return `<div class="scr app cal-scr" data-ui>
      ${rail("cal", "M")}
      <div class="body">
        <div class="top"><p class="h">February 1 to 7</p><span class="sat">The SAT: Saturday, March 6</span></div>
        <div class="legend"><span class="k class">Live classes</span><span class="k work">Weekly live session</span><span class="k hw">Your Daily 10</span><span class="k test">Tests</span></div>
        <div class="week">
          ${day("Mon", 1, [ten])}
          ${day("Tue", 2, [ev("class", "Live class: linear functions", "7:00 p.m."), ten], "today")}
          ${day("Wed", 3, [ev("work", "Live session: pacing", "7:00 p.m."), ten])}
          ${day("Thu", 4, [ev("class", "Live class: transitions", "7:00 p.m."), ten])}
          ${day("Fri", 5, [ev("hw", "Transitions set", "Due 9:00 p.m."), ten])}
          ${day("Sat", 6, [ev("test", "Full-length test 4", "10:00 a.m.")])}
          ${day("Sun", 7, [ten])}
        </div>
      </div>
    </div>`;
  }
  /* the same week on a phone: an agenda, one line per due item */
  function calendarPhone() {
    const row = (d, n, kind, title, when, today = "") =>
      `<div class="ag ${today}"><div class="agd"><span>${d}</span><b>${n}</b></div><div class="agi ${kind}"><b>${title}</b><span>${when}</span></div></div>`;
    return `<div class="scr ph agenda" data-ui>${status}
      <div class="sh"><span class="x">${I.back}</span><b>This week</b><span class="of">Feb 1 to 7</span></div>
      <p class="sat">The SAT: Saturday, March 6</p>
      ${row("Tue", 2, "class", "Live class: linear functions", "7:00 p.m.", "today")}
      ${row("Tue", 2, "hw", "Your Daily 10", "Due today", "today")}
      ${row("Wed", 3, "work", "Live session: pacing", "7:00 p.m.")}
      ${row("Thu", 4, "class", "Live class: transitions", "7:00 p.m.")}
      ${row("Fri", 5, "hw", "Transitions set", "Due 9:00 p.m.")}
      ${row("Sat", 6, "test", "Full-length test 4", "10:00 a.m.")}
    </div>`;
  }

  /* ---------- the tutor's class plan (laptop): what the group missed most, and a practice set for each student ---------- */
  const MISSED = [
    ["Slope from two points", 5],
    ["Transitions", 4],
    ["Command of evidence", 3],
    ["Sentence boundaries", 2],
  ];
  const SETS = [
    ["Maya", "Slope, a set of 10"],
    ["Jonah", "Slope, a set of 10"],
    ["Sofia", "Transitions, a set of 8"],
    ["Eli", "Slope, a set of 10"],
    ["Nia", "Command of evidence, a set of 8"],
    ["Theo", "Transitions, a set of 8"],
  ];
  const miss = (skill, n) =>
    `<div class="mr"><div class="mt"><b>${skill}</b><span>${n} of 6 missed it</span></div><span class="bar"><i style="width:${Math.round((n / 6) * 100)}%"></i></span></div>`;
  function classPlan() {
    const st = ([name, set]) =>
      `<div class="st"><span class="face">${name[0]}</span><b>${name}</b><span>${set}</span></div>`;
    return `<div class="scr app plan-scr" data-ui>
      ${rail("cal", "D")}
      <div class="body">
        <div class="top"><p class="h">Tuesday's class</p><span class="sat">Built from full-length test 3</span></div>
        <div class="plan">
          <div class="pcol">
            <p class="ph">What the group missed most</p>
            ${MISSED.map(([s, n]) => miss(s, n)).join("")}
            <div class="tnote"><b>Class plan</b>25 minutes on slope, 20 on transitions. Then everyone works a set built from their own misses.</div>
          </div>
          <div class="pcol sets">
            <p class="ph">Practice sets for the last 30 minutes</p>
            ${SETS.map(st).join("")}
          </div>
        </div>
      </div>
    </div>`;
  }
  function classPlanPhone() {
    return `<div class="scr ph plan-ph" data-ui>${status}
      <div class="sh"><span class="x">${I.back}</span><b>Tuesday's class</b><span class="of"></span></div>
      <p class="sat">Built from full-length test 3</p>
      <p class="ph">What the group missed most</p>
      ${MISSED.map(([s, n]) => miss(s, n)).join("")}
      <div class="tnote"><b>Class plan</b>25 minutes on slope, 20 on transitions. Then everyone works a set built from their own misses.</div>
    </div>`;
  }

  /* ---------- the weekly live session (laptop): a Karman tutor on a video call, the slide, the students and the chat ---------- */
  const SLIDE = `<div class="slide"><p class="st1">Pacing the adaptive second module</p>
      <div class="tl"><span><b>35 min</b>the module</span><span><b>27</b>questions</span><span><b>1 min 15 s</b>each, on average</span></div>
      <p class="st2">Mark anything over 90 seconds and come back to it last.</p></div>`;
  const TUTOR = `<div class="tile tutor"><span class="face">D</span><span class="nm">David<em>Karman tutor</em></span></div>`;
  const CHAT = [
    ["Maya", "Does module 2 have the same time as module 1?"],
    ["David", "Yes, 35 minutes. Mark anything over 90 seconds and come back."],
  ];
  function session() {
    const kids = ["M", "J", "S", "E", "N", "T"]
      .map((k) => `<div class="tile"><span class="face">${k}</span></div>`)
      .join("");
    return `<div class="scr app sess" data-ui>
      <div class="body">
        <div class="top"><p class="h">Weekly live session</p><span class="sat">Wednesday, February 3, 7:00 p.m.</span></div>
        <div class="call">
          ${SLIDE}
          <div class="side">${TUTOR}<div class="kids">${kids}</div></div>
        </div>
        <div class="bar"><span class="ctl">${I.mic}Mute</span><span class="ctl">${I.cam}Video</span><span class="chatline">${CHAT.map(([w, t]) => `<b>${w}</b> ${t}`).join(" <i></i> ")}</span></div>
      </div>
    </div>`;
  }
  function sessionPhone() {
    return `<div class="scr ph sess-ph" data-ui>${status}
      <div class="sh"><span class="x">${I.back}</span><b>Live session</b><span class="of">7:00 p.m.</span></div>
      ${TUTOR}
      ${SLIDE}
      <div class="msgs">${CHAT.map(([w, t]) => `<p><b>${w}</b>${t}</p>`).join("")}</div>
    </div>`;
  }

  /* ---------- Your Daily 10 (phone): question 4 of 10, with the set's right and wrong so far ---------- */
  function daily10() {
    const marks = ["ok", "no", "ok", "now", "", "", "", "", "", ""];
    return `<div class="scr ph d10" data-ui>${status}
      <div class="sh"><span class="x">${I.x}</span><b>Your Daily 10</b><span class="of">4 of 10</span></div>
      <div class="steps">${marks.map((m) => `<i class="${m}"></i>`).join("")}</div>
      <div class="tools"><span>${I.pen}Highlight</span><span>${I.pad}Scratch pad</span><span class="tm">4:12 ${I.eye}</span></div>
      <p class="back">Back from 2 days ago</p>
      <p class="skill">Sentence boundaries</p>
      <p class="stem">The museum's new wing opened in <u></u> its first exhibit drew more visitors in one week than the old galleries had in a month.</p>
      <p class="ask">Which choice completes the text so that it conforms to the conventions of Standard English?</p>
      <div class="ch"><span><i>A</i>March, and</span><span><i>B</i>March</span><span class="pick"><i>C</i>March; and</span><span><i>D</i>March and</span></div>
      <span class="go">Check</span>
    </div>`;
  }

  /* ---------- the Challenge question (phone): one hard question a day, free, with the streak ---------- */
  function challenge() {
    return `<div class="scr ph chq" data-ui>${status}
      <div class="sh"><span class="x">${I.x}</span><b>Challenge question</b><span class="of">Day 12</span></div>
      <p class="streak">${I.flame}12 days in a row</p>
      <p class="skill">Lines in the coordinate plane</p>
      <p class="stem">A line passes through the points (2, 7) and (6, 1). Which equation describes the line through (0, 4) that is perpendicular to it?</p>
      <div class="ch"><span class="pick"><i>A</i>y = (2/3)x + 4</span><span><i>B</i>y = (3/2)x + 4</span><span><i>C</i>y = &minus;(3/2)x + 4</span><span><i>D</i>y = &minus;(2/3)x + 4</span></div>
      <span class="go">Check</span>
    </div>`;
  }

  /* ---------- a full-length test (phone): module 2, the on-screen graphing calculator open ---------- */
  function test() {
    return `<div class="scr ph tst" data-ui>${status}
      <div class="sh"><span class="of l">Math</span><b>Module 2 of 2</b><span class="of">28:40 ${I.eye}</span></div>
      <p class="skill">Full-length test 2, question 14 of 27</p>
      <p class="stem">The function f is defined by f(x) = x<sup>2</sup> &minus; 4x + 1. What is the minimum value of f(x)?</p>
      <div class="graph"><svg viewBox="0 0 200 110" aria-hidden="true"><path class="ax" d="M10 55H190M60 6V104"/><path class="cv" d="M20 100 C 45 20, 95 -10, 110 60 S 165 110, 190 100" transform="translate(0 0)"/><circle class="pt" cx="94" cy="86" r="3"/><text x="100" y="98">(2, &minus;3)</text></svg><span class="gl">y = x<sup>2</sup> &minus; 4x + 1</span></div>
      <div class="tools"><span>${I.pen}Highlight</span><span>${I.pad}Scratch pad</span><span class="on">${I.calc}Calculator</span></div>
      <div class="ans"><span>Your answer</span><b>&minus;3</b></div>
    </div>`;
  }

  /* ---------- Score Plan (phone): the planning tool, marked with its season because it has not shipped ---------- */
  function planning() {
    const row = (a, b) => `<div class="pr"><b>${a}</b><span>${b}</span></div>`;
    return `<div class="scr ph plan-tool" data-ui>${status}
      <div class="sh"><span class="x">${I.back}</span><b>Score Plan</b><span class="of"></span></div>
      <p class="coming">Coming spring 2027</p>
      <div class="target"><span>Target</span><b>1400</b><em>by Saturday, March 6</em></div>
      <div class="now"><span>Latest full-length</span><b>1210</b><em>test 3, January 30</em></div>
      <p class="ph">This week</p>
      ${row("Linear functions", "Three sets, due Friday")}
      ${row("Transitions", "Two sets, due Friday")}
      ${row("Full-length test 4", "Saturday, 10:00 a.m.")}
    </div>`;
  }

  /* ---------- the parent's weekly update (phone): practice time, skills in words, questions answered, the score, the note ---------- */
  function parent() {
    const sk = (name, word, cls = "") =>
      `<div class="sk"><b>${name}</b><span class="${cls}">${word}</span></div>`;
    return `<div class="scr ph par" data-ui>${status}
      <div class="sh"><span class="x">${I.back}</span><b>Maya's week</b><span class="bell">${I.bell}</span></div>
      <p class="wk">February 1 to 7</p>
      <div class="time"><span>Practice time</span><b>1 h 52 m</b><em>Four days of Your Daily 10, two sets</em></div>
      <p class="h4">Skills that moved</p>
      ${sk("Linear functions", "Mastered", "up")}
      ${sk("Transitions", "Improving")}
      ${sk("Command of evidence", "This week's focus")}
      <div class="nums"><div><b>112</b><span>Questions answered</span></div><div><b>96%</b><span>Practice done</span></div><div><b>1210</b><span>Full-length test 3</span></div></div>
      <div class="tnote"><b>From David</b>Maya fixed every slope question from test 3. Next week: evidence questions, and full-length test 4 on Saturday.</div>
      <div class="inc"><span>Not done yet</span>Transitions set, due Friday</div>
    </div>`;
  }

  /* ---------- the cohort chat (phone): questions answered by the tutor every day ---------- */
  function chat() {
    const m = (who, text, me = false, tutor = false) =>
      `<div class="m ${me ? "me" : ""}${tutor ? " tutor" : ""}"><span class="who">${who}${tutor ? "<em>Karman tutor</em>" : ""}</span><p>${text}</p></div>`;
    return `<div class="scr ph cchat" data-ui>${status}
      <div class="sh"><span class="x">${I.back}</span><b>March cohort</b><span class="of">6</span></div>
      <p class="day">Tuesday, 9:12 p.m.</p>
      ${m("Jonah", "Question 14 on test 3: why is C wrong? It has a semicolon.")}
      ${m("David", "The semicolon is fine. The problem is the “and” after it: a semicolon joins two complete sentences on its own.", false, true)}
      ${m("Maya", "So B would need a period instead?", true)}
      ${m("David", "Right. B uses a period and keeps both sides complete. Tomorrow's Daily 10 brings two more of these back.", false, true)}
      <div class="compose"><span>Message</span>${I.send}</div>
    </div>`;
  }

  /* ---------- Your Daily 10, live (home B's first screen): one real Karman question the parent can answer.
     The choices are radio inputs, so the answer and its explanation show with CSS alone (screens.css); tryLive()
     fills the dates a miss would come back on (2, 7 and 21 days from today) and speaks the result. The question
     is the same Karman original as daily10(); every word here is the product's own. ---------- */
  const TRY = {
    skill: "Sentence boundaries",
    stem: "The museum's new wing opened in <u></u> its first exhibit drew more visitors in one week than the old galleries had in a month.",
    ask: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    right: "A",
    choices: [
      ["A", "March, and", "A comma and “and” join two complete sentences."],
      ["B", "March", "With no comma and no joining word, the two sentences run together."],
      ["C", "March; and", "A semicolon joins two complete sentences by itself. The “and” after it is one joiner too many."],
      ["D", "March and", "Two complete sentences joined by “and” need a comma before it."],
    ],
  };
  function daily10Try() {
    const marks = ["now", "", "", "", "", "", "", "", "", ""];
    const opts = TRY.choices
      .map(
        ([k, t]) =>
          `<label class="c" for="try-${k}"><input type="radio" name="try" id="try-${k}" value="${k}" data-ok="${k === TRY.right}"><i>${k}</i><span>${t}</span></label>`
      )
      .join("");
    const res = TRY.choices
      .map(
        ([k, , why]) =>
          `<div class="r r-${k} ${k === TRY.right ? "ok" : "no"}"><b>${k === TRY.right ? "Right." : "Not this one."}</b><p>${why}</p></div>`
      )
      .join("");
    return `<div class="scr ph d10 try" data-ui>${status}
      <div class="sh"><span class="x">${I.x}</span><b>Your Daily 10</b><span class="of">1 of 10</span></div>
      <div class="steps">${marks.map((m) => `<i class="${m}"></i>`).join("")}</div>
      <div class="tools"><span>${I.pen}Highlight</span><span>${I.pad}Scratch pad</span><span class="tm">9:58 ${I.eye}</span></div>
      <p class="skill">${TRY.skill}</p>
      <p class="stem">${TRY.stem}</p>
      <p class="ask" id="try-ask">${TRY.ask}</p>
      <div class="ch" role="radiogroup" aria-labelledby="try-ask">${opts}</div>
      <div class="res">${res}
        <div class="when"><b class="if-ok">A miss would come back</b><b class="if-no">This question comes back</b><span data-in="2">In 2 days</span><span data-in="7">In 7 days</span><span data-in="21">In 21 days</span></div>
      </div>
      <p class="sr try-status" role="status"></p>
    </div>`;
  }
  // fills the dates (today plus 2, 7 and 21 days) and speaks the result when a choice is made
  function tryLive(host) {
    const fmt = (n) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    };
    host.querySelectorAll("[data-in]").forEach((el) => {
      el.textContent = `In ${el.dataset.in} days, ${fmt(+el.dataset.in)}`;
    });
    const say = host.querySelector(".try-status");
    host.querySelectorAll('input[name="try"]').forEach((inp) =>
      inp.addEventListener("change", () => {
        const r = host.querySelector(`.r-${inp.value}`);
        if (say && r) say.textContent = r.textContent;
      })
    );
  }

  window.KARMAN_SCREENS = {
    calendar,
    calendarPhone,
    classPlan,
    classPlanPhone,
    session,
    sessionPhone,
    daily10,
    challenge,
    test,
    planning,
    parent,
    chat,
    daily10Try,
    tryLive,
  };
})();
