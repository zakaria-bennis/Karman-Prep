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
    // 30 min — covers Moonshot Kimi K2.5 streaming, which takes
    // 13-15 min for ~30K output tokens on the SAT extraction
    // workload. Headroom for slower runs / GitHub Actions latency.
    headersTimeout: 30 * 60 * 1000,
    bodyTimeout: 30 * 60 * 1000,
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
//   · PDF input via inline_data (mime application/pdf) OR file_data
//     (a caller-supplied pre-uploaded file URI, for PDFs over the
//     ~14 MB inline-body cap)
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
  if (pdf) {
    // Two PDF paths: inline base64 (small PDFs, simple) vs file_data
    // referencing a caller-supplied pre-uploaded file URI (large
    // PDFs). Caller picks based on size.
    if (pdf.fileUri) {
      parts.push({
        file_data: { mime_type: pdf.mimeType ?? "application/pdf", file_uri: pdf.fileUri },
      });
    } else if (pdf.buf) {
      parts.push({
        inline_data: { mime_type: "application/pdf", data: pdf.buf.toString("base64") },
      });
    } else {
      throw new Error("callGemini({pdf}) requires either { buf } or { fileUri }");
    }
  }
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
// ── Anthropic Files API ────────────────────────────────────────
//
// Used by callClaude when a PDF is provided. Two reasons:
//   1. Anthropic's inline document block caps at ~20 MB total
//      request body (including system prompt + base64 PDF). We
//      had a hard 18 MB ceiling in extract-with-gemini.mjs that
//      blocked any PDF larger than ~13 MB raw.
//   2. Files API supports up to 500 MB per file, expires after
//      30 days, and is part of standard API pricing (no premium).
//
// Per-call flow:
//   · Upload PDF to /v1/files (multipart) → get file_id
//   · Reference file_id in the /v1/messages document block
//   · Anthropic charges the same input tokens as inline upload
//
// We deliberately do NOT delete the file after the call — they
// expire on their own and reuse across multiple calls (e.g. the
// answer-key parser hitting the same PDF) avoids re-uploading.
export async function uploadAnthropicFile(
  buf,
  { mimeType = "application/pdf", filename = "upload.pdf" } = {}
) {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const form = new FormData();
  // Node 18+ Blob is fine; sharp + buffer→Blob handoff is well-tested.
  const blob = new Blob([buf], { type: mimeType });
  form.append("file", blob, filename);
  const res = await fetch("https://api.anthropic.com/v1/files", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "files-api-2025-04-14",
    },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || /credit|balance|quota/i.test(body)) {
      throw new QuotaExhaustedError("anthropic", body);
    }
    throw new Error(`Anthropic Files HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  if (!json?.id) {
    throw new ParseError("anthropic_files", JSON.stringify(json));
  }
  return { fileId: json.id, sizeBytes: json.size_bytes, mimeType: json.mime_type };
}

// ── SSE parser for streaming Claude responses ──────────────────
//
// Reads the streaming body and accumulates the final response shape
// the non-streaming path would have produced. We MUST stream when
// expected output is > ~8K tokens or expected duration > 60 sec —
// otherwise Anthropic's server-side closes non-streaming connections
// at the 10-minute mark mid-response.
//
// Event types we care about:
//   · content_block_start  — opens a text or tool_use block
//   · content_block_delta  — text_delta or input_json_delta chunks
//   · content_block_stop   — closes the block
//   · message_delta        — stop_reason + usage at end
//   · message_stop         — final event
//
// We accumulate into the same `content` array shape that the
// non-streaming endpoint returns, so the downstream block-finding
// code at the bottom of callClaude doesn't need to know which
// transport was used.
export async function parseClaudeSSE(response) {
  if (!response.body) throw new Error("response has no body to stream from");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const content = []; // accumulated content blocks
  let stopReason = null;
  let usage = {};
  // Track which block index is open + accumulating into which slot of `content`
  // (tool_use blocks accumulate partial_json strings; text blocks accumulate text)
  const openBlocks = new Map();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE messages are separated by \n\n
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      // Each chunk is one or more "field: value" lines.
      let data = null;
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ")) data = line.slice(6);
      }
      if (!data) continue;
      let evt;
      try {
        evt = JSON.parse(data);
      } catch {
        continue; // malformed line, skip
      }
      if (evt.type === "content_block_start") {
        const block = evt.content_block;
        // Initialize the accumulator. For tool_use, input is built
        // up from input_json_delta strings; for text, text is built
        // up from text_delta strings.
        const slot = { ...block };
        if (block.type === "tool_use") slot._partial = "";
        if (block.type === "text") slot.text = "";
        content[evt.index] = slot;
        openBlocks.set(evt.index, slot);
      } else if (evt.type === "content_block_delta") {
        const slot = openBlocks.get(evt.index);
        if (!slot) continue;
        if (evt.delta?.type === "text_delta") {
          slot.text = (slot.text ?? "") + (evt.delta.text ?? "");
        } else if (evt.delta?.type === "input_json_delta") {
          slot._partial = (slot._partial ?? "") + (evt.delta.partial_json ?? "");
        }
      } else if (evt.type === "content_block_stop") {
        const slot = openBlocks.get(evt.index);
        if (!slot) continue;
        // For tool_use, finalize input by parsing the accumulated JSON.
        if (slot.type === "tool_use") {
          try {
            slot.input = JSON.parse(slot._partial || "{}");
          } catch {
            slot.input = {};
          }
          delete slot._partial;
        }
        openBlocks.delete(evt.index);
      } else if (evt.type === "message_delta") {
        if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason;
        if (evt.usage) usage = { ...usage, ...evt.usage };
      } else if (evt.type === "message_start") {
        usage = { ...usage, ...(evt.message?.usage ?? {}) };
      }
      // message_stop: nothing to do; loop will exit when reader.done
    }
  }
  return { content, stop_reason: stopReason, usage };
}

export async function callClaude({
  prompt,
  model = "claude-opus-4-7",
  systemPrompt = null,
  image = null,
  // PDF input. Now ALWAYS goes through Anthropic's Files API
  // (regardless of size) so the inline 20 MB request-body cap never
  // bites. Pass `{ buf: Buffer, filename? }`. If you have a Files
  // API id already (e.g. from a prior call against the same PDF),
  // pass `{ fileId: "file_xxx" }` instead to skip re-upload.
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
  // Set to true for any call where output is expected to be > ~8K
  // tokens OR duration > 60 sec. Non-streaming requests get killed
  // by Anthropic's server at the 10-minute mark. The PDF extractor
  // and the explanation generator both ride this edge.
  stream = false,
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
    // Two intake shapes:
    //   { buf: Buffer, filename? }  → upload via Files API
    //   { fileId: "file_xxx" }      → reuse an already-uploaded file
    let fileId = pdf.fileId;
    if (!fileId && pdf.buf) {
      const uploaded = await uploadAnthropicFile(pdf.buf, {
        mimeType: "application/pdf",
        filename: pdf.filename ?? "input.pdf",
      });
      fileId = uploaded.fileId;
    }
    if (!fileId) {
      throw new Error("callClaude({pdf}) requires either { buf } or { fileId }");
    }
    content.push({
      type: "document",
      source: { type: "file", file_id: fileId },
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
      // Files API beta header — required whenever a content block
      // references a file_id. No-op for messages that don't use one.
      "anthropic-beta": "files-api-2025-04-14",
      ...(stream ? { accept: "text/event-stream" } : {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(temperature != null ? { temperature } : {}),
      ...(systemPrompt ? { system: systemPrompt } : {}),
      ...(useTool ? { tools, tool_choice } : {}),
      ...(stream ? { stream: true } : {}),
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
  const responseJson = stream ? await parseClaudeSSE(res) : await res.json();

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

// ── Moonshot AI direct (Kimi K2.5 / K2.6) ─────────────────────
//
// The OpenRouter path above is convenient but reroutes PDFs through
// an opaque text-parsing layer that strips math notation + figure
// context. Verified empirically (2026-05-30) on 202406asiav2.pdf:
// OpenRouter's Kimi got 98 rows back but the math questions were
// generic SAT-style hallucinations ("In the figure above, what is
// the value of x?") instead of the real PDF content.
//
// Moonshot's own platform exposes the parser as a separate step,
// which gives the model a much higher-fidelity view of the PDF.
// Same K2.5 model, different transport, materially better output.
// Verified on the same smoke PDF: extraction_order=57 returned the
// real polynomial question "Which expression is equivalent to
// (x^3 + 4x^2 - 3x) + 5(x^2 + 8)?" with the correct answer choices,
// matching what Sonnet produced.
//
// Per-call flow:
//   1. uploadMoonshotFile(buf, "x.pdf") → returns { fileId }
//   2. fetchMoonshotFileContent(fileId) → returns parsed text body
//   3. callMoonshot({ prompt, fileText, systemPrompt, ... })
//      injects fileText as a second system message, then runs the
//      chat completion (streaming required for long extractions).
//
// We DON'T delete files after use — Moonshot expires them on their
// own and reusing across stages avoids re-uploading.

const MOONSHOT_KEY = process.env.MOONSHOT_API_KEY;
const MOONSHOT_BASE = "https://api.moonshot.ai/v1";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE = "https://api.openai.com/v1";

/**
 * Upload a PDF (or any extractable file) to Moonshot's Files API
 * with purpose="file-extract". Returns the file id used to fetch
 * the parsed content in a subsequent call.
 */
export async function uploadMoonshotFile(
  buf,
  { mimeType = "application/pdf", filename = "upload.pdf" } = {}
) {
  if (!MOONSHOT_KEY) throw new Error("MOONSHOT_API_KEY not set");
  const form = new FormData();
  form.append("file", new Blob([buf], { type: mimeType }), filename);
  form.append("purpose", "file-extract");
  const res = await fetch(`${MOONSHOT_BASE}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${MOONSHOT_KEY}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || /quota|balance|insufficient|recharge/i.test(body)) {
      throw new QuotaExhaustedError("moonshot_files", body);
    }
    throw new Error(`Moonshot Files HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  if (!json?.id) throw new ParseError("moonshot_files", JSON.stringify(json));
  return { fileId: json.id, bytes: json.bytes, filename: json.filename };
}

/**
 * Retrieve the parsed text content of a previously uploaded file.
 * Moonshot's parser returns a JSON envelope; callers usually pass
 * the raw response body straight through to the chat completion as
 * a system message — Kimi knows how to interpret it.
 */
export async function fetchMoonshotFileContent(fileId) {
  if (!MOONSHOT_KEY) throw new Error("MOONSHOT_API_KEY not set");
  const res = await fetch(`${MOONSHOT_BASE}/files/${encodeURIComponent(fileId)}/content`, {
    headers: { Authorization: `Bearer ${MOONSHOT_KEY}` },
  });
  if (!res.ok) {
    throw new Error(
      `Moonshot file content HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`
    );
  }
  return await res.text();
}

/**
 * Call Kimi via Moonshot's direct chat completions endpoint.
 * Mandatory streaming — long extractions (~13 min for the smoke
 * PDF) blow past non-streaming timeouts.
 *
 * fileText, when provided, is injected as a second system message
 * per Moonshot's documented pattern for file-based Q&A. systemPrompt
 * (the instruction prompt) goes first.
 *
 * temperature defaults to 1 because K2.5 rejects any other value
 * ("only 1 is allowed for this model").
 *
 * Returns the parsed JSON object when json=true (the default),
 * otherwise the raw text body.
 */
export async function callMoonshot({
  prompt,
  model = "kimi-k2.5",
  systemPrompt = null,
  fileText = null,
  json = true,
  maxOutputTokens = 32768,
  temperature = 1,
}) {
  if (!MOONSHOT_KEY) throw new Error("MOONSHOT_API_KEY not set");

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  if (fileText) messages.push({ role: "system", content: fileText });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${MOONSHOT_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MOONSHOT_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxOutputTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      stream: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || /quota|balance|insufficient|recharge/i.test(body)) {
      throw new QuotaExhaustedError("moonshot", body);
    }
    throw new Error(`Moonshot HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  if (!res.body) throw new Error("Moonshot streaming response had no body");

  // SSE parse — accumulate delta.content from each event. Moonshot
  // uses the same OpenAI-compatible event shape as DeepSeek/Groq.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let finishReason = null;
  let usage = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      if (!event.startsWith("data: ")) continue;
      const data = event.slice(6);
      if (data === "[DONE]") continue;
      try {
        const obj = JSON.parse(data);
        const delta = obj.choices?.[0]?.delta?.content ?? "";
        accumulated += delta;
        if (obj.choices?.[0]?.finish_reason) finishReason = obj.choices[0].finish_reason;
        if (obj.usage) usage = obj.usage;
      } catch {
        /* malformed SSE chunk — skip; the final parse will tell us if we lost important data */
      }
    }
  }

  // Stderr diagnostic — every Moonshot call dumps finish reason + usage
  // so the operator can see truncation / quota issues without tailing
  // the raw stream. Mirrors the [gemini-diag] / [kimi-diag] pattern.
  try {
    process.stderr.write(
      `[moonshot-diag] ${JSON.stringify({ model, finish_reason: finishReason, content_chars: accumulated.length, prompt_tokens: usage?.prompt_tokens, completion_tokens: usage?.completion_tokens, total_tokens: usage?.total_tokens })}\n`
    );
  } catch {
    /* never let diagnostics break the call */
  }

  if (!json) return accumulated;
  const parsed = extractJsonObject(accumulated);
  if (parsed == null) throw new ParseError("moonshot", accumulated);
  return parsed;
}

