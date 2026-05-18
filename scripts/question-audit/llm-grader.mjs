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

// Groq fallback — only used when Gemini Flash parse-fails after a
// retry without image (typically a RECITATION-filter trip on
// passage-heavy SAT content). Free tier on Groq has generous quota
// and the Llama models don't have an equivalent recitation filter.
//
// Gracefully degrades: if GROQ_API_KEY isn't set, fallback is
// silently skipped and the row is recorded as error.
const groqKey = process.env.GROQ_API_KEY;
const LLAMA_MODEL = "llama-3.3-70b-versatile";

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

// Groq Llama call via OpenAI-compatible chat completions. Text-only;
// Llama 3.3 is not vision-capable. The fallback path strips images
// anyway since RECITATION fires hardest with vision+text combined.
async function groqGenerate(prompt) {
  if (!groqKey) return null;
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const body = {
    model: LLAMA_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 2048,
    response_format: { type: "json_object" },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    if (res.status === 429) {
      throw new Error(`GROQ QUOTA EXHAUSTED: ${errBody.slice(0, 200)}`);
    }
    throw new Error(`Groq HTTP ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
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

  // ── Pass 1: Blind-grade with cascading fallbacks ──
  //   Stage A: Flash WITH image
  //   Stage B: Flash WITHOUT image (RECITATION fires hardest on
  //            vision+text combined)
  //   Stage C: Groq Llama 3.3 (no vision) — different model family,
  //            no RECITATION filter, fills the Gemini blind spot
  //
  // Returns { parsed, source } where source ∈ {flash, flash_no_image,
  // llama}.  Returns null if all three stages fail.
  async function solveWithFallback(row) {
    const isSpr = row.question_format === "numeric_entry";
    const prompt = buildSolvePrompt(row);
    const imageBytes = row.image_url ? await fetchImageBytes(row.image_url) : null;

    // Stage A — Flash with image
    if (imageBytes) {
      try {
        const raw = await callGemini(FLASH_MODEL, prompt, imageBytes);
        const parsed = parseSolveResponse(raw);
        if (parsed && parsed.answer) return { parsed, source: "flash" };
      } catch (err) {
        if (String(err).includes("DAILY QUOTA EXHAUSTED")) throw err;
      }
    }

    // Stage B — Flash without image
    try {
      const raw = await callGemini(FLASH_MODEL, prompt, null);
      const parsed = parseSolveResponse(raw);
      if (parsed && parsed.answer) {
        return {
          parsed,
          source: imageBytes ? "flash_no_image" : "flash",
        };
      }
    } catch (err) {
      if (String(err).includes("DAILY QUOTA EXHAUSTED")) throw err;
    }

    // Stage C — Llama via Groq (text-only)
    if (groqKey) {
      try {
        const raw = await groqGenerate(prompt);
        if (raw) {
          const parsed = parseSolveResponse(raw);
          if (parsed && parsed.answer) return { parsed, source: "llama" };
        }
      } catch (err) {
        if (String(err).includes("GROQ QUOTA EXHAUSTED")) {
          console.log("\n  Groq quota exhausted; remaining Llama fallbacks will be skipped.");
        }
      }
    }

    return null;
    // Note: isSpr is captured by caller; not used inside the helper.
    void isSpr;
  }

  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isSpr = row.question_format === "numeric_entry";
    if (!row.question_text) {
      results.push({ row_idx: i + 1, id: row.id, source: row._source, verdict: "skip_no_text" });
      continue;
    }
    process.stdout.write(`[grade] row ${i + 1}/${rows.length} (p${row.source_page ?? "?"})… `);

    let solved;
    try {
      solved = await solveWithFallback(row);
    } catch (err) {
      console.log(`ERROR: ${String(err).slice(0, 100)}`);
      results.push({
        row_idx: i + 1,
        id: row.id,
        source: row._source,
        verdict: "error",
        error: String(err).slice(0, 200),
      });
      if (String(err).includes("DAILY QUOTA EXHAUSTED")) {
        console.log("Stopping due to quota exhaustion.");
        break;
      }
      continue;
    }

    if (!solved) {
      console.log("all stages failed (Flash+image, Flash text-only, Llama)");
      results.push({
        row_idx: i + 1,
        id: row.id,
        source: row._source,
        source_pdf: row.source_pdf,
        source_page: row.source_page,
        domain: row.domain,
        question_text_snippet: row.question_text.slice(0, 200),
        stored: row.correct_answer,
        verdict: "error",
        error: "all solver stages failed",
      });
      continue;
    }

    const { parsed, source: solver } = solved;
    const stored = row.correct_answer;
    const judged = parsed.answer || "";
    const agree = answersAgree(stored, judged, isSpr);
    const verdict = agree ? "verified" : "flash_disagree";
    const solverTag = solver === "flash" ? "" : `[${solver}] `;
    process.stdout.write(`${solverTag}stored=${stored} judged=${judged} → ${verdict}`);
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
      pass1_solver: solver, // flash | flash_no_image | llama
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

  // ── Pass 3: figure-coherence check ────────────────────────
  // For every row with an attached image_url, ask Flash: "does this
  // figure depict what the question describes?". Catches:
  //   · Stage 3 attached the wrong page's figure to this row
  //   · The figure is partially cropped / missing key elements
  //   · The figure's content contradicts the question text
  // Inexpensive — ~1 extra Flash call per figure-bearing row.
  const figureRows = rows
    .map((r, i) => ({ i, r, result: results[i] }))
    .filter(({ r, result }) => r.image_url && result && result.verdict !== "skip_no_text");

  if (figureRows.length > 0) {
    console.log("");
    console.log(`Pass 3: figure-coherence check on ${figureRows.length} figure-bearing rows…`);
    for (const { i, r, result } of figureRows) {
      const imageBytes = await fetchImageBytes(r.image_url);
      if (!imageBytes) continue;
      process.stdout.write(`[fig] row ${i + 1} (p${r.source_page})… `);
      const prompt = buildFigurePrompt(r);
      let raw;
      try {
        raw = await callGemini(FLASH_MODEL, prompt, imageBytes);
      } catch (err) {
        const msg = String(err).slice(0, 100);
        console.log(`ERROR: ${msg}`);
        result.figure_check_error = msg;
        if (msg.includes("DAILY QUOTA EXHAUSTED")) {
          console.log("Stopping figure check due to quota exhaustion.");
          break;
        }
        continue;
      }
      const parsed = parseSolveResponse(raw);
      if (!parsed) {
        console.log("parse fail");
        result.figure_check_error = "json parse";
        continue;
      }
      const matches = (parsed.figure_matches || "").toLowerCase();
      const crop = (parsed.crop_quality || "").toLowerCase();
      const issues = parsed.issues || "";
      result.figure_matches = matches;
      result.figure_crop_quality = crop;
      result.figure_issues = issues;
      if (matches === "no" || crop === "poor") {
        process.stdout.write(`FAIL matches=${matches} crop=${crop}`);
        if (issues) process.stdout.write(` ⚠ ${issues.slice(0, 60)}`);
        process.stdout.write("\n");
        if (result.verdict === "verified" || result.verdict === "verified_pro") {
          result.verdict_secondary = "figure_mismatch";
        }
      } else if (matches === "partial") {
        process.stdout.write(`partial`);
        if (issues) process.stdout.write(` ⚠ ${issues.slice(0, 60)}`);
        process.stdout.write("\n");
      } else {
        process.stdout.write(`ok\n`);
      }
    }
  }

  // ── Pass 4: explanation-consistency check ────────────────
  // For every row where the answer was verified (Flash agreed
  // with stored, or Pro confirmed stored), ask: "does the stored
  // explanation_text actually support the stored answer?". Catches:
  //   · Explanation walks through wrong work but happens to land
  //     on the right letter
  //   · Per-choice references (e.g. "Choice A is correct because…")
  //     when the answer is actually B
  //   · Explanations that contradict their own conclusion
  //
  // Runs Flash first (free quota). Flagged rows are escalated to
  // Pro for confirmation only if Pro quota remains. The Pro
  // confirmation is what marks the row as "explanation_broken".
  const verifiedRows = rows
    .map((r, i) => ({ i, r, result: results[i] }))
    .filter(
      ({ r, result }) =>
        result &&
        (result.verdict === "verified" || result.verdict === "verified_pro") &&
        r.explanation_text &&
        r.explanation_text.length > 20
    );

  if (verifiedRows.length > 0) {
    console.log("");
    console.log(
      `Pass 4: explanation-consistency check on ${verifiedRows.length} verified rows (Flash)…`
    );
    const flashFlagged = [];
    for (const { i, r, result } of verifiedRows) {
      process.stdout.write(`[expl] row ${i + 1} (p${r.source_page})… `);
      const prompt = buildExplanationCheckPrompt(r);
      let raw;
      try {
        raw = await callGemini(FLASH_MODEL, prompt, null);
      } catch (err) {
        const msg = String(err).slice(0, 100);
        console.log(`ERROR: ${msg}`);
        result.explanation_check_error = msg;
        if (msg.includes("DAILY QUOTA EXHAUSTED")) {
          console.log("Stopping explanation check due to quota exhaustion.");
          break;
        }
        continue;
      }
      const parsed = parseSolveResponse(raw);
      if (!parsed) {
        console.log("parse fail");
        result.explanation_check_error = "json parse";
        continue;
      }
      const supports = (parsed.supports_answer || "").toLowerCase();
      result.flash_explanation_supports = supports;
      result.flash_explanation_issues = parsed.issues || "";
      if (supports === "no" || supports === "partial") {
        process.stdout.write(`${supports}`);
        if (parsed.issues) process.stdout.write(` ⚠ ${parsed.issues.slice(0, 60)}`);
        process.stdout.write("\n");
        flashFlagged.push({ i, r, result });
      } else {
        process.stdout.write(`ok\n`);
      }
    }

    // Pro confirmation on Flash-flagged rows
    if (flashFlagged.length > 0) {
      console.log("");
      console.log(
        `Pass 4b: Pro confirmation on ${flashFlagged.length} explanation-flagged rows (limit ~25/day)…`
      );
      for (const { i, r, result } of flashFlagged) {
        process.stdout.write(`[expl-pro] row ${i + 1} (p${r.source_page})… `);
        let raw;
        try {
          raw = await callGemini(PRO_MODEL, buildExplanationCheckPrompt(r), null);
        } catch (err) {
          const msg = String(err).slice(0, 100);
          console.log(`ERROR: ${msg}`);
          if (msg.includes("DAILY QUOTA EXHAUSTED")) {
            console.log("Pro quota exhausted; remaining flags left uncertain.");
            break;
          }
          continue;
        }
        const parsed = parseSolveResponse(raw);
        if (!parsed) {
          console.log("parse fail");
          continue;
        }
        const supports = (parsed.supports_answer || "").toLowerCase();
        result.pro_explanation_supports = supports;
        result.pro_explanation_issues = parsed.issues || "";
        if (supports === "no") {
          process.stdout.write(`broken`);
          if (parsed.issues) process.stdout.write(` ⚠ ${parsed.issues.slice(0, 60)}`);
          process.stdout.write("\n");
          // Add secondary verdict — keeps the original verdict so
          // we know the ANSWER was verified but the EXPLANATION is bad.
          result.verdict_secondary = result.verdict_secondary
            ? result.verdict_secondary + "+explanation_broken"
            : "explanation_broken";
        } else if (supports === "partial") {
          process.stdout.write(`partial (Pro)\n`);
        } else {
          process.stdout.write(`ok (Pro overruled Flash)\n`);
        }
      }
    }
  }

  // ── Pass 5: well-formedness check ──────────────────────────
  // Independent of the answer, ask Flash whether the question itself
  // is well-formed. Catches OCR errors the answer-letter grader
  // silently auto-corrected: missing exponents, missing parens,
  // truncated stems, ambiguous wording.
  //
  // Run on every gradable row (not just disagreements). The Flash
  // quota easily covers 94 extra calls per test.
  const gradableRows = rows
    .map((r, i) => ({ i, r, result: results[i] }))
    .filter(
      ({ r, result }) =>
        result &&
        result.verdict !== "skip_no_text" &&
        r.question_text &&
        r.question_text.length > 10
    );

  if (gradableRows.length > 0) {
    console.log("");
    console.log(`Pass 5: well-formedness check on ${gradableRows.length} rows…`);
    for (const { i, r, result } of gradableRows) {
      process.stdout.write(`[form] row ${i + 1} (p${r.source_page})… `);
      let raw;
      try {
        raw = await callGemini(FLASH_MODEL, buildWellFormedPrompt(r), null);
      } catch (err) {
        const msg = String(err).slice(0, 100);
        console.log(`ERROR: ${msg}`);
        if (msg.includes("DAILY QUOTA EXHAUSTED")) {
          console.log("Stopping well-formedness check due to quota.");
          break;
        }
        result.wellformed_check_error = msg;
        continue;
      }
      const parsed = parseSolveResponse(raw);
      if (!parsed) {
        console.log("parse fail");
        result.wellformed_check_error = "json parse";
        continue;
      }
      const wf = (parsed.well_formed || "").toLowerCase();
      const issues = parsed.specific_issues || "";
      result.well_formed = wf;
      result.well_formed_issues = issues;
      if (wf === "no") {
        process.stdout.write(`ILL-FORMED`);
        if (issues) process.stdout.write(` ⚠ ${issues.slice(0, 60)}`);
        process.stdout.write("\n");
        result.verdict_secondary = result.verdict_secondary
          ? result.verdict_secondary + "+ill_formed"
          : "ill_formed";
      } else if (wf === "partial") {
        process.stdout.write(`partial`);
        if (issues) process.stdout.write(` ⚠ ${issues.slice(0, 60)}`);
        process.stdout.write("\n");
      } else {
        process.stdout.write(`ok\n`);
      }
    }
  }

  // ── Pass 7: vision cross-check on flagged rows ─────────────
  // For any row flagged by Pass 5 (ill-formed) OR with an open
  // disagreement (Flash and Pro both unsure), render the source
  // PDF page and ask vision LLM to compare. Catches OCR-level
  // mismatches between what's in the PDF and what was extracted
  // into the CSV.
  //
  // Skipped if running --from-db (page PNGs aren't available);
  // CSV mode only for v1.
  const pageRoot = FROM_DB ? null : "question-imports/extract-out";
  if (pageRoot) {
    const visionTargets = rows
      .map((r, i) => ({ i, r, result: results[i] }))
      .filter(
        ({ result }) =>
          result &&
          (result.well_formed === "no" ||
            result.well_formed === "partial" ||
            result.verdict === "likely_wrong" ||
            result.verdict === "uncertain" ||
            (result.figure_matches && result.figure_matches !== "yes"))
      );

    if (visionTargets.length > 0) {
      console.log("");
      console.log(
        `Pass 7: vision cross-check on ${visionTargets.length} flagged rows (compare CSV → source page)…`
      );
      for (const { i, r, result } of visionTargets) {
        if (!r.source_pdf || !r.source_page) continue;
        const pdfStem = r.source_pdf.replace(/\.pdf$/i, "");
        const pagePath = `${pageRoot}/${pdfStem}/page-${String(r.source_page).padStart(3, "0")}.png`;
        const pageBytes = await fetchImageBytesFromPath(pagePath);
        if (!pageBytes) {
          // Page PNG not on disk (e.g., extract-out cleaned up).
          // Mark as un-cross-checked but don't error.
          result.vision_check_error = "page PNG not found";
          continue;
        }
        process.stdout.write(`[diff] row ${i + 1} (p${r.source_page})… `);
        let raw;
        try {
          raw = await callGemini(FLASH_MODEL, buildVisionDiffPrompt(r), pageBytes);
        } catch (err) {
          const msg = String(err).slice(0, 100);
          console.log(`ERROR: ${msg}`);
          if (msg.includes("DAILY QUOTA EXHAUSTED")) {
            console.log("Stopping vision cross-check due to quota.");
            break;
          }
          result.vision_check_error = msg;
          continue;
        }
        const parsed = parseSolveResponse(raw);
        if (!parsed) {
          console.log("parse fail");
          result.vision_check_error = "json parse";
          continue;
        }
        const matches = (parsed.transcription_matches || "").toLowerCase();
        const diffs = parsed.transcription_diffs || "";
        result.vision_transcription_matches = matches;
        result.vision_transcription_diffs = diffs;
        if (matches === "no") {
          process.stdout.write(`DIFFERS`);
          if (diffs) process.stdout.write(` ⚠ ${diffs.slice(0, 60)}`);
          process.stdout.write("\n");
          result.verdict_secondary = result.verdict_secondary
            ? result.verdict_secondary + "+ocr_mismatch"
            : "ocr_mismatch";
        } else if (matches === "partial") {
          process.stdout.write(`partial`);
          if (diffs) process.stdout.write(` ⚠ ${diffs.slice(0, 60)}`);
          process.stdout.write("\n");
        } else {
          process.stdout.write(`ok\n`);
        }
      }
    }
  }

  await writeReports(results);
}

// Helper: read a PNG from disk and return {mime, buf} for vision input.
async function fetchImageBytesFromPath(filepath) {
  try {
    const buf = await readFile(filepath);
    return { mime: "image/png", buf };
  } catch {
    return null;
  }
}

// ── Pass 5 (well-formedness) prompt ──
function buildWellFormedPrompt(row) {
  const isMc = row.question_format !== "numeric_entry";
  const lines = [];
  lines.push(
    "You are reviewing whether an SAT question is WELL-FORMED — independent of the answer."
  );
  lines.push("");
  lines.push(
    "Look for transcription bugs from the OCR/extraction pipeline that make the question ambiguous, incomplete, or unsolvable as written. Examples of ill-formed:"
  );
  lines.push("  · Math expression missing a parenthesis: '3x + 5 = 2x + 8'   (OK)");
  lines.push("                                          '3x + 5 = 2x +'    (truncated)");
  lines.push("  · Missing exponent: 'x2 + 5x = 37' instead of 'x^2 + 5x = 37'");
  lines.push("  · Missing operator: '3x  + = 12'");
  lines.push(
    "  · Question references a quantity that is never defined: 'What is the value of b?' when b is not in the equation"
  );
  lines.push(
    "  · Question references a figure that isn't attached AND can't be inferred from text"
  );
  lines.push("  · Question stem ends mid-sentence");
  lines.push("  · Two answer choices have identical text (within the visible part)");
  lines.push("  · Choices use inconsistent units / formats that obscure the question");
  lines.push("");
  if (row.passage_intro) lines.push("PASSAGE INTRO: " + row.passage_intro);
  if (row.passage) lines.push("PASSAGE: " + row.passage);
  if (row.passage_a)
    lines.push("PASSAGE A: " + row.passage_a + "\nPASSAGE B: " + (row.passage_b || ""));
  lines.push("");
  lines.push("QUESTION TEXT: " + row.question_text);
  if (isMc) {
    lines.push("");
    lines.push("CHOICES:");
    lines.push(`A) ${row.choice_a}`);
    lines.push(`B) ${row.choice_b}`);
    lines.push(`C) ${row.choice_c}`);
    lines.push(`D) ${row.choice_d}`);
  }
  lines.push("");
  lines.push(
    "Is the question well-formed? Could a careful student be confident they're reading what was intended? Do NOT comment on whether the answer is correct — focus on whether the QUESTION makes sense as written."
  );
  lines.push("");
  lines.push("Respond in JSON:");
  lines.push("{");
  lines.push('  "well_formed": "yes" | "partial" | "no",');
  lines.push(
    '  "specific_issues": "<list any OCR/transcription issues you can identify, or empty>"'
  );
  lines.push("}");
  return lines.join("\n");
}

// ── Pass 7 (vision cross-check) prompt ──
// The user message includes BOTH the rendered page PNG AND the
// extracted question_text. We ask the vision LLM to diff them.
function buildVisionDiffPrompt(row) {
  const isMc = row.question_format !== "numeric_entry";
  const lines = [];
  lines.push(
    "Compare the text our pipeline EXTRACTED below against what's actually visible on the attached PDF page image."
  );
  lines.push("");
  lines.push("EXTRACTED QUESTION TEXT:");
  lines.push(row.question_text);
  if (isMc) {
    lines.push("");
    lines.push("EXTRACTED CHOICES:");
    lines.push(`A) ${row.choice_a}`);
    lines.push(`B) ${row.choice_b}`);
    lines.push(`C) ${row.choice_c}`);
    lines.push(`D) ${row.choice_d}`);
  }
  lines.push("");
  lines.push(
    "Look at the attached page image and identify any differences between what you SEE on the page and the EXTRACTED text above. Common issues:"
  );
  lines.push("  · Missing exponents (page shows 'x²' but extracted has 'x2')");
  lines.push("  · Missing parens, commas, or operators");
  lines.push("  · Truncated text (extracted ends mid-sentence vs full sentence on page)");
  lines.push("  · Wrong variable names");
  lines.push("  · Choice ordering reversed");
  lines.push("");
  lines.push(
    "Note: the page may contain OTHER questions besides this one. Identify the question that MATCHES the extracted stem first (usually labeled with a question number), then diff."
  );
  lines.push("");
  lines.push("Respond in JSON:");
  lines.push("{");
  lines.push('  "transcription_matches": "yes" | "partial" | "no",');
  lines.push('  "transcription_diffs": "<list specific differences, or empty if matches>"');
  lines.push("}");
  return lines.join("\n");
}

// ── Pass 3 (figure coherence) prompt ──
function buildFigurePrompt(row) {
  return [
    "You are reviewing the figure attached to an SAT question for visual quality.",
    "",
    "QUESTION TEXT:",
    row.question_text,
    "",
    "The attached image is what the student will see in the figure slot.",
    "",
    "Answer these:",
    "1. Does the figure depict what the question describes?",
    "2. Is the crop clean (figure fully visible, no other questions' content bleeding in, no UI chrome captured)?",
    "3. Are key labels (axes, values, names) legible?",
    "",
    "Respond in JSON:",
    "{",
    '  "figure_matches": "yes" | "partial" | "no",',
    '  "crop_quality": "good" | "ok" | "poor",',
    '  "issues": "<specific issues if any, else empty>"',
    "}",
  ].join("\n");
}

// ── Pass 4 (explanation consistency) prompt ──
function buildExplanationCheckPrompt(row) {
  const isMc = row.question_format !== "numeric_entry";
  const lines = [];
  lines.push(
    "You are reviewing whether an SAT question's stored explanation correctly supports its stored answer."
  );
  lines.push("");
  if (row.passage_intro) lines.push("PASSAGE INTRO: " + row.passage_intro);
  if (row.passage) lines.push("PASSAGE: " + row.passage);
  if (row.passage_a)
    lines.push("PASSAGE A: " + row.passage_a + "\nPASSAGE B: " + (row.passage_b || ""));
  lines.push("");
  lines.push("QUESTION: " + row.question_text);
  if (isMc) {
    lines.push("");
    lines.push("CHOICES:");
    lines.push(`A) ${row.choice_a}`);
    lines.push(`B) ${row.choice_b}`);
    lines.push(`C) ${row.choice_c}`);
    lines.push(`D) ${row.choice_d}`);
  }
  lines.push("");
  lines.push("STORED CORRECT ANSWER: " + row.correct_answer);
  lines.push("");
  lines.push("STORED EXPLANATION:");
  lines.push(row.explanation_text);
  lines.push("");
  lines.push(
    "Does the explanation correctly support choosing the stored correct answer? Check for:"
  );
  lines.push("- The reasoning's conclusion matches the stored answer");
  lines.push("- The math/logic is correct");
  lines.push("- Per-choice references (if any) name the right letter");
  lines.push("- The explanation does not contradict itself");
  lines.push("");
  lines.push("Respond in JSON:");
  lines.push("{");
  lines.push('  "supports_answer": "yes" | "partial" | "no",');
  lines.push('  "issues": "<specific issues if any, else empty>"');
  lines.push("}");
  return lines.join("\n");
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

  // ── Section: figure-mismatch (Pass 3) ──
  const figMismatch = results.filter(
    (r) =>
      r.figure_matches === "no" ||
      r.figure_crop_quality === "poor" ||
      r.verdict_secondary?.includes("figure_mismatch")
  );
  if (figMismatch.length) {
    md.push(`\n## 🖼️ Figure mismatches (${figMismatch.length})\n`);
    md.push(
      `Rows where the attached figure doesn't match the question text OR was poorly cropped. Stage 3 may have attached the wrong figure or the crop captured non-figure content.\n`
    );
    for (const r of figMismatch) {
      md.push(
        `- Row ${r.row_idx} (p${r.source_page}, ${r.domain}): matches=\`${r.figure_matches}\` crop=\`${r.figure_crop_quality}\` — ${r.figure_issues || "(no specific issue text)"}  \n  _q:_ ${r.question_text_snippet.slice(0, 110)}…`
      );
    }
  }

  // ── Section: figure-partial (Pass 3 soft flag) ──
  const figPartial = results.filter(
    (r) => r.figure_matches === "partial" && !figMismatch.includes(r)
  );
  if (figPartial.length) {
    md.push(`\n## 🖼️ Figure partial matches (${figPartial.length})\n`);
    md.push(
      `Figures that partially match but have minor issues. Probably usable but worth a glance.\n`
    );
    for (const r of figPartial.slice(0, 20)) {
      md.push(`- Row ${r.row_idx} (p${r.source_page}): ${r.figure_issues || "minor mismatch"}`);
    }
    if (figPartial.length > 20) md.push(`\n_... and ${figPartial.length - 20} more._`);
  }

  // ── Section: explanation_broken (Pass 4, Pro-confirmed) ──
  const explBroken = results.filter((r) => r.pro_explanation_supports === "no");
  if (explBroken.length) {
    md.push(`\n## 📝 Broken explanations (${explBroken.length})\n`);
    md.push(
      `The stored \`correct_answer\` is verified correct, BUT the stored \`explanation_text\` doesn't actually support that answer. Could be: wrong reasoning leading to right letter, references to wrong choice letters, internal contradictions.\n`
    );
    for (const r of explBroken) {
      md.push(`### Row ${r.row_idx} — \`${r.id ?? r.source}#${r.row_idx}\``);
      md.push(`**Source:** ${r.source_pdf} p${r.source_page} · ${r.domain}`);
      md.push(
        `**Stored answer:** \`${r.stored}\` (verified) **Pro verdict:** explanation does NOT support`
      );
      md.push(`**Pro issues:** ${r.pro_explanation_issues || "(unspecified)"}`);
      md.push(`**Question:** ${r.question_text_snippet}…`);
      md.push("");
    }
  }

  // ── Section: explanation_partial (Flash-only flag, Pro unavailable) ──
  const explPartial = results.filter(
    (r) =>
      r.flash_explanation_supports &&
      (r.flash_explanation_supports === "no" || r.flash_explanation_supports === "partial") &&
      !r.pro_explanation_supports
  );
  if (explPartial.length) {
    md.push(`\n## 📝 Explanations Flash flagged but Pro didn't verify (${explPartial.length})\n`);
    md.push(
      `Flash thinks the stored explanation doesn't support the stored answer. Pro tiebreak wasn't reached (quota or parse failure). Worth manual review.\n`
    );
    for (const r of explPartial.slice(0, 20)) {
      md.push(
        `- Row ${r.row_idx} (p${r.source_page}): flash=\`${r.flash_explanation_supports}\` — ${(r.flash_explanation_issues || "").slice(0, 100)}`
      );
    }
    if (explPartial.length > 20) md.push(`\n_... and ${explPartial.length - 20} more._`);
  }

  // ── Section: ill-formed questions (Pass 5) ──
  const illFormed = results.filter((r) => r.well_formed === "no");
  if (illFormed.length) {
    md.push(`\n## 🛠️ Ill-formed questions (${illFormed.length})\n`);
    md.push(
      `Pass 5 flagged these as having OCR/transcription bugs that make the question ambiguous, incomplete, or unsolvable AS WRITTEN. The stored answer may still be intended-correct, but the visible question doesn't make sense without fixing.\n`
    );
    for (const r of illFormed) {
      md.push(`### Row ${r.row_idx} — \`${r.id ?? r.source}#${r.row_idx}\``);
      md.push(`**Source:** ${r.source_pdf} p${r.source_page} · ${r.domain}`);
      md.push(`**Issues:** ${r.well_formed_issues || "(unspecified)"}`);
      md.push(`**Question:** ${r.question_text_snippet}…`);
      if (r.vision_transcription_matches === "no" || r.vision_transcription_matches === "partial") {
        md.push(`**Pass 7 vision diff vs source PDF:** ${r.vision_transcription_diffs}`);
      }
      md.push("");
    }
  }

  // ── Section: partial well-formedness ──
  const wfPartial = results.filter((r) => r.well_formed === "partial");
  if (wfPartial.length) {
    md.push(`\n## 🛠️ Questions with minor formatting issues (${wfPartial.length})\n`);
    md.push(`Pass 5 partial — the question is mostly OK but has minor issues worth checking.\n`);
    for (const r of wfPartial.slice(0, 30)) {
      md.push(
        `- Row ${r.row_idx} (p${r.source_page}): ${(r.well_formed_issues || "").slice(0, 120)}`
      );
    }
    if (wfPartial.length > 30) md.push(`\n_... and ${wfPartial.length - 30} more._`);
  }

  // ── Section: OCR mismatches (Pass 7) ──
  const ocrMismatch = results.filter((r) => r.vision_transcription_matches === "no");
  if (ocrMismatch.length) {
    md.push(`\n## 📷 OCR transcription mismatches (${ocrMismatch.length})\n`);
    md.push(
      `Pass 7 compared the extracted CSV text against the source PDF page and found a real diff. These are usually the root cause of ill-formed flags — the OCR/stage-2 extraction lost or mangled characters.\n`
    );
    for (const r of ocrMismatch) {
      md.push(`### Row ${r.row_idx} — \`${r.id ?? r.source}#${r.row_idx}\``);
      md.push(`**Source:** ${r.source_pdf} p${r.source_page}`);
      md.push(`**Diffs identified:** ${r.vision_transcription_diffs || "(unspecified)"}`);
      md.push(`**Extracted question:** ${r.question_text_snippet}…`);
      md.push("");
    }
  }

  // ── Section: solver-source breakdown (Pass 1 fallback transparency) ──
  const bySolver = {};
  for (const r of results) {
    const s = r.pass1_solver || "skipped/error";
    bySolver[s] = (bySolver[s] || 0) + 1;
  }
  md.push(`\n## 🔧 Solver-source breakdown\n`);
  md.push(
    `Which solver (Flash with image / Flash text-only / Llama) actually produced each row's answer. Visible into the fallback cascade.\n`
  );
  md.push(`| Solver | Count |`);
  md.push(`|---|---|`);
  for (const [s, n] of Object.entries(bySolver).sort((a, b) => b[1] - a[1])) {
    md.push(`| \`${s}\` | ${n} |`);
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
