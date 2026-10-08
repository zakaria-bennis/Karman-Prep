import cardData from "./word-part-cards.json";
import starterWordData from "./starter-daily-words.json";
import verifiedWordData from "./verified-daily-words.json";

// Original KARMAN concise paraphrases. See docs/vocabulary-content.md.
// Only records with official practice-test evidence carry satSourceUrl.
export type DailyWord = {
  id: string;
  word: string;
  meaning: string;
  sourceUrl: string;
  partOfSpeech?: string;
  caution?: string;
  satSourceUrl?: string;
  observedForm?: string;
  evidenceLevel?: "official_exact_form" | "official_inflected_form_lemma_normalized";
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

// Preserve the original twelve-word schedule for previously saved v1 games.
export const legacyDailyWords: readonly DailyWord[] = starterWordData.map((entry) => ({
  ...entry,
  id: `starter-${entry.word.toLowerCase()}`,
}));

const verifiedDailyWords: readonly DailyWord[] = verifiedWordData.map((entry) => ({
  ...entry,
  evidenceLevel: entry.evidenceLevel as DailyWord["evidenceLevel"],
}));
const verifiedSpellings = new Set(verifiedDailyWords.map((entry) => entry.word.toLowerCase()));

// The official-practice record wins when a starter has the same spelling.
export const dailyWords: readonly DailyWord[] = [
  ...verifiedDailyWords,
  ...legacyDailyWords.filter((entry) => !verifiedSpellings.has(entry.word.toLowerCase())),
];

export const wordPartCards: readonly WordPartCard[] = cardData.map((card) => {
  if (card.group !== "prefix" && card.group !== "suffix" && card.group !== "root") {
    throw new Error(`Invalid word-part group: ${card.id}`);
  }
  return { ...card, group: card.group };
});
