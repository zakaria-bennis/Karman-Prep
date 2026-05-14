// ============================================================
// Layer-2 moderation provider.
//
// Single provider — OpenAI Moderation:
//   · Free endpoint (with billing on file), categorical safety;
//     especially good for sexual/minors, self-harm, hate,
//     violence, harassment.
//   · Wrapped in a 4-second AbortController timeout.
//
// Pipeline fails CLOSED if this errors (rejects the message and
// asks the user to retry) — see src/lib/moderation/pipeline.ts.
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
