import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-main-idea",
  tests:
    "Finding the central point of a short text: the one idea the whole passage is working to make.",
  spot: "The question asks which choice best states the main idea of the text. The text can be about science or history, or it can come from a story or poem.",
  idea: [
    "Every short text has one **main idea**. The other sentences are **details**: facts and examples that back it up.",
    "A common shape is: many people think one thing, but new work shows another. The main idea comes **after the turn**, at words like but, however, yet or though.",
    "The right choice **covers the whole text**. A choice that names one detail, or makes a bigger claim than the text, is wrong even if it sounds smart.",
    "In a story or poem, the main idea is often what a character **feels or comes to realize** by the end.",
  ],
  rules: [
    "Main idea: what every sentence supports",
    "Look after: but, however, yet, though",
    "Covers the whole text, nothing more",
  ],
  figure: {
    kind: "passage",
    text: "For years, city planners treated street trees as decoration. But a summer study found that blocks with full tree cover were up to 5 degrees cooler than bare blocks nearby. Some cities now plant trees to protect people from heat waves.",
    marks: [
      { find: "treated street trees as decoration", tone: "red", note: "the old view" },
      { find: "up to 5 degrees cooler", tone: "blue", note: "a detail" },
      {
        find: "plant trees to protect people from heat waves",
        tone: "green",
        note: "the main idea",
      },
    ],
  },
  strategy: {
    name: "Say the point first",
    steps: [
      "Read the whole text.",
      "Find the sentence the others support. Check the last sentence and anything after but, however or yet.",
      "Say the main idea in your own words, in about ten words.",
      "Pick the choice that covers the whole text, then check every word of it.",
    ],
  },
  examples: [
    {
      title: "After the turn",
      passage:
        "Many people picture deserts as empty, lifeless places. After a rare heavy rain, though, seeds that have waited in the sand for years sprout within days. Within weeks, the ground can be covered in flowers, and bees and moths arrive to feed on them.",
      problem: "Which choice best states the main idea of the text?",
      choices: [
        "Bees and moths travel long distances to find flowers.",
        "Seeds can survive in desert sand for many years.",
        "Deserts, often seen as lifeless, can burst into life after a rare heavy rain.",
        "Deserts are empty places where few living things can survive.",
      ],
      right: 2,
      steps: [
        { say: "Read the whole text. It opens with a common belief: deserts are lifeless." },
        {
          say: "Look after the turn word **though**. Every sentence after it shows the desert filling with life after rain.",
        },
        { say: "Say it in about ten words: deserts that seem dead come alive after rain." },
        {
          say: "Match it. Only the choice about lifeless deserts bursting into life covers the whole text. The seed choice is one detail, the empty-places choice is the old view, and bees traveling long distances is never said.",
        },
      ],
      answer: "Deserts, often seen as lifeless, can burst into life after a rare heavy rain.",
    },
    {
      title: "A story's point",
      passage:
        "Mara had practiced the piano piece every night for a month. When she sat down on stage, her hands shook and the first notes came out too soft. Then she heard her grandmother humming from the front row, the same tune they sang together in the kitchen, and her playing grew steady and full.",
      problem: "Which choice best states the main idea of the text?",
      choices: [
        "Mara practiced the piano every night for a month.",
        "Hearing her grandmother's familiar humming helps Mara overcome her nerves on stage.",
        "Mara's grandmother is a better musician than Mara is.",
        "Performing in public frightens most young musicians.",
      ],
      right: 1,
      steps: [
        { say: "Read the whole text. Mara starts out nervous and ends up playing well." },
        {
          say: "Find what the story builds to. After **Then**, her grandmother's humming changes how she plays.",
        },
        {
          say: "Say it in about ten words: her grandmother's humming turns Mara's fear into calm.",
        },
        {
          say: "Match it. The choice about the humming helping her overcome her nerves covers the start and the end. Practicing is one detail, most young musicians is too broad, and a better musician is never said.",
        },
      ],
      answer: "Hearing her grandmother's familiar humming helps Mara overcome her nerves on stage.",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Too narrow",
      text: "One true detail dressed up as the whole point. It is in the text, but the other sentences do not support it.",
    },
    {
      name: "Too broad",
      text: "A big claim about all people, all animals or all places that the text never makes. Check every word of the choice.",
    },
    {
      name: "The old view",
      text: "The idea the text sets up only to push back on. If a choice matches the sentence before however, it is usually this trap.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Hunt for the turn",
    steps: [
      "Mark turn words such as but, however, yet and though.",
      "The idea after the turn is usually the one the writer believes.",
      "Check it: does every other sentence support it? If so, that is the main idea.",
      "No turn word? The tip does not help there. Look for the sentence the others explain, often the first or the last.",
    ],
  },
  check: {
    passage:
      "Octopuses are known for their eight arms, but the arms do more than grab. Each arm holds a large share of the animal's nerve cells, so an arm can taste, touch and even reach for food on its own while the brain handles other tasks.",
    text: "Which choice best states the main idea of the text?",
    choices: [
      "Octopuses have eight arms.",
      "Octopuses are the smartest animals in the ocean.",
      "Octopus arms hold so many nerve cells that they can act partly on their own.",
      "An octopus arm can taste food.",
    ],
    right: 2,
    why: "After the turn word but, the text explains that the arms hold many nerve cells and can act on their own. That covers the whole text. Eight arms is the setup, tasting food is one detail (too narrow), and smartest animals is never claimed (too broad).",
  },
  quiz: [
    {
      passage:
        "Theo had always thought his small town was boring. On his last evening before leaving for college, he walked past the bakery, the creek and the old ball field, and at each one a memory stopped him. By the time he reached home, he was surprised to find he did not want to go.",
      text: "Which choice best states the main idea of the text?",
      choices: [
        "Theo plans to study history in college.",
        "Theo walks past a bakery, a creek and a ball field.",
        "Small towns are better places to live than big cities.",
        "Before leaving, Theo realizes he loves the town he thought was boring.",
      ],
      right: 3,
      why: "Say the point first: Theo starts out bored with his town and ends up not wanting to leave. Only the choice about realizing he loves the town covers that change. The walk past the bakery, creek and ball field is too narrow, one detail. Small towns being better than cities is too broad. Studying history is never mentioned.",
      subject: "reading",
    },
    {
      passage:
        "Most people think of bats as pests. However, many bats eat thousands of insects each night, and farmers who protect bat roosts often need less bug spray on their crops.",
      text: "A student wants to find the main idea of this text. What should the student do first?",
      choices: [
        "Read the first sentence and pick the choice that matches it.",
        "Read the whole text and find the idea that comes after However.",
        "Find the most surprising number and build the answer around it.",
        "Pick the choice that repeats the most words from the text.",
      ],
      right: 1,
      why: "The first move is to read the whole text and find the sentence the others support, which here comes after the turn word However: bats help farmers. Matching only the first sentence picks the old view, that bats are pests. Building on the number of insects is too narrow, one detail. Repeating the most words from the text finds a choice that sounds close, not one that covers the whole point.",
      subject: "reading",
    },
    {
      passage:
        "Glass was once thought too fragile for tall buildings. Engineers have since learned to layer and heat-treat it, and today some towers use glass panels for whole walls and even for floors that visitors can walk on.",
      text: "A student says the main idea is that some towers have glass floors visitors can walk on. Why is that answer wrong?",
      choices: [
        "It is one detail, not the point the whole text makes.",
        "It is the old view that the text pushes back on.",
        "It is not stated anywhere in the text.",
        "It makes a bigger claim than the text supports.",
      ],
      right: 0,
      why: "The student fell for the too narrow trap. Glass floors are one example that supports the main idea: glass, once thought too fragile, is now strong enough for tall buildings. It is not the old view, which is that glass is too fragile. It is stated in the text. It is a smaller claim than the main idea, not a bigger one.",
      subject: "reading",
    },
    {
      passage:
        "Honey almost never spoils. Its low water content and natural acids keep bacteria from growing, which is why honey sealed in jars for centuries can still be safe to eat.",
      text: "Four questions could be asked about this text. Which one asks you to find the main idea, the point the text makes?",
      choices: [
        "According to the text, what keeps bacteria from growing in honey?",
        "Which choice best describes the function of the second sentence?",
        "Which choice best states the main purpose of the text?",
        "Which choice best states the central point the text makes about honey?",
      ],
      right: 3,
      why: "The central point the text makes is another way of asking for the main idea, so this strategy fits it. The main purpose question looks alike but asks why the writer wrote the text, such as to explain or to argue. The question about what keeps bacteria away asks for a key detail. The function of a sentence asks what one sentence does.",
      subject: "reading",
    },
    {
      passage:
        "Ancient Roman concrete has lasted for 2,000 years, while much modern concrete cracks within decades. Researchers long assumed the Romans simply used better ingredients. Recent tests suggest something else: small white lumps of lime, once seen as signs of careless mixing, may let the concrete fill its own cracks when water seeps in.",
      text: "Which choice best states the main idea of the text?",
      choices: [
        "Roman builders mixed their concrete carelessly, leaving lumps of lime.",
        "Modern concrete often cracks within a few decades.",
        "Lumps of lime once seen as mistakes may explain why Roman concrete lasts so long.",
        "Ancient builders were more skilled than modern engineers.",
      ],
      right: 2,
      why: "The turn comes at something else: the lime lumps, not better ingredients, may let the concrete repair itself. Only the choice about the lumps explaining why it lasts covers the whole text. Careless mixing is the old view the text pushes back on. Modern concrete cracking is too narrow, one detail. More skilled builders is too broad and never claimed.",
      subject: "reading",
    },
  ],
};

export default lesson;