// ── Moonshot vision (Kimi K2.5 multimodal / MoonViT) ─────────
//
// Unlike callMoonshot (which feeds Moonshot's file-extract TEXT), this
// sends rendered page IMAGES directly. That bypasses every PDF/text
// parser in the chain — which matters when the source PDF has a damaged
// xref and the text parser silently drops pages. Same streaming SSE
// shape as callMoonshot; the user message carries one text block + N
// image_url blocks (OpenAI-compatible data URLs).
//
// images: array of { buffer: Buffer, mimeType?: string } (defaults to
// image/png). Verified empirically (2026-05-30) that kimi-k2.5 accepts
// images and OCRs SAT Bluebook page screenshots faithfully (~4.2K
// prompt tokens per full-page PNG).
export async function callMoonshotVision({
  prompt,
  images,
  model = "kimi-k2.5",
  systemPrompt = null,
  json = true,
  maxOutputTokens = 32768,
  temperature = 1,
}) {
  if (!MOONSHOT_KEY) throw new Error("MOONSHOT_API_KEY not set");
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("callMoonshotVision requires a non-empty images array");
  }

  const userContent = [{ type: "text", text: prompt }];
  for (const img of images) {
    const b64 = Buffer.isBuffer(img?.buffer) ? img.buffer.toString("base64") : img?.base64;
    if (!b64) throw new Error("callMoonshotVision: each image needs { buffer } or { base64 }");
    const mime = img?.mimeType ?? "image/png";
    userContent.push({ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } });
  }

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userContent });

  const res = await fetch(`${MOONSHOT_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MOONSHOT_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxOutputTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      stream: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || /quota|balance|insufficient|recharge/i.test(body)) {
      throw new QuotaExhaustedError("moonshot", body);
    }
    throw new Error(`Moonshot vision HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  if (!res.body) throw new Error("Moonshot vision streaming response had no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let finishReason = null;
  let usage = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      if (!event.startsWith("data: ")) continue;
      const data = event.slice(6);
      if (data === "[DONE]") continue;
      try {
        const obj = JSON.parse(data);
        accumulated += obj.choices?.[0]?.delta?.content ?? "";
        if (obj.choices?.[0]?.finish_reason) finishReason = obj.choices[0].finish_reason;
        if (obj.usage) usage = obj.usage;
      } catch {
        /* malformed SSE chunk — skip */
      }
    }
  }

  try {
    process.stderr.write(
      `[moonshot-vision-diag] ${JSON.stringify({ model, images: images.length, finish_reason: finishReason, content_chars: accumulated.length, prompt_tokens: usage?.prompt_tokens, completion_tokens: usage?.completion_tokens })}\n`
    );
  } catch {
    /* never let diagnostics break the call */
  }

  if (!json) return accumulated;
  const parsed = extractJsonObject(accumulated);
  if (parsed == null) throw new ParseError("moonshot_vision", accumulated);
  return parsed;
}

