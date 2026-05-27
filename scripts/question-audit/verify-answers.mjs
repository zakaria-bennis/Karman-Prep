#!/usr/bin/env node

// ============================================================
// verify-answers — v2 Phase 6 typed answer verifier.
//
// REPLACES the inlined logic of multi-vote-grader.mjs with a
// typed-role + typed-dispute architecture per the Phase 6 outline.
// The legacy multi-vote-grader stays in repo as a fallback path.
//
// TYPED ROLES (Pass 1 panel, run in parallel):
//   · deepseek_primary_solver
//   · groq_independent_solver
//   · gemini_flash_visual_checker      ← sees the source crop image
//
// TYPED ESCALATION (Pass 2, chosen by verifier-routing):
//   · pro                — Gemini Pro alone
//   · opus               — Claude Opus alone
//   · both               — Pro AND Opus (compared)
//   · sympy_first        — SymPy equivalence; escalate to Pro on
//                          inconclusive or not_equivalent (math nums)
//   · human_review_only  — no model can help (extraction error)
//
// CAUTIOUS POLICY — Phase 6 NEVER auto-flips selected_official_answer.
// When the model panel disagrees with the stored key:
//   · answer_verification_status = 'model_consensus_disagrees_with_key'
//   · suggested_verified_answer = panel's proposed answer
//   · publish_status = 'blocked_answer_dispute' (set by publish-gate)
//   · human reviewer decides.
//
// USAGE
//   node --env-file=.env.local scripts/question-audit/verify-answers.mjs --from-db
//   ... --source-pdf <filename>   # scope to one PDF
//   ... --question-id <uuid>      # just one row
//   ... --limit <n>               # cap inspected rows
//   ... --dry-run                 # no DB writes
//   ... --no-llm                  # skip LLM calls; every row → review
//
// COST per PDF (~30 questions, ~5 disputes after Pass 1):
//   Pass 1 (3 typed voters × 30 q): ~$0.03
//   Pass 2 (Pro/Opus on 5 disputes): ~$0.025
//   SymPy on open-ended:             ~free
//   Total: ~$0.06/PDF. Adds ~45s to the orchestrator.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { callGemini, callDeepSeek, callGroq, callClaude } from "../lib/llm-providers.mjs";
import {
  GRADER_ROLES,
  PASS1_ROLES,
  PHASE6_VERIFIER_VERSION,
  DISPUTE_CATEGORIES,
  ESCALATION_PATHS,
  VERIFIER_STATUSES,
} from "../lib/grader-roles.mjs";
import { buildPromptForRole, resolveVisualAssetUrl } from "../lib/grader-prompts.mjs";
import { tallyAgreement, normalizeLetter, answersEquivalent } from "../lib/grader-normalize.mjs";
import { routeDispute, reconcileVerdict } from "../lib/verifier-routing.mjs";
import { areExpressionsEquivalent } from "../lib/math-equivalence.mjs";
import {
  writeGraderRunsAppendOnly,
  writeGraderVotesSummary,
  writeVerifierVerdict,
  newRunGroupId,
} from "../lib/grader-persistence.mjs";

// ── CLI ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const FROM_DB = args.includes("--from-db");
const DRY_RUN = args.includes("--dry-run");
const NO_LLM = args.includes("--no-llm");
const SOURCE_PDF_IDX = args.indexOf("--source-pdf");
const SOURCE_PDF =
  SOURCE_PDF_IDX >= 0 && args[SOURCE_PDF_IDX + 1] ? args[SOURCE_PDF_IDX + 1] : null;
const QUESTION_ID_IDX = args.indexOf("--question-id");
const QUESTION_ID =
  QUESTION_ID_IDX >= 0 && args[QUESTION_ID_IDX + 1] ? args[QUESTION_ID_IDX + 1] : null;
const LIMIT_IDX = args.indexOf("--limit");
const LIMIT = LIMIT_IDX >= 0 && args[LIMIT_IDX + 1] ? Number(args[LIMIT_IDX + 1]) : null;
const FORCE = args.includes("--force");

