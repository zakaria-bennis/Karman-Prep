import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-text-structure",
  tests:
    "Describing how a short passage is built: the job each sentence does, in order. The answer is a list of jobs, such as a claim and then evidence against it.",
  spot: "The question asks which choice best describes the overall structure of the text. Each choice reads like a recipe: it presents this, then does that.",
  idea: [
    "Every sentence has a **job**: background, claim, example, contrast or result. Label each one in two or three words.",
    "Your labels, **in order**, are your prediction. The right choice lists the same jobs in the same order.",
    "Check each choice **part by part**. One wrong part, or a verb like criticizes for a text that only describes, makes the whole choice wrong.",
  ],
  rules: ["Label every sentence", "Same jobs, same order", "Describes is not criticizes"],
  figure: {
    kind: "passage",
    text: "For decades, people believed that goldfish remember things for only a few seconds. In one classroom test, goldfish learned to swim to a red card for food and still did it a month later. Their memories, it seems, last far longer than their reputation suggests.",
    marks: [
      {
        find: "people believed that goldfish remember things for only a few seconds",
        tone: "blue",
        note: "1 Old belief",
      },
      { find: "still did it a month later", tone: "red", note: "2 Evidence against it" },
      {
        find: "last far longer than their reputation suggests",
        tone: "green",
        note: "3 New conclusion",
      },
    ],
  },
  strategy: {
    name: "Label each sentence",
    steps: [
      "Label each sentence's job in two or three words.",
      "Put the labels in order: that is your prediction.",
      "Check each choice part by part, in order.",
      "Cross out any choice with one wrong part or a verb that is too strong.",
    ],
  },
  examples: [
    {
      title: "Problem, then fix",
      passage:
        "Many small towns lose their only grocery store when big chains open in nearby cities. In one farming town, residents responded by forming a cooperative: each family bought a small share, and together they reopened the store. Today the store employs twelve people and earns enough to stay open.",
      problem: "Which choice best describes the overall structure of the text?",
      choices: [
        "It describes a problem, gives one community's response, and reports the result.",
        "It criticizes big chains, then argues that every town should form a cooperative.",
        "It reports a result, then explains the problem that caused it.",
        "It describes a problem, then explains why most solutions to it fail.",
      ],
      right: 0,
      steps: [
        { say: "Label sentence 1: a problem, towns losing their grocery stores." },
        {
          say: "Label sentence 2: one town's response, the cooperative. Label sentence 3: the result, a store that stays open.",
        },
        { say: "Your prediction, in order: problem, response, result." },
        {
          say: "Only the choice with a problem, a response and a result matches every part in order. Criticizes and argues are too strong, the result comes last, not first, and nothing says solutions fail.",
        },
      ],
      answer: "It describes a problem, gives one community's response, and reports the result.",
    },
    {
      title: "View, then pushback",
      passage:
        "Some critics call graphic novels a lesser form than books of plain text. Yet many graphic novels handle hard subjects, such as war and grief, with real depth. And the pictures, far from replacing the writing, often add a layer of meaning that words alone would miss.",
      problem: "Which choice best describes the overall structure of the text?",
      choices: [
        "It describes how graphic novels are made, then compares them with films.",
        "It presents a view, then offers two points that push back against it.",
        "It presents a view, then offers two points that support it.",
        "It proves that graphic novels are better than books of plain text.",
      ],
      right: 1,
      steps: [
        { say: "Label sentence 1: a critics' view, that graphic novels are lesser." },
        {
          say: "Label sentences 2 and 3. Yet signals pushback: they handle hard subjects, and the pictures add meaning.",
        },
        { say: "Your prediction: a view, then two points against it." },
        {
          say: "Pick the view with two points that push back. Support gets the second half backward, proves is too strong, and the text never discusses films or how the books are made.",
        },
      ],
      answer: "It presents a view, then offers two points that push back against it.",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Half right",
      text: "The first part of the choice matches and the second does not. Students stop reading once the start looks good, so check every part.",
    },
    {
      name: "Wrong order",
      text: "The right jobs in the wrong sequence, such as a result first when the text ends with it. Match your labels one at a time, left to right.",
    },
    {
      name: "Strong verb",
      text: "Criticizes, disproves or argues when the text only describes, questions or suggests. Each verb in a choice must match what the sentence really does.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Number the sentences",
    steps: [
      "Count the sentences and write a tiny label for each: 1 claim, 2 example, 3 result.",
      "Watch for turn words such as yet, however and but: a new job almost always starts there.",
      "Read each choice as a list, and tick off one part at a time.",
    ],
  },
  check: {
    passage:
      "Hummingbirds are usually described as fierce loners that chase rivals away from flowers. At one mountain feeder, however, a birdwatcher recorded twenty hummingbirds feeding side by side for hours each day. Such sightings suggest that the birds may share food when it is plentiful.",
    text: "Which choice best describes the overall structure of the text?",
    choices: [
      "It describes a common view, then gives an example that supports it.",
      "It suggests a new idea, then describes the view it replaced.",
      "It describes a common view, reports an observation that does not fit it, and suggests a new idea.",
      "It criticizes birdwatchers, then explains how feeders work.",
    ],
    right: 2,
    why: "Label the sentences: a common view (loners that chase rivals), an observation against it (twenty birds feeding together), and a new idea (they may share when food is plentiful). Only one choice lists all three in order. An example that supports the view is half right. Suggesting the new idea first is the wrong order. Criticizes birdwatchers is a strong verb, and the text never explains feeders.",
  },
  quiz: [
    {
      passage:
        "Many cooks assume that a cast-iron pan must never touch soap. Yet the pan's dark coating is oil baked onto the metal, and a mild dish soap will not strip it away. Some cooks even say that a quick wash with soap keeps old food from building up.",
      text: "Which choice best describes the overall structure of the text?",
      choices: [
        "It presents a belief, then gives two reasons to accept it.",
        "It explains how to coat a pan, then lists the tools needed.",
        "It criticizes cooks for being careless with their pans.",
        "It presents a belief, then offers two points that challenge it.",
      ],
      right: 3,
      why: "Label the sentences: a belief (never use soap), then yet and a fact against it (soap will not strip the coating), then more pushback (soap may even help). Prediction: a belief, then two points against it. Two reasons to accept it is half right: the first part matches, then it flips. Criticizes is a strong verb, since the text corrects a belief calmly. And the text never gives steps or tools.",
      subject: "reading",
    },
    {
      passage:
        "In the 1800s, most city streets were lit by gas lamps that workers lit by hand each evening. Electric lights began to replace those lamps in the 1880s. Within a few decades, the lamplighter's job had nearly vanished from large cities.",
      text: "A question asks for the overall structure of this text. What should you do first?",
      choices: [
        "Find the choice with the most forceful verb, such as argues or proves.",
        "Label each sentence's job, such as old way, change and result.",
        "Read the first sentence closely and match a choice to it.",
        "Pick the choice that mentions gas lamps, since the text is about them.",
      ],
      right: 1,
      why: "First label each sentence's job: the old way (gas lamps lit by hand), the change (electric lights), the result (the job vanished). Those labels in order are your prediction. Matching a choice to the first sentence alone is how students fall for half right choices. Hunting for a forceful verb leads straight to the strong verb trap. A choice that mentions gas lamps can still list the wrong jobs.",
      subject: "reading",
    },
    {
      passage:
        "Scientists once thought that bats find their food only by sound. Later experiments showed that some bats also use smell to locate ripe fruit and flowers. Researchers now describe bat senses as working together rather than alone.",
      text: "A student said the text presents an idea, offers evidence that supports it, and then restates it. Why is that answer wrong?",
      choices: [
        "It is half right: the text presents an idea, but the evidence goes against it.",
        "It has the wrong order: the evidence comes before the idea.",
        "It has a strong verb: presents is too forceful for this text.",
        "It is not wrong: the experiments support the idea about sound.",
      ],
      right: 0,
      why: "Label the jobs: an old idea (food found only by sound), evidence against it (some bats also use smell), and a new view (the senses work together). The student's answer starts right, then says the evidence supports the idea, so it is half right. The text does put the idea first, so wrong order does not fit. Presents is a mild verb. And the experiments show more than sound, so they cut against only by sound.",
      subject: "reading",
    },
    {
      text: "Which question asks you to describe the order of jobs across a whole text?",
      choices: [
        "Which choice best states the main purpose of the text?",
        "Which choice best describes the function of the underlined sentence in the text as a whole?",
        "Which choice best describes the overall structure of the text?",
        "Which choice best states the main idea of the text?",
      ],
      right: 2,
      why: "A structure question asks how the whole text is built, so you label every sentence and match the list in order. A main purpose question asks for one overall goal, such as to explain or to challenge. A function question asks about one underlined sentence, not the whole text. A main idea question asks what the text says, not how it is put together.",
      subject: "reading",
    },
    {
      passage:
        "For years, the town's planners judged the new riverside park by one number: how many people visited it each month. A recent survey of residents, however, asked different questions, such as whether people felt safe there and whether they met neighbors in the park. Many who visited only rarely said the park had changed how they felt about their neighborhood. The planners now argue that visitor counts alone miss much of what a park does for a town.",
      text: "Which choice best describes the overall structure of the text?",
      choices: [
        "It describes a way of judging success, then reports a survey that confirms it was the right measure.",
        "It describes a way of judging success, reports a survey that shows its limits, and presents a revised view.",
        "It presents a revised view, then describes the survey that led the planners to it.",
        "It criticizes the park's design, then proposes a better plan for the riverside.",
      ],
      right: 1,
      why: "Label the jobs: one measure (visitor counts), a survey that asked more and found something the counts missed, and the planners' new view. Prediction: a measure, evidence of its limits, a revised view. Confirms it was the right measure is half right: the survey showed the count's limits, not its strength. Presenting the new view first is the wrong order, since the text ends with it. Criticizes the park's design is a strong verb, and the text never discusses design.",
      subject: "reading",
    },
  ],
};

export default lesson;
