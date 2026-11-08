/*
 * Skills and mastery. Four bars per skill: Learning, Developing, Proficient, Mastered.
 * Like Khan Academy, overall mastery is a plain count: skills at Proficient or above.
 */
const LEVELS = ["Not started", "Learning", "Developing", "Proficient", "Mastered"];
/* A strong Daily 10 moves its lead skill up. This is the demo's stand-in for the real rule. */
const movedUp = () => (finished() && correct() >= 8 ? MAYA.focus[0] : null);
const levelOf = (s) => Math.min(4, s.level + (s.name === movedUp() ? 1 : 0));
const atProficient = (list = MAYA.skills) => list.filter((s) => levelOf(s) >= 3).length;
const bars = (level) => `<span class="bars l${level}" role="img" aria-label="${LEVELS[level]}">${[1, 2, 3, 4].map((i) => `<i class="${i <= level ? "on" : ""}"></i>`).join("")}</span>`;
const squares = (list) => [...list].sort((a, b) => levelOf(b) - levelOf(a)).map((s) => `<i class="sq l${levelOf(s)}" data-tip="${s.name}: ${LEVELS[levelOf(s)]}"></i>`).join("");
function skillStrip() {
  const sec = (name) => { const l = MAYA.skills.filter((s) => s.section === name); return `<div class="sq-row"><span>${name}</span><small>${atProficient(l)} of ${l.length}</small><div class="sqs">${squares(l)}</div></div>`; };
  return `<a class="strip-link" href="#/skills" aria-label="See all ${MAYA.skills.length} skills">${sec("Math")}${sec("Reading and Writing")}</a><p class="sq-tip" data-rest="${atProficient()} of ${MAYA.skills.length} skills at Proficient or above">${atProficient()} of ${MAYA.skills.length} skills at Proficient or above</p>`;
}
function legend() {
  return `<div class="legend">${[4, 3, 2, 1].map((l) => `<span><i class="sq l${l}"></i>${LEVELS[l]} <b>${MAYA.skills.filter((s) => levelOf(s) === l).length}</b></span>`).join("")}</div>`;
}
/* What to work on next, named for what it is, with one clear way in. */
function nextSkillRow(name) {
  const s = MAYA.skills.find((x) => x.name === name), l = levelOf(s);
  return `<a class="sk-next" href="#/set"><span class="sk-name">${s.name}</span>${bars(l)}<small>${LEVELS[l]}</small><em>Practice</em></a>`;
}
const skillsPanel = () => `<section class="skills" data-rise><div class="group"><h2>Your skills</h2></div>${skillStrip()}<h3 class="sub-h">Work on next</h3>${MAYA.focus.map(nextSkillRow).join("")}<a class="link" href="#/skills">See all skills</a></section>`;
function domainBlock(d) {
  const list = MAYA.skills.filter((s) => s.domain === d), done = atProficient(list);
  return `<section class="domain" data-rise><div class="dom-head"><h3>${d}</h3><small>${done} of ${list.length} to Proficient</small></div>
    <div class="dom-bar" role="img" aria-label="${done} of ${list.length} skills at Proficient or above">${list.map((s) => levelOf(s)).sort((a, b) => b - a).map((l) => `<i class="l${l}"></i>`).join("")}</div>
    ${list.map((s) => `<a class="sk-row" href="#/set"><span class="sk-name">${s.name}</span>${bars(levelOf(s))}<small>${LEVELS[levelOf(s)]}</small></a>`).join("")}</section>`;
}
let skillSection = "All";
VIEWS.skills = () => {
  const secs = ["All", "Math", "Reading and Writing"];
  const show = skillSection === "All" ? ["Reading and Writing", "Math"] : [skillSection];
  const domains = (sec) => [...new Set(MAYA.skills.filter((s) => s.section === sec).map((s) => s.domain))];
  return head("Skills") + `<div class="sk-sum"><div class="sk-big"><span class="num">${atProficient()}</span><span>of ${MAYA.skills.length} skills at Proficient or above</span></div>
      <div class="course-bar" role="img" aria-label="Skills by level">${[4, 3, 2, 1, 0].map((l) => { const n = MAYA.skills.filter((s) => levelOf(s) === l).length; return n ? `<i class="l${l}" style="flex:${n}"></i>` : ""; }).join("")}</div>${legend()}</div>
    <div class="seg" role="group" aria-label="Show skills from">${secs.map((s) => `<button class="seg-b" aria-pressed="${s === skillSection}" data-skillsec="${s}">${s}</button>`).join("")}</div>
    ${show.map((sec) => `<h2 class="sec-h" data-rise>${sec}</h2><div class="dom-grid">${domains(sec).map(domainBlock).join("")}</div>`).join("")}`;
};
document.addEventListener("click", (e) => { const b = e.target.closest("[data-skillsec]"); if (b) { skillSection = b.dataset.skillsec; render(true); } });
/* Hovering a square names it in the line below, so the grid never needs a popup. */
document.addEventListener("pointerover", (e) => {
  const tip = document.querySelector(".sq-tip");
  if (!tip) return;
  const sq = e.target.closest(".sq[data-tip]");
  tip.textContent = sq ? sq.dataset.tip : tip.dataset.rest;
  tip.classList.toggle("on", !!sq);
});
