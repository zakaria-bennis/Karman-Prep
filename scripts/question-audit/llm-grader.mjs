// ============================================================
// Phase-2 LLM grader — blind-grades every question against
// Gemini Flash + tie-breaks disagreements with Gemini Pro.
//
// Catches what the deterministic auditor cannot:
//   · Wrong stored answer key (Gemini's independent solve disagrees)
//   · Mismatched figure (the figure depicts X but the question is
//     about Y — the solver would notice the inconsistency)
//   · Broken explanation_text (we ask Pro on disagreements to score
//     whether the stored explanation supports the stored answer)
//   · Internally-contradictory choices (Gemini can't pick a single
//     answer because two are equally valid)
//
// FREE-TIER STRATEGY
//   Pass 1: gemini-2.5-flash    — 1500 RPD free, 1 call per question.
//                                 Solves the question blind.
//   Pass 2: gemini-2.5-pro      — 25 RPD free, called only on Pass-1
//                                 disagreements. Acts as tie-breaker.
//
//   This means: a single full-length SAT test (≈100 questions) uses
//   100 Flash calls (6% of daily quota) and at most 25 Pro calls
//   (the disagreement subset). A prod scan of 536 rows fits within
//   one day, possibly with a Pro carry-over.
//
// USAGE
//   node --env-file=.env.local scripts/question-audit/llm-grader.mjs \
//     question-imports/extract-out/202408usv2/questions.csv \
//     [question-imports/extract-out/202408usv2/questions_needs_review.csv]
//
//   # Or against the live table:
//   node --env-file=.env.local scripts/question-audit/llm-grader.mjs --from-db
//
//   # Limit run size during development:
//   LIMIT=20 node --env-file=.env.local ... llm-grader.mjs <csv>
//
// OUTPUT
//   audit-out/grader-report.md      severity-grouped human view
//   audit-out/grader-report.json    per-row { stored, flash, pro, verdict }
//
// VERDICTS
//   verified      — flash and stored agree (high confidence)
//   verified_pro  — flash disagreed, pro agreed with stored (dismiss)
//   likely_wrong  — both flash AND pro disagree with stored
//   uncertain     — flash uncertain, no pro tiebreak available
//   skip_no_text  — row has no question_text to grade
//   error         — API error after retries
// ============================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const FROM_DB = args.includes("--from-db");
const csvPaths = args.filter((a) => !a.startsWith("--"));
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;

if (!FROM_DB && csvPaths.length === 0) {
  console.error("Usage: llm-grader.mjs <csv1> [csv2] | --from-db");
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("Set GEMINI_API_KEY in .env.local.");
  process.exit(1);
}

const FLASH_MODEL = "gemini-2.5-flash";
const PRO_MODEL = "gemini-2.5-pro";

// Call Gemini via REST so we don't pull in a new npm dependency just
// for this audit script. The python pipeline uses google-genai; here
// we hit the same generateContent endpoint directly.
async function geminiGenerate(modelName, parts) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    // Surface quota exhaustion specifically so the caller can stop.
    if (res.status === 429 && /quota|PerDay|RPD|daily/i.test(errBody)) {
      throw new Error(`DAILY QUOTA EXHAUSTED on ${modelName}: ${errBody.slice(0, 300)}`);
    }
    // RetryInfo: server-suggested delay in seconds.
    const retryMatch = errBody.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
    if (retryMatch) {
      const wait = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500;
      const err = new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      err.retryAfterMs = wait;
      throw err;
    }
    throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

// ── CSV parser (mirror audit-csv.mjs) ──
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        if (row.some((v) => v.trim() !== "")) rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
}

async function loadFromCsv(filePath) {
  const text = await readFile(filePath, "utf-8");
  return parseCsv(text);
}

async function loadFromDb() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supa = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supa
    .from("quiz_questions")
    .select("*, answer_choices(letter, choice_text)")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((row) => {
    const cs = row.answer_choices || [];
    const lookup = (l) => cs.find((c) => c.letter === l) || {};
    return {
      id: row.id,
      question_text: row.question_text ?? "",
      choice_a: lookup("A").choice_text ?? "",
      choice_b: lookup("B").choice_text ?? "",
      choice_c: lookup("C").choice_text ?? "",
      choice_d: lookup("D").choice_text ?? "",
      correct_answer: row.correct_answer ?? "",
      explanation_text: row.explanation_text ?? "",
      passage_intro: row.passage_intro ?? "",
      passage: row.passage ?? "",
      passage_a: row.passage_a ?? "",
      passage_b: row.passage_b ?? "",
      question_format: row.answer_format ?? "multiple_choice",
      domain: row.domain ?? "",
      source_pdf: row.source_pdf ?? "",
      source_page: String(row.source_page ?? ""),
      image_url: row.image_url ?? "",
      image_alt: row.image_alt ?? "",
    };
  });
}

