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
    mic: ic(
      '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>'
    ),
    cam: ic(
      '<rect x="3" y="7" width="12.5" height="10" rx="2"/><path d="m15.5 11 5.5-3v8l-5.5-3Z"/>'
    ),
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
        <div class="legend"><span class="k class">Live classes</span><span class="k review">One-on-one reviews</span><span class="k work">Weekly session</span><span class="k hw">Homework from David</span><span class="k test">Tests</span></div>
        <div class="week">
          ${day("Mon", 1, [ev("review", "Review of full-length 3 with David", "6:00 p.m.")])}
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

  /* ---------- the one-on-one review (laptop): the call beside the question being reviewed ---------- */
  function review() {
    return `<div class="scr app rev-scr">
      <nav class="rail"><span class="logo">K</span>${I.home}${I.ten}${I.cal}<span class="on">${I.test}</span>${I.chat}<span class="sp"></span>${I.bell}<span class="av">M</span></nav>
      <div class="body">
        <div class="top"><h3>Review: full-length 3</h3><span class="sat">With David, 60 minutes</span></div>
        <div class="rev">
          <div class="call">
            <div class="tile t1"><span class="face">D</span><span class="nm">David</span></div>
            <div class="tile t2"><span class="face">M</span><span class="nm">Maya</span></div>
            <div class="ctl"><span>${I.mic}</span><span>${I.cam}</span><span class="leave">Leave</span></div>
          </div>
          <div class="q">
            <p class="tag">Math, module 2, question 14 <em>Missed</em></p>
            <p class="stem">A line passes through the points (2, 5) and (6, 13). What is the slope of the line?</p>
            <div class="ch"><span class="ok"><i>A</i>2</span><span><i>B</i>3</span><span class="no"><i>C</i>4</span><span><i>D</i>8</span></div>
            <div class="tnote"><b>From David</b>You divided by 2, the first x, instead of the change in x. The slope is (13 minus 5) over (6 minus 2): 8 over 4, which is 2.</div>
            <div class="prog"><span>12 of 19 missed questions reviewed</span><span class="bar"><i style="width:63%"></i></span></div>
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
        <div><b>1 of 1</b><span>Reviews</span></div>
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

  window.KARMAN_SCREENS = { schedule, review, daily10, parent, wordline };
})();
