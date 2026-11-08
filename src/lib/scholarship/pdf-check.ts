// ============================================================
// Automatic check of an uploaded SAT score report (pure logic).
//
// The reader (pdf-read.ts) turns the file into plain facts:
// metadata from pdf-lib, text from pdf-parse. This module turns
// those facts plus the student's record into a verdict:
//
//   pass  nothing looks wrong
//   warn  something needs a closer look by the admin
//   fail  something is clearly wrong (wrong person, PSAT, edited
//         with a document editor, scores that don't add up...)
//
// Every reason is a plain sentence the admin can act on. The
// admin always makes the final decision.
// ============================================================

export const CHECK_VERSION = 1;

export type ReasonLevel = "ok" | "warn" | "fail";
export type Verdict = "pass" | "warn" | "fail";

export interface CheckReason {
  code: string;
  level: ReasonLevel;
  message: string;
}

export interface PdfFacts {
  /** Set when the file could not be opened as a PDF at all. */
  loadError: string | null;
  pageCount: number;
  encrypted: boolean;
  producer: string | null;
  creator: string | null;
  /** ISO timestamps. */
  creationDate: string | null;
  modDate: string | null;
  /** How many times the file ends with %%EOF (each extra one is a later save). */
  eofCount: number;
  linearized: boolean;
  annotationSubtypes: string[];
  formFieldCount: number;
  hasJavaScript: boolean;
  hasEmbeddedFiles: boolean;
  /** All text, pages joined. Empty for a scanned image. */
  text: string;
  textError: string | null;
}

export interface ClaimRecord {
  firstName: string | null;
  lastName: string | null;
  declaredTotalScore: number | null;
  /** YYYY-MM-DD */
  declaredTestDate: string | null;
  /** First day of the cohort (YYYY-MM-DD), when known. */
  cohortStart: string | null;
  /** Last day of the cohort (YYYY-MM-DD), when known. */
  cohortEnd: string | null;
  /** Days after the cohort's end that still count. */
  satWithinDays: number;
  /** True when the same file (by hash) was uploaded for a different student. */
  duplicateOfOtherStudent: boolean;
  now: Date;
}

export interface ExtractedReport {
  name: string | null;
  testDate: string | null;
  testDateLabeled: boolean;
  total: number | null;
  totalInferred: boolean;
  rw: number | null;
  math: number | null;
  looksLikeCollegeBoard: boolean;
  mentionsSat: boolean;
  psat: "none" | "mention" | "report";
  superscore: boolean;
  practiceTest: boolean;
}

export interface CheckResult {
  verdict: Verdict;
  reasons: CheckReason[];
  extracted: ExtractedReport;
  metadata: Record<string, unknown>;
}

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

// ------------------------------------------------------------
// Metadata checks
// ------------------------------------------------------------

/** Apps that make documents from scratch. A downloaded report never comes from these. */
const AUTHORING_TOOLS: Array<[RegExp, string]> = [
  [/microsoft.{0,3}\s*word/i, "Microsoft Word"],
  [/powerpoint/i, "PowerPoint"],
  [/google\s+docs/i, "Google Docs"],
  [/libreoffice|openoffice/i, "LibreOffice"],
  [/\bpages\b/i, "Apple Pages"],
  [/keynote/i, "Keynote"],
  [/canva/i, "Canva"],
  [/photoshop/i, "Photoshop"],
  [/illustrator/i, "Illustrator"],
  [/inkscape/i, "Inkscape"],
  [/\bgimp\b/i, "GIMP"],
  [/affinity/i, "Affinity"],
];

