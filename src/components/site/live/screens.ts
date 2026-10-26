/* Karman's product screens, drawn in code (2026-10-26). They match the white, black and marigold site and
 stay sharp at every size. Every word on them is the product's own interface text, not marketing copy, so it
 lives here rather than in site-copy.ts. The screens move (CSS only, in screens.css): a speaker changes in the
 class, the worked method writes itself out, the Daily 10 ticks on, the parent's bars fill. Reduced motion
 shows each one at its settled frame.
 Only features in the offer appear. The students, the tutor and the questions are fictional Karman originals:
 the hard question is our own, written in the style of the SAT's advanced math, never copied from a test.
 SCREENS[name]() returns the screen's markup: constant strings with no visitor input. */

const ic = (d: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
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
  people: ic(
    '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.2a5 5 0 0 1 3 4.8"/>'
  ),
  chat: ic(
    '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5Z"/>'
  ),
  share: ic(
    '<rect x="3" y="4.5" width="18" height="12.5" rx="2"/><path d="M12 13.5V8M9.5 10.5 12 8l2.5 2.5M8 20.5h8"/>'
  ),
  hand: ic(
    '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5V5a1.5 1.5 0 0 1 3 0v6M14 11V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.9-2.5L3.4 14a1.5 1.5 0 0 1 2.4-1.8L8 15"/>'
  ),
  back: ic('<path d="M15 5 8 12l7 7"/>'),
  cal: ic(
    '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'
  ),
  bell: ic(
    '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'
  ),
  check: ic('<path d="M5 12.5 10 17.5 19 7"/>'),
};

/** The iPhone's status bar: time, then (right of the Dynamic Island) signal, Wi-Fi and battery. */
const status = `<div class="sb"><span class="sb-t">9:41</span><span class="sb-r">
  <svg class="sig" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
  <svg class="wifi" viewBox="0 0 16 12" aria-hidden="true"><path d="M8 11.6 5.6 9.1a3.4 3.4 0 0 1 4.8 0Z"/><path d="M3.4 6.9a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0Z"/><path d="M1.1 4.6a9.8 9.8 0 0 1 13.8 0l-1.4 1.4a7.8 7.8 0 0 0-11 0Z"/></svg>
  <span class="bat"><i></i></span></span></div>`;

/* ---------- the live class on Zoom (laptop): six students and the tutor, cameras on ---------- */
const PEOPLE = [
  ["david", "David (tutor)"],
  ["maya", "Maya"],
  ["arjun", "Arjun"],
  ["sofia", "Sofia"],
  ["leo", "Leo"],
  ["mei", "Mei"],
  ["priya", "Priya"],
] as const;
function zoom() {
  const tile = ([id, name]: (typeof PEOPLE)[number], k: number) =>
    `<div class="zt z-${id}" style="--k:${k}"><img src="/site/zoom/${id}.webp" alt="" loading="lazy" decoding="async"><span class="zn">${id === "david" ? "" : `<i class="zmic">${I.mic}</i>`}${name}</span>${id === "leo" ? `<span class="zhand">${I.hand}</span>` : ""}</div>`;
  return `<div class="scr zoom">
    <div class="z-top"><span class="z-dot"></span><b>SAT Program, live class 7: functions</b><span class="z-time">7:24 p.m.</span><span class="z-view">Gallery</span></div>
    <div class="z-grid">${PEOPLE.map(tile).join("")}</div>
    <div class="z-bar">
      <span>${I.mic}<em>Mute</em></span><span>${I.cam}<em>Stop video</em></span><span class="z-ppl">${I.people}<em>Participants</em><i>7</i></span><span>${I.chat}<em>Chat</em></span><span>${I.share}<em>Share</em></span><span>${I.hand}<em>Raise hand</em></span><b class="z-leave">Leave</b>
    </div>
  </div>`;
}

