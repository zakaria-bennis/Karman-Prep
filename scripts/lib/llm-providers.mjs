// ============================================================
// Multi-provider LLM adapters. Single import surface for every
// pipeline script (grader, chart extractor, per-choice generator,
// Desmos-tips generator).
//
// Why one file: every provider has slightly different request +
// response shapes. Centralizing them here means each calling
// script just does:
//
//   import { callClaude, callGemini, callDeepSeek, callGroq } from
//     "../lib/llm-providers.mjs";
//   const json = await callClaude({ prompt, model, jsonSchema });
//
// All four return PARSED JSON when the call asked for JSON, or the
// raw text otherwise. Errors are typed: a QUOTA_EXHAUSTED error
// signals "stop the loop, no point retrying," anything else is a
// transient failure the caller can retry.
//
// Models supported (defaults shown; override per-call via opts):
//   · Gemini 2.5 Pro / Flash       — process.env.GEMINI_API_KEY
//   · Claude Opus 4.7 / Sonnet 4.6 — process.env.ANTHROPIC_API_KEY
//   · DeepSeek V3 / R1             — process.env.DEEPSEEK_API_KEY
//   · Llama 4 (via Groq)           — process.env.GROQ_API_KEY
// ============================================================

// Node's bundled undici client defaults to a 5-minute headersTimeout,
// which is too aggressive for large structured-output LLM calls.
// Gemini extracting ~98 questions from a 90-page PDF + emitting
// 50K+ output tokens can legitimately take 6-8 minutes during
// busy hours, especially over GitHub Actions networking. We set a
// 15-minute ceiling so the call doesn't get torn down mid-response.
//
// (Local Mac runs finished in 35s on the same workload, but Actions
// run #26315666375 hung for 5 minutes and then crashed with
// UND_ERR_HEADERS_TIMEOUT — hence this bump.)
import { Agent, setGlobalDispatcher } from "undici";
setGlobalDispatcher(
  new Agent({
    headersTimeout: 15 * 60 * 1000, // 15 min — Gemini long-tail
    bodyTimeout: 15 * 60 * 1000,
    connectTimeout: 60 * 1000, // 60 s for DNS + TCP handshake
    keepAliveTimeout: 60 * 1000,
    keepAliveMaxTimeout: 5 * 60 * 1000,
  })
);

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
// DeepSeek is reachable two ways: direct (api.deepseek.com — flaky from US,
// blocked on TX gov networks) or via OpenRouter (US-hosted aggregator, same
// price). We prefer OpenRouter when its key is set; falling back to direct
// only if the user explicitly populates DEEPSEEK_API_KEY.
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

/** Distinguish "we're out of credit / quota" from "transient error
 *  that's worth retrying." Calling scripts stop the batch when they
 *  see a QuotaExhaustedError. */
export class QuotaExhaustedError extends Error {
  constructor(provider, body) {
    super(`${provider} quota exhausted: ${body.slice(0, 200)}`);
    this.name = "QuotaExhaustedError";
    this.provider = provider;
  }
}

/** Soft failure — the call returned but the body wasn't valid JSON
 *  when JSON was requested. Caller usually retries once with a
 *  cleaner prompt, then gives up. */
export class ParseError extends Error {
  constructor(provider, raw) {
    super(`${provider} returned unparseable JSON: ${raw.slice(0, 200)}`);
    this.name = "ParseError";
    this.provider = provider;
    this.raw = raw;
  }
}

