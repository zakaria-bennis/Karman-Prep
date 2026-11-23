import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-precise-word-choice",
  tests:
    "Choosing the everyday word or phrase that fits the exact meaning the text needs. Several choices fit the topic, but only one fits the logic.",
  spot: "A blank sits inside the text, and the question asks for the most logical and precise word or phrase.",
  idea: [
    "The text always holds a **clue** to the blank: a definition, an example, a cause or a contrast. It may sit a sentence away.",
    "A **contrast clue**, such as although, but or yet, flips the meaning. A **support clue**, such as because or a colon, keeps it going.",
    "**Precise** means the word fits this exact situation at the right strength, not just the topic.",
  ],
  rules: ["Contrast clue: flip it", "Support clue: match it", "Right topic is not enough"],
  figure: {
    kind: "words",
    sentence:
      "Although the kitten seemed timid at first, it soon proved ______, climbing onto every shelf in the house.",
    words: [
      { word: "adventurous", fit: true, note: "Flips timid, matches climbing" },
      { word: "shy", fit: false, note: "Missed contrast" },
      { word: "furry", fit: false, note: "Topic match" },
      { word: "dangerous", fit: false, note: "Wrong strength" },
    ],
  },
  strategy: {
    name: "Fill it yourself",
    steps: [
      "Cover the choices.",
      "Find the clue: a definition, a contrast, a cause or an example.",
      "Put your own simple word in the blank.",
      "Pick the closest choice, then reread the sentence with it.",
    ],
  },
  examples: [
    {
      title: "Contrast clue",
      passage:
        "The chef's first menu was crowded with dozens of complicated dishes. Her new menu, by contrast, is ______: it lists just six plates, each made with a few fresh ingredients.",
      problem: "Which choice completes the text with the most logical and precise word or phrase?",
      choices: ["elaborate", "simple", "tasty", "empty"],
      right: 1,
      steps: [
        {
          say: "Cover the choices and find the clue. By contrast flips the first menu, and the colon defines the blank: six plates, few ingredients.",
        },
        { say: "Your own word: the opposite of complicated, so plain." },
        {
          say: "Simple matches. Elaborate misses the contrast, tasty fits food but not the logic, and empty is far too strong for six plates.",
        },
      ],
      answer: "simple",
      checkIn: {
        text: "Which choice completes the text with the most logical and precise word or phrase?",
        passage:
          "Most of the town's old houses are crowded close together on narrow streets. The new library, by contrast, is ______: it stands alone in the middle of a wide, open park.",
        choices: ["cramped", "historic", "set apart", "noisy"],
        right: 2,
        why: '"By contrast" signals the opposite of crowded close together, and the colon explains: it stands alone in a park. Set apart fits. Cramped repeats the old houses\' idea, the **Missed contrast** trap, and historic fits the topic of buildings but not the clue.',
        twin: {
          text: "Which choice completes the text with the most logical and precise word or phrase?",
          passage:
            "Last year's science fair projects were mostly simple posters. This year's projects, however, were ______: many students built working robots and detailed models.",
          choices: ["ambitious", "plain", "colorful", "brief"],
          right: 0,
          why: '"However" signals a change from simple posters, and the colon gives the proof: working robots and detailed models. Ambitious fits. Plain describes last year\'s posters, the **Missed contrast** trap.',
        },
      },
    },
    {
      title: "Right strength",
      passage:
        "The new phone's battery lasts 21 hours, compared with 20 hours for last year's model. Reviewers called the change ______, noting that most users would barely notice the difference.",
      problem: "Which choice completes the text with the most logical and precise word or phrase?",
      choices: ["dramatic", "costly", "harmful", "modest"],
      right: 3,
      steps: [
        {
          say: "Cover the choices and find the clue: 21 hours against 20, and most users would barely notice.",
        },
        { say: "Your own word: small." },
        {
          say: "Pick modest. Dramatic is the wrong strength, costly fits phones but not the logic, and harmful says the change hurt.",
        },
      ],
      answer: "modest",
      tryFrom: 1,
      checkIn: {
        text: "Which choice completes the text with the most logical and precise word or phrase?",
        passage:
          "The new bridge cut the drive across the river from 40 minutes to 5 minutes. Commuters called the change ______, saying it gave them back over an hour each day.",
        choices: ["slight", "dramatic", "expensive", "temporary"],
        right: 1,
        why: "Cutting a 40-minute drive to 5 minutes and saving over an hour a day is a big change, so dramatic fits. Slight is the right kind of word but the wrong strength, the **Wrong strength** trap.",
        twin: {
          text: "Which choice completes the text with the most logical and precise word or phrase?",
          passage:
            "The team's new shoes made runners only a little faster, cutting their mile times by about one second. The coach described the improvement as ______, though still worth having.",
          choices: ["huge", "harmful", "remarkable", "small"],
          right: 3,
          why: 'One second off a mile is a little change, and "though still worth having" admits it is minor, so small fits. Huge and remarkable are too strong, the **Wrong strength** trap.',
        },
      },
    },
  ],
  traps: [
    {
      name: "Topic match",
      text: "The word belongs with the subject, such as tasty for a menu, but it does not fit what the sentence says. Ask whether it matches the clue, not the topic.",
    },
    {
      name: "Missed contrast",
      text: "An although, but or by contrast flips the meaning. Skip it and you pick the word for the wrong side of the turn.",
    },
    {
      name: "Wrong strength",
      text: "The idea is right but too strong or too weak, such as destroyed when the text says a few branches fell. Match the size the text gives.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Say your own word",
    steps: [
      "Cover the choices with your hand or cross them out of view.",
      "Read the whole text and circle the clue words: although, but, because, a colon.",
      "Say a plain word for the blank, then find the choice that means the same.",
    ],
  },
  check: {
    passage:
      "The coach expected the rookie to be nervous before her first big race. Instead, she seemed completely ______, chatting and joking with her teammates at the starting line.",
    text: "Which choice completes the text with the most logical and precise word or phrase?",
    choices: ["anxious", "relaxed", "athletic", "careless"],
    right: 1,
    why: "Instead flips the coach's guess, and chatting and joking define the blank, so your word is calm. Relaxed matches. Anxious is the missed contrast: it is what the coach expected, not what happened. Athletic is a topic match for a race. Careless is the wrong strength and the wrong feeling: joking with teammates does not mean she stopped caring.",
  },
  quiz: [
    {
      passage:
        "A city expected about 2,000 people at its first winter festival. Nearly 9,000 came, and food stands ran out of supplies by noon. Organizers admitted that they had ______ how popular the event would be.",
      text: "Which choice completes the text with the most logical and precise word or phrase?",
      choices: ["exaggerated", "underestimated", "advertised", "ignored"],
      right: 1,
      why: "Fill it yourself. They expected 2,000 and got nearly 9,000, so they guessed too low: underestimated. Exaggerated is the opposite, guessing too high. Advertised is a topic match, since festivals are advertised, but the sentence is about a wrong guess. Ignored is the wrong strength: the organizers did plan, just for far too few people.",
      subject: "reading",
    },
    {
      passage:
        "Although the documentary covers a serious subject, its tone is surprisingly ______, with playful music, bright colors and jokes from a narrator who keeps viewers smiling.",
      text: "What should you do first to fill the blank?",
      choices: [
        "Pick the choice that sounds most like a word from a film review.",
        "Look for a word that means serious, since the film covers a serious subject.",
        "Try each choice in the blank and keep the one that sounds best.",
        "Cover the choices and find the clue: although sets up a contrast with serious.",
      ],
      right: 3,
      why: "Start with the clue. Although sets up a contrast: the subject is serious, but the tone is not, and playful music and jokes confirm it. Your own word would be light. Looking for a word that means serious is the missed contrast trap. A film review word is a topic match. Trying each choice by sound skips the prediction, so a smooth wrong word can pull you in.",
      subject: "reading",
    },
    {
      passage:
        "The storm brought strong winds to the coast, but the damage was ______: a few branches fell and one fence blew over, and no buildings were harmed.",
      text: "A student filled the blank with severe. Why is that choice wrong?",
      choices: [
        "It ignores the contrast: but, and the few branches after the colon, call for a word like minor.",
        "It is a topic match: severe has nothing to do with storms.",
        "It is too mild: strong winds call for an even stronger word.",
        "It is not wrong: strong winds usually cause severe damage.",
      ],
      right: 0,
      why: "But turns away from strong winds, and the colon defines the blank: a few branches, one fence, no buildings. Your word is minor, so severe misses the contrast and is far too strong. It is not a topic match problem, because severe does fit storms; that is why it tempts. Calling severe too mild gets the strength backward. What usually happens in storms is an outside fact the text overrules.",
      subject: "reading",
    },
    {
      text: "In which text does the clue call for a word that is the opposite of the clue?",
      choices: [
        "The path was steep and rocky, so the climb was ______.",
        "Because the path was steep and rocky, the climb was ______.",
        "The path looked steep and rocky, yet the climb was ______.",
        "The path was steep and rocky: every step was ______.",
      ],
      right: 2,
      why: "Yet is a contrast clue: the path looked hard, but the climb turned out easy, so the blank flips the clue. So and because are cause clues: a steep, rocky path makes the climb hard, which keeps the meaning. The colon is a support clue, since what follows explains the path, so its blank matches too. Name the clue type first, and you know whether to match or flip.",
      subject: "reading",
    },
    {
      passage:
        "When the sculptor began restoring the old bronze statue, she expected to rebuild much of its surface. Close study proved otherwise: under a thin layer of grime, nearly all of the original metal was sound. Her work was therefore ______, limited to a careful cleaning and a fresh coat of wax.",
      text: "Which choice completes the text with the most logical and precise word or phrase?",
      choices: ["sweeping", "minimal", "artistic", "pointless"],
      right: 1,
      why: "Find the clue. She expected to rebuild much of the surface, but close study proved otherwise, and limited to defines the blank: just cleaning and wax. Your word is small, so minimal matches. Sweeping is the missed contrast trap: it fits what she expected, not what happened. Artistic is a topic match for a sculptor. Pointless is the wrong strength, since a small job still kept the statue in good shape.",
      subject: "reading",
    },
  ],
};

export default lesson;
