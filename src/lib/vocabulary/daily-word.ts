import { dailyWords, type DailyWord } from "@/data/vocabulary/content";

export const MAX_GUESSES = 6;
const FIRST_DAY = Date.UTC(2026, 9, 8);

export type LetterResult = "correct" | "present" | "absent";
export type GameOutcome = "playing" | "won" | "lost";

export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function millisecondsUntilNextUtcDay(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime();
}

export function puzzleForDay(day: string): DailyWord {
  const dayNumber = Math.floor((Date.parse(`${day}T00:00:00.000Z`) - FIRST_DAY) / 86_400_000);
  if (!Number.isInteger(dayNumber)) throw new Error("Invalid UTC puzzle day");
  return dailyWords[((dayNumber % dailyWords.length) + dailyWords.length) % dailyWords.length];
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
