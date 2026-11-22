import type { Lesson } from "../types";

const STEM =
  "Which choice completes the text so that it conforms to the conventions of Standard English?";

const lesson: Lesson = {
  id: "rw-subject-verb-agreement",
  tests:
    "Matching a verb to its real subject: a singular verb for one thing, a plural verb for more than one.",
  spot: "The choices are forms of one verb, such as is and are, has and have, or shows and show.",
  idea: [
    "A verb must match its **real subject**. One thing takes a singular verb, like is, has or shows. More than one takes a plural verb, like are, have or show.",
    "The real subject is often not the noun right before the verb. **Cross out the middle**: of phrases, along with phrases and extra parts in commas. Then read the subject straight into the verb.",
    "Each, every and one of are **singular**. And joins two subjects into a plural. With or or nor, match the subject nearer the verb.",
  ],
  rules: [
    "One thing: is, has, shows",
    "More than one: are, have, show",
    "Each, every, one of: singular",
  ],
  figure: {
    kind: "sentence",
    parts: [
      { text: "The collection", role: "subject" },
      { text: "of rare stamps in the glass cases", role: "extra" },
      { text: "belongs", role: "verb" },
      { text: "to the city.", role: "other" },
    ],
    link: { from: 0, to: 2, ok: true, label: "one collection, belongs" },
  },
  strategy: {
    name: "Cross out the middle",
    steps: [
      "Ask who or what does the verb. That is the real subject.",
      "Cross out the words between the subject and the verb.",
      "Decide: one thing, or more than one?",
      "Match the verb, and check that its tense fits too.",
    ],
  },
  examples: [
    {
      title: "An of phrase",
      passage:
        "The fossils of a giant sea turtle, found by a farmer digging a well, ______ now on display at the state museum. Scientists think the turtle lived about 70 million years ago.",
      problem: STEM,
      choices: ["is", "are", "was", "has been"],
      right: 1,
      steps: [
        { say: "The choices are forms of be. Ask what is on display." },
        {
          say: "Cross out the middle: of a giant sea turtle, and the extra part found by a farmer digging a well.",
        },
        { say: "What is left: The fossils ______ now on display. **Fossils** is plural." },
        {
          say: "Plural takes are. Is and has been match turtle, the nearest noun, and was is singular and past, which clashes with now.",
        },
      ],
      answer: "are",
    },
    {
      title: "Each one",
      passage:
        "Each of the twelve paintings in the new exhibit ______ a different season on the family's farm. The artist spent four years finishing the series in a barn behind the house.",
      problem: STEM,
      choices: ["show", "shows", "are showing", "have shown"],
      right: 1,
      steps: [
        { say: "Ask what does the showing." },
        { say: "Cross out the middle: of the twelve paintings in the new exhibit." },
        { say: "What is left: Each ______ a different season. Each is singular." },
        { say: "Singular takes shows. The other three are plural and match paintings." },
      ],
      answer: "shows",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Nearest noun",
      text: "Matching the verb to the noun just before it. In The box of old letters is heavy, the subject is box, not letters.",
    },
    {
      name: "Flipped sentence",
      text: "The subject comes after the verb. In On the shelf sit three old clocks, the clocks do the sitting, so the verb is plural.",
    },
    {
      name: "Long interrupter",
      text: "A long part in commas, or a phrase like along with, sits between the subject and the verb. It never changes the subject.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Bracket the middle",
    steps: [
      "Put brackets around of phrases and any part set off by commas.",
      "Read the subject straight into the verb: The fossils are on display.",
      "If the pair sounds wrong out loud with the middle gone, the verb is wrong.",
    ],
  },
  check: {
    passage:
      "Deep in the forest, beside a stream that never freezes, ______ two old stone cabins built by early settlers. Hikers often stop there to rest and fill their water bottles.",
    text: STEM,
    choices: ["stands", "stand", "has stood", "is standing"],
    right: 1,
    why: "This is a flipped sentence. Ask what stands in the forest: two old stone cabins. The subject comes after the verb, and it is plural, so stand is right. Stands, has stood and is standing are all singular. They match stream or forest, the nouns before the blank, which is the **Nearest noun** trap.",
  },
  quiz: [
    {
      passage:
        "One of the bridges over the river ______ closed every winter, when ice builds up around its wooden posts. Drivers must take the longer road through town until spring.",
      text: STEM,
      choices: ["are", "were", "is", "have been"],
      right: 2,
      why: "Cross out the middle: of the bridges over the river. What is left is One ______ closed every winter. One is singular, so is fits, and the present tense matches builds. Are and have been match bridges, which is the **Nearest noun** trap. Were is plural and past, while the passage says this happens every winter.",
      subject: "reading",
    },
    {
      passage:
        "The list of rules posted near the pool doors <u>tell</u> swimmers to shower before entering the water. Lifeguards can ask anyone who skips that step to leave the pool.",
      text: "A student thinks the underlined verb may be wrong. What should she do first?",
      choices: [
        "Find the real subject by crossing out the words between it and the verb",
        "Match the verb to doors, the noun right before it",
        "Check whether the verb is in the past or the present tense",
        "Count the nouns in the sentence and use a plural verb if there are several",
      ],
      right: 0,
      why: "Start by finding the real subject. Cross out of rules posted near the pool doors, and you get The list tell, which should be The list tells. Matching doors is the **Nearest noun** trap. The tense is fine here, so checking it first does not find the problem. Counting nouns does not work: only the subject decides the verb.",
      subject: "reading",
    },
    {
      passage:
        "The coach, along with her two assistants, plan the team's workouts for the whole season. Each workout is posted online the night before so players can get ready.",
      text: "A student wrote the first sentence above. Is the verb plan correct?",
      choices: [
        "Yes, because the coach and her assistants are more than one person.",
        "Yes, because the noun right before it, assistants, is plural.",
        "No, it should be planned, since workouts are made ahead of time.",
        "No, the subject is coach, so the verb should be plans.",
      ],
      right: 3,
      why: "Cross out the middle: along with her two assistants is a Long interrupter, and it never changes the subject. What is left is The coach plan, which should be The coach plans. Along with does not work like and, so the subject stays singular. Assistants is the **Nearest noun** trap. Planned changes the tense, but the passage is in the present: is posted.",
      subject: "reading",
    },
    {
      text: "In which sentence does the verb agree with its subject?",
      choices: [
        "The box of old letters are up in the attic.",
        "Neither the coach nor the players were late.",
        "On the shelf sits three old clocks.",
        "Every one of the windows have a crack.",
      ],
      right: 1,
      why: "With nor, match the subject nearer the verb. That is players, which is plural, so were is right. The box sentence matches letters instead of box, which is the **Nearest noun** trap. The shelf sentence is a Flipped sentence: clocks is the subject, so it should be sit. Every one is singular, so the windows sentence should say has.",
      subject: "reading",
    },
    {
      passage:
        "The stretch of coral reefs off the island's northern coast, which divers have studied since the 1980s and which shelters hundreds of kinds of fish, ______ signs of recovery after years of warming waters. Local groups now plant young coral there each summer.",
      text: STEM,
      choices: ["has shown", "have shown", "are showing", "were showing"],
      right: 0,
      why: "Cross out the middle: of coral reefs off the island's northern coast, and the long which part in commas. What is left is The stretch ______ signs of recovery. Stretch is singular, so has shown is right. Have shown and are showing match reefs, the **Nearest noun** trap, helped along by the Long interrupter. Were showing is plural too.",
      subject: "reading",
    },
  ],
};

export default lesson;
