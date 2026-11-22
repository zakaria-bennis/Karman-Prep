import type { Lesson } from "../types";

const STEM =
  "Which choice completes the text so that it conforms to the conventions of Standard English?";

const lesson: Lesson = {
  id: "rw-unneeded-punctuation",
  tests:
    "Seeing when no mark belongs: no comma, colon or semicolon between parts of a sentence that go together.",
  spot: "One choice has no mark at all, and the others put a comma, colon or semicolon in the same spot.",
  idea: [
    "Every mark needs a reason. If **no rule asks for a mark**, leave it out.",
    "Some pairs always stay together: a **subject and its verb**, a verb and what it acts on, and a word like of or to and what follows it.",
    "A long subject still takes no comma before its verb. And a spot where you would **pause** for breath is not a reason for a mark.",
  ],
  rules: ["Subject and verb: no mark", "Verb and what follows: no mark", "No rule, no mark"],
  figure: {
    kind: "sentence",
    parts: [
      { text: "The tallest of the three old oak trees", role: "subject" },
      { text: "fell in the storm.", role: "verb" },
    ],
    joints: [{ after: 0, mark: ",", ok: false }],
    link: { from: 0, to: 1, ok: true, label: "subject to verb" },
  },
  strategy: {
    name: "No rule, no mark",
    steps: [
      "Read the sentence with no mark at the blank.",
      "Ask what the blank sits between: a subject and its verb, a verb and what follows it, or of and its object?",
      "If so, no mark.",
      "Add a mark only if a rule asks: two full sentences, an extra part, a list or an opening clause.",
    ],
  },
  examples: [
    {
      title: "Long subject",
      passage:
        "The students who signed up for the spring trip to the national ______ in the gym after school on Thursday to plan their route. Each student should bring a water bottle.",
      problem: STEM,
      choices: ["park, meet", "park meet", "park: meet", "park; meet"],
      right: 1,
      steps: [
        {
          say: "Read it with no mark: The students who signed up for the spring trip to the national park meet in the gym.",
        },
        {
          say: "The blank sits between the long subject, which ends in park, and its verb, **meet**.",
        },
        { say: "No rule puts a mark between a subject and its verb, however long the subject is." },
        {
          say: "The comma is where you might pause, but a pause is not a rule. The colon and the semicolon cut the subject off from its verb.",
        },
      ],
      answer: "park meet",
    },
    {
      title: "Verb and what",
      passage:
        "In her report, the city planner ______ the new bus lanes had cut the average commute by about six minutes. The city council plans to add two more lanes next year.",
      problem: STEM,
      choices: ["found, that", "found: that", "found that", "found; that"],
      right: 2,
      steps: [
        {
          say: "Read it with no mark: the city planner found that the new bus lanes had cut the commute.",
        },
        { say: "The blank sits between the verb, found, and what she found." },
        {
          say: "No rule asks for a mark there. It is not two full sentences, an extra part or a list.",
        },
        { say: "So found that takes no mark at all." },
      ],
      answer: "found that",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Pause trap",
      text: "Putting a comma where you would take a breath when reading aloud. Breaths are not rules. Ask which rule the mark follows; if none, cut it.",
    },
    {
      name: "Long subject",
      text: "A long subject makes a comma before the verb feel right. The members of the chess club at the high school, practice on Tuesdays is wrong.",
    },
    {
      name: "Colon after a verb",
      text: "The study showed: higher scores is wrong. A colon needs a full sentence before it, and The study showed is not one.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Read it bare",
    steps: [
      "Read the sentence with no mark at the blank.",
      "If it reads smoothly and makes sense, the no-mark choice is usually right.",
      "Pick a choice with a mark only when you can name the rule that asks for it.",
    ],
  },
  check: {
    passage:
      "A recent survey ______ more than 500 teenagers found that most of them read for fun at least once a week. The results surprised the librarians who ran it.",
    text: STEM,
    choices: ["of", "of:", "of,", "of;"],
    right: 0,
    why: "Read it with no mark: A recent survey of more than 500 teenagers found that most of them read for fun. The blank sits between of and its object, so no rule asks for a mark. The colon cuts of off from what it is about, the comma is the Pause trap, and a semicolon needs a full sentence on both sides.",
  },
  quiz: [
    {
      passage:
        "After months of testing, the engineers ______ the new battery could power a small car for more than 300 miles on one charge. They hope to begin selling it within two years.",
      text: STEM,
      choices: ["showed, that", "showed: that", "showed; that", "showed that"],
      right: 3,
      why: "Read it with no mark: the engineers showed that the new battery could power a small car. The blank sits between the verb, showed, and what they showed, so no mark belongs. The colon is the **Colon after a verb** trap. The comma is the Pause trap, and a semicolon would need a full sentence on both sides, but the engineers showed is not one.",
      subject: "reading",
    },
    {
      passage:
        "The oldest of the stone walls that circle the hilltop <u>village is</u> about 800 years old, according to records kept by the monks who once lived there.",
      text: "A student wonders whether a comma belongs between the underlined words. What should she do first?",
      choices: [
        "Decide whether she would pause there when reading the sentence aloud",
        "Read the sentence with no mark and ask what the spot sits between",
        "Count how many words come before the spot",
        "Look for another comma in the sentence to pair it with",
      ],
      right: 1,
      why: "Start by reading it with no mark and asking what the spot sits between. Village ends the long subject, and is is its verb, so no mark belongs. Deciding by a pause is the Pause trap. Counting words leads to the **Long subject** trap: a long subject still takes no comma. A comma does not need a partner unless it opens an extra part, and nothing here is extra.",
      subject: "reading",
    },
    {
      passage:
        "The study showed: students who slept at least eight hours scored higher on morning tests. The researchers now plan a larger study at three more schools.",
      text: "A student wrote the first sentence above. What is wrong with its punctuation?",
      choices: [
        "A colon cannot come right after a verb like showed, so it should be removed.",
        "The colon should be a comma, since a reader pauses after showed.",
        "The colon should be a semicolon, since two ideas meet there.",
        "A comma belongs after hours, before the verb scored.",
      ],
      right: 0,
      why: "The student fell for the **Colon after a verb** trap. The study showed is not a full sentence, so no colon. Nothing goes between showed and what the study showed. A comma there is the Pause trap. A semicolon needs a full sentence on both sides. A comma after hours would split the long subject, students who slept at least eight hours, from its verb, scored.",
      subject: "reading",
    },
    {
      text: "In which sentence is the comma used correctly?",
      choices: [
        "The members of the school chess club, practice every Tuesday.",
        "The coach told the team, that practice would start early.",
        "Because the field was flooded, the game moved into the gym.",
        "The new rules for the summer league, begin in early May.",
      ],
      right: 2,
      why: "Ask whether a rule asks for each comma. An opening clause that starts with because ends with a comma, so the flooded field sentence is right. The chess club and summer league sentences put a comma between a long subject and its verb: the **Long subject** trap. The coach sentence splits the verb, told, from what the coach said, which is the Pause trap.",
      subject: "reading",
    },
    {
      passage:
        "The guide's tips on packing light, staying dry, and choosing ______ new hikers stay safe on long mountain trails. Rangers hand out free copies at every trailhead in the park.",
      text: STEM,
      choices: ["good boots, help", "good boots help", "good boots: help", "good boots; help"],
      right: 1,
      why: "Read it with no mark. The subject is The guide's tips on packing light, staying dry, and choosing good boots, and its verb is help. The commas inside the list are right, but nothing goes after the last item, boots, before the verb. The comma there is the **Long subject** trap. The colon and the semicolon cut the subject off from its verb.",
      subject: "reading",
    },
  ],
};

export default lesson;