// ── Gemini (REST, supports text + image + PDF in one call) ──
// Reused from llm-grader.mjs but lifted here so other scripts
// don't have to duplicate the URL + body shape.
//
// Capabilities exposed:
//   · image input via inline_data (JPEG/PNG)
//   · PDF input via inline_data (mime application/pdf)
//   · systemInstruction (Gemini's equivalent of a system prompt)
//   · responseSchema for guaranteed-shape JSON output
//     (Gemini's analog to Anthropic's tool_use)
//   · raw maxOutputTokens override — extraction tasks need more
//     than the 4K default that the grader uses
export async function callGemini({
  prompt,
  model = "gemini-2.5-flash",
  systemPrompt = null,
  image = null,
  pdf = null,
  json = true,
  responseSchema = null,
  maxOutputTokens = 4096,
  temperature = 0.1,
  // Gemini 2.5+ uses internal "thinking" tokens that count against
  // maxOutputTokens. For small structured tasks (bbox detection,
  // classification) thinking is overkill and can starve the actual
  // output. Pass 0 to disable; -1 to let the model decide; null to
  // omit (uses model default).
  thinkingBudget = null,
}) {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not set");
  const parts = [];
  if (image)
    parts.push({ inline_data: { mime_type: image.mime, data: image.buf.toString("base64") } });
  if (pdf)
    parts.push({
      inline_data: { mime_type: "application/pdf", data: pdf.buf.toString("base64") },
    });
  parts.push({ text: prompt });
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(GEMINI_KEY)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
      generationConfig: {
        temperature,
        maxOutputTokens,
        ...(json ? { responseMimeType: "application/json" } : {}),
        ...(responseSchema ? { responseSchema } : {}),
        ...(thinkingBudget != null ? { thinkingConfig: { thinkingBudget } } : {}),
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || /quota|prepayment|deplet/i.test(body)) {
      throw new QuotaExhaustedError("gemini", body);
    }
    // Show the full error so schema/argument problems are diagnosable.
    throw new Error(`Gemini HTTP ${res.status}: ${body}`);
  }
  const responseJson = await res.json();

  // Diagnostic logging — every Gemini call dumps the response
  // metadata to stderr so we can see WHY responses come back empty
  // or wrong. Cheap (~5 lines of stderr per call) and the only way
  // to tell apart RECITATION vs SAFETY vs MAX_TOKENS vs early-stop
  // bias without per-call wireshark. Triggered by the 0-questions
  // mystery in workflow run #26316687585.
  try {
    const cand = responseJson?.candidates?.[0];
    const finishReason = cand?.finishReason ?? "(none)";
    const safety = cand?.safetyRatings ?? [];
    const blocked = safety.filter(
      (r) => r?.blocked === true || r?.probability === "HIGH" || r?.probability === "MEDIUM"
    );
    const usage = responseJson?.usageMetadata ?? {};
    const promptFb = responseJson?.promptFeedback;
    const textLen = (cand?.content?.parts?.[0]?.text ?? "").length;
    const summary = {
      model,
      finishReason,
      text_chars: textLen,
      prompt_tokens: usage.promptTokenCount,
      candidates_tokens: usage.candidatesTokenCount,
      thoughts_tokens: usage.thoughtsTokenCount,
      total_tokens: usage.totalTokenCount,
      ...(blocked.length ? { blocked_safety: blocked } : {}),
      ...(promptFb ? { promptFeedback: promptFb } : {}),
    };
    process.stderr.write(`[gemini-diag] ${JSON.stringify(summary)}\n`);
  } catch {
    /* never let diagnostics break the call */
  }

  const text = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!json) return text;
  // Gemini sometimes wraps JSON in markdown fences or adds a
  // "Here is the JSON:" preamble even when responseMimeType is set
  // to application/json — particularly noticed on image+schema
  // combined calls. The bracket-balanced extractor handles both.
  const parsed = extractJsonObject(text);
  if (parsed == null) throw new ParseError("gemini", text);
  return parsed;
}

