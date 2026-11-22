import type { Lesson } from "../types";

const STEM =
  "Which choice completes the text so that it conforms to the conventions of Standard English?";

const lesson: Lesson = {
  id: "rw-lists-and-series",
  tests:
    "Choosing the marks between the items in a list of three or more: commas, or semicolons when the items have commas inside them.",
  spot: "A list of three or more items, and the choices differ in the comma, semicolon or other mark after one item.",
  idea: [
    "Items in a list are usually split by **commas**, with one before the final and.",
    "When any item already has a comma inside it, such as a city and its state, commas can no longer show where items end. Then **semicolons** split the items, and the commas stay inside them.",
    "Use the **same mark** between every pair of items. And nothing goes between the last item and the verb that follows it.",
  ],
  rules: ["Plain items: commas", "Commas inside items: semicolons", "No mark before the verb"],
  figure: {
    kind: "sentence",
    parts: [
      { text: "The choir sang in", role: "main" },
      { text: "Salem, Oregon", role: "item" },
      { text: "Reno, Nevada", role: "item" },
      { text: "and Tucson, Arizona.", role: "item" },
    ],
    joints: [
      { after: 1, mark: ";", ok: true },
      { after: 2, mark: ";", ok: true },
    ],
  },
  strategy: {
    name: "Find the items",
    steps: [
      "Find the items in the list.",
      "Does any item have a comma inside it? Split the items with semicolons.",
      "If not, split them with commas, one before the final and.",
      "Check the ends: no mark between the last item and its verb.",
    ],
  },
  examples: [
    {
      title: "Commas inside items",
      passage:
        "The new library will offer free classes on three subjects: coding, which starts in ______ painting, which starts in March; and Spanish, which starts in April. Sign-ups open next week at the front desk.",
      problem: STEM,
      choices: ["January,", "January;", "January", "January:"],
      right: 1,
      steps: [
        {
          say: "Find the items: coding, painting and Spanish, each with a part that says when it starts.",
        },
        {
          say: "Each item has a comma inside it, so commas cannot show where one item ends and the next begins.",
        },
        {
          say: "The other items are already split by semicolons, so this one needs a **semicolon** too.",
        },
        {
          say: "A comma would mix marks and blur where coding ends. No mark runs two items together, and a colon does not belong in the middle of a list.",
        },
      ],
      answer: "January;",
    },
    {
      title: "Before the verb",
      passage:
        "Carrots, beets, and ______ grow well in the cool, damp soil of the valley. Farmers there often plant all three in the same field in early spring.",
      problem: STEM,
      choices: ["potatoes,", "potatoes;", "potatoes", "potatoes:"],
      right: 2,
      steps: [
        { say: "Find the items: carrots, beets, and potatoes." },
        {
          say: "No item has a comma inside it, so commas between the items are right, including the one before and.",
        },
        {
          say: "After the last item comes the verb, grow. The three items are the subject, and nothing goes between a subject and its verb.",
        },
        { say: "So potatoes takes no mark at all." },
      ],
      answer: "potatoes",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Mixed marks",
      text: "A comma where the other items use semicolons. Once one pair of items is split by a semicolon, every pair must be.",
    },
    {
      name: "Comma before the verb",
      text: "Apples, pears, and plums, grow here is wrong. The whole list is the subject, so no mark goes after its last item.",
    },
    {
      name: "Comma after such as",
      text: "Fruits such as, apples and pears is wrong. Such as runs straight into the first item, with no comma or colon.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Box each item",
    steps: [
      "Picture a box around each item, from its first word to its last.",
      "If any box holds a comma, the marks between boxes must be semicolons.",
      "Make every mark between boxes the same, and leave the space after the last box empty when a verb follows.",
    ],
  },
  check: {
    passage:
      "The science fair had projects on many topics, ______ robots, and plant growth. The judges spent the most time at a table covered with homemade weather stations.",
    text: STEM,
    choices: [
      "such as: volcanoes,",
      "such as, volcanoes,",
      "such as volcanoes,",
      "such as volcanoes;",
    ],
    right: 2,
    why: "The items are volcanoes, robots and plant growth. None has a comma inside, so commas split them. Such as runs straight into the first item with no mark, so such as volcanoes, is right. A colon or a comma after such as breaks that rule, and a semicolon after volcanoes mixes marks with the comma after robots.",
  },
  quiz: [
    {
      passage:
        "Owls, bats, and ______ hunt mostly at night, using sharp senses to find food in the dark. Many of them sleep through the brightest hours of the day in trees or hollow logs.",
      text: STEM,
      choices: ["raccoons,", "raccoons", "raccoons;", "raccoons:"],
      right: 1,
      why: "Find the items: owls, bats, and raccoons. No item has a comma inside, and the verb hunt comes right after the last item. The whole list is the subject, so raccoons takes no mark. The comma is the Comma before the verb trap. A semicolon mixes marks with the commas before it, and a colon never splits a subject from its verb.",
      subject: "reading",
    },
    {
      passage:
        "The museum's new wing holds a canoe, carved from a single log, from <u>Oregon</u> a quilt, sewn by hand, from a farm in Ohio; and a set of tools from a ship that sank off the coast of Maine.",
      text: "A student must choose a mark to go after the underlined word. What should he check first?",
      choices: [
        "Whether the list has more than three items in it",
        "Whether the sentence is long enough to need a stronger mark",
        "Whether the last item begins with the word and",
        "Whether any item in the list already has a comma inside it",
      ],
      right: 3,
      why: "Start with the items. The canoe and the quilt each have commas inside them, so semicolons must split the items, and a semicolon goes after Oregon. That also matches the semicolon after Ohio. The number of items does not decide it, and neither does how long the sentence is. Every list ends with and before its last item, so that tells you nothing about the marks.",
      subject: "reading",
    },
    {
      passage:
        "The bike race passes through Lyon, France; Turin, Italy, and Geneva, Switzerland. Riders cover more than 200 miles of steep mountain roads in just four days.",
      text: "A student wrote the first sentence above. What is wrong with its punctuation?",
      choices: [
        "A semicolon belongs after Lyon instead of after France.",
        "The semicolon after France should be a comma, to match the rest.",
        "A semicolon belongs after Italy, since the items have commas inside them.",
        "A colon belongs after through, since a list follows it.",
      ],
      right: 2,
      why: "Each item is a city and a country, with a comma inside. So semicolons must split the items, and the comma after Italy is the Mixed marks trap. Changing the semicolon after France to a comma would leave six names split by commas, and no one could tell where items end. A semicolon after Lyon would split a city from its country. A colon after through comes before the sentence is finished.",
      subject: "reading",
    },
    {
      text: "Which sentence should use semicolons between the items in its list?",
      choices: [
        "The club meets in Akron, Ohio, Erie, Pennsylvania, and Buffalo, New York.",
        "The club sells hats, mugs, and posters to raise money for trips.",
        "The club, which started in 2010, meets twice a month in the spring.",
        "The club's members hike, bike, and swim together in the summer.",
      ],
      right: 0,
      why: "Ask whether any item has a comma inside it. In the Akron sentence, each item is a city and a state, so commas cannot show where items end: semicolons belong after Ohio and Pennsylvania. Hats, mugs, and posters are plain items, so commas are right. The sentence about 2010 has no list at all; its commas mark an extra part. Hike, bike, and swim are plain items too.",
      subject: "reading",
    },
    {
      passage:
        "The panel included three speakers: Rana Malik, a pilot who has flown cargo planes across the Arctic; Joel Okafor, an engineer who designs electric ______ Lucia Ferro, a doctor who treats patients in remote mountain towns.",
      text: STEM,
      choices: ["engines, and", "engines and", "engines; and,", "engines; and"],
      right: 3,
      why: "Each item is a name plus a description, with a comma inside. The first two items are split by a semicolon, so a semicolon must come before the last item too, followed by and with no mark after it. A comma there is the Mixed marks trap. No mark at all runs Okafor's description into Ferro's name. A comma after and splits the word and from the item it joins.",
      subject: "reading",
    },
  ],
};

export default lesson;
