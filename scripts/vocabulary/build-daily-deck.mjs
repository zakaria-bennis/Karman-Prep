// Keep the complete reviewed evidence outside the client bundle. The game
// receives only the answer, selected sense, and links needed after a round.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import prettier from "prettier";

const sourcePath = "docs/vocabulary-source/reviewed-daily-words.json";
const outputPath = "src/data/vocabulary/verified-daily-words.json";
const expectedSha256 = "0aca436362791691921fcf0ff90256787889630690ba0d00bb0313bc57ae325a";
const source = readFileSync(sourcePath);
if (createHash("sha256").update(source).digest("hex") !== expectedSha256)
  throw new Error("Reviewed daily-word source changed; repeat editorial verification");

const records = JSON.parse(source.toString("utf8"));
if (!Array.isArray(records) || records.length !== 73) throw new Error("Expected 73 source records");
const ids = new Set();
const words = new Set();
const evidenceCounts = { official_exact_form: 0, official_inflected_form_lemma_normalized: 0 };

for (const entry of records) {
  const word = entry.word?.toLowerCase();
  if (!/^[a-z]{6,15}$/.test(word) || entry.length !== word.length)
    throw new Error(`Invalid answer spelling or length: ${entry.id}`);
  if (entry.id !== `karman-daily-${word}` || ids.has(entry.id) || words.has(word))
    throw new Error(`Duplicate or unstable answer ID: ${entry.id}`);
  ids.add(entry.id);
  words.add(word);
  if (!Object.hasOwn(evidenceCounts, entry.evidenceLevel))
    throw new Error(`Unreviewed evidence level: ${entry.id}`);
  evidenceCounts[entry.evidenceLevel]++;
  if (
    entry.reviewedStatus !== "source_and_editorial_review_complete" ||
    entry.dictionaryVerification?.status !==
      "live_entry_read_spelling_pos_and_selected_meaning_checked" ||
    !["adjective", "adverb", "noun", "verb"].includes(entry.partOfSpeech) ||
    typeof entry.definition !== "string" ||
    entry.definition.length < 12 ||
    typeof entry.ambiguityCaution !== "string" ||
    !entry.ambiguityCaution.trim()
  )
    throw new Error(`Incomplete selected meaning or review: ${entry.id}`);
  if (
    entry.dictionaryUrl !== `https://www.merriam-webster.com/dictionary/${word}` ||
    entry.satEvidence?.location !== "answer choice" ||
    entry.satEvidence?.correctAnswerClaimed !== false ||
    !Number.isInteger(entry.satEvidence?.test) ||
    entry.satEvidence.test < 4 ||
    entry.satEvidence.test > 10 ||
    !Number.isInteger(entry.satEvidence?.pdfPage) ||
    !["A", "B", "C", "D"].includes(entry.satEvidence?.choiceLabel) ||
    entry.satSourceUrl !==
      `https://satsuite.collegeboard.org/media/pdf/sat-practice-test-${entry.satEvidence.test}-digital.pdf#page=${entry.satEvidence.pdfPage}`
  )
    throw new Error(`Incomplete practice-test or dictionary provenance: ${entry.id}`);
  const observed = entry.satEvidence.observedForm?.toLowerCase();
  if (
    !/^[a-z]+$/.test(observed) ||
    (entry.evidenceLevel === "official_exact_form" && observed !== word) ||
    (entry.evidenceLevel === "official_inflected_form_lemma_normalized" && observed === word)
  )
    throw new Error(`Unclear exact or normalized answer-choice form: ${entry.id}`);
  if (
    entry.gamePolicy?.openingClue !== null ||
    entry.gamePolicy?.revealDefinitionAfterCompletion !== true
  )
    throw new Error(`Unexpected game policy: ${entry.id}`);
}
if (
  evidenceCounts.official_exact_form !== 65 ||
  evidenceCounts.official_inflected_form_lemma_normalized !== 8
)
  throw new Error("Expected 65 exact forms and 8 documented normalizations");

const deck = records.map((entry) => ({
  id: entry.id,
  word: entry.word.toUpperCase(),
  meaning: entry.definition,
  partOfSpeech: entry.partOfSpeech,
  caution: entry.ambiguityCaution,
  sourceUrl: entry.dictionaryUrl,
  satSourceUrl: entry.satSourceUrl,
  observedForm: entry.satEvidence.observedForm,
  evidenceLevel: entry.evidenceLevel,
}));

const options = await prettier.resolveConfig(outputPath);
writeFileSync(
  outputPath,
  await prettier.format(JSON.stringify(deck), { ...options, filepath: outputPath })
);
console.log(`Projected ${deck.length} sourced daily answers to ${outputPath}`);
