// ============================================================
// explanation-prompts — Phase 7 prompt builders.
//
// Pure builders. Each returns { prompt, toolSchema } so the
// caller invokes callClaude({ toolSchema }) for guaranteed-shape
// JSON output (Anthropic validates the args against the schema
// before returning — no LaTeX-vs-JSON escaping bugs).
//
// THREE BUILDERS:
//   buildGeneratorPrompt(question, choices, context)
//     → tells Claude to produce a full explanation_v2 bundle.
//
//   buildCriticPrompt(question, choices, explanation)
//     → tells Claude to evaluate an existing explanation against
//        the question + verified answer. Outputs critic findings.
//
//   buildRepairPrompt(question, choices, original, criticFindings)
//     → regeneration prompt that names what the critic flagged.
//        Used on the SECOND attempt only.
//
// Per user policy:
//   · NOT every wrong answer is a trap. misconception_note is
//     OPTIONAL — generator leaves it null when no genuine trap exists.
//   · Student-facing language should be natural / tutor-like, not
//     a rigid taxonomy.
// ============================================================

import { EXPLANATION_V2_VERSION, INTERNAL_CATEGORY_VALUES } from "./explanation-categories.mjs";

// ── Shared schemas ───────────────────────────────────────────

const CHOICE_SCHEMA = {
  type: "object",
  required: ["explanation", "evidence", "misconception_note", "internal_category"],
  properties: {
    explanation: {
      type: "string",
      description:
        "2-4 sentences explaining whether this choice is correct or wrong, written for a student. Natural language; no jargon.",
    },
    evidence: {
      type: "string",
      description:
        "For R&W: quote or paraphrase the specific passage sentence(s) that support the verdict. For Math: the algebraic reasoning step that rules this choice in or out. Empty string allowed when no specific evidence exists.",
    },
    misconception_note: {
      type: ["string", "null"],
      description:
        "OPTIONAL. Only set when a GENUINE common misconception explains why a student would pick this wrong choice. Keep it natural ('This choice may seem tempting because…'). Leave null if no genuine trap.",
    },
    internal_category: {
      type: ["string", "null"],
      enum: [...INTERNAL_CATEGORY_VALUES, null],
      description:
        "OPTIONAL admin-only category for analytics. Null when no clear category fits. NEVER shown to students.",
    },
  },
};

