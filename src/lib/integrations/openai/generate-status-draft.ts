// ============================================================
// generateStatusDraft — turn a Zoom transcript into the eight
// structured fields a recap email needs.
//
// Uses DeepSeek V4 Flash (deepseek-v4-flash) via its OpenAI-compatible
// API. DeepSeek is reached through the OpenAI SDK by overriding baseURL +
// apiKey (DEEPSEEK_API_KEY). Cheap + fast, and well within capability for
// a structured extraction task.
//
// IMPORTANT — why this isn't a pure key swap: DeepSeek does NOT support
// OpenAI's strict `response_format: { type: "json_schema" }`. It supports
// `{ type: "json_object" }` (JSON mode), which guarantees *valid JSON* but
// NOT that the keys match our schema. So we (a) spell the exact output
// shape out in the prompt, and (b) coerce/validate the parsed result into
// StatusDraft after the call (STATUS_KEYS below). Same pattern as the
// pipeline's Kimi/DeepSeek JSON-object callers.
//
// Failure mode: if DeepSeek returns garbage or the call errors, the caller
// saves the transcript anyway and stores an error marker on
// `bookings.status_draft`. The tutor can still write the draft manually.
// ============================================================

import OpenAI from "openai";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-v4-flash";

export interface StatusDraft {
  date_and_time_of_session: string;
  student_performance_progress: string;
  subjects_covered_during_session: string;
  specific_weak_points_or_mistakes: string;
  next_steps_homework_assigned: string;
  subjects_to_cover_next_session: string;
  homework_practice_before_next_session: string;
  date_and_time_of_next_session: string;
}

export type SessionType = "individual" | "group";

export interface SessionContext {
  /** "individual" → 1:1 (private/elite), uses student name throughout.
   *  "group"      → small_group/seminar, NO student names, content-focused. */
  sessionType: SessionType;
  /** For individual sessions only — the one student's name. Ignored for groups. */
  studentName?: string;
  /** Required. */
  tutorName: string;
  /** Human-readable, e.g. "Tuesday, May 7, 2026 — 4:00 PM CDT". */
  sessionDate: string;
  sessionDurationMinutes: number;
  /** For group sessions: cohort name. For 1:1 sessions: optional. */
  cohortName?: string;
  /** Group sessions: enrollment count to phrase the prompt naturally. */
  enrolledCount?: number;
  previousSessionDate?: string;
}

// ──────────────────────────────────────────────────────────
// 1:1 prompt — personalized, references the student by name
// ──────────────────────────────────────────────────────────
const INDIVIDUAL_PROMPT = (
  ctx: SessionContext
) => `You are a professional SAT tutor writing a structured session recap email for a parent. The tutor (${ctx.tutorName}) just finished a 1:1 session with their student (${ctx.studentName}).

You will be given a Zoom transcript. Extract and structure the information into the JSON schema. Use SAT-specific terminology precisely:
- "Reading" not "English"
- Full exam names: PSAT, SAT, Bluebook
- Precise question type names: "Words in Context", "Inferences", "Boundaries", "Form Structure and Sense", "Linear Equations in One Variable", "Systems of Equations", etc.

Logic for the recap fields:
- "Subjects covered during session" = past (what happened today)
- "Specific weak points" = present (what we identified TODAY that needs work)
- "Subjects to cover next session" = future (what's planned next)

Be specific about homework. Do not say "review grammar" — say something like "complete 15 questions on subject-verb agreement in Bluebook practice test 4, sections 2.1 and 2.2."

If the transcript is missing information for a field (e.g. next session date wasn't discussed), set that field to "TBD — confirm with student" rather than fabricating.

For "date_and_time_of_session", restate the metadata you were given verbatim (don't try to extract it from the transcript). For "date_and_time_of_next_session", extract from the transcript if discussed; otherwise say "TBD — confirm with student".

Tone: professional, parent-facing, concise. No greetings, no pleasantries, just the structured fields.`;

// ──────────────────────────────────────────────────────────
// Group prompt (small_group + seminar) — NO student names,
// focuses on session content + practice problem types + next steps
// ──────────────────────────────────────────────────────────
const GROUP_PROMPT = (
  ctx: SessionContext
) => `You are a professional SAT tutor writing a structured class recap email. The tutor (${ctx.tutorName}) just finished a ${ctx.cohortName ? `${ctx.cohortName} ` : ""}group session${ctx.enrolledCount ? ` with ${ctx.enrolledCount} enrolled students` : ""}. This same recap will be sent to every parent of every enrolled student.

CRITICAL CONTENT RULES FOR GROUP RECAPS:
1. NEVER mention any individual student's name. Use "the class", "students", or "the group" — never "Maya did this" or "Carlos struggled with X".
2. NEVER reference individual progress, individual performance, or individual struggles.
3. Focus on what the SESSION covered, not what any individual learner did.
4. The "student_performance_progress" field should describe the CLASS's overall engagement and progress — e.g. "The class engaged actively in the linear-equations review, with strong participation during the worked-example portion." NOT "John was attentive."
5. The "specific_weak_points_or_mistakes" field should describe COMMON challenges the group hit — e.g. "Several students hesitated when faced with negative coefficients" — NOT individual mistakes.

You will be given a Zoom transcript. Extract and structure into the JSON schema. Use SAT-specific terminology precisely:
- "Reading" not "English"
- Full exam names: PSAT, SAT, Bluebook
- Precise question type names: "Words in Context", "Inferences", "Boundaries", "Form Structure and Sense", "Linear Equations in One Variable", "Systems of Equations", etc.

Pay special attention to enumerating PRACTICE PROBLEM TYPES covered in the session. The "subjects_covered_during_session" field should explicitly list the question types the class worked through — e.g. "Worked through 12 questions covering: linear equations in two variables (4), systems of equations word problems (5), and slope-intercept interpretation (3)."

The "subjects_to_cover_next_session" field should preview what's planned — e.g. "Next session will move into quadratic functions (factoring + vertex form) and exponential growth/decay word problems."

Be specific about homework: "complete pages 47-52 of the official SAT Prep guide" not "review what we covered."

If the transcript is missing information for a field (e.g. next session date wasn't discussed), set that field to "TBD — confirm with cohort schedule" rather than fabricating.

For "date_and_time_of_session", restate the metadata verbatim. For "date_and_time_of_next_session", extract from the transcript if discussed; otherwise say "TBD".

Tone: professional, parent-facing, concise. No greetings. Direct content only.`;

