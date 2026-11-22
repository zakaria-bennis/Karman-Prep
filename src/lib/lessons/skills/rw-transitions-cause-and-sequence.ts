import type { Lesson } from "../types";

const ASK = "Which choice completes the text with the most logical transition?";

const lesson: Lesson = {
  id: "rw-transitions-cause-and-sequence",
  tests:
    "Choosing the transition that shows the next sentence is a result of the one before, or that places it earlier, later or at the same time in a series of events.",
  spot: "A blank at the start of a sentence, a question about the most logical transition, and choices such as Therefore, As a result, Then, Previously and Finally.",
  idea: [
    "A **cause** transition says the first sentence made the second one happen. A **sequence** transition says when the second event happens compared with the first.",
    "To test for cause, say **so** between the two sentences. If so fits, pick a result word such as therefore. If it does not, the link may only be time.",
    "For a sequence, put the events in order. Later calls for then or subsequently, earlier for previously, the same time for meanwhile, and last for finally.",
  ],
  rules: [
    "Result: therefore, thus, as a result, consequently",
    "Later: then, next, subsequently",
    "Earlier: previously, before that",
    "Same time: meanwhile. Last: finally",
  ],
  figure: {
    kind: "road",
    turn: "cause",
    before: "Heavy rain soaked the hillside for three days.",
    after: "the soil loosened and slid onto the road below.",
    word: "As a result,",
  },
  strategy: {
    name: "Say so, then check time",
    steps: [
      "Cover the choices and read both sentences.",
      "Say so between them. If it fits, the link is a result.",
      "If so does not fit, put the two events in time order.",
      "Pick the word that matches, then reread both sentences with it.",
    ],
  },
  examples: [
    {
      title: "A clear result",
      passage:
        "The town's only bridge was closed for repairs all summer. ______ drivers heading into the city had to take a back road that added 20 minutes to the trip.",
      problem: ASK,
      choices: ["Previously,", "For example,", "Consequently,", "However,"],
      right: 2,
      steps: [
        { say: "The first sentence: the only bridge was closed." },
        { say: "The second sentence: drivers had to take a longer road." },
        {
          say: "Say so: the bridge was closed, so drivers took a longer road. It fits, so the link is a **result**.",
        },
        {
          say: "Consequently fits. Previously puts the detour earlier, For example gives a case, and However turns.",
        },
      ],
      answer: "Consequently,",
      checkIn: {
        text: "Which choice completes the text with the most logical transition?",
        passage:
          "Heavy rain fell on the valley for three days straight. ______ the river rose over its banks and flooded the park.",
        choices: ["Previously,", "Consequently,", "For instance,", "Even so,"],
        right: 1,
        why: "The flood happened because of the rain, so the second sentence is a result: Consequently. Previously would place the flood before the rain, the **Timeline flip** trap.",
        twin: {
          text: "Which choice completes the text with the most logical transition?",
          passage:
            "The school's heating system broke on Monday morning. ______ classes moved to the warm gym until it was fixed.",
          choices: ["As a result,", "Before that,", "In contrast,", "For example,"],
          right: 0,
          why: "Classes moved because the heat broke, so the second sentence is a result: As a result. Before that would put the move ahead of the breakdown, the **Timeline flip** trap.",
        },
      },
    },
    {
      title: "Order in time",
      passage:
        "To make paper by hand, workers first soak plant fibers in water until they break down into a soft pulp. ______ they spread the pulp in a thin layer on a screen and leave it to dry.",
      problem: ASK,
      choices: ["Previously,", "Meanwhile,", "Therefore,", "Next,"],
      right: 3,
      steps: [
        { say: "The first sentence: workers soak the fibers into pulp." },
        { say: "The second sentence: they spread the pulp on a screen." },
        {
          say: "Say so: soaking does not make the workers spread the pulp. It is just the next step, so the link is **time**, and the second event comes later.",
        },
        {
          say: "Next fits. Previously puts it earlier, Meanwhile puts it at the same time, and Therefore claims a cause.",
        },
      ],
      answer: "Next,",
      tryFrom: 2,
      checkIn: {
        text: "Which choice completes the text with the most logical transition?",
        passage:
          "To plant a tree, first dig a hole twice as wide as the tree's roots. ______ set the tree in the hole and fill it back in with soil.",
        choices: ["Therefore,", "Meanwhile,", "Previously,", "Then,"],
        right: 3,
        why: "The steps happen in order: dig first, then set the tree in. Then shows the next step. Therefore would make the planting a result of the digging, the **Time is not cause** trap, and Previously flips the order, the **Timeline flip** trap.",
        twin: {
          text: "Which choice completes the text with the most logical transition?",
          passage:
            "To change a bike tire, first let all the air out of the old tube. ______ pry the tire off the wheel with a tire lever.",
          choices: ["Next,", "As a result,", "Earlier,", "Meanwhile,"],
          right: 0,
          why: "Letting the air out comes first and prying the tire off comes after, so Next fits. As a result would make the second step a result of the first, the **Time is not cause** trap, and Earlier flips the order.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Backward cause",
      text: "The second sentence gives the reason for the first, not its result. A result word needs the first sentence to cause the second, in that order.",
    },
    {
      name: "Time is not cause",
      text: "One event came after another, but it did not happen because of it. If so sounds wrong between the sentences, choose a time word, not a result word.",
    },
    {
      name: "Timeline flip",
      text: "A time word that points the wrong way, such as previously for something that happened later. Watch the verbs and dates: had been means earlier.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Picture a small arrow",
    steps: [
      "Picture an arrow from the first event to the second.",
      "Ask whether the first event made the second happen. If yes, choose a result word.",
      "If not, ask whether the second is later, earlier or at the same time, and choose that time word.",
    ],
  },
  check: {
    passage:
      "The team's best player sprained her ankle early in the first half of the final game. ______ she spent the rest of the game on the bench with her ankle wrapped in ice.",
    text: ASK,
    choices: ["Previously,", "As a result,", "For instance,", "Similarly,"],
    right: 1,
    why: "Say so between the sentences: she sprained her ankle, so she sat on the bench. It fits, so the link is a result, and As a result is right. Previously would put the bench time before the injury: the **Timeline flip** trap. For instance would make the bench time an example of the sprain. Similarly needs a second matching case, and there is none.",
  },
  quiz: [
    {
      passage:
        "To plant a young tree, first dig a hole about twice as wide as the tree's roots and just as deep. ______ set the tree in the hole, fill it with soil, and water it well.",
      text: ASK,
      choices: ["Previously,", "Then,", "As a result,", "In contrast,"],
      right: 1,
      why: "The two sentences are steps in order, and setting the tree in the hole comes after digging, so Then fits. The tempting As a result falls into Time is not cause: digging a hole does not make you plant the tree, it only comes first. Previously flips the order, since the planting happens later, not earlier. In contrast would set the two steps against each other.",
      subject: "reading",
    },
    {
      passage:
        "The bakery on Elm Street switched to a cheaper brand of flour last spring. ______ many of its regular customers complained that the bread no longer tasted as good.",
      text: "You have read both sentences. Which test should you try first to choose the transition?",
      choices: [
        "Say so between the sentences to see whether the first caused the second.",
        "Read only the second sentence again, since the blank is in it.",
        "Look for the choice that sounds the most formal.",
        "Pick the word that shows up most often on the test, such as However.",
      ],
      right: 0,
      why: "Try so first: the bakery switched flour, so customers complained. It fits, which points to a result word such as As a result. Rereading only the second sentence throws away half the link, and a cause needs both halves. The most formal word may not match the meaning. And how often a word shows up on the test says nothing about this text.",
      subject: "reading",
    },
    {
      passage:
        "The city planted hundreds of shade trees along Main Street last year. ______ the street had been one of the hottest spots in the city every summer, with almost no shade for people walking by.",
      text: "Leo filled the blank with As a result. Why is his choice wrong?",
      choices: [
        "The second sentence adds a similar point, so Likewise fits.",
        "The second sentence gives an example of the trees, so For example fits.",
        "The second sentence happens at the same time, so Meanwhile fits.",
        "The heat came before the trees and helps explain them, so Previously fits.",
      ],
      right: 3,
      why: "The verb had been shows the heat came first, before the trees. The heat is the reason for planting, not a result of it, so As a result is the **Backward cause** trap. Previously fits, since it points to an earlier time. Likewise needs a similar second point. For example needs a case of the trees. Meanwhile would put the hot summers at the same time as the planting.",
      subject: "reading",
    },
    {
      passage:
        "Maya finished her math homework at 7:00, checking each answer twice before closing her notebook. ______ she started reading the first chapter of the novel assigned for her English class.",
      text: ASK,
      choices: ["Therefore,", "In contrast,", "Afterward,", "Similarly,"],
      right: 2,
      why: "Say so: she finished math, so she started reading. That does not sound right, since math did not cause the reading. The link is time, and the reading came later, so Afterward fits. The tempting Therefore is the **Time is not cause** trap. In contrast would set the two tasks against each other, and Similarly would need a matching case.",
      subject: "reading",
    },
    {
      passage:
        "Before 1869, traveling from the East Coast of the United States to California took months by wagon or by ship. In 1869, workers finished the first railroad line across the country. ______ the same trip could be made in about a week.",
      text: ASK,
      choices: ["Previously,", "Meanwhile,", "Nevertheless,", "Subsequently,"],
      right: 3,
      why: "Put the events in order: months of travel before 1869, the railroad in 1869, then a trip of about a week. The fast trip comes after the railroad, so Subsequently fits. The tempting Previously is the **Timeline flip** trap: the passage opens with the past, but the blank points to the time after the railroad. Meanwhile would make the week-long trip happen while the line was still being built. Nevertheless would signal a surprise.",
      subject: "reading",
    },
  ],
};

export default lesson;