function explanationV2Schema({ subject, answer_format }) {
  const isMc = answer_format !== "numeric_entry";
  const properties = {
    version: { type: "string", const: EXPLANATION_V2_VERSION },
    generated_at: { type: "string", description: "ISO 8601 timestamp." },
    generator_role: { type: "string" },
    generator_model: { type: "string" },
    status: { type: "string", const: "generated" },
    correct_reasoning: {
      type: "string",
      description:
        "3-6 sentences explaining WHY the verified answer is correct. Student-facing voice. For R&W, ground in passage evidence. For Math, walk through the solution step-by-step.",
    },
    normal_tip: {
      type: ["string", "null"],
      description:
        "Optional one-sentence study tip that generalizes from this question (e.g. 'When the question asks for the BEST evidence, eliminate choices that paraphrase the claim rather than provide independent support.'). Null when nothing useful to add.",
    },
    desmos_tip: {
      type: ["string", "null"],
      description:
        "Math only. Optional one-sentence Desmos calculator tip. Null when not applicable (most R&W questions). For numeric_entry math, suggest a graph or table approach when one exists.",
    },
  };
  const required = [
    "version",
    "generated_at",
    "generator_role",
    "generator_model",
    "status",
    "correct_reasoning",
    "normal_tip",
    "desmos_tip",
  ];

  if (isMc) {
    properties.choices = {
      type: "object",
      required: ["A", "B", "C", "D"],
      properties: { A: CHOICE_SCHEMA, B: CHOICE_SCHEMA, C: CHOICE_SCHEMA, D: CHOICE_SCHEMA },
    };
    required.push("choices");
  }

  if (subject === "reading") {
    properties.slug_alignment = {
      type: "object",
      required: ["slug", "confidence", "reason"],
      properties: {
        slug: {
          type: "string",
          description:
            "The concept_slug this question best teaches. Use the slug already assigned to the question UNLESS your reasoning suggests a better one.",
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        reason: { type: "string", description: "1-2 sentences explaining why this slug fits." },
      },
    };
    required.push("slug_alignment");
  }

  if (subject === "math" && answer_format === "numeric_entry") {
    properties.acceptable_forms = {
      type: "array",
      minItems: 1,
      items: { type: "string" },
      description:
        "Numeric forms a student could enter that should be graded equivalent (e.g. ['0.5', '1/2', '.5', '50%']).",
    };
    required.push("acceptable_forms");
  }

  return {
    type: "object",
    required,
    properties,
  };
}

// ── Body helpers ─────────────────────────────────────────────

function questionBody(question, choices) {
  const lines = [];
  if (question.passage_intro) lines.push("PASSAGE INTRO:", question.passage_intro, "");
  if (question.passage) lines.push("PASSAGE:", question.passage, "");
  if (question.passage_a) {
    lines.push("PASSAGE A:", question.passage_a, "");
    if (question.passage_b) lines.push("PASSAGE B:", question.passage_b, "");
  }
  lines.push("QUESTION:", question.question_text, "");
  if (question.answer_format === "multiple_choice" && Array.isArray(choices)) {
    lines.push("ANSWER CHOICES:");
    for (const c of [...choices].sort((a, b) => a.letter.localeCompare(b.letter))) {
      lines.push(`${c.letter}) ${c.choice_text}`);
    }
    lines.push("");
  }
  const verifiedAnswer = question.selected_official_answer ?? question.correct_answer;
  lines.push(`VERIFIED ANSWER: ${verifiedAnswer ?? "(unknown)"}`);
  if (question.concept_slug) lines.push(`CONCEPT SLUG: ${question.concept_slug}`);
  return lines.join("\n");
}

// ── Generator prompt ─────────────────────────────────────────

export function buildGeneratorPrompt({ question, choices, isRetry = false }) {
  const subject = question.subject;
  const fmt = question.answer_format;
  const isMc = fmt !== "numeric_entry";

  const subjectGuidance =
    subject === "reading"
      ? `READING/WRITING GUIDANCE:
- Anchor every claim in specific passage evidence. Quote or paraphrase the exact sentences.
- For each wrong choice, explain why it doesn't match the passage. Use natural tutor voice.
- misconception_note: ONLY fill in when a genuine common trap explains the wrong choice (e.g. "this choice paraphrases the topic sentence but doesn't address the specific question asked"). Leave null when no genuine trap exists.
- normal_tip: one durable study tip — what should the student remember for future R&W questions of this type?
- slug_alignment: confirm the concept_slug (or propose a better one); confidence 0-1, with a 1-2 sentence reason.`
      : `MATH GUIDANCE:
- correct_reasoning: walk through the solution step-by-step. Show the algebra.
- For each wrong MC choice (if applicable), name the specific mistake (sign error, wrong formula, off by one, etc.).
- misconception_note: ONLY fill in when there's a genuine common student mistake that produces this choice. Leave null otherwise.
- desmos_tip: when a Desmos graph/table view would help, give a one-sentence approach. Leave null when the question is purely algebraic.
- For numeric_entry: produce acceptable_forms — every form a student could type that should grade correct (e.g. "0.5", "1/2", ".5", "50%" for one-half).`;

  const retryGuidance = isRetry
    ? `

NOTE: This is a RETRY after a critic flagged issues with attempt 1. The repair prompt (sent separately) names what failed. Address those findings carefully.`
    : "";

  const prompt = `You are writing the student-facing explanation for a verified SAT practice question. The verified answer is given below — your job is to explain WHY it's correct and walk through every wrong choice naturally.

${questionBody(question, choices)}

${subjectGuidance}

CRITICAL RULES:
- Treat the verified answer as ground truth. Do NOT argue with it.
- Student-facing voice. No phrases like "the model says" or "according to Sonnet". Just a tutor explaining the question.
- ${isMc ? "Cover every choice (A/B/C/D)." : "No choices block — this is open-ended numeric_entry."}
- misconception_note and internal_category are OPTIONAL. Forcing a trap on every wrong choice produces robotic explanations. Leave null when no genuine trap exists.
- Output strict JSON matching the tool schema. The "status" field MUST be "generated" (QA sets it to "qa_passed" afterward).
- "generated_at" = current ISO timestamp.
- "generator_role" + "generator_model" = whatever I tell you below.${retryGuidance}

generator_role: ${question._generator_role ?? "<set-by-caller>"}
generator_model: ${question._generator_model ?? "<set-by-caller>"}
generated_at: ${new Date().toISOString()}`;

  return {
    prompt,
    toolSchema: explanationV2Schema({ subject, answer_format: fmt }),
  };
}

// ── Critic prompt ────────────────────────────────────────────

const CRITIC_FINDING_SCHEMA = {
  type: "object",
  required: ["verdict", "fixable_issues", "serious_issues", "summary"],
  properties: {
    verdict: {
      type: "string",
      enum: ["pass", "fail_fixable", "fail_serious"],
      description:
        "pass: explanation is solid. fail_fixable: needs revision but the underlying explanation approach is OK (missing detail, weak tip, generic language). fail_serious: explanation contradicts the verified answer, cites nonexistent evidence, or the question itself looks broken — no retry should happen.",
    },
    fixable_issues: {
      type: "array",
      items: { type: "string" },
      description: "Specific issues the next regeneration should address. Empty when verdict=pass.",
    },
    serious_issues: {
      type: "array",
      items: { type: "string" },
      description:
        "Issues that warrant human review (contradicts answer, hallucinated evidence, broken question, etc.). Empty when verdict=pass.",
    },
    summary: {
      type: "string",
      description: "1-2 sentence overall assessment.",
    },
  },
};

export function buildCriticPrompt({ question, choices, explanation }) {
  const isMc = question.answer_format !== "numeric_entry";

  const checklist = `Critique checklist:
1. Does correct_reasoning actually support the verified answer? Or does it accidentally argue for a different choice?
2. ${isMc ? "Does every wrong-choice explanation match the actual text of that choice (not a paraphrase)?" : "Are the acceptable_forms genuinely equivalent to the verified answer?"}
3. ${question.subject === "reading" ? "Does cited passage evidence actually exist in the passage? Quote-check each one." : "Is the math reasoning step-by-step correct? Any sign or arithmetic errors?"}
4. Are misconception_notes (when present) genuine traps a real student would fall into? Or are they forced/contrived?
5. Is normal_tip durable and useful (vs. a generic platitude like "read carefully")?
6. ${question.subject === "reading" ? "Does slug_alignment.slug match the question's actual concept?" : "If desmos_tip is set, is it specific and useful?"}
7. Is the student-facing language natural and tutor-like? Or does it feel mechanical?

Classify EACH issue you find as fixable (a retry might address it) or serious (regeneration won't help — human review needed).

SERIOUS issues include:
- Explanation contradicts the verified answer.
- Cited evidence does not exist in the passage.
- The question itself appears broken or unanswerable.
- An answer dispute reappears (the explanation accidentally argues the key is wrong).
- Math notation is unresolved and the explanation is built on the wrong notation.`;

  const prompt = `You are CRITIQUING a student-facing SAT explanation. Your job is to flag quality issues, NOT to rewrite the explanation.

${questionBody(question, choices)}

EXPLANATION UNDER REVIEW:
${JSON.stringify(explanation, null, 2)}

${checklist}

Output strict JSON matching the tool schema.`;

  return {
    prompt,
    toolSchema: CRITIC_FINDING_SCHEMA,
  };
}

// ── Repair prompt (second-attempt regeneration) ──────────────

export function buildRepairPrompt({ question, choices, originalExplanation, criticFindings }) {
  const subject = question.subject;
  const fmt = question.answer_format;

  const fixablesList = (criticFindings?.fixable_issues ?? [])
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");

  const prompt = `Your previous explanation for this question was REVIEWED by a critic. The critic verdict is "fail_fixable" — the explanation approach is OK but specific issues need to be addressed in a fresh attempt.

${questionBody(question, choices)}

ORIGINAL EXPLANATION (do not blindly repeat — improve on it):
${JSON.stringify(originalExplanation, null, 2)}

CRITIC'S SUMMARY: ${criticFindings?.summary ?? "(no summary)"}

ISSUES YOU MUST ADDRESS:
${fixablesList || "(none listed — re-read the critic verdict carefully)"}

Produce a fresh explanation_v2 bundle that addresses every issue. Same schema as before. Keep what was working in the original; improve what the critic called out.

generator_role: ${question._generator_role ?? "<set-by-caller>"}
generator_model: ${question._generator_model ?? "<set-by-caller>"}
generated_at: ${new Date().toISOString()}`;

  return {
    prompt,
    toolSchema: explanationV2Schema({ subject, answer_format: fmt }),
  };
}
