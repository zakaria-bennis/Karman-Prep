// ============================================================
// multi-vote-grader — Option 2.5 grader for answer-key audit.
//
// Three-tier consensus model (per ADR #4 / session decision):
//
//   Pass 1 (every question)
//     Three independent voters in PARALLEL:
//       · Gemini 2.5 Flash       (vision-capable but text-only here)
//       · DeepSeek V3            (via OpenRouter)
//       · Llama 3.3 70B          (via Groq free tier)
//     Compute majority verdict from successful votes:
//       · unanimous              all valid voters agree
//       · majority               > half agree on one answer
//       · split                  no single answer holds a majority
//
//   Pass 2 (only when Pass 1 majority disagrees with stored)
//     Gemini 2.5 Pro independent solve.
//
//   Pass 3 (only when Pro ALSO disagrees with stored)
//     Claude Opus 4.7 final arbiter.
//
// Verdicts assigned per row:
//   verified              Pass 1 majority agreed with stored.
//   verified_pro          Pass 1 disagreed but Pro agreed.
//   verified_opus         Pro disagreed but Opus agreed.
//   likely_wrong          All three tiers disagree — key probably wrong.
//   uncertain_split       Pass 1 had no majority; no single tier
//                         was able to escalate cleanly.
//   uncertain_parse       Pass 2 or Pass 3 returned an unparseable response.
//   skip_no_text          Row had no question_text to solve.
//   error                 All Pass 1 voters errored AND no other tier ran.
//
// USAGE
//   node --env-file=.env.local \
//     scripts/question-audit/multi-vote-grader.mjs --from-db
//
//   # Or against a CSV:
//   node --env-file=.env.local scripts/question-audit/multi-vote-grader.mjs \
//     question-imports/done/202603asiav1.pdf-import.csv
//
//   # Cap during testing:
//   LIMIT=5 node --env-file=.env.local ... multi-vote-grader.mjs --from-db
//
// OUTPUT
//   audit-out/multi-vote-grader-report.json   per-row details
//   audit-out/multi-vote-grader-report.md     human summary
//
// COST per PDF (~98 questions)
//   Pass 1 (3 voters × 98 q):          ~$0.025
//   Pass 2 (Pro on ~5% disagree):      ~$0.013
//   Pass 3 (Opus on ~1% double-dis):   ~$0.050
//   ─────────────────────────────────────────
//   Total:                              ~$0.09/PDF
//
// PAIRS WITH the existing llm-grader.mjs which still handles
// figure-coherence + explanation-consistency checks separately.
// ============================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  callGemini,
  callDeepSeek,
  callGroq,
  callClaude,
  QuotaExhaustedError,
} from "../lib/llm-providers.mjs";

const args = process.argv.slice(2);
const FROM_DB = args.includes("--from-db");
const csvPaths = args.filter((a) => !a.startsWith("--"));
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;

if (!FROM_DB && csvPaths.length === 0) {
  console.error("Usage: multi-vote-grader.mjs <csv> | --from-db   (set LIMIT=N to cap)");
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("Set GEMINI_API_KEY in .env.local");
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY && !process.env.DEEPSEEK_API_KEY) {
  console.error("Set OPENROUTER_API_KEY (preferred) or DEEPSEEK_API_KEY in .env.local");
  process.exit(1);
}
if (!process.env.GROQ_API_KEY) {
  console.error("Set GROQ_API_KEY in .env.local (Llama 3.3 voter)");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY in .env.local (Opus arbiter)");
  process.exit(1);
}

const FLASH = "gemini-2.5-flash";
const PRO = "gemini-2.5-pro";
const OPUS = "claude-opus-4-7";

// ── CSV parser (RFC 4180-ish; same shape as existing audit scripts) ──
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
    headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });
}

async function loadFromCsv(filePath) {
  return parseCsv(await readFile(filePath, "utf-8"));
}