if (args.includes("--help") || (!FROM_DB && !QUESTION_ID)) {
  console.log(`Usage:
  node --env-file=.env.local scripts/question-audit/verify-answers.mjs --from-db [options]

Options:
  --source-pdf <filename>  Limit to one imported PDF.
  --question-id <uuid>     Verify a single question.
  --limit <n>              Cap inspected rows.
  --dry-run                No DB writes.
  --no-llm                 Skip LLM calls (route everything to review).
  --force                  Re-verify rows already verified by this version.
  --help                   Show this message.
`);
  process.exit(QUESTION_ID || FROM_DB ? 0 : 1);
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// ── Question selection ───────────────────────────────────────

const QUESTION_SELECT = [
  "id",
  "question_text",
  "passage",
  "passage_a",
  "passage_b",
  "passage_intro",
  "subject",
  "answer_format",
  "correct_answer",
  "selected_official_answer",
  "answer_key_status",
  "math_notation_status",
  "image_url",
  "source_pdf",
  "source_page",
  "answer_verified_at",
  "answer_verifier_version",
  "answer_choices(letter, choice_text)",
].join(", ");

async function selectCandidateQuestions() {
  let query = supabase.from("quiz_questions").select(QUESTION_SELECT);
  if (QUESTION_ID) query = query.eq("id", QUESTION_ID);
  else if (SOURCE_PDF) query = query.eq("source_pdf", SOURCE_PDF);
  if (!FORCE && !QUESTION_ID) {
    // Re-verify only when this version hasn't run yet.
    query = query.or(
      `answer_verifier_version.is.null,answer_verifier_version.neq.${PHASE6_VERIFIER_VERSION}`
    );
  }
  if (LIMIT) query = query.limit(LIMIT);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function selectVisualAssets(questionId) {
  const { data, error } = await supabase
    .from("source_assets")
    .select("asset_type, public_url, created_at")
    .eq("question_id", questionId)
    .in("asset_type", ["expanded_question_crop", "question_crop", "page_image"]);
  if (error) throw error;
  return data ?? [];
}

// ── Image fetch ──────────────────────────────────────────────

async function fetchImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return {
      mime: res.headers.get("content-type") ?? "image/png",
      buf: Buffer.from(await res.arrayBuffer()),
    };
  } catch {
    return null;
  }
}

// ── Single-role invocation ───────────────────────────────────

async function callOneRole({ role, prompt, responseSchema, image }) {
  // NO_LLM short-circuit: return a synthetic error so the row routes
  // to review without burning API budget.
  if (NO_LLM) {
    return { ok: false, error: "no_llm_mode", role };
  }
  try {
    if (role === GRADER_ROLES.DEEPSEEK_PRIMARY) {
      // DeepSeek lacks responseSchema enforcement; rely on bracket
      // extraction in callDeepSeek and validate fields downstream.
      const resp = await callDeepSeek({ prompt });
      return { ok: true, role, raw: resp };
    }
    if (role === GRADER_ROLES.GROQ_INDEPENDENT) {
      const resp = await callGroq({ prompt, model: "llama-3.3-70b-versatile" });
      return { ok: true, role, raw: resp };
    }
    if (role === GRADER_ROLES.GEMINI_FLASH_VISUAL) {
      const resp = await callGemini({
        prompt,
        image,
        model: "gemini-2.5-flash",
        responseSchema,
        maxOutputTokens: 1024,
        thinkingBudget: 0,
      });
      return { ok: true, role, raw: resp };
    }
    if (role === GRADER_ROLES.GEMINI_PRO_VISUAL) {
      const resp = await callGemini({
        prompt,
        image,
        model: "gemini-2.5-pro",
        responseSchema,
        maxOutputTokens: 2048,
      });
      return { ok: true, role, raw: resp };
    }
    if (role === GRADER_ROLES.CLAUDE_OPUS_REASONING) {
      const resp = await callClaude({
        prompt,
        model: "claude-opus-4-7",
        toolSchema: responseSchema,
        maxTokens: 2048,
      });
      return { ok: true, role, raw: resp };
    }
    return { ok: false, error: `unknown_role:${role}`, role };
  } catch (err) {
    return { ok: false, role, error: err?.message ?? String(err) };
  }
}

// ── Pass 1: typed panel in parallel ──────────────────────────

async function runPass1Panel({ question, choices, visualUrl }) {
  const image = visualUrl ? await fetchImage(visualUrl) : null;

  const tasks = PASS1_ROLES.map(async (role) => {
    const { prompt, responseSchema, needsImage } = buildPromptForRole(role, {
      question,
      choices,
    });
    const result = await callOneRole({
      role,
      prompt,
      responseSchema,
      image: needsImage ? image : null,
    });
    if (!result.ok) {
      return {
        role,
        ok: false,
        error: result.error,
        answer: null,
        is_answerable: null,
        reasoning: null,
        confidence: null,
        ocr_matches_image: null,
        raw: null,
      };
    }
    const r = result.raw ?? {};
    return {
      role,
      ok: true,
      answer: r.answer ?? null,
      is_answerable: typeof r.is_answerable === "boolean" ? r.is_answerable : null,
      reasoning: r.reasoning ?? null,
      confidence: r.confidence ?? null,
      ocr_matches_image: typeof r.ocr_matches_image === "boolean" ? r.ocr_matches_image : null,
      raw: r,
    };
  });

  return await Promise.all(tasks);
}