// ── Claude (Anthropic Messages API) ──────────────────────────
// Defaults to Opus 4.7 — the strongest model for pedagogical
// writing (per-choice explanations, Desmos tips) + nuanced
// reading comprehension. Use sonnet for cheaper bulk operations
// where the per-call quality matters less.
export async function callClaude({
  prompt,
  model = "claude-opus-4-7",
  systemPrompt = null,
  image = null,
  // PDF input via Anthropic's document content block. Pass
  // `{ buf: Buffer }` and we wrap it as base64 application/pdf.
  // Used by extract-with-claude.mjs as the RECITATION-free
  // replacement for Gemini extraction.
  pdf = null,
  json = true,
  // When set, Claude is forced to respond by calling a tool whose
  // input_schema is `toolSchema`. Anthropic guarantees the response
  // input is valid JSON matching the schema — no text-parsing,
  // no LaTeX-vs-JSON escaping bugs. Use this for any structured
  // response that might contain math notation or special chars.
  toolSchema = null,
  maxTokens = 4096,
  // Opus 4.7 and later deprecated the `temperature` parameter — the model
  // picks an optimal value internally. Older Claudes (Sonnet 4.6, Opus 4.5)
  // still accept it. Pass an explicit number to force-include; leave null
  // (the default) to omit from the request entirely.
  temperature = null,
}) {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const content = [];
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mime, data: image.buf.toString("base64") },
    });
  }
  if (pdf) {
    content.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdf.buf.toString("base64"),
      },
    });
  }
  content.push({ type: "text", text: prompt });

  // Older Claudes accepted assistant-message prefill to force the
  // response to start with "{". Opus 4.7+ removed that capability;
  // instead we rely on the prompt instructing strict JSON and
  // extract the first { … } block from the response below. Net win
  // — it also tolerates markdown fences and preambles.
  const messages = [{ role: "user", content }];

  // Tool-use mode: forces a structured response. Anthropic validates
  // the args against `toolSchema` before returning, so LaTeX-in-JSON
  // escape bugs (e.g. raw `$\Delta x$` breaking JSON.parse) can't happen.
  const useTool = toolSchema != null;
  const tools = useTool
    ? [
        {
          name: "respond",
          description: "Submit the structured response.",
          input_schema: toolSchema,
        },
      ]
    : undefined;
  const tool_choice = useTool ? { type: "tool", name: "respond" } : undefined;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(temperature != null ? { temperature } : {}),
      ...(systemPrompt ? { system: systemPrompt } : {}),
      ...(useTool ? { tools, tool_choice } : {}),
      messages,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || /credit|balance|quota/i.test(body)) {
      throw new QuotaExhaustedError("anthropic", body);
    }
    throw new Error(`Anthropic HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const responseJson = await res.json();

  // Diagnostic logging — same pattern as the Gemini side. One stderr
  // line per call with stop_reason + usage so we can tell apart
  // max_tokens truncation from refusals from successful completions.
  // Added after run #26322982553 where Claude returned an empty tool
  // call after 7.7 minutes with no visibility into why.
  try {
    const stopReason = responseJson?.stop_reason ?? "(none)";
    const usage = responseJson?.usage ?? {};
    const contentTypes = (responseJson?.content ?? []).map((c) => c.type);
    const toolBlock = (responseJson?.content ?? []).find((c) => c.type === "tool_use");
    const summary = {
      model,
      stop_reason: stopReason,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_creation_input_tokens: usage.cache_creation_input_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens,
      content_blocks: contentTypes,
      tool_input_keys: toolBlock ? Object.keys(toolBlock.input ?? {}) : undefined,
    };
    process.stderr.write(`[claude-diag] ${JSON.stringify(summary)}\n`);
  } catch {
    /* never let diagnostics break the call */
  }

  if (useTool) {
    const block = (responseJson?.content ?? []).find((c) => c.type === "tool_use");
    if (!block) {
      throw new ParseError("anthropic", JSON.stringify(responseJson?.content ?? []));
    }
    return block.input;
  }
  const text = responseJson?.content?.[0]?.text ?? "";
  if (!json) return text;
  const parsed = extractJsonObject(text);
  if (parsed == null) throw new ParseError("anthropic", text);
  return parsed;
}

/** Pull a JSON object out of a free-form text response.
 *
 *  Why we need this: Claude responses often contain LaTeX (`$\frac{1}{2}$`)
 *  whose `{` and `}` will confuse any naive substring extractor. The
 *  approach here:
 *    1. Try `JSON.parse(text)` directly — Claude usually returns clean JSON.
 *    2. If that fails, scan for positions where `{` is followed by `"`
 *       (the start of a JSON object with string keys) and try a
 *       bracket-balanced scan from each candidate, respecting string
 *       boundaries so LaTeX braces inside string values don't break us.
 *    3. Return the first candidate that parses as valid JSON; null if none. */
function extractJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    /* fall through to candidate scan */
  }
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;
    // Must be followed by " (after optional whitespace) to look like a
    // JSON object start. Skips LaTeX braces like `{1}` whose next char
    // is a digit.
    let j = i + 1;
    while (j < text.length && /\s/.test(text[j])) j++;
    if (text[j] !== '"') continue;
    // Bracket-balanced scan from i, ignoring braces inside string literals.
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let k = i; k < text.length; k++) {
      const ch = text[k];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(i, k + 1));
          } catch {
            break; // this candidate didn't parse; try the next `{`
          }
        }
      }
    }
  }
  return null;
}

