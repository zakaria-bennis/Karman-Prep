import type { Lesson } from "../types";

const STEM =
  "Which choice completes the text so that it conforms to the conventions of Standard English?";

const lesson: Lesson = {
  id: "rw-colons-and-dashes",
  tests:
    "Using a colon, or a single dash that does a colon's job, to introduce a list, an example or an explanation.",
  spot: "The choices differ in the mark before a list or an explanation, and at least one choice has a colon.",
  idea: [
    "A colon says: here comes what I promised. What follows can be a **list**, an example, or an **explanation** of the first part.",
    "The words before a colon must be a **full sentence**. Cover everything after the mark. If what is left can stand alone, a colon can work.",
    "So a colon never comes right after such as, including, or a verb like are or include. A single dash can do a colon's job, and a pair of dashes works like a pair of commas.",
  ],
  rules: [
    "Full sentence, then a colon",
    "No colon after such as or are",
    "Semicolon: full sentence on both sides",
  ],
  figure: {
    kind: "sentence",
    parts: [
      { text: "The recipe needs only three things", role: "main" },
      { text: "flour, water, and salt.", role: "item" },
    ],
    joints: [{ after: 0, mark: ":", ok: true }],
  },
  strategy: {
    name: "Full sentence first",
    steps: [
      "Cover everything after the mark.",
      "Read what is left. Could it stand alone as a sentence?",
      "Yes, and a list, example or explanation follows? Use a colon.",
      "No, or it ends in such as, including or a verb? No colon.",
    ],
  },
  examples: [
    {
      title: "Before a list",
      passage:
        "After the storm, the volunteers asked for three kinds of ______ bottled water, warm blankets, and batteries for flashlights. Within a day, the town hall was full of boxes.",
      problem: STEM,
      choices: ["donations;", "donations:", "donations, including:", "donations"],
      right: 1,
      steps: [
        {
          say: "Cover what follows and read: After the storm, the volunteers asked for three kinds of donations. That is a **full sentence**.",
        },
        { say: "What follows is a list: the three kinds of donations." },
        { say: "A full sentence followed by a list takes a colon." },
        {
          say: "A semicolon needs a full sentence on both sides, and a list is not one. Including followed by a colon is an unfinished start. No mark runs the list into the sentence.",
        },
      ],
      answer: "donations:",
    },
    {
      title: "After a verb",
      passage:
        "The reason the museum closed its east wing ______ its roof had started to leak during the spring rains. Workers expect the repairs to last until early fall.",
      problem: STEM,
      choices: ["was: that", "was that", "was, that", "was; that"],
      right: 1,
      steps: [
        { say: "Cover what follows the mark: The reason the museum closed its east wing was." },
        {
          say: "That cannot stand alone. It stops at the verb, was, and leaves you waiting for the reason.",
        },
        {
          say: "No full sentence before the mark, so no colon. Nothing goes between a verb and what follows it.",
        },
        {
          say: "The comma and the semicolon split the verb from what follows too, so was that is right.",
        },
      ],
      answer: "was that",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Colon too soon",
      text: "Such as:, including:, are: and include: all put a colon before the sentence is finished. Cover what follows: if the words left behind cannot stand alone, take the colon out.",
    },
    {
      name: "Semicolon before a list",
      text: "A semicolon joins two full sentences. A list is not a full sentence, so a list never follows a semicolon.",
    },
    {
      name: "Half pair of dashes",
      text: "A dash that opens an extra detail in the middle of a sentence needs a second dash to close it, never a comma.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Cover and test",
    steps: [
      "Put your hand over everything after the colon.",
      "Read the words that are left out loud. Do they make a complete thought?",
      "If they leave you waiting, as in The kit has or The tools include, the colon must go.",
    ],
  },
  check: {
    passage:
      "Maya's vegetable garden produced almost nothing this ______ had eaten every bean plant before it could flower. Next spring, she plans to build a tall fence around it.",
    text: STEM,
    choices: ["summer: deer", "summer, deer", "summer deer", "summer, because: deer"],
    right: 0,
    why: "Cover what follows: Maya's vegetable garden produced almost nothing this summer. That is a full sentence, and the next part explains why, so a colon fits. A comma alone joins two full sentences, which is a comma splice. No mark runs them together, and because followed by a colon is an unfinished start.",
  },
  quiz: [
    {
      passage:
        "The three cities on the band's summer tour ______ Austin, and Nashville. The band plans to play two shows in each city and record one of them for a live album.",
      text: STEM,
      choices: ["are: Denver,", "are; Denver,", "are Denver,", "are, Denver,"],
      right: 2,
      why: "Cover what follows and read: The three cities on the band's summer tour are. That stops at the verb, so it is not a full sentence and cannot take a colon. The colon is the **Colon too soon** trap. The semicolon needs a full sentence on both sides, and the comma splits the verb, are, from the cities it names.",
      subject: "reading",
    },
    {
      passage:
        "The festival's food tents serve dishes from around the <u>world</u> spicy noodles from Thailand, tamales from Mexico, and fresh flatbread from Ethiopia. The lines grow longest around noon.",
      text: "A writer wants to put a colon right after the underlined word. What should she check first?",
      choices: [
        "Whether the words before the mark could stand alone as a full sentence",
        "Whether the list after the mark has at least three items in it",
        "Whether a reader would pause after the word world when reading aloud",
        "Whether the words after the mark could stand alone as a full sentence",
      ],
      right: 0,
      why: "The first test for any colon is the words before it. Here, The festival's food tents serve dishes from around the world can stand alone, so a colon works before the list. Checking the words after the mark looks at the wrong side: a list after a colon never stands alone. The number of items does not matter, and a pause when reading aloud is not a rule.",
      subject: "reading",
    },
    {
      passage:
        "Many desert animals stay underground during the hottest hours, such as: kangaroo rats, desert tortoises, and some kinds of lizards. They come out to feed after sunset.",
      text: "What is wrong with the punctuation in the first sentence?",
      choices: [
        "The comma before such as should be a colon instead.",
        "A semicolon should replace the colon, since a list follows.",
        "The comma after tortoises should be removed.",
        "A colon cannot come right after such as, so it should be removed.",
      ],
      right: 3,
      why: "Cover what follows the colon: Many desert animals stay underground during the hottest hours, such as. That leaves you waiting, so this is the **Colon too soon** trap. Take the colon out. A colon before such as would also leave such as dangling. A semicolon is the **Semicolon before a list** trap. The comma after tortoises is correct: it comes before the last item.",
      subject: "reading",
    },
    {
      passage:
        "The bridge was closed for one reason: inspectors had found a crack in its main steel beam. For a week, all traffic was sent through the old tunnel instead.",
      text: "Which choice could replace the colon without breaking a rule or changing the meaning?",
      choices: [
        "A comma",
        "A single dash",
        "No mark at all",
        "The word because followed by a colon",
      ],
      right: 1,
      why: "The words before the colon are a full sentence, and the words after explain the reason. A single dash can do a colon's job here. A comma would join two full sentences on its own, which is a comma splice. No mark runs them together. Because followed by a colon is the **Colon too soon** trap: the words before the colon would end in because.",
      subject: "reading",
    },
    {
      passage:
        "Every first-year student in the nursing program must complete the ______ writing seminar, a lab science, and a course in public speaking. Most students finish all three before the end of their first spring.",
      text: STEM,
      choices: ["following: a", "following; a", "following, a", "following a"],
      right: 0,
      why: "Cover the list and read: Every first-year student in the nursing program must complete the following. That is a full sentence, so a colon can introduce the list. The words the following feel unfinished, but they finish the sentence. The semicolon is the **Semicolon before a list** trap. A comma cannot introduce a list after a full sentence, and no mark runs the list straight into the sentence.",
      subject: "reading",
    },
  ],
};

export default lesson;