// ── Pass 2: typed escalation ─────────────────────────────────

async function runEscalation({
  escalationPath,
  question,
  choices,
  pass1Votes,
  storedAnswer,
  visualUrl,
}) {
  const out = {
    proResult: null,
    opusResult: null,
    sympyResult: null,
  };

  // For visual roles, fetch the image once.
  const image = visualUrl ? await fetchImage(visualUrl) : null;

  if (escalationPath === ESCALATION_PATHS.PRO || escalationPath === ESCALATION_PATHS.BOTH) {
    const { prompt, responseSchema } = buildPromptForRole(GRADER_ROLES.GEMINI_PRO_VISUAL, {
      question,
      choices,
      pass1Votes,
      storedAnswer,
    });
    out.proResult = await callOneRole({
      role: GRADER_ROLES.GEMINI_PRO_VISUAL,
      prompt,
      responseSchema,
      image,
    });
  }

  if (escalationPath === ESCALATION_PATHS.OPUS || escalationPath === ESCALATION_PATHS.BOTH) {
    const { prompt, responseSchema } = buildPromptForRole(GRADER_ROLES.CLAUDE_OPUS_REASONING, {
      question,
      choices,
      pass1Votes,
      storedAnswer,
    });
    out.opusResult = await callOneRole({
      role: GRADER_ROLES.CLAUDE_OPUS_REASONING,
      prompt,
      responseSchema,
    });
  }

  if (escalationPath === ESCALATION_PATHS.SYMPY_FIRST) {
    const panelConsensus =
      tallyAgreement(
        pass1Votes.map((v) => v.answer),
        question.answer_format
      ).consensus ?? null;
    if (panelConsensus && storedAnswer) {
      const eq = await answersEquivalent({
        answerA: panelConsensus,
        answerB: storedAnswer,
        answerFormat: question.answer_format,
      });
      out.sympyResult = eq;
    } else {
      out.sympyResult = "inconclusive";
    }
  }

  return out;
}

// ── Per-question driver ──────────────────────────────────────

