// Original KARMAN prompts and concise paraphrases. See docs/vocabulary-content.md.
// These are general academic vocabulary, not claims about past SAT exam items.
export type DailyWord = {
  word: string;
  context: string;
  meaning: string;
  sourceUrl: string;
};

export type WordPartGroup = "prefix" | "suffix" | "root";

export type WordPartCard = {
  id: string;
  group: WordPartGroup;
  front: string;
  meaning: string;
  example: string;
  sourceUrl: string;
};

const dictionary = (word: string) => `https://www.merriam-webster.com/dictionary/${word}`;
const readingRockets =
  "https://www.readingrockets.org/topics/spelling-and-word-study/articles/root-words-suffixes-and-prefixes";

export const dailyWords: readonly DailyWord[] = [
  {
    word: "ABATE",
    context: "By dusk, the strong winds began to _____, and the harbor reopened.",
    meaning: "To become less intense or forceful.",
    sourceUrl: dictionary("abate"),
  },
  {
    word: "AUSTERE",
    context: "The gallery's _____ rooms had bare walls and almost no decoration.",
    meaning: "Plain and without unnecessary comforts or decoration.",
    sourceUrl: dictionary("austere"),
  },
  {
    word: "TACIT",
    context: "Their _____ agreement was understood, though no one said it aloud.",
    meaning: "Understood or accepted without being stated directly.",
    sourceUrl: dictionary("tacit"),
  },
  {
    word: "OBLIQUE",
    context:
      "Rather than criticize the proposal directly, she made an _____ reference to its cost.",
    meaning: "Indirect rather than plainly expressed.",
    sourceUrl: dictionary("oblique"),
  },
  {
    word: "ERUDITE",
    context: "The historian's _____ lecture drew on years of close study.",
    meaning: "Showing knowledge gained through extensive study.",
    sourceUrl: dictionary("erudite"),
  },
  {
    word: "LACONIC",
    context: "Asked for a long explanation, the editor gave a _____ reply: ‘No.’",
    meaning: "Using very few words, sometimes seeming abrupt.",
    sourceUrl: dictionary("laconic"),
  },
  {
    word: "MITIGATE",
    context: "New shade trees could _____ the heat on the playground.",
    meaning: "To make something harmful or severe less so.",
    sourceUrl: dictionary("mitigate"),
  },
  {
    word: "TENUOUS",
    context: "The claim rested on a _____ connection between two distant events.",
    meaning: "Weak, slight, or lacking a firm basis.",
    sourceUrl: dictionary("tenuous"),
  },
  {
    word: "SALIENT",
    context: "The summary highlighted the most _____ facts from the report.",
    meaning: "Especially noticeable or relevant.",
    sourceUrl: dictionary("salient"),
  },
  {
    word: "ASSUAGE",
    context: "Clear answers helped _____ the neighbors' fears about the project.",
    meaning: "To ease an unpleasant feeling, such as worry or fear.",
    sourceUrl: dictionary("assuage"),
  },
  {
    word: "PLIABLE",
    context: "The warm clay became _____ enough to shape by hand.",
    meaning: "Easy to bend or shape without breaking.",
    sourceUrl: dictionary("pliable"),
  },
  {
    word: "LUCID",
    context: "Her _____ explanation made the difficult idea easy to follow.",
    meaning: "Clear and easy to understand.",
    sourceUrl: dictionary("lucid"),
  },
];

export const wordPartCards: readonly WordPartCard[] = [
  {
    id: "pre",
    group: "prefix",
    front: "pre-",
    meaning: "Before.",
    example: "preview",
    sourceUrl: readingRockets,
  },
  {
    id: "anti",
    group: "prefix",
    front: "anti-",
    meaning: "Against or opposed to.",
    example: "antigravity",
    sourceUrl: readingRockets,
  },
  {
    id: "inter",
    group: "prefix",
    front: "inter-",
    meaning: "Between or among.",
    example: "interact",
    sourceUrl: readingRockets,
  },
  {
    id: "sub",
    group: "prefix",
    front: "sub-",
    meaning: "Under or below.",
    example: "subway",
    sourceUrl: readingRockets,
  },
  {
    id: "trans",
    group: "prefix",
    front: "trans-",
    meaning: "Across.",
    example: "transmit",
    sourceUrl: readingRockets,
  },
  {
    id: "mis",
    group: "prefix",
    front: "mis-",
    meaning: "Wrongly.",
    example: "misspell",
    sourceUrl: readingRockets,
  },
  {
    id: "able",
    group: "suffix",
    front: "-able",
    meaning: "Able to be; capable of.",
    example: "affordable",
    sourceUrl: readingRockets,
  },
  {
    id: "less",
    group: "suffix",
    front: "-less",
    meaning: "Without.",
    example: "hopeless",
    sourceUrl: readingRockets,
  },
  {
    id: "ment",
    group: "suffix",
    front: "-ment",
    meaning: "An action, process, or resulting state.",
    example: "contentment",
    sourceUrl: readingRockets,
  },
  {
    id: "tion",
    group: "suffix",
    front: "-tion",
    meaning: "An action or process.",
    example: "collection",
    sourceUrl: readingRockets,
  },
  {
    id: "ous",
    group: "suffix",
    front: "-ous",
    meaning: "Having the qualities of.",
    example: "joyous",
    sourceUrl: readingRockets,
  },
  {
    id: "ive",
    group: "suffix",
    front: "-ive",
    meaning: "Forms an adjective that expresses a quality.",
    example: "active",
    sourceUrl: readingRockets,
  },
  {
    id: "dict",
    group: "root",
    front: "dict",
    meaning: "To say or speak.",
    example: "dictation",
    sourceUrl: readingRockets,
  },
  {
    id: "port",
    group: "root",
    front: "port",
    meaning: "To carry.",
    example: "portable",
    sourceUrl: readingRockets,
  },
  {
    id: "spect",
    group: "root",
    front: "spect",
    meaning: "To look or observe.",
    example: "spectator",
    sourceUrl: readingRockets,
  },
  {
    id: "struct",
    group: "root",
    front: "struct",
    meaning: "To build.",
    example: "restructure",
    sourceUrl: readingRockets,
  },
  {
    id: "aud",
    group: "root",
    front: "aud",
    meaning: "To hear.",
    example: "audience",
    sourceUrl: readingRockets,
  },
  {
    id: "scrib",
    group: "root",
    front: "scrib",
    meaning: "To write.",
    example: "inscription",
    sourceUrl: readingRockets,
  },
];
