/*
 * m-studies-and-experiments: when a result can be generalized or can show a cause. Item models
 * after the bank's own questions for this skill: which conclusion a study's design supports; the
 * design feature that allows (or the change that would allow) a cause or a generalization; and
 * the largest population a survey's results reach. Each study is built from parts (who was
 * chosen, how groups were formed, what was found), and the check tests every claim against two
 * design facts: random selection allows generalizing to the population sampled, and random
 * assignment allows a cause-and-effect conclusion.
 */
import { prose, statement, stmtSlip } from "./_data-common";
import type { Answer, Draft, Slip, Template } from "../core/types";

const SKILL = "m-studies-and-experiments";

interface StudyCtx {
  subjects: string;
  pickRandom: (n: number) => string;
  pickOther: (n: number) => string;
  frame: string;
  wider: string;
  treat: string;
  control: string;
  assignRandom: string;
  assignOther: string;
  treated: string;
  untreated: string;
  better: string;
  cause: string;
  doing: string;
}

const STUDY_CTX: StudyCtx[] = [
  {
    subjects: "adults",
    pickRandom: (n) => `selected ${n} adults at random from the members of a community center`,
    pickOther: (n) => `recruited ${n} volunteers from the members of a community center`,
    frame: "members of the community center",
    wider: "all adults",
    treat: "a magnesium supplement",
    control: "a placebo",
    assignRandom:
      "Each participant was randomly assigned to take either a magnesium supplement or a placebo every day for 8 weeks.",
    assignOther:
      "Each participant chose whether to take a magnesium supplement or a placebo every day for 8 weeks.",
    treated: "took the supplement",
    untreated: "took the placebo",
    better: "better sleep quality",
    cause: "Taking a magnesium supplement causes better sleep quality",
    doing: "Taking a magnesium supplement",
  },
  {
    subjects: "students",
    pickRandom: (n) => `selected ${n} students at random from a large high school`,
    pickOther: (n) =>
      `asked for volunteers at a large high school and enrolled the first ${n} students who signed up`,
    frame: "students at the high school",
    wider: "all high school students",
    treat: "a vocabulary app",
    control: "printed flash cards",
    assignRandom:
      "Each student was randomly assigned to study with either a vocabulary app or printed flash cards for 15 minutes a day for 6 weeks.",
    assignOther:
      "Each student chose whether to study with a vocabulary app or printed flash cards for 15 minutes a day for 6 weeks.",
    treated: "used the app",
    untreated: "used flash cards",
    better: "higher scores on a vocabulary test",
    cause: "Studying with the vocabulary app causes higher vocabulary test scores",
    doing: "Studying with the vocabulary app",
  },
  {
    subjects: "tomato plants",
    pickRandom: (n) => `selected ${n} tomato plants at random from a large commercial greenhouse`,
    pickOther: (n) =>
      `chose the ${n} tomato plants nearest the entrance of a large commercial greenhouse`,
    frame: "tomato plants in the greenhouse",
    wider: "all tomato plants",
    treat: "a new fertilizer",
    control: "the standard fertilizer",
    assignRandom:
      "Each plant was randomly assigned to receive either a new fertilizer or the standard fertilizer for one season.",
    assignOther:
      "A gardener decided which plants would receive the new fertilizer and which would receive the standard fertilizer for one season.",
    treated: "received the new fertilizer",
    untreated: "received the standard fertilizer",
    better: "a greater yield of tomatoes",
    cause: "The new fertilizer causes a greater yield of tomatoes",
    doing: "Using the new fertilizer",
  },
  {
    subjects: "employees",
    pickRandom: (n) => `selected ${n} employees at random from a large company`,
    pickOther: (n) =>
      `invited employees of a large company to take part and used the ${n} who replied first`,
    frame: "employees of the company",
    wider: "all office workers",
    treat: "a 20-minute walk after lunch",
    control: "rest after lunch",
    assignRandom:
      "Each participant was randomly assigned to either take a 20-minute walk after lunch or rest after lunch every workday for 4 weeks.",
    assignOther:
      "Each participant chose whether to take a 20-minute walk after lunch or rest after lunch every workday for 4 weeks.",
    treated: "walked after lunch",
    untreated: "rested after lunch",
    better: "lower afternoon fatigue scores",
    cause: "Walking after lunch causes lower afternoon fatigue",
    doing: "Walking after lunch",
  },
  {
    subjects: "university students",
    pickRandom: (n) => `selected ${n} students at random from a state university`,
    pickOther: (n) =>
      `posted a sign-up sheet at a state university and enrolled ${n} students who signed up`,
    frame: "students at the university",
    wider: "all college students",
    treat: "background music",
    control: "silence",
    assignRandom:
      "Each participant was randomly assigned to study a word list either with background music or in silence.",
    assignOther:
      "Each participant chose whether to study a word list with background music or in silence.",
    treated: "studied with music",
    untreated: "studied in silence",
    better: "higher scores on a memory test",
    cause: "Studying with background music causes higher memory test scores",
    doing: "Studying with background music",
  },
];

