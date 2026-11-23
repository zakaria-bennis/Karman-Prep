import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-meaning-in-context",
  tests:
    "Choosing what a familiar word means as it is used in one sentence. The wrong choices are usually real meanings of the word, just not this one.",
  spot: "The question asks what a word most nearly means as it is used in the text. The word is usually common, such as hold, check or run, but used in a less common sense.",
  idea: [
    "Common words have **many meanings**. The SAT picks a word whose usual meaning does not fit the sentence.",
    "Cover the choices and put in **your own word** that fits here. Then find the choice that matches it.",
    "The right choice keeps both the meaning and the **tone**. It is not too strong, too casual or too emotional for the text.",
  ],
  rules: ["The first meaning you think of is often the trap", "Swap it back in and reread"],
  figure: {
    kind: "passage",
    text: "The coach asked the team to <u>observe</u> the new warm-up rule before every game, and for the rest of the season no one skipped a single stretch.",
    marks: [
      { find: "observe", tone: "warm", note: "Here: follow, not watch" },
      { find: "no one skipped a single stretch", tone: "green", note: "The clue" },
    ],
  },
  strategy: {
    name: "Swap in your word",
    steps: [
      "Cover the choices. Read the sentence and the one before it.",
      "Replace the word with your own word that fits here.",
      "Try each choice in the sentence, and keep the one that keeps the meaning and the tone.",
    ],
  },
  examples: [
    {
      title: "Not the usual",
      passage:
        "The scientist's theory explained how the metal behaved at room temperature and in great heat. But it did not <u>hold</u> for very cold temperatures: below freezing, her predictions failed every time.",
      problem: "As used in the text, what does the word hold most nearly mean?",
      choices: ["grip", "contain", "remain true", "stop"],
      right: 2,
      steps: [
        {
          say: "Cover the choices and read around the word. Below freezing, the predictions failed every time.",
        },
        { say: "Your own word: the theory did not work, or stay true, in the cold." },
        {
          say: "Try each. Grip and contain are real meanings of hold, but a theory cannot grip or contain the cold, and stop makes no sense. Remain true keeps the meaning.",
        },
      ],
      answer: "remain true",
      checkIn: {
        text: "As used in the text, what does the word press most nearly mean?",
        passage:
          "The coach's plan was simple: the team would <u>press</u> the other side from the first whistle, crowding their players so they never had time to pass.",
        choices: ["iron", "push hard against", "print", "flatten"],
        right: 1,
        why: "The team crowds the other players so they have no time to pass, so press means push hard against them. Iron and flatten are common meanings of press that do not fit a game, the **Dictionary trap**.",
        twin: {
          text: "As used in the text, what does the word carry most nearly mean?",
          passage:
            "The mayor's plan to build a new park did not <u>carry</u> at the town meeting: only twelve of the forty members voted for it.",
          choices: ["lift", "bring along", "win approval", "transport"],
          right: 2,
          why: "Only twelve of forty members voted for the plan, so it did not carry means it did not win approval. Lift and transport are everyday meanings of carry that do not fit a vote, the **Dictionary trap**.",
        },
      },
    },
    {
      title: "Mind the tone",
      passage:
        "The reviewer found the novel's ending a little <u>flat</u>. After three hundred pages of rising tension, the final chapter simply stops, with no surprise and no strong feeling.",
      problem: "As used in the text, what does the word flat most nearly mean?",
      choices: ["smooth and level", "lacking excitement", "out of air", "disastrous"],
      right: 1,
      steps: [
        {
          say: "Cover the choices and read around the word. The ending follows rising tension and simply stops, with no surprise.",
        },
        { say: "Your own word: dull, a little boring." },
        {
          say: "Try each. Smooth and level, and out of air, are real meanings of flat, but not here. Disastrous is far too strong for a little flat. Lacking excitement keeps the meaning and the mild tone.",
        },
      ],
      answer: "lacking excitement",
      tryFrom: 1,
      checkIn: {
        text: "As used in the text, what does the word tame most nearly mean?",
        passage:
          "Critics called the band's new album <u>tame</u>. After two loud, wild records, this one sticks to soft songs that never take a risk.",
        choices: ["obedient", "unadventurous", "friendly", "wild"],
        right: 1,
        why: "The critics compare the album with two wild records and say it never takes a risk, so tame means unadventurous. Obedient is a common meaning of tame for animals, the **Dictionary trap**, and friendly is too warm for a complaint, the **Tone mismatch** trap.",
        twin: {
          text: "As used in the text, what does the word thin most nearly mean?",
          passage:
            "The chef admitted that the soup was a bit <u>thin</u>: it tasted mostly of water, with only a hint of the vegetables.",
          choices: ["slender", "narrow", "watery", "delicate"],
          right: 2,
          why: "The soup tastes mostly of water, so thin means watery. Slender and narrow describe shapes, the **Dictionary trap**, and delicate sounds like praise, the **Tone mismatch** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Dictionary trap",
      text: "The choice is the word's most common meaning, or another real meaning, but not the one used here. If it came to mind before you read the sentence, test it twice.",
    },
    {
      name: "Tone mismatch",
      text: "The idea is right but the feeling is off: too strong, too casual or too emotional, such as disastrous where the text says a little flat.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Read one sentence back",
    steps: [
      "Read the sentence before the word too. The clue is often there.",
      "Say your own word before you look at any choice.",
      "Put your pick back in the sentence. If it changes the meaning or the feeling, it is wrong.",
    ],
  },
  check: {
    passage:
      "The two council members rarely agree on anything. On the hospital plan, however, they found common <u>ground</u>: both wanted the new building finished quickly, and both backed the same site.",
    text: "As used in the text, what does the word ground most nearly mean?",
    choices: ["soil", "a reason to complain", "an area of land", "a point of agreement"],
    right: 3,
    why: "Swap in your own word: both wanted the same thing, so they found common agreement. A point of agreement keeps that meaning. Soil and an area of land are real meanings of ground, the dictionary trap, but the council members did not find dirt. A reason to complain is close to grounds, as in grounds for a complaint, but here they agree rather than argue.",
  },
  quiz: [
    {
      passage:
        "Most visitors found the speaker's lecture <u>dry</u>. She read from her notes in a flat voice for an hour, with no pictures, no stories and no jokes to break up the facts.",
      text: "As used in the text, what does the word dry most nearly mean?",
      choices: ["without water", "unbearable", "dull", "quietly funny"],
      right: 2,
      why: "Swap in your own word: a flat voice and no stories or jokes make the lecture boring. Dull keeps that meaning and the mild tone. Without water is the most common meaning of dry, the dictionary trap. Quietly funny is another real meaning, as in a dry joke, but the text says there were no jokes. Unbearable is a tone mismatch: visitors found the lecture dull, not torture.",
      subject: "reading",
    },
    {
      passage:
        "The museum's new exhibit of early maps opened last week to large crowds. It will <u>run</u> through the end of March, after which the maps return to the library that lent them.",
      text: "A student must say what the word run most nearly means here. What should the student do first?",
      choices: [
        "Cover the choices and put in a word of their own, such as last, in place of run.",
        "Pick the choice closest to move quickly on foot, the main meaning of run.",
        "Read only the word run and skip the sentence around it.",
        "Find the choice that best matches the topic of museums.",
      ],
      right: 0,
      why: "Start by covering the choices and putting in your own word. The exhibit opened last week and ends in March, so run means last or continue. Jumping to move quickly on foot is the dictionary trap: it is the meaning everyone thinks of first, and it is wrong here. Reading only the word skips the clue in the sentence. A choice that matches museums can still mean the wrong thing.",
      subject: "reading",
    },
    {
      passage:
        "When the new manager arrived, she spent her first month asking questions and learning how the team worked. Only then did she <u>address</u> the problems in the shipping department, starting with its slow delivery times.",
      text: "A student said address means give a speech to. Why is that wrong?",
      choices: [
        "It has the wrong tone: give a speech to is far too casual for this text.",
        "It is too weak: here address means fix every problem completely.",
        "It is not wrong: managers often give speeches about problems.",
        "It is a real meaning of address, but here she deals with the problems rather than speaks to them.",
      ],
      right: 3,
      why: "Swap in your own word: after learning how the team worked, she began to deal with the problems, starting with slow deliveries. Give a speech to is a real meaning of address, as in addressing a crowd, but you cannot give a speech to a problem. That is the dictionary trap. The issue is meaning, not tone, so too casual misses it. Address does not mean fix completely. What managers often do is outside the text.",
      subject: "reading",
    },
    {
      text: "Which question asks for the sense a familiar word has in one particular sentence?",
      choices: [
        "Which choice completes the text with the most logical and precise word or phrase?",
        "As used in the text, what does the word bright most nearly mean?",
        "Which choice best describes the function of the underlined sentence in the text as a whole?",
        "Which choice completes the text with the most logical transition?",
      ],
      right: 1,
      why: "A question about what a word most nearly means as it is used in the text asks for one sense of a familiar word, so you swap in your own word and match. A precise word question has a blank to fill, not a word already in the text to define. A function question asks what a whole sentence does in the text. A transition question asks how two ideas link.",
      subject: "reading",
    },
    {
      passage:
        "Mara had walked past the old bakery every morning for years without a second look. But on the day it closed for good, she stopped at the window, and the empty shelves <u>struck</u> her with a sadness she had not expected.",
      text: "As used in the text, what does the word struck most nearly mean?",
      choices: ["hit with force", "occurred to", "filled", "attacked"],
      right: 2,
      why: "Swap in your own word: the empty shelves suddenly gave her a sadness, so struck means filled. Hit with force is the most common meaning of struck, the dictionary trap: the shelves did not touch her. Occurred to is another real meaning, as when an idea strikes you, but a sadness is a feeling, not a thought. Attacked is a tone mismatch, far too violent for a quiet moment at a window.",
      subject: "reading",
    },
  ],
};

export default lesson;
