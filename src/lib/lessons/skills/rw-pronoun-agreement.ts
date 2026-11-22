import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-pronoun-agreement",
  tests:
    "Choosing the pronoun that matches the noun it stands for, so one thing gets it or its and more than one gets they or their.",
  spot: "The choices are pronouns, such as it and they, or its and their, and the question asks which choice follows the conventions of Standard English.",
  idea: [
    "A pronoun stands in for a noun, so it must **match that noun**. One thing takes it or its. More than one takes they or their.",
    "First find the **antecedent**: the noun the pronoun stands for. It may sit in the sentence before, or hide behind a phrase like <i>of the students</i>.",
    "A group counts as **one thing**. A team, company, city or council takes it and its, even when it is made of many people.",
  ],
  rules: [
    "One thing: it, its",
    "More than one: they, their",
    "A group is one: the team ... its",
    "Its means belonging to it; it's means it is",
  ],
  figure: {
    kind: "sentence",
    parts: [
      { text: "The museum", role: "noun" },
      { text: "near the old train yards", role: "extra" },
      { text: "changed", role: "verb" },
      { text: "its", role: "other" },
      { text: "hours.", role: "other" },
    ],
    link: { from: 3, to: 0, ok: true, label: "one museum: its" },
  },
  strategy: {
    name: "Find the noun first",
    steps: [
      "See that the choices are pronouns.",
      "Find the noun the pronoun stands for, even in the sentence before.",
      "Skip phrases like <i>of the teachers</i> to reach the real noun.",
      "Decide one or more than one, then pick the pronoun that matches.",
    ],
  },
  examples: [
    {
      title: "One group",
      passage:
        "The town's youth orchestra began with just twelve players and a borrowed rehearsal room. Today, ______ performs in a concert hall that seats eight hundred people.",
      problem:
        "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["they", "it", "these", "we"],
      right: 1,
      steps: [
        { say: "The choices are pronouns, so find the noun the blank stands for." },
        {
          say: "The blank names who performs. That is the orchestra, from the sentence before.",
        },
        {
          say: "An orchestra is **one group**, even with many players, so it needs a singular pronoun.",
        },
        {
          say: "Only it fits. They treats the group as many, these is plural too, and we would put the writer in the orchestra.",
        },
      ],
      answer: "it",
    },
    {
      title: "Skip the phrase",
      passage:
        "After a month of meetings, the committee of five teachers will announce ______ decision about the new school schedule on Friday, in time for the spring term.",
      problem:
        "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["their", "it's", "they're", "its"],
      right: 3,
      steps: [
        { say: "The choices are pronouns, so find the noun that owns the decision." },
        {
          say: "Skip the phrase <i>of five teachers</i>. It only describes the committee, so the real noun is committee.",
        },
        { say: "A committee is one group, so the pronoun must be singular." },
        {
          say: "Its shows that the decision belongs to the committee. It's means it is, and their and they're are plural.",
        },
      ],
      answer: "its",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Group as plural",
      text: "A team, band, company or council feels like many people, but the word names one group. Use it and its, not they and their.",
    },
    {
      name: "Nearest noun",
      text: "In <i>the box of letters lost its lid</i>, the lid belongs to the box, not the letters. Skip the phrase that sits between the noun and the pronoun.",
    },
    {
      name: "Missed antecedent",
      text: "The noun is often in the sentence before the blank. Read both sentences before you pick.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Cross out the phrase",
    steps: [
      "Find the blank and read back to the noun it might stand for.",
      "Cross out any phrase that starts with of, with, in or near.",
      "What is left shows the real noun: <i>The committee ... ______ decision</i>.",
      "Now ask one or more than one, and the match is easy.",
    ],
  },
  check: {
    passage:
      "Sea otters spend most of their lives in the ocean. Before they sleep, they often wrap themselves in strands of kelp. The kelp keeps ______ from drifting away on the tide.",
    text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    choices: ["it", "them", "him", "one"],
    right: 1,
    why: "The ones who might drift away are the sea otters, named in the sentence before, so the pronoun must be plural: them. It is the **Nearest noun** trap, matching kelp, but the kelp cannot keep itself from drifting. Him and one are both singular, and the otters are many.",
  },
  quiz: [
    {
      passage:
        "To build a small, quieter delivery drone, the team of engineers tested ______ new design in a wind tunnel for six weeks before the first outdoor flight.",
      text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["their", "its", "it's", "there"],
      right: 1,
      why: "Skip the phrase <i>of engineers</i> to find the real noun: the team. A team is one group, so the design is its new design. The tempting their is the **Nearest noun** trap: it matches engineers, which only describes the team. It's means it is, which makes no sense before new design. There points to a place, not an owner.",
      subject: "reading",
    },
    {
      passage:
        "The two rovers landed on opposite sides of the crater, about 40 kilometers apart. For six months, ______ sent back pictures of dust storms and dry riverbeds.",
      text: "The choices for the blank are it, they, she and we. What should you do first?",
      choices: [
        "Read the blank aloud with each pronoun and keep the one that sounds best.",
        "Match the blank to months, the nearest noun before it.",
        "Find the noun that did the sending: the rovers, in the sentence before.",
        "Look only at the sentence that holds the blank.",
      ],
      right: 2,
      why: "Start by finding the antecedent. The things that sent back pictures are the two rovers, named in the first sentence, so the answer is they. Matching months is the **Nearest noun** trap: months is just part of a time phrase. Looking only at the second sentence is the **Missed antecedent** trap. Sounding it out can work, but it is not a reliable first move when two choices both sound fine.",
      subject: "reading",
    },
    {
      passage:
        "The Pine Hollow Bird Club counts birds along the river every January. This year, ______ recorded 41 different species, a club record, including a pair of bald eagles.",
      text: "A student chose they for the blank. Why is that choice wrong?",
      choices: [
        "They can stand only for people, never for things.",
        "The blank needs the possessive pronoun its, not they.",
        "The pronoun must match river, the nearest noun before the blank.",
        "The Pine Hollow Bird Club is one group, so the pronoun must be it.",
      ],
      right: 3,
      why: "The noun is the Pine Hollow Bird Club, and a club is one group, so it recorded the species. The student fell for Group as plural. Matching river also gives it, but for the wrong reason: that is the **Nearest noun** trap. They can stand for things, such as rocks or ideas. Its shows ownership, and nothing is owned here; the blank is the one doing the recording.",
      subject: "reading",
    },
    {
      text: "In which sentence does the blank need their rather than its?",
      choices: [
        "The geese in the flock flapped ______ wings in time.",
        "The flock of geese changed ______ path to avoid the storm.",
        "The town on the two islands raised ______ bus fares.",
        "The company that makes the bikes moved ______ factory.",
      ],
      right: 0,
      why: "Find each sentence's real noun. In the geese sentence, the noun is geese, which is plural, so the wings are their wings. In the flock sentence, the noun is flock, one group, so it needs its; choosing their there is the **Group as plural** trap. In the town sentence, islands is the **Nearest noun** trap; the town raised its fares. The company is one company, so it moved its factory.",
      subject: "reading",
    },
    {
      passage:
        "Many people picture a coral reef as a single living thing. In fact, a reef is built by thousands of tiny animals called polyps, and each polyp makes a hard cup of limestone around ______ soft body.",
      text: "Which choice completes the text so that it conforms to the conventions of Standard English?",
      choices: ["their", "they're", "its", "it's"],
      right: 2,
      why: "Find who owns the soft body: each polyp, and each means one at a time. One polyp makes a cup around its own body, so the answer is its. The tempting their is the **Nearest noun** trap: it matches thousands of tiny animals, which comes earlier, instead of each polyp. It's means it is, and they're means they are, so neither can show ownership.",
      subject: "reading",
    },
  ],
};

export default lesson;
