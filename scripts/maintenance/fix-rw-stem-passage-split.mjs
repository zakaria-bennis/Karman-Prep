// ============================================================
// fix-rw-stem-passage-split — backfill fixer for R&W questions
// where the extractor bundled the end-of-passage sentence onto
// the front of the question stem.
//
// EXAMPLE
//   BEFORE:
//     question_text: "Assuming P4 gave equal ratings to the
//       impressionist and cubist paintings, the graph reveals
//       that the model predicted ____. Which choice most
//       effectively uses data from the graph to complete the
//       statement?"
//     passage:       "<passage body without the trailing sentence>"
//
//   AFTER:
//     question_text: "Which choice most effectively uses data
//                     from the graph to complete the statement?"
//     passage:       "<passage body> Assuming P4 gave equal
//                     ratings to the impressionist and cubist
//                     paintings, the graph reveals that the
//                     model predicted ____."
//
// CANONICAL R&W STEM STARTERS (per product-owner spec)
//   Every R&W question begins at a sentence boundary with one of:
//     "As used in the text"   — vocabulary-in-context
//     "Based on the text"     — also catches "Based on the texts"
//     "Which"                 — "Which choice", "Which finding", etc.
//     "What"                  — "What choice", etc.
//     "How"                   — inference / comparison
//     "According"             — factual recall
//     "The student"           — rhetorical synthesis
//
// SAFETY — rows that DON'T get touched
//   · subject != "reading" (math rows have legitimate equations
//     in question_text)
//   · answer_source = "inferred" — answer key was AI-guessed;
//     might still be in human reconciliation
//   · import_flag_reason mentioning a structural issue:
//     figure / graph / table / image / fallback / key / answer /
//     missing / partial — these may still be in active review
//   · Rows flagged with "question_text duplicates passage" — the
//     fix-this-exact-bug case — DO get fixed (whitelist)
//
// USAGE
//   Dry-run (default — prints first 20 BEFORE/AFTER pairs):
//     node --env-file=.env.local \
//       scripts/maintenance/fix-rw-stem-passage-split.mjs
//
//   Commit (writes to DB):
//     node --env-file=.env.local \
//       scripts/maintenance/fix-rw-stem-passage-split.mjs --commit
//
//   Limit (for testing — only process N candidates):
//     LIMIT=10 node --env-file=.env.local ... --commit
// ============================================================

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;
const PREVIEW_COUNT = COMMIT ? 0 : 20;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// ── Canonical stem starters from the product spec ─────────────
// Note: "Based on the text" catches "Based on the texts" as a prefix.
//       "Which" catches "Which choice" / "Which finding".
//       "What" catches "What choice".
const STEM_STARTERS = [
  "As used in the text",
  "Based on the text",
  "Which",
  "What",
  "How",
  "According",
  "The student",
];

// Skip flag reasons that imply the row is in active review for an
// unrelated structural problem (not a passage/stem split issue).
const UNSAFE_FLAG_KEYWORDS = [
  "figure",
  "graph",
  "table",
  "image",
  "fallback",
  "key error",
  "answer key",
  "missing",
  "partial",
  "inferred",
];

// Whitelist: flag reasons we DO want to fix (this is literally the
// bug class this script targets).
const SAFE_FLAG_PATTERNS = [/duplicates? passage/i, /stem.{0,15}passage/i];

const RW_SUBJECT = "reading";

function isSentenceBoundary(text, pos) {
  // Position 0 (start of text) qualifies.
  if (pos === 0) return true;
  // Look back over whitespace; the prior non-whitespace must be
  // a sentence terminator (.?!) — and ideally followed by exactly
  // one space, but tolerate any whitespace.
  let i = pos - 1;
  while (i >= 0 && /\s/.test(text[i])) i--;
  if (i < 0) return true;
  return text[i] === "." || text[i] === "?" || text[i] === "!";
}

function findStemSplit(questionText) {
  if (!questionText) return null;
  let bestIdx = -1;
  let bestPhrase = null;
  for (const phrase of STEM_STARTERS) {
    let from = 0;
    while (from < questionText.length) {
      const idx = questionText.indexOf(phrase, from);
      if (idx < 0) break;
      if (isSentenceBoundary(questionText, idx)) {
        if (bestIdx === -1 || idx < bestIdx) {
          bestIdx = idx;
          bestPhrase = phrase;
        }
        break;
      }
      from = idx + 1;
    }
  }
  if (bestIdx <= 0) return null; // 0 = stem at start, nothing to split
  const passageTail = questionText.slice(0, bestIdx).trim();
  const newStem = questionText.slice(bestIdx).trim();
  // Sanity guard: don't split if the resulting stem is implausibly
  // short or the prefix is just a stray word.
  if (newStem.length < 20 || passageTail.length < 20) return null;
  return { passageTail, newStem, matchedPhrase: bestPhrase };
}

