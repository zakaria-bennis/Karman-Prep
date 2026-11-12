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

import { extractReport } from "./pdf-extract";

export { extractReport, normalizeText } from "./pdf-extract";

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
