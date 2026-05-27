// ============================================================
// explanation-schema — Phase 7 deterministic schema validator.
//
// Pure function. Validates that an explanation_v2 JSONB bundle
// has the required shape per subject + answer_format. Runs BEFORE
// the LLM critic so we never spend a critic call on a structurally
// broken explanation.
//
// CANONICAL SHAPE (v1):
//   {
//     version: "explanation_v2_v1",
//     generated_at: ISO timestamp,
//     generator_role: string,
//     generator_model: string,
//     status: one of EXPLANATION_V2_STATUSES,
//     correct_reasoning: string (non-empty),
//     // Multiple-choice questions:
//     choices: {
//       A: { explanation: string, evidence: string,
//            misconception_note: string|null, internal_category: string|null },
//       B: { ... },
//       C: { ... },
//       D: { ... }
//     },
//     normal_tip: string|null,
//     // Math-only:
//     desmos_tip: string|null,
//     acceptable_forms: string[] (required for numeric_entry),
//     // R&W-only:
//     slug_alignment: { slug: string, confidence: number, reason: string }|null,
//     // QA:
//     qa_notes: object|null,
//     // Admin-only diagnostic — only present when status='skipped_not_eligible':
//     admin_diagnostic_note: string|null
//   }
//
// RETURN: { ok: bool, missing: string[], invalid: string[] }
//   missing: required field paths that are absent or empty
//   invalid: field paths that exist but have the wrong type/shape
// ============================================================

import {
  EXPLANATION_V2_VERSION,
  EXPLANATION_V2_STATUSES,
  isValidInternalCategory,
} from "./explanation-categories.mjs";

const VALID_STATUSES = new Set(Object.values(EXPLANATION_V2_STATUSES));
const MC_LETTERS = ["A", "B", "C", "D"];

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * @param {unknown} explanation       — the explanation_v2 JSONB value
 * @param {object}  context           — { subject, answer_format }
 * @returns {{ ok: boolean, missing: string[], invalid: string[] }}
 */
export function validateExplanationV2(explanation, context = {}) {
  const missing = [];
  const invalid = [];

  if (!isPlainObject(explanation)) {
    return { ok: false, missing: ["<root>"], invalid: [] };
  }

  // ── Top-level required ──
  if (explanation.version !== EXPLANATION_V2_VERSION) {
    invalid.push(`version (expected "${EXPLANATION_V2_VERSION}")`);
  }
  if (!isNonEmptyString(explanation.generated_at)) missing.push("generated_at");
  if (!isNonEmptyString(explanation.generator_role)) missing.push("generator_role");
  if (!isNonEmptyString(explanation.generator_model)) missing.push("generator_model");
  if (!isNonEmptyString(explanation.status)) {
    missing.push("status");
  } else if (!VALID_STATUSES.has(explanation.status)) {
    invalid.push(`status="${explanation.status}" (not in enum)`);
  }

  // For SKIPPED rows, we ONLY require the admin diagnostic note +
  // the bookkeeping fields above. Skip the content checks entirely.
  if (explanation.status === EXPLANATION_V2_STATUSES.SKIPPED_NOT_ELIGIBLE) {
    if (!isNonEmptyString(explanation.admin_diagnostic_note)) {
      missing.push("admin_diagnostic_note");
    }
    return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
  }

  // ── Content required for any non-skipped explanation ──
  if (!isNonEmptyString(explanation.correct_reasoning)) {
    missing.push("correct_reasoning");
  }

  // ── Multiple-choice: 4 choice explanations ──
  if (context.answer_format === "multiple_choice") {
    if (!isPlainObject(explanation.choices)) {
      missing.push("choices");
    } else {
      for (const letter of MC_LETTERS) {
        const choice = explanation.choices[letter];
        if (!isPlainObject(choice)) {
          missing.push(`choices.${letter}`);
          continue;
        }
        if (!isNonEmptyString(choice.explanation)) {
          missing.push(`choices.${letter}.explanation`);
        }
        // evidence is required for R&W (passage-grounded). For Math
        // it's optional — math reasoning is its own evidence.
        if (context.subject === "reading" && !isNonEmptyString(choice.evidence)) {
          missing.push(`choices.${letter}.evidence`);
        }
        // misconception_note is OPTIONAL — null is explicitly allowed.
        if (choice.misconception_note != null && !isNonEmptyString(choice.misconception_note)) {
          invalid.push(`choices.${letter}.misconception_note (must be string or null)`);
        }
        // internal_category must be null OR a valid enum value.
        if (!isValidInternalCategory(choice.internal_category)) {
          invalid.push(
            `choices.${letter}.internal_category="${choice.internal_category}" (not in enum)`
          );
        }
      }
    }
  }

  // ── R&W-only: slug_alignment ──
  if (context.subject === "reading") {
    const sa = explanation.slug_alignment;
    if (!isPlainObject(sa)) {
      missing.push("slug_alignment");
    } else {
      if (!isNonEmptyString(sa.slug)) missing.push("slug_alignment.slug");
      if (
        sa.confidence == null ||
        typeof sa.confidence !== "number" ||
        !Number.isFinite(sa.confidence) ||
        sa.confidence < 0 ||
        sa.confidence > 1
      ) {
        invalid.push(`slug_alignment.confidence (must be 0-1 number)`);
      }
      if (!isNonEmptyString(sa.reason)) missing.push("slug_alignment.reason");
    }
  }

  // ── Math-only: acceptable_forms (required for numeric_entry) ──
  if (context.subject === "math" && context.answer_format === "numeric_entry") {
    const forms = explanation.acceptable_forms;
    if (!Array.isArray(forms) || forms.length === 0) {
      missing.push("acceptable_forms (numeric_entry requires ≥1 form)");
    } else if (!forms.every((f) => isNonEmptyString(f))) {
      invalid.push("acceptable_forms (every entry must be a non-empty string)");
    }
  }

  // ── Optional fields — type-check only when present ──
  if (explanation.normal_tip != null && !isNonEmptyString(explanation.normal_tip)) {
    invalid.push("normal_tip (must be string or null)");
  }
  if (explanation.desmos_tip != null && !isNonEmptyString(explanation.desmos_tip)) {
    invalid.push("desmos_tip (must be string or null)");
  }
  if (explanation.qa_notes != null && !isPlainObject(explanation.qa_notes)) {
    invalid.push("qa_notes (must be object or null)");
  }

  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
}

/**
 * Convenience: required-field summary for a (subject, answer_format)
 * pair. Useful for diagnostics + prompt construction. Returns a
 * sorted list of dotted field paths.
 */
export function requiredFieldsFor({ subject, answer_format }) {
  const fields = [
    "version",
    "generated_at",
    "generator_role",
    "generator_model",
    "status",
    "correct_reasoning",
  ];
  if (answer_format === "multiple_choice") {
    for (const letter of MC_LETTERS) {
      fields.push(`choices.${letter}.explanation`);
      if (subject === "reading") fields.push(`choices.${letter}.evidence`);
    }
  }
  if (subject === "reading") {
    fields.push("slug_alignment.slug", "slug_alignment.confidence", "slug_alignment.reason");
  }
  if (subject === "math" && answer_format === "numeric_entry") {
    fields.push("acceptable_forms");
  }
  return fields.sort();
}