async function loadFromDb() {
  const { createClient } = await import("@supabase/supabase-js");
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supa
    .from("quiz_questions")
    .select("*, answer_choices(letter, choice_text)")
    .order("source_pdf")
    .order("source_page");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const cs = r.answer_choices || [];
    const get = (l) => (cs.find((c) => c.letter === l) || {}).choice_text ?? "";
    return {
      id: r.id,
      question_text: r.question_text ?? "",
      choice_a: get("A"),
      choice_b: get("B"),
      choice_c: get("C"),
      choice_d: get("D"),
      correct_answer: r.correct_answer ?? "",
      question_format: r.answer_format ?? "multiple_choice",
      passage_intro: r.passage_intro ?? "",
      passage: r.passage ?? "",
      passage_a: r.passage_a ?? "",
      passage_b: r.passage_b ?? "",
      source_pdf: r.source_pdf ?? "",
      source_page: r.source_page ?? null,
      domain: r.domain ?? "",
    };
  });
}

// ── Prompt construction (text-only, no vision) ──
function buildPrompt(row) {
  const isMc = row.question_format !== "numeric_entry";
  const lines = [
    "You are solving an SAT question. Work it out carefully step by step, then give your final answer.",
    "",
  ];
  if (row.passage_intro) lines.push("PASSAGE INTRO:", row.passage_intro, "");
  if (row.passage) lines.push("PASSAGE:", row.passage, "");
  if (row.passage_a) {
    lines.push("PASSAGE A:", row.passage_a, "");
    lines.push("PASSAGE B:", row.passage_b || "", "");
  }
  lines.push("QUESTION:", row.question_text, "");
  if (isMc) {
    lines.push("ANSWER CHOICES:");
    lines.push(`A) ${row.choice_a}`);
    lines.push(`B) ${row.choice_b}`);
    lines.push(`C) ${row.choice_c}`);
    lines.push(`D) ${row.choice_d}`);
    lines.push("");
  }
  lines.push("Return strict JSON:");
  if (isMc) {
    lines.push(
      '{ "reasoning": "<step-by-step, 2-4 sentences>", "answer": "<single letter A|B|C|D>", "confidence": "<high|medium|low>" }'
    );
  } else {
    lines.push(
      '{ "reasoning": "<step-by-step, 2-4 sentences>", "answer": "<numeric value>", "confidence": "<high|medium|low>" }'
    );
  }
  return lines.join("\n");
}

// ── Answer normalization (handles MC letter + SPR numeric equality) ──
function normalizeAnswer(ans, isSpr) {
  if (!ans) return "";
  const t = String(ans).trim();
  if (!isSpr) {
    const m = t.match(/[A-D]/i);
    return m ? m[0].toUpperCase() : t.toUpperCase();
  }
  return t.replace(/[\s$(),]/g, "");
}

function answersAgree(stored, judged, isSpr) {
  const s = normalizeAnswer(stored, isSpr);
  const j = normalizeAnswer(judged, isSpr);
  if (!s || !j) return false;
  if (!isSpr) return s === j;
  const sN = parseFloat(s);
  const jN = parseFloat(j);
  if (!Number.isNaN(sN) && !Number.isNaN(jN)) return Math.abs(sN - jN) < 1e-6;
  return s === j;
}

// ── Pass 1: parallel multi-vote ──
async function castVotes(row) {
  const prompt = buildPrompt(row);
  const voters = [
    {
      name: "flash",
      call: () =>
        callGemini({
          prompt,
          model: FLASH,
          json: true,
          maxOutputTokens: 1024,
          thinkingBudget: 0,
        }),
    },
    {
      name: "deepseek",
      call: () =>
        callDeepSeek({
          prompt,
          model: "deepseek-chat",
          json: true,
        }),
    },
    {
      name: "llama",
      call: () =>
        callGroq({
          prompt,
          model: "llama-3.3-70b-versatile",
          json: true,
        }),
    },
  ];
  const settled = await Promise.allSettled(voters.map((v) => v.call()));
  return settled.map((r, i) => ({
    voter: voters[i].name,
    ok: r.status === "fulfilled",
    answer: r.status === "fulfilled" ? (r.value?.answer ?? null) : null,
    confidence: r.status === "fulfilled" ? (r.value?.confidence ?? null) : null,
    reasoning: r.status === "fulfilled" ? (r.value?.reasoning ?? null) : null,
    error: r.status === "rejected" ? String(r.reason).slice(0, 200) : null,
  }));
}