/** PDF editors. Not proof of a change, but worth a close look. */
const EDITING_TOOLS: Array<[RegExp, string]> = [
  [/acrobat\s+(?:pro|standard)|adobe\s+acrobat\s+\d/i, "Adobe Acrobat"],
  [/pdfescape/i, "PDFescape"],
  [/sejda/i, "Sejda"],
  [/smallpdf/i, "Smallpdf"],
  [/ilovepdf/i, "iLovePDF"],
  [/pdf-?xchange/i, "PDF-XChange"],
  [/foxit/i, "Foxit"],
  [/nitro/i, "Nitro"],
  [/pdfelement|wondershare/i, "PDFelement"],
  [/pdffiller/i, "pdfFiller"],
  [/dochub/i, "DocHub"],
  [/\bkami\b/i, "Kami"],
  [/xodo/i, "Xodo"],
  [/lumin/i, "Lumin"],
  [/soda\s*pdf/i, "Soda PDF"],
  [/pdf2go/i, "PDF2Go"],
  [/pdfsam/i, "PDFsam"],
  [/pdftk/i, "pdftk"],
  [/pdf-lib/i, "pdf-lib"],
  [/pypdf|pdfminer|reportlab/i, "a PDF script"],
];

/** Annotations that put text or shapes on top of the page. */
const OVERLAY_FAIL = new Set(["FreeText", "Redact"]);
const OVERLAY_WARN = new Set(["Stamp", "Square", "Circle", "Ink", "Polygon", "Line", "Caret"]);

function minutesBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;
}

function describeMinutes(min: number): string {
  if (min < 120) return `${Math.round(min)} minutes`;
  if (min < 48 * 60) return `${Math.round(min / 60)} hours`;
  return `${Math.round(min / 1440)} days`;
}

export function checkMetadata(facts: PdfFacts, testDate: string | null, now: Date): CheckReason[] {
  const r: CheckReason[] = [];
  if (facts.loadError) {
    r.push({ code: "not_pdf", level: "fail", message: "The file could not be opened as a PDF." });
    return r;
  }
  if (facts.pageCount === 0) {
    r.push({ code: "no_pages", level: "fail", message: "The PDF has no pages." });
  } else if (facts.pageCount > 6) {
    r.push({
      code: "many_pages",
      level: "warn",
      message: `The PDF has ${facts.pageCount} pages, which is long for a score report.`,
    });
  }
  if (facts.encrypted) {
    r.push({
      code: "encrypted",
      level: "warn",
      message: "The PDF is encrypted, so parts of it could not be checked.",
    });
  }

  const tools = [facts.producer, facts.creator].filter(Boolean).join(" · ");
  const authoring = AUTHORING_TOOLS.find(([re]) => re.test(tools));
  const editing = EDITING_TOOLS.find(([re]) => re.test(tools));
  if (authoring) {
    r.push({
      code: "authoring_tool",
      level: "fail",
      message: `The file was made with ${authoring[1]}. A downloaded College Board report is never made in a document app.`,
    });
  } else if (editing) {
    r.push({
      code: "editing_tool",
      level: "warn",
      message: `The file was saved with ${editing[1]}, a PDF editor. Look closely at the scores and the name.`,
    });
  } else if (tools) {
    r.push({ code: "tool_ok", level: "ok", message: `Made with: ${tools}.` });
  }

  const allowedEofs = facts.linearized ? 2 : 1;
  if (facts.eofCount > allowedEofs) {
    r.push({
      code: "incremental_saves",
      level: "warn",
      message: `The file was saved ${facts.eofCount - allowedEofs + 1} times. Later saves can hide changes.`,
    });
  }

  if (!facts.creationDate) {
    r.push({ code: "no_creation_date", level: "warn", message: "The file has no creation date." });
  } else {
    if (new Date(facts.creationDate).getTime() > now.getTime() + 24 * 3600 * 1000) {
      r.push({
        code: "created_in_future",
        level: "fail",
        message: "The file's creation date is in the future.",
      });
    }
    if (testDate && facts.creationDate.slice(0, 10) < testDate) {
      r.push({
        code: "created_before_test",
        level: "fail",
        message: "The file was created before the test date printed on it.",
      });
    }
    if (facts.modDate && minutesBetween(facts.creationDate, facts.modDate) > 2) {
      r.push({
        code: "modified_after_creation",
        level: "warn",
        message: `The file was changed ${describeMinutes(minutesBetween(facts.creationDate, facts.modDate))} after it was created.`,
      });
    }
  }

  const failOverlays = facts.annotationSubtypes.filter((s) => OVERLAY_FAIL.has(s));
  const warnOverlays = facts.annotationSubtypes.filter((s) => OVERLAY_WARN.has(s));
  if (failOverlays.length > 0) {
    r.push({
      code: "text_overlay",
      level: "fail",
      message: "Text has been typed or blacked out on top of the report.",
    });
  } else if (warnOverlays.length > 0) {
    r.push({
      code: "shape_overlay",
      level: "warn",
      message: "Shapes or stamps are drawn on top of the report.",
    });
  }
  if (facts.formFieldCount > 0) {
    r.push({
      code: "form_fields",
      level: "warn",
      message: `The PDF has ${facts.formFieldCount} fillable fields, which can cover printed text.`,
    });
  }
  if (facts.hasJavaScript) {
    r.push({ code: "javascript", level: "warn", message: "The PDF contains scripts." });
  }
  if (facts.hasEmbeddedFiles) {
    r.push({
      code: "embedded_files",
      level: "warn",
      message: "The PDF has files attached inside it.",
    });
  }
  return r;
}

