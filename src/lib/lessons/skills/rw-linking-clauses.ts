import type { Lesson } from "../types";

const ASK =
  "Which choice completes the text so that it conforms to the conventions of Standard English?";

const lesson: Lesson = {
  id: "rw-linking-clauses",
  tests:
    "Choosing the punctuation that joins a main clause to a dependent clause, the kind that starts with a word such as although, because, when or which.",
  spot: "One part of the sentence starts with although, because, when, while, if or which, and the choices differ in the mark between that part and the rest.",
  idea: [
    "A **main clause** can stand alone. A **dependent clause** starts with a word such as although, because or when, and it cannot stand alone.",
    "When the dependent clause comes first, put a **comma** after it. When it comes last, you usually need no mark at all.",
    "Never put a period or a semicolon between a dependent clause and its main clause. A period leaves a fragment, and a semicolon needs two full sentences.",
  ],
  rules: [
    "Dependent first: add a comma",
    "Dependent last: usually no mark",
    "No period or semicolon between them",
    "Which and who hang on a noun",
  ],
  figure: {
    kind: "sentence",
    parts: [
      { text: "When the last bell rang", role: "dependent" },
      { text: "the hallway filled with students.", role: "main" },
    ],
    joints: [{ after: 0, mark: ",", ok: true }],
  },
  strategy: {
    name: "Find the main clause",
    steps: [
      "Find the main clause: the part that could stand alone.",
      "Find the dependent clause: the part that starts with although, because, when or which.",
      "Dependent first: end it with a comma. Dependent last: usually no mark.",
      "Cross off any choice with a period or semicolon between the two.",
    ],
  },
  examples: [
    {
      title: "Dependent first",
      passage:
        "Because the old stadium's lights were too dim for night ______ the city replaced them with brighter bulbs that also use far less power than the old ones did.",
      problem: ASK,
      choices: ["games;", "games,", "games.", "games, and"],
      right: 1,
      steps: [
        { say: "Main clause: the city replaced them with brighter bulbs. It can stand alone." },
        {
          say: "Dependent clause: Because the old stadium's lights were too dim for night games. It starts with because.",
        },
        { say: "The dependent clause comes **first**, so a comma ends it." },
        {
          say: "A semicolon or period would cut off the because part as a fragment. Adding and leaves no main clause.",
        },
      ],
      answer: "games,",
    },
    {
      title: "Dependent last",
      passage:
        "Farmers in the valley wait to plant their corn until late ______ the soil is still too cold for the seeds to sprout any earlier in the spring.",
      problem: ASK,
      choices: ["May. Because", "May; because", "May because", "May, and because"],
      right: 2,
      steps: [
        { say: "Main clause: Farmers in the valley wait to plant their corn until late May." },
        {
          say: "Dependent clause: because the soil is still too cold. It starts with because.",
        },
        { say: "The dependent clause comes **last**, so no mark is needed." },
        {
          say: "A period or semicolon would cut off the because part as a fragment. Adding and leaves it with no main clause.",
        },
      ],
      answer: "May because",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Semicolon with dependent",
      text: "A semicolon joins two full sentences only. A clause that starts with although, because or when is not a full sentence, so a semicolon cannot go beside it.",
    },
    {
      name: "Cut-off fragment",
      text: "A period that leaves a part such as Although the bus was late standing alone. It looks like a sentence but cannot stand alone.",
    },
    {
      name: "Extra and",
      text: "Because the river rose, and the road closed is wrong. The and turns the main clause into a second piece, so the because part has nothing to attach to.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Circle the clause starter",
    steps: [
      "Circle the word that starts the clause: although, because, when, while, if, since or which.",
      "If that part opens the sentence, the comma goes where it ends and the main clause begins.",
      "If it comes after the main clause, usually leave the mark out.",
    ],
  },
  check: {
    passage:
      "When the first snow of the year fell on the ______ the children ran outside to catch the flakes on their tongues before the morning bell.",
    text: ASK,
    choices: ["playground,", "playground;", "playground.", "playground, and"],
    right: 0,
    why: "The main clause is the children ran outside to catch the flakes. The dependent clause, When the first snow of the year fell on the playground, comes first, so a comma ends it. The semicolon is the Semicolon with dependent trap, since the When part is not a full sentence. The period leaves that part as a Cut-off fragment. Adding and is the Extra and trap: it leaves no main clause.",
  },
  quiz: [
    {
      passage:
        "The town's public library will stay open until 10:00 every night this ______ many students need a quiet, well-lit place to study for their final exams.",
      text: ASK,
      choices: ["week; because", "week. Because", "week, and because", "week because"],
      right: 3,
      why: "The main clause, The town's public library will stay open until 10:00 every night this week, comes first, and the because clause comes last, so no mark is needed. The semicolon is the Semicolon with dependent trap. The period leaves Because many students need a quiet place as a Cut-off fragment. Adding and is the Extra and trap: it hangs the because part on nothing.",
      subject: "reading",
    },
    {
      passage:
        "While the city council debated the plan for a new park ______ hundreds of residents waited outside the meeting hall to hear the final vote.",
      text: "Before you look at the choices, what should you do first?",
      choices: [
        "Find the main clause, the part that could stand alone.",
        "Put a comma wherever you would pause when reading aloud.",
        "Use a semicolon, since the sentence has two long parts.",
        "Start reading at the blank and skip the opening word While.",
      ],
      right: 0,
      why: "Start by finding the main clause: hundreds of residents waited outside the meeting hall. Then you can see that the While part comes first and needs a comma after it. A pause is not a rule, so commas by sound often land in the wrong place. A semicolon needs two full sentences, the Semicolon with dependent trap. Skipping While hides the very word that makes the first part dependent.",
      subject: "reading",
    },
    {
      passage:
        "Because heavy rains had washed out part of the main ______ the school buses took a longer route through the hills for the rest of the week.",
      text: "Ben filled the blank with road, and. Why is his choice wrong?",
      choices: [
        "And should join only two single words, never two clauses.",
        "With and, the because part has no main clause to attach to, so the sentence never finishes its thought.",
        "The comma should come after and, not before it.",
        "A semicolon is needed before and to join the two parts.",
      ],
      right: 1,
      why: "Because heavy rains had washed out part of the main road is a dependent clause, so it needs a main clause. Ben's and turns the buses took a longer route into a second piece joined to the because part, leaving no main clause at all: the Extra and trap. The fix is road with a comma. And can join clauses, so that rule is false. Moving the comma does not fix it, and a semicolon needs two full sentences.",
      subject: "reading",
    },
    {
      passage:
        "The comet was faint and hard to see from the bright streets of the ______ observers out in the dark countryside could spot its long tail without a telescope.",
      text: ASK,
      choices: ["city, however", "city. Although", "city, although", "city; although"],
      right: 2,
      why: "Although and however look alike, but only although starts a dependent clause. With although, the second part depends on the main clause before it, and a comma before a contrast word like although is standard. However cannot join two full sentences after a comma, so that choice is a splice. The period leaves the Although part as a Cut-off fragment. The semicolon is the Semicolon with dependent trap.",
      subject: "reading",
    },
    {
      passage:
        "When engineers first tested the bridge design in a wind tunnel, using a model built at one-fiftieth of its real ______ they found that strong gusts made the deck twist, so they added steel beams to stiffen it.",
      text: ASK,
      choices: ["size,", "size;", "size.", "size, and"],
      right: 0,
      why: "The main clause is they found that strong gusts made the deck twist. Everything before it, from When engineers to its real size, is one long dependent part, even with the comma before using. It comes first, so a comma ends it. The semicolon is the Semicolon with dependent trap, and the period leaves a Cut-off fragment. Adding and is the Extra and trap: it leaves the When part with no main clause.",
      subject: "reading",
    },
  ],
};

export default lesson;
