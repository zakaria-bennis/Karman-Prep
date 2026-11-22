import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-function-of-a-sentence",
  tests: "Saying what one underlined sentence does in a short text: its job, not its content.",
  spot: "One sentence is underlined, and the question asks which choice best describes its function in the text as a whole.",
  idea: [
    "The question asks what the sentence **does**, not what it says. A choice that only repeats the sentence's words is usually wrong.",
    "Most sentences do one of a few jobs: introduce a claim, give an **example**, **contrast** with an idea, explain a cause, admit a point, or conclude.",
    "A sentence's job depends on its **neighbors**. Read the sentence just before and just after it, then name the job and its target: an example of what, a contrast with what.",
  ],
  rules: [
    "Does, not says",
    "Read one sentence before and after",
    "Job + target: an example of what?",
  ],
  figure: {
    kind: "passage",
    text: "Some birds use tools. <u>A New Caledonian crow, for instance, bends twigs into hooks to pull insects out of logs.</u> Green herons go further: they drop bits of food on the water as bait to lure fish.",
    marks: [
      { find: "Some birds use tools.", tone: "ink", note: "the claim" },
      { find: "for instance", tone: "warm", note: "example signal" },
      { find: "bends twigs into hooks", tone: "green", note: "job: an example of the claim" },
    ],
  },
  strategy: {
    name: "Job, not content",
    steps: [
      "Read the whole text.",
      "Reread the sentences just before and after the underlined one.",
      "Name its job in a few words: introduces, gives an example, contrasts, explains, admits or concludes.",
      "Pick the choice with that job and the right target.",
    ],
  },
  examples: [
    {
      title: "A drawback",
      passage:
        "Solar panels have become far cheaper over the past decade. <u>They still make power only while the sun is shining, however.</u> To solve this problem, many homes now pair their panels with batteries that store extra energy for the night.",
      problem:
        "Which choice best describes the function of the underlined sentence in the text as a whole?",
      choices: [
        "It states that solar panels make power only in sunlight.",
        "It explains why solar panels have become cheaper.",
        "It presents a drawback of solar panels that the next sentence addresses.",
        "It states the main claim of the text, that solar power is not worth its cost.",
      ],
      right: 2,
      steps: [
        { say: "Read the whole text: panels got cheaper, they have a limit, batteries fix it." },
        {
          say: "Check the neighbors. Before it: good news about cost. After it: To solve this problem.",
        },
        { say: "Name the job: it raises a **drawback** that the next sentence answers." },
        {
          say: "Match. The sunlight choice only repeats the content, cheaper panels is the first sentence's point, and the main-claim choice is about the whole text and too strong.",
        },
      ],
      answer: "It presents a drawback of solar panels that the next sentence addresses.",
      checkIn: {
        text: "Which choice best describes the function of the underlined sentence in the text as a whole?",
        passage:
          "Electric scooters let city riders skip traffic and travel cheaply. <u>Many riders, however, leave them blocking sidewalks when they finish a trip.</u> To fix this, some cities now require scooters to be parked in marked spots.",
        choices: [
          "It explains why electric scooters are cheap to ride.",
          "It states that riders leave scooters on sidewalks.",
          "It states the main claim of the text, that cities should ban electric scooters.",
          "It presents a problem with electric scooters that the next sentence addresses.",
        ],
        right: 3,
        why: "The underlined sentence turns from the scooters' benefits to a problem, and the next sentence gives the cities' fix. The choice that only repeats what the sentence says gives its content, not its job, the **Content, not job** trap.",
        twin: {
          text: "Which choice best describes the function of the underlined sentence in the text as a whole?",
          passage:
            "Paper straws break down much faster than plastic ones. <u>They can turn soggy, however, before a drink is finished.</u> To solve this, some makers now coat their paper straws with a thin layer of plant wax.",
          choices: [
            "It presents a drawback of paper straws that the next sentence addresses.",
            "It states that paper straws can turn soggy.",
            "It explains why paper straws break down quickly.",
            "It states the main claim of the text, that plastic straws are better than paper ones.",
          ],
          right: 0,
          why: "The underlined sentence names a weakness of paper straws, and the next sentence tells how makers solve it. Saying only that straws turn soggy gives the content, not the job, the **Content, not job** trap.",
        },
      },
    },
    {
      title: "An exception",
      passage:
        "Grandpa Luis rarely spoke about his years as a sailor. <u>But whenever a storm rolled in, he stood at the window and named each kind of cloud as it passed.</u> On those nights, Ana felt she was meeting a man she had never known.",
      problem:
        "Which choice best describes the function of the underlined sentence in the text as a whole?",
      choices: [
        "It describes the kinds of clouds Grandpa Luis named.",
        "It shows an exception to Grandpa Luis's usual silence about his past.",
        "It explains why Grandpa Luis stopped working as a sailor.",
        "It states the main idea that Ana and her grandfather are not close.",
      ],
      right: 1,
      steps: [
        {
          say: "Read the whole text: a quiet grandfather, one habit during storms, Ana's feeling.",
        },
        { say: "Check the neighbors. Before it: he rarely spoke of sailing. It starts with But." },
        { say: "Name the job: it **contrasts** with his silence, a moment when his past shows." },
        {
          say: "Match. Naming clouds is the content, the text never says why he stopped sailing, and the last choice is a whole-text answer that misreads it.",
        },
      ],
      answer: "It shows an exception to Grandpa Luis's usual silence about his past.",
      tryFrom: 2,
      checkIn: {
        text: "Which choice best describes the function of the underlined sentence in the text as a whole?",
        passage:
          "Aunt Mira was the quietest person at every family dinner. <u>But when someone mentioned birds, she would suddenly describe the songs of a dozen kinds of sparrow.</u> Those were the only times the children heard her laugh.",
        choices: [
          "It shows an exception to Aunt Mira's usual quietness.",
          "It describes the songs of different kinds of sparrows.",
          "It explains why Aunt Mira was quiet at dinners.",
          "It states the main idea that the children were afraid of Aunt Mira.",
        ],
        right: 0,
        why: 'The first sentence says Aunt Mira was always quiet, and "But" brings in the one time she was not: when birds came up. The sparrow choice describes the sentence\'s content, not its job, the **Content, not job** trap.',
        twin: {
          text: "Which choice best describes the function of the underlined sentence in the text as a whole?",
          passage:
            "Coach Reyes almost never raised his voice at practice. <u>But when a player made fun of a teammate, he stopped the drill and spoke so loudly that the whole field went still.</u> The players learned to treat each other with respect.",
          choices: [
            "It describes how loudly Coach Reyes could speak.",
            "It explains why Coach Reyes became a coach.",
            "It shows an exception to Coach Reyes's usual calm manner.",
            "It states the main idea that the players disliked their coach.",
          ],
          right: 2,
          why: 'The first sentence says the coach almost never raised his voice, and "But" brings in the one time he did. Describing how loudly he spoke gives the content, not the job, the **Content, not job** trap.',
        },
      },
    },
  ],
  traps: [
    {
      name: "Content, not job",
      text: "The choice repeats what the sentence says. It sounds true because it is, but it never names what the sentence does.",
    },
    {
      name: "Wrong target",
      text: "The job is right, such as gives an example, but it points at the wrong idea. Ask: an example of what?",
    },
    {
      name: "Whole-text answer",
      text: "The choice gives the purpose of the whole passage instead of this one sentence's job.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Listen for signal words",
    steps: [
      "For instance or for example points to an example of the sentence before.",
      "But, yet or however points to a contrast with what came before.",
      "So or as a result points to a result. Then check the target: an example of what, a contrast with what.",
    ],
  },
  check: {
    passage:
      "Glass looks solid and still. <u>Old window panes are often thicker at the bottom, which led to a popular belief that glass slowly flows downward like a very thick liquid.</u> The real cause is simpler: early glassmakers could not make panes of even thickness, and builders often set the heavy edge at the bottom.",
    text: "Which choice best describes the function of the underlined sentence in the text as a whole?",
    choices: [
      "It introduces a mistaken idea that the next sentence corrects.",
      "It states that old window panes are thicker at the bottom.",
      "It gives evidence that glass flows like a liquid over time.",
      "It explains how early glassmakers made window panes.",
    ],
    right: 0,
    why: "The next sentence opens with The real cause, so the underlined sentence sets up a belief that gets corrected. Saying the panes are thicker at the bottom only repeats its content. Calling it evidence that glass flows misses that the text rejects that belief. How glassmakers worked is the next sentence's job.",
  },
  quiz: [
    {
      passage:
        "The bakery on Elm Street was always loud: mixers whirring, trays clattering, customers calling out orders. <u>At four in the morning, though, it was silent except for the soft thump of Rosa kneading dough.</u> She liked that hour best, before the city woke.",
      text: "Which choice best describes the function of the underlined sentence in the text as a whole?",
      choices: [
        "It describes how Rosa kneads dough.",
        "It explains why customers call out their orders.",
        "It states the main purpose of the text, which is to praise early mornings.",
        "It sets up a contrast between the bakery's usual noise and one quiet hour.",
      ],
      right: 3,
      why: "Job, not content: the sentence before lists the noise, and though signals a turn to silence, so the sentence sets up a contrast. Saying how Rosa kneads dough is the **Content, not job** trap. Praising early mornings is a Whole-text answer, and it overstates the story. The customers' orders belong to the first sentence, and the text never says why they call out.",
      subject: "reading",
    },
    {
      passage:
        "Honeybees can tell each other where to find food. <u>When a bee returns from a rich patch of flowers, it performs a waggle dance whose direction points the way to the flowers.</u> Other bees follow the dance and fly straight to the food.",
      text: "After reading the whole text, what should a student do next to find the function of the underlined sentence?",
      choices: [
        "Put the underlined sentence into other words and pick the choice that matches",
        "Decide the main purpose of the whole text and pick the choice that states it",
        "Reread the sentences just before and after the underlined one",
        "Pick the choice that uses the most words from the underlined sentence",
      ],
      right: 2,
      why: "A sentence's job depends on its neighbors, so reread the sentences around it. The one before makes a claim, bees share where food is, and the underlined one shows how. Putting the sentence into other words and matching words both lead to Content, not job. Picking the main purpose of the whole text is the Whole-text answer.",
      subject: "reading",
    },
    {
      passage:
        "Some deserts get almost no rain at all. <u>In parts of Chile's Atacama Desert, some weather stations have never recorded a single drop.</u> Even so, tiny microbes manage to live in the soil there.",
      text: "A student said the underlined sentence's function is to state that some weather stations in the Atacama Desert have never recorded rain. Why is this answer wrong?",
      choices: [
        "It repeats what the sentence says instead of naming what the sentence does.",
        "It names a place that the text never mentions.",
        "It is too extreme, since the text says rain is common in the Atacama.",
        "It gives the job of the last sentence instead of this one.",
      ],
      right: 0,
      why: "The student's answer is the **Content, not job** trap: it restates the sentence. The real job is to give a specific example of the claim before it, that some deserts get almost no rain. The Atacama is named in the text. The text never says rain is common there. The student's answer is about the underlined sentence, not the last one.",
      subject: "reading",
    },
    {
      passage:
        "Engineers in the Netherlands have long held back water with dikes and pumps. <u>Lately, some Dutch cities have tried the opposite: building plazas and parks designed to flood safely during storms.</u> These spaces hold the water until drains can carry it away.",
      text: "Which choice best describes the function of the underlined sentence in the text as a whole?",
      choices: [
        "It states the main purpose of the text, which is to explain how Dutch cities manage water.",
        "It introduces a newer approach that differs from the one described before it.",
        "It describes the size and shape of the plazas and parks.",
        "It explains how drains carry storm water away.",
      ],
      right: 1,
      why: "Name the job from the neighbors: the first sentence gives the old way, and the opposite marks a new, different approach. Stating the main purpose of the text is the look-alike Whole-text answer: it fits the passage, not this one sentence. The text never gives the size or shape of the plazas. Carrying the water away is the last sentence's job, a Wrong target.",
      subject: "reading",
    },
    {
      passage:
        "Critics often call the painter Hana Ito a realist, since her city scenes show every brick and window in careful detail. <u>Yet in nearly every painting, the shadows fall in directions that no real sun could cast.</u> Ito, it seems, used realistic detail to win her viewers' trust and then quietly bent it to create a dreamlike mood.",
      text: "Which choice best describes the function of the underlined sentence in the text as a whole?",
      choices: [
        "It describes the directions in which the shadows fall in Ito's paintings.",
        "It gives an example of the careful detail that critics praise in Ito's work.",
        "It introduces a feature of Ito's work that complicates the view stated in the first sentence.",
        "It states the text's main claim, that Ito was not a skilled painter.",
      ],
      right: 2,
      why: "Yet turns against the critics' label, and the last sentence explains the odd shadows, so the sentence complicates the view that Ito is simply a realist. Calling it an example of careful detail is a Wrong target: the shadows are what is not realistic. Where the shadows fall is the **Content, not job** trap. The main-claim choice is a Whole-text answer the text never makes.",
      subject: "reading",
    },
  ],
};

export default lesson;