// ------------------------------------------------------------
// Text and record checks
// ------------------------------------------------------------

function fold(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsWord(haystack: string, word: string): boolean {
  const w = fold(word);
  if (!w) return false;
  return ` ${haystack} `.includes(` ${w} `);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function checkText(facts: PdfFacts, x: ExtractedReport): CheckReason[] {
  const r: CheckReason[] = [];
  if (facts.textError || facts.text.trim().length < 40) {
    r.push({
      code: "no_text",
      level: "warn",
      message:
        "The report has no readable text (it may be a scan or photo). Check the name, date and scores by eye.",
    });
    return r;
  }
  if (!x.looksLikeCollegeBoard || !x.mentionsSat) {
    r.push({
      code: "not_college_board",
      level: "fail",
      message: "This doesn't look like a College Board SAT score report.",
    });
  }
  if (x.psat === "report") {
    r.push({
      code: "psat",
      level: "fail",
      message: "This is a PSAT report. Only official SAT scores count.",
    });
  } else if (x.psat === "mention") {
    r.push({
      code: "psat_mention",
      level: "warn",
      message: "The report mentions the PSAT. Make sure the score is from the SAT.",
    });
  }
  if (x.practiceTest) {
    r.push({
      code: "practice_test",
      level: "fail",
      message: "This looks like a practice test, not an official SAT.",
    });
  }
  if (x.superscore) {
    r.push({
      code: "superscore",
      level: "warn",
      message: "The report mentions a superscore. Only one test date counts.",
    });
  }
  if (x.total === null) {
    r.push({
      code: "no_total",
      level: "warn",
      message: "The total score couldn't be read. Check it by eye.",
    });
  } else if (x.rw !== null && x.math !== null && x.rw + x.math !== x.total) {
    r.push({
      code: "sections_mismatch",
      level: "fail",
      message: `The section scores (${x.rw} + ${x.math}) don't add up to the total (${x.total}).`,
    });
  } else if (x.totalInferred) {
    r.push({
      code: "total_inferred",
      level: "warn",
      message: `No total was printed, so it was added up from the sections (${x.rw} + ${x.math}).`,
    });
  } else {
    r.push({
      code: "scores_read",
      level: "ok",
      message:
        x.rw !== null && x.math !== null
          ? `Total ${x.total} (Reading and Writing ${x.rw}, Math ${x.math}).`
          : `Total ${x.total}.`,
    });
  }
  if (!x.testDate) {
    r.push({ code: "no_test_date", level: "warn", message: "The test date couldn't be read." });
  } else if (!x.testDateLabeled) {
    r.push({
      code: "test_date_guess",
      level: "warn",
      message: `The test date isn't labeled. Best guess: ${x.testDate}.`,
    });
  }
  return r;
}

export function checkRecord(facts: PdfFacts, x: ExtractedReport, rec: ClaimRecord): CheckReason[] {
  const r: CheckReason[] = [];
  const hasText = !facts.textError && facts.text.trim().length >= 40;

  if (rec.duplicateOfOtherStudent) {
    r.push({
      code: "duplicate_file",
      level: "fail",
      message: "The same file was uploaded for another student.",
    });
  }

  if (hasText) {
    if (!rec.firstName && !rec.lastName) {
      r.push({
        code: "no_name_on_file",
        level: "warn",
        message: "The student has no name on file, so the name couldn't be compared.",
      });
    } else {
      const hay = fold(facts.text);
      const first = rec.firstName ? containsWord(hay, rec.firstName) : false;
      const last = rec.lastName ? containsWord(hay, rec.lastName) : false;
      const full = [rec.firstName, rec.lastName].filter(Boolean).join(" ");
      if (first && last) {
        r.push({ code: "name_match", level: "ok", message: `The name ${full} is on the report.` });
      } else if (last || first) {
        r.push({
          code: "name_partial",
          level: "warn",
          message: `Only part of the name ${full} is on the report.`,
        });
      } else {
        r.push({
          code: "name_missing",
          level: "fail",
          message: `The name on file (${full}) is not on the report.`,
        });
      }
    }
  }

  if (rec.declaredTotalScore !== null && x.total !== null && rec.declaredTotalScore !== x.total) {
    r.push({
      code: "declared_score_mismatch",
      level: "fail",
      message: `The student entered ${rec.declaredTotalScore}, but the report shows ${x.total}.`,
    });
  }
  if (rec.declaredTestDate && x.testDate && rec.declaredTestDate !== x.testDate) {
    r.push({
      code: "declared_date_mismatch",
      level: "warn",
      message: `The student entered a test date of ${rec.declaredTestDate}, but the report shows ${x.testDate}.`,
    });
  }

  const testDate = x.testDate ?? rec.declaredTestDate;
  if (testDate) {
    const today = rec.now.toISOString().slice(0, 10);
    if (testDate > today) {
      r.push({ code: "test_in_future", level: "fail", message: "The test date is in the future." });
    } else if (rec.cohortStart && testDate < rec.cohortStart) {
      r.push({
        code: "before_cohort",
        level: "fail",
        message: `The test (${testDate}) was taken before the cohort started (${rec.cohortStart}).`,
      });
    } else if (rec.cohortEnd && testDate > addDays(rec.cohortEnd, rec.satWithinDays)) {
      r.push({
        code: "after_window",
        level: "fail",
        message: `The test (${testDate}) was taken more than ${rec.satWithinDays} days after the cohort ended (${rec.cohortEnd}).`,
      });
    } else if (!rec.cohortStart || !rec.cohortEnd) {
      r.push({
        code: "window_unknown",
        level: "warn",
        message: "The cohort's dates aren't set, so the test date window couldn't be checked.",
      });
    } else {
      r.push({
        code: "in_window",
        level: "ok",
        message: "The test date is inside the scholarship window.",
      });
    }
  }
  return r;
}

export function verdictOf(reasons: CheckReason[]): Verdict {
  if (reasons.some((x) => x.level === "fail")) return "fail";
  if (reasons.some((x) => x.level === "warn")) return "warn";
  return "pass";
}

export function runScoreReportCheck(facts: PdfFacts, rec: ClaimRecord): CheckResult {
  const extracted = facts.loadError ? extractReport("") : extractReport(facts.text);
  const reasons = facts.loadError
    ? checkMetadata(facts, null, rec.now)
    : [
        ...checkMetadata(facts, extracted.testDate, rec.now),
        ...checkText(facts, extracted),
        ...checkRecord(facts, extracted, rec),
      ];
  return {
    verdict: verdictOf(reasons),
    reasons,
    extracted,
    metadata: {
      producer: facts.producer,
      creator: facts.creator,
      creationDate: facts.creationDate,
      modDate: facts.modDate,
      pageCount: facts.pageCount,
      encrypted: facts.encrypted,
      eofCount: facts.eofCount,
      linearized: facts.linearized,
      annotationSubtypes: facts.annotationSubtypes,
      formFieldCount: facts.formFieldCount,
      textLength: facts.text.length,
      loadError: facts.loadError,
      textError: facts.textError,
    },
  };
}