interface Design {
  sampled: boolean;
  assigned: boolean;
}

/**
 * Whether a claim holds for a design: "cause" needs random assignment; reaching the sampled
 * population needs random selection; claiming the result stops at the participants is right only
 * without random selection; denying a cause is right only without random assignment; and no
 * study reaches past the population it sampled.
 */
function holds(key: string, d: Design): boolean {
  const [kind, scope] = key.split("|");
  if (scope === "wider") return false;
  if (kind === "cause" && !d.assigned) return false;
  if (kind === "assoc" && d.assigned) return false;
  if (scope === "frame" && !d.sampled) return false;
  if (scope === "only" && d.sampled) return false;
  return kind === "cause" || kind === "assoc";
}

function describe(c: StudyCtx, d: Design, n: number): string {
  return `To investigate the effect of ${c.treat} compared with ${c.control}, a researcher ${d.sampled ? c.pickRandom(n) : c.pickOther(n)}. ${d.assigned ? c.assignRandom : c.assignOther} The researcher found that the ${c.subjects} who ${c.treated} had significantly ${c.better} than those who ${c.untreated}.`;
}

/** Why a claim fails for this design, in the second person. */
function whyNot(key: string, c: StudyCtx, d: Design): string {
  const [kind, scope] = key.split("|");
  const more: string[] = [];
  const less: string[] = [];
  if (scope === "wider")
    more.push(
      `the ${c.subjects} came only from the ${c.frame}, so the result cannot reach ${c.wider}`
    );
  if (kind === "cause" && !d.assigned)
    more.push("the groups were not formed by random assignment, so the study cannot show cause");
  if (scope === "frame" && !d.sampled)
    more.push(
      `the ${c.subjects} were not selected at random from the ${c.frame}, so the result cannot be generalized to them`
    );
  if (kind === "assoc" && d.assigned)
    less.push("random assignment does allow a cause-and-effect conclusion here");
  if (scope === "only" && d.sampled)
    less.push(
      `the ${c.subjects} were selected at random from the ${c.frame}, so the result does reach all of them`
    );
  const parts = [
    ...(more.length ? [`you claimed more than the design allows: ${more.join(", and ")}`] : []),
    ...(less.length
      ? [
          `${more.length ? "you also" : "you"} claimed less than the design allows: ${less.join(", and ")}`,
        ]
      : []),
  ];
  return parts.join("; ");
}

