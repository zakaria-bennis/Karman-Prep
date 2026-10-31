/* Karman's product screens, drawn in code (2026-10-25). They replace the navy-and-green screenshots, so they
   match the white, black and marigold site and stay sharp at every size. Every word on them is the product's
   own interface text, not marketing copy, so it lives here rather than in copy.js.
   Content follows the founder's app rules: "Your Daily 10", a solid underline blank, highlight, scratch pad and
   a timer you can hide, a tutor named David, due dates on everything, a slim icon rail, and a parent view that
   leads with skill mastery. Only features in the offer appear. The student and the questions are fictional
   Karman originals. window.KARMAN_SCREENS[name]() returns the screen's HTML. */
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
    check: ic('<path d="M5 12.5 10 17.5 19 7"/>'),
  };
  const status =
    '<div class="sb"><span>9:41</span><span class="sb-r"><i></i><i></i><b></b></span></div>';

  /* ---------- the student's calendar (laptop) ---------- */
  function schedule() {
    const ev = (kind, title, when) =>
      `<div class="ev ${kind}"><b>${title}</b><span>${when}</span></div>`;
    const day = (name, n, items, cls = "") =>
      `<div class="day ${cls}"><div class="dh"><span>${name}</span><b>${n}</b></div>${items.join("")}</div>`;
    return `<div class="scr app cal-scr">
      <nav class="rail"><span class="logo">K</span>${I.home}${I.ten}<span class="on">${I.cal}</span>${I.test}${I.chat}<span class="sp"></span>${I.bell}<span class="av">M</span></nav>
      <div class="body">
        <div class="top"><h3>February 1 to 7</h3><span class="sat">The SAT, Saturday, March 6</span></div>
        <div class="legend"><span class="k class">Live classes</span><span class="k work">Weekly session</span><span class="k hw">Homework from David</span><span class="k test">Tests</span></div>
        <div class="week">
          ${day("Mon", 1, [ev("hw", "Daily 10", "Due today")])}
          ${day("Tue", 2, [ev("class", "Live class: linear functions", "7:00 p.m."), ev("hw", "From David: timed set of 12", "Due tonight")], "today")}
          ${day("Wed", 3, [ev("work", "Workshop: pacing module 2", "7:00 p.m."), ev("hw", "Daily 10", "Due today")])}
          ${day("Thu", 4, [ev("class", "Live class: transitions", "7:00 p.m.")])}
          ${day("Fri", 5, [ev("hw", "Transitions set", "Due today")])}
          ${day("Sat", 6, [ev("test", "Full-length test 4", "Due today")])}
          ${day("Sun", 7, [ev("hw", "Daily 10", "Due today")])}
        </div>
      </div>
    </div>`;
  }

  /* ---------- the tutor's class plan (laptop): what the group missed most, and a practice set for each student ---------- */
  function classPlan() {
    const miss = (skill, n, of) =>
      `<div class="mr"><div class="mt"><b>${skill}</b><span>${n} of ${of} missed it</span></div><span class="bar"><i style="width:${Math.round((n / of) * 100)}%"></i></span></div>`;
    const st = (name, set) =>
      `<div class="st"><span class="face">${name[0]}</span><b>${name}</b><span>${set}</span></div>`;
    return `<div class="scr app plan-scr">
      <nav class="rail"><span class="logo">K</span>${I.home}${I.ten}<span class="on">${I.cal}</span>${I.test}${I.chat}<span class="sp"></span>${I.bell}<span class="av">D</span></nav>
      <div class="body">
        <div class="top"><h3>Tuesday's class</h3><span class="sat">Built from full-length 3</span></div>
        <div class="plan">
          <div class="pcol sets">
            <p class="ph">Practice sets for the last 30 minutes</p>
            ${st("Maya", "Slope, starting with the basics")}
            ${st("Jonah", "Slope, the hardest questions")}
            ${st("Sofia", "Transitions")}
            ${st("Eli", "Slope, starting with the basics")}
            ${st("Nia", "Command of evidence")}
            ${st("Theo", "Slope, the hardest questions")}
          </div>
          <div class="pcol">
            <p class="ph">What the group missed most</p>
            ${miss("Slope from two points", 5, 6)}
            ${miss("Transitions", 4, 6)}
            ${miss("Command of evidence", 3, 6)}
            ${miss("Sentence boundaries", 2, 6)}
            <div class="tnote"><b>Class plan</b>25 minutes on slope, 20 on transitions. Then everyone works a set built from their own misses.</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ---------- the Daily 10 (phone) ---------- */
  function daily10() {
    return `<div class="scr ph d10">${status}
      <div class="sh"><span class="x">${I.x}</span><b>Your Daily 10</b><span class="of">4 of 10</span></div>
      <div class="steps">${Array.from({ length: 10 }, (_, i) => `<i class="${i < 3 ? "done" : i === 3 ? "now" : ""}"></i>`).join("")}</div>
      <div class="tools"><span>${I.pen}Highlight</span><span>${I.pad}Scratch pad</span><span class="tm">4:12 ${I.eye}</span></div>
      <p class="back">Back from 2 days ago</p>
      <p class="skill">Sentence boundaries</p>
      <p class="stem">The museum's new wing opened in <u></u> its first exhibit drew more visitors in one week than the old galleries had in a month.</p>
      <p class="ask">Which choice completes the text so that it conforms to the conventions of Standard English?</p>
      <div class="ch"><span><i>A</i>March, and</span><span><i>B</i>March</span><span class="pick"><i>C</i>March; and</span><span><i>D</i>March and</span></div>
      <span class="go">Check</span>
    </div>`;
  }

  /* ---------- the parent's weekly update (phone): skill mastery first ---------- */
  function parent() {
    const sk = (name, lvl, word) =>
      `<div class="sk"><div class="skt"><b>${name}</b><span class="${lvl > 3 ? "up" : ""}">${word}</span></div><div class="dots">${Array.from({ length: 5 }, (_, i) => `<i class="${i < lvl ? "on" : ""}"></i>`).join("")}</div></div>`;
    return `<div class="scr ph par">${status}
      <div class="sh"><span class="x">${I.back}</span><b>Maya's week</b><span class="bell">${I.bell}</span></div>
      <p class="wk">February 1 to 7</p>
      <h4>Skills that moved</h4>
      ${sk("Linear functions", 5, "Mastered")}
      ${sk("Transitions", 4, "Up one level")}
      ${sk("Command of evidence", 2, "Next week's focus")}
      <div class="nums">
        <div><b>2 of 2</b><span>Live classes</span></div>
        <div><b>96%</b><span>Practice done</span></div>
        <div><b>3 of 5</b><span>Full-length tests</span></div>
      </div>
      <div class="tnote"><b>From David</b>Maya fixed every slope question from test 3. Next week: evidence questions, and full-length 4 on Saturday.</div>
      <div class="inc"><span>Incomplete</span>Transitions set, due Friday</div>
    </div>`;
  }

  /* ---------- Wordline (phone): today's SAT word in six tries ---------- */
  function wordline() {
    const rows = [
      ["CRANE", "xpxxg"],
      ["SLOTH", "pxxpx"],
      ["TERSE", "ggggg"],
    ];
    const cell = (ch, s) =>
      `<i class="${s === "g" ? "g" : s === "p" ? "p" : ch ? "x" : ""}">${ch}</i>`;
    const grid = Array.from({ length: 6 }, (_, r) => {
      const [w, s] = rows[r] || ["     ", "     "];
      return `<div class="row">${[...w].map((ch, k) => cell(ch.trim(), s[k].trim())).join("")}</div>`;
    }).join("");
    const keys = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"]
      .map(
        (r) =>
          `<div class="kr">${[...r].map((k) => `<i class="${"TERS".includes(k) ? "g" : "CANLOH".includes(k) ? "x" : ""}">${k}</i>`).join("")}</div>`
      )
      .join("");
    return `<div class="scr ph wl">${status}
      <div class="sh"><span class="x">${I.back}</span><b>Wordline</b><span class="of">3 of 6</span></div>
      <div class="grid">${grid}</div>
      <div class="def"><b>terse</b> <em>adjective</em><p>Using few words; abrupt. "Her terse reply ended the debate."</p></div>
      <div class="kb">${keys}</div>
    </div>`;
  }

  window.KARMAN_SCREENS = { schedule, classPlan, daily10, parent, wordline };
})();
