import type { LessonChecks } from "./types";

// Solved blind by a second reader: the goal's job (findings, aim, method, introduction), then the
// choice that does that job with the notes.
const checks: LessonChecks = {
  examples: [
    // findings: "scores were about the same" with music as in silence
    { index: 3 },
    // unfamiliar audience: names her as "Archaeologist Ji-woo Han" and what she studies
    { index: 1 },
  ],
  // aim: "set out to learn whether traffic noise affects how often bees visit flowers"
  check: { index: 0 },
  quiz: [
    // unfamiliar audience: "Engineer Kofi Mensah" plus what he designs
    { index: 3 },
    // first turn the goal into a checklist item: how the study was done
    { index: 1 },
    // tracking 200 students is the method; the goal asks for the findings
    { index: 0 },
    // aim: "set out to learn how fast a glacier's front edge was moving back"
    { index: 2 },
    // study and findings for an unfamiliar audience: names the researcher, the study, and the result
    { index: 1 },
  ],
};

export default checks;