function tallyVotes(votes, isSpr) {
  const valid = votes.filter((v) => v.ok && v.answer);
  if (valid.length === 0) {
    return { majority: null, consensus: "no_valid_votes", validCount: 0 };
  }
  const tally = new Map();
  for (const v of valid) {
    const key = normalizeAnswer(v.answer, isSpr);
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const [topAnswer, topCount] = sorted[0];
  if (topCount === valid.length) {
    return { majority: topAnswer, consensus: "unanimous", validCount: valid.length };
  }
  if (topCount > valid.length / 2) {
    return { majority: topAnswer, consensus: "majority", validCount: valid.length };
  }
  return { majority: null, consensus: "split", validCount: valid.length };
}

// ── Higher-tier single calls (Pass 2 Pro, Pass 3 Opus) ──
async function passProSolve(row) {
  return await callGemini({
    prompt: buildPrompt(row),
    model: PRO,
    json: true,
    maxOutputTokens: 2048,
  });
}

async function passOpusSolve(row) {
  return await callClaude({
    prompt: buildPrompt(row),
    model: OPUS,
    toolSchema: {
      type: "object",
      properties: {
        reasoning: { type: "string" },
        answer: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["answer", "confidence"],
    },
    maxTokens: 2048,
  });
}

// ── Main ──
async function main() {
  let rows = FROM_DB
    ? await loadFromDb()
    : (
        await Promise.all(
          csvPaths.map(async (p) => {
            const d = await loadFromCsv(p);
            return d.map((r) => ({ ...r, _source: p }));
          })
        )
      ).flat();

  if (LIMIT) rows = rows.slice(0, LIMIT);

  console.log(`multi-vote-grader plan: ${rows.length} rows`);
  console.log(`pass 1 voters: ${FLASH} + deepseek/v3 + llama-3.3-70b`);
  console.log(`pass 2:        ${PRO} (on Pass-1 disagreements)`);
  console.log(`pass 3:        ${OPUS} (on Pass-2 disagreements)`);
  console.log("");

  const results = [];

  // ── Pass 1 ──
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isSpr = row.question_format === "numeric_entry";
    const slot = `[${i + 1}/${rows.length}] p${row.source_page ?? "?"}`;

    if (!row.question_text) {
      results.push({ idx: i + 1, id: row.id, verdict: "skip_no_text" });
      continue;
    }
    process.stdout.write(`${slot} … `);

    let votes;
    try {
      votes = await castVotes(row);
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        console.log(`QUOTA EXHAUSTED on ${err.provider} — stopping Pass 1.`);
        break;
      }
      console.log(`ERROR ${String(err).slice(0, 60)}`);
      results.push({ idx: i + 1, id: row.id, verdict: "error", error: String(err).slice(0, 200) });
      continue;
    }

    const okCount = votes.filter((v) => v.ok).length;
    const { majority, consensus, validCount } = tallyVotes(votes, isSpr);
    const stored = row.correct_answer;

    const baseEntry = {
      idx: i + 1,
      id: row.id,
      source_pdf: row.source_pdf,
      source_page: row.source_page,
      domain: row.domain,
      stored,
      pass1: {
        // Include error text on failed voters so silent failures (auth
        // problems, malformed schemas, header issues) are visible in
        // the report instead of just showing ok=false with no clue.
        votes: votes.map((v) => ({
          voter: v.voter,
          ok: v.ok,
          answer: v.answer,
          ...(v.error ? { error: v.error } : {}),
        })),
        consensus,
        majority,
        valid_count: validCount,
      },
    };

    if (validCount === 0) {
      console.log("all Pass-1 voters failed");
      results.push({ ...baseEntry, verdict: "error", error: "all 3 voters errored" });
      continue;
    }

    if (consensus === "split") {
      // No majority — escalate to Pass 2 as if disagree
      process.stdout.write(
        `pass1=split (${votes
          .filter((v) => v.ok)
          .map((v) => `${v.voter}:${v.answer}`)
          .join(", ")}) → escalate to Pro\n`
      );
      results.push({ ...baseEntry, verdict: "pass1_split", needs_pass2: true });
      continue;
    }

    const agree = answersAgree(stored, majority, isSpr);
    if (agree) {
      const tag = consensus === "unanimous" ? "✓" : `✓ (${validCount}/3 majority)`;
      console.log(`${tag} stored=${stored} maj=${majority}`);
      results.push({ ...baseEntry, verdict: "verified" });
    } else {
      process.stdout.write(`stored=${stored} maj=${majority} → escalate to Pro\n`);
      results.push({ ...baseEntry, verdict: "pass1_disagree", needs_pass2: true });
    }
  }

  // ── Pass 2: Pro on Pass-1 disagreements + splits ──
  const pass2Candidates = results.filter((r) => r.needs_pass2);
  console.log("");
  console.log(
    `Pass 1 done. Verified: ${results.filter((r) => r.verdict === "verified").length}, ` +
      `Disagreements: ${results.filter((r) => r.verdict === "pass1_disagree").length}, ` +
      `Splits: ${results.filter((r) => r.verdict === "pass1_split").length}, ` +
      `Errors: ${results.filter((r) => r.verdict === "error").length}`
  );
  if (pass2Candidates.length === 0) {
    await writeReports(results);
    return;
  }
  console.log(`Pass 2: ${PRO} on ${pass2Candidates.length} cases…`);
  console.log("");

  let proCalls = 0;
  for (const r of pass2Candidates) {
    const row = rows[r.idx - 1];
    const isSpr = row.question_format === "numeric_entry";
    process.stdout.write(`[pro] ${r.idx} p${row.source_page ?? "?"}… `);
    let parsed;
    try {
      parsed = await passProSolve(row);
      proCalls++;
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        console.log(`QUOTA EXHAUSTED on Pro — remaining left as uncertain.`);
        r.verdict = "uncertain_parse";
        break;
      }
      console.log(`ERROR ${String(err).slice(0, 60)}`);
      r.verdict = "uncertain_parse";
      r.pass2 = { error: String(err).slice(0, 200) };
      continue;
    }
    const proAnswer = parsed?.answer || "";
    r.pass2 = { answer: proAnswer, confidence: parsed?.confidence };
    const agreeStored = answersAgree(r.stored, proAnswer, isSpr);
    if (agreeStored) {
      r.verdict = "verified_pro";
      console.log(`pro=${proAnswer} ✓ stored → verified_pro`);
    } else {
      r.verdict = "pass2_disagree";
      r.needs_pass3 = true;
      console.log(`pro=${proAnswer} ≠ stored → escalate to Opus`);
    }
  }

  // ── Pass 3: Opus on Pro disagreements ──
  const pass3Candidates = results.filter((r) => r.needs_pass3);
  console.log("");
  console.log(`Pass 2 done. Used ${proCalls} Pro calls.`);
  if (pass3Candidates.length === 0) {
    await writeReports(results);
    return;
  }
  console.log(`Pass 3: ${OPUS} arbiter on ${pass3Candidates.length} double-disagreements…`);
  console.log("");

  for (const r of pass3Candidates) {
    const row = rows[r.idx - 1];
    const isSpr = row.question_format === "numeric_entry";
    process.stdout.write(`[opus] ${r.idx} p${row.source_page ?? "?"}… `);
    let parsed;
    try {
      parsed = await passOpusSolve(row);
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        console.log(`QUOTA EXHAUSTED on Opus — remaining left uncertain.`);
        r.verdict = "uncertain_parse";
        break;
      }
      console.log(`ERROR ${String(err).slice(0, 60)}`);
      r.verdict = "uncertain_parse";
      r.pass3 = { error: String(err).slice(0, 200) };
      continue;
    }
    const opusAnswer = parsed?.answer || "";
    r.pass3 = { answer: opusAnswer, confidence: parsed?.confidence, reasoning: parsed?.reasoning };
    const agreeStored = answersAgree(r.stored, opusAnswer, isSpr);
    if (agreeStored) {
      r.verdict = "verified_opus";
      console.log(`opus=${opusAnswer} ✓ stored → verified_opus`);
    } else {
      r.verdict = "likely_wrong";
      console.log(`opus=${opusAnswer} ≠ stored → LIKELY_WRONG`);
    }
  }

  await writeReports(results);

  // Persist per-question grader_votes into the DB so the admin
  // review queue can render the per-LLM badges next to each row
  // without us having to read the JSON file. Only runs when we
  // queried from the DB (we know each row.id is a real uuid).
  if (FROM_DB) {
    await persistGraderVotesToDb(results);
  }
}

