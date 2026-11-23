import type { Lesson } from "../types";

const ASK =
  "Which choice completes the text so that it conforms to the conventions of Standard English?";

const lesson: Lesson = {
  id: "rw-sentence-boundaries",
  tests:
    "Choosing the punctuation that joins or separates two ideas correctly, so the text has no fragment, run-on or comma splice.",
  spot: "The choices are the same words with a different mark at one spot: a period, a semicolon, a comma, a comma plus and, or no mark at all.",
  idea: [
    "A **full sentence** has a subject and a main verb and can stand alone. Two full sentences need a strong joint between them.",
    "Strong joints are a period, a semicolon, or a comma plus and, but or so. A comma alone between two full sentences is a **comma splice**, and no mark at all is a **run-on**.",
    "The test: cover the mark and read each side alone. If both sides could stand alone, use a strong joint. If one side cannot, no period or semicolon goes there.",
  ],
  rules: [
    "Period: Full. Full.",
    "Semicolon: Full; full.",
    "Comma plus and, but or so",
    "Never a comma alone",
  ],
  figure: {
    kind: "sentence",
    parts: [
      { text: "The tide went out at noon", role: "main" },
      { text: "the children searched the rocks for crabs.", role: "main" },
    ],
    joints: [{ after: 0, mark: ";", ok: true }],
  },
  strategy: {
    name: "Test each side",
    steps: [
      "See what changes across the choices: here, the mark.",
      "Cover the mark and read each side alone.",
      "Both sides full: use a period, a semicolon, or a comma plus and, but or so.",
      "One side not full: no period or semicolon there.",
    ],
  },
  examples: [
    {
      title: "Two full sentences",
      passage:
        "The city's first zoo opened in ______ it held only a few deer, two bears and a small pond of ducks, yet crowds of families still came to visit every Sunday afternoon.",
      problem: ASK,
      choices: ["1870,", "1870;", "1870", "1870, then"],
      right: 1,
      steps: [
        { say: "Only the mark after 1870 changes, so this is a boundary question." },
        { say: "Left side: The city's first zoo opened in 1870. It can stand alone." },
        {
          say: "Right side: it held only a few deer and the rest. It can stand alone too, so the two need a **strong joint**.",
        },
        {
          say: "The semicolon works. A comma alone is a comma splice, no mark is a run-on, and then is not a joining word.",
        },
      ],
      answer: "1870;",
      checkIn: {
        text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
        passage:
          "The bakery on Main Street sells out of bread by ______ the owner plans to hire a second baker so the shelves stay full all day.",
        choices: ["noon,", "noon", "noon, then", "noon;"],
        right: 3,
        why: "Both sides are full sentences, so they need a semicolon (or a period) between them. A comma alone is the **Comma splice** trap, and then is not a joining word, so a comma before it is still a splice, the **Adverb splice** trap.",
        twin: {
          text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
          passage:
            "The library added a new reading room last ______ it already fills up with students every afternoon.",
          choices: ["spring;", "spring,", "spring", "spring, however"],
          right: 0,
          why: '"The library added a new reading room last spring" and "it already fills up with students every afternoon" are both full sentences, so a semicolon joins them. A comma alone is the **Comma splice** trap, and however cannot join two sentences either, the **Adverb splice** trap.',
        },
      },
    },
    {
      title: "One side short",
      passage:
        "After climbing for three hours in the dark, the hikers reached the top of the ridge just before ______ the moment when the sun broke through the clouds and lit the valley below.",
      problem: ASK,
      choices: ["sunrise;", "sunrise.", "sunrise,", "sunrise, it was"],
      right: 2,
      steps: [
        { say: "Only the mark after sunrise changes, so test each side." },
        {
          say: "Left side: the hikers reached the top of the ridge just before sunrise. It can stand alone.",
        },
        {
          say: "Right side: the moment when the sun broke through the clouds. It has no main verb of its own, so it **cannot stand alone**.",
        },
        {
          say: "So no period or semicolon. A comma joins the phrase to the sentence. Adding it was makes a comma splice.",
        },
      ],
      answer: "sunrise,",
      tryFrom: 2,
      checkIn: {
        text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
        passage:
          "After weeks of practice in the school gym, the dancers finally stepped onto the stage for their first ______ a moment none of them would forget.",
        choices: ["performance;", "performance,", "performance.", "performance, it was"],
        right: 1,
        why: '"A moment none of them would forget" is not a full sentence: it has no verb of its own. It describes the performance, so a comma joins it to the sentence. A semicolon or a period would leave it standing alone as a fragment, the **Pause trap**.',
        twin: {
          text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
          passage:
            "The team's bus rolled into town late on Friday ______ hours after the game was supposed to begin.",
          choices: ["night.", "night;", "night, it was", "night,"],
          right: 3,
          why: '"Hours after the game was supposed to begin" has no subject and verb of its own, so it cannot stand alone. A comma attaches it to the sentence. A period or semicolon would cut it off as a fragment, the **Pause trap**, and adding "it was" makes a comma splice.',
        },
      },
    },
  ],
  traps: [
    {
      name: "Comma splice",
      text: "A comma alone between two full sentences. It looks fine because the sentences are related, but a comma is too weak to join them.",
    },
    {
      name: "Adverb splice",
      text: "Words such as however, therefore, then and in fact do not join sentences. Between two full sentences, they need a period or semicolon before them.",
    },
    {
      name: "Pause trap",
      text: "Putting a comma where you would pause when reading aloud. Pauses are not rules; test whether each side can stand alone instead.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Read it as two",
    steps: [
      "Put your finger on the mark and read the left side as if it ended there.",
      "Then read the right side as if it started a new sentence.",
      "If both sound complete, you need a period, a semicolon, or a comma plus and, but or so.",
      "Words such as however and then do not count as joining words.",
    ],
  },
  check: {
    passage:
      "Many sea turtles return to the beach where they hatched to lay their own ______ swim hundreds of miles across open ocean to get there each nesting season.",
    text: ASK,
    choices: ["eggs, some", "eggs. Some", "eggs some", "eggs, in fact, some"],
    right: 1,
    why: "Cover the mark and test each side. Many sea turtles return to the beach to lay their own eggs can stand alone, and some swim hundreds of miles to get there can too. Two full sentences need a strong joint, so the period fits. The comma alone is a Comma splice. With no mark, the two run together. In fact is not a joining word, so that choice is an Adverb splice.",
  },
  quiz: [
    {
      passage:
        "The town's oldest building is the stone mill beside the ______ a three-story structure built by early settlers who used the river's current to grind their grain.",
      text: ASK,
      choices: ["river,", "river;", "river.", "river, it is"],
      right: 0,
      why: "Test each side. The town's oldest building is the stone mill beside the river can stand alone. The right side, a three-story structure built by early settlers, has no main verb, so it cannot. One side is short, so the comma fits. The semicolon and the period both treat the phrase as a full sentence and leave a fragment. Adding it is makes two full sentences, so the comma becomes a Comma splice.",
      subject: "reading",
    },
    {
      passage:
        "In the desert, rain may not fall for months at a ______ when a storm finally arrives, seeds that have waited in the dry soil can sprout within days.",
      text: "The choices differ only in the mark after time. Before you choose, what should you do first?",
      choices: [
        "Read the text in your head and put a comma wherever you would pause.",
        "Cover the mark and test whether each side could stand alone.",
        "Pick the choice with a semicolon, since semicolons are tested often.",
        "Pick the shortest choice, since short answers are usually right.",
      ],
      right: 1,
      why: "Once you see that only the mark changes, cover it and test each side. Here, rain may not fall for months at a time can stand alone, and so can when a storm finally arrives, seeds can sprout within days, so a period or semicolon belongs there. Adding a comma wherever you pause is the Pause trap. A semicolon is right only when both sides are full. Length is no guide to grammar.",
      subject: "reading",
    },
    {
      passage:
        "Ticket sales for the school play were slow in the first ______ word spread about the funny second act, and the last two shows sold out.",
      text: "Ana filled the blank with week, however, and wrote no other marks. Why is her choice wrong?",
      choices: [
        "However should never begin the second part of a sentence.",
        "The right side is not a full sentence, so it needs no mark at all.",
        "However is not a joining word, so the comma before it leaves two full sentences spliced.",
        "The comma after however should be removed, since however never takes a comma.",
      ],
      right: 2,
      why: "Both sides are full sentences: ticket sales were slow in the first week, and word spread about the funny second act. However adds meaning but cannot join them, so a comma before it is the **Adverb splice** trap. The fix is week; however, with a semicolon. However can start a clause, so that rule is false. The right side has a subject and verb, word spread, so it is full. And however does take a comma after it.",
      subject: "reading",
    },
    {
      passage:
        "Although the new footbridge over the river was finished in ______ it did not open to walkers and cyclists until the following spring, after workers had painted the railings.",
      text: ASK,
      choices: ["May;", "May.", "May", "May,"],
      right: 3,
      why: "Test each side. The right side, it did not open until the following spring, can stand alone, but the left side starts with Although, so it cannot. Since one side is short, no semicolon or period: a period would leave the Although part as a fragment. A comma ends the opening Although part, so May with a comma fits. The tempting semicolon looks right only if you skip the test. With no mark, the two parts blur together.",
      subject: "reading",
    },
    {
      passage:
        "Built in the 1500s, the stone walls that circle the old city stretch for nearly ______ walking the full loop on top of them takes most visitors about two hours.",
      text: ASK,
      choices: ["5 kilometers, therefore,", "5 kilometers", "5 kilometers;", "5 kilometers,"],
      right: 2,
      why: "Test each side. The left side opens with Built in the 1500s, but it still has a subject, walls, and a main verb, stretch, so it can stand alone. The right side, walking the full loop takes most visitors about two hours, has its own subject and verb too. Two full sentences need a strong joint, so the semicolon fits. The comma alone is a Comma splice, therefore between commas is an Adverb splice, and no mark makes a run-on.",
      subject: "reading",
    },
  ],
};

export default lesson;