export const conclusion: Template = {
  id: "study.conclusion",
  skill: SKILL,
  label: "Which conclusion a study's design supports",
  difficulty: [4, 7],
  formats: ["mc"],
  make(rng): Draft {
    const c = rng.pick(STUDY_CTX);
    const d: Design = { sampled: rng.bool(0.5), assigned: rng.bool(0.6) };
    const n = rng.int(40, 240);
    const assoc = `${c.doing} is associated with ${c.better}`;
    const claims: [string, string][] = [
      [`cause|frame`, `${c.cause} for the ${c.frame}.`],
      [`cause|wider`, `${c.cause} for ${c.wider}.`],
      [
        `cause|only`,
        `${c.cause} for the ${c.subjects} in the study, but the result cannot be generalized beyond them.`,
      ],
      [
        `assoc|frame`,
        `${assoc} for the ${c.frame}, but the study does not show that it causes this.`,
      ],
      [
        `assoc|only`,
        `${assoc} for the ${c.subjects} in the study only, and the study does not show cause.`,
      ],
    ];
    const right = claims.find(([k]) => holds(k, d))!;
    const wrong = rng.shuffle(claims.filter(([k]) => k !== right[0]));
    const slips: Slip[] = wrong.map(([k, text]) => stmtSlip(text, k, whyNot(k, c, d)));
    const answer: Answer = statement(right[1], right[0]);
    return {
      format: "mc",
      stem: `${describe(c, d, n)}\nBased on the design and results of the study, which of the following is an appropriate conclusion?`,
      answer,
      slips,
      asks: "the strongest conclusion the design allows: cause only with random assignment, and the whole population only with random selection",
      steps: [
        {
          label: "Check how the participants were chosen",
          work: d.sampled
            ? `They were selected at random from the ${c.frame}, so the result can be generalized to the ${c.frame}, and no further`
            : `They were not selected at random, so the result applies only to the ${c.subjects} in the study`,
        },
        {
          label: "Check how the groups were formed",
          work: d.assigned
            ? "The groups were formed by random assignment, so the difference can be attributed to the treatment: a cause-and-effect conclusion is allowed"
            : "The groups were not formed by random assignment, so the study shows only an association, not a cause",
        },
        {
          label: "Combine the two facts",
          work: `The only conclusion that fits both is that ${right[1].charAt(0).toLowerCase()}${right[1].slice(1).replace(/\.$/, "")}`,
        },
      ],
      check:
        "Each other choice claims more than the design allows (a cause without random assignment, or a population that was not sampled at random) or less than it allows",
      tip: "Random assignment to groups allows a cause-and-effect conclusion; random selection from a population allows generalizing to that population, and only that population",
      hint: "Ask two questions: were the participants chosen at random, and were the groups assigned at random?",
      difficulty: d.sampled && d.assigned ? 4 : d.sampled || d.assigned ? rng.pick([5, 6]) : 7,
      isCorrect: (cand) => cand.key !== undefined && holds(cand.key, d),
    };
  },
};

// ---------------------------------------------------------------- the feature behind a conclusion, or the fix

