import {
  levelToLegacyDifficulty,
  type QuizDifficulty,
  type QuizDifficultyLevel,
} from "@/types/quiz";

const LEGACY_LEVEL_MAP: Record<QuizDifficulty, QuizDifficultyLevel> = {
  foundational: 2,
  intermediate: 4,
  advanced: 5,
  mastery: 6,
};

/**
 * Parse a difficulty value (either 1-7 integer, or legacy enum
 * "foundational" / "intermediate" / "advanced" / "mastery") into the
 * canonical pair { level, legacy }. Defaults to (4, "intermediate")
 * when the input is missing or unparseable.
 */
export function parseDifficulty(value: string | number | undefined | null): {
  level: QuizDifficultyLevel;
  legacy: QuizDifficulty;
} {
  if (value == null) return { level: 4, legacy: levelToLegacyDifficulty(4) };
  const asNumber = typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);
  if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= 7) {
    const lvl = asNumber as QuizDifficultyLevel;
    return { level: lvl, legacy: levelToLegacyDifficulty(lvl) };
  }
  const trimmed = String(value).trim();
  if (trimmed in LEGACY_LEVEL_MAP) {
    const legacy = trimmed as QuizDifficulty;
    return { level: LEGACY_LEVEL_MAP[legacy], legacy };
  }
  return { level: 4, legacy: levelToLegacyDifficulty(4) };
}

/** Never default, truncate, or infer a seven-level rating from a legacy band. */
export function parseReviewedDifficulty(value: unknown): {
  level: QuizDifficultyLevel;
  legacy: QuizDifficulty;
} {
  const numeric =
    typeof value === "string" && /^[1-7]$/.test(value.trim()) ? Number(value.trim()) : value;
  if (typeof numeric !== "number" || !Number.isInteger(numeric) || numeric < 1 || numeric > 7) {
    throw new Error(
      "difficulty needs review: provide an explicit integer 1-7; legacy bands cannot recover the exact rating"
    );
  }
  const level = numeric as QuizDifficultyLevel;
  return { level, legacy: levelToLegacyDifficulty(level) };
}