// ── Vision input — fetch image bytes when image_url is set ──
async function fetchImageBytes(url) {
  if (!url) return null;
  if (url.startsWith("data:image/")) {
    // data:image/png;base64,XXXXXX
    const m = url.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (!m) return null;
    const mime = m[1];
    const buf = Buffer.from(m[2], "base64");
    return { mime, buf };
  }
  if (url.startsWith("https://")) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const mime = res.headers.get("content-type") || "image/png";
      const buf = Buffer.from(await res.arrayBuffer());
      return { mime, buf };
    } catch {
      return null;
    }
  }
  return null;
}

// ── Prompts ──
function buildSolvePrompt(row) {
  const isMc = row.question_format !== "numeric_entry";
  const lines = [];
  lines.push(
    "You are solving an SAT question. Work it out carefully step by step, then give your final answer."
  );
  lines.push("");
  if (row.passage_intro) {
    lines.push("PASSAGE INTRO:");
    lines.push(row.passage_intro);
    lines.push("");
  }
  if (row.passage) {
    lines.push("PASSAGE:");
    lines.push(row.passage);
    lines.push("");
  }
  if (row.passage_a) {
    lines.push("PASSAGE A:");
    lines.push(row.passage_a);
    lines.push("");
    lines.push("PASSAGE B:");
    lines.push(row.passage_b || "");
    lines.push("");
  }
  lines.push("QUESTION:");
  lines.push(row.question_text);
  lines.push("");
  if (isMc) {
    lines.push("ANSWER CHOICES:");
    lines.push(`A) ${row.choice_a}`);
    lines.push(`B) ${row.choice_b}`);
    lines.push(`C) ${row.choice_c}`);
    lines.push(`D) ${row.choice_d}`);
    lines.push("");
  }
  lines.push("RESPOND IN JSON:");
  lines.push("{");
  if (isMc) {
    lines.push('  "reasoning": "<your step-by-step work, in 2-4 sentences>",');
    lines.push('  "answer": "<single letter: A, B, C, or D>",');
  } else {
    lines.push('  "reasoning": "<your step-by-step work, in 2-4 sentences>",');
    lines.push('  "answer": "<the numeric value or expression>",');
  }
  lines.push('  "confidence": "<high | medium | low>",');
  lines.push(
    '  "concerns": "<any issue you noticed with the question: ambiguous wording, two equally-valid answers, missing figure, etc — or empty if fine>"'
  );
  lines.push("}");
  return lines.join("\n");
}

