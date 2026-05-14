// ============================================================
// generateStatusDraft — turn a Zoom transcript into the eight
// structured fields a recap email needs.
//
// Uses OpenAI gpt-4o-mini with a strict JSON schema response
// format so we get guaranteed-valid output. Model choice:
//   - gpt-4o-mini: ~$0.001 per recap, fast (3-8 sec). Plenty
//     capable for this task. Upgrade to gpt-4o if quality
//     drops on edge cases.
//
// Failure mode: if OpenAI returns garbage or the call errors,
// the caller saves the transcript anyway and stores an error
// marker on `bookings.status_draft`. The tutor can still write
// the draft manually.
// ============================================================

import OpenAI from "openai";

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

const SYSTEM_PROMPT = (ctx: SessionContext) =>
  ctx.sessionType === "group" ? GROUP_PROMPT(ctx) : INDIVIDUAL_PROMPT(ctx);

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

/** Strict JSON schema — gpt-4o-mini guarantees output matches. */
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

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  _client = new OpenAI({ apiKey });
  return _client;
}

export async function generateStatusDraft(
  transcript: string,
  context: SessionContext
): Promise<StatusDraft> {
  const response = await client().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT(context) },
      { role: "user", content: USER_PROMPT(context, transcript) },
    ],
    temperature: 0.3,
    max_tokens: 1500,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "StatusDraft",
        strict: true,
        schema: RESPONSE_SCHEMA,
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty response");

  return JSON.parse(content) as StatusDraft;
}