export const designFeature: Template = {
  id: "study.design-feature",
  skill: SKILL,
  label: "The design feature that allows (or would allow) a cause or a generalization",
  difficulty: [3, 6],
  formats: ["mc"],
  make(rng): Draft {
    const c = rng.pick(STUDY_CTX);
    const n = rng.int(110, 260);
    const kind = rng.pick(["cause-feature", "fix-cause", "block-generalize"] as const);
    const d: Design =
      kind === "cause-feature"
        ? { sampled: true, assigned: true }
        : kind === "fix-cause"
          ? { sampled: rng.bool(0.5), assigned: false }
          : { sampled: false, assigned: true };
    const text = describe(c, d, n);
    let stem: string;
    let answer: Answer;
    let slips: Slip[];
    let steps: { label: string; work: string }[];
    if (kind === "cause-feature") {
      stem = `${text} The researcher concluded that ${c.treat} caused the difference for the ${c.frame}. What feature of this study allowed the researcher to conclude that ${c.treat} caused the difference?`;
      answer = statement(`The ${c.subjects} were randomly assigned to the two groups.`, "assign");
      slips = [
        stmtSlip(
          `The ${c.subjects} were selected at random from the ${c.frame}.`,
          "select",
          "you named random selection, which lets the result be generalized to the population but does not show cause"
        ),
        stmtSlip(
          `More than 100 ${c.subjects} took part in the study.`,
          "size",
          "a larger study gives more precise results, but size alone cannot show cause"
        ),
        stmtSlip(
          `The ${c.subjects} in both groups were measured in the same way.`,
          "measure",
          "measuring both groups the same way is good practice, but it does not rule out other differences between the groups"
        ),
      ];
      steps = [
        {
          label: "Name what a cause needs",
          work: "A cause-and-effect conclusion needs groups that are alike except for the treatment",
        },
        {
          label: "Find the feature that gives that",
          work: "Random assignment makes the groups alike on average, so random assignment is the feature",
        },
      ];
    } else if (kind === "fix-cause") {
      stem = `${text} How should the study be changed so that the researcher can conclude whether ${c.treat} causes ${c.better}?`;
      answer = statement(
        `The ${c.subjects} should be randomly assigned to the two groups.`,
        "assign"
      );
      slips = [
        stmtSlip(
          `The ${c.subjects} should be selected at random from ${c.wider}.`,
          "select",
          "random selection helps a result generalize, but without random assignment the groups may still differ in other ways"
        ),
        stmtSlip(
          `The study should include more ${c.subjects}.`,
          "size",
          "more participants do not fix groups that formed themselves"
        ),
        stmtSlip(
          "No change is needed.",
          "none",
          "the groups were not formed at random, so another difference between them could explain the result"
        ),
      ];
      steps = [
        {
          label: "Find the weakness",
          work: "The groups were not formed by random assignment, so they may differ in ways other than the treatment",
        },
        {
          label: "Name the fix",
          work: "Randomly assigning the participants to the groups removes that problem and allows a cause-and-effect conclusion",
        },
      ];
    } else {
      stem = `${text} Which of the following prevents the results from being generalized to all ${c.frame}?`;
      answer = statement(
        `The ${c.subjects} were not selected at random from the ${c.frame}.`,
        "not-selected"
      );
      slips = [
        stmtSlip(
          `The ${c.subjects} were randomly assigned to the two groups.`,
          "assigned",
          "random assignment is a strength: it allows a cause-and-effect conclusion"
        ),
        stmtSlip(
          `Only ${prose(n)} ${c.subjects} took part in the study.`,
          "size",
          `${prose(n)} is enough for a study; the problem is how they were chosen, not how many`
        ),
        stmtSlip(
          "The two groups received different treatments.",
          "different",
          "comparing different treatments is the point of the study"
        ),
      ];
      steps = [
        {
          label: "Name what generalizing needs",
          work: "Generalizing to a population needs a random sample from that population",
        },
        {
          label: "Check how they were chosen",
          work: `The ${c.subjects} were not selected at random from the ${c.frame}, so they may not represent them`,
        },
      ];
    }
    return {
      format: "mc",
      stem,
      answer,
      slips,
      asks:
        kind === "block-generalize"
          ? "the part of the design that keeps the result from reaching the whole population"
          : "the part of the design that allows a cause-and-effect conclusion",
      steps,
      check:
        'Random selection answers "who does this apply to?" and random assignment answers "did the treatment cause it?"; the answer matches the question asked',
      tip: "Random assignment is what allows cause; random selection is what allows generalizing; sample size allows neither",
      hint:
        kind === "block-generalize"
          ? "Ask how the participants were chosen."
          : "Ask how the two groups were formed.",
      difficulty: kind === "cause-feature" ? rng.pick([3, 4]) : kind === "block-generalize" ? 5 : 6,
      isCorrect: (cand) =>
        kind === "block-generalize"
          ? cand.key === "not-selected" && !d.sampled
          : cand.key === "assign" && (kind === "fix-cause" ? !d.assigned : d.assigned),
    };
  },
};

// ---------------------------------------------------------------- the largest population

