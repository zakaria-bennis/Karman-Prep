import { dailyWords, legacyDailyWords, type DailyWord } from "@/data/vocabulary/content";

export const MAX_GUESSES = 6;
const FIRST_DAY = Date.UTC(2026, 9, 8);
const FIRST_EXPANDED_DAY = Date.UTC(2026, 9, 9);

export type LetterResult = "correct" | "present" | "absent";
export type GameOutcome = "playing" | "won" | "lost";

export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function millisecondsUntilNextUtcDay(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime();
}

function dayNumber(day: string): number {
  const dayNumber = Math.floor((Date.parse(`${day}T00:00:00.000Z`) - FIRST_DAY) / 86_400_000);
  if (!Number.isInteger(dayNumber)) throw new Error("Invalid UTC puzzle day");
  return dayNumber;
}

export function legacyPuzzleForDay(day: string): DailyWord {
  const index = dayNumber(day);
  return legacyDailyWords[
    ((index % legacyDailyWords.length) + legacyDailyWords.length) % legacyDailyWords.length
  ];
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// A fixed, ID-derived order makes every answer appear once before the cycle
// repeats, independent of the source JSON order or local timezone.
const expandedOrder = [...dailyWords].sort(
  (left, right) =>
    stableHash(`karman-daily-v2:${left.id}`) - stableHash(`karman-daily-v2:${right.id}`) ||
    left.id.localeCompare(right.id)
);
const wordsById = new Map([...dailyWords, ...legacyDailyWords].map((word) => [word.id, word]));

export function puzzleForDay(day: string): DailyWord {
  const timestamp = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) throw new Error("Invalid UTC puzzle day");
  if (timestamp < FIRST_EXPANDED_DAY) return legacyPuzzleForDay(day);
  const index = Math.floor((timestamp - FIRST_EXPANDED_DAY) / 86_400_000);
  return expandedOrder[index % expandedOrder.length];
}

export type RestoredDailySession = {
  word: DailyWord;
  guesses: string[];
  storageVersion: "v1" | "v2";
};

// Existing guesses belong to the original answer for that UTC date. Keep
// writing them to v1 so an older open tab and a newly loaded tab agree.
export function restoreDailySession(
  day: string,
  legacyRaw: string | null,
  currentRaw: string | null
): RestoredDailySession {
  const legacyWord = legacyPuzzleForDay(day);
  const legacyGuesses = savedGuesses(legacyRaw, legacyWord.word.length);
  if (legacyGuesses.length)
    return { word: legacyWord, guesses: legacyGuesses, storageVersion: "v1" };
  try {
    const parsed: unknown = currentRaw ? JSON.parse(currentRaw) : null;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as { wordId?: unknown; guesses?: unknown };
      const word = typeof record.wordId === "string" ? wordsById.get(record.wordId) : undefined;
      if (word && Array.isArray(record.guesses)) {
        const guesses = savedGuesses(JSON.stringify(record.guesses), word.word.length);
        if (guesses.length === record.guesses.length)
          return { word, guesses, storageVersion: "v2" };
      }
    }
  } catch {
    /* Corrupt local data never blocks a fresh round. */
  }
  return { word: puzzleForDay(day), guesses: [], storageVersion: "v2" };
}

export function scoreGuess(guess: string, answer: string): LetterResult[] {
  if (guess.length !== answer.length) throw new Error("Guess length must match the answer");
  const result: LetterResult[] = Array(guess.length).fill("absent");
  const remaining = new Map<string, number>();

  for (let index = 0; index < answer.length; index++) {
    if (guess[index] === answer[index]) result[index] = "correct";
    else remaining.set(answer[index], (remaining.get(answer[index]) ?? 0) + 1);
  }
  for (let index = 0; index < guess.length; index++) {
    if (result[index] === "correct") continue;
    const count = remaining.get(guess[index]) ?? 0;
    if (count > 0) {
      result[index] = "present";
      remaining.set(guess[index], count - 1);
    }
  }
  return result;
}

export function gameOutcome(guesses: readonly string[], answer: string): GameOutcome {
  if (guesses.includes(answer)) return "won";
  return guesses.length >= MAX_GUESSES ? "lost" : "playing";
}

export function savedGuesses(raw: string | null, answerLength: number): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_GUESSES) return [];
    if (
      !parsed.every(
        (word) => typeof word === "string" && new RegExp(`^[A-Z]{${answerLength}}$`).test(word)
      )
    )
      return [];
    return parsed;
  } catch {
    return [];
  }
}

export function keyboardFeedback(
  guesses: readonly string[],
  answer: string
): Map<string, LetterResult> {
  const rank: Record<LetterResult, number> = { absent: 0, present: 1, correct: 2 };
  const feedback = new Map<string, LetterResult>();
  for (const guess of guesses) {
    scoreGuess(guess, answer).forEach((result, index) => {
      const letter = guess[index];
      const previous = feedback.get(letter);
      if (!previous || rank[result] > rank[previous]) feedback.set(letter, result);
    });
  }
  return feedback;
}