async function processQuestion(question, runGroupId) {
  console.log(
    `\n🔍 ${question.id.slice(0, 8)} ${question.subject}/${question.answer_format} — ${question.source_pdf ?? "?"}#${question.source_page ?? "?"}`
  );

  const choices = question.answer_choices ?? [];
  const assets = await selectVisualAssets(question.id);
  const visualUrl = resolveVisualAssetUrl(assets);
  const storedAnswer = question.selected_official_answer ?? question.correct_answer ?? null;

  // ── Pass 1 ──
  const pass1Votes = await runPass1Panel({ question, choices, visualUrl });

  const tally = tallyAgreement(
    pass1Votes.map((v) => v.answer),
    question.answer_format
  );

  console.log(
    `   pass1: ${pass1Votes.map((v) => `${v.role.split("_")[0]}=${v.answer ?? "✗"}`).join(" ")} ` +
      `[consensus=${tally.consensus ?? "—"}, unanimous=${tally.unanimous}]`
  );

  // ── Route the dispute ──
  const route = routeDispute({ question, pass1Votes, pass1Tally: tally });
  console.log(`   route: ${route.dispute_category} → ${route.escalation_path}  (${route.reason})`);

  let verdict;
  let opusResultStored = null;
  let proResultStored = null;
  let sympyResultStored = null;

  // ── Hard-stop categories ──
  if (route.escalation_path === ESCALATION_PATHS.HUMAN_REVIEW_ONLY) {
    if (route.dispute_category === DISPUTE_CATEGORIES.EXTRACTION_ERROR) {
      verdict = {
        verifier_status: VERIFIER_STATUSES.UNANSWERABLE,
        suggested_verified_answer: null,
        reason: route.reason,
      };
    } else if (route.dispute_category === DISPUTE_CATEGORIES.UNANSWERABLE_QUESTION) {
      verdict = {
        verifier_status: VERIFIER_STATUSES.UNANSWERABLE,
        suggested_verified_answer: null,
        reason: route.reason,
      };
    } else if (route.dispute_category === DISPUTE_CATEGORIES.NONE) {
      // Panel agreed with key. Mark as panel-verified.
      verdict = {
        verifier_status: VERIFIER_STATUSES.VERIFIED_PANEL,
        suggested_verified_answer: null,
        reason: route.reason,
      };
    } else {
      verdict = {
        verifier_status: VERIFIER_STATUSES.VERIFIER_ERROR,
        suggested_verified_answer: tally.consensus,
        reason: route.reason,
      };
    }
  } else {
    // ── Run escalation ──
    const escalation = await runEscalation({
      escalationPath: route.escalation_path,
      question,
      choices,
      pass1Votes,
      storedAnswer,
      visualUrl,
    });
    proResultStored = escalation.proResult;
    opusResultStored = escalation.opusResult;
    sympyResultStored = escalation.sympyResult;

    const proAnswer = escalation.proResult?.ok ? (escalation.proResult.raw?.answer ?? null) : null;
    const opusAnswer = escalation.opusResult?.ok
      ? (escalation.opusResult.raw?.answer ?? null)
      : null;

    verdict = reconcileVerdict({
      escalationPath: route.escalation_path,
      storedAnswer,
      proAnswer,
      opusAnswer,
      sympyResult: escalation.sympyResult,
      pass1Consensus: tally.consensus,
    });

    // SYMPY_FIRST may escalate to Pro on inconclusive (per user policy).
    if (
      route.escalation_path === ESCALATION_PATHS.SYMPY_FIRST &&
      verdict.verifier_status === VERIFIER_STATUSES.SYMPY_INCONCLUSIVE
    ) {
      console.log("   sympy inconclusive → escalating to Gemini Pro");
      const { prompt, responseSchema } = buildPromptForRole(GRADER_ROLES.GEMINI_PRO_VISUAL, {
        question,
        choices,
        pass1Votes,
        storedAnswer,
      });
      const proResult = await callOneRole({
        role: GRADER_ROLES.GEMINI_PRO_VISUAL,
        prompt,
        responseSchema,
        image: visualUrl ? await fetchImage(visualUrl) : null,
      });
      proResultStored = proResult;
      verdict = reconcileVerdict({
        escalationPath: ESCALATION_PATHS.PRO,
        storedAnswer,
        proAnswer: proResult.ok ? (proResult.raw?.answer ?? null) : null,
        opusAnswer: null,
        sympyResult: escalation.sympyResult,
        pass1Consensus: tally.consensus,
      });
    }
  }

  console.log(
    `   verdict: ${verdict.verifier_status}${verdict.suggested_verified_answer ? ` (suggest=${verdict.suggested_verified_answer})` : ""}`
  );

  // ── Persist ──
  const allVoters = pass1Votes.map((v) => ({
    questionId: question.id,
    role: v.role,
    ok: v.ok,
    selectedAnswer: v.answer,
    normalizedAnswer:
      question.answer_format === "multiple_choice" ? normalizeLetter(v.answer) : v.answer,
    answerKeyMatch:
      v.answer && storedAnswer
        ? String(v.answer).trim().toLowerCase() === String(storedAnswer).trim().toLowerCase()
        : null,
    isAnswerable: v.is_answerable,
    confidence: confToNumber(v.confidence),
    reasoningSummary: v.reasoning,
    rawResponse: v.raw,
    error: v.ok ? null : v.error,
  }));

  // Append escalation rows too (Pro/Opus, success or failure).
  if (proResultStored) {
    allVoters.push(escalationToVoter(proResultStored, question.id, storedAnswer));
  }
  if (opusResultStored) {
    allVoters.push(escalationToVoter(opusResultStored, question.id, storedAnswer));
  }

  await writeGraderRunsAppendOnly({
    supabase,
    runGroupId,
    voters: allVoters,
    dryRun: DRY_RUN,
  });

  // Update grader_votes JSONB summary (back-compat with admin UI).
  const summary = {
    graded_at: new Date().toISOString(),
    verdict: legacyVerdict(verdict.verifier_status),
    stored_answer: storedAnswer,
    stored_source: question.selected_official_answer
      ? "selected_official_answer"
      : "correct_answer",
    pass1: {
      ...Object.fromEntries(
        pass1Votes.filter((v) => v.answer).map((v) => [v.role.split("_")[0], v.answer])
      ),
      consensus: tally.consensus,
      total_valid: tally.total_valid,
    },
    ...(proResultStored && { pass2_pro: proResultStored.raw?.answer ?? null }),
    ...(opusResultStored && { pass3_opus: opusResultStored.raw?.answer ?? null }),
    ...(sympyResultStored !== null && { sympy: sympyResultStored }),
    phase6: {
      dispute_category: route.dispute_category,
      escalation_path: route.escalation_path,
      verifier_status: verdict.verifier_status,
      suggested_verified_answer: verdict.suggested_verified_answer,
      reason: verdict.reason,
    },
  };
  await writeGraderVotesSummary({
    supabase,
    questionId: question.id,
    summary,
    dryRun: DRY_RUN,
  });

  // Write the Phase 6 verdict columns.
  await writeVerifierVerdict({
    supabase,
    questionId: question.id,
    verifierStatus: verdict.verifier_status,
    disputeCategory: route.dispute_category,
    suggestedVerifiedAnswer: verdict.suggested_verified_answer,
    dryRun: DRY_RUN,
  });

  return { verdict, route, tally };
}

