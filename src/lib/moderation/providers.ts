// ============================================================
// Layer-2 moderation providers.
//
// Two free APIs run in parallel against every message:
//   · OpenAI Moderation — categorical safety; especially good
//     for sexual/minors, self-harm, hate, violence, harassment.
//     Free, unlimited.
//   · Gemini Flash      — general-purpose LLM for the nuanced
//     stuff: subtle bullying, off-topic chatter, encouragement
//     of cheating. Free tier (15 RPM, 1500 RPD) covers our
//     expected chat volume comfortably.
//
// Both wrapped in a 4-second AbortController timeout. Pipeline
// fails OPEN if both fail (deliver + flag for retroactive
// review) — chat shouldn't break when moderators are slow.
// ============================================================

const PROVIDER_TIMEOUT_MS = 4_000;

// ─────────────────────────────────────────────────────────────
// OpenAI Moderation
// ─────────────────────────────────────────────────────────────

export type OpenAICategory =
  | "sexual"
  | "sexual/minors"
  | "harassment"
  | "harassment/threatening"
  | "hate"
  | "hate/threatening"
  | "self-harm"
  | "self-harm/intent"
  | "self-harm/instructions"
  | "violence"
  | "violence/graphic";

/** Categories that always escalate to HIGH severity (rejected and
 *  held). Anything else that flags becomes MEDIUM (delivered + queued). */
const OPENAI_HIGH_SEVERITY: ReadonlySet<OpenAICategory> = new Set([
  "sexual/minors",
  "self-harm/intent",
  "self-harm/instructions",
  "violence/graphic",
  "harassment/threatening",
  "hate/threatening",
]);

export interface OpenAIModerationResult {
  flagged: boolean;
  /** Highest-scoring category that was flagged. Empty when nothing fires. */
  worstCategory: OpenAICategory | null;
  worstScore: number;
  /** Whether any flagged category falls in the always-high-severity set. */
  isHighSeverity: boolean;
}

export async function callOpenAIModeration(
  content: string
): Promise<OpenAIModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: content,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`openai-moderation HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    interface OpenAIModerationResponse {
      results?: Array<{
        flagged?: boolean;
        categories?: Partial<Record<OpenAICategory, boolean>>;
        category_scores?: Partial<Record<OpenAICategory, number>>;
      }>;
    }
    const json = (await res.json()) as OpenAIModerationResponse;
    const r = json.results?.[0];
    if (!r) {
      return { flagged: false, worstCategory: null, worstScore: 0, isHighSeverity: false };
    }

    if (!r.flagged) {
      return { flagged: false, worstCategory: null, worstScore: 0, isHighSeverity: false };
    }

    const flaggedCats = Object.entries(r.categories ?? {})
      .filter(([, v]) => v === true)
      .map(([k]) => k as OpenAICategory);

    let worstCategory: OpenAICategory | null = null;
    let worstScore = 0;
    for (const cat of flaggedCats) {
      const score = r.category_scores?.[cat] ?? 0;
      if (score > worstScore) {
        worstScore = score;
        worstCategory = cat;
      }
    }

    const isHighSeverity = flaggedCats.some((c) => OPENAI_HIGH_SEVERITY.has(c));
    return { flagged: true, worstCategory, worstScore, isHighSeverity };
  } finally {
    clearTimeout(timeout);
  }
}

// ─────────────────────────────────────────────────────────────
// Gemini Flash — nuanced LLM moderation
// ─────────────────────────────────────────────────────────────

export type GeminiSeverity = "low" | "medium" | "high";

export interface GeminiModerationResult {
  flagged: boolean;
  reason: string;
  severity: GeminiSeverity;
}

const GEMINI_MODEL = "gemini-2.0-flash";

const GEMINI_SYSTEM_PROMPT = [
  "You are a content moderator for an educational platform that serves SAT-preparation students aged 14 to 18.",
  "Your job is to flag chat messages that:",
  "- contain bullying or harassment, even if subtle (sarcasm, dog-piling, exclusion).",
  "- contain inappropriate romantic or sexual content.",
  "- contain personal identifying information not caught by a keyword filter — e.g. partial phone numbers, addresses, full school names paired with last names.",
  "- are completely unrelated to academics or normal supportive peer conversation (this is not a free-chat platform).",
  "- encourage cheating or academic dishonesty.",
  "- contain anything that would make a parent uncomfortable seeing their child send or receive.",
  "",
  "OpenAI Moderation already covers obvious safety categories (sexual, self-harm, violence) — focus on what THAT model misses: subtle bullying, off-topic chatter, cheating-adjacent.",
  "",
  'Respond ONLY with a single JSON object: {"flagged": boolean, "reason": string, "severity": "low" | "medium" | "high"}.',
  "Use severity high for content that should be held until a human reviews (threats, doxxing, bullying with named target).",
  "Use severity medium for content the platform should still deliver but record for review (subtle bullying, off-topic chatter, cheating-adjacent hints).",
  "Use severity low for borderline cases worth logging.",
  "Set flagged=false only if the message is clearly fine.",
].join("\n");

export async function callGeminiModeration(
  content: string
): Promise<GeminiModerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [{ text: `Moderate this student message:\n\n---\n${content}\n---` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
          maxOutputTokens: 200,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`gemini HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    interface GeminiResponse {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    }
    const json = (await res.json()) as GeminiResponse;
    const text = json.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text ?? "";
    return parseGeminiJson(text);
  } finally {
    clearTimeout(timeout);
  }
}

function parseGeminiJson(raw: string): GeminiModerationResult {
  const stripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/^```\s*/i, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    console.warn("[moderation] could not parse Gemini response, defaulting to low-severity flag");
    return { flagged: true, reason: "Moderator response unparseable", severity: "low" };
  }

  const obj = parsed as Partial<GeminiModerationResult>;
  const flagged = obj.flagged === true;
  const severity: GeminiSeverity =
    obj.severity === "high" || obj.severity === "medium" || obj.severity === "low"
      ? obj.severity
      : "low";
  const reason = typeof obj.reason === "string" ? obj.reason : "";
  return { flagged, reason, severity };
}
