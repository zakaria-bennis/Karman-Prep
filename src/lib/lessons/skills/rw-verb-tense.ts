import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-verb-tense",
  tests:
    "Choosing the verb tense that fits the timeline of the text: past, present, future, or a perfect tense with has, have or had.",
  spot: "The choices are one verb in different tenses, such as floods, flooded, has flooded, had flooded and will flood.",
  idea: [
    "A verb's tense tells **when** something happens. The right tense fits the timeline the rest of the text sets up.",
    "**Time words** set that timeline. <i>In 1920</i> means past, <i>now</i> means present, and <i>next year</i> means future. The other verbs nearby help too.",
    "Perfect tenses need a reason. Has or have links the past to now, often with **since**. Had marks the **earlier** of two past events, often with <i>by the time</i> or <i>before</i>.",
  ],
  rules: [
    "Past: landed",
    "Past up to now: has studied",
    "Earlier of two past events: had passed",
    "Future: will open",
  ],
  figure: {
    kind: "timeline",
    events: [
      { label: "the storm passes", at: "earlier past", verb: "had passed" },
      { label: "the rescue boat arrives", at: "past", verb: "arrived" },
      { label: "the town rebuilds, up to today", at: "now", verb: "has rebuilt" },
      { label: "a new seawall opens", at: "future", verb: "will open" },
    ],
  },
  strategy: {
    name: "Follow the timeline",
    steps: [
      "Find the time words: a date, since, by the time, next year.",
      "Look at the other verbs nearby and note their time.",
      "Use has or have for past up to now, and had for the earlier of two past events.",
      "Cross out every choice that jumps to the wrong time.",
    ],
  },
  examples: [
    {
      title: "Up to now",
      passage:
        "Ms. Okafor opened her bakery on Main Street in 2009. Since then, she ______ more than a dozen kinds of bread, from rye to sourdough, and she now sells loaves to three nearby cafes.",
      problem:
        "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["develops", "has developed", "had developed", "will develop"],
      right: 1,
      steps: [
        { say: "Find the time words: since then, and now near the end." },
        {
          say: "Since means from a past moment, 2009, **up to now**. The baking of new breads stretches across that whole time.",
        },
        { say: "Past up to now takes has or have, so has developed fits." },
        {
          say: "Develops is present only. Had developed would need an earlier past event. Will develop is future.",
        },
      ],
      answer: "has developed",
    },
    {
      title: "Two past events",
      passage:
        "When the explorers finally reached the top of the pass in late October, they found that snow ______ the trail down the other side, so they turned back and waited for spring.",
      problem:
        "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["will block", "had blocked", "blocks", "has blocked"],
      right: 1,
      steps: [
        {
          say: "Find the time words and verbs: in late October, reached, found, turned. The timeline is the past.",
        },
        {
          say: "The snow blocked the trail before the explorers found it. That is two past events, one earlier.",
        },
        { say: "The earlier of two past events takes had, so had blocked fits." },
        {
          say: "Blocks is present, has blocked reaches up to now, and will block is future.",
        },
      ],
      answer: "had blocked",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Wrong timeline",
      text: "A side clause can have its own time, such as <i>which stands today</i>. Match the main timeline of the text, not the nearest verb.",
    },
    {
      name: "Fancy tense",
      text: "Had been or will have sound careful, but they need a reason. With no second event or time word, the plain tense is right.",
    },
    {
      name: "Missed time word",
      text: "Since asks for has or have. By the time and before, about the past, ask for had. Skip these words and the tense goes wrong.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Circle the time words",
    steps: [
      "Circle every time word: dates, since, by the time, before, next year.",
      "Underline the other verbs in the text and say their time: past, now or future.",
      "Pick the plain tense that fits, unless a time word or a second past event asks for has, have or had.",
    ],
  },
  check: {
    passage:
      "The city's new bike-share program is still being tested on two streets. If the test goes well, the program ______ to every neighborhood next spring, adding about 500 bikes.",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: ["expanded", "has expanded", "will expand", "had expanded"],
    right: 2,
    why: "Follow the timeline. The test is happening now, and next spring points to the future, so will expand fits. Expanded and had expanded put the growth in the past, which is the Wrong timeline trap, since the program is still being tested. Has expanded says the growth has already happened up to now.",
  },
  quiz: [
    {
      passage:
        "By the time the firefighters arrived at the old barn, the neighbors ______ most of the horses to a field across the road. Thanks to their quick work, no animals were hurt.",
      text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["move", "have moved", "will move", "had moved"],
      right: 3,
      why: "Find the time words: by the time, with arrived in the past. The neighbors moved the horses before the firefighters arrived, so the moving is the earlier of two past events and takes had: had moved. The tempting have moved is the Missed time word trap, since has and have reach up to now, not to a past moment. Move is present, and will move is future.",
      subject: "reading",
    },
    {
      passage:
        "Before the bridge opened in 1937, ferries ______ people across the bay, a trip that took about half an hour each way in good weather.",
      text: "The choices for the blank are carry, have carried, had carried and will carry. What should you do first?",
      choices: [
        "Find the time words, before and 1937, that set the timeline.",
        "Pick carry, since ferries still cross many bays today.",
        "Pick the longest verb form, since it sounds the most careful.",
        "Read only the words after the blank, people across the bay.",
      ],
      right: 0,
      why: "Start with the time words. Before the bridge opened in 1937 puts the ferry trips in the past, earlier than the opening, so the answer is had carried. Picking carry because ferries still run today is the Wrong timeline trap. Picking the longest form is the Fancy tense trap; it only works here because of the time words. Reading only the words after the blank skips the time words completely.",
      subject: "reading",
    },
    {
      passage:
        "On opening day last Saturday, more than 3,000 visitors ______ the museum's new dinosaur hall, where a full skeleton of a long-necked dinosaur stands almost three stories tall.",
      text: "A student chose tour, because the nearby verb stands is in the present. Why is that choice wrong?",
      choices: [
        "Stands should be stood, so that both verbs are in the past.",
        "The blank needs had toured, because the visit came first.",
        "Stands describes the skeleton today; last Saturday puts the visit in the past.",
        "The blank needs will tour, because the hall has just opened.",
      ],
      right: 2,
      why: "Follow the main timeline: on opening day last Saturday is past, so the visitors toured the hall. Stands is in a side clause about the skeleton, which still stands today, so it keeps its own time. The student fell for the Wrong timeline trap. Changing stands to stood would wrongly suggest the skeleton is gone. Had toured is a Fancy tense with no second past event. Will tour points to the future.",
      subject: "reading",
    },
    {
      text: "In which sentence does the blank need a form with has, such as has grown?",
      choices: [
        "In 1850, the town ______ to about 2,000 people.",
        "Since the new factory opened, the town ______ to twice its old size.",
        "By the time the railroad arrived, the town ______ to nearly 5,000 people.",
        "If the new mall is built, the town ______ even larger in the next ten years.",
      ],
      right: 1,
      why: "Look for the time words in each sentence. Since the new factory opened runs from a past moment up to now, so it needs has grown. In 1850 is a finished past time, so it needs grew. By the time the railroad arrived marks an earlier past event, so it needs had grown. If the mall is built points ahead, so it needs will grow.",
      subject: "reading",
    },
    {
      passage:
        "For centuries, sailors told stories of a ship that sank somewhere off the island's rocky coast. Divers searched for it again and again with no luck. Then, in 2019, a team using sonar found the wreck in deep water. Tests showed that its wooden hull ______ on the sea floor for nearly 300 years before the team's discovery.",
      text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["rests", "will rest", "had rested", "has rested"],
      right: 2,
      why: "Follow the timeline. The discovery came in 2019, in the past, and the resting came before it: for nearly 300 years before the team's discovery. The earlier of two past events takes had, so had rested fits. The tempting has rested is the Missed time word trap: has reaches up to now, but before the team's discovery stops the clock in 2019. Rests is present, and will rest is future.",
      subject: "reading",
    },
  ],
};

export default lesson;