// ── Persist per-question verdicts back to quiz_questions.grader_votes
//    JSONB column (migration 20260523090000) ──
async function persistGraderVotesToDb(results) {
  const { createClient } = await import("@supabase/supabase-js");
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  console.log("");
  console.log(`Persisting grader_votes for ${results.length} rows…`);
  let ok = 0;
  let errored = 0;
  const gradedAt = new Date().toISOString();
  for (const r of results) {
    if (!r.id || r.verdict === "skip_no_text") continue;
    const pass1Votes = r.pass1?.votes ?? [];
    const flash = pass1Votes.find((v) => v.voter === "flash")?.answer ?? null;
    const deepseek = pass1Votes.find((v) => v.voter === "deepseek")?.answer ?? null;
    const llama = pass1Votes.find((v) => v.voter === "llama")?.answer ?? null;
    const votes = {
      graded_at: gradedAt,
      stored_answer: r.stored ?? null,
      verdict: r.verdict,
      pass1: {
        ...(flash != null ? { flash } : {}),
        ...(deepseek != null ? { deepseek } : {}),
        ...(llama != null ? { llama } : {}),
        ...(r.pass1?.consensus ? { consensus: r.pass1.consensus } : {}),
        ...(r.pass1?.majority ? { majority: r.pass1.majority } : {}),
      },
      ...(r.pass2?.answer ? { pass2_pro: r.pass2.answer } : {}),
      ...(r.pass3?.answer ? { pass3_opus: r.pass3.answer } : {}),
    };
    const { error } = await supa
      .from("quiz_questions")
      .update({ grader_votes: votes })
      .eq("id", r.id);
    if (error) {
      errored++;
      if (errored <= 3) console.log(`  ✗ ${r.id}: ${error.message}`);
    } else {
      ok++;
    }
  }
  console.log(`  → ${ok} rows updated, ${errored} errors.`);
}

