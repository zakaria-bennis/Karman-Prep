import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  checkMetadata,
  extractReport,
  runScoreReportCheck,
  verdictOf,
  type ClaimRecord,
  type PdfFacts,
} from "./pdf-check";
import { looksLikePdf, readPdfFacts } from "./pdf-read";

const REPORT_TEXT = [
  "College Board",
  "SAT Score Report",
  "Name: Maya Thompson",
  "Test Date: October 4, 2026",
  "Total Score",
  "1480",
  "Score Range 1450-1510",
  "Reading and Writing",
  "730",
  "Math",
  "750",
].join("\n");

function facts(over: Partial<PdfFacts> = {}): PdfFacts {
  return {
    loadError: null,
    pageCount: 2,
    encrypted: false,
    producer: "Apache FOP Version 2.9",
    creator: null,
    creationDate: "2026-10-20T15:00:00.000Z",
    modDate: "2026-10-20T15:00:00.000Z",
    eofCount: 1,
    linearized: false,
    annotationSubtypes: [],
    formFieldCount: 0,
    hasJavaScript: false,
    hasEmbeddedFiles: false,
    text: REPORT_TEXT,
    textError: null,
    ...over,
  };
}

function record(over: Partial<ClaimRecord> = {}): ClaimRecord {
  return {
    firstName: "Maya",
    lastName: "Thompson",
    declaredTotalScore: 1480,
    declaredTestDate: "2026-10-04",
    cohortStart: "2026-08-01",
    cohortEnd: "2026-09-30",
    satWithinDays: 60,
    duplicateOfOtherStudent: false,
    now: new Date("2026-11-08T12:00:00Z"),
    ...over,
  };
}

async function makePdf(
  lines: string[],
  meta: { producer?: string; creator?: string; created?: Date; modified?: Date } = {}
): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  if (meta.producer) doc.setProducer(meta.producer);
  if (meta.creator) doc.setCreator(meta.creator);
  doc.setCreationDate(meta.created ?? new Date("2026-10-20T15:00:00Z"));
  doc.setModificationDate(meta.modified ?? meta.created ?? new Date("2026-10-20T15:00:00Z"));
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  lines.forEach((line, i) => page.drawText(line, { x: 50, y: 740 - i * 20, size: 12, font }));
  return doc.save({ useObjectStreams: false });
}

describe("extractReport", () => {
  it("reads the name, labeled test date and scores", () => {
    const x = extractReport(REPORT_TEXT);
    expect(x).toMatchObject({
      name: "Maya Thompson",
      testDate: "2026-10-04",
      testDateLabeled: true,
      total: 1480,
      rw: 730,
      math: 750,
      looksLikeCollegeBoard: true,
      psat: "none",
      practiceTest: false,
    });
  });

  it("finds the section pair that adds up when the first numbers don't", () => {
    const x = extractReport(
      "College Board SAT\nTotal Score 1300\nReading and Writing Percentile 89 640\nMath 660 Range 620-700"
    );
    expect(x.total).toBe(1300);
    expect(x.rw! + x.math!).toBe(1300);
  });

  it("adds the total up from the sections when none is printed", () => {
    const x = extractReport("College Board SAT\nReading and Writing 600\nMath 610");
    expect(x.total).toBe(1210);
    expect(x.totalInferred).toBe(true);
  });

  it("recognises PSAT reports, practice tests and superscores", () => {
    expect(extractReport("PSAT/NMSQT Score Report College Board").psat).toBe("report");
    expect(
      extractReport(
        "College Board\nSAT Score Report\nTotal Score 1400\nCompare with your PSAT history"
      ).psat
    ).toBe("mention");
    expect(extractReport("College Board SAT Practice Test 4 results").practiceTest).toBe(true);
    expect(extractReport("College Board SAT Superscore 1500").superscore).toBe(true);
  });

  it("reads numeric dates and guesses the latest unlabeled date", () => {
    expect(extractReport("Test date 10/04/2026").testDate).toBe("2026-10-04");
    const x = extractReport("Born March 3, 2009. Scores from Oct 4, 2026.");
    expect(x.testDate).toBe("2026-10-04");
    expect(x.testDateLabeled).toBe(false);
  });
});

