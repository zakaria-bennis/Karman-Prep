import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-verb-forms",
  tests:
    "Choosing between a full verb and an -ing, to or having form, so that every sentence has a main verb and every list keeps one form.",
  spot: "The choices are one verb in different forms, such as stretches, stretching, to stretch and having stretched.",
  idea: [
    "Every sentence needs a **main verb**: a full verb, like guides or guided, that tells what the subject does.",
    "Forms with **-ing**, to or having cannot be the main verb on their own. They describe something or name an action, but the sentence still needs a real verb.",
    "Long subjects hide this. A phrase like <i>built of granite</i> only describes the subject, so look past it and ask whether the subject ever gets its verb.",
    "In a list or a pair, every item takes the **same form**: to plan, to build and to test.",
  ],
  rules: [
    "Main verb: guides, guided",
    "Never alone: guiding, to guide, having guided",
    "A list keeps one form",
  ],
  figure: {
    kind: "sentence",
    parts: [
      { text: "The old lighthouse", role: "subject" },
      { text: "built of granite in the 1800s", role: "extra" },
      { text: "still guides", role: "verb" },
      { text: "fishing boats home.", role: "other" },
    ],
    joints: [
      { after: 0, mark: ",", ok: true },
      { after: 1, mark: ",", ok: true },
    ],
    link: { from: 0, to: 2, ok: true, label: "the subject gets its main verb" },
  },
  strategy: {
    name: "Find the main verb",
    steps: [
      "Find the subject of the sentence.",
      "Look past describing phrases and check whether the subject has a main verb yet.",
      "No main verb yet: pick the full verb, not an -ing, to or having form.",
      "Already has one: pick a describing form, or match the other items in a list.",
    ],
  },
  examples: [
    {
      title: "Lost subject",
      passage:
        "The glass sculpture in the museum's front hall, made by a local artist from more than two thousand pieces of recycled bottles, ______ blue and green light across the floor every afternoon.",
      problem:
        "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["casting", "casts", "to cast", "having cast"],
      right: 1,
      steps: [
        { say: "Find the subject: the glass sculpture." },
        {
          say: "Look past the phrase that starts with made. It only describes the sculpture, so it is not the main verb.",
        },
        {
          say: "The sculpture still has no main verb, so the blank needs a **full verb**.",
        },
        {
          say: "Casts is the only full verb. Casting, to cast and having cast cannot be a main verb on their own.",
        },
      ],
      answer: "casts",
    },
    {
      title: "Verb already there",
      passage:
        "______ by two hikers in a mountain cave, the paintings show horses and deer drawn in red and black. Scientists think the paintings are at least 20,000 years old.",
      problem:
        "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["They were discovered", "Discovering", "Discovered", "Were discovered"],
      right: 2,
      steps: [
        { say: "Find the subject and its verb: the paintings show." },
        {
          say: "The sentence already has its main verb, so the blank needs a describing form, not a second verb.",
        },
        { say: "The hikers found the paintings, so the paintings were discovered: discovered." },
        {
          say: "They were discovered would join two full sentences with only a comma. Were discovered is a verb with no subject. Discovering would mean the paintings did the finding.",
        },
      ],
      answer: "Discovered",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Smooth -ing",
      text: "An -ing form often sounds fine, but it cannot be the main verb. <i>The hikers resting after the climb.</i> is not a sentence.",
    },
    {
      name: "Lost subject",
      text: "When a long phrase sits between the subject and the blank, you forget the subject still needs its verb. Verbs inside that phrase do not count.",
    },
    {
      name: "Broken list",
      text: "Every item in a list takes the same form. <i>She likes hiking, swimming and to bike</i> breaks the list; biking fixes it.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Strip the sentence",
    steps: [
      "Cover every phrase set off by commas, and every clause that starts with who, which, that or where.",
      "Read what is left: the subject and the blank.",
      "If what is left is not yet a full sentence, the blank needs a full verb.",
    ],
  },
  check: {
    passage:
      "To prepare for the camping trip, the students learned to read a compass, to build a small fire, and ______ a tent in under ten minutes.",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: ["pitching", "to pitch", "pitches", "having pitched"],
    right: 1,
    why: "The sentence already has its main verb, learned, and the blank is the last item in a list: to read, to build, and to pitch. The list needs one form, so to pitch fits. Pitching is the **Broken list** trap. Pitches is a full verb that does not match the students or the list. Having pitched breaks the list too.",
  },
  quiz: [
    {
      passage:
        "______ in 1902 to carry ore down from the mines, the narrow railway now takes tourists up the mountain each summer to see the old mining town.",
      text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["It was built", "Built", "Building", "Was built"],
      right: 1,
      why: "Find the subject and its verb: the railway now takes. The main verb is already there, so the blank needs a describing form. Workers built the railway, so built fits. It was built joins two full sentences with only a comma. Building sounds smooth but would mean the railway did the building. Was built is a verb with no subject of its own.",
      subject: "reading",
    },
    {
      passage:
        "The tall glass towers along the river, designed by an architect who wanted each one to look like a sail and finished just last spring, ______ the city's skyline.",
      text: "The choices for the blank are changing, have changed, to change and having changed. What should you do first?",
      choices: [
        "Match the blank to finished, the verb just before it.",
        "Pick the -ing form, since it reads most smoothly after a long phrase.",
        "Match the blank to designed, the first verb in the sentence.",
        "Find the subject, towers, and check whether it has a main verb yet.",
      ],
      right: 3,
      why: "Start with the subject and its verb. The subject is towers, and designed, wanted and finished all sit inside the describing phrase, so the towers still need a main verb: have changed. Matching finished or designed is the **Lost subject** trap, since verbs inside the phrase do not count. Picking the -ing form is the **Smooth -ing** trap: changing would leave the towers with no main verb.",
      subject: "reading",
    },
    {
      passage:
        "The marathon runners, tired after twenty miles in the summer heat but cheered on by crowds along every street, ______ toward the finish line in the last hour of the race.",
      text: "A student chose pushing for the blank. Why is that choice wrong?",
      choices: [
        "Pushing leaves the runners without a main verb.",
        "No correct sentence can use an -ing form.",
        "The verb must match street, so it should be pushes.",
        "The blank needs to push, since the runners have a goal.",
      ],
      right: 0,
      why: "Strip the sentence: the runners ______ toward the finish line. Tired and cheered only describe the runners, so the blank must be the main verb, and pushing cannot be one. The student fell for Smooth -ing. Plenty of correct sentences use -ing forms to describe. Matching street is the **Lost subject** trap; the runners are plural. To push is not a main verb either.",
      subject: "reading",
    },
    {
      text: "In which sentence does the blank need a full main verb, such as opens?",
      choices: [
        "______ its doors at six every morning, the pool fills with swimmers before sunrise.",
        "Next summer, the pool plans ______ a second lane just for children.",
        "The pool on Elm Street, run by the city and known for its warm water, ______ at six every morning.",
        "______ for fifty years, the pool is now the oldest one in town.",
      ],
      right: 2,
      why: "Find each sentence's subject and check for a main verb. In the Elm Street sentence, run and known only describe the pool, so the pool still needs a main verb: opens. The first sentence already has fills, so it needs opening. The second already has plans, so it needs to open. The last already has is, so it needs a describing form like open.",
      subject: "reading",
    },
    {
      passage:
        "Beekeepers have long asked whether city hives can keep up with country ones. Honeybee colonies that live in cities, where flowers bloom in parks, gardens and window boxes from early spring until late fall, often ______ more honey than colonies kept beside farms planted with a single crop.",
      text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["producing", "produce", "to produce", "having produced"],
      right: 1,
      why: "Strip the second sentence: honeybee colonies often ______ more honey. The verbs live and bloom sit inside clauses that describe the colonies and the cities, so the colonies still need a main verb: produce. Treating bloom as the main verb is the **Lost subject** trap, and it leads to producing, which is also the **Smooth -ing** trap. To produce and having produced cannot be main verbs either.",
      subject: "reading",
    },
  ],
};

export default lesson;
