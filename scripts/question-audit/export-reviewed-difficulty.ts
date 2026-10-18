#!/usr/bin/env -S npx tsx
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { prepareReviewedQuestionExport } from "@/lib/question-bank/reviewed-question-export";

const [candidateFile, dFile, pdfFile, outputDirectory, ...extra] = process.argv.slice(2);
if (!candidateFile || !dFile || !pdfFile || !outputDirectory || extra.length) {
  console.error(
    "usage: tsx scripts/question-audit/export-reviewed-difficulty.ts <verified-candidates.json> <D-engineering-assessments.json> <source.pdf> <new-output-directory>"
  );
  process.exit(1);
}
try {
  const candidates = JSON.parse(readFileSync(resolve(candidateFile), "utf8"));
  const d = JSON.parse(readFileSync(resolve(dFile), "utf8"));
  if (!Array.isArray(candidates.candidates) || !Array.isArray(d.records)) {
    throw new Error("Expected candidates[] and D engineering records[]");
  }
  const result = prepareReviewedQuestionExport(candidates.candidates, d.records, basename(pdfFile));
  // Require a fresh destination; never overwrite the source files or an earlier export.
  const destination = resolve(outputDirectory);
  mkdirSync(destination, { recursive: false });
  writeFileSync(
    join(destination, "reviewed-questions.json"),
    JSON.stringify(result.export, null, 2) + "\n",
    { flag: "wx" }
  );
  writeFileSync(
    join(destination, "difficulty-audit.json"),
    JSON.stringify(result.audit, null, 2) + "\n",
    { flag: "wx" }
  );
  console.log(
    JSON.stringify({
      exported_rows: result.export.questions.length,
      database_accessed: false,
      publication_performed: false,
    })
  );
} catch (error) {
  console.error(
    `Export requires review: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(2);
}