async function callGemini(modelName, prompt, imageBytes) {
  const parts = [];
  if (imageBytes) {
    parts.push({
      inline_data: { mime_type: imageBytes.mime, data: imageBytes.buf.toString("base64") },
    });
  }
  parts.push({ text: prompt });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await geminiGenerate(modelName, parts);
    } catch (err) {
      const msg = String(err);
      if (msg.includes("DAILY QUOTA EXHAUSTED")) throw err;
      if (attempt === 2) throw err;
      const wait = err.retryAfterMs ?? 5000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

function parseSolveResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeAnswer(ans, isSpr) {
  if (!ans) return "";
  const t = String(ans).trim();
  if (!isSpr) {
    // Single letter MC
    const m = t.match(/[A-D]/i);
    return m ? m[0].toUpperCase() : t;
  }
  // SPR — strip spaces/parens/punctuation that differ stylistically
  return t.replace(/[\s$(),]/g, "");
}

function answersAgree(stored, judged, isSpr) {
  const s = normalizeAnswer(stored, isSpr);
  const j = normalizeAnswer(judged, isSpr);
  if (!s || !j) return false;
  if (!isSpr) return s === j;
  // SPR — numeric equality within rounding
  const sN = parseFloat(s);
  const jN = parseFloat(j);
  if (!Number.isNaN(sN) && !Number.isNaN(jN)) {
    return Math.abs(sN - jN) < 1e-6;
  }
  return s === j;
}

// ── Main ──
async function main() {
  let rows = [];
  if (FROM_DB) {
    rows = await loadFromDb();
  } else {
    for (const p of csvPaths) {
      const data = await loadFromCsv(p);
      data.forEach((d) => rows.push({ ...d, _source: p }));
    }
  }
  if (LIMIT) rows = rows.slice(0, LIMIT);

  console.log(`grader plan : ${rows.length} rows`);
  console.log(`pass 1 model: ${FLASH_MODEL}`);
  console.log(`pass 2 model: ${PRO_MODEL} (disagreements only)`);
  console.log("");

  const results = [];
  // ── Pass 1: Flash blind-grade ──
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isSpr = row.question_format === "numeric_entry";
    if (!row.question_text) {
      results.push({ row_idx: i + 1, id: row.id, source: row._source, verdict: "skip_no_text" });
      continue;
    }
    process.stdout.write(`[flash] row ${i + 1}/${rows.length} (p${row.source_page ?? "?"})… `);

    const imageBytes = row.image_url ? await fetchImageBytes(row.image_url) : null;
    let raw;
    try {
      raw = await callGemini(FLASH_MODEL, buildSolvePrompt(row), imageBytes);
    } catch (err) {
      console.log(`ERROR: ${String(err).slice(0, 100)}`);
      results.push({
        row_idx: i + 1,
        id: row.id,
        source: row._source,
        verdict: "error",
        error: String(err).slice(0, 200),
      });
      // If quota exhausted, stop — no point continuing.
      if (String(err).includes("DAILY QUOTA EXHAUSTED")) {
        console.log("Stopping due to quota exhaustion.");
        break;
      }
      continue;
    }
    const parsed = parseSolveResponse(raw);
    if (!parsed) {
      console.log("parse fail");
      results.push({
        row_idx: i + 1,
        id: row.id,
        source: row._source,
        verdict: "error",
        error: "json parse",
      });
      continue;
    }
    const stored = row.correct_answer;
    const judged = parsed.answer || "";
    const agree = answersAgree(stored, judged, isSpr);
    const verdict = agree ? "verified" : "flash_disagree";
    process.stdout.write(`stored=${stored} flash=${judged} → ${verdict}`);
    if (parsed.confidence === "low") process.stdout.write(" (low conf)");
    if (parsed.concerns) process.stdout.write(` ⚠ ${parsed.concerns.slice(0, 60)}`);
    process.stdout.write("\n");

    results.push({
      row_idx: i + 1,
      id: row.id,
      source: row._source,
      source_pdf: row.source_pdf,
      source_page: row.source_page,
      domain: row.domain,
      question_text_snippet: row.question_text.slice(0, 200),
      stored,
      flash_answer: judged,
      flash_reasoning: parsed.reasoning ?? "",
      flash_confidence: parsed.confidence ?? "",
      flash_concerns: parsed.concerns ?? "",
      verdict,
    });
  }

  // ── Pass 2: Pro tie-break on disagreements ──
  const disagreements = results.filter((r) => r.verdict === "flash_disagree");
  console.log("");
  console.log(
    `Pass 1 done. ${results.filter((r) => r.verdict === "verified").length} verified, ${disagreements.length} disagreements.`
  );
  if (disagreements.length === 0) {
    // Save and exit early.
    await writeReports(results);
    return;
  }
  console.log(
    `Pass 2: tie-breaking ${disagreements.length} disagreements with ${PRO_MODEL} (free-tier daily limit ~25).`
  );
  console.log("");

  let proCalls = 0;
  for (const d of disagreements) {
    // Lookup the original row.
    const row = rows.find((r, idx) => idx + 1 === d.row_idx);
    if (!row) continue;
    const isSpr = row.question_format === "numeric_entry";
    process.stdout.write(`[pro] row ${d.row_idx} (p${row.source_page ?? "?"})… `);
    const imageBytes = row.image_url ? await fetchImageBytes(row.image_url) : null;
    let raw;
    try {
      raw = await callGemini(PRO_MODEL, buildSolvePrompt(row), imageBytes);
      proCalls++;
    } catch (err) {
      const msg = String(err).slice(0, 200);
      console.log(`ERROR: ${msg}`);
      d.pro_error = msg;
      if (msg.includes("DAILY QUOTA EXHAUSTED")) {
        console.log("Pro daily quota exhausted; remaining disagreements left unverified.");
        d.verdict = "uncertain";
        break;
      }
      continue;
    }
    const parsed = parseSolveResponse(raw);
    if (!parsed) {
      console.log("parse fail");
      d.verdict = "uncertain";
      continue;
    }
    const judgedPro = parsed.answer || "";
    const agreeWithStored = answersAgree(d.stored, judgedPro, isSpr);
    d.pro_answer = judgedPro;
    d.pro_reasoning = parsed.reasoning ?? "";
    d.pro_confidence = parsed.confidence ?? "";
    if (agreeWithStored) {
      d.verdict = "verified_pro";
      process.stdout.write(`pro=${judgedPro} (agrees with stored) → verified_pro\n`);
    } else {
      d.verdict = "likely_wrong";
      process.stdout.write(`pro=${judgedPro} (also disagrees) → likely_wrong\n`);
    }
  }

  console.log("");
  console.log(`Used ${proCalls} Pro calls (free tier ~25 RPD).`);
  await writeReports(results);
}

