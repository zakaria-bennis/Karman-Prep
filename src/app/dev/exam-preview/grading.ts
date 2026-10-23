import { parseNumericAnswer } from "@/lib/numeric-answer";

// Browser-safe helpers for the dev exam preview: grading against the printed key (not yet
// validated) and the source-image link.

export function originalUrl(examId: string, questionId: string) {
  return `/dev/exam-preview/files/${examId}/${questionId}/original.png`;
}

function numericValue(text: string) {
  const plain = text
    .trim()
    .replace(/^(-?\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/, (m) => m.replace(/,/g, ""));
  return parseNumericAnswer(plain);
}

/** Right or wrong against the printed key. Grid-ins: any listed form, compared by value; a
 *  decimal answer may be the key cut off or rounded at 3+ decimal places, as the SAT allows. */
export function isCorrectAnswer(answer: string | undefined, key: string, numeric: boolean) {
  const given = (answer ?? "").trim();
  if (!given) return false;
  if (!numeric) return given.toUpperCase() === key.trim().toUpperCase();
  const value = numericValue(given);
  return key
    .split(/\s*(?:;|\bor\b|,\s)\s*/)
    .map((k) => k.trim())
    .filter(Boolean)
    .some((k) => {
      const expected = numericValue(k);
      if (value === null || expected === null)
        return k.replace(/\s/g, "") === given.replace(/\s/g, "");
      if (Math.abs(value - expected) < 1e-9) return true;
      const decimals = /\.(\d+)$/.exec(given)?.[1].length ?? 0;
      return decimals >= 3 && Math.abs(value - expected) < 10 ** -decimals;
    });
}
