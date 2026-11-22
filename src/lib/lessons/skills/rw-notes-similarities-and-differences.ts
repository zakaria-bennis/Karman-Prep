import type { Lesson } from "../types";

const ASK =
  "Which choice most effectively uses relevant information from the notes to accomplish this goal?";

const lesson: Lesson = {
  id: "rw-notes-similarities-and-differences",
  tests:
    "Choosing the sentence that uses a student's notes to show how two things are alike or how they differ.",
  spot: "A list of notes, then a goal such as emphasize a similarity or emphasize a difference, and the question asks which choice best uses the notes to do it.",
  idea: [
    "Nearly every choice is true to the notes. The only question is which one does the **goal**.",
    "A comparison needs **both things** named. A choice about only one of them cannot compare anything.",
    "The **link word** shows the comparison. Similarity: both, like, also. Difference: while, whereas, unlike.",
  ],
  rules: [
    "Goal first, notes last",
    "Name both things",
    "Both, like = alike. While, unlike = differ",
  ],
  figure: {
    kind: "notes",
    goal: "Emphasize a difference between the animals' snouts.",
    notes: [
      "Alligators have wide, U-shaped snouts.",
      "Crocodiles have narrow, V-shaped snouts.",
      "Both are reptiles that hunt in water.",
      "Alligators live mostly in fresh water.",
    ],
    pick: [0, 1],
  },
  strategy: {
    name: "Goal first",
    steps: [
      "Read the goal. Mark the two things and the word similarity or difference.",
      "Go to the choices before the notes.",
      "Keep only the choices that name both things and join them the right way.",
      "Use the notes only to break a tie or check a fact.",
    ],
  },
  examples: [
    {
      title: "A similarity",
      passage:
        "While researching a topic, a student has taken the following notes:\n• Venus and Earth are both rocky planets.\n• Venus is about 95% as wide as Earth.\n• Venus's surface is hot enough to melt lead.\n• Earth has liquid water on its surface.\n• Venus spins in the opposite direction from most planets.",
      problem: `The student wants to emphasize a similarity between Venus and Earth. ${ASK}`,
      choices: [
        "Venus's surface is hot enough to melt lead, while Earth has liquid water on its surface.",
        "Venus spins in the opposite direction from most planets.",
        "Venus and Earth are both rocky planets, and Venus is about 95% as wide as Earth.",
        "Venus, which spins in the opposite direction from most planets, has a surface hot enough to melt lead, unlike Earth, which has liquid water.",
      ],
      right: 2,
      steps: [
        { say: "Read the goal: a **similarity** between Venus and Earth." },
        { say: "Go to the choices. Spinning backward is about Venus only, so it is one-sided." },
        {
          say: "While and unlike set up differences, the wrong link, even in the long choice packed with notes.",
        },
        {
          say: "Only the choice with both and nearly the same width names both planets and a shared point.",
        },
      ],
      answer: "Venus and Earth are both rocky planets, and Venus is about 95% as wide as Earth.",
    },
    {
      title: "A difference",
      passage:
        "While researching a topic, a student has taken the following notes:\n• The violin and the cello both have four strings.\n• Both are usually played with a bow.\n• A violinist holds the instrument under the chin.\n• A cellist sits and rests the instrument on the floor.\n• The cello plays much lower notes than the violin.",
      problem: `The student wants to emphasize a difference in how the two instruments are held. ${ASK}`,
      choices: [
        "The violin and the cello both have four strings and are usually played with a bow.",
        "The cello plays much lower notes than the violin.",
        "A cellist sits and rests the instrument on the floor.",
        "While a violinist holds the instrument under the chin, a cellist sits and rests it on the floor.",
      ],
      right: 3,
      steps: [
        { say: "Read the goal: a **difference**, and only in how the instruments are held." },
        { say: "Cross off four strings and a bow: that is a similarity, the wrong link." },
        {
          say: "The cellist choice names one instrument only. Lower notes is a difference in sound, not in holding.",
        },
        { say: "Only the while choice names both instruments and contrasts how they are held." },
      ],
      answer:
        "While a violinist holds the instrument under the chin, a cellist sits and rests it on the floor.",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "One-sided",
      text: "The choice gives true facts about only one of the two things. Without both, there is nothing to compare.",
    },
    {
      name: "Wrong link",
      text: "The choice states a similarity when the goal asks for a difference, or the reverse. Check the link word against the goal.",
    },
    {
      name: "Most notes",
      text: "The longest choice packs in many facts but misses the goal. Using more notes earns nothing.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Circle the link word",
    steps: [
      "In each choice, find the link word: both, also or like for a similarity; while, whereas or unlike for a difference.",
      "Check that the choice names both things from the goal.",
      "Ignore how many notes a choice uses. Only the goal counts.",
    ],
  },
  check: {
    passage:
      "While researching a topic, a student has taken the following notes:\n• The Sahara is a hot desert in northern Africa.\n• Antarctica is a cold desert covered in ice.\n• Both receive very little rain or snow each year.\n• Antarctica is the largest desert on Earth.",
    text: `The student wants to emphasize a similarity between the Sahara and Antarctica. ${ASK}`,
    choices: [
      "Antarctica, a cold desert covered in ice, is the largest desert on Earth.",
      "Although the Sahara is hot and Antarctica is cold, both receive very little rain or snow each year.",
      "The Sahara is a hot desert, while Antarctica is a cold one.",
      "Unlike the Sahara, Antarctica is covered in ice.",
    ],
    right: 1,
    why: "The goal is a similarity, and only one choice names both deserts and ends on a shared point: both get very little rain or snow. Its opening clause mentions a difference, but the main point is what they share. The largest-desert choice is one-sided. The while and unlike choices state differences, the wrong link.",
  },
  quiz: [
    {
      passage:
        "While researching a topic, a student has taken the following notes:\n• Cumulus and stratus clouds are both made of tiny water droplets.\n• Cumulus clouds are puffy and heaped, like cotton.\n• Stratus clouds form flat, gray layers.\n• Stratus clouds sometimes bring light drizzle.",
      text: `The student wants to emphasize a difference in the shapes of the two kinds of clouds. ${ASK}`,
      choices: [
        "Cumulus and stratus clouds are both made of tiny water droplets.",
        "Stratus clouds form flat, gray layers and sometimes bring light drizzle.",
        "Cumulus clouds are puffy and heaped, while stratus clouds form flat, gray layers.",
        "Stratus clouds, unlike cumulus clouds, sometimes bring light drizzle.",
      ],
      right: 2,
      why: "Goal first: a difference in shape. Only the while choice names both clouds and contrasts puffy heaps with flat layers. Both made of water droplets is the Wrong link. Flat layers and drizzle describes stratus clouds only, so it is One-sided. The drizzle choice is a difference, but in weather, not shape, and the notes never say cumulus clouds lack drizzle.",
      subject: "reading",
    },
    {
      passage:
        "While researching a topic, a student has taken the following notes:\n• Tennis and badminton are both played with rackets over a net.\n• A tennis ball may bounce once before a player hits it.\n• A badminton shuttlecock must be hit before it touches the ground.\n• Badminton shuttlecocks are made with feathers or plastic.",
      text: "The student wants to emphasize a similarity between tennis and badminton. What should the student do first?",
      choices: [
        "Read every note closely and rank the notes by importance",
        "Read the goal and mark the two things it names and the word similarity",
        "Start with the longest choice, since it uses the most notes",
        "Pick the note with the most detail about one of the sports",
      ],
      right: 1,
      why: "Goal first: mark tennis, badminton and similarity, and the right choice will be the one that says both are played with rackets over a net. Ranking every note wastes time, since the notes matter only for checking facts. Starting with the longest choice falls for Most notes. A detailed note about one sport leads to One-sided.",
      subject: "reading",
    },
    {
      passage:
        "While researching a topic, a student has taken the following notes:\n• The Nile flows north into the Mediterranean Sea.\n• The Amazon flows east into the Atlantic Ocean.\n• The Amazon carries more water than any other river.\n• Both are among the longest rivers in the world.",
      text: "The student wants to emphasize a similarity between the Nile and the Amazon. A student chose this sentence: The Amazon, which carries more water than any other river, flows east into the Atlantic Ocean, while the Nile flows north into the Mediterranean Sea. Why is this choice wrong?",
      choices: [
        "It uses facts that are not in the notes.",
        "It describes only one of the two rivers.",
        "It names both rivers but leaves out where they flow.",
        "It states a difference, though the goal asks for a similarity.",
      ],
      right: 3,
      why: "The sentence uses the most notes, but while sets up a difference, so it falls for Most notes and the Wrong link. The goal needs a shared point: both are among the longest rivers in the world. Every fact in it is from the notes. It names both rivers, so it is not One-sided. It does say where each river flows.",
      subject: "reading",
    },
    {
      passage:
        "While researching a topic, a student has taken the following notes:\n• Blue whales are the largest animals on Earth.\n• Sperm whales are much smaller than blue whales.\n• Blue whales eat tiny shrimp-like animals called krill.\n• Sperm whales hunt squid in deep water.\n• Both whales are mammals that breathe air.",
      text: `The student wants to emphasize a difference in what the two whales eat. ${ASK}`,
      choices: [
        "Blue whales eat tiny krill, while sperm whales hunt squid in deep water.",
        "Blue whales are the largest animals on Earth, while sperm whales are much smaller.",
        "Blue whales and sperm whales are both mammals that breathe air.",
        "Sperm whales hunt squid in deep water.",
      ],
      right: 0,
      why: "The goal names a difference in diet, so the choice must name both whales and contrast their food: krill versus squid. The size choice is the look-alike. It has the right link and both whales, but it compares size, not diet. Both breathing air is the Wrong link. Sperm whales hunting squid is One-sided.",
      subject: "reading",
    },
    {
      passage:
        "While researching a topic, a student has taken the following notes:\n• The Hubble Space Telescope was launched in 1990.\n• The James Webb Space Telescope was launched in 2021.\n• Hubble observes mainly visible and ultraviolet light.\n• Webb observes mainly infrared light.\n• Both telescopes study distant galaxies from space.",
      text: `The student wants to emphasize a similarity between the two telescopes. ${ASK}`,
      choices: [
        "Hubble, launched in 1990, observes mainly visible and ultraviolet light, while Webb, launched in 2021, observes mainly infrared light.",
        "Webb, which was launched in 2021, observes mainly infrared light.",
        "Although they were launched 31 years apart, Hubble and Webb both study distant galaxies from space.",
        "Hubble was launched in 1990, more than 30 years before Webb.",
      ],
      right: 2,
      why: "The goal is a similarity. Only one choice names both telescopes and ends on a shared point: both study distant galaxies from space. Its opening, 31 years apart, is true, since 2021 minus 1990 is 31. The long while choice uses the Most notes but states differences. The Webb choice is One-sided. More than 30 years before Webb is a difference, the Wrong link.",
      subject: "reading",
    },
  ],
};

export default lesson;