describe("checks and verdict", () => {
  it("passes a clean report that matches the record", () => {
    const result = runScoreReportCheck(facts(), record());
    expect(result.verdict).toBe("pass");
    expect(result.extracted.total).toBe(1480);
    expect(result.reasons.every((r) => r.level === "ok")).toBe(true);
  });

  it("fails a report made in a document app", () => {
    const r = checkMetadata(
      facts({ producer: "Microsoft® Word for Microsoft 365" }),
      null,
      new Date()
    );
    expect(verdictOf(r)).toBe("fail");
    expect(r.find((x) => x.code === "authoring_tool")?.message).toContain("Microsoft Word");
  });

  it("warns on a PDF editor, later saves and late modification", () => {
    const r = checkMetadata(
      facts({ producer: "Sejda PDF Editor", eofCount: 3, modDate: "2026-10-22T15:00:00.000Z" }),
      "2026-10-04",
      new Date("2026-11-08")
    );
    expect(r.map((x) => x.code)).toEqual(
      expect.arrayContaining(["editing_tool", "incremental_saves", "modified_after_creation"])
    );
    expect(verdictOf(r)).toBe("warn");
  });

  it("allows the second %%EOF of a linearized file", () => {
    const r = checkMetadata(facts({ eofCount: 2, linearized: true }), null, new Date("2026-11-08"));
    expect(r.some((x) => x.code === "incremental_saves")).toBe(false);
  });

  it("fails typed-over text and a file created before the test", () => {
    const r = checkMetadata(
      facts({
        annotationSubtypes: ["Link", "FreeText"],
        creationDate: "2026-09-01T00:00:00.000Z",
        modDate: null,
      }),
      "2026-10-04",
      new Date("2026-11-08")
    );
    expect(r.map((x) => x.code)).toEqual(
      expect.arrayContaining(["text_overlay", "created_before_test"])
    );
  });

  it("fails a name that isn't on the report and a score that differs from what was typed", () => {
    const result = runScoreReportCheck(
      facts(),
      record({ firstName: "Jordan", lastName: "Lee", declaredTotalScore: 1520 })
    );
    const codes = result.reasons.map((r) => r.code);
    expect(codes).toEqual(expect.arrayContaining(["name_missing", "declared_score_mismatch"]));
    expect(result.verdict).toBe("fail");
  });

  it("fails sections that don't add up", () => {
    const text = REPORT_TEXT.replace("750", "700").replace("Score Range 1450-1510", "");
    const result = runScoreReportCheck(facts({ text }), record({ declaredTotalScore: null }));
    expect(result.reasons.find((r) => r.code === "sections_mismatch")).toBeDefined();
  });

  it("fails a test outside the window and a duplicate file", () => {
    const result = runScoreReportCheck(
      facts(),
      record({ cohortEnd: "2026-06-01", duplicateOfOtherStudent: true })
    );
    const codes = result.reasons.map((r) => r.code);
    expect(codes).toEqual(expect.arrayContaining(["after_window", "duplicate_file"]));
  });

  it("only warns for a scan without text, and skips the name check", () => {
    const result = runScoreReportCheck(facts({ text: "" }), record());
    expect(result.verdict).toBe("warn");
    expect(result.reasons.some((r) => r.code === "no_text")).toBe(true);
    expect(result.reasons.some((r) => r.code.startsWith("name_"))).toBe(false);
  });

  it("fails a file that isn't a PDF", () => {
    const result = runScoreReportCheck(facts({ loadError: "Not a PDF file" }), record());
    expect(result.verdict).toBe("fail");
    expect(result.reasons[0].code).toBe("not_pdf");
  });
});

describe("readPdfFacts on real PDFs", () => {
  it("reads metadata and text from a generated report", async () => {
    const bytes = await makePdf(REPORT_TEXT.split("\n"), { producer: "Apache FOP Version 2.9" });
    expect(looksLikePdf(bytes)).toBe(true);
    const f = await readPdfFacts(bytes);
    expect(f.loadError).toBeNull();
    expect(f.pageCount).toBe(1);
    expect(f.producer).toBe("Apache FOP Version 2.9");
    expect(f.creationDate).toBe("2026-10-20T15:00:00.000Z");
    expect(f.text).toContain("Total Score");
    const result = runScoreReportCheck(f, record());
    expect(result.extracted.total).toBe(1480);
    expect(result.verdict).toBe("pass");
  }, 20000);

  it("flags a report that was edited and saved again", async () => {
    const original = await makePdf(REPORT_TEXT.split("\n"));
    const doc = await PDFDocument.load(original, { updateMetadata: false });
    doc.setProducer("Smallpdf.com");
    doc.setModificationDate(new Date("2026-10-25T10:00:00Z"));
    const edited = await doc.save();
    const result = runScoreReportCheck(await readPdfFacts(edited), record());
    expect(result.reasons.map((r) => r.code)).toEqual(
      expect.arrayContaining(["editing_tool", "modified_after_creation"])
    );
    expect(result.verdict).toBe("warn");
  }, 20000);

  it("turns garbage bytes into a load error instead of throwing", async () => {
    const f = await readPdfFacts(new TextEncoder().encode("hello, not a pdf"));
    expect(f.loadError).toBe("Not a PDF file");
  });
});