// ── OpenAI vision (gpt-5.x multimodal) ───────────────────────
//
// Same shape as callMoonshotVision (page images as image_url blocks),
// but the OpenAI Chat Completions API: uses max_completion_tokens (not
// max_tokens) and omits temperature (the gpt-5 reasoning models reject
// non-default values). Verified (2026-05-31) that gpt-5.5 OCRs SAT
// Bluebook screenshots faithfully (~9.9K prompt tokens per full page +
// some reasoning tokens — materially pricier than Kimi).
export async function callOpenAIVision({
  prompt,
  images,
  model = "gpt-5.5",
  systemPrompt = null,
  json = true,
  maxOutputTokens = 32768,
}) {
  if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY not set");
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("callOpenAIVision requires a non-empty images array");
  }

  const userContent = [{ type: "text", text: prompt }];
  for (const img of images) {
    const b64 = Buffer.isBuffer(img?.buffer) ? img.buffer.toString("base64") : img?.base64;
    if (!b64) throw new Error("callOpenAIVision: each image needs { buffer } or { base64 }");
    const mime = img?.mimeType ?? "image/png";
    userContent.push({ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } });
  }

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userContent });

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: maxOutputTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || /quota|insufficient_quota|rate.?limit/i.test(body)) {
      throw new QuotaExhaustedError("openai", body);
    }
    throw new Error(`OpenAI vision HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  if (!res.body) throw new Error("OpenAI vision streaming response had no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let finishReason = null;
  let usage = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      if (!event.startsWith("data: ")) continue;
      const data = event.slice(6);
      if (data === "[DONE]") continue;
      try {
        const obj = JSON.parse(data);
        accumulated += obj.choices?.[0]?.delta?.content ?? "";
        if (obj.choices?.[0]?.finish_reason) finishReason = obj.choices[0].finish_reason;
        if (obj.usage) usage = obj.usage;
      } catch {
        /* malformed SSE chunk — skip */
      }
    }
  }

  try {
    process.stderr.write(
      `[openai-vision-diag] ${JSON.stringify({ model, images: images.length, finish_reason: finishReason, content_chars: accumulated.length, prompt_tokens: usage?.prompt_tokens, completion_tokens: usage?.completion_tokens })}\n`
    );
  } catch {
    /* never let diagnostics break the call */
  }

  if (!json) return accumulated;
  const parsed = extractJsonObject(accumulated);
  if (parsed == null) throw new ParseError("openai_vision", accumulated);
  return parsed;
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