// DeepSeek json_object mode needs the exact shape in the prompt (it doesn't
// take a schema like OpenAI strict mode) — and the word "JSON" must appear.
const SCHEMA_INSTRUCTION = `

Return ONLY a single JSON object with EXACTLY these eight string keys, and no others (no markdown, no commentary outside the JSON):
{
  "date_and_time_of_session": "",
  "student_performance_progress": "",
  "subjects_covered_during_session": "",
  "specific_weak_points_or_mistakes": "",
  "next_steps_homework_assigned": "",
  "subjects_to_cover_next_session": "",
  "homework_practice_before_next_session": "",
  "date_and_time_of_next_session": ""
}`;

const SYSTEM_PROMPT = (ctx: SessionContext) =>
  (ctx.sessionType === "group" ? GROUP_PROMPT(ctx) : INDIVIDUAL_PROMPT(ctx)) + SCHEMA_INSTRUCTION;

const USER_PROMPT = (ctx: SessionContext, transcript: string) => {
  const meta = [
    ctx.sessionType === "individual"
      ? `- Student: ${ctx.studentName}`
      : `- Group session${ctx.cohortName ? ` (cohort: ${ctx.cohortName})` : ""}${ctx.enrolledCount ? ` — ${ctx.enrolledCount} students enrolled` : ""}`,
    `- Tutor: ${ctx.tutorName}`,
    `- Session date: ${ctx.sessionDate}`,
    `- Duration: ${ctx.sessionDurationMinutes} minutes`,
    ctx.previousSessionDate ? `- Previous session: ${ctx.previousSessionDate}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Session metadata:\n${meta}\n\nTranscript:\n${transcript}`;
};

/** The output shape. Documents the contract + drives the prompt's
 *  SCHEMA_INSTRUCTION and the post-call validation (DeepSeek json_object
 *  mode doesn't enforce it the way OpenAI strict mode did). */
const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "date_and_time_of_session",
    "student_performance_progress",
    "subjects_covered_during_session",
    "specific_weak_points_or_mistakes",
    "next_steps_homework_assigned",
    "subjects_to_cover_next_session",
    "homework_practice_before_next_session",
    "date_and_time_of_next_session",
  ],
  properties: {
    date_and_time_of_session: { type: "string" },
    student_performance_progress: { type: "string" },
    subjects_covered_during_session: { type: "string" },
    specific_weak_points_or_mistakes: { type: "string" },
    next_steps_homework_assigned: { type: "string" },
    subjects_to_cover_next_session: { type: "string" },
    homework_practice_before_next_session: { type: "string" },
    date_and_time_of_next_session: { type: "string" },
  },
} as const;

/** The eight required keys, in order — drives post-call validation. */
const STATUS_KEYS = RESPONSE_SCHEMA.required;

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY missing");
  // DeepSeek speaks the OpenAI chat-completions protocol — point the SDK
  // at its base URL and use the DeepSeek key.
  _client = new OpenAI({ apiKey, baseURL: DEEPSEEK_BASE_URL });
  return _client;
}

export async function generateStatusDraft(
  transcript: string,
  context: SessionContext
): Promise<StatusDraft> {
  const response = await client().chat.completions.create({
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT(context) },
      { role: "user", content: USER_PROMPT(context, transcript) },
    ],
    temperature: 0.3,
    // V4 Flash spends part of the budget on internal reasoning before
    // emitting the JSON, so give it more room than gpt-4o-mini needed.
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("DeepSeek returned non-JSON status draft");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("DeepSeek status draft was not a JSON object");
  }

  // json_object guarantees valid JSON but NOT our exact schema. Coerce each
  // field to a trimmed string; if the model returned a fundamentally wrong
  // shape (fewer than half the keys present), fail so the caller stores an
  // error marker and the tutor writes the recap manually — rather than
  // surfacing a draft that's silently mostly "TBD".
  const obj = parsed as Record<string, unknown>;
  const present = STATUS_KEYS.filter(
    (k) => typeof obj[k] === "string" && (obj[k] as string).trim() !== ""
  ).length;
  if (present < STATUS_KEYS.length / 2) {
    throw new Error(`DeepSeek status draft incomplete (${present}/${STATUS_KEYS.length} fields)`);
  }

  const draft = {} as Record<string, string>;
  for (const key of STATUS_KEYS) {
    const v = obj[key];
    const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v);
    draft[key] = s || "TBD — confirm with tutor";
  }
  return draft as unknown as StatusDraft;
}
