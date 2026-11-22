import type { Lesson } from "../types";

const STEM =
  "Which choice completes the text so that it conforms to the conventions of Standard English?";

const lesson: Lesson = {
  id: "rw-essential-and-extra-details",
  tests:
    "Putting the right marks around a name, a title or a describing phrase, or leaving them out when the part is needed.",
  spot: "A name or describing phrase sits inside the sentence, and the choices differ only in the commas or parentheses around it.",
  idea: [
    "Some parts of a sentence are **extra**. They add a detail, but the sentence means the same thing without them.",
    "An extra part gets **matching marks on both sides**: two commas or two parentheses. Whatever mark opens it must close it.",
    "Other parts are **essential**. They tell you which one, so they take no commas. A title right before a name, like Doctor or Painter, is a **label** and takes no commas either.",
  ],
  rules: ["Extra: a mark on both sides", "Essential: no marks", "Label before a name: no marks"],
  figure: {
    kind: "sentence",
    parts: [
      { text: "The comet", role: "main" },
      { text: "first seen in 1910", role: "extra" },
      { text: "returned last year.", role: "main" },
    ],
    joints: [
      { after: 0, mark: ",", ok: true },
      { after: 1, mark: ",", ok: true },
    ],
  },
  strategy: {
    name: "Lift it out",
    steps: [
      "Find the name or phrase that might be extra.",
      "Lift it out and read what is left.",
      "Same meaning? It is extra: close it with the mark that opened it.",
      "It says which one, or it is a label before a name? No marks.",
    ],
  },
  examples: [
    {
      title: "A matching pair",
      passage:
        "Rosa Delgado, the town's only ______ fixes everything from tractors to toasters in a small shop behind the post office. Most of her customers have known her for decades.",
      problem: STEM,
      choices: ["mechanic;", "mechanic", "mechanic,", "mechanic:"],
      right: 2,
      steps: [
        {
          say: "Find the part that might be extra: **the town's only mechanic** renames Rosa Delgado.",
        },
        {
          say: "Lift it out: Rosa Delgado fixes everything from tractors to toasters. The sentence still works and means the same, so the part is extra.",
        },
        { say: "A comma opened the extra part, so a comma must close it." },
        {
          say: "With no mark, the extra part never closes. A semicolon or a colon would cut the subject off from its verb, fixes.",
        },
      ],
      answer: "mechanic,",
    },
    {
      title: "Label before name",
      passage:
        "In 2019, ______ mapping the caves under the old mill. Her small team found three hidden chambers that no one had entered in over a century.",
      problem: STEM,
      choices: [
        "geologist, Ines Marsh, began",
        "geologist Ines Marsh began",
        "geologist, Ines Marsh began",
        "geologist Ines Marsh, began",
      ],
      right: 1,
      steps: [
        { say: "Look at what changes: the commas around the name Ines Marsh." },
        {
          say: "Lift out the name: In 2019, geologist began mapping the caves. That is broken, so the name is essential and takes no commas.",
        },
        {
          say: "**Geologist** is a label right before the name, with no a or the in front. A label takes no comma after it.",
        },
        {
          say: "Only geologist Ines Marsh began has no marks at all. The last choice puts a comma between the subject and its verb.",
        },
      ],
      answer: "geologist Ines Marsh began",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Half pair",
      text: "An extra part opened with a parenthesis must close with a parenthesis, not a comma. Always look back to see which mark opened it.",
    },
    {
      name: "Commas around a label",
      text: "Biologist Lena Park studies ants. A title right before a name is part of the name. Biologist, Lena Park, studies ants is wrong.",
    },
    {
      name: "Lost second comma",
      text: "The extra part opens with a comma, then runs straight into the verb with no comma to close it. Read to the end of the extra part and close it there.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Read it without",
    steps: [
      "Put your finger over the part that might be extra.",
      "Read the sentence without it. If it still makes sense and says the same thing, the part is extra.",
      "If the sentence breaks, or you can no longer tell which one, the part is essential.",
    ],
  },
  check: {
    passage:
      "Of all the paintings in the museum, the ______ the biggest crowds. Visitors often wait twenty minutes just to stand in front of it for a moment.",
    text: STEM,
    choices: [
      "one that shows a sleeping fox draws",
      "one, that shows a sleeping fox, draws",
      "one, which shows a sleeping fox, draws",
      "one that shows a sleeping fox, draws",
    ],
    right: 0,
    why: "Lift out the fox part: the one draws the biggest crowds. Now you cannot tell which painting, so the part is essential and takes no commas. The two choices with a pair of commas treat it as extra, and the last one puts a comma between the subject and its verb.",
  },
  quiz: [
    {
      passage:
        "Last spring, ______ opened a small bakery on Elm Street. By summer, the line for his cinnamon bread stretched around the block every Saturday morning.",
      text: STEM,
      choices: ["chef, Theo Grant,", "chef, Theo Grant", "chef Theo Grant,", "chef Theo Grant"],
      right: 3,
      why: "Lift out the name: Last spring, chef opened a small bakery. That breaks, so the name is essential. Chef is a label right before the name, so no marks at all. The pair of commas is the Commas around a label trap. The single comma after chef splits the label from the name, and the comma after Grant cuts the subject off from its verb, opened.",
      subject: "reading",
    },
    {
      passage:
        "The scientist <u>who first described the glass frog</u> spent months in the cloud forests of Ecuador. She recorded its calls at night, when the tiny frogs gather on leaves above streams.",
      text: "A student is not sure whether the underlined part needs commas. What should she do first?",
      choices: [
        "Put commas around it, since it adds a detail about the scientist",
        "Put a comma after it, where a reader would pause before the verb",
        "Lift it out and see whether the sentence still says which scientist",
        "Check whether the part is longer than four or five words",
      ],
      right: 2,
      why: "Start by lifting the part out. Without it, the sentence says only the scientist spent months in Ecuador, and you no longer know which scientist. So the part is essential and needs no commas. Putting commas around it treats every detail as extra. A lone comma before the verb splits the subject from its verb. Length does not decide it: a long part can be essential.",
      subject: "reading",
    },
    {
      passage:
        "The old lighthouse, the tallest building on the island rises sixty feet above the rocks. For a hundred years, ships steered by its beam through the narrow channel at night.",
      text: "A student wrote the first sentence above. What is wrong with its punctuation?",
      choices: [
        "The extra part opens with a comma but never closes, so a comma belongs after island.",
        "The comma after lighthouse should go, since a subject never takes marks.",
        "A semicolon belongs after island to show where the extra part ends.",
        "The part needs no commas at all, because it tells which lighthouse.",
      ],
      right: 0,
      why: "Lift out the tallest building on the island: The old lighthouse rises sixty feet. Same meaning, so the part is extra and needs a comma on both sides. The student made the Lost second comma mistake. Taking out the first comma leaves the extra part with no marks at all. A semicolon would cut the subject off from its verb. The part renames the lighthouse but does not pick it out from others.",
      subject: "reading",
    },
    {
      passage:
        "The town fair opened on Friday. <u>Farmer Eli Brooks</u> showed his prize pumpkin. The pumpkin <u>that won first place</u> weighed 900 pounds. His only daughter <u>a high school senior</u> grew it from seed. The judge <u>who weighed it</u> called it the largest she had seen.",
      text: "Which underlined part should have commas around it?",
      choices: [
        "Farmer Eli Brooks",
        "that won first place",
        "a high school senior",
        "who weighed it",
      ],
      right: 2,
      why: "Lift out each part. His only daughter grew it from seed still works and means the same, so a high school senior is extra and needs commas. Farmer is a label right before a name, so adding commas there is the Commas around a label trap. Without that won first place or who weighed it, you cannot tell which pumpkin or which judge, so both are essential.",
      subject: "reading",
    },
    {
      passage:
        "The town's oldest building (a stone mill built in ______ now houses a small museum of farm tools. Each fall, volunteers grind corn there the old way, using a wheel turned by the creek.",
      text: STEM,
      choices: ["1782,", "1782)", "1782", "1782),"],
      right: 1,
      why: "The extra part opened with a parenthesis, so a parenthesis must close it right after 1782. A comma there is the Half pair trap: it opens with one mark and closes with another. No mark leaves the parenthesis open forever. A parenthesis plus a comma closes the part but then puts a comma between the subject, building, and its verb, houses.",
      subject: "reading",
    },
  ],
};

export default lesson;
