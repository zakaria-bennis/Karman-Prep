// Pulls the scores, dates and name out of a score report's text, for pdf-check.ts.

import type { ExtractedReport } from "./pdf-check";

// ------------------------------------------------------------
// Text extraction
// ------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const TOTAL_RE = /\b(1[0-6]\d0|[4-9]\d0)\b/g;
const SECTION_RE = /\b([2-7]\d0|800)\b/g;
const MONTH_DATE_RE =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/gi;
const NUMERIC_DATE_RE = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

interface FoundDate {
  iso: string;
  index: number;
}

function findDates(text: string): FoundDate[] {
  const out: FoundDate[] = [];
  for (const m of text.matchAll(MONTH_DATE_RE)) {
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    const iso = toIsoDate(Number(m[3]), month, Number(m[2]));
    if (iso) out.push({ iso, index: m.index ?? 0 });
  }
  for (const m of text.matchAll(NUMERIC_DATE_RE)) {
    const iso = toIsoDate(Number(m[3]), Number(m[1]), Number(m[2]));
    if (iso) out.push({ iso, index: m.index ?? 0 });
  }
  return out.sort((a, b) => a.index - b.index);
}

/** Numbers matching `re` within `window` characters after each label match. */
function numbersAfter(text: string, label: RegExp, re: RegExp, window: number): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(label)) {
    const start = (m.index ?? 0) + m[0].length;
    const slice = text.slice(start, start + window);
    for (const n of slice.matchAll(re)) out.push(Number(n[1]));
  }
  return out;
}

function firstNumberAfter(text: string, label: RegExp, re: RegExp, window: number): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(label)) {
    const start = (m.index ?? 0) + m[0].length;
    const hit = text.slice(start, start + window).match(new RegExp(re.source));
    if (hit) out.push(Number(hit[1]));
  }
  return out;
}

export function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[‐-―]/g, "-")
    .replace(/[ \t ]+/g, " ")
    .replace(/\r/g, "");
}

export function extractReport(rawText: string): ExtractedReport {
  const text = normalizeText(rawText);
  const lower = text.toLowerCase();

  // Scores. The first number after the label is the score; later
  // numbers in the window are ranges and percentiles.
  const totals = firstNumberAfter(text, /total\s+score/gi, TOTAL_RE, 80);
  const rwLabel =
    /(?:evidence-based\s+)?reading\s+(?:and|&)\s+writing(?:\s+section)?(?:\s+score)?/gi;
  const mathLabel = /\bmath(?:ematics)?(?:\s+section)?(?:\s+score)?\b/gi;
  const rwCandidates = numbersAfter(text, rwLabel, SECTION_RE, 60);
  const mathCandidates = numbersAfter(text, mathLabel, SECTION_RE, 40);

  let total: number | null = totals[0] ?? null;
  let rw: number | null = rwCandidates[0] ?? null;
  let math: number | null = mathCandidates[0] ?? null;
  let totalInferred = false;

  if (total !== null && (rw === null || math === null || rw + math !== total)) {
    // Look for a section pair that adds up to the total.
    outer: for (const r of rwCandidates) {
      for (const m of mathCandidates) {
        if (r + m === total) {
          rw = r;
          math = m;
          break outer;
        }
      }
    }
  }
  if (total === null && rw !== null && math !== null) {
    total = rw + math;
    totalInferred = true;
  }

  // Test date: prefer a date right after a "test date" label.
  const dates = findDates(text);
  let testDate: string | null = null;
  let testDateLabeled = false;
  for (const label of lower.matchAll(
    /test(?:ed)?\s*(?:date|on|administration)|date\s+of\s+test/g
  )) {
    const at = (label.index ?? 0) + label[0].length;
    const hit = dates.find((d) => d.index >= at && d.index - at <= 60);
    if (hit) {
      testDate = hit.iso;
      testDateLabeled = true;
      break;
    }
  }
  if (!testDate && dates.length > 0) {
    // Unlabeled: the latest date is the best guess (birth dates are older).
    testDate = dates.map((d) => d.iso).sort()[dates.length - 1];
  }

  // Name: "Name: First Last" when the report labels it.
  const nameMatch = text.match(
    /(?:[Ss]tudent[ \t]+)?[Nn]ame[ \t]*[:\-]?[ \t]*([A-Z][A-Za-z'\-]+(?:[ \t]+[A-Z]\.?)?(?:[ \t]+[A-Z][A-Za-z'\-]+){1,2})/
  );

  const heading = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  const psatReport =
    /psat(?:\/nmsqt|\s*10|\s*8\/9)?\s+(?:score\s+report|total\s+score)/i.test(text) ||
    /\bpsat\b/i.test(heading);
  const psatMention = /\bpsat\b/i.test(text);

  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    testDate,
    testDateLabeled,
    total,
    totalInferred,
    rw,
    math,
    looksLikeCollegeBoard: /college\s*board|collegeboard/i.test(text),
    mentionsSat: /\bsat\b/i.test(text),
    psat: psatReport ? "report" : psatMention ? "mention" : "none",
    superscore: /super\s*score/i.test(text),
    practiceTest:
      /\bpractice\s+test\s*#?\s*\d+\b/i.test(text) ||
      /\bpractice\s+(?:sat|test)\s+(?:score\s+)?report\b/i.test(text) ||
      /\bmy\s*practice\b/i.test(text),
  };
}
