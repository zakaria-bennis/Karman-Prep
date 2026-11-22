import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-transitions-contrast",
  tests:
    "Choosing the transition that shows the next sentence turns against the one before it, or grants a point and then pushes back.",
  spot: "A blank at the start of a sentence, and the question asks for the most logical transition.",
  idea: [
    "A transition tells the reader which way the ideas move. A **contrast** transition says the next idea pushes against the last one.",
    "Read the sentence before the blank and the sentence with the blank. Ask whether the second one **goes the same way** as the first or **turns** against it. Decide before you look at the choices.",
    "Not every turn is the same. **By contrast** compares two different things. **Nevertheless**, **still** and **even so** grant that something is true, then say the next thing happens anyway.",
  ],
  rules: [
    "Same way: moreover, similarly, in addition",
    "Turn: however, by contrast, nevertheless",
    "Result: therefore, as a result, thus",
  ],
  figure: {
    kind: "road",
    turn: "contrast",
    before: "Most frogs lay their eggs in water.",
    after: "the gliding frog lays its eggs on leaves above a pond.",
    word: "However,",
  },
  strategy: {
    name: "Predict the turn",
    steps: [
      "Cover the choices.",
      "Read the sentence before the blank and the sentence with it.",
      "Say how they connect in one word: and, but, or so.",
      "Pick the choice that matches, and cross off any that point the other way.",
    ],
  },
  examples: [
    {
      title: "A clear turn",
      passage:
        "Most desert plants store water in thick stems or leaves. ______ the creosote bush has thin, waxy leaves and survives by sending its roots deep underground.",
      problem: "Which choice completes the text with the most logical transition?",
      choices: ["Similarly,", "In contrast,", "As a result,", "For example,"],
      right: 1,
      steps: [
        { say: "The sentence before the blank: most desert plants store water in thick parts." },
        {
          say: "The sentence with the blank: the creosote bush has thin leaves and uses deep roots instead.",
        },
        { say: "The bush does the opposite of most desert plants, so the idea **turns**." },
        {
          say: "Only In contrast turns. Similarly and For example go the same way, and As a result shows a cause.",
        },
      ],
      answer: "In contrast,",
    },
    {
      title: "Grant, then push",
      passage:
        "The new subway line cost far more than planners expected and opened two years late. ______ more people rode it in its first year than any forecast had predicted.",
      problem: "Which choice completes the text with the most logical transition?",
      choices: ["Therefore,", "Likewise,", "Nevertheless,", "In other words,"],
      right: 2,
      steps: [
        { say: "The first sentence is bad news: over budget and late." },
        { say: "The second sentence is good news: more riders than anyone expected." },
        {
          say: "The good news comes in spite of the bad news, which is still true. That grant-then-push turn is **nevertheless**.",
        },
        {
          say: "Therefore would claim the bad news caused the good news. Likewise and In other words only repeat the idea.",
        },
      ],
      answer: "Nevertheless,",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Half the story",
      text: "The blank links two sentences. If you read only the sentence with the blank, you cannot tell whether the idea turns.",
    },
    {
      name: "The wrong turn",
      text: "By contrast compares two different things. Nevertheless keeps going despite a problem. When two choices both turn, ask which kind of turn the text makes.",
    },
    {
      name: "Look-alike choices",
      text: "When two choices mean the same thing, such as Therefore and Thus, they cannot both be the one right answer, so both are almost always wrong.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Say the link first",
    steps: [
      "Before you read the choices, sum up the link between the two sentences in one word: and, but, or so.",
      "And calls for a same-way word, but calls for a contrast word, and so calls for a result word.",
      "Then find the one choice from that group.",
    ],
  },
  check: {
    passage:
      "Early cameras needed people to sit still for minutes at a time. ______ a modern phone camera takes a sharp picture in a small fraction of a second.",
    text: "Which choice completes the text with the most logical transition?",
    choices: ["By contrast,", "Moreover,", "Consequently,", "For instance,"],
    right: 0,
    why: "The first sentence describes slow old cameras and the second describes fast new ones, set side by side as opposites, so By contrast fits. Moreover adds a similar point, Consequently claims a cause, and For instance would give an example of the first sentence.",
  },
  quiz: [
    {
      passage:
        "A honeybee can sting only once, because its barbed stinger tears away from its body. ______ a bumblebee can sting many times without harming itself.",
      text: "Which choice completes the text with the most logical transition?",
      choices: ["For example,", "In contrast,", "Therefore,", "Additionally,"],
      right: 1,
      why: "Honeybees sting once; bumblebees sting many times. Two different animals are compared as opposites, so In contrast fits. Therefore claims one fact causes the other, and Additionally and For example go the same way.",
      subject: "reading",
    },
    {
      passage:
        "The author's first novel sold poorly and was barely reviewed. ______ she kept writing, and her third book spent months on best-seller lists.",
      text: "Which choice completes the text with the most logical transition?",
      choices: ["Thus,", "Similarly,", "Still,", "Specifically,"],
      right: 2,
      why: "The first sentence is a setback; the second says she kept going anyway. Still grants the setback and pushes past it. Thus would make the poor sales the reason she kept writing, which does not follow.",
      subject: "reading",
    },
    {
      passage:
        "For centuries, the river flooded the valley every spring and left a layer of fresh mud behind. ______ the valley's soil became some of the richest farmland in the region.",
      text: "Which choice completes the text with the most logical transition?",
      choices: ["However,", "Nevertheless,", "By contrast,", "As a result,"],
      right: 3,
      why: "The floods left fresh mud, and the mud made the soil rich: a cause and its result, not a turn. This one checks that you predict before you pick. The other three choices all turn against the first sentence.",
      subject: "reading",
    },
    {
      passage:
        "Sharks have survived in Earth's oceans for more than 400 million years, outlasting the dinosaurs. ______ many shark species are now among the most threatened animals in the sea.",
      text: "Which choice completes the text with the most logical transition?",
      choices: ["By contrast,", "Even so,", "In other words,", "Accordingly,"],
      right: 1,
      why: "The first sentence grants that sharks are great survivors; the second says they are threatened anyway. That grant-then-push turn is Even so. By contrast would compare two different things, but both sentences are about sharks.",
      subject: "reading",
    },
    {
      passage:
        "Because octopuses have soft bodies and no shell, many people assume they have few ways to protect themselves. ______ an octopus can change color in under a second, squirt a cloud of ink, and squeeze through a gap the size of a coin.",
      text: "Which choice completes the text with the most logical transition?",
      choices: ["However,", "Similarly,", "For this reason,", "Second,"],
      right: 0,
      why: "The first sentence states a belief, and the second shows the belief is wrong: the idea turns, so However fits. For this reason would make the belief the cause of the octopus's defenses, and Similarly and Second go the same way.",
      subject: "reading",
    },
  ],
};

export default lesson;
