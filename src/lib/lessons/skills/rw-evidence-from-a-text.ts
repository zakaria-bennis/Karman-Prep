import type { Lesson } from "../types";

const lesson: Lesson = {
  id: "rw-evidence-from-a-text",
  tests: "Choosing the quotation from a story, poem or speech that best supports a claim about it.",
  spot: "The question asks which quotation most effectively illustrates the claim. The claim is usually the last sentence before the question.",
  idea: [
    "Claims often have **two parts**: two feelings at once, a feeling and its cause, or a change over time.",
    "All four quotations come from the same work, so they all sound related. Only one proves **every part** of the claim.",
    "Split the claim first. Then test each quotation against each part, and keep the one that **checks every box**.",
  ],
  rules: [
    "Split the claim into parts",
    "One quote must prove every part",
    "Right person, right feeling",
  ],
  figure: {
    kind: "passage",
    text: "Claim: the speaker is both excited and nervous about the first day at a new school. Quote: “My new shoes are bright as morning, but my hands won't stop their shaking.”",
    marks: [
      { find: "excited", tone: "gold", note: "part 1" },
      { find: "nervous", tone: "blue", note: "part 2" },
      { find: "bright as morning", tone: "gold", note: "proves part 1" },
      { find: "my hands won't stop their shaking", tone: "blue", note: "proves part 2" },
    ],
  },
  strategy: {
    name: "Split the claim",
    steps: [
      "Find the claim, usually the sentence right before the question.",
      "Split it into its parts, such as proud and worried.",
      "Predict what a quotation must show to prove each part.",
      "Test each quotation against every part, and keep the one that proves them all.",
    ],
  },
  examples: [
    {
      title: "Two feelings",
      passage:
        "In a short story, a girl named Ines moves with her family to a new city. The story suggests that Ines misses her old home even as she begins to enjoy her new one.",
      problem: "Which quotation from the story most effectively illustrates the claim?",
      choices: [
        "“Ines unpacked her boxes slowly, one each evening.”",
        "“She laughed with her new friends at the market, then went home and reread her grandmother's letters until the ink blurred.”",
        "“Ines loved the bright stalls of the new market and the friends she met there.”",
        "“Her brother said he would never miss their old town.”",
      ],
      right: 1,
      steps: [
        { say: "Find the claim: Ines misses her old home while she enjoys her new one." },
        {
          say: "Split it. Part 1: she **misses** her old home. Part 2: she **enjoys** the new one.",
        },
        {
          say: "Test each quote. Laughing with new friends proves part 2. Rereading her grandmother's letters until the ink blurs proves part 1.",
        },
        {
          say: "Cross off the rest. The market quote proves only part 2 (half the claim). The boxes quote shows no feeling (same topic, wrong point). The brother is the wrong person.",
        },
      ],
      answer:
        "“She laughed with her new friends at the market, then went home and reread her grandmother's letters until the ink blurred.”",
    },
    {
      title: "Praise and sorrow",
      passage:
        "In a poem, the speaker describes an old fishing boat that no longer sails. The speaker admires the boat's long years of work but feels sad that those years are over.",
      problem: "Which quotation from the poem most effectively illustrates the claim?",
      choices: [
        "“For forty years you fought the waves and fed the town; how quiet you sit now, and how I mourn your empty deck.”",
        "“The harbor wakes at five, and gulls cry over the water.”",
        "“How proudly you sailed through every storm, the bravest boat in the bay.”",
        "“The old fisherman sighs as he locks the boat shed for the last time.”",
      ],
      right: 0,
      steps: [
        { say: "Find the claim: the speaker admires the boat's work and is sad it is over." },
        { say: "Split it. Part 1: **admires** the years of work. Part 2: **sad** they are over." },
        {
          say: "Test each quote. Forty years fighting waves proves part 1, and how I mourn your empty deck proves part 2.",
        },
        {
          say: "Cross off the rest. The proud-sailing quote proves only part 1 (half the claim). The harbor quote names no feeling about the boat. The fisherman's sigh is the wrong person.",
        },
      ],
      answer:
        "“For forty years you fought the waves and fed the town; how quiet you sit now, and how I mourn your empty deck.”",
      tryFrom: 2,
    },
  ],
  traps: [
    {
      name: "Half the claim",
      text: "The quote proves one part only. It feels right because it matches the first word of the claim you notice.",
    },
    {
      name: "Same topic, wrong point",
      text: "The quote mentions the subject, such as the boat or the market, but not the feeling or action the claim names.",
    },
    {
      name: "Wrong person",
      text: "The quote shows the right feeling, but about a different character. Check who feels it.",
    },
  ],
  tip: {
    kind: "reading",
    title: "Make a checklist",
    steps: [
      "Write each part of the claim as a box to check, such as proud and worried.",
      "For each quotation, check only the boxes it truly proves.",
      "The right quotation checks every box. One box only means half the claim.",
    ],
  },
  check: {
    passage:
      "In a story, the narrator remembers visiting her uncle Ravi's house when she was a child. The story suggests that Uncle Ravi is generous but forgetful.",
    text: "Which quotation from the story most effectively illustrates the claim?",
    choices: [
      "“Uncle Ravi always had a gift ready for every child in the family.”",
      "“My aunt laughed at how often she lost her own glasses.”",
      "“Uncle Ravi gave his last coat to a stranger on the bus, then spent an hour hunting for keys that were in his hand.”",
      "“Uncle Ravi lived in a small blue house near the train station.”",
    ],
    right: 2,
    why: "Split the claim: generous, and forgetful. Giving away his coat proves generous, and hunting for keys in his hand proves forgetful. The gift quote proves only generous (half the claim). The aunt losing her glasses is the wrong person. The blue house is about Ravi but shows neither trait.",
  },
  quiz: [
    {
      passage:
        "In a poem, the speaker stands alone on a beach at night, looking out at the water. The speaker feels both amazed by the ocean and very small beside it.",
      text: "Which quotation from the poem most effectively illustrates the claim?",
      choices: [
        "“The waves roll in, and the tide slips out again.”",
        "“Oh, wide and shining water, how you dazzle me, and how you shrink me to a grain of sand.”",
        "“How brilliant you are, endless sea, glittering to the edge of the world.”",
        "“My sister stood on the dune and felt tiny beside the waves.”",
      ],
      right: 1,
      why: "Split the claim: amazed, and small. How you dazzle me proves amazed, and shrink me to a grain of sand proves small, so that quote checks both boxes. The glittering sea quote shows only amazement, half the claim. The waves rolling in is the same topic with no feeling. The sister feels small, but she is the wrong person.",
      subject: "reading",
    },
    {
      passage:
        "In a novel, a character named Owen works long hours at his family's bakery in a quiet town. The novel suggests that Owen is hardworking but lonely.",
      text: "Before reading the quotations, what should a student do first?",
      choices: [
        "Choose the quotation that shows Owen working hardest.",
        "Look for the quotation with the strongest feeling in it.",
        "Split the claim into its two parts: hardworking and lonely.",
        "Pick the quotation that names Owen most often.",
      ],
      right: 2,
      why: "The first move is to split the claim into its parts, hardworking and lonely, so you know the quote must prove both. Choosing the hardest-working quote leads to half the claim. The strongest feeling might belong to the wrong person or the wrong feeling. Naming Owen often is the same topic, wrong point trap: mentioning him proves nothing.",
      subject: "reading",
    },
    {
      passage:
        "In a story, Lena is running her first race. The story suggests that Lena is nervous before the race but calm once it begins. A student chose this quotation: “Lena's legs trembled as she waited at the starting line.”",
      text: "Why is the student's choice wrong?",
      choices: [
        "It proves only that Lena is nervous, not that she is calm once the race begins.",
        "It describes a different runner, not Lena.",
        "It is about running, but it shows no feeling at all.",
        "It describes the end of the race instead of the start.",
      ],
      right: 0,
      why: "The student fell for half the claim. Trembling legs prove Lena is nervous before the race, but nothing in the quote shows her calm once it begins. The quote is about Lena, not another runner, so it is not the wrong person. It does show a feeling, nerves. It describes the start, at the starting line, not the end.",
      subject: "reading",
    },
    {
      passage:
        "A story describes a young beekeeper named Sam who checks his hives before a summer storm. Sam is proud of his hives but worried about what the storm will do to them.",
      text: "Four questions could be asked about this story. Which one calls for splitting a claim and testing quotations?",
      choices: [
        "Which choice best states the main idea of the text?",
        "According to the text, how many hives does Sam keep?",
        "Which finding, if true, would most directly support the beekeepers' hypothesis?",
        "Which quotation from the story most effectively illustrates the claim?",
      ],
      right: 3,
      why: "Only the quotation question asks you to prove a claim with words from the work, so it needs this strategy. The finding question looks alike, but it asks about research results and a hypothesis, which is evidence from research. The main idea question asks for the point of the whole text. How many hives asks for one key detail.",
      subject: "reading",
    },
    {
      passage:
        "In a novel, the narrator spends a summer on his grandfather's farm. The novel suggests that the narrator at first finds the farm dull but comes to treasure it by the end of the summer.",
      text: "Which quotation from the novel most effectively illustrates the claim?",
      choices: [
        "“The farm had forty cows, two tractors and a creek that ran dry in July.”",
        "“My first week, I could think of nothing but how boring the fields were.”",
        "“In June the days stretched empty and slow; by August I counted each sunrise over the barn as something I could not bear to lose.”",
        "“Grandfather loved that farm more than anything in the world.”",
      ],
      right: 2,
      why: "Split the claim: dull at first, then treasured by the end. Empty and slow in June proves the first part, and a sunrise he could not bear to lose by August proves the second. The boring first week shows only the start, half the claim. The cows and tractors quote is the same topic with no feeling. Grandfather's love is the wrong person.",
      subject: "reading",
    },
  ],
};

export default lesson;
