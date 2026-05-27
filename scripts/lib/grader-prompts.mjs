// ============================================================
// grader-prompts — Phase 6 typed prompt builders.
//
// Pure builders (no IO). Each typed role gets its own template
// tailored to the job:
//
//   DEEPSEEK_PRIMARY     — text-only solver, asks for letter or
//                           numeric answer + brief reasoning.
//   GROQ_INDEPENDENT     — same as DeepSeek but framed as
//                           "independent re-solve" so the model
//                           is reminded to not copy.
//   GEMINI_FLASH_VISUAL  — solver with the source crop attached.
//                           Asked to compare its reading of the
//                           image against the OCR text it sees.
//   GEMINI_PRO_VISUAL    — escalation prompt with Pass 1 dispute
//                           summary; image attached.
//   CLAUDE_OPUS_REASONING — escalation prompt with Pass 1 dispute
//                           summary; text-only.
//   SYMPY_EQUIVALENCE    — payload-only (no LLM); shape returned
//                           is what math-equivalence.mjs accepts.
//
// SOLVER RESPONSE SHAPE (all model roles):
//   { reasoning: string, answer: string, confidence: "high"|"medium"|"low",
//     is_answerable: boolean,
//     // visual roles only:
//     ocr_matches_image?: boolean }
//
// resolveVisualAssetUrl picks the best source_assets entry per
// the user's fallback chain (expanded_question_crop → question_crop
// → page_image; notation-special-case uses the tight crop first).
// ============================================================

import {
  GRADER_ROLES,
  VISUAL_INPUT_PREFERENCE,
  VISUAL_INPUT_PREFERENCE_NOTATION,
} from "./grader-roles.mjs";

// ── Response schemas (shared across text + visual solver roles) ──

export const TEXT_SOLVER_RESPONSE_SCHEMA = {
  type: "object",
  required: ["reasoning", "answer", "confidence", "is_answerable"],
  properties: {
    reasoning: { type: "string" },
    answer: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    is_answerable: { type: "boolean" },
  },
};

export const VISUAL_SOLVER_RESPONSE_SCHEMA = {
  type: "object",
  required: ["reasoning", "answer", "confidence", "is_answerable", "ocr_matches_image"],
  properties: {
    reasoning: { type: "string" },
    answer: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    is_answerable: { type: "boolean" },
    ocr_matches_image: { type: "boolean" },
  },
};

// ── Body helpers ─────────────────────────────────────────────

function isMC(question) {
  return question?.answer_format !== "numeric_entry";
}

function answerSpec(question) {
  return isMC(question)
    ? '"answer": "<single letter A|B|C|D>"'
    : '"answer": "<numeric value or simplest exact form, e.g. 1/2 or 0.5>"';
}