/* ---------- the one-on-one review (laptop): the call beside a hard question and its method ---------- */
function review() {
  return `<div class="scr app rev-scr">
    <div class="body">
      <div class="top"><h3>Review: full-length 3</h3><span class="sat">With David, 60 minutes</span></div>
      <div class="rev">
        <div class="call">
          <div class="tile"><img src="/site/zoom/david.webp" alt="" loading="lazy" decoding="async"><span class="nm">David</span></div>
          <div class="tile"><img src="/site/zoom/maya.webp" alt="" loading="lazy" decoding="async"><span class="nm">Maya</span></div>
          <div class="ctl"><span>${I.mic}</span><span>${I.cam}</span><span class="leave">Leave</span></div>
        </div>
        <div class="q">
          <p class="tag">Math, module 2, question 19 <span class="hard">Hard</span><em>Missed</em></p>
          <p class="stem"><span class="eq">y = x² − 6x + c<br>y = 2x − 5</span>In the given system of equations, <i>c</i> is a constant. The graphs of the equations intersect at exactly one point. What is the value of <i>c</i>?</p>
          <div class="ch"><span><i>A</i>3</span><span><i>B</i>9</span><span class="ok"><i>C</i>11</span><span class="no"><i>D</i>16</span></div>
          <ol class="work">
            <li>Set them equal: x² − 6x + c = 2x − 5</li>
            <li>Gather terms: x² − 8x + (c + 5) = 0</li>
            <li>One meeting point means the discriminant is 0: 64 − 4(c + 5) = 0</li>
            <li>So c + 5 = 16, and c = 11</li>
          </ol>
          <div class="prog"><span>12 of 19 missed questions reviewed</span><span class="bar"><i></i></span></div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------- the Daily 10 (the student's phone): a missed question coming back on schedule ---------- */
function daily10() {
  return `<div class="scr ph d10">${status}
    <div class="sh"><span class="x">${I.x}</span><b>Your Daily 10</b><span class="of">4 of 10</span></div>
    <div class="steps">${Array.from({ length: 10 }, (_, i) => `<i class="${i < 3 ? "done" : i === 3 ? "now" : ""}"></i>`).join("")}</div>
    <div class="tools"><span>${I.pen}Highlight</span><span>${I.pad}Scratch pad</span><span class="tm"><b class="tm-a">4:12</b><b class="tm-b">4:13</b> ${I.eye}</span></div>
    <p class="back"><i></i>Last time: missed</p>
    <p class="skill">Sentence boundaries, back after 2 days</p>
    <p class="stem">The museum's new wing opened in <u></u> its first exhibit drew more visitors in one week than the old galleries had in a month.</p>
    <p class="ask">Which choice completes the text so that it conforms to the conventions of Standard English?</p>
    <div class="ch"><span><i>A</i>March, and</span><span><i>B</i>March</span><span class="pick"><i>C</i>March; and</span><span><i>D</i>March and</span></div>
    <span class="go">Check</span>
  </div>`;
}

/* ---------- the parent's view (the parent's phone): live, skill mastery first, out of 6 ---------- */
function parent() {
  const sk = (name: string, lvl: number, word: string, k: number) =>
    `<div class="sk" style="--k:${k}"><div class="skt"><b>${name}</b><span class="${lvl > 4 ? "up" : ""}">${word}</span></div><div class="dots">${Array.from({ length: 6 }, (_, i) => `<i class="${i < lvl ? "on" : ""}" style="--i:${i}"></i>`).join("")}</div></div>`;
  return `<div class="scr ph par">${status}
    <div class="sh"><span class="x">${I.back}</span><b>Maya's progress</b><span class="bell">${I.bell}</span></div>
    <p class="live"><i></i>Live. Updated 2 minutes ago</p>
    <div class="feed"><div class="feed-in">
      <p><b>${I.check}</b>Daily 10 done: 9 of 10</p>
      <p><b>${I.check}</b>Transitions set handed in, on time</p>
      <p><b>${I.check}</b>Attended Thursday's live class</p>
      <p><b>${I.check}</b>Daily 10 done: 9 of 10</p>
    </div></div>
    <div class="est">
      <div><span>Reading and Writing</span><b>640</b><em>+40 since week 1</em></div>
      <div><span>Math</span><b>690</b><em>+60 since week 1</em></div>
    </div>
    <h4>Skills that moved</h4>
    ${sk("Nonlinear functions", 6, "Mastered", 0)}
    ${sk("Transitions", 5, "Up one level", 1)}
    ${sk("Command of evidence", 3, "Next week's focus", 2)}
    <div class="nums">
      <div><b>2 of 2</b><span>Live classes</span></div>
      <div><b>96%</b><span>Practice done</span></div>
      <div><b>1 of 1</b><span>Reviews</span></div>
    </div>
    <div class="tnote"><b>Note from David</b>Maya fixed every quadratic system from test 3. Next: evidence questions, and full-length 4 on Saturday.</div>
    <nav class="tabs"><span class="on">${I.check}Progress</span><span>${I.cal}Schedule</span><span>${I.chat}Messages</span></nav>
  </div>`;
}

/* ---------- the study tools, small cards for the carousel ---------- */
function wordline() {
  const rows = [
    ["CRANE", "xpxxg"],
    ["SLOTH", "pxxpx"],
    ["TERSE", "ggggg"],
  ];
  const cell = (ch: string, s: string, k: number) =>
    `<i class="${s === "g" ? "g" : s === "p" ? "p" : ch ? "x" : ""}" style="--k:${k}">${ch}</i>`;
  return `<div class="tool-ui wl">${Array.from({ length: 4 }, (_, r) => {
    const [w, s] = rows[r] || ["     ", "     "];
    return `<div class="row">${[...w].map((ch, c) => cell(ch.trim(), s[c].trim(), r * 5 + c)).join("")}</div>`;
  }).join("")}</div>`;
}
function flashcards() {
  return `<div class="tool-ui fc"><div class="card"><div class="f"><b>bene-</b><span>Tap to turn</span></div><div class="b"><b>good, well</b><span>benefit, benevolent, benign</span></div></div><p class="due">Comes back in 3 days</p></div>`;
}
function wordlab() {
  return `<div class="tool-ui lab"><p class="w"><b>candid</b><em>adjective</em></p><p class="m">Truthful and direct.</p><p class="you"><span>Your sentence</span>My coach was <u>candid</u> about my free throws.</p></div>`;
}
function challenge() {
  return `<div class="tool-ui dc"><p class="t">Today's challenge <span>Hard</span></p><p class="s">If f(x) = 3ˣ⁺², what is f(x + 1) ÷ f(x)?</p><div class="o"><span>2</span><span class="ok">3</span><span>9</span></div></div>`;
}

export const SCREENS = { zoom, review, daily10, parent };
export const TOOLS = { wordline, flashcards, wordlab, challenge };
