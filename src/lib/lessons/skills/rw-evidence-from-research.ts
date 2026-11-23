import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-evidence-from-research",
  tests:
    "Choosing the research finding that would most directly support, or weaken, a hypothesis described in the text.",
  spot: "The question asks which finding, if true, would most directly support or weaken the researchers' hypothesis.",
  idea: [
    "A **hypothesis** is a guess about a link: more of one thing leads to more, or less, of another. Rewrite it as more X, more Y.",
    "A finding **supports** the hypothesis when X and Y move together as predicted. It **weakens** the hypothesis when X changes but Y does not, or Y moves the other way.",
    "If true means you accept the finding. Judge only whether it tests the **exact link**, for the same group the text names.",
  ],
  rules: [
    "Rewrite: more X, more Y",
    "Support: X and Y move together",
    "Weaken: X changes, Y does not",
  ],
  figure: {
    kind: "passage",
    text: "Hypothesis: tomato plants given more hours of light produce more fruit. Finding: plants given 16 hours of light a day produced more tomatoes than the same kind of plants given 8 hours.",
    marks: [
      { find: "more hours of light", tone: "gold", note: "X" },
      { find: "more fruit", tone: "blue", note: "Y" },
      {
        find: "16 hours of light a day produced more tomatoes",
        tone: "green",
        note: "X and Y rise together: supports",
      },
    ],
  },
  strategy: {
    name: "Name the link",
    steps: [
      "Rewrite the hypothesis as a link: more X, more Y.",
      "Check the job: support or weaken?",
      "Predict. Support shows X and Y moving together. Weaken shows X changing without Y.",
      "Keep the finding about the same group and the same X and Y.",
    ],
  },
  examples: [
    {
      title: "Support it",
      passage:
        "Ecologists studying a lake proposed that one species of minnow grows faster in warmer water. To test the idea, they plan to raise young minnows of that species in tanks kept at different temperatures.",
      problem: "Which finding, if true, would most directly support the ecologists' hypothesis?",
      choices: [
        "Minnows of the species raised in warm tanks grew faster than those raised in cool tanks.",
        "Minnows of the species grew at the same rate in warm tanks and in cool tanks.",
        "A different species of minnow grew faster in warmer water.",
        "The lake's water has grown warmer over the past twenty years.",
      ],
      right: 0,
      steps: [
        { say: "Rewrite the hypothesis: warmer water, faster growth, for **this species**." },
        { say: "Check the job: **support**." },
        { say: "Predict: this species should grow faster when its water is warmer." },
        {
          say: "Warm tanks beating cool tanks matches. The same rate in both weakens the idea (wrong direction). Another species is the wrong subject. A warmer lake says nothing about growth (too general).",
        },
      ],
      answer:
        "Minnows of the species raised in warm tanks grew faster than those raised in cool tanks.",
      checkIn: {
        text: "Which finding, if true, would most directly support the botanist's hypothesis?",
        passage:
          "A botanist proposed that a certain kind of sunflower grows taller when it gets more hours of light each day. To test the idea, she plans to grow young sunflowers of that kind under lamps left on for different numbers of hours.",
        choices: [
          "Sunflowers of that kind grew to the same height no matter how many hours of light they got.",
          "A different kind of sunflower grew taller with more hours of light.",
          "Sunflowers of that kind that got more hours of light grew taller than those that got fewer.",
          "Sunflowers are grown on farms in many parts of the world.",
        ],
        right: 2,
        why: "The hypothesis links more light to more height for this kind of sunflower, so support is this kind growing taller with more light. A different kind is the **Wrong subject** trap, and equal heights would weaken the idea, the **Wrong direction** trap.",
        twin: {
          text: "Which finding, if true, would most directly support the biologist's hypothesis?",
          passage:
            "A marine biologist proposed that a certain species of coral grows faster in water with more sunlight. To test the idea, she plans to grow pieces of that coral in tanks that get different amounts of light.",
          choices: [
            "Pieces of that coral grew faster in tanks with more light than in tanks with less.",
            "Pieces of that coral grew at the same rate in every tank.",
            "Another species of coral grew faster in brighter tanks.",
            "Coral reefs are home to many kinds of fish.",
          ],
          right: 0,
          why: "The hypothesis says this coral grows faster with more light, and only the first finding shows exactly that. Another species is the **Wrong subject** trap, and equal growth would weaken the idea, the **Wrong direction** trap.",
        },
      },
    },
    {
      title: "Weaken it",
      passage:
        "A psychologist proposed that students remember a list of words better when they study it while walking than while sitting. In an experiment, two groups of students studied the same list, one group walking and one group sitting.",
      problem: "Which finding, if true, would most directly weaken the psychologist's hypothesis?",
      choices: [
        "Students who walked remembered more words than students who sat.",
        "Students who sat remembered about as many words as students who walked.",
        "Students said that walking made studying more enjoyable.",
        "Adults who walked while studying remembered numbers better.",
      ],
      right: 1,
      steps: [
        { say: "Rewrite the hypothesis: walking while studying, more words remembered." },
        { say: "Check the job: **weaken**." },
        { say: "Predict: walking should make no difference, or a worse result, for students." },
        {
          say: "About the same number of words for both groups matches. More words for walkers supports the idea (wrong direction). Enjoyment is not memory (too general), and adults and numbers are the wrong subject.",
        },
      ],
      answer: "Students who sat remembered about as many words as students who walked.",
      tryFrom: 2,
      checkIn: {
        text: "Which finding, if true, would most directly weaken the researcher's hypothesis?",
        passage:
          "A researcher proposed that people solve puzzles faster when they listen to calm music than when they work in silence. In an experiment, one group solved puzzles with calm music playing, and another group solved the same puzzles in silence.",
        choices: [
          "People who listened to calm music solved the puzzles faster than people who worked in silence.",
          "People said the calm music helped them relax.",
          "Children who listened to calm music finished their homework faster.",
          "People who worked in silence solved the puzzles just as fast as people who listened to calm music.",
        ],
        right: 3,
        why: "To weaken the idea, the finding must show music giving no speed advantage, and equal times do that. Music listeners solving faster would support it, the **Wrong direction** trap, and children doing homework is the **Wrong subject** trap.",
        twin: {
          text: "Which finding, if true, would most directly weaken the scientist's hypothesis?",
          passage:
            "A sleep scientist proposed that people fall asleep faster after reading a paper book than after reading on a phone. In a study, one group read a paper book before bed, and another group read on a phone.",
          choices: [
            "People who read on a phone fell asleep about as quickly as people who read a paper book.",
            "People who read a paper book fell asleep faster than people who read on a phone.",
            "People said they enjoyed paper books more than phones.",
            "Children who read paper books slept longer on weekends.",
          ],
          right: 0,
          why: "The idea predicts paper-book readers fall asleep faster, so finding no difference weakens it. The second choice would support it, the **Wrong direction** trap, and children sleeping longer is the **Wrong subject** trap.",
        },
      },
    },
  ],
  traps: [
    {
      name: "Wrong direction",
      text: "The finding supports when the question says weaken, or the reverse. Circle the job word before you read the choices.",
    },
    {
      name: "Wrong subject",
      text: "The finding is about a different species, place, age group or variable. It may sound close, but it does not test this hypothesis.",
    },
    {
      name: "Too general",
      text: "The finding is on the same topic and makes the idea seem likely, but it never tests the link between X and Y.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Circle the job word",
    steps: [
      "Circle support or weaken in the question before anything else.",
      "Write the link in three words: more X, more Y.",
      "Read each finding as true, and ask only: does it show X and Y moving together, or not?",
    ],
  },
  check: {
    passage:
      "Botanists studying a meadow wildflower hypothesized that the plant produces more seeds when bees visit its flowers more often. They counted bee visits and seeds on dozens of plants over one summer.",
    text: "Which finding, if true, would most directly support the botanists' hypothesis?",
    choices: [
      "The wildflower made the same number of seeds whether bees visited often or rarely.",
      "Bees visit sunflowers more often than any other flower in the meadow.",
      "The wildflower grows in many meadows across the region.",
      "The wildflower plants that received the most bee visits produced the most seeds.",
    ],
    right: 3,
    why: "The link is more bee visits, more seeds, for this wildflower. Most visits paired with most seeds shows X and Y rising together. The same seeds either way weakens the idea (wrong direction). Sunflowers are the wrong subject. Growing in many meadows never tests the link (too general).",
  },
  quiz: [
    {
      passage:
        "A sleep researcher hypothesized that teenagers who use phones in the hour before bed fall asleep later than teenagers who do not. She asked 200 teenagers to record their phone use and the time they fell asleep for two weeks.",
      text: "Which finding, if true, would most directly weaken the researcher's hypothesis?",
      choices: [
        "Teenagers who used phones before bed fell asleep later than those who did not.",
        "Adults who read before bed fell asleep earlier than adults who did not.",
        "Teenagers who used phones before bed fell asleep at about the same time as those who did not.",
        "Most of the teenagers in the study owned a phone.",
      ],
      right: 2,
      why: "The link is phone use before bed, later sleep, for teenagers, and the job is weaken. About the same sleep time with or without phones shows X without Y. Falling asleep later is the wrong direction: it supports the idea. Adults who read are the wrong subject. Owning a phone is too general, since it never tests phone use against sleep time.",
      subject: "reading",
    },
    {
      passage:
        "Marine biologists suspect that one species of reef coral grows more slowly as the water around it becomes more acidic. A student is asked which finding, if true, would most directly support the biologists' hypothesis.",
      text: "What should the student do first?",
      choices: [
        "Rewrite the hypothesis as a link: more acidic water, slower growth, for this coral.",
        "Look for a finding about any species of coral.",
        "Choose the finding that shows the coral growing faster in more acidic water.",
        "Pick any finding that mentions ocean water.",
      ],
      right: 0,
      why: "The first move is to name the link: more acidic water, slower growth, for this one species. Then you know exactly what a supporting finding must show. Any species of coral leads to the wrong subject trap. Faster growth in acidic water is the wrong direction, since it weakens the idea. Any finding about ocean water is too general.",
      subject: "reading",
    },
    {
      passage:
        "An economist hypothesized that small towns with a weekly farmers market have more locally owned shops than similar towns without one. Asked for a finding that would support this, a student chose: “Towns with a weekly farmers market had about the same number of locally owned shops as towns without one.”",
      text: "Why is the student's choice wrong?",
      choices: [
        "It is about a different kind of town than the hypothesis.",
        "It never tests the link between markets and shops.",
        "It cannot be accepted as true.",
        "It weakens the hypothesis instead of supporting it.",
      ],
      right: 3,
      why: "This is the wrong direction trap. The link is a weekly market, more local shops. A finding where towns with and without markets have about the same number of shops shows X without Y, so it weakens the idea. It is about the same kind of town, so not the wrong subject. It does test the link, so it is not too general. If true means every finding is accepted.",
      subject: "reading",
    },
    {
      passage:
        "Researchers think that city parks with more trees attract more bird species. Over one spring, they plan to count the trees and the bird species in 30 parks across the city.",
      text: "Four questions could be asked about this text. Which one calls for naming the link and testing findings?",
      choices: [
        "Which quotation from the report most effectively illustrates the claim?",
        "Which finding, if true, would most directly weaken the researchers' hypothesis?",
        "Which choice most effectively uses data from the table to complete the statement?",
        "According to the text, how many parks will the researchers visit?",
      ],
      right: 1,
      why: "A finding that would weaken a hypothesis is exactly what this strategy tests: more trees, more bird species, then check what breaks the link. The quotation question looks alike, but it asks for words from a work that prove a claim, which is evidence from a text. The table question needs numbers from a table. How many parks asks for one key detail.",
      subject: "reading",
    },
    {
      passage:
        "Biologists studying a species of sparrow noticed that males in cities sing higher notes than males in the countryside. They hypothesize that city birds raise the pitch of their songs so the songs can be heard over the low rumble of traffic.",
      text: "Which finding, if true, would most directly support the biologists' hypothesis?",
      choices: [
        "City males of the species sang higher notes on noisy weekdays than on quiet Sundays at the same sites.",
        "Country males of the species sang more often in the morning than in the evening.",
        "Frogs in cities call at higher pitches than frogs in the countryside.",
        "City males of the species sang the same notes whether traffic was heavy or light.",
      ],
      right: 0,
      why: "The link is more traffic noise, higher notes, for this sparrow. Higher notes on noisy weekdays than on quiet Sundays, at the same sites, shows pitch rising with noise in the same birds. The same notes in heavy or light traffic is the wrong direction: it weakens the idea. Frogs are the wrong subject. Morning and evening singing is too general.",
      subject: "reading",
    },
  ],
};

export default lesson;