const NEST_CTX = [
  {
    who: "high school students",
    levels: ["at one high school", "in the district", "in the state"],
    topic: "a proposed change to the time school starts",
  },
  {
    who: "residents",
    levels: ["of one neighborhood", "of the city", "of the state"],
    topic: "a proposed new park",
  },
  {
    who: "employees",
    levels: ["at one branch of a bank", "at all branches of the bank", "in the banking industry"],
    topic: "a proposed change to work schedules",
  },
  {
    who: "members",
    levels: ["at one location of a gym chain", "of the gym chain", "of gyms in the country"],
    topic: "a proposed change to opening hours",
  },
  {
    who: "customers",
    levels: [
      "of one store of a grocery chain",
      "of the grocery chain",
      "of grocery stores in the state",
    ],
    topic: "a proposed delivery service",
  },
];

export const largestPopulation: Template = {
  id: "study.largest-population",
  skill: SKILL,
  label: "The largest population to which a survey's results can be generalized",
  difficulty: [3, 5],
  formats: ["mc"],
  make(rng): Draft {
    const c = rng.pick(NEST_CTX);
    const level = rng.int(0, 1);
    const random = rng.bool(0.75);
    const n = rng.int(120, 900);
    const k = rng.int(Math.floor(n * 0.2), Math.floor(n * 0.8));
    const approve = rng.bool(0.5);
    const frame = `all ${c.who} ${c.levels[level]}`;
    const frameThe = `the ${c.who} ${c.levels[level]}`;
    const pick = random
      ? `A sample of ${prose(n)} ${c.who} was selected at random from ${frame}.`
      : `A survey about the proposal was posted online for ${frame}, and ${prose(n)} ${c.who} chose to respond.`;
    const options: [string, string, string][] = [
      [
        `All ${c.who} ${c.levels[level]}`,
        "frame",
        random
          ? ""
          : "the respondents chose themselves, so they are not a random sample of this population",
      ],
      [
        `All ${c.who} ${c.levels[level + 1]}`,
        "wider",
        `the sample came only from ${frameThe}, so the results cannot reach this larger population`,
      ],
      [
        `The ${prose(n)} ${c.who} who ${random ? "were surveyed" : "responded"}`,
        "sample",
        random
          ? `the sample was random, so the results reach all of ${frameThe}, not only the people surveyed`
          : "",
      ],
      [
        `The ${prose(k)} ${c.who} who said they ${approve ? "approved" : "did not approve"}`,
        "part",
        "this is only part of the sample, picked out by their answers",
      ],
    ];
    const want = random ? "frame" : "sample";
    const right = options.find((o) => o[1] === want)!;
    const largest = random ? frame : `the ${prose(n)} ${c.who} who responded`;
    return {
      format: "mc",
      stem: `A group is studying ${c.topic}. ${pick} The ${c.who} were asked whether they approved of the proposal, and ${prose(k)} said they ${approve ? "approved" : "did not approve"}. Which of the following is the largest population to which the results of the survey can be generalized?`,
      answer: statement(right[0], right[1]),
      slips: options
        .filter((o) => o[1] !== want)
        .map((o) =>
          stmtSlip(
            o[0],
            o[1],
            o[2] ? `you chose a population the design does not support: ${o[2]}` : ""
          )
        ),
      asks: "the widest group that the people surveyed fairly represent",
      steps: [
        {
          label: "Check how the sample was chosen",
          work: random
            ? `It was a random sample from ${frame}`
            : "The respondents chose themselves, so the sample is not random",
        },
        {
          label: "Name the largest population",
          work: random
            ? `Random samples represent the population they were drawn from: ${frame}`
            : `Without random selection, the results describe only ${largest}`,
        },
      ],
      check: random
        ? `No population wider than ${frameThe} was sampled, and the ${prose(n)} people surveyed are only a part of ${frameThe}`
        : "People who choose to respond can differ from those who do not, so the results cannot be extended to anyone else",
      tip: "Results generalize to the population a random sample was drawn from, and no further; without random selection they describe only the sample",
      hint: "Ask which group the sample was drawn from, and whether it was drawn at random.",
      difficulty: random ? (level === 0 ? 3 : 4) : 5,
      isCorrect: (cand) => cand.key === (random ? "frame" : "sample"),
    };
  },
};

export const TEMPLATES: Template[] = [conclusion, designFeature, largestPopulation];