function rowIsSafeToFix(row) {
  if (row.subject !== RW_SUBJECT) return { safe: false, reason: "math row" };
  if (row.answer_source === "inferred") return { safe: false, reason: "inferred answer" };
  const flagReason = (row.import_flag_reason ?? "").toLowerCase();
  if (flagReason) {
    // Whitelist first: this script's exact target.
    if (SAFE_FLAG_PATTERNS.some((re) => re.test(flagReason))) {
      return { safe: true, reason: "flagged for stem/passage split (the target)" };
    }
    // Skip if any unsafe keyword matches.
    for (const kw of UNSAFE_FLAG_KEYWORDS) {
      if (flagReason.includes(kw)) {
        return { safe: false, reason: `flagged: ${kw}` };
      }
    }
  }
  return { safe: true, reason: "ok" };
}

function previewLine(label, text, width = 100) {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  return `${label} ${flat.length > width ? flat.slice(0, width) + "…" : flat}`;
}

async function main() {
  console.log(`Mode: ${COMMIT ? "COMMIT (writes to DB)" : "DRY-RUN (no writes; preview only)"}`);

  console.log("Loading R&W questions…");
  const { data: rows, error } = await supabase
    .from("quiz_questions")
    .select(
      "id, subject, question_text, passage, passage_a, passage_b, answer_source, import_status, import_flag_reason, source_pdf, source_page"
    )
    .eq("subject", RW_SUBJECT);
  if (error) throw error;

  const counts = {
    total: rows.length,
    candidates: 0,
    safe: 0,
    skipped_unsafe: 0,
    fixed: 0,
    write_errors: 0,
  };
  const skipReasons = new Map();
  const previews = [];

  let processed = 0;
  for (const row of rows) {
    if (LIMIT && processed >= LIMIT) break;
    const split = findStemSplit(row.question_text);
    if (!split) continue;
    counts.candidates++;

    const safety = rowIsSafeToFix(row);
    if (!safety.safe) {
      counts.skipped_unsafe++;
      skipReasons.set(safety.reason, (skipReasons.get(safety.reason) ?? 0) + 1);
      continue;
    }
    counts.safe++;

    // Plan the new passage value.
    const existingPassage = (row.passage ?? "").trim();
    let newPassage;
    if (!existingPassage) {
      newPassage = split.passageTail;
    } else if (existingPassage.endsWith(split.passageTail)) {
      // Already there — don't double-add.
      newPassage = existingPassage;
    } else {
      newPassage = existingPassage + " " + split.passageTail;
    }

    if (previews.length < PREVIEW_COUNT) {
      previews.push({
        id: row.id,
        page: `${row.source_pdf ?? "?"} p${row.source_page ?? "?"}`,
        phrase: split.matchedPhrase,
        flag: row.import_flag_reason || "(unflagged)",
        before_qt: row.question_text,
        before_passage: row.passage,
        after_qt: split.newStem,
        after_passage: newPassage,
      });
    }

    if (COMMIT) {
      const { error: upErr } = await supabase
        .from("quiz_questions")
        .update({
          question_text: split.newStem,
          passage: newPassage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (upErr) {
        counts.write_errors++;
        console.log(`  ✗ ${row.id}: ${upErr.message}`);
      } else {
        counts.fixed++;
      }
    }
    processed++;
  }

  console.log("");
  console.log("═".repeat(72));
  console.log("SUMMARY");
  console.log("═".repeat(72));
  console.log(`R&W rows scanned:           ${counts.total}`);
  console.log(`Candidates (passage glued): ${counts.candidates}`);
  console.log(`  Safe to fix:              ${counts.safe}`);
  console.log(`  Skipped (unsafe flags):   ${counts.skipped_unsafe}`);
  if (skipReasons.size) {
    for (const [reason, n] of [...skipReasons.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    · ${reason}: ${n}`);
    }
  }
  if (COMMIT) {
    console.log(`Fixed in DB:                ${counts.fixed}`);
    console.log(`Write errors:               ${counts.write_errors}`);
  } else {
    console.log(`(Dry-run — no writes. Pass --commit to apply.)`);
  }

  if (previews.length > 0) {
    console.log("");
    console.log("═".repeat(72));
    console.log(`PREVIEW (first ${previews.length} candidates)`);
    console.log("═".repeat(72));
    for (let i = 0; i < previews.length; i++) {
      const p = previews[i];
      console.log("");
      console.log(`── ${i + 1}. ${p.page} | matched "${p.phrase}" | flag: ${p.flag}`);
      console.log(previewLine("  BEFORE qt: ", p.before_qt));
      console.log(previewLine("  BEFORE pa: ", p.before_passage || "(empty)"));
      console.log(previewLine("  AFTER  qt: ", p.after_qt));
      console.log(previewLine("  AFTER  pa: ", p.after_passage));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