function confToNumber(conf) {
  if (conf === "high") return 0.9;
  if (conf === "medium") return 0.65;
  if (conf === "low") return 0.3;
  return null;
}

function escalationToVoter(result, questionId, storedAnswer) {
  if (!result.ok) {
    return {
      questionId,
      role: result.role,
      ok: false,
      error: result.error,
    };
  }
  const r = result.raw ?? {};
  return {
    questionId,
    role: result.role,
    ok: true,
    selectedAnswer: r.answer ?? null,
    normalizedAnswer: r.answer ?? null,
    confidence: confToNumber(r.confidence),
    answerKeyMatch:
      r.answer && storedAnswer
        ? String(r.answer).trim().toLowerCase() === String(storedAnswer).trim().toLowerCase()
        : null,
    isAnswerable: typeof r.is_answerable === "boolean" ? r.is_answerable : null,
    reasoningSummary: r.reasoning ?? null,
    rawResponse: r,
  };
}

/**
 * Map Phase 6 typed status back to a "verdict" string the publish-
 * gate's existing gateGraderVotes understands. Keeps the UI badge
 * + the legacy block path working until those are also updated.
 */
function legacyVerdict(verifierStatus) {
  switch (verifierStatus) {
    case VERIFIER_STATUSES.VERIFIED_PANEL:
      return "verified";
    case VERIFIER_STATUSES.VERIFIED_PRO:
      return "verified_pro";
    case VERIFIER_STATUSES.VERIFIED_OPUS:
      return "verified_opus";
    case VERIFIER_STATUSES.VERIFIED_SYMPY:
      return "verified";
    case VERIFIER_STATUSES.MODEL_CONSENSUS_DISAGREES_WITH_KEY:
    case VERIFIER_STATUSES.ESCALATION_DISAGREES:
      return "likely_wrong";
    case VERIFIER_STATUSES.PANEL_SPLIT:
    case VERIFIER_STATUSES.SYMPY_INCONCLUSIVE:
      return "pass1_split";
    case VERIFIER_STATUSES.UNANSWERABLE:
    case VERIFIER_STATUSES.VERIFIER_ERROR:
      return "uncertain_parse";
    default:
      return "uncertain_split";
  }
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log(`📋 Phase 6 verify-answers (${PHASE6_VERIFIER_VERSION})`);
  console.log(
    `   source_pdf=${SOURCE_PDF ?? "<all>"} limit=${LIMIT ?? "<none>"} dry-run=${DRY_RUN} no-llm=${NO_LLM}`
  );
  const questions = await selectCandidateQuestions();
  console.log(`   ${questions.length} candidate question(s)`);
  if (questions.length === 0) return;

  const runGroupId = await newRunGroupId();
  console.log(`   run_group_id=${runGroupId}`);

  const tally = {};
  let processed = 0;
  let errored = 0;
  for (const q of questions) {
    try {
      const { verdict } = await processQuestion(q, runGroupId);
      tally[verdict.verifier_status] = (tally[verdict.verifier_status] ?? 0) + 1;
      processed++;
    } catch (err) {
      errored++;
      console.error(`   ✗ ${q.id.slice(0, 8)}: ${err?.message ?? err}`);
    }
  }

  console.log("");
  console.log("═".repeat(60));
  console.log(`Processed: ${processed} | Errored: ${errored}`);
  console.log("Verdict tally:");
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(40)} ${v}`);
  }
}

// Suppress unused-imports warnings — these are referenced via dynamic
// dispatch in callOneRole + reconcileVerdict.
void areExpressionsEquivalent;

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
