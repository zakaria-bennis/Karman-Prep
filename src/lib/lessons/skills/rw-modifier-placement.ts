import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-modifier-placement",
  tests:
    "Putting a describing phrase right next to the person or thing it describes, most often by naming that person or thing right after an opening phrase and its comma.",
  spot: "The sentence opens with a describing phrase and a comma, such as <i>Built in 1888,</i> or <i>Hoping to win,</i> and the choices finish the sentence in different ways.",
  idea: [
    "A **modifier** is a describing phrase. When a sentence opens with one, it describes whatever comes **right after the comma**.",
    "So the noun after the comma must be the one the phrase is about. If the wrong noun lands there, the sentence says something silly: <i>Walking to school, the rain soaked Maya.</i>",
    "Watch for **possessives**. In <i>Trained in Paris, the chef's dishes ...</i>, the noun after the comma is dishes, and the dishes were not trained.",
  ],
  rules: [
    "Opening phrase, comma, then the noun it describes",
    "The chef's dishes is not the chef",
    "Naming the doer later is still wrong",
  ],
  figure: {
    kind: "sentence",
    parts: [
      { text: "Carved from a single block of oak", role: "modifier" },
      { text: "the canoe", role: "noun" },
      { text: "took three months to finish.", role: "other" },
    ],
    joints: [{ after: 0, mark: ",", ok: true }],
    link: { from: 0, to: 1, ok: true, label: "what was carved? the canoe" },
  },
  strategy: {
    name: "Doer after the comma",
    steps: [
      "Read the opening phrase and ask who or what it describes.",
      "That person or thing must come right after the comma.",
      "Cross out choices that put another noun first, even a possessive like the chef's.",
      "Read the whole sentence back to check that it makes sense.",
    ],
  },
  examples: [
    {
      title: "Who trained?",
      passage:
        "The race through the desert covers 150 miles in six days, and few people who start it reach the end. Having trained for months in the hot hills near her home, ______",
      problem:
        "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: [
        "the desert heat did not slow Amira down.",
        "Amira's pace stayed steady through all six days.",
        "Amira kept a steady pace through all six days.",
        "a steady pace was kept by Amira through all six days.",
      ],
      right: 2,
      steps: [
        { say: "Read the opening phrase: having trained for months. Ask who trained." },
        { say: "Amira did the training, so Amira must come **right after the comma**." },
        {
          say: "Cross out the heat and the steady pace, which did no training. Cross out Amira's pace too: the possessive puts pace first, not Amira.",
        },
        { say: "Only the choice that starts with Amira kept puts Amira right after the comma." },
      ],
      answer: "Amira kept a steady pace through all six days.",
    },
    {
      title: "What was built?",
      passage:
        "The town's clock tower is the tallest building on Main Street, and its bell can be heard for miles. Built in 1888 by a team of local stonemasons, ______",
      problem:
        "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: [
        "the stonemasons used granite from a nearby quarry.",
        "the tower's bell still rings every hour.",
        "two earthquakes and a fire have not damaged the tower.",
        "the tower has survived two earthquakes and a fire.",
      ],
      right: 3,
      steps: [
        { say: "Read the opening phrase: built in 1888 by stonemasons. Ask what was built." },
        { say: "The tower was built, so the tower must come right after the comma." },
        {
          say: "Cross out the stonemasons and the earthquakes, which were not built. Cross out the tower's bell: the possessive puts bell first.",
        },
        {
          say: "Only the choice that starts with the tower has survived puts the tower right after the comma.",
        },
      ],
      answer: "the tower has survived two earthquakes and a fire.",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Wrong noun first",
      text: "The noun right after the comma is not the one the phrase describes, often because it is a nearby noun from the phrase itself.",
    },
    {
      name: "Possessive dangler",
      text: "Amira's pace puts pace after the comma, not Amira. A possessive is a describing word, so the noun it owns is the one the phrase now describes.",
    },
    {
      name: "Passive dodge",
      text: "A pace was kept by Amira names the right person, but too late. The doer has to come first, right after the comma.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Ask who is doing it",
    steps: [
      "Read the opening phrase and ask: who or what is doing this, or having this done?",
      "Say the answer out loud before you look at the choices.",
      "Check the first noun of each choice, and keep only the one that matches your answer.",
    ],
  },
  check: {
    passage:
      "Leo and his aunt drove to the coast to watch gray whales swim south for the winter. Peering through binoculars from the top of a cliff, ______",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: [
      "the whales were easy for Leo to spot.",
      "Leo spotted three whales before noon.",
      "Leo's eyes picked out three whales before noon.",
      "three whales were spotted by Leo before noon.",
    ],
    right: 1,
    why: "Leo is the one peering through binoculars, so Leo must come right after the comma, as in Leo spotted three whales. The whales were easy is the Wrong noun first trap, since the whales were not peering. Leo's eyes is the Possessive dangler: it puts eyes first. Three whales were spotted by Leo is the Passive dodge, naming Leo too late.",
  },
  quiz: [
    {
      passage:
        "Ana's grandmother lives in a small mountain village, far from any post office, and she rarely sends mail. Wrapped in old newspaper and tied with string, ______",
      text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: [
        "the package arrived at Ana's door three weeks late.",
        "Ana opened the package with shaking hands.",
        "Ana's hands shook as she opened the package.",
        "three weeks passed before the package arrived.",
      ],
      right: 0,
      why: "Ask what was wrapped and tied: the package. So the package must come right after the comma, as in the package arrived at Ana's door. Ana opened the package is the Wrong noun first trap, since Ana was not wrapped in newspaper. Ana's hands is the Possessive dangler, which puts hands first. Three weeks passed puts weeks first, and weeks cannot be tied with string.",
      subject: "reading",
    },
    {
      passage:
        "The new science center opened downtown last month with hands-on exhibits about weather, space, and the human body. Hoping to see the planetarium show, ______",
      text: "The choices finish the sentence in four different ways. What should you do first?",
      choices: [
        "Pick the shortest choice, since short sentences are clearest.",
        "Pick the choice that names the planetarium right after the comma.",
        "Pick any choice that names the person somewhere in the sentence.",
        "Ask who is hoping, then find the choice that names them first.",
      ],
      right: 3,
      why: "Start with the opening phrase: someone is hoping to see the show, and only a person can hope. Then find the choice that names that person right after the comma. Picking the planetarium is the Wrong noun first trap, since a planetarium cannot hope. Naming the person anywhere is the Passive dodge, because the doer must come first. Length says nothing about where the modifier points.",
      subject: "reading",
    },
    {
      passage:
        "Dr. Reyes has spent twenty years studying the small lizards that live in the deserts of the Southwest. Known among scientists for her careful field notes, ______",
      text: "A student finished the sentence with Dr. Reyes's research has changed how scientists study lizards. Why is that choice wrong?",
      choices: [
        "It needs a comma after the word research.",
        "The noun after the comma is research, but the phrase describes Dr. Reyes.",
        "Known should be changed to knowing, so the phrase can describe the research.",
        "Dr. Reyes's should be written as Dr. Reyes' instead.",
      ],
      right: 1,
      why: "Ask who is known for careful field notes: Dr. Reyes. In the student's choice, the possessive Dr. Reyes's puts research right after the comma, so the phrase now describes the research. That is the Possessive dangler. A comma after research would split the subject from its verb. Changing known to knowing makes no sense. The spelling of the possessive is not the problem; either way, research is still the noun.",
      subject: "reading",
    },
    {
      text: "Which sentence places its describing phrase correctly?",
      choices: [
        "Barking at the mail carrier, the neighbors were woken by the dog.",
        "Barking at the mail carrier, the dog's noise woke the neighbors.",
        "Barking at the mail carrier, the dog woke the neighbors.",
        "Barking at the mail carrier, the neighbors heard the dog.",
      ],
      right: 2,
      why: "Ask who is barking: the dog. Only the dog woke the neighbors puts the dog right after the comma. The dog's noise is the tempting one, but it is the Possessive dangler: noise comes first, and noise does not bark. The neighbors heard the dog is the Wrong noun first trap. The neighbors were woken by the dog is the Passive dodge, which names the dog too late.",
      subject: "reading",
    },
    {
      passage:
        "Spiders catch their food in many different ways, and some never build a web at all. Unlike most spiders, which spin webs and wait for insects to fly into them, ______",
      text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: [
        "the jumping spider's hunting method is to leap onto prey from several body lengths away.",
        "insects are caught by the jumping spider in a single leap from several body lengths away.",
        "leaping onto prey from several body lengths away is how the jumping spider hunts.",
        "the jumping spider hunts by leaping onto prey from several body lengths away.",
      ],
      right: 3,
      why: "The opening phrase compares something to most spiders, so another spider must come right after the comma: the jumping spider hunts. The tempting jumping spider's hunting method is the Possessive dangler, which compares spiders to a method. Insects are caught by the jumping spider is the Passive dodge, and it compares spiders to insects. Leaping is how puts an action first, the Wrong noun first trap.",
      subject: "reading",
    },
  ],
};

export default lesson;