function buildQuestionBody(question, choices) {
  const lines = [];
  if (question.passage_intro) lines.push("PASSAGE INTRO:", question.passage_intro, "");
  if (question.passage) lines.push("PASSAGE:", question.passage, "");
  if (question.passage_a) {
    lines.push("PASSAGE A:", question.passage_a, "");
    if (question.passage_b) lines.push("PASSAGE B:", question.passage_b, "");
  }
  lines.push("QUESTION:", question.question_text, "");
  if (isMC(question) && Array.isArray(choices)) {
    lines.push("ANSWER CHOICES:");
    for (const c of choices.sort((a, b) => a.letter.localeCompare(b.letter))) {
      lines.push(`${c.letter}) ${c.choice_text}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function buildVoteSummary(pass1Votes) {
  if (!Array.isArray(pass1Votes) || pass1Votes.length === 0) return "(none)";
  return pass1Votes
    .map((v) => {
      const ans = v.answer ?? "(no answer)";
      const conf = v.confidence ? ` conf=${v.confidence}` : "";
      const reason = v.reasoning ? ` reasoning="${String(v.reasoning).slice(0, 240)}"` : "";
      return `· ${v.role}: ${ans}${conf}${reason}`;
    })
    .join("\n");
}

// ── Pass 1: typed solver prompts ─────────────────────────────

export function buildDeepSeekPrimaryPrompt({ question, choices }) {
  const prompt = `You are the PRIMARY SOLVER on a SAT question. Work it out carefully step by step.

${buildQuestionBody(question, choices)}

Return strict JSON:
{ "reasoning": "<step-by-step, 2-4 sentences>", ${answerSpec(question)}, "confidence": "<high|medium|low>", "is_answerable": <true|false> }

Set "is_answerable" to false if the question relies on a visual that you cannot see, or if the text alone is insufficient.`;
  return {
    prompt,
    responseSchema: TEXT_SOLVER_RESPONSE_SCHEMA,
    needsImage: false,
  };
}

export function buildGroqIndependentPrompt({ question, choices }) {
  const prompt = `You are an INDEPENDENT SOLVER cross-checking an SAT question. Solve it from first principles. DO NOT rely on common SAT answer patterns.

${buildQuestionBody(question, choices)}

Return strict JSON:
{ "reasoning": "<step-by-step, 2-4 sentences>", ${answerSpec(question)}, "confidence": "<high|medium|low>", "is_answerable": <true|false> }

Set "is_answerable" to false if the question relies on a visual that you cannot see.`;
  return {
    prompt,
    responseSchema: TEXT_SOLVER_RESPONSE_SCHEMA,
    needsImage: false,
  };
}

export function buildGeminiFlashVisualPrompt({ question, choices }) {
  const prompt = `You are the VISUAL CHECKER on a SAT question. You can see the source image — use it to verify the OCR-extracted text below matches the image, AND to read any graph/table/figure the question references.

${buildQuestionBody(question, choices)}

Return strict JSON:
{ "reasoning": "<step-by-step, 2-4 sentences referencing what you see>",
  ${answerSpec(question)},
  "confidence": "<high|medium|low>",
  "is_answerable": <true|false>,
  "ocr_matches_image": <true|false> }

- Set "ocr_matches_image" to false ONLY if the OCR text above misrepresents the printed question/choices (e.g. wrong number, missing operator, broken math notation).
- Set "is_answerable" to false if the image is too blurry/tiny/cropped to solve.`;
  return {
    prompt,
    responseSchema: VISUAL_SOLVER_RESPONSE_SCHEMA,
    needsImage: true,
  };
}

// ── Pass 2: typed escalation prompts ─────────────────────────

export function buildGeminiProEscalationPrompt({ question, choices, pass1Votes, storedAnswer }) {
  const prompt = `You are GEMINI PRO arbitrating a Phase 6 visual dispute on an SAT question. The Pass 1 panel reached the following votes:

${buildVoteSummary(pass1Votes)}

The stored answer key says: ${storedAnswer ?? "(none)"}.

${buildQuestionBody(question, choices)}

Re-solve from scratch using both the text and the image. Pay attention to anything the Pass 1 voters might have missed about the visual (graph values, table cells, figure labels, math notation, missing parens).

Return strict JSON:
{ "reasoning": "<2-5 sentences with explicit references to the image>",
  ${answerSpec(question)},
  "confidence": "<high|medium|low>",
  "is_answerable": <true|false>,
  "ocr_matches_image": <true|false> }`;
  return {
    prompt,
    responseSchema: VISUAL_SOLVER_RESPONSE_SCHEMA,
    needsImage: true,
  };
}

export function buildClaudeOpusEscalationPrompt({ question, choices, pass1Votes, storedAnswer }) {
  const prompt = `You are CLAUDE OPUS, the final reasoning arbiter on a Phase 6 dispute. The Pass 1 panel produced:

${buildVoteSummary(pass1Votes)}

The stored answer key says: ${storedAnswer ?? "(none)"}.

${buildQuestionBody(question, choices)}

Solve carefully. For Reading/Writing, anchor on passage evidence. For math, double-check arithmetic. Pay attention to traps the Pass 1 voters might have fallen into. If you cannot reach a confident answer (e.g. ambiguous question, contradictory evidence), say so via is_answerable=false.

Return strict JSON:
{ "reasoning": "<2-6 sentences with explicit evidence>",
  ${answerSpec(question)},
  "confidence": "<high|medium|low>",
  "is_answerable": <true|false> }`;
  // For Opus we use tool-mode at the call site (callClaude({toolSchema}))
  // for strict structured output. The schema is supplied below; the
  // caller chooses tool vs prose based on its own preference.
  return {
    prompt,
    responseSchema: TEXT_SOLVER_RESPONSE_SCHEMA,
    needsImage: false,
  };
}

// ── Prompt dispatch by role ───────────────────────────────────

/**
 * Single entry point. Given a role, returns the prompt builder
 * the caller invokes with (question, choices, pass1Votes, storedAnswer).
 * Useful for keeping verify-answers.mjs short.
 */
export function buildPromptForRole(role, args) {
  switch (role) {
    case GRADER_ROLES.DEEPSEEK_PRIMARY:
      return buildDeepSeekPrimaryPrompt(args);
    case GRADER_ROLES.GROQ_INDEPENDENT:
      return buildGroqIndependentPrompt(args);
    case GRADER_ROLES.GEMINI_FLASH_VISUAL:
      return buildGeminiFlashVisualPrompt(args);
    case GRADER_ROLES.GEMINI_PRO_VISUAL:
      return buildGeminiProEscalationPrompt(args);
    case GRADER_ROLES.CLAUDE_OPUS_REASONING:
      return buildClaudeOpusEscalationPrompt(args);
    default:
      throw new Error(`No prompt builder for role: ${role}`);
  }
}

// ── Visual asset resolver ────────────────────────────────────

/**
 * Pick the best source_assets row to attach as image, per the
 * fallback chain. Returns the public_url string, or null if no
 * asset is suitable.
 *
 * @param {Array<{asset_type: string, public_url: string|null, created_at: string}>} assets
 * @param {{ notationCheck?: boolean }} [opts]
 * @returns {string | null}
 */
export function resolveVisualAssetUrl(assets, opts = {}) {
  if (!Array.isArray(assets) || assets.length === 0) return null;
  const preference = opts.notationCheck
    ? VISUAL_INPUT_PREFERENCE_NOTATION
    : VISUAL_INPUT_PREFERENCE;
  for (const wanted of preference) {
    const candidates = assets
      .filter((a) => a.asset_type === wanted && a.public_url)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
    if (candidates.length > 0) return candidates[0].public_url;
  }
  return null;
}