// ── Report writers ──
async function writeReports(results) {
  await mkdir("audit-out", { recursive: true });
  await writeFile("audit-out/multi-vote-grader-report.json", JSON.stringify(results, null, 2));

  const lines = [];
  lines.push("# Multi-Vote Grader Report");
  lines.push("");
  lines.push(`Total: ${results.length}`);
  const byVerdict = {};
  for (const r of results) byVerdict[r.verdict] = (byVerdict[r.verdict] ?? 0) + 1;
  for (const [v, n] of Object.entries(byVerdict).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${v}: ${n}`);
  }
  lines.push("");
  lines.push("## Likely-wrong rows (three-tier consensus says key is incorrect)");
  lines.push("");
  const likelyWrong = results.filter((r) => r.verdict === "likely_wrong");
  if (likelyWrong.length === 0) {
    lines.push("_None — key is consistent across Flash/DeepSeek/Llama/Pro/Opus._");
  } else {
    for (const r of likelyWrong) {
      lines.push(`### Row ${r.idx} — ${r.source_pdf ?? "?"} p${r.source_page ?? "?"}`);
      lines.push(`- Stored: **${r.stored}**`);
      lines.push(
        `- Pass 1 votes: ${r.pass1.votes.map((v) => `${v.voter}=${v.ok ? v.answer : "ERR"}`).join(", ")}`
      );
      lines.push(`- Pro:  **${r.pass2?.answer ?? "?"}**`);
      lines.push(`- Opus: **${r.pass3?.answer ?? "?"}** (${r.pass3?.confidence ?? "?"})`);
      if (r.pass3?.reasoning)
        lines.push(`  > ${r.pass3.reasoning.replace(/\n+/g, " ").slice(0, 280)}`);
      lines.push("");
    }
  }

  await writeFile("audit-out/multi-vote-grader-report.md", lines.join("\n"));
  console.log("");
  console.log("═".repeat(72));
  console.log("Reports written:");
  console.log("  audit-out/multi-vote-grader-report.json");
  console.log("  audit-out/multi-vote-grader-report.md");
  console.log("═".repeat(72));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