async function writeReports(results) {
  const outDir = "audit-out";
  await mkdir(outDir, { recursive: true });

  await writeFile(path.join(outDir, "grader-report.json"), JSON.stringify(results, null, 2));

  const md = [];
  md.push(`# LLM grader report\n`);
  md.push(`**Generated**: ${new Date().toISOString()}\n`);
  md.push(`**Total rows graded**: ${results.length}\n`);

  const tally = {};
  for (const r of results) tally[r.verdict] = (tally[r.verdict] ?? 0) + 1;

  md.push(`\n## Verdict summary\n`);
  md.push(`| Verdict | Count | Meaning |`);
  md.push(`|---|---|---|`);
  const meanings = {
    verified: "Flash agreed with stored answer (high confidence)",
    verified_pro: "Flash disagreed but Pro agreed with stored (dismiss)",
    likely_wrong: "BOTH Flash and Pro disagree with stored — STRONG signal stored is wrong",
    flash_disagree: "Flash disagreed and Pro didn't get to verify (uncertain)",
    uncertain: "Pro couldn't complete tie-break (quota exhausted or parse failed)",
    skip_no_text: "Skipped — no question text",
    error: "API or parse error",
  };
  for (const v of Object.keys(meanings)) {
    if (tally[v]) md.push(`| \`${v}\` | ${tally[v]} | ${meanings[v]} |`);
  }
  md.push("");

  // ── Section: likely_wrong (real problems) ──
  const likelyWrong = results.filter((r) => r.verdict === "likely_wrong");
  if (likelyWrong.length) {
    md.push(`## 🚨 Likely-wrong stored answers (${likelyWrong.length})\n`);
    md.push(
      `These are questions where BOTH Gemini Flash and Gemini Pro independently solved the question and BOTH disagreed with the stored \`correct_answer\`. Strong candidates for manual review and correction.\n`
    );
    for (const r of likelyWrong) {
      md.push(`### Row ${r.row_idx} — \`${r.id ?? r.source}#${r.row_idx}\``);
      md.push(`**Source:** ${r.source_pdf} p${r.source_page} · ${r.domain}`);
      md.push(
        `**Stored answer:** \`${r.stored}\`  **Flash:** \`${r.flash_answer}\`  **Pro:** \`${r.pro_answer}\`  `
      );
      md.push(`**Question:** ${r.question_text_snippet}…`);
      md.push(`**Flash reasoning:** ${r.flash_reasoning}`);
      md.push(`**Pro reasoning:** ${r.pro_reasoning}`);
      if (r.flash_concerns) md.push(`**Flash concerns:** ${r.flash_concerns}`);
      md.push("");
    }
  }

  // ── Section: uncertain (no pro tiebreak) ──
  const uncertain = results.filter(
    (r) => r.verdict === "flash_disagree" || r.verdict === "uncertain"
  );
  if (uncertain.length) {
    md.push(`\n## ⚠️ Uncertain — Flash disagreed, Pro didn't verify (${uncertain.length})\n`);
    md.push(`These need a second-pass run with Pro available, OR manual review.\n`);
    for (const r of uncertain.slice(0, 40)) {
      md.push(
        `- Row ${r.row_idx} (p${r.source_page}, ${r.domain}): stored=\`${r.stored}\` flash=\`${r.flash_answer}\` — ${r.question_text_snippet.slice(0, 110)}…`
      );
    }
    if (uncertain.length > 40) md.push(`\n_... and ${uncertain.length - 40} more._`);
  }

  // ── Section: concerns even when answer agreed ──
  const concerns = results.filter(
    (r) => r.verdict === "verified" && r.flash_concerns && r.flash_concerns.length > 4
  );
  if (concerns.length) {
    md.push(`\n## 💬 Quality concerns on verified answers (${concerns.length})\n`);
    md.push(
      `Questions where Flash got the same answer as stored, BUT raised a quality concern about the question itself (ambiguous wording, missing figure, etc).\n`
    );
    for (const r of concerns.slice(0, 30)) {
      md.push(
        `- Row ${r.row_idx} (p${r.source_page}): ${r.flash_concerns}  \n  _q:_ ${r.question_text_snippet.slice(0, 110)}…`
      );
    }
    if (concerns.length > 30) md.push(`\n_... and ${concerns.length - 30} more._`);
  }

  await writeFile(path.join(outDir, "grader-report.md"), md.join("\n"));

  console.log("");
  console.log(`Reports:`);
  console.log(`  ${path.join(outDir, "grader-report.md")}`);
  console.log(`  ${path.join(outDir, "grader-report.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
