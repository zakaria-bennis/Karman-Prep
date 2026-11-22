import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-key-details",
  tests:
    "Finding what the text states directly about one person, cause, result or time, and matching it to a choice in new words.",
  spot: "The question starts with According to the text, or asks Based on the text, what is true about something.",
  idea: [
    "A key detail question has its answer **in one line** of the text. You do not need to guess or add anything.",
    "The right choice is usually a **paraphrase**: the same meaning in different words.",
    "Wrong choices often **reuse the text's words** but change who did what. Match the meaning, not the words.",
  ],
  rules: ["The answer is in the text", "Same meaning, new words", "Check the who and the what"],
  figure: {
    kind: "passage",
    text: "When a small museum added free evening hours on Thursdays, visits by families rose by half. Weekend visits stayed about the same, and the gift shop sold more postcards than ever.",
    marks: [
      { find: "visits by families rose by half", tone: "green", note: "answers the question" },
      { find: "Weekend visits stayed about the same", tone: "blue", note: "a different group" },
    ],
  },
  strategy: {
    name: "Find, then match",
    steps: [
      "Note exactly what the question asks about: a person, a cause, a result or a time.",
      "Find the sentence in the text about that thing.",
      "Say that sentence in your own words.",
      "Pick the choice that means the same. Check its subject and verb against the text.",
    ],
  },
  examples: [
    {
      title: "A reason",
      passage:
        "Sea otters often rest together in groups called rafts. To keep from drifting apart while they sleep, otters sometimes wrap themselves in strands of kelp, a tall seaweed that is rooted to the sea floor.",
      problem: "According to the text, why do sea otters wrap themselves in kelp?",
      choices: [
        "To hide from sharks while they hunt",
        "To keep from floating away while they sleep",
        "To help the kelp stay rooted to the sea floor",
        "To form the groups called rafts",
      ],
      right: 1,
      steps: [
        { say: "Note what the question asks: the **reason** otters wrap themselves in kelp." },
        {
          say: "Find the line: to keep from drifting apart while they sleep, otters wrap themselves in kelp.",
        },
        { say: "Say it plainly: the kelp keeps them from floating away as they sleep." },
        {
          say: "Match the meaning. Floating away while they sleep says the same thing in new words. Rooted to the sea floor describes the kelp, not the otters' reason. Rafts and sharks do not answer why.",
        },
      ],
      answer: "To keep from floating away while they sleep",
      checkIn: {
        text: "According to the text, why do honeybees beat their wings at the hive's entrance?",
        passage:
          "Honeybees sometimes gather at the hive's entrance on hot days and beat their wings together. The moving air flows into the hive and keeps the wax combs inside from getting too warm and melting.",
        choices: [
          "To warn other bees of danger",
          "To dry the honey stored in the combs",
          "To keep the wax combs from melting",
          "To gather at the entrance on hot days",
        ],
        right: 2,
        why: "The text says the moving air keeps the wax combs from getting too warm and melting. Drying honey may be true of bees, but this text never says it, the **Outside fact** trap, and gathering at the entrance is what they do, not why.",
        twin: {
          text: "According to the text, what protects the frogs' cells while they are frozen?",
          passage:
            "In winter, some frogs let parts of their bodies freeze solid. A sugar in their blood protects their cells from damage, so when spring comes, the frogs thaw out and hop away.",
          choices: [
            "A sugar in their blood",
            "The warm mud at the bottom of ponds",
            "Thawing out in the spring",
            "A thick layer of fat under the skin",
          ],
          right: 0,
          why: "The text says a sugar in the frogs' blood protects their cells. Warm mud and fat are never mentioned, the **Outside fact** trap, and thawing in spring is what happens later, not what protects them.",
        },
      },
    },
    {
      title: "A result",
      passage:
        "In 1850, the new railroad reached the river town of Millbrook. Within ten years, the town's population had tripled. The old ferry company, which had carried goods across the river for decades, lost most of its business and closed.",
      problem:
        "According to the text, what happened to the ferry company after the railroad arrived?",
      choices: [
        "It tripled in size within ten years.",
        "It began carrying goods by rail.",
        "It lost most of its customers and shut down.",
        "It moved to a larger town upriver.",
      ],
      right: 2,
      steps: [
        { say: "Note what the question asks: what happened to the **ferry company**." },
        { say: "Find the line: the ferry company lost most of its business and closed." },
        { say: "Say it plainly: the ferry lost its customers and went out of business." },
        {
          say: "Match the meaning. Lost its customers and shut down is the same idea. Tripled is about the town's population (word match). Carrying goods by rail mixes two facts (mash-up), and moving upriver is not in the text.",
        },
      ],
      answer: "It lost most of its customers and shut down.",
      tryFrom: 2,
      checkIn: {
        text: "According to the text, what happened to the one-room schoolhouse after the factory opened?",
        passage:
          "In 1920, a large factory opened in the farming town of Elm Grove. Over the next decade, many young people left their family farms to take factory jobs. The town's one-room schoolhouse, which had taught farm children for fifty years, was replaced by a brick school with eight classrooms.",
        choices: [
          "It was turned into a factory.",
          "It taught farm children for fifty more years.",
          "It moved to a nearby farm.",
          "It was replaced by a larger brick school.",
        ],
        right: 3,
        why: "The text says the schoolhouse was replaced by a brick school with eight classrooms. Fifty years is how long it had already taught, moved into the wrong place, the **Mash-up** trap.",
        twin: {
          text: "According to the text, what happened to Clearwater's main street after the highway opened?",
          passage:
            "When a new highway opened north of Clearwater in 1965, trucks stopped using the town's main street. Within a few years, the gas station and diner on that street had closed, and the town turned the old main street into a park.",
          choices: [
            "It was widened to carry more trucks.",
            "It was turned into a park.",
            "It got a new gas station and diner.",
            "It became part of the new highway.",
          ],
          right: 1,
          why: "The text says the town turned the old main street into a park. The gas station and diner closed rather than opened, so that choice mixes up the details, the **Mash-up** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Word match",
      text: "The choice copies the text's words but changes who did what. Tripled is in the text, but it describes the town, not the ferry.",
    },
    {
      name: "Mash-up",
      text: "The choice joins two true details into a claim the text never makes. Each piece sounds familiar, so it feels right.",
    },
    {
      name: "Outside fact",
      text: "The choice may be true in real life, but the text does not say it. If you cannot point to the line, cross it off.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Point to the line",
    steps: [
      "Before you read the choices, put your finger on the sentence that answers the question.",
      "Check who does what in that sentence.",
      "Cross off any choice that changes the who or the what, even if it uses the text's words.",
    ],
  },
  check: {
    passage:
      "Honeybees that find a good patch of flowers return to the hive and perform a waggle dance. The angle of the dance shows other bees the direction of the flowers, and the length of the waggle shows how far away they are.",
    text: "Based on the text, what does the length of the waggle show?",
    choices: [
      "The direction of the flowers",
      "How many flowers are in the patch",
      "Which bee found the flowers first",
      "How far away the flowers are",
    ],
    right: 3,
    why: "Find the line: the length of the waggle shows how far away the flowers are. The direction is a word match: it is in the text, but the angle shows it, not the length. How many flowers and which bee came first are never said.",
  },
  quiz: [
    {
      passage:
        "After the city painted bike lanes on Elm Avenue, the number of people cycling on the street doubled in a year. Car traffic on Elm Avenue dropped slightly, while traffic on nearby Oak Street stayed the same.",
      text: "According to the text, what happened to car traffic on Elm Avenue after the bike lanes were painted?",
      choices: [
        "It doubled in a year.",
        "It went down a little.",
        "It moved over to Oak Street.",
        "It caused more accidents.",
      ],
      right: 1,
      why: "Find the line about car traffic on Elm Avenue: it dropped slightly. Went down a little says the same thing in new words. Doubled is a word match: it describes the number of cyclists, not cars. Moving to Oak Street is a mash-up of two separate facts; Oak Street traffic stayed the same. Accidents are an outside fact, never mentioned.",
      subject: "reading",
    },
    {
      passage:
        "The ruby-throated hummingbird weighs about as much as a penny. Each fall, many fly nonstop across the Gulf of Mexico, a trip of about 500 miles, after eating enough to nearly double their weight.",
      text: "A question asks: According to the text, what do many of these hummingbirds do before crossing the Gulf of Mexico? What should a student do first?",
      choices: [
        "Note that the question asks about what happens before the trip, then find that part of the text.",
        "Pick the choice that uses the most words from the text.",
        "Think about what birds usually do before long flights.",
        "Combine the facts about the bird's weight and the trip's length into one answer.",
      ],
      right: 0,
      why: "The first move is to note exactly what the question asks about, here what happens before the trip, and then find that line: they eat enough to nearly double their weight. Picking the choice with the most text words leads to the word match trap. Thinking about birds in general invites an outside fact. Combining weight and distance builds a mash-up.",
      subject: "reading",
    },
    {
      passage:
        "A team of students tested two kinds of soil. Bean plants grown in soil mixed with compost grew taller than bean plants grown in plain soil, but the plain-soil plants produced more pods.",
      text: "A question asks which plants produced more pods. A student chose the plants in compost soil. What mistake did the student make?",
      choices: [
        "The student used a fact from outside the text.",
        "The student joined details from two different experiments.",
        "The student swapped the groups: compost plants grew taller, but plain-soil plants made more pods.",
        "The student counted the pods on the wrong day.",
      ],
      right: 2,
      why: "This is the word match trap. Compost is in the text, but the line says the compost plants grew taller, while the plain-soil plants produced more pods. The student swapped who did what. The choice did not come from outside the text, there is only one experiment, and the text never mentions days.",
      subject: "reading",
    },
    {
      passage:
        "After a spring flood covered the valley, farmers found a layer of fine mud on their fields. That summer, their corn grew taller than it had in years.",
      text: "Four questions could be asked about this text. Which one can be answered by finding one line and putting it in your own words?",
      choices: [
        "Which choice best states the main idea of the text?",
        "Which finding, if true, would most directly support the farmers' claim?",
        "Which choice most logically completes the text?",
        "Based on the text, what did the farmers find after the flood?",
      ],
      right: 3,
      why: "What the farmers found after the flood is a key detail question: one line answers it, a layer of fine mud. The main idea question needs the point of the whole text, not one line. The finding question asks what would support a claim, which is evidence from research. Completing the text asks you to infer something the text does not state.",
      subject: "reading",
    },
    {
      passage:
        "The bristlecone pines of the western mountains grow extremely slowly. In the cold, dry air, a tree may add less than a millimeter of width in a year. Parts of an old tree's trunk can die back, while a single strip of living bark keeps the rest of the tree alive.",
      text: "According to the text, how can a bristlecone pine survive when parts of its trunk die?",
      choices: [
        "A thin band of living bark can support the whole tree.",
        "It adds more than a millimeter of width each year.",
        "The cold, dry air keeps the dead wood from rotting.",
        "It grows a new trunk beside the old one.",
      ],
      right: 0,
      why: "Find the line about parts of the trunk dying: a single strip of living bark keeps the rest of the tree alive. A thin band of living bark supporting the whole tree means the same in new words. More than a millimeter is a word match that flips less than into more than. Dry air stopping rot is an outside fact. A new trunk is never mentioned.",
      subject: "reading",
    },
  ],
};

export default lesson;
