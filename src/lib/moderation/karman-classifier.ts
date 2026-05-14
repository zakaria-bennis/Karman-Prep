// ============================================================
// Karman-specific bullying classifier.
//
// OpenAI Moderation (`omni-moderation-latest`) is a SAFETY
// classifier — it catches explicit sexual content, threats,
// self-harm signals. For a 14-18 student audience that's
// necessary-but-not-sufficient: most "vile" messages we see in
// cohort chat are subtle put-downs, social exclusion, or
// implicit meanness that don't trip any safety category.
//
// This classifier runs in parallel with OpenAI Moderation and
// asks a separate question: would a teacher or parent be upset
// to see this message sent to or about another student?
//
// Uses OpenAI's gpt-4o-mini for cost and latency — the call
// typically returns in ~300-700ms. Wrapped in a 3-second hard
// timeout. On error, the pipeline keeps the OpenAI Moderation
// result (additive layer — not fail-CLOSED on its own).
// ============================================================

const TIMEOUT_MS = 3_000;
const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a content moderator for Karman Prep, an online SAT tutoring platform whose students are 14-18 years old. You review messages posted in classroom-style cohort chats.

A message is FLAGGED if a teacher or parent would be uncomfortable seeing it sent to or about another student. Examples that should be FLAGGED:
- Bullying, name-calling, or put-downs ("you're so dumb", "nobody actually likes you")
- Subtle exclusion or social meanness ("you should sit somewhere else")
- Off-topic content meant to mock or distract from learning
- Implicit threats or suggestions of self-harm ("you should just stop")
- Sexual innuendo, euphemisms, or "joke" sexual references
- Disclosure of another student's contact info (phone, address, social handles)
- Asking another student to do something inappropriate (cheat, share answers, meet up)

A message is NOT flagged if it's:
- Academic discussion, even if blunt ("this question is impossible", "I hate logarithms")
- Casual jokes or banter not directed at any student in particular
- Mild profanity used to express frustration about the material (a separate keyword layer catches what's beyond mild)
- Asking honest study questions

Be skeptical but proportionate. A SAT prep cohort is allowed to be casual and funny. Flag what would make a parent uncomfortable, not what would make a humorless teacher uncomfortable.

Respond with ONLY a JSON object, no prose. Format:
{"flagged": boolean, "reason": "one short sentence explaining the call"}`;

export interface KarmanClassifierResult {
  flagged: boolean;
  reason: string;
}

/** Throws on network errors, non-200 responses, missing API key,
 *  or unparseable JSON. The pipeline catches and treats this as
 *  an additive-layer miss (keeps the OpenAI Moderation result),
 *  unlike the OpenAI Moderation provider which fails CLOSED. */
export async function callKarmanClassifier(content: string): Promise<KarmanClassifierResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { flagged: false, reason: "empty content" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: trimmed },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`karman-classifier HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    interface ChatCompletionResponse {
      choices?: Array<{ message?: { content?: string | null } }>;
    }
    const json = (await res.json()) as ChatCompletionResponse;
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error("karman-classifier: empty response from model");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`karman-classifier: model returned non-JSON content: ${raw.slice(0, 200)}`);
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("karman-classifier: model returned non-object JSON");
    }
    const obj = parsed as { flagged?: unknown; reason?: unknown };
    const flagged = obj.flagged === true;
    const reason = typeof obj.reason === "string" ? obj.reason : flagged ? "flagged" : "clean";
    return { flagged, reason };
  } finally {
    clearTimeout(timeout);
  }
}
