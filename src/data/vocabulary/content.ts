import cardData from "./word-part-cards.json";

// Original KARMAN concise paraphrases. See docs/vocabulary-content.md.
// These are general academic vocabulary, not claims about past SAT exam items.
export type DailyWord = {
  word: string;
  meaning: string;
  sourceUrl: string;
};

export type WordPartGroup = "prefix" | "suffix" | "root";

export type WordPartCard = {
  id: string;
  group: WordPartGroup;
  front: string;
  meaning: string;
  variants: readonly string[];
  caution: string | null;
  sameFrontCardIds: readonly string[];
  sourceUrls: readonly string[];
};

const dictionary = (word: string) => `https://www.merriam-webster.com/dictionary/${word}`;

export const dailyWords: readonly DailyWord[] = [
  {
    word: "ABATE",
    meaning: "To become less intense or forceful.",
    sourceUrl: dictionary("abate"),
  },
  {
    word: "AUSTERE",
    meaning: "Plain and without unnecessary comforts or decoration.",
    sourceUrl: dictionary("austere"),
  },
  {
    word: "TACIT",
    meaning: "Understood or accepted without being stated directly.",
    sourceUrl: dictionary("tacit"),
  },
  {
    word: "OBLIQUE",
    meaning: "Indirect rather than plainly expressed.",
    sourceUrl: dictionary("oblique"),
  },
  {
    word: "ERUDITE",
    meaning: "Showing knowledge gained through extensive study.",
    sourceUrl: dictionary("erudite"),
  },
  {
    word: "LACONIC",
    meaning: "Using very few words, sometimes seeming abrupt.",
    sourceUrl: dictionary("laconic"),
  },
  {
    word: "MITIGATE",
    meaning: "To make something harmful or severe less so.",
    sourceUrl: dictionary("mitigate"),
  },
  {
    word: "TENUOUS",
    meaning: "Weak, slight, or lacking a firm basis.",
    sourceUrl: dictionary("tenuous"),
  },
  {
    word: "SALIENT",
    meaning: "Especially noticeable or relevant.",
    sourceUrl: dictionary("salient"),
  },
  {
    word: "ASSUAGE",
    meaning: "To ease an unpleasant feeling, such as worry or fear.",
    sourceUrl: dictionary("assuage"),
  },
  {
    word: "PLIABLE",
    meaning: "Easy to bend or shape without breaking.",
    sourceUrl: dictionary("pliable"),
  },
  {
    word: "LUCID",
    meaning: "Clear and easy to understand.",
    sourceUrl: dictionary("lucid"),
  },
];

export const wordPartCards: readonly WordPartCard[] = cardData.map((card) => {
  if (card.group !== "prefix" && card.group !== "suffix" && card.group !== "root") {
    throw new Error(`Invalid word-part group: ${card.id}`);
  }
  return { ...card, group: card.group };
});