// ── DeepSeek (OpenAI-compatible chat completions) ────────────
// DeepSeek V3 is the strong general model; R1 has explicit
// reasoning chains (slower, costlier — use only for hard math).
// Default is V3 for the cheap-vote use case.
//
// Routing: OpenRouter > direct DeepSeek. OpenRouter is US-hosted,
// uses the same OpenAI-compatible schema, and prices match within
// pennies. The model id is namespaced when routing through
// OpenRouter (`deepseek/deepseek-chat`) vs bare (`deepseek-chat`)
// when hitting api.deepseek.com directly — we translate here so
// callers can keep passing the short name.
export async function callDeepSeek({
  prompt,
  model = "deepseek-chat",
  systemPrompt = null,
  json = true,
}) {
  const useOpenRouter = Boolean(OPENROUTER_KEY);
  const apiKey = useOpenRouter ? OPENROUTER_KEY : DEEPSEEK_KEY;
  if (!apiKey) throw new Error("Set OPENROUTER_API_KEY (preferred) or DEEPSEEK_API_KEY");

  const url = useOpenRouter
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.deepseek.com/v1/chat/completions";
  // OpenRouter wants the provider-prefixed model id; pass-through if
  // the caller already supplied one (e.g. "deepseek/deepseek-r1").
  const resolvedModel = useOpenRouter && !model.includes("/") ? `deepseek/${model}` : model;
  const providerName = useOpenRouter ? "openrouter" : "deepseek";

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
  };
  if (useOpenRouter) {
    // Optional but recommended by OpenRouter — shows up in their
    // analytics dashboard so the user can see usage by project.
    headers["HTTP-Referer"] = "https://karmanprep.com";
    // ASCII-only — HTTP headers must be ByteString. The em dash
    // that previously lived here threw "character > 255" on every
    // DeepSeek call, silently zeroing out one voter in the multi-vote
    // grader.
    headers["X-Title"] = "Karman Prep - content pipeline";
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: resolvedModel,
      messages,
      temperature: 0.1,
      max_tokens: 2048,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || /quota|balance|insufficient|credit/i.test(body)) {
      throw new QuotaExhaustedError(providerName, body);
    }
    throw new Error(`${providerName} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const responseJson = await res.json();
  const text = responseJson?.choices?.[0]?.message?.content ?? "";
  if (!json) return text;
  try {
    return JSON.parse(text);
  } catch {
    throw new ParseError(providerName, text);
  }
}

// ── Groq Llama (OpenAI-compatible chat completions) ──────────
// Workhorse fallback. Free tier has generous limits. No vision —
// strictly text-only.
// Native Groq model names vs OpenRouter model names. Groq uses
// short names ("llama-3.3-70b-versatile"); OpenRouter uses
// vendor-qualified ones ("meta-llama/llama-3.3-70b-instruct").
// We accept the GROQ-style name everywhere and translate at call
// time so callers don't need to know which provider they're hitting.
const GROQ_TO_OPENROUTER_MODEL = {
  "llama-3.3-70b-versatile": "meta-llama/llama-3.3-70b-instruct",
  "llama-3.1-70b-versatile": "meta-llama/llama-3.1-70b-instruct",
  "llama-3.1-8b-instant": "meta-llama/llama-3.1-8b-instruct",
};

export async function callGroq({
  prompt,
  model = "llama-3.3-70b-versatile",
  systemPrompt = null,
  json = true,
}) {
  // Provider routing (mirrors callDeepSeek's two-path approach):
  //
  //   OpenRouter when OPENROUTER_API_KEY set (user hit Groq free
  //   tier on 2026-05-28 — we route Llama calls through OpenRouter
  //   from then on rather than dual-billing). OpenRouter charges
  //   per-token same as Groq paid tier for Llama 3.3 70B.
  //
  //   Direct Groq when only GROQ_API_KEY is set (matches the old
  //   behavior for users who haven't set up OpenRouter).
  const useOpenRouter = OPENROUTER_KEY != null;
  if (!useOpenRouter && !GROQ_KEY) {
    throw new Error("Set OPENROUTER_API_KEY (preferred) or GROQ_API_KEY");
  }

  const providerName = useOpenRouter ? "groq_via_openrouter" : "groq";
  const url = useOpenRouter
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.groq.com/openai/v1/chat/completions";
  const apiKey = useOpenRouter ? OPENROUTER_KEY : GROQ_KEY;
  const actualModel = useOpenRouter ? (GROQ_TO_OPENROUTER_MODEL[model] ?? model) : model;

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      // OpenRouter recommends an HTTP-Referer + X-Title for
      // attribution on their dashboard. Harmless when missing.
      // HTTP headers must be ASCII (or ISO-8859-1). An em dash
      // here threw "Cannot convert argument to a ByteString" at
      // fetch() time, killing every Groq call in tonight's smoke
      // resume. Plain hyphen-only label avoids the issue.
      ...(useOpenRouter
        ? {
            "http-referer": "https://karmanprep.com",
            "x-title": "Karman Prep - grader Llama role",
          }
        : {}),
    },
    body: JSON.stringify({
      model: actualModel,
      messages,
      temperature: 0.1,
      max_tokens: 2048,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || /quota|credit|deplet/i.test(body)) {
      throw new QuotaExhaustedError(providerName, body);
    }
    throw new Error(`${providerName} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const responseJson = await res.json();
  const text = responseJson?.choices?.[0]?.message?.content ?? "";
  if (!json) return text;
  try {
    return JSON.parse(text);
  } catch {
    throw new ParseError(providerName, text);
  }
}

// ── Multi-provider voting helper ─────────────────────────────
// Sends the same prompt to N providers in parallel, returns each
// vote. Used by grader Pass 1 (cheap consensus across Flash +
// DeepSeek + Llama).
//
// Tolerates individual provider failures: returns the votes that
// SUCCEEDED + a list of errors. Throws only if ALL providers
// failed.
export async function voteAcrossProviders(providers) {
  if (!providers || providers.length === 0) {
    throw new Error("voteAcrossProviders called with no providers");
  }
  const results = await Promise.allSettled(
    providers.map(async (p) => {
      const t0 = Date.now();
      try {
        const value = await p.call();
        return { provider: p.name, ok: true, value, ms: Date.now() - t0 };
      } catch (err) {
        return {
          provider: p.name,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          ms: Date.now() - t0,
        };
      }
    })
  );
  const votes = results.map((r) =>
    r.status === "fulfilled" ? r.value : { ok: false, error: String(r.reason) }
  );
  const successes = votes.filter((v) => v.ok);
  if (successes.length === 0) {
    throw new Error(
      `All ${votes.length} providers failed: ${votes.map((v) => `${v.provider}=${v.error}`).join("; ")}`
    );
  }
  return votes;
}
