import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-main-purpose",
  tests:
    "Saying why the author wrote a short text: the job the whole text does, not one fact in it.",
  spot: "The question asks which choice best states the main purpose of the text.",
  idea: [
    "The **main purpose** is why the author wrote the text. It is the job the whole text does, not a fact from inside it.",
    "Every purpose answer has two parts: a **verb**, such as explain, argue, describe or show, and a **target**, what the whole text is about. Both parts must fit.",
    "The purpose usually points to a **turn**, such as however or yet, or to the last sentence. In a story, the purpose is often to show how a character feels in one moment.",
  ],
  rules: [
    "Purpose = verb + target",
    "Check the turn and the last line",
    "Only informs? Then not criticize or refute",
  ],
  figure: {
    kind: "passage",
    text: "Many gardeners pull up dandelions as soon as they appear. Yet dandelions are among the first flowers to bloom each spring, and early bees depend on them for food. Leaving a few in the lawn can help bees survive until other flowers open.",
    marks: [
      { find: "Many gardeners pull up dandelions", tone: "ink", note: "the usual view" },
      { find: "Yet", tone: "warm", note: "the turn" },
      {
        find: "Leaving a few in the lawn can help bees survive",
        tone: "green",
        note: "the purpose points here",
      },
    ],
  },
  strategy: {
    name: "Verb plus target",
    steps: [
      "Read the whole text and ask why the author wrote it.",
      "Look hard at any turn and at the last sentence.",
      "Predict a verb and a target: to explain why X happens.",
      "Pick the choice that matches both the verb and the target.",
    ],
  },
  examples: [
    {
      title: "Correcting a belief",
      passage:
        "Many people believe that bats are blind. In fact, most bats can see quite well, and some can even see colors. Bats use echolocation, sending out calls and listening for the echoes, mainly when they hunt in total darkness, where eyes are of little use.",
      problem: "Which choice best states the main purpose of the text?",
      choices: [
        "To argue that echolocation works better than eyesight in every setting",
        "To correct a common belief about bats' eyesight and explain when bats rely on sound instead",
        "To describe how bats produce the calls they use to hunt",
        "To criticize scientists who once claimed that bats are blind",
      ],
      right: 1,
      steps: [
        { say: "Read the whole text. It opens with a belief, then turns at In fact." },
        {
          say: "The turn says the belief is wrong: bats see well and use sound mostly in the dark.",
        },
        { say: "Predict a verb and a target: to **correct** a belief about bats' eyes." },
        {
          say: "Match both parts. Describing how bats make calls blows up one detail, and argue and criticize are too strong.",
        },
      ],
      answer:
        "To correct a common belief about bats' eyesight and explain when bats rely on sound instead",
    },
    {
      title: "A story moment",
      passage:
        "Marisol had practiced the piano piece for months. When she sat down at the recital, the keys looked strange, as if they belonged to someone else. Then her hands began to move on their own, and the first notes rang out clear and sure. She let out a breath she had not known she was holding.",
      problem: "Which choice best states the main purpose of the text?",
      choices: [
        "To explain why months of practice always lead to success",
        "To describe the piano Marisol plays at the recital",
        "To show a character's nerves giving way to calm once she begins to play",
        "To criticize recitals for putting young players under stress",
      ],
      right: 2,
      steps: [
        { say: "Read the whole story. Marisol starts out nervous and ends relieved." },
        { say: "Find the turn: Then her hands began to move. Her feeling changes there." },
        { say: "Predict: to **show** her fear turning to calm as she plays." },
        {
          say: "Match. Explaining that practice always works is a lesson the story never states, the piano is a detail, and criticize is too strong.",
        },
      ],
      answer: "To show a character's nerves giving way to calm once she begins to play",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Detail as purpose",
      text: "One example or fact gets blown up into the author's whole aim. Ask whether the choice covers the whole text or just one sentence.",
    },
    {
      name: "Too strong",
      text: "Verbs such as criticize, refute or attack need an author who takes a side. If the text only informs, those verbs are wrong.",
    },
    {
      name: "Right verb, wrong target",
      text: "The verb fits, but it points at something the text only mentions or never covers. Check the target as closely as the verb.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Finish the sentence first",
    steps: [
      "Before you look at the choices, finish this line: The author wrote this to ______.",
      "Pick one verb: explain, argue, describe, compare or show.",
      "Cross off every choice with the wrong verb, then check the target of the rest.",
    ],
  },
  check: {
    passage:
      "Most people think of honey as a simple sweetener. But honey also keeps for a remarkably long time. Because it holds very little water and is slightly acidic, bacteria cannot grow in it, so a sealed jar can stay safe to eat for years.",
    text: "Which choice best states the main purpose of the text?",
    choices: [
      "To explain why honey can stay safe to eat for a very long time",
      "To argue that honey is healthier than sugar",
      "To describe how bees make honey",
      "To point out that honey holds very little water",
    ],
    right: 0,
    why: "The text turns at But and then gives the reasons honey lasts, so its job is to explain why honey stays safe for so long. Holding little water is one detail used as a reason. The text never compares honey with sugar, and it never says how bees make honey.",
  },
  quiz: [
    {
      passage:
        "For weeks, Dev had dreaded the swim test. Standing at the edge of the pool, he counted the tiles and tried not to look at the deep end. When the whistle blew, he jumped. The water was colder than he expected, but his arms found their rhythm, and by the far wall he was grinning.",
      text: "Which choice best states the main purpose of the text?",
      choices: [
        "To explain how to pass a swim test",
        "To describe the tiles and water of a public pool",
        "To argue that swim tests should not be required",
        "To show a character's fear giving way to joy once he starts swimming",
      ],
      right: 3,
      why: "Verb plus target: Dev dreads the test, jumps, and ends up grinning, so the text shows his fear turning to joy. The tiles and cold water are a Detail as purpose. The text gives no steps for passing a test, so explaining how is the wrong verb and target. Arguing against swim tests is the **Too strong** trap: the story never takes a side.",
      subject: "reading",
    },
    {
      passage:
        "City planners once believed that wider roads would end traffic jams, so they added lanes to busy highways. However, within a few years, traffic was as bad as before, because the new lanes drew more drivers. Many planners now try other fixes, such as better bus service.",
      text: "A student wants the main purpose of this text. What should the student do first, before reading the choices?",
      choices: [
        "Read on to the turn at However and the last sentence, since the purpose usually points there",
        "Take the purpose from the first sentence, since authors state their aim at the start",
        "Find the most specific fact, such as the added lanes, and build the purpose around it",
        "Look for the choice with the strongest verb, such as attack or refute",
      ],
      right: 0,
      why: "Read the whole text and look hard at the turn. Here the first sentence is an old belief, and However shows it failed, so the purpose points past it. Taking the first sentence as the aim misses the turn. Building on the added lanes is a Detail as purpose. Hunting for attack or refute leads to Too strong, since this text only informs.",
      subject: "reading",
    },
    {
      passage:
        "The town library began lending more than books last year. Residents can now borrow tools, board games, and even telescopes. The librarian says the telescopes are so popular that people wait weeks for one.",
      text: "A student said the main purpose of the text is to explain why telescopes are popular with residents. Why is this answer wrong?",
      choices: [
        "Its verb is too strong for a text that only informs.",
        "It names a topic the text never mentions.",
        "It turns one detail into the purpose of the whole text.",
        "Its target is right, and only the verb should be describe.",
      ],
      right: 2,
      why: "The whole text is about the library lending more than books; the telescopes are one item in that list. Making them the aim is a Detail as purpose, and the text never even says why people like them. Explain is not Too strong. Telescopes are mentioned, so the topic is in the text. Changing only the verb still leaves the wrong target.",
      subject: "reading",
    },
    {
      passage:
        "A catfish can taste with its whole body. Its skin is covered with taste buds, from its whiskers to its tail. In muddy rivers, where it is hard to see, this lets a catfish find food long before it could spot it.",
      text: "Which choice best states the main purpose of the text as a whole?",
      choices: [
        "To support the opening claim with a detail about where the taste buds are",
        "To explain how a catfish uses taste buds across its body to find food it cannot see",
        "To list the parts of a catfish's body, from its whiskers to its tail",
        "To argue that catfish have better senses than any other fish",
      ],
      right: 1,
      why: "The question asks about the whole text, so predict a verb and a target for all three sentences: to explain how tasting with its body helps a catfish find food. Supporting the opening claim is the job of the second sentence alone, a Detail as purpose. Listing body parts misreads that same sentence. Better than any other fish is the **Too strong** trap and never compared.",
      subject: "reading",
    },
    {
      passage:
        "Historians often describe the printing press as the invention that spread reading across Europe. Printing certainly made books cheaper. Yet in many towns, reading rates rose slowly for two centuries afterward and climbed fastest only after free schools opened. Cheap books mattered, but only once people had been taught to read them.",
      text: "Which choice best states the main purpose of the text?",
      choices: [
        "To argue that the printing press had no effect on reading in Europe",
        "To describe how the printing press made books cheaper",
        "To suggest that a common account of the printing press leaves out the role of schooling",
        "To explain how towns paid for their first free schools",
      ],
      right: 2,
      why: "The text grants the usual view, turns at Yet, and ends by saying cheap books mattered only once people could read. Its purpose is to add schooling to the common account. No effect at all is the **Too strong** trap, since the text says printing mattered. Cheaper books is a Detail as purpose. Paying for schools is the **Right verb, wrong target** trap: the text never says how schools were paid for.",
      subject: "reading",
    },
  ],
};

export default lesson;
