# Karman Prep — PDF ingestion pipeline, full context for collaboration

> **What this document is.** A self-contained reference for the Karman Prep
> SAT-question PDF ingestion pipeline as it actually runs on 2026-05-25.
> Every prompt, schema, regex, migration, and gnarly code path is inlined
> verbatim so an outside collaborator (ChatGPT, a new contributor, a
> consulting engineer) can critique it and propose redesigns without ever
> needing to crack open the repo.
>
> **How to use it.** Read §1 for the 10,000-ft view. Skim §2 for the
> stage-by-stage tour with the exact prompts and code. Jump to §17 ("the
> drift map") and §19 ("open questions + redesign opportunities") when
> you're ready to start proposing changes — those frame the problem
> space.
>
> **Companion doc.** A leaner "as-of" reference lives at
> `docs/ingestion/pipeline-as-of-2026-05-24.md` (~67 KB, 800 lines). This
> doc absorbs it and adds the verbatim prompts, schemas, code snippets,
> SQL DDL, and workflow YAMLs that the lean version only describes.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [The pipeline at a glance](#2-the-pipeline-at-a-glance)
3. [Stage 0 — a PDF enters the system](#3-stage-0--a-pdf-enters-the-system)
4. [Stage 1 — extraction (Claude Sonnet 4.6)](#4-stage-1--extraction-claude-sonnet-46)
5. [Stage 2 — figures (Gemini Flash bbox + sharp crop + R2)](#5-stage-2--figures-gemini-flash-bbox--sharp-crop--r2)
6. [Stage 3 — emit 32-column CSV](#6-stage-3--emit-32-column-csv)
7. [Stage 4 — DB import (two parallel paths)](#7-stage-4--db-import-two-parallel-paths)
8. [Stage 5 — content fill (three Claude calls)](#8-stage-5--content-fill-three-claude-calls)
9. [Stage 6 — multi-vote grader (cascade)](#9-stage-6--multi-vote-grader-cascade)
10. [The older 8-pass grader (not in main path)](#10-the-older-8-pass-grader-not-in-main-path)
11. [Database schema — every relevant table](#11-database-schema--every-relevant-table)
12. [The 89-slug taxonomy](#12-the-89-slug-taxonomy)
13. [Deterministic audit rules](#13-deterministic-audit-rules)
14. [Renderer expectations](#14-renderer-expectations)
15. [CI workflows](#15-ci-workflows)
16. [Known failure modes (live + recently fixed)](#16-known-failure-modes-live--recently-fixed)
17. [The two-paths / two-graders / four-taxonomies drift map](#17-the-two-paths--two-graders--four-taxonomies-drift-map)
18. [Cost and wall-time per PDF](#18-cost-and-wall-time-per-pdf)
19. [Open questions and redesign opportunities](#19-open-questions-and-redesign-opportunities)

---

## 1. Executive summary

Karman Prep takes a College Board SAT practice PDF (4 modules, ~98
questions, ~80-120 pages) and turns it into rows in `quiz_questions` that
students see in the adaptive practice UI. There is **no per-page parser,
no OCR step, no regex over module headers** — Claude Sonnet 4.6 reads
the whole PDF as a single `document` content block, emits ~98 structured
JSON rows via tool-use, and downstream stages (figures, CSV, DB, fill,
grade) fan out from there.

The pipeline has two front doors:

- **Web upload** → operator drops a PDF on `/admin/pdf-pipeline/upload`
  in the Cloudflare Worker → R2 upload → `pdf_processing_jobs` row →
  GitHub `repository_dispatch` → `process-pdf.yml` runs
  `orchestrate.mjs` → 6 sub-stages → live progress streams back to the
  job row via the `progress` JSONB column.
- **Local shell** → `npm run pdf:extract -- <file>.pdf` runs the
  extraction-only wrapper (`scripts/pdf-pipeline/run-extraction.mjs`)
  without a job row, R2, or CI.

Both share the same underlying scripts; the orchestrator just chains
them and writes progress.

Total cost per PDF: **~$2.30–$2.50** (estimated; actual depends on the
size of the bank backlog the fill + grade stages clear). Total wall
time: **5–10 minutes** when the bank is fresh, can stretch to ~3 hours
when the fill stage has to chew through a large un-filled backlog from
prior imports.

This document inlines every prompt, schema, migration, workflow, and
the gnarly post-validation / bbox / hash code so that a redesign
discussion can stay grounded in what the system actually does, not
what the docs claim it does. **The docs and code disagree in several
places — those drifts are flagged with `> **Drift:**` callouts
throughout.**

---

## 2. The pipeline at a glance

```text
                   ┌─────────────────────────────────────────────┐
                   │  /admin/pdf-pipeline/upload (Cloudflare)     │
                   │  Server action → R2 + pdf_processing_jobs    │
                   │  → repository_dispatch (type process-pdf)    │
                   └─────────────────────┬───────────────────────┘
                                          │
                                          ▼
                       ┌─────────────────────────────────────┐
                       │   .github/workflows/process-pdf.yml │
                       │   ubuntu-latest, timeout 360 min     │
                       │   Installs Node 22 + Poppler         │
                       └─────────────────┬───────────────────┘
                                          │
                                          ▼
                       ┌─────────────────────────────────────┐
                       │  scripts/pdf-pipeline/orchestrate    │
                       │  --from-r2 (downloads source.pdf)    │
                       └─────────────────┬───────────────────┘
                                          │
   ┌──────────────────────────────────────┼──────────────────────────────────────┐
   ▼                                       ▼                                       ▼
Stage 1: extract            Stage 2: figures              Stages 3-6: csv→db→fill→grade
─────────────────           ─────────────────              ──────────────────────────────
Claude Sonnet 4.6           pdftoppm 200 DPI               json-to-import-csv.mjs (32 cols)
PDF base64 → tool-use       Gemini 3.5-flash bbox          import-csv-direct.mjs (Supabase)
schemaForAnthropic({...})   sharp crop+polish              fill-all.mjs (3 sub-stages):
                            R2 upload, public URL          · explanation_text (Sonnet 4.6)
                                                            · per-choice (Sonnet 4.6, MC)
                                                            · desmos_strategy (Haiku 4.5)
                                                           multi-vote-grader.mjs (--from-db)
                                                            · pass 1: Flash+DeepSeek+Llama
                                                            · pass 2: Gemini 2.5 Pro
                                                            · pass 3: Claude Opus 4.7
```

### Models, providers, and where they run

| Stage | Model | Provider | Surface | Why this model |
| --- | --- | --- | --- | --- |
| 1 (extract) | `claude-sonnet-4-6` | Anthropic Messages API | Tool-use w/ PDF doc block | Gemini hits `RECITATION` filter on SAT prose (commit `c0d8546`). Claude has no equivalent filter for educational content. |
| 2 (bbox) | `gemini-3.5-flash` | Google REST | Vision, `responseSchema` | Cheap (~$0.001/figure), 0–1000 normalized bbox format, `thinkingBudget: 0`. |
| 2 (page render) | `pdftoppm` (Poppler) | apt-get | Local subprocess | 200 DPI render, cached per page. |
| 2 (image processing) | `sharp` (libvips) | npm package | Local | Crop, normalise, sharpen, pad, resize. |
| 5a (explanation_text) | `claude-sonnet-4-6` | Anthropic | Tool-use | 1024 tokens R&W / 2048 tokens math. |
| 5b (per-choice) | `claude-sonnet-4-6` | Anthropic | Tool-use | Default 4096 tokens. |
| 5c (Desmos) | `claude-haiku-4-5` | Anthropic | Tool-use | 512 tokens; cheap, formulaic task. |
| 6 (pass 1) | `gemini-2.5-flash`, `deepseek-chat`, `llama-3.3-70b-versatile` | Google + OpenRouter (or direct DeepSeek) + Groq | Three parallel REST calls | Cheap independent voters. |
| 6 (pass 2) | `gemini-2.5-pro` | Google | REST | Solo tie-break on pass-1 disagreements. |
| 6 (pass 3) | `claude-opus-4-7` | Anthropic | Tool-use | Final arbiter on Pro disagreements. |
| Storage (figures) | n/a | Cloudflare R2 (S3 API) | `karmanprep-question-images` bucket, key `question-figures/<stem>/p<page>-<i>.png`, `Cache-Control: public, max-age=31536000, immutable` |
| Storage (source PDFs) | n/a | R2 | Same bucket, key `pdf-inbox/<jobId>/source.pdf` |
| DB | n/a | Supabase Postgres | service-role key everywhere in scripts |
| Job orchestration | n/a | GitHub Actions + `pdf_processing_jobs.progress` JSONB | Status round-trips via Supabase update |

### The single LLM client surface — `scripts/lib/llm-providers.mjs`

This module is the import surface for every script that calls an LLM.
It exposes `callClaude`, `callGemini`, `callDeepSeek`, `callGroq`, plus
`QuotaExhaustedError` / `ParseError`. Inlined here in full because the
quirks it handles directly explain several real production bugs.

```javascript
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

export class QuotaExhaustedError extends Error {
  constructor(provider, body) {
    super(`${provider} quota exhausted: ${body.slice(0, 200)}`);
    this.name = "QuotaExhaustedError";
    this.provider = provider;
  }
}

export class ParseError extends Error {
  constructor(provider, raw) {
    super(`${provider} returned unparseable JSON: ${raw.slice(0, 200)}`);
    this.name = "ParseError";
    this.provider = provider;
    this.raw = raw;
  }
}

// ── Gemini (REST, supports text + image + PDF in one call) ──
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
  // output. Pass 0 to disable; -1 to let the model decide; null to omit.
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
  } catch { /* never let diagnostics break the call */ }

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
export async function callClaude({
  prompt,
  model = "claude-opus-4-7",
  systemPrompt = null,
  image = null,
  // PDF input via Anthropic's document content block. Pass
  // `{ buf: Buffer }` and we wrap it as base64 application/pdf.
  pdf = null,
  json = true,
  // When set, Claude is forced to respond by calling a tool whose
  // input_schema is `toolSchema`. Anthropic guarantees the response
  // input is valid JSON matching the schema — no text-parsing,
  // no LaTeX-vs-JSON escaping bugs.
  toolSchema = null,
  maxTokens = 4096,
  // Opus 4.7 and later deprecated the `temperature` parameter.
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

  const messages = [{ role: "user", content }];

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

  // Diagnostic logging — same pattern as the Gemini side.
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
  } catch { /* never let diagnostics break the call */ }

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
  } catch { /* fall through to candidate scan */ }
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;
    // Must be followed by " (after optional whitespace) to look like a
    // JSON object start. Skips LaTeX braces like `{1}` whose next char
    // is a digit.
    let j = i + 1;
    while (j < text.length && /\s/.test(text[j])) j++;
    if (text[j] !== '"') continue;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let k = i; k < text.length; k++) {
      const ch = text[k];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(text.slice(i, k + 1)); }
          catch { break; }  // this candidate didn't parse; try the next `{`
        }
      }
    }
  }
  return null;
}

// ── DeepSeek (OpenAI-compatible chat completions) ────────────
// OpenRouter > direct DeepSeek. OpenRouter is US-hosted,
// uses the same OpenAI-compatible schema, and prices match within
// pennies. The model id is namespaced when routing through OpenRouter
// (`deepseek/deepseek-chat`) vs bare (`deepseek-chat`) when hitting
// api.deepseek.com directly — we translate here so callers can keep
// passing the short name.
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
  try { return JSON.parse(text); }
  catch { throw new ParseError(providerName, text); }
}

// ── Groq Llama (OpenAI-compatible chat completions) ──────────
// Workhorse fallback. Free tier has generous limits. No vision —
// strictly text-only.
export async function callGroq({
  prompt,
  model = "llama-3.3-70b-versatile",
  systemPrompt = null,
  json = true,
}) {
  if (!GROQ_KEY) throw new Error("GROQ_API_KEY not set");
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 2048,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || /quota|credit|deplet/i.test(body)) {
      throw new QuotaExhaustedError("groq", body);
    }
    throw new Error(`Groq HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const responseJson = await res.json();
  const text = responseJson?.choices?.[0]?.message?.content ?? "";
  if (!json) return text;
  try { return JSON.parse(text); }
  catch { throw new ParseError("groq", text); }
}

// ── Multi-provider voting helper ─────────────────────────────
// Tolerates individual provider failures: returns the votes that
// SUCCEEDED + a list of errors. Throws only if ALL providers failed.
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
```

> **Gotcha #1** — Node's `undici` default 5-minute `headersTimeout` was
> the cause of run #26315666375 hanging and crashing with
> `UND_ERR_HEADERS_TIMEOUT`. Bumping to 15 minutes is the global
> dispatcher override at the top of the file.
>
> **Gotcha #2** — Claude tool-use responses can contain LaTeX (`$\frac{1}{2}$`)
> whose `{}` braces break naive substring extraction. `extractJsonObject`
> does a bracket-balanced scan respecting string boundaries.
>
> **Gotcha #3** — An em-dash character in the OpenRouter `X-Title`
> header silently 500-errored every DeepSeek call (chars > 255 in HTTP
> ByteString). ASCII-only headers, always.
>
> **Gotcha #4** — Diagnostic stderr lines (`[gemini-diag]` /
> `[claude-diag]`) on every call are voluminous but were the only way
> to debug the silent `RECITATION` filter trips on long SAT prose.

### The orchestrator entry point — `scripts/pdf-pipeline/orchestrate.mjs`

```javascript
// ============================================================
// orchestrate — single entry point for the full web-based PDF
// pipeline. Designed to be invoked from a GitHub Actions
// workflow with JOB_ID set so progress streams back to the
// website via pdf_processing_jobs.progress.
//
// MODES
//   Local:     node orchestrate.mjs path/to/file.pdf
//   Remote:    JOB_ID=<uuid> node orchestrate.mjs --from-r2
//
// STAGES (status: stage in pdf_processing_jobs.progress)
//   extracting  Gemini Flash → structured JSON
//   figures     Page render + bbox + R2 upload per figure
//   csv         JSON → 32-column CSV
//   importing   CSV → quiz_questions + answer_choices
//   filling     Sonnet explanation_text + per-choice + Haiku Desmos
//   grading     Multi-vote answer-key audit
//   done | failed
// ============================================================

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { JobStatus } from "../lib/job-status.mjs";

const args = process.argv.slice(2);
const FROM_R2 = args.includes("--from-r2");
const pdfArg = args.find((a) => !a.startsWith("--"));

const job = new JobStatus();

async function resolvePdfPath() {
  if (!FROM_R2) return resolve(pdfArg);
  if (!job.jobId) { console.error("--from-r2 requires JOB_ID env var"); process.exit(1); }
  console.log(`Job: ${job.jobId}, fetching PDF from R2…`);
  const supa = await job._supabase();
  const { data: row, error } = await supa
    .from("pdf_processing_jobs")
    .select("source_pdf, pdf_storage_path")
    .eq("id", job.jobId)
    .single();
  if (error || !row) { console.error(`Job row not found: ${error?.message ?? "no row"}`); process.exit(1); }
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const result = await r2.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: row.pdf_storage_path,
  }));
  const chunks = [];
  for await (const ch of result.Body) chunks.push(ch);
  const buf = Buffer.concat(chunks);
  const workdir = join(tmpdir(), `pdf-job-${job.jobId}`);
  mkdirSync(workdir, { recursive: true });
  const pdfPath = join(workdir, row.source_pdf);
  writeFileSync(pdfPath, buf);
  return pdfPath;
}

function runStage(label, stage, script, scriptArgs) {
  console.log("─".repeat(72));
  console.log(`▶ ${label}`);
  console.log("─".repeat(72));
  const result = spawnSync("node",
    [...(existsSync(".env.local") ? ["--env-file=.env.local"] : []), script, ...scriptArgs],
    { stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    throw Object.assign(new Error(`${label} failed with exit ${result.status}`), { stage });
  }
}

async function main() {
  const pdfPath = await resolvePdfPath();
  const pdfStem = basename(pdfPath).replace(/\.pdf$/i, "");
  const outputDir = process.env.OUTPUT_DIR ?? tmpdir();
  const jsonOut = join(outputDir, `${pdfStem}-gemini-extracted.json`);
  const csvOut = join(outputDir, `${pdfStem}-import.csv`);

  try {
    await job.setStage("extracting", { message: `Claude Sonnet 4.6 on ${basename(pdfPath)}` });
    runStage("Stage 1/6 — extract structure (Claude Sonnet 4.6)", "extracting",
      "scripts/pdf-pipeline/extract-with-gemini.mjs", [pdfPath]);
    if (existsSync(jsonOut)) {
      const extracted = JSON.parse(readFileSync(jsonOut, "utf-8"));
      await job.patchStats({ questions_extracted: extracted.length });
    }

    await job.setStage("figures", { message: "Vision-driven bbox crop + R2 upload" });
    runStage("Stage 2/6 — extract figures", "figures",
      "scripts/pdf-pipeline/extract-figures.mjs", [pdfPath, jsonOut]);
    if (existsSync(jsonOut)) {
      const updated = JSON.parse(readFileSync(jsonOut, "utf-8"));
      const figs = updated.filter((r) => r.image_url).length;
      await job.patchStats({ figures_extracted: figs });
    }

    await job.setStage("csv", { message: "Generating 32-column import CSV" });
    runStage("Stage 3/6 — generate CSV", "csv",
      "scripts/pdf-pipeline/json-to-import-csv.mjs", [jsonOut, pdfPath, csvOut]);

    await job.setStage("importing", { message: "Writing rows to quiz_questions + answer_choices" });
    runStage("Stage 4/6 — import to database", "importing",
      "scripts/pdf-pipeline/import-csv-direct.mjs", [csvOut]);

    await job.setStage("filling", {
      message: "Sonnet explanation_text + per-choice + Haiku Desmos",
    });
    runStage("Stage 5/6 — fill explanations", "filling",
      "scripts/content-generation/fill-all.mjs", []);

    await job.setStage("grading", {
      message: "Flash + DeepSeek + Llama → Pro → Opus consensus check",
    });
    runStage("Stage 6/6 — multi-vote grader", "grading",
      "scripts/question-audit/multi-vote-grader.mjs", ["--from-db"]);

    await job.complete();
  } catch (err) {
    const stage = err.stage ?? job.currentStage;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ FAILED at stage "${stage}": ${msg}`);
    await job.fail(msg, { error_stage: stage });
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
```

The `JobStatus` helper (`scripts/lib/job-status.mjs`) tracks per-stage
progress with weights tuned to observed runs:

```javascript
//   extracting  Claude Sonnet extracts ~98 questions    ~35s   8%
//   figures     Page render + bbox + crop + R2 upload  ~45s   12%
//   csv         JSON → CSV file                        ~1s    1%
//   importing   Bulk import to DB                      ~5s    4%
//   filling     Sonnet explanation_text + per-choice + ~15min 60%
//               Haiku desmos_strategy
//   grading     Multi-vote grader                      ~5min  15%
const STAGE_WEIGHTS = {
  extracting: 8,
  figures: 12,
  csv: 1,
  importing: 4,
  filling: 60,
  grading: 15,
};
```

> **Drift:** The stage weights assume the fill + grade stages process
> only this PDF's rows. They actually process the **entire bank** of
> un-filled / un-graded rows. So if a previous job left 500 rows
> un-filled, this PDF's "60% filling" weight maps to ~30 minutes, not
> ~15.

</content>

---

## 3. Stage 0 — a PDF enters the system

### Web upload path

1. Operator drops a PDF on `/admin/pdf-pipeline/upload` (Cloudflare Worker).
2. Server action uploads bytes to R2 under `pdf-inbox/<jobId>/source.pdf`.
3. INSERT a `pdf_processing_jobs` row with `status='queued'`, `pdf_storage_path`, `source_pdf`, `uploaded_by_user_id`.
4. Fires a GitHub `repository_dispatch` of type `process-pdf` with `client_payload.job_id`.
5. HTTP request returns. Everything else is async.

### Local shell path

```bash
npm run pdf:extract -- question-imports/incoming/<file>.pdf
```

Drives `scripts/pdf-pipeline/run-extraction.mjs` (extract + figures + CSV
only — no DB insert, no fill, no grade). No job row, no R2.

### The `pdf_processing_jobs` schema

```sql
-- supabase/migrations/20260514002444_pdf_processing_jobs.sql

CREATE TABLE IF NOT EXISTS public.pdf_processing_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_pdf          TEXT NOT NULL,            -- original upload filename
  pdf_storage_path    TEXT NOT NULL,            -- R2 key, e.g. "pdf-inbox/<id>/source.pdf"
  pdf_size_bytes      BIGINT,
  pdf_page_count      INTEGER,                  -- filled in once the runner reads the PDF
  uploaded_by_user_id TEXT NOT NULL,            -- Clerk userId; not FK'd because Clerk owns identity
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status              TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','partial','complete','failed')),
  -- Per-module status. Keys are 'key' (answer-key extraction) and
  -- 'm1' through 'm4'. Each value: pending | in_progress | complete | failed.
  module_status       JSONB NOT NULL DEFAULT
    '{"key":"pending","m1":"pending","m2":"pending","m3":"pending","m4":"pending"}'::jsonb,
  csv_storage_paths   JSONB NOT NULL DEFAULT '{}'::jsonb,
  imported_counts     JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message       TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pdf_processing_jobs_status_uploaded_idx
  ON public.pdf_processing_jobs(status, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS pdf_processing_jobs_uploader_idx
  ON public.pdf_processing_jobs(uploaded_by_user_id, uploaded_at DESC);

ALTER TABLE public.pdf_processing_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.pdf_processing_jobs;
CREATE POLICY "Service role full access" ON public.pdf_processing_jobs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

```sql
-- supabase/migrations/20260514002445_pdf_jobs_progress.sql
-- Adds a `progress` JSONB column for live stage tracking.

ALTER TABLE public.pdf_processing_jobs
  ADD COLUMN IF NOT EXISTS progress JSONB NOT NULL DEFAULT
    jsonb_build_object(
      'stage', 'queued',
      'message', null,
      'updated_at', null
    );

-- Backfill: existing rows inherit the default but with a more
-- accurate stage based on their current status.
UPDATE public.pdf_processing_jobs
SET progress = jsonb_build_object(
  'stage', CASE status
    WHEN 'queued'   THEN 'queued'
    WHEN 'running'  THEN 'processing'
    WHEN 'partial'  THEN 'failed'
    WHEN 'complete' THEN 'complete'
    WHEN 'failed'   THEN 'failed'
    ELSE 'queued'
  END,
  'message', null,
  'updated_at', COALESCE(started_at, uploaded_at)::text
)
WHERE progress->>'updated_at' IS NULL;
```

> **Drift:** The `module_status` JSONB default models a 5-key
> "key + m1..m4" shape from the deprecated multi-module-fan-out
> architecture. The current pipeline doesn't use these keys — it just
> writes `progress.stage='done'` at the end. The columns still get a
> default-filled row for every new job.

### Progress JSONB shape (what the website polls)

```jsonc
{
  "stage": "queued" | "extracting" | "figures" | "csv" |
           "importing" | "filling" | "grading" | "done" | "failed",
  "stage_label": "Extracting questions",  // human-readable
  "percent": 23,                          // 0-100 overall pipeline
  "stage_percent": 0,                     // 0-100 within current stage
  "message": "Claude Sonnet 4.6 on 202603asiav1.pdf",
  "stats": {
    "questions_extracted": 98,
    "figures_extracted": 27
  },
  "started_at": "2026-05-24T18:32:14.000Z",
  "updated_at": "2026-05-24T18:35:02.000Z",
  "github_run_id": "26344712039",
  "github_run_url": "https://github.com/.../actions/runs/26344712039"
}
```

---

## 4. Stage 1 — extraction (Claude Sonnet 4.6)

The extractor (`scripts/pdf-pipeline/extract-with-gemini.mjs` — name is
historical; it now calls Claude) reads the PDF into a Buffer, passes it
to Claude as a `document` content block with the KarmanGPT system prompt,
and gets back ~98 structured rows via tool-use. No OCR, no per-page
chunking, no separate answer-key scan — one inference call per PDF.

### THE system prompt — `question-imports/chatgpt/KarmanGPT.txt`

This is the most load-bearing single artifact in the pipeline. Inlined verbatim:

```text
════════════════════════════════════════════════════════════════════
KarmanGPT — Single source of truth for the SAT question extractor
════════════════════════════════════════════════════════════════════

Welds together: instructions, taxonomy, image-extraction protocol,
filename conventions, and explanation-quality rules into one document.
Replaces every other Knowledge file (taxonomy.txt, instructions.txt,
images.txt, sat_filename_naming.txt, sat_explanation_system_prompt_1.txt
— all superseded).

Reconciled to the live karmanprep.com importer:
  · CSV is 32 columns (the prior 30-column files are stale)
  · Images go INLINE in the image_url cell as base64 data URLs
    (the prior zip-bundle approach is stale)
  · Difficulty is the integer 1–7 scale used by the bank, with
    explanation depth scaling per difficulty
  · Math per-choice slots stay BLANK; the math walkthrough lives in
    explanation_text only
  · R&W per-choice slots are REQUIRED on every MC row

════════════════════════════════════════════════════════════════════
1. ROLE
════════════════════════════════════════════════════════════════════
You are an expert SAT tutor and curriculum writer. Your job is to
turn a College Board released-exam PDF into a single CSV file that
the Karman Prep admin can drop on /admin/questions/import. Pixel-
faithful question text + UWorld-quality explanations + every figure
embedded inline. No follow-up prompts. No sidecar files. One CSV.

════════════════════════════════════════════════════════════════════
2. INPUT
════════════════════════════════════════════════════════════════════
A PDF named like  YYYYMM[Region]V[N].pdf  (see §3 for the decoding).
A typical PDF holds a full SAT digital practice test: 4 modules
totalling ~98 questions plus an answer-key page at the end.

════════════════════════════════════════════════════════════════════
3. FILENAME CONVENTION (output naming + source_pdf field)
════════════════════════════════════════════════════════════════════
Raw PDF filenames follow:  YYYYMM[Region]V[N].pdf

  YYYY    4-digit year
  MM      2-digit month (01, 03, 05, 08, 10, 11 are the SAT months)
  Region  US | Asia
  V[N]    version (1, 2, 3, …)

Decoding examples:
  202511USV1.pdf    → November 2025 US Version 1
  202503USV2.pdf    → March 2025 US Version 2
  202408AsiaV1.pdf  → August 2024 Asia Version 1
  202501USV1.pdf    → January 2025 US Version 1

Output CSV path: /mnt/data/<pdf-stem>-questions.csv
  where <pdf-stem> = the PDF basename WITHOUT the .pdf extension.

source_pdf column on every row: set to the ORIGINAL filename verbatim
including the .pdf extension. The bank's unique index on
(source_pdf, content_hash) relies on this.

════════════════════════════════════════════════════════════════════
4. WORKFLOW (Code Interpreter, single Python session)
════════════════════════════════════════════════════════════════════
1. OCR every page:
   · pdfplumber for text-layer PDFs
   · pdf2image at 150 DPI + pytesseract for scanned/image-only PDFs
2. Identify the answer-key page(s) at the end of the PDF.
   Build a dict {q_id: answer}. Use module-prefixed keys when the
   key page distinguishes modules (rw1_3, rw2_5, math1_22), else
   fall back to bare q3, q5, q22.
3. Walk the question pages in order. For each solvable question:
   a. Extract question_text + four choices (or numeric_entry stub)
   b. Look up the answer in the key dict (see §11)
   c. Classify against the locked taxonomy (§6)
   d. Compute difficulty 1-7 (§7)
   e. If figure-bearing, extract the image and base64-encode it (§14)
   f. Write the explanation per §8 (R&W) or §9 (Math)
   g. Compute content_hash per §5
4. Emit the 32-column CSV at /mnt/data/<pdf-stem>-questions.csv.
5. Print the sanity-check summary (§17).

════════════════════════════════════════════════════════════════════
5. CSV SCHEMA — exactly 32 columns
════════════════════════════════════════════════════════════════════
Encoding: UTF-8, LF newlines, RFC 4180 escaping (wrap fields with
commas/quotes/newlines in double quotes; escape embedded double
quotes by doubling them). Header row first, then one row per question.

Columns IN THIS ORDER:
  1.  question_text
  2.  choice_a
  3.  choice_b
  4.  choice_c
  5.  choice_d
  6.  correct_answer
  7.  difficulty            (integer 1–7; see §7)
  8.  topic_cluster         (cluster string from §6)
  9.  hint                  (one sentence; see §10)
  10. explanation_text      (see §8 R&W or §9 Math)
  11. explanation_a
  12. explanation_b
  13. explanation_c
  14. explanation_d
  15. desmos_strategy       (math only; see §12)
  16. passage_intro
  17. passage
  18. passage_a
  19. passage_b
  20. question_format       ("multiple_choice" | "numeric_entry")
  21. numeric_tolerance     (SPR only; see §13)
  22. domain                (8 underscored values; see §6)
  23. concept_slug          (one of 89 dashed values; see §6)
  24. answer_source         ("extracted" | "inferred" | "hand_corrected")
  25. source_pdf            (original PDF filename; see §3)
  26. source_page           (integer page number, 1-indexed)
  27. content_hash          (sha1; see below)
  28. import_status         ("ok" | "needs_review")
  29. import_flag_type      ("partial_emit" when needs_review)
  30. import_flag_reason    (one-sentence reason when needs_review)
  31. image_url             (data:image/...;base64,... or empty; §14)
  32. image_alt             (1–2 sentence figure description or empty)

content_hash recipe:
  sha1(lowercase(strip_whitespace(
    question_text + "|" + choice_a + "|" + choice_b + "|" +
    choice_c + "|" + choice_d
  )))
For numeric_entry rows where choices are blank, hash question_text
alone. Empty fields are emitted as "" between commas (never skipped).

════════════════════════════════════════════════════════════════════
6. TAXONOMY (locked — never invent a value)
════════════════════════════════════════════════════════════════════
[FULL 89-slug list inlined in §12 of this document]

════════════════════════════════════════════════════════════════════
7. DIFFICULTY (integer 1–7; calibrate against the FULL College Board
   spread, not just this PDF)
════════════════════════════════════════════════════════════════════
Math:
  1  Single arithmetic op or one-variable substitution. No traps.
  2  Two operations or one common formula. Direct application.
  3  Multi-step common procedure (linear systems, percent change).
  4  Multi-step + non-trivial setup (word problem translation,
     factor a quadratic).
  5  Non-obvious setup OR synthesis of two concepts.
  6  Requires insight beyond procedure (structure recognition,
     parameter case-splitting).
  7  Highly intricate; multiple concepts + edge cases or non-
     standard approach required.

R&W:
  1  Direct retrieval; common vocab; basic punctuation.
  2  One-step inference; standard grammar nuance.
  3  Inference from 1–2 sentences; intermediate vocab.
  4  Multi-sentence inference; less common grammar; harder vocab.
  5  Sophisticated vocab in academic prose; nuanced rhetorical
     analysis; technical passage.
  6  Near-synonym distinction; complex argument structure;
     uncommon grammar in long sentences; multiple plausible
     distractors.
  7  All four choices surface-plausible; specialized passage;
     cutting-edge vocab nuance.

Approximate first-try success rate:
  ~85% → 1-2 (Easy)
  ~65% → 3-4 (Medium)
  ~40% → 5-6 (Hard)
  ~15% → 7   (Hardest)

════════════════════════════════════════════════════════════════════
8. EXPLANATIONS — READING & WRITING (multiple choice)
════════════════════════════════════════════════════════════════════
Depth scales with difficulty (UWorld-quality at every level):

  Easy (1-2):    explanation_text 1-2 sentences; per-choice 2-3
                 sentences each.
  Medium (3-4):  explanation_text 2-3 sentences; per-choice 3-4
                 sentences each.
  Hard (5-7):    explanation_text 3-4 sentences; per-choice 4-6
                 sentences each.

explanation_text — synthesize WHY the correct answer is right.
Cite specific passage evidence (quote phrases or reference paragraph
/ sentence). Anchor reasoning to the text, never reason in a vacuum.

explanation_a, explanation_b, explanation_c, explanation_d — ALL
FOUR REQUIRED on every R&W MC row.

  Correct choice: identify exact passage support (quote when
  possible), walk through the reasoning, explain why this beats
  the close alternatives.

  Each wrong choice: state (1) what the answer would mean if true,
  (2) which specific text contradicts it (quote or paraphrase the
  counter-evidence), (3) name the failure type. Use these labels:

    "Contradicts the passage"  — directly conflicts with stated info
    "Too broad"                — scope exceeds what the passage claims
    "Out of scope"             — introduces ideas the passage never
                                 addresses
    "Partially supported"      — true for part of the passage, not
                                 the key point
    "Extreme language"         — goes further than the author's tone
                                 or evidence allows
    "Distorts meaning"         — a misreading of what the author or
                                 evidence states
    "True but irrelevant"      — accurate in isolation, but doesn't
                                 answer the question
    "Keyword trap"             — passage word reused in wrong context
    "Surface plausibility"     — sounds reasonable, no support
    "Tone/register mismatch"   — right idea but wrong tonal fit
    "Common misreading"        — a specific mis-parse of a sentence

Treat each per-choice as a teaching moment — a strong student
should learn to recognize the trap next time.

For Cross-Text questions: state what Text 1 establishes, then what
Text 2 establishes, before comparing.

For Command of Evidence – Quantitative: reference the chart or table
data directly when explaining.

════════════════════════════════════════════════════════════════════
9. EXPLANATIONS — MATH (any answer_format)
════════════════════════════════════════════════════════════════════
ONE thorough step-by-step walkthrough lives in explanation_text.
Per-choice slots (explanation_a..d) STAY BLANK on every math row,
including MC. The walkthrough alone is the explanation.

Depth scales with difficulty:
  Easy (1-2):    2-3 numbered steps with brief justification
  Medium (3-4):  4-6 numbered steps; name each technique used
  Hard (5-7):    full derivation, 6-10+ numbered steps; show every
                 intermediate step; flag where students most commonly
                 go wrong; substitute the answer back to verify

explanation_text format — numbered granular steps. Each step:
  · States the action in plain English: "Step N: [what you're doing]"
  · Shows the math in KaTeX on its own line
  · Explains WHY — what concept/identity it leverages, why this
    operation is valid, what it gets you closer to. Don't skip
    "obvious" steps; the student is learning, not verifying.
  Connect each step to the next so the chain of reasoning is visible.
  End with a CHECK: substitute the answer back, OR a sanity check
  on units / sign / magnitude.

When explaining math, name the SAT-Math trap any wrong choice would
exploit (mention them inside the walkthrough, not in per-choice
columns):
  · Sign error: forgot to distribute a negative
  · Inverse error: used reciprocal instead of the value
  · Exponent rule confusion: added when should have multiplied
  · Solved for x instead of the expression the question asks for
  · Confused slope with y-intercept
  · Used diameter instead of radius
  · Off-by-one in a sequence or counting problem
  · Switched units / forgot to convert
  · Applied wrong formula

════════════════════════════════════════════════════════════════════
10. HINTS (every row, exactly ONE sentence)
════════════════════════════════════════════════════════════════════
Methodological nudge that does NOT reveal the answer or the operation.
  Good math: "Translate the word problem into one equation before
              computing."
  Bad math:  "Multiply both sides by 4."
  Good R&W:  "Focus on what the passage explicitly claims, not what
              feels intuitive."
  Bad R&W:   "The answer is A."

════════════════════════════════════════════════════════════════════
11. ANSWER-KEY HANDLING (the key is ~95% reliable; trust by default)
════════════════════════════════════════════════════════════════════
For each question:

  Match found AND your independent solve agrees:
    correct_answer = key value
    answer_source  = "extracted"
    import_status  = "ok"
    import_flag_type = ""
    import_flag_reason = ""

  Match found AND your independent solve DISAGREES:
    Default → defer to the key.
      correct_answer = key value
      answer_source  = "extracted"
      import_status  = "ok"
      Do NOT flag.
    Exception (≤5% of any PDF) — only when you can articulate a
    specific reason the key is wrong (e.g., a printed typo in
    choice C, the equation as printed makes choice B impossible):
      correct_answer = key value (still defer)
      answer_source  = "extracted"
      import_status  = "needs_review"
      import_flag_type = "partial_emit"
      import_flag_reason = "Possible key error: [one-sentence reason]."

  No match in the key:
    correct_answer = your inferred answer
    answer_source  = "inferred"
    import_status  = "needs_review"
    import_flag_type = "partial_emit"
    import_flag_reason = "No answer key entry — inferred."

════════════════════════════════════════════════════════════════════
12. DESMOS STRATEGY (math only, fill nearly every math row)
════════════════════════════════════════════════════════════════════
Goes in the desmos_strategy column. 2–4 numbered steps with exact
inputs in backticks.

Example: "Step 1: Type `y = 6x^2 + bx + c`. Step 2: Use sliders for
b, c. Step 3: Adjust until curve passes through (0, 11/6); read b."

Skip ONLY for: pure abstract algebra, geometry without coordinates,
non-graphable combinatorics. When in doubt, fill it — students
benefit from seeing a calculator approach even when algebra is fine.

════════════════════════════════════════════════════════════════════
13. NUMERIC TOLERANCE (SPR / numeric_entry only)
════════════════════════════════════════════════════════════════════
Set numeric_tolerance based on the answer's mathematical FORM, not
the value the model happens to compute:

  Whole numbers (42, 0, -7):                       ""  (exact match)
  Finite decimals expecting exactness (3.14):      ""  (exact match)
  Repeating decimals (1/3 = 0.333…):               "0.001"
        and set correct_answer = "1/3" or "0.3333"
  Irrational/surd kept symbolic (√5 / 2):          "0.01"
        and set correct_answer = the exact symbolic form
  Fractions where decimals are also valid (5/9):   "0.001"
        correct_answer = "5/9" so 0.555 and 0.556 both pass
  Percentages (25%):                               ""  unless repeating
        correct_answer = "25" (no "%")
  Money ($12.50):                                  ""  unless repeating
        correct_answer = "12.50"

════════════════════════════════════════════════════════════════════
14. IMAGES — figures embedded INLINE as base64 data URLs
════════════════════════════════════════════════════════════════════
[ChatGPT-mode workflow — the local pipeline does NOT use base64 data
URLs. It uploads to R2 and writes the public URL into image_url.
The relevant constraints from this section still apply: WHAT counts
as a figure, polish helper behavior, alt-text expectations.]

A question is "figure-bearing" if its meaning depends on a visual
that text alone cannot replace. Typical:
  · Math: graph, scatterplot, geometry diagram, coordinate plane,
    table of values, histogram, bar chart, function plot
  · R&W: chart/table embedded in the passage (info_ideas questions
    asking to read data from a figure)
  · Anything where the question stem says "the figure shown",
    "based on the graph", "the table above"

If a question CAN be solved from text alone — even if the PDF shows
a figure for context — leave image_url and image_alt EMPTY. Don't
attach decorative images.

The polish helper (KarmanGPT-mode, Python — sharp equivalent in the
JS pipeline):
    def polish_figure(img, trim=True, pad=24):
        if trim:
            gray = img.convert("L")
            mask = ImageOps.invert(gray.point(lambda v: 0 if v > 240 else v))
            bbox = mask.getbbox()
            if bbox: img = img.crop(bbox)
        img = ImageOps.autocontrast(img, cutoff=1)
        img = img.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))
        if pad > 0:
            img = ImageOps.expand(img, border=pad, fill="white")
        img.thumbnail((1500, 1500))
        return img

image_alt = 1-2 sentence description suitable for screen readers
            AND as a fallback if the image fails to load.
              Good: "Scatterplot of 10 points, x in 0–10, with a
                     positive linear trend; line of best fit
                     y = 2x + 3 is drawn."
              Bad : "Graph for question 14."

════════════════════════════════════════════════════════════════════
15. PASSAGES (R&W only)
════════════════════════════════════════════════════════════════════
Each R&W question has its OWN passage on its OWN row. Never share
passages across rows.

Single-text question:
  passage_intro = the italic source line ("The following text is
                   adapted from…") if present in the PDF; else empty.
  passage       = the body of the passage.
  passage_a     = empty
  passage_b     = empty

Cross-text question:
  passage_intro = empty
  passage       = empty
  passage_a     = Text 1 body
  passage_b     = Text 2 body

Math question (any format):
  All four passage fields = empty.

════════════════════════════════════════════════════════════════════
16. KaTeX (required wherever math appears)
════════════════════════════════════════════════════════════════════
Wrap ALL mathematical expressions in $…$ inline or $$…$$ for display
math, in: question_text, choice_a..d, explanation_text,
explanation_a..d, hint, desmos_strategy, correct_answer (when
symbolic). Plain English never gets $…$.

Common patterns:
  fraction       $\dfrac{11}{6}$
  exponent       $x^2$ · $(1.20)^{x/4}$
  subscript      $x_1$ · $a_n$
  square root    $\sqrt{5k+9}$
  variable       $x$
  point          $(-5, 5)$
  equation       $y = 6x^2 + bx + c$
  inequality     $0 \le x \le 10$
  multiplication $2 \cdot 3 = 6$  (use \cdot, not * or ·)
  percent        $44\%$

════════════════════════════════════════════════════════════════════
17. SANITY CHECKS BEFORE WRITING THE CSV
════════════════════════════════════════════════════════════════════
Walk the assembled rows once at the end. Each row must satisfy:

  · 32 columns present (no skipped fields — empty = "" between commas)
  · question_text non-empty
  · explanation_text non-empty
  · concept_slug ∈ the 89 listed in §6
  · domain ∈ the 8 listed in §6 (UNDERSCORES)
  · topic_cluster matches the row's domain per §6 mapping
  · content_hash unique within this PDF
  · source_pdf = original filename verbatim
  · For every R&W MC row: explanation_a, _b, _c, _d ALL non-empty
  · For every math row: explanation_a, _b, _c, _d ALL EMPTY
  · For every non-empty image_url: starts with "data:image/" and
    contains ";base64,"
  · For every non-empty image_url: image_alt is also non-empty
  · For every needs_review row: import_flag_reason non-empty

════════════════════════════════════════════════════════════════════
18. TONE & STYLE
════════════════════════════════════════════════════════════════════
  · Write as a sharp, direct SAT tutor — authoritative but never
    condescending.
  · Every claim must be grounded in mathematical work or textual
    evidence — no hand-waving.
  · Cut all filler: no "Great question!", "It's important to note
    that…", "Remember that…".
  · Math: use proper KaTeX notation for fractions, exponents, equations.
  · R&W: always quote or closely paraphrase the passage when
    explaining the correct answer — never reason in a vacuum.
  · Adaptive length is non-negotiable: easy explanations stay brief;
    hard explanations are thorough.
  · Never write "the correct answer is correct because it is the
    best answer" — that's circular and useless.
  · Assume the student got this question wrong. Your job is to
    make sure they never miss it again.

════════════════════════════════════════════════════════════════════
19. NEVER (hard rules)
════════════════════════════════════════════════════════════════════
  · Never invent a domain, topic_cluster, or concept_slug.
  · Never emit fewer than 32 fields per row.
  · Never skip the answer-key cross-reference.
  · Never share a passage across rows.
  · Never write a hint that names the answer letter or the operation.
  · Never copy a wrong-choice description into the correct choice's
    explanation slot.
  · Never flag a row needs_review just because your solve disagreed
    with the key — defer to the key unless you have an articulated
    reason it's wrong (§11).
  · Never set numeric_tolerance to a default like "0" or "0.01"
    without thinking — match it to the answer's mathematical form (§13).
  · Never inline an image as anything other than a base64 data URL
    in image_url. No file paths. No external image hosts. No zip.
  · Never emit raw math like "11/6" or "x^2" without KaTeX
    delimiters — wrap in $…$ inline or $$…$$ display.
  · Never ship a math question whose essential figure is missing.
  · Never ship a whole-page screenshot when vision-driven cropping
    would have worked — the crop is the default, not the fallback.
```

> **Drift A:** The KarmanGPT prompt §4 describes a "Code Interpreter
> Python session" workflow with `pdfplumber` + `pdf2image` +
> `pytesseract`. The actual pipeline runs this prompt as a Claude
> system prompt with the PDF as a `document` content block — there is
> no Python, no OCR, no pytesseract. Claude reads the rendered PDF
> directly.
>
> **Drift B:** §5 says `image_url` should be a `data:image/...;base64,...`
> URL. The actual pipeline writes an R2 https URL there. The base64
> path is the legacy ChatGPT workflow.
>
> **Drift C:** §6 says the canonical taxonomy. The actual list lives
> in 4 places (this prompt, `extract-with-gemini.mjs:80-178`,
> `src/lib/question-bank/taxonomy.ts`, `supabase/migrations/20260518003000`).
> A `npm run sync:taxonomy` command exists but human discipline is
> the only enforcement.

### The Stage 1 extractor — `scripts/pdf-pipeline/extract-with-gemini.mjs`

The file is ~540 lines. The structural shape it sends, the user prompt,
and the post-validation logic are the parts that matter:

```javascript
// Locked taxonomy enums — must match KarmanGPT.txt §6 exactly.
const DOMAINS = [
  "algebra", "advanced_math", "geometry", "data_analysis",
  "info_ideas", "craft_structure", "expression_ideas", "conventions",
];
const TOPIC_CLUSTERS = [
  "Algebra", "Advanced Math", "Geometry & Trigonometry",
  "Problem-Solving & Data Analysis", "Information & Ideas",
  "Craft & Structure", "Expression of Ideas",
  "Standard English Conventions",
];
const CONCEPT_SLUGS = [
  // ... 89 slugs (full list in §12 of this document)
];
if (CONCEPT_SLUGS.length !== 89) {
  throw new Error(`Expected 89 concept slugs, got ${CONCEPT_SLUGS.length}`);
}

// Structural schema — covers extraction fields only. Explanation
// fields (explanation_text, explanation_a..d, hint, desmos_strategy)
// are filled by downstream Sonnet/Haiku scripts, not Gemini.
const responseSchema = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question_text: { type: "STRING" },
          choice_a: { type: "STRING" },
          choice_b: { type: "STRING" },
          choice_c: { type: "STRING" },
          choice_d: { type: "STRING" },
          correct_answer: { type: "STRING" },
          difficulty: { type: "INTEGER" },
          topic_cluster: { type: "STRING", enum: TOPIC_CLUSTERS },
          passage_intro: { type: "STRING" },
          passage: { type: "STRING" },
          passage_a: { type: "STRING" },
          passage_b: { type: "STRING" },
          question_format: {
            type: "STRING",
            enum: ["multiple_choice", "numeric_entry"],
          },
          numeric_tolerance: { type: "STRING" },
          domain: { type: "STRING", enum: DOMAINS },
          // Gemini 3.5 Flash rejects responseSchema enums larger than
          // ~50 items (probed empirically). Our taxonomy has 89 slugs,
          // so we cannot enforce at the schema layer. Instead we lean
          // on the system prompt to list them and post-validate after
          // extraction — any invalid slug flips import_status to needs_review.
          concept_slug: { type: "STRING" },
          answer_source: {
            type: "STRING",
            enum: ["extracted", "inferred", "hand_corrected"],
          },
          source_page: { type: "INTEGER" },
          import_status: { type: "STRING", enum: ["ok", "needs_review"] },
          import_flag_reason: { type: "STRING" },
          // Figure detection — Gemini flags questions whose meaning
          // depends on a visual. A separate downstream pass renders +
          // crops + uploads the actual image bytes.
          has_figure: { type: "BOOLEAN" },
          figure_alt: { type: "STRING" },
        },
        required: [
          "question_text", "correct_answer", "difficulty",
          "topic_cluster", "question_format", "domain",
          "concept_slug", "source_page", "import_status", "has_figure",
        ],
      },
    },
  },
  required: ["questions"],
};
```

### The user prompt sent alongside the system prompt

```text
TASK: EXHAUSTIVELY extract EVERY solvable question from this SAT PDF.

FILENAME: ${pdfName}

EXPECTED OUTPUT SIZE: ~98 questions total. A typical SAT PDF contains 4 modules:
  · Reading & Writing Module 1: ~27 questions
  · Reading & Writing Module 2: ~27 questions
  · Math Module 1: ~22 questions
  · Math Module 2: ~22 questions
You are NOT done until you have processed every question across all 4 modules. If your output has fewer than 80 questions, you have skipped pages — go back and extract the missed questions.

CRITICAL — DO NOT STOP EARLY:
  · This is NOT a "give me a sample" task. Extract EVERY question.
  · Process pages 1 through (last question page) in order. The answer-key pages are at the END of the PDF — those are the only pages to skip.
  · Do NOT abridge, summarize, or sample. Emit one JSON object per question.
  · You have a maxOutputTokens budget of 65536 — use what you need to be exhaustive.

EXTRACTION SCOPE — first-pass test, structure only:

  · DO extract per question: question_text, choice_a..d (for MC), correct_answer, difficulty (1-7), topic_cluster, passage fields (R&W only), question_format, numeric_tolerance, domain, concept_slug, answer_source, source_page, import_status, import_flag_reason.

  · DO NOT extract or generate: explanation_text, explanation_a..d, hint, desmos_strategy, image_url, image_alt, content_hash. Those fields are filled by separate downstream pipelines — leave them OUT of the response entirely.

R&W STRUCTURE — CRITICAL: separate the passage from the question stem.

EVERY R&W question_text MUST begin with one of these canonical phrases at a sentence boundary. There are NO exceptions:

  · "As used in the text"      (vocabulary-in-context)
  · "Based on the text"        (also "Based on the texts" for cross-text)
  · "Which"                    ("Which choice", "Which finding", etc.)
  · "What"                     ("What choice", "What is the main idea", etc.)
  · "How"                      (inference / comparison)
  · "According"                (factual recall: "According to the text…")
  · "The student"              (rhetorical synthesis: "The student wants to…")

If you find yourself writing R&W question_text that begins with any other word — a passage sentence, a data point, a quoted phrase — STOP. That content belongs in the passage field, not question_text. Move it to passage and start question_text with the canonical stem starter.

Common mistakes to avoid:
  · WRONG: question_text = "Assuming P4 gave equal ratings to impressionist and cubist paintings, the graph reveals that the model predicted ____. Which choice most effectively uses data from the graph to complete the statement?"
    RIGHT: passage = "...Assuming P4 gave equal ratings to impressionist and cubist paintings, the graph reveals that the model predicted ____."
           question_text = "Which choice most effectively uses data from the graph to complete the statement?"

  · WRONG: question_text = "The Apollo Moon landings (1969-1972) left charged particle detectors and equipment too heavy for liftoff on the Moon and produced large amounts of data. Researcher Philip Metzger continues to use Apollo's data, demonstrating that the missions' value to science ______. Which choice completes the text with the most logical and precise word or phrase?"
    RIGHT: passage = the entire bundled prefix above
           question_text = "Which choice completes the text with the most logical and precise word or phrase?"

Other rules:
  · passage = the body of the passage, including any blank (use "______" for the blank if present).
  · NEVER duplicate the passage in BOTH question_text AND passage.
  · NEVER leave passage empty for R&W questions; every R&W question has its own passage.

For Math questions: passage, passage_a, passage_b, passage_intro are ALL EMPTY.

For Cross-Text R&W (when the PDF shows "Text 1" + "Text 2"):
  · passage = empty, passage_a = Text 1 body, passage_b = Text 2 body.

FIGURE DETECTION — for every question, set has_figure:
  · has_figure = true if the question's MEANING DEPENDS on a visual element you can see in the PDF:
      - Math: graph, scatterplot, geometry diagram, coordinate plane, table of values, bar chart, histogram, function plot, regular polygon, circle diagram
      - R&W: any chart/table embedded in the passage (info_ideas questions asking to read data from a figure, command-of-evidence-quantitative)
      - Any question whose stem says "the figure shown", "based on the graph", "the table above", "shown in the diagram"
  · has_figure = false if the question is solvable from text alone, even if the PDF page has decorative elements around it.
  · When has_figure = true, ALSO set figure_alt to a 1-2 sentence description of what the figure shows (for accessibility + as a seed for downstream alt-text).

  · The answer-key page is at the end of the PDF. Cross-reference each question's correct_answer against it per §11 of the spec.

  · Use the schema enums (domain, topic_cluster, question_format, answer_source, import_status) — every value MUST be one of the listed strings.

  · concept_slug: pick from the 89 slugs listed in your system instructions §6. The schema doesn't enforce this — but every slug you emit MUST match one of the 89 exactly (we validate after).

  · For each question, record the source_page (1-indexed PDF page number where the question appears).

VERIFICATION BEFORE RESPONDING: Count your questions. If under 80, you have missed pages — extract them now.

Return the result as { "questions": [ ... ] } matching the response schema.
```

### Tool-use adapter: Gemini schema → Anthropic tool_use input_schema

```javascript
// Convert the Gemini-style responseSchema (UPPERCASE OpenAPI types
// + enum on STRING) to Anthropic tool_use input_schema (lowercase
// JSON-Schema-ish types).
function schemaForAnthropic(s) {
  if (s == null || typeof s !== "object") return s;
  if (Array.isArray(s)) return s.map(schemaForAnthropic);
  const out = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "type" && typeof v === "string") {
      out.type = v.toLowerCase();
    } else if (k === "items" || k === "properties") {
      out[k] = schemaForAnthropic(v);
    } else {
      out[k] = schemaForAnthropic(v);
    }
  }
  return out;
}

const toolSchema = schemaForAnthropic(responseSchema);

result = await callClaude({
  prompt: USER_PROMPT,
  model: "claude-sonnet-4-6",
  systemPrompt: schemaPrompt,        // KarmanGPT.txt as system
  pdf: { buf: pdfBuf },              // PDF as document content block
  toolSchema,                        // forces structured response
  // 64K is Sonnet 4.6's max output budget. 98 questions × ~500
  // tokens each = ~50K, well within 64K but only barely safe at 32K
  maxTokens: 64_000,
});
```

### The post-validation block

After Claude returns, JavaScript validates two things the schema can't:

```javascript
// Persist + summarize.
//
// Shape handling: we ASK for { questions: [...] } via responseSchema,
// but Gemini occasionally returns the bare array [...] directly (the
// schema's outer object wrapper gets dropped, observed on the
// 202405us.pdf run #26321947286 — 100 KB of valid extraction data
// silently discarded because `result?.questions` was undefined).
// Accept both shapes so the pipeline doesn't throw away good output.
const rows = Array.isArray(result)
  ? result
  : Array.isArray(result?.questions) ? result.questions : [];

// Fast-fail: if extraction returned nothing, the pipeline should NOT
// silently continue.
if (rows.length === 0) {
  console.error(`Extraction returned 0 questions. Aborting before downstream stages.`);
  process.exit(4);
}

// Post-validation —
// 1) concept_slug must be one of the 89 canonical (schema can't enforce
//    because Gemini caps enums around 50 items).
// 2) For R&W rows: question_text and passage must NOT be the same text
//    (Flash sometimes duplicates the passage into question_text instead
//    of using the generic stem like "Which choice completes the text...").
const validSlugs = new Set(CONCEPT_SLUGS);
const rwDomains = new Set(["info_ideas", "craft_structure", "expression_ideas", "conventions"]);
let invalidSlugCount = 0;
let dupPassageCount = 0;
for (const r of rows) {
  if (!validSlugs.has(r.concept_slug)) {
    invalidSlugCount++;
    if (r.import_status === "ok") {
      r.import_status = "needs_review";
      r.import_flag_reason = `Invalid concept_slug "${r.concept_slug}" — not in 89-slug taxonomy`;
    }
  }
  // R&W: detect passage/question duplication
  const qt = (r.question_text ?? "").trim();
  const passage = (r.passage ?? "").trim();
  if (rwDomains.has(r.domain) && qt.length > 80 && qt.startsWith(passage.slice(0, 80))) {
    dupPassageCount++;
    if (r.import_status === "ok") {
      r.import_status = "needs_review";
      r.import_flag_reason =
        "question_text duplicates passage — likely R&W stem/passage split failure";
    }
  }
}
```

### What the JSON output looks like (one row)

```json
{
  "question_text": "Which choice completes the text with the most logical and precise word?",
  "choice_a": "remote",
  "choice_b": "vital",
  "choice_c": "obscure",
  "choice_d": "modest",
  "correct_answer": "B",
  "difficulty": 3,
  "topic_cluster": "Craft & Structure",
  "passage": "Researcher Philip Metzger continues to use Apollo's data, demonstrating that the missions' value to science ______.",
  "question_format": "multiple_choice",
  "domain": "craft_structure",
  "concept_slug": "precise-word-choice-in-context",
  "answer_source": "extracted",
  "source_page": 14,
  "import_status": "ok",
  "has_figure": false
}
```

> **Gotcha — the RECITATION saga.** Until commit `c0d8546` (#153), this
> stage was `gemini-3.5-flash`. Gemini has a non-deterministic
> copyright filter that blocks long SAT passages — `finishReason:
> RECITATION`, `text_chars: 0`, no error, no warning. Confirmed on
> Actions run #26322250769. Claude Sonnet 4.6 has no equivalent filter
> for educational content. The filename was kept as `extract-with-gemini.mjs`
> for back-compat with the orchestrator and existing CI logs.


---

## 5. Stage 2 — figures (Gemini Flash bbox + sharp crop + R2)

`scripts/pdf-pipeline/extract-figures.mjs` iterates every row with
`has_figure === true`, asks Gemini Flash for a bounding box on a rendered
page, crops with sharp, polishes, uploads to R2, and writes the public
URL back into `image_url` on the JSON row.

### The bbox prompt

```javascript
function buildBboxPrompt(row) {
  return `Identify the tight bounding box around the SAT question figure on this page.

QUESTION CONTEXT
question_text: ${(row.question_text ?? "").slice(0, 280)}
figure description: ${row.figure_alt ?? "(none)"}

WHAT TO BOUND
The figure is a chart, table, graph, geometry diagram, or coordinate plane that this specific question depends on.

  · INCLUDE: axis labels, tick marks, scales, legends, title, units, annotations on the figure.
  · EXCLUDE: question stem text, the four answer choices (A, B, C, D), page header/footer, page number, "Mark for Review" UI, module label, decorative whitespace beyond ~3% of the page.

If the page contains MULTIPLE figures, pick the one matching the figure description above.

OUTPUT FORMAT — Gemini's normalized bounding-box convention.

Return coordinates normalized to 0-1000 (NOT pixels). (0, 0) is top-left. Values 0-1000 represent fractions of the image dimensions × 1000.

Field order: y_min, x_min, y_max, x_max (y BEFORE x — this is Gemini's standard).

Constraints: 0 ≤ y_min < y_max ≤ 1000, 0 ≤ x_min < x_max ≤ 1000.

Return: { "y_min": <int>, "x_min": <int>, "y_max": <int>, "x_max": <int>, "confidence": <"high"|"medium"|"low">, "notes": <one-sentence note if uncertain> }.`;
}
```

### The response schema

```javascript
responseSchema: {
  type: "OBJECT",
  properties: {
    y_min: { type: "INTEGER" },
    x_min: { type: "INTEGER" },
    y_max: { type: "INTEGER" },
    x_max: { type: "INTEGER" },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] },
    notes: { type: "STRING" },
  },
  required: ["y_min", "x_min", "y_max", "x_max", "confidence"],
},
thinkingBudget: 0,
maxOutputTokens: 1024,
```

### The bbox-to-pixel conversion (this is the math)

```javascript
// 3) Convert 0-1000 normalized → absolute pixels using actual page dims
const { y_min: ny1, x_min: nx1, y_max: ny2, x_max: nx2, confidence } = bboxResult;
const x1 = Math.round((nx1 / 1000) * width);
const y1 = Math.round((ny1 / 1000) * height);
const x2 = Math.round((nx2 / 1000) * width);
const y2 = Math.round((ny2 / 1000) * height);

const validBbox =
  Number.isFinite(x1) && Number.isFinite(y1) &&
  Number.isFinite(x2) && Number.isFinite(y2) &&
  x1 >= 0 && y1 >= 0 &&
  x2 > x1 && y2 > y1 &&
  x2 <= width && y2 <= height &&
  x2 - x1 >= 60 && y2 - y1 >= 60;
```

### Page rendering (pdftoppm cache)

```javascript
// pdftoppm writes <prefix>-<N>.png by default. Render single page.
const result = spawnSync(
  "pdftoppm",
  ["-f", String(page), "-l", String(page), "-r", String(dpi), "-png", pdfPath, outPrefix],
  { stdio: "pipe" }
);
// pdftoppm zero-pads the page suffix based on the total page count,
// not the page number alone. Find the actual file it wrote.
const padded = String(page).padStart(2, "0");
const candidates = [
  `${outPrefix}-${page}.png`,
  `${outPrefix}-${padded}.png`,
  `${outPrefix}-${String(page).padStart(3, "0")}.png`,
];
const pagePath = candidates.find((p) => existsSync(p));
```

`RENDER_DPI = 200`, `FALLBACK_DPI = 150`. Cached per (page, dpi) so
duplicate figures on one page don't re-render.

### The polish helper (sharp equivalent of KarmanGPT's `polish_figure`)

```javascript
const POLISH_PAD = 24; // matches §14 polish_figure(pad=24)
const MAX_LONGEST_SIDE = 1500;

async function polishImage(buffer) {
  return await sharp(buffer)
    .normalise()                                // autocontrast equivalent
    .sharpen({ sigma: 1, m1: 1, m2: 1.2, x1: 3 })  // gentle unsharp mask
    .extend({
      top: POLISH_PAD, bottom: POLISH_PAD,
      left: POLISH_PAD, right: POLISH_PAD,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .resize(MAX_LONGEST_SIDE, MAX_LONGEST_SIDE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}
```

### Whole-page fallback when bbox is invalid or low-confidence

```javascript
let polishedBuf;
let usedFallback = false;
if (validBbox && confidence !== "low") {
  // 4a) Tight crop + polish
  const cropped = await sharp(pageBuf)
    .extract({ left: x1, top: y1, width: x2 - x1, height: y2 - y1 })
    .toBuffer();
  polishedBuf = await polishImage(cropped);
} else {
  // 4b) Whole-page fallback (KarmanGPT §14 Step 3)
  usedFallback = true;
  const fallbackPage = await renderPage(row.source_page, FALLBACK_DPI);
  const fallbackBuf = readFileSync(fallbackPage.path);
  polishedBuf = await polishImage(fallbackBuf);
  row.import_status = "needs_review";
  row.import_flag_reason = `whole-page figure fallback used (bbox confidence=${confidence ?? "n/a"}, valid=${validBbox})`;
}
```

### R2 upload

```javascript
async function uploadToR2(key, buffer) {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: "image/png",
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `${R2_PUBLIC}/${key}`;
}
// Key format: question-figures/<pdf-stem>/p<page>-<i>.png
const key = `${R2_KEY_PREFIX}/${pdfStem}/p${row.source_page}-${i + 1}.png`;
const url = await uploadToR2(key, polishedBuf);

// Attach back to the row
row.image_url = url;
row.image_alt = row.figure_alt || `Figure on page ${row.source_page}`;
```

> **Failure mode — whole-page fallback overused.** On figure-dense
> pages, Gemini's bbox confidence drops and the entire rendered page
> becomes the figure (with `needs_review` flag). Operators see a high
> rate of "looks like the whole page" in the Review UI.

### The native-figure paths — table + chart extraction

`figure_kind` can be `image` (default raster), `table` (HTML from
`figure_table_data`), `chart` (SVG from `figure_chart_data`), or `svg`
(reserved). Two backfill scripts populate the structured data:

#### Table extraction prompt — `scripts/figure-extraction/extract-table-data.mjs`

```text
You are looking at a figure that was extracted from an SAT practice test PDF. Decide whether the figure is a DATA TABLE (rows and columns of values with headers). If it is, transcribe the table contents into structured JSON. If it's any other kind of figure (scatterplot, geometry diagram, coordinate-plane graph, bar chart, 3D solid, etc.), return is_table=false.

For real tables, transcribe FAITHFULLY. Preserve numeric values, currency symbols, units. Wrap math expressions in $...$ for KaTeX rendering (e.g. $x^2$, $\frac{1}{2}$). Keep header_row text concise (the column labels as printed). The first cell of each body row is usually a row label — preserve it as the first column value.

Return strict JSON:

{
  "is_table": true | false,
  "caption": "<title above the table, or null>",
  "header_row": ["Column 1 label", "Column 2 label", ...] | null,
  "rows": [ ["Row 1 col 1", "Row 1 col 2", ...], ... ],
  "footer_note": "<source note or footnote below the table, or null>",
  "confidence": "high" | "medium" | "low"
}

If is_table=false, return only { "is_table": false } — leave the other fields out.

CRITICAL: do not embed answer choices or question stem text in the table. Only transcribe what's clearly part of the table itself (caption + headers + body + footer note).
```

Model: `gemini-2.5-flash`. Partial index for candidates:
`idx_quiz_questions_figure_pending_table WHERE image_url IS NOT NULL
AND (figure_kind IS NULL OR figure_kind = 'image') AND figure_table_data IS NULL`.
If not a table, sets `figure_kind = 'image'` (terminal — won't re-call).

#### Chart extraction prompt — `scripts/figure-extraction/extract-chart-data.mjs`

```text
You are looking at a figure extracted from an SAT practice test PDF. Decide whether it is a COORDINATE-PLANE CHART of one of these four types:

  · "scatterplot"   — a collection of dots, no lines connecting them
  · "line_graph"    — dots connected by line segments (possibly multiple series)
  · "bar_chart"     — vertical or horizontal bars with categorical x-axis
                       (treat histograms as bar_chart with numeric categories)
  · "function_plot" — a smooth curve representing y = f(x) (e.g. parabola, line)

If it is NOT one of these (geometry diagram, 3D solid, table, photo, raw equation, etc.), return {"is_chart": false}.

If it IS a chart, extract structured data. Coordinate values are in the AXIS'S NUMERIC SPACE, NOT pixel positions — read off the axes and report the data as a student would record it. Be honest about uncertainty: if a dot looks like it sits between (3, 5.5) and (3, 6), pick the closer one.

Return strict JSON matching this exact shape:

{
  "is_chart": true,
  "kind": "scatterplot" | "line_graph" | "bar_chart" | "function_plot",
  "title": "<title above the chart, or null>",
  "x_axis": {
    "label": "<x-axis label, or empty string>",
    "min": <number or null>,
    "max": <number or null>,
    "tick_step": <number or null>,
    "categories": ["A", "B", "C"] | null   // only for bar_chart
  },
  "y_axis": { ...same shape... },
  "show_grid": true | false,
  "series": [
    // SCATTER:
    { "kind": "scatter", "label": "<name or null>", "points": [[x1, y1], ...] },
    // LINE:
    { "kind": "line", "label": "<name or null>", "points": [[x1, y1], ...] },
    // BAR:
    { "kind": "bar", "label": "<name or null>",
      "bars": [{"category": "A", "value": 5}, ...] },
    // FUNCTION:
    { "kind": "function", "label": "<name or null>",
      "expression": { "kind": "linear",   "m": <num>, "b": <num> }
                   | { "kind": "quadratic", "a": <num>, "b": <num>, "c": <num> }
                   | { "kind": "absolute_value", "a": <num>, "h": <num>, "k": <num> }
                   | { "kind": "exponential", "a": <num>, "b": <num> },
      "domain": [<xLo>, <xHi>] | null }
  ],
  "confidence": <0.0 — 1.0>,
  "extractor_note": "<short note explaining any judgement calls, or null>"
}

CONFIDENCE GUIDE:
  · 1.0   — every value is read directly from clearly-labeled axes
  · 0.8+  — high confidence; ready to auto-publish to students
  · 0.5-0.8 — best guess; needs human review
  · <0.5  — significant ambiguity (illegible labels, weird crop, etc.)

CRITICAL:
  · Do NOT invent data points if the image is unclear — set lower confidence.
  · For function_plot, only emit if the curve clearly matches one of the 4 supported expression families. Otherwise treat as scatterplot.
  · For bar_chart, set categories[] on x_axis AND make sure every bar's "category" matches one entry.
  · Don't transcribe the question text or answer choices into the chart data.
```

Model: `gemini-2.5-pro` (Pro is needed for spatial reasoning — Flash
often misses). Auto-publish threshold: `confidence >= 0.8`. Above →
flip `figure_kind = 'chart'`. Below → write the JSON but leave
`figure_kind = 'image'` for manual review.

> **Drift:** Tables + charts are populated by separate backfill scripts
> run manually AFTER the main pipeline. Phase 4c (SVG primitives for
> geometry) is reserved but has no extractor. So a freshly-imported PDF
> shows raster figures until someone runs the backfills.

---

## 6. Stage 3 — emit 32-column CSV

`scripts/pdf-pipeline/json-to-import-csv.mjs` is short and structural:

```javascript
// 32 columns in exact spec order — matches CSV_HEADERS in
// src/components/admin/BulkImportPanel.tsx + KarmanGPT.txt §5.
const CSV_HEADERS = [
  "question_text", "choice_a", "choice_b", "choice_c", "choice_d",
  "correct_answer", "difficulty", "topic_cluster",
  "hint", "explanation_text",
  "explanation_a", "explanation_b", "explanation_c", "explanation_d",
  "desmos_strategy",
  "passage_intro", "passage", "passage_a", "passage_b",
  "question_format", "numeric_tolerance",
  "domain", "concept_slug", "answer_source",
  "source_pdf", "source_page", "content_hash",
  "import_status", "import_flag_type", "import_flag_reason",
  "image_url", "image_alt",
];

function csvEscape(v) {
  const s = String(v ?? "");
  // RFC 4180: quote when the field contains , " \n \r — and double
  // any embedded quotes inside the quoted field.
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function computeContentHash(row) {
  // sha1(lowercase(strip_whitespace(
  //   question_text + "|" + choice_a + "|" + ... + "|" + choice_d
  // )))
  // For numeric_entry rows where choices are blank, hash question_text
  // alone (per KarmanGPT §5).
  const parts =
    row.question_format === "numeric_entry"
      ? [row.question_text || ""]
      : [
          row.question_text || "",
          row.choice_a || "", row.choice_b || "",
          row.choice_c || "", row.choice_d || "",
        ];
  const joined = parts.map((s) => String(s).trim().toLowerCase().replace(/\s+/g, "")).join("|");
  return createHash("sha1").update(joined).digest("hex");
}
```

The mapped row, with downstream-filled fields stayed blank:

```javascript
const mapped = {
  question_text: r.question_text || "",
  choice_a: r.choice_a || "",
  choice_b: r.choice_b || "",
  choice_c: r.choice_c || "",
  choice_d: r.choice_d || "",
  correct_answer: r.correct_answer || "",
  difficulty: r.difficulty != null ? String(r.difficulty) : "",
  topic_cluster: r.topic_cluster || "",
  // Downstream-filled fields stay blank — Sonnet/Haiku fill them
  // after bulk-import places the rows in the database.
  hint: "",
  explanation_text: "",
  explanation_a: "", explanation_b: "", explanation_c: "", explanation_d: "",
  desmos_strategy: "",
  passage_intro: r.passage_intro || "",
  passage: r.passage || "",
  passage_a: r.passage_a || "",
  passage_b: r.passage_b || "",
  question_format: r.question_format || "multiple_choice",
  numeric_tolerance: r.numeric_tolerance || "",
  domain: r.domain || "",
  concept_slug: r.concept_slug || "",
  answer_source: r.answer_source || "extracted",
  source_pdf: sourcePdf,
  source_page: r.source_page != null ? String(r.source_page) : "",
  content_hash: computeContentHash(r),
  import_status: r.import_status || "ok",
  import_flag_type:
    r.import_flag_type || (r.import_status === "needs_review" ? "partial_emit" : ""),
  import_flag_reason: r.import_flag_reason || "",
  image_url: r.image_url || "",
  image_alt: r.image_alt || "",
};
```

### Sample CSV row

```text
"Which choice completes the text with the most logical and precise word?","remote","vital","obscure","modest","B","3","Craft & Structure",,,,,,,,,"Researcher Philip Metzger continues to use Apollo's data, demonstrating that the missions' value to science ______.",,,multiple_choice,,craft_structure,precise-word-choice-in-context,extracted,202603asiav1.pdf,14,a3b1c9d4e2f7,ok,,,https://r2.karman.app/question-figures/202603asiav1/p14-3.png,Scatterplot...
```

> **Drift:** `docs/ingestion/spec.md` §2 still documents the OLD
> 30-column CSV (no `image_url` / `image_alt`). The code emits 32.
> The importer accepts both shapes by column-name lookup, but stale
> docs say 30.
>
> **Live failure mode (CRIT-4 from audit-2026-05-17):** `content_hash`
> doesn't include `passage_*` fields. Cross-text R&W questions with
> the same generic stem ("Which choice completes the text with the most
> logical and precise word?") can hash-collide across PDFs. The CSV
> emitter (`json-to-import-csv.mjs:102-120`) and the migration
> (`(source_pdf, content_hash)` unique index) both still ignore
> passages.

---

## 7. Stage 4 — DB import (two parallel paths)

There are **two parallel importers**. The orchestrator uses one, the
web admin upload uses the other. They have different validation,
different image handling, different flag logic.

### Path A — orchestrator: `scripts/pdf-pipeline/import-csv-direct.mjs`

```javascript
// ============================================================
// import-csv-direct.mjs — read a 30-column CSV and insert each
// row directly into Supabase: quiz_questions + answer_choices,
// with concept_slug → node_id auto-attach.
//
// The (source_pdf, content_hash) UNIQUE index in quiz_questions makes
// this idempotent: re-running on the same CSV is safe; conflicts are
// reported as skipped_duplicates.
// ============================================================

// Build slug → node_id map by regex-parsing curriculum.ts
// (faster than running a tsx-compiled module).
const SLUG_TO_NODE = new Map();
try {
  const curr = readFileSync("src/data/curriculum.ts", "utf-8");
  // Match blocks like:   id: "rw-00", tier: 1, difficulty: 1,
  //                      concept_slug: "main-idea-and-central-claims",
  const re = /id:\s*"([a-z0-9-]+)",[\s\S]*?concept_slug:\s*"([a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(curr)) !== null) {
    SLUG_TO_NODE.set(m[2], m[1]);
  }
  console.log(`loaded ${SLUG_TO_NODE.size} slug→node mappings from curriculum.ts`);
} catch (err) {
  if (err?.code === "ENOENT") {
    console.log("curriculum.ts not found — inserting all rows with node_id=null");
  } else {
    throw err;
  }
}

const VALID_DOMAINS = new Set([
  "algebra", "advanced_math", "geometry", "data_analysis",
  "info_ideas", "craft_structure", "expression_ideas", "conventions",
]);
const READING_DOMAINS = new Set([
  "info_ideas", "craft_structure", "expression_ideas", "conventions",
]);

const CLUSTER_BY_DOMAIN = {
  algebra: "Algebra",
  advanced_math: "Advanced Math",
  geometry: "Geometry & Trigonometry",
  data_analysis: "Problem-Solving & Data Analysis",
  info_ideas: "Information & Ideas",
  craft_structure: "Craft & Structure",
  expression_ideas: "Expression of Ideas",
  conventions: "Standard English Conventions",
};

// Difficulty 1-7 → legacy enum
function legacyDifficulty(level) {
  const n = parseInt(level, 10);
  if (!Number.isFinite(n)) return "intermediate";
  if (n <= 2) return "foundational";
  if (n <= 4) return "intermediate";
  if (n <= 6) return "advanced";
  return "mastery";
}

// Per row:
const slug = get("concept_slug");
const domain = get("domain");
const node_id = SLUG_TO_NODE.get(slug) || null;
const subject = READING_DOMAINS.has(domain) ? "reading" : "math";

if (!VALID_DOMAINS.has(domain)) {
  result.errored++;
  result.errors.push({ row: idx + 2, msg: `unknown domain "${domain}"` });
  continue;
}
if (slug && !SLUG_TO_NODE.has(slug)) {
  // slug present but unknown — flag, don't error out
  console.log(`  row ${idx + 2}: unknown slug "${slug}" — inserting unattached`);
}

const insertPayload = {
  node_id,
  question_text: get("question_text"),
  question_type: questionType,
  difficulty: legacyDifficulty(difficultyLevel),
  difficulty_level: difficultyLevel,
  answer_format: format,
  correct_answer: get("correct_answer"),
  numeric_tolerance: tolerance ? Number.parseFloat(tolerance) : null,
  explanation_text: get("explanation_text"),
  explanation_per_choice: explanationPerChoice,
  hint: get("hint") || null,
  subject,
  topic_cluster: cluster,
  desmos_strategy: get("desmos_strategy") || null,
  passage_intro: get("passage_intro") || null,
  passage: get("passage") || null,
  passage_a: get("passage_a") || null,
  passage_b: get("passage_b") || null,
  domain,
  concept_slug: slug || null,
  answer_source: get("answer_source") || null,
  source_pdf: get("source_pdf") || null,
  source_page: Number.isFinite(sourcePage) ? sourcePage : null,
  content_hash: get("content_hash") || null,
  import_status: importStatus,
  import_flag_type: flagType,
  import_flag_reason: flagReason,
  // Figure URL + alt-text from the extract-figures.mjs stage.
  // Without these, every figure cropped + uploaded to R2 by
  // the pipeline was silently dropped during DB insert — the
  // pre-existing import script was built for the ChatGPT
  // base64-data-URL flow and never handled the R2-URL case.
  image_url: get("image_url") || null,
  image_alt: get("image_alt") || null,
};

const { data: inserted, error } = await supabase
  .from("quiz_questions")
  .insert(insertPayload)
  .select("id")
  .single();

if (error) {
  // Postgres unique-violation on (source_pdf, content_hash) → 23505
  if (error.code === "23505" || /duplicate/i.test(error.message)) {
    result.skippedDup++;
    continue;
  }
  result.errored++;
  result.errors.push({ row: idx + 2, msg: error.message });
  continue;
}

// For MC, insert 4 answer_choices
if (format === "multiple_choice") {
  const choiceRows = ["A", "B", "C", "D"].map((letter) => ({
    question_id: inserted.id,
    letter,
    choice_text: get("choice_" + letter.toLowerCase()),
    is_correct: get("correct_answer").toUpperCase() === letter,
  }));
  await supabase.from("answer_choices").insert(choiceRows);
}
```

### Path B — web admin: `src/lib/question-bank/bulk-import.ts`

```typescript
// ============================================================
// bulk-import — core CSV-row → quiz_questions logic.
//
// Exists as a separate helper (not a server action) so it can be
// called from non-Clerk contexts: the CRON_SECRET-authed
// /api/cron/ingest-csv-inbox route in particular.
// ============================================================

/** Per-image size cap on the bulk-import pipeline. Decoded image
 *  bytes (post base64) that exceed this throw — 2 MB. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

async function materializeImage(
  imageUrl, sourcePdf, contentHash
): Promise<{ url: string | null; storagePath: string | null }> {
  if (!imageUrl) return { url: null, storagePath: null };
  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith("data:image/")) {
    // Already an external URL — keep as-is, no storage path.
    return { url: trimmed, storagePath: null };
  }
  // data:<mime>;base64,<payload>
  const m = trimmed.match(/^data:(image\/[\w.+-]+);base64,([\s\S]+)$/);
  if (!m) throw new Error("malformed image_url data URL");
  const mime = m[1];
  const ext = (mime.split("/")[1] || "png").replace("+xml", "").toLowerCase();
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error(
      `image too large: ${bytes.length} bytes exceeds cap of ${MAX_IMAGE_BYTES} bytes`
    );
  }
  // Hash the bytes so the same image (e.g. shared whole-page render
  // across questions) dedupes to one R2 object.
  const sha = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const stem = (sourcePdf?.replace(/\.pdf$/i, "") || "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
  const tag = (contentHash || sha).slice(0, 12);
  const key = `question-images/bulk/${stem}/${sha}-${tag}.${ext}`;
  const { publicUrl, storagePath } = await uploadToR2({
    key, body: bytes, contentType: mime,
  });
  return { url: publicUrl, storagePath };
}

// ── Auto-flag every image-bearing row ────────────────
// Image extraction is the failure-prone step in the GPT
// pipeline. Flag every image row so it lands in
// /admin/questions/review for a quick visual sanity check
// before going live in Learn.
if (r.image_url?.trim()) {
  if (r.import_status !== "needs_review") {
    r.import_status = "needs_review";
    r.import_flag_type = r.import_flag_type ?? "partial_emit";
    const where = [
      r.source_pdf,
      r.source_page !== undefined && r.source_page !== "" ? `page ${r.source_page}` : null,
    ].filter(Boolean).join(" · ");
    r.import_flag_reason = where
      ? `Image attached — verify the figure was extracted correctly (${where}).`
      : "Image attached — verify the figure was extracted correctly.";
  }
}

if (r.concept_slug && !isValidSlug(r.concept_slug)) {
  throw new Error(`unknown concept_slug "${r.concept_slug}"`);
}
```

### The drift between the two paths (this is a redesign target)

| | `import-csv-direct.mjs` (orchestrator) | `bulk-import.ts` (web admin) |
| --- | --- | --- |
| CSV parser | Inline RFC4180-ish (~50 lines) | `src/lib/question-bank/csv-parser.ts` (NOT used by orchestrator) |
| Slug→node map | Regex-parsed from `src/data/curriculum.ts` at script start | `taxonomy.ts` imports curriculum directly (no regex) |
| Unknown slug | Inserts with `node_id=null`, logs warning, does NOT flag | THROWS `unknown concept_slug` error |
| Domain validation | Hard fail on unknown | Hard fail on unknown |
| image_url base64 → R2 upload | Not supported (assumes URL already https) | `materializeImage()` decodes + uploads + caps at 2MB |
| Auto-flag image rows | Not applied | Applied (every image row → needs_review) |
| Cluster derivation | `CLUSTER_BY_DOMAIN[domain] || get("topic_cluster")` | `clusterFromSlug(slug) \|\| topic_cluster \|\| CLUSTER_BY_DOMAIN[domain]` |
| Difficulty mapping | Inline `legacyDifficulty()` | `levelToLegacyDifficulty()` from `@/types/quiz` |
| Tests | None | RTL/unit tests exist on the calling server action |

---

## 8. Stage 5 — content fill (three Claude calls)

`scripts/content-generation/fill-all.mjs` runs three sub-scripts in
series. Each is independently idempotent — re-running this whole
orchestrator is safe (no-ops on rows already filled).

```javascript
const STAGES = [
  {
    label: "Stage 1/3 — explanation_text (Sonnet 4.6)",
    script: "scripts/content-generation/generate-explanation-text.mjs",
  },
  {
    label: "Stage 2/3 — per-choice explanations (Sonnet 4.6, R&W MC only)",
    script: "scripts/content-generation/generate-per-choice-explanations.mjs",
  },
  {
    label: "Stage 3/3 — Desmos tips (Haiku 4.5, math only)",
    script: "scripts/content-generation/generate-desmos-tips.mjs",
  },
];
```

### 5a — `explanation_text` (Sonnet 4.6, all subjects)

System prompts pick by subject:

```javascript
// Depth ladders mirror KarmanGPT §8 (R&W) and §9 (Math).
const SYSTEM_PROMPT_RW = `You write the explanation_text field for SAT Reading & Writing practice questions. This is the synthesis paragraph the student sees when they get a question wrong — it should TEACH them what to recognize next time, not just restate the answer.

Depth scales with difficulty (1-7):
  · Easy (1-2):    1-2 sentences. Direct, concise.
  · Medium (3-4):  2-3 sentences. Some inferential reasoning shown.
  · Hard (5-7):    3-4 sentences. Quote-anchored, walks through why this beats the close alternatives.

Style rules:
  · ALWAYS anchor reasoning to the passage. Quote specific phrases or reference a sentence ("In sentence 3..." / "The phrase 'remarkably resilient' indicates..."). Never reason in a vacuum.
  · For Cross-Text questions: state what Text 1 establishes, then Text 2, then synthesize.
  · For Command-of-Evidence-Quantitative: reference the chart/table data directly ("The 2019 row shows...").
  · Don't write "The correct answer is X because..." — synthesize the reasoning organically.
  · Don't repeat the per-choice trap labels here; that's the job of explanation_a..d.
  · KaTeX wrapping: any math notation (rare in R&W) goes in $...$ inline.`;

const SYSTEM_PROMPT_MATH = `You write the explanation_text field for SAT Math practice questions. This is the full step-by-step walkthrough — the student should be able to redo this problem on their own after reading.

Depth scales with difficulty (1-7):
  · Easy (1-2):    2-3 numbered steps with brief justification.
  · Medium (3-4):  4-6 numbered steps; name each technique used (factoring, substitution, distributing, etc.).
  · Hard (5-7):    6-10+ numbered steps; full derivation, show every intermediate step, flag where students most commonly go wrong, substitute the answer back to verify.

Format — numbered steps. Each step:
  · "Step N: <action in plain English>"
  · The math on its own line wrapped in $...$ inline or $$...$$ for display
  · Brief justification — what concept/identity it leverages, why this operation is valid
  · Don't skip "obvious" steps; the student is learning, not verifying.

End with either:
  · A CHECK: substitute the answer back into the original equation/constraint to verify.
  · OR a sanity check on units / sign / magnitude.

When relevant, name the SAT-Math trap a wrong choice would exploit (inside the walkthrough, not as a separate list):
  · Sign error: forgot to distribute a negative
  · Inverse error: used reciprocal instead of value
  · Exponent rule confusion: added when should have multiplied
  · Solved for x instead of the expression the question asks for
  · Confused slope with y-intercept
  · Used diameter instead of radius
  · Off-by-one in a sequence
  · Switched units / forgot to convert
  · Applied wrong formula

KaTeX is REQUIRED for all math notation. Wrap fractions $\dfrac{a}{b}$, exponents $x^2$, square roots $\sqrt{5}$, etc.`;
```

User prompt construction:

```javascript
function buildPrompt(row) {
  const lines = [
    `Generate explanation_text for this SAT question. Difficulty: ${row.difficulty ?? "?"}.`,
    "",
    "QUESTION:",
    row.question_text,
  ];
  if (row.passage) lines.push("", "PASSAGE:", row.passage);
  if (row.passage_a)
    lines.push("", "PASSAGE A:", row.passage_a, "", "PASSAGE B:", row.passage_b || "");
  if (row.choices && row.choices.length) {
    lines.push("", "CHOICES:");
    for (const letter of ["A", "B", "C", "D"]) {
      const choice = row.choices.find((c) => c.letter === letter);
      if (choice) lines.push(`${letter}) ${choice.choice_text}`);
    }
  }
  lines.push("", `CORRECT ANSWER: ${row.correct_answer}`);
  if (row.image_alt) lines.push("", `FIGURE: ${row.image_alt}`);
  return lines.join("\n");
}
```

Call shape:

```javascript
parsed = await callClaude({
  prompt: buildPrompt(row),
  systemPrompt: isMath ? SYSTEM_PROMPT_MATH : SYSTEM_PROMPT_RW,
  model: "claude-sonnet-4-6",
  toolSchema: {
    type: "object",
    properties: {
      explanation_text: {
        type: "string",
        description: "The full explanation. R&W: synthesis paragraph anchored to the passage. Math: numbered step-by-step walkthrough with KaTeX.",
      },
    },
    required: ["explanation_text"],
  },
  maxTokens: isMath ? 2048 : 1024,
});

// Rejects answers < 30 chars
const text = String(parsed?.explanation_text ?? "").trim();
if (text.length < 30) {
  console.log(`Claude returned too-short explanation (${text.length} chars)`);
  counts.errors++;
  continue;
}
```

Query: rows where `explanation_text IS NULL OR explanation_text = ''`.

### 5b — `explanation_per_choice` (Sonnet 4.6, MC only)

System prompt:

```text
You write per-choice explanations for SAT practice questions. For each of the four answer choices (A, B, C, D), produce a 1-2 sentence explanation:

  · For the CORRECT choice: explain the reasoning that arrives at this answer. Be concise and direct.
  · For each WRONG choice: name the trap or misconception that produces it ("sign error", "off-by-one", "swapped units", "misread the question", "common partial-completion"). Explicitly say why it's wrong.

Style rules:
  · Each explanation must be 50-150 characters. Long enough to be useful, short enough to scan.
  · Use the same math notation conventions as the question. Wrap inline math in $…$ (e.g. $x^2$, $\frac{1}{2}$).
  · Don't lecture. Don't say "Choice A is wrong because…" — just explain the trap.
  · Don't repeat the choice text inside your explanation.
```

The OCR-truncation heuristic that decides which letters to regenerate:

```javascript
// Decide which letters need a new explanation. Returns the set
// of letters to overwrite based on the policy.
function lettersNeedingExplanation(existing, force) {
  if (force) return new Set(["A", "B", "C", "D"]);
  const need = new Set();
  for (const letter of ["A", "B", "C", "D"]) {
    const v = (existing && existing[letter]) || "";
    const trimmed = v.trim();
    if (!trimmed) {
      need.add(letter);
      continue;
    }
    // Heuristic for OCR truncation: < 30 chars AND doesn't end
    // in sentence-ending punctuation. Real (human-written) one-
    // word answers are rare; truncated OCR is common.
    if (trimmed.length < 30 && !/[.!?]$/.test(trimmed)) {
      need.add(letter);
    }
  }
  return need;
}
```

Tool schema:

```javascript
toolSchema: {
  type: "object",
  properties: {
    A: { type: "string", description: "Explanation for choice A." },
    B: { type: "string", description: "Explanation for choice B." },
    C: { type: "string", description: "Explanation for choice C." },
    D: { type: "string", description: "Explanation for choice D." },
  },
  required: ["A", "B", "C", "D"],
},
```

Then merges the response into existing JSONB so human-written entries
that were long enough get preserved, only the ones in `need` overwrite.
Rejects per-choice entries < 20 chars.

> **Drift:** The doc comment says "R&W MC only" but the script doesn't
> gate on subject — it runs on math MC too. Math per-choice fields
> stay blank per KarmanGPT.txt §9, but only because they're already
> blank from the extractor, not because this script knows to skip math.

### 5c — `desmos_strategy` (Haiku 4.5, math only)

System prompt:

```text
You generate Desmos graphing-calculator strategy tips for SAT math questions. A tip is 1-2 sentences telling the student EXACTLY what to type into Desmos to solve the problem efficiently — the keystrokes / commands, not the math behind them.

WHEN DESMOS IS USEFUL (write a real tip):
  · System of equations → "Graph both equations; the intersection is your answer."
  · Quadratic / function root → "Plot y = f(x); the x-intercepts are the solutions."
  · Linear regression / line-of-best-fit → "Type y₁ ~ mx + b after pasting the table."
  · Inequalities → "Graph the inequality directly with the < symbol."
  · Compound interest / exponential → "Plot y = P(1+r)^x and read off the value at x = years."
  · Geometry that resolves to coordinates → "Use the regular polygon (n=…) construction."

WHEN DESMOS IS NOT USEFUL (write a short skip-note):
  · Pure algebraic manipulation that's faster by hand
  · Conceptual / definition-based questions
  · Word problems where setup is harder than the math

For the not-useful case, write: "Not applicable — <one sentence why Desmos doesn't help>."

Style rules:
  · Maximum 2 sentences, total under 200 characters.
  · Use concrete Desmos syntax when it helps (`y = x^2 - 4x + 3`, `y₁ ~ a + bx`, etc.).
  · Don't explain WHY the answer is what it is — that's the explanation field's job. Focus on the calculator-driven approach.
  · Don't include the answer itself.
```

Tool schema:

```javascript
toolSchema: {
  type: "object",
  properties: {
    useful: { type: "boolean", description: "Whether Desmos is genuinely useful for this question." },
    tip: { type: "string", description: "The Desmos tip text, or a short skip-note when not applicable." },
  },
  required: ["useful", "tip"],
},
```

Always writes the tip even when `useful=false` — the field is
consistently populated; UI decides whether to show.

### `hint` is NOT filled

The CSV header includes it, the DB has a column, KarmanGPT.txt §10
says generate it, but no script in `content-generation/` targets the
`hint` field. Empty for every pipeline-imported row.

---

## 9. Stage 6 — multi-vote grader (cascade)

`scripts/question-audit/multi-vote-grader.mjs --from-db` is the active
grader in the orchestrator. Three-tier cascade.

### The solve prompt (used by all 5 voters at all 3 tiers)

```javascript
function buildPrompt(row) {
  const isMc = row.question_format !== "numeric_entry";
  const lines = [
    "You are solving an SAT question. Work it out carefully step by step, then give your final answer.",
    "",
  ];
  if (row.passage_intro) lines.push("PASSAGE INTRO:", row.passage_intro, "");
  if (row.passage) lines.push("PASSAGE:", row.passage, "");
  if (row.passage_a) {
    lines.push("PASSAGE A:", row.passage_a, "");
    lines.push("PASSAGE B:", row.passage_b || "", "");
  }
  lines.push("QUESTION:", row.question_text, "");
  if (isMc) {
    lines.push("ANSWER CHOICES:");
    lines.push(`A) ${row.choice_a}`);
    lines.push(`B) ${row.choice_b}`);
    lines.push(`C) ${row.choice_c}`);
    lines.push(`D) ${row.choice_d}`);
    lines.push("");
  }
  lines.push("Return strict JSON:");
  if (isMc) {
    lines.push('{ "reasoning": "<step-by-step, 2-4 sentences>", "answer": "<single letter A|B|C|D>", "confidence": "<high|medium|low>" }');
  } else {
    lines.push('{ "reasoning": "<step-by-step, 2-4 sentences>", "answer": "<numeric value>", "confidence": "<high|medium|low>" }');
  }
  return lines.join("\n");
}
```

### Pass 1 — three parallel voters

```javascript
const FLASH = "gemini-2.5-flash";
const PRO = "gemini-2.5-pro";
const OPUS = "claude-opus-4-7";

async function castVotes(row) {
  const prompt = buildPrompt(row);
  const voters = [
    {
      name: "flash",
      call: () => callGemini({
        prompt, model: FLASH, json: true, maxOutputTokens: 1024, thinkingBudget: 0,
      }),
    },
    {
      name: "deepseek",
      call: () => callDeepSeek({ prompt, model: "deepseek-chat", json: true }),
    },
    {
      name: "llama",
      call: () => callGroq({ prompt, model: "llama-3.3-70b-versatile", json: true }),
    },
  ];
  const settled = await Promise.allSettled(voters.map((v) => v.call()));
  return settled.map((r, i) => ({
    voter: voters[i].name,
    ok: r.status === "fulfilled",
    answer: r.status === "fulfilled" ? (r.value?.answer ?? null) : null,
    confidence: r.status === "fulfilled" ? (r.value?.confidence ?? null) : null,
    reasoning: r.status === "fulfilled" ? (r.value?.reasoning ?? null) : null,
    error: r.status === "rejected" ? String(r.reason).slice(0, 200) : null,
  }));
}
```

### Tally logic

```javascript
function tallyVotes(votes, isSpr) {
  const valid = votes.filter((v) => v.ok && v.answer);
  if (valid.length === 0) {
    return { majority: null, consensus: "no_valid_votes", validCount: 0 };
  }
  const tally = new Map();
  for (const v of valid) {
    const key = normalizeAnswer(v.answer, isSpr);
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const [topAnswer, topCount] = sorted[0];
  if (topCount === valid.length) {
    return { majority: topAnswer, consensus: "unanimous", validCount: valid.length };
  }
  if (topCount > valid.length / 2) {
    return { majority: topAnswer, consensus: "majority", validCount: valid.length };
  }
  return { majority: null, consensus: "split", validCount: valid.length };
}

// Answer normalization (handles MC letter + SPR numeric equality)
function normalizeAnswer(ans, isSpr) {
  if (!ans) return "";
  const t = String(ans).trim();
  if (!isSpr) {
    const m = t.match(/[A-D]/i);
    return m ? m[0].toUpperCase() : t.toUpperCase();
  }
  return t.replace(/[\s$(),]/g, "");
}

function answersAgree(stored, judged, isSpr) {
  const s = normalizeAnswer(stored, isSpr);
  const j = normalizeAnswer(judged, isSpr);
  if (!s || !j) return false;
  if (!isSpr) return s === j;
  const sN = parseFloat(s);
  const jN = parseFloat(j);
  if (!Number.isNaN(sN) && !Number.isNaN(jN)) return Math.abs(sN - jN) < 1e-6;
  return s === j;
}
```

### Pass 2 — Pro solo solve

```javascript
async function passProSolve(row) {
  return await callGemini({
    prompt: buildPrompt(row),
    model: PRO,
    json: true,
    maxOutputTokens: 2048,
  });
}
```

Triggered when `consensus === "split"` OR `pass1_disagree` (majority
disagrees with stored).

### Pass 3 — Opus arbiter

```javascript
async function passOpusSolve(row) {
  return await callClaude({
    prompt: buildPrompt(row),
    model: OPUS,
    toolSchema: {
      type: "object",
      properties: {
        reasoning: { type: "string" },
        answer: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["answer", "confidence"],
    },
    maxTokens: 2048,
  });
}
```

Triggered when Pro disagrees with stored AND Pass 1 majority disagreed.

### The cascade flow (full main()):

```javascript
// ── Pass 1 ──
for (let i = 0; i < rows.length; i++) {
  // ... castVotes(row) → tallyVotes → answersAgree
  if (validCount === 0) { results.push({ ...baseEntry, verdict: "error" }); continue; }
  if (consensus === "split") {
    results.push({ ...baseEntry, verdict: "pass1_split", needs_pass2: true });
    continue;
  }
  const agree = answersAgree(stored, majority, isSpr);
  if (agree) {
    results.push({ ...baseEntry, verdict: "verified" });
  } else {
    results.push({ ...baseEntry, verdict: "pass1_disagree", needs_pass2: true });
  }
}

// ── Pass 2: Pro on Pass-1 disagreements + splits ──
const pass2Candidates = results.filter((r) => r.needs_pass2);
for (const r of pass2Candidates) {
  // ... passProSolve(row)
  const agreeStored = answersAgree(r.stored, proAnswer, isSpr);
  if (agreeStored) {
    r.verdict = "verified_pro";
  } else {
    r.verdict = "pass2_disagree";
    r.needs_pass3 = true;
  }
}

// ── Pass 3: Opus on Pro disagreements ──
const pass3Candidates = results.filter((r) => r.needs_pass3);
for (const r of pass3Candidates) {
  // ... passOpusSolve(row)
  const agreeStored = answersAgree(r.stored, opusAnswer, isSpr);
  if (agreeStored) {
    r.verdict = "verified_opus";
  } else {
    r.verdict = "likely_wrong";
  }
}
```

### Verdict vocabulary

| Verdict | When |
| --- | --- |
| `verified` | Pass 1 majority agreed with stored |
| `verified_pro` | Pass 1 disagreed but Pro agreed |
| `verified_opus` | Pro disagreed but Opus agreed |
| `likely_wrong` | All three tiers disagree — key probably wrong |
| `pass1_split` | Pass 1 had no majority; no single tier was able to escalate cleanly |
| `pass1_disagree` | Pass 1 majority disagreed with stored (transient — will become verified_pro / verified_opus / likely_wrong) |
| `pass2_disagree` | Pro disagreed (transient — will become verified_opus / likely_wrong) |
| `uncertain_parse` | Pass 2 or Pass 3 returned an unparseable response |
| `skip_no_text` | Row had no question_text to solve |
| `error` | All Pass 1 voters errored AND no other tier ran |

### The `grader_votes` JSONB write

```javascript
// Migration 20260523090000_quiz_questions_grader_votes.sql:
//   ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS grader_votes JSONB;

async function persistGraderVotesToDb(results) {
  const gradedAt = new Date().toISOString();
  for (const r of results) {
    if (!r.id || r.verdict === "skip_no_text") continue;
    const pass1Votes = r.pass1?.votes ?? [];
    const flash = pass1Votes.find((v) => v.voter === "flash")?.answer ?? null;
    const deepseek = pass1Votes.find((v) => v.voter === "deepseek")?.answer ?? null;
    const llama = pass1Votes.find((v) => v.voter === "llama")?.answer ?? null;
    const votes = {
      graded_at: gradedAt,
      stored_answer: r.stored ?? null,
      verdict: r.verdict,
      pass1: {
        ...(flash != null ? { flash } : {}),
        ...(deepseek != null ? { deepseek } : {}),
        ...(llama != null ? { llama } : {}),
        ...(r.pass1?.consensus ? { consensus: r.pass1.consensus } : {}),
        ...(r.pass1?.majority ? { majority: r.pass1.majority } : {}),
      },
      ...(r.pass2?.answer ? { pass2_pro: r.pass2.answer } : {}),
      ...(r.pass3?.answer ? { pass3_opus: r.pass3.answer } : {}),
    };
    await supa
      .from("quiz_questions")
      .update({ grader_votes: votes })
      .eq("id", r.id);
  }
}
```

### Sample `grader_votes` value

```jsonc
{
  "graded_at": "2026-05-23T12:34:56Z",
  "stored_answer": "B",
  "verdict": "verified",
  "pass1": {
    "flash": "B",
    "deepseek": "B",
    "llama": "B",
    "consensus": "unanimous",
    "majority": "B"
  }
}
```

For an escalated row:

```jsonc
{
  "graded_at": "2026-05-23T12:35:14Z",
  "stored_answer": "C",
  "verdict": "verified_opus",
  "pass1": {
    "flash": "B",
    "deepseek": "C",
    "llama": "B",
    "consensus": "majority",
    "majority": "B"
  },
  "pass2_pro": "B",
  "pass3_opus": "C"
}
```

### Filters via env (used by the `grade-only.yml` workflow)

```javascript
//   FILTER_ANSWER_SOURCE=inferred     — only grade AI-guessed answers
//   FILTER_IMPORT_STATUS=needs_review — only grade flagged rows
//   FILTER_SOURCE_PDF=202405us.pdf    — restrict to one PDF
let q = supa.from("quiz_questions").select("*, answer_choices(letter, choice_text)")
  .order("source_pdf").order("source_page");
if (process.env.FILTER_ANSWER_SOURCE) q = q.eq("answer_source", process.env.FILTER_ANSWER_SOURCE);
if (process.env.FILTER_IMPORT_STATUS) q = q.eq("import_status", process.env.FILTER_IMPORT_STATUS);
if (process.env.FILTER_SOURCE_PDF) q = q.eq("source_pdf", process.env.FILTER_SOURCE_PDF);
```

### Apply-fix flow — `scripts/question-audit/apply-grader-fixes.mjs --from-db --apply`

When the grader flags a `likely_wrong` row, an admin can one-click
swap to the suggested answer via the Inspector OR batch-apply every
likely_wrong via this script:

```javascript
// Each applied fix:
//   1. Snapshots the BEFORE state into question_history.before_state
//   2. UPDATE quiz_questions.correct_answer = pro_answer
//   3. UPDATE quiz_questions.explanation_text = pro_reasoning
//   4. UPDATE quiz_questions.explanation_per_choice = NULL
//   5. UPDATE quiz_questions.import_status = 'needs_review'
//   6. UPDATE quiz_questions.import_flag_reason appended
//      "auto-fix-by-grader: stored=X → Y; per-choice explanations cleared"
//   7. Re-derive is_correct on answer_choices (clear all, set new letter)
//   8. INSERT question_history row (edit_source='apply-fix',
//      edited_by='system:apply-grader-fixes')
```


---

## 10. The older 8-pass grader (not in main path)

`scripts/question-audit/llm-grader.mjs` (~1494 lines) is the **older
8-pass grader**. It is NOT wired into the orchestrator. It runs on its
own in the nightly audit and writes to `question_findings` (whereas the
multi-vote grader writes to `quiz_questions.grader_votes`). The Inspector
UI reads from `question_findings`; the review queue reads from
`grader_votes`. Both surfaces are in active use.

### Why both exist

| | `multi-vote-grader.mjs` | `llm-grader.mjs` |
| --- | --- | --- |
| Goal | Answer-key check only | 8-pass full audit |
| Verdict shape | unanimous/majority/split + Pro/Opus escalation | 8 per-row scores |
| Storage | `quiz_questions.grader_votes` JSONB | `audit-out/grader-report.json` → `question_findings` via `ingest-findings.mjs` |
| UI | Review queue per-row badges | Inspector findings panel |
| In orchestrator? | Yes — stage 6 | No — separate nightly |
| Vision? | No (text only) | Yes (Pass 3 figure, Pass 7 vision diff) |

### The 8 passes

1. **Pass 1** — Gemini Flash blind solve (`buildSolvePrompt`)
2. **Pass 2** — Pro tie-break on disagreement
3. **Pass 3** — Figure coherence (vision: does the figure match the question?)
4. **Pass 4** — Explanation consistency (does the stored explanation support the stored answer?)
5. **Pass 5** — Well-formedness (is the question ambiguous or unsolvable due to OCR?)
6. **Pass 6** — Reserved / dropped in current version
7. **Pass 7** — Vision diff vs source PDF (compare extracted text to rendered page)
8. **Pass 8** — Concept slug verification (89-slug catalog passed in)

The two passes most relevant to the redesign discussion are Pass 7
(catches OCR mismatches like "x2" vs "x²") and Pass 8 (catches
mis-classified slugs).

### Pass 7 — vision diff prompt

```javascript
function buildVisionDiffPrompt(row) {
  const isMc = row.question_format !== "numeric_entry";
  const lines = [];
  lines.push(
    "Compare the text our pipeline EXTRACTED below against what's actually visible on the attached PDF page image."
  );
  lines.push("");
  lines.push("EXTRACTED QUESTION TEXT:");
  lines.push(row.question_text);
  if (isMc) {
    lines.push("");
    lines.push("EXTRACTED CHOICES:");
    lines.push(`A) ${row.choice_a}`);
    lines.push(`B) ${row.choice_b}`);
    lines.push(`C) ${row.choice_c}`);
    lines.push(`D) ${row.choice_d}`);
  }
  lines.push("");
  lines.push(
    "Look at the attached page image and identify any differences between what you SEE on the page and the EXTRACTED text above. Common issues:"
  );
  lines.push("  · Missing exponents (page shows 'x²' but extracted has 'x2')");
  lines.push("  · Missing parens, commas, or operators");
  lines.push("  · Truncated text (extracted ends mid-sentence vs full sentence on page)");
  lines.push("  · Wrong variable names");
  lines.push("  · Choice ordering reversed");
  lines.push("");
  lines.push(
    "Note: the page may contain OTHER questions besides this one. Identify the question that MATCHES the extracted stem first (usually labeled with a question number), then diff."
  );
  lines.push("");
  lines.push("Respond in JSON:");
  lines.push("{");
  lines.push('  "transcription_matches": "yes" | "partial" | "no",');
  lines.push('  "transcription_diffs": "<list specific differences, or empty if matches>"');
  lines.push("}");
  return lines.join("\n");
}
```

> This is the only place in the pipeline that catches "x2 → x²" style
> OCR errors. The deterministic auditor's rule F1 also detects them
> as a heuristic, but only Pass 7 confirms against the rendered page.
> Detection only — no auto-repair.

### Pass 8 — concept slug verification prompt

```javascript
// Pass the full catalog so the model can pick a specific replacement
// rather than just say "no". The catalog is ~89 entries × ~80 chars
// ≈ 7k tokens — fits well within Flash's context window. Suggestions
// are validated against the catalog server-side, so the model can't
// hallucinate a new slug.
function buildSlugCheckPrompt(row, storedSlug, catalog) {
  const isMc = row.question_format !== "numeric_entry";
  const lines = [];
  lines.push("You are verifying whether an SAT question is filed under the right curriculum topic.");
  lines.push("");
  lines.push("Each question carries a `concept_slug` that maps to a Learn node.");
  lines.push("Wrong slug = question lands in the wrong adaptive pool, students drill the wrong topic.");
  lines.push("");
  lines.push("CURRENT (stored) slug:");
  lines.push(`  ${storedSlug.slug}  —  "${storedSlug.label}"  (${storedSlug.domain})`);
  lines.push("");
  if (row.passage_intro) lines.push("PASSAGE INTRO: " + row.passage_intro);
  if (row.passage) lines.push("PASSAGE: " + row.passage);
  if (row.passage_a)
    lines.push("PASSAGE A: " + row.passage_a + "\nPASSAGE B: " + (row.passage_b || ""));
  lines.push("");
  lines.push("QUESTION TEXT: " + row.question_text);
  if (isMc) {
    lines.push("");
    lines.push("CHOICES:");
    lines.push(`A) ${row.choice_a}`);
    lines.push(`B) ${row.choice_b}`);
    lines.push(`C) ${row.choice_c}`);
    lines.push(`D) ${row.choice_d}`);
  }
  lines.push("");
  lines.push("CANDIDATE slugs (89 total):");
  // Group by domain for readability — the model picks much better when
  // it can see related slugs side-by-side.
  const byDomain = new Map();
  for (const s of catalog) {
    if (!byDomain.has(s.domain)) byDomain.set(s.domain, []);
    byDomain.get(s.domain).push(s);
  }
  for (const [domain, slugs] of byDomain) {
    lines.push(`  [${domain}]`);
    for (const s of slugs) {
      lines.push(`    ${s.slug}  —  ${s.label}`);
    }
  }
  lines.push("");
  lines.push("Does the CURRENT slug fit this question? If not, pick the single best replacement from the catalog above. Focus on what skill the question really tests, not surface keywords.");
  lines.push("");
  lines.push("Respond in JSON:");
  lines.push("{");
  lines.push('  "slug_matches": "yes" | "partial" | "no",');
  lines.push('  "suggested_slug": "<one of the slugs above, only if slug_matches is no; else empty>",');
  lines.push('  "reasoning": "<one short sentence explaining your call>"');
  lines.push("}");
  return lines.join("\n");
}
```

### `ingest-findings.mjs` — how grader output becomes `question_findings` rows

This script reads `audit-out/grader-report.json` (output of the
8-pass grader, NOT `multi-vote-grader.mjs`) and translates per-pass
findings into rows. Excerpt:

```javascript
// Pass 7 — vision cross-check
if (r.vision_transcription_matches === "no") {
  rows.push({
    source: "grader",
    severity: "BLOCKING",
    category: "ocr_mismatch",
    code: "ocr_mismatch",
    message: "Extracted CSV text differs from source PDF page (transcription error)",
    value: r.vision_transcription_diffs ? r.vision_transcription_diffs.slice(0, 300) : null,
    detail: { vision_diffs: r.vision_transcription_diffs },
  });
}

// Pass 8 — concept_slug verification.
// The Inspector "Apply suggested slug" button can use
// detail.suggested_concept_slug to one-click swap.
if (r.concept_slug_matches === "no") {
  rows.push({
    source: "grader",
    severity: "WARNING",
    category: "taxonomy",
    code: "concept_slug_mismatch",
    message: r.suggested_concept_slug
      ? `Stored slug doesn't fit; suggested replacement: ${r.suggested_concept_slug}`
      : "Stored concept_slug doesn't match what this question is testing",
    value: r.concept_slug_reasoning ? r.concept_slug_reasoning.slice(0, 300) : null,
    detail: {
      stored_slug: r.concept_slug || null,
      suggested_concept_slug: r.suggested_concept_slug || null,
      reasoning: r.concept_slug_reasoning || null,
    },
  });
}
```

### Triage-memory auto-reopen

```javascript
// Heuristic for auto-resolved: resolved_note starts with
// "Auto-resolved" (matches every system-resolution string the
// server actions write). Human resolutions use messages like
// "Resolved via Inspector" or admin-typed text → safe to leave.
const toReopen = (existingResolved ?? []).filter(
  (r) =>
    incomingKeys.has(`${r.question_id}|${r.source}|${r.code}`) &&
    typeof r.resolved_note === "string" &&
    r.resolved_note.startsWith("Auto-resolved")
);
// Re-open auto-resolved findings whose code re-fires; leave human-resolved alone.
```

---

## 11. Database schema — every relevant table

### `quiz_questions` (extended by migration 20260514002443)

```sql
-- supabase/migrations/20260514002443_question_ingestion.sql

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS passage_intro       TEXT,
  ADD COLUMN IF NOT EXISTS passage             TEXT,
  ADD COLUMN IF NOT EXISTS passage_a           TEXT,
  ADD COLUMN IF NOT EXISTS passage_b           TEXT,
  ADD COLUMN IF NOT EXISTS domain              TEXT,
  ADD COLUMN IF NOT EXISTS concept_slug        TEXT,
  ADD COLUMN IF NOT EXISTS answer_source       TEXT
    DEFAULT 'extracted'
    CHECK (answer_source IN ('extracted','inferred','hand_corrected')),
  ADD COLUMN IF NOT EXISTS source_pdf          TEXT,
  ADD COLUMN IF NOT EXISTS source_page         INTEGER,
  ADD COLUMN IF NOT EXISTS content_hash        TEXT,
  ADD COLUMN IF NOT EXISTS import_status       TEXT
    DEFAULT 'ok'
    CHECK (import_status IN ('ok','needs_review')),
  ADD COLUMN IF NOT EXISTS import_flag_type    TEXT
    CHECK (import_flag_type IN ('skip','partial_emit')),
  ADD COLUMN IF NOT EXISTS import_flag_reason  TEXT;

-- Relax node_id so PDF-imported questions can live in the bank without a curriculum-node assignment.
ALTER TABLE public.quiz_questions ALTER COLUMN node_id DROP NOT NULL;

-- Domain CHECK against the 8 SAT domains
ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_domain_check
  CHECK (
    domain IS NULL OR domain IN (
      'algebra','advanced_math','geometry','data_analysis',
      'info_ideas','craft_structure','expression_ideas','conventions'
    )
  );

-- Idempotency: same content_hash within same source_pdf cannot exist twice.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_questions_pdf_hash_uniq
  ON public.quiz_questions (source_pdf, content_hash)
  WHERE source_pdf IS NOT NULL AND content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS quiz_questions_import_status_idx
  ON public.quiz_questions (import_status)
  WHERE import_status = 'needs_review';

CREATE INDEX IF NOT EXISTS quiz_questions_concept_slug_idx
  ON public.quiz_questions (concept_slug)
  WHERE concept_slug IS NOT NULL;

-- Index for the bank view (questions with no node)
CREATE INDEX IF NOT EXISTS quiz_questions_bank_idx
  ON public.quiz_questions (concept_slug, created_at DESC)
  WHERE node_id IS NULL;
```

### Concept slug CHECK constraint (NOT VALID — legacy rows exempted)

```sql
-- supabase/migrations/20260518003000_concept_slug_check.sql
-- NOT VALID — pre-launch the bank may already hold rows with legacy slugs
-- (e.g. linear-equations, quadratics, central-idea — the 72-slug draft
-- this audit retired). NOT VALID lets the migration apply cleanly
-- without checking existing rows; the constraint fires on every future
-- INSERT/UPDATE.

ALTER TABLE public.quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_concept_slug_check;

ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_concept_slug_check
  CHECK (
    concept_slug IS NULL OR concept_slug IN (
      -- [89 slugs listed individually — see §12 of this doc]
      'linear-equations-one-variable',
      'linear-equations-two-variables',
      -- ... (full 89 enumeration)
    )
  )
  NOT VALID;
```

### `is_live` generated column + `quiz_questions_live` view

```sql
-- supabase/migrations/20260518004500_quiz_questions_live_view.sql
-- Enforce "students only see live questions" at the database level.

-- 1. Generated column
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN
  GENERATED ALWAYS AS (import_status IS NULL OR import_status = 'ok') STORED;

CREATE INDEX IF NOT EXISTS quiz_questions_is_live_idx
  ON public.quiz_questions (is_live)
  WHERE is_live = true;

-- 2. View
CREATE OR REPLACE VIEW public.quiz_questions_live AS
  SELECT * FROM public.quiz_questions WHERE is_live = true;

COMMENT ON VIEW public.quiz_questions_live IS
  $$Student-facing view of quiz_questions. Filters on the is_live generated column so PDF-imported needs_review rows, inferred answers, and other not-yet-accepted content never reach students. Admin code reads quiz_questions directly to see everything; student-facing code reads this view.$$;
```

### `question_findings` (older grader output + deterministic auditor)

```sql
-- supabase/migrations/20260518130917_question_findings.sql

CREATE TABLE IF NOT EXISTS question_findings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  source        TEXT NOT NULL CHECK (source IN ('auditor', 'grader')),
  severity      TEXT NOT NULL CHECK (severity IN ('BLOCKING', 'WARNING', 'NOTICE')),
  category      TEXT NOT NULL,
    -- 'schema' | 'formatting' | 'cross_field' | 'quality' | 'duplicate'
    -- | 'ocr_pattern' | 'llm_grader' | 'figure' | 'explanation'
    -- | 'well_formed' | 'ocr_mismatch' | 'taxonomy'
  code          TEXT NOT NULL,
    -- e.g. 'A7_bad_difficulty', 'F5_no_terminal_punct',
    -- 'likely_wrong', 'concept_slug_mismatch'
  message       TEXT NOT NULL,
  value         TEXT,
  detail        JSONB,
  resolved_at   TIMESTAMPTZ,
  resolved_by   TEXT,
  resolved_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One finding per (question, source, code) — re-running upserts.
  CONSTRAINT question_findings_unique UNIQUE (question_id, source, code)
);

CREATE INDEX IF NOT EXISTS idx_question_findings_question ON question_findings (question_id);
CREATE INDEX IF NOT EXISTS idx_question_findings_severity ON question_findings (severity)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_question_findings_unresolved ON question_findings (created_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE question_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON question_findings;
CREATE POLICY "Service role full access" ON question_findings
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

### `figure_kind` + `figure_table_data`

```sql
-- supabase/migrations/20260518140651_quiz_questions_figure_native.sql

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS figure_kind TEXT
    CHECK (figure_kind IS NULL OR figure_kind IN ('image', 'table', 'svg'))
    DEFAULT 'image';

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS figure_table_data JSONB;

-- Partial index for the bulk-extractor.
CREATE INDEX IF NOT EXISTS idx_quiz_questions_figure_pending_table
  ON public.quiz_questions (id)
  WHERE image_url IS NOT NULL
    AND (figure_kind IS NULL OR figure_kind = 'image')
    AND figure_table_data IS NULL;
```

### `figure_chart_data` (adds 'chart' to the enum)

```sql
-- supabase/migrations/20260519000000_quiz_questions_figure_chart.sql

ALTER TABLE public.quiz_questions
  DROP CONSTRAINT IF EXISTS quiz_questions_figure_kind_check;

ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_figure_kind_check
    CHECK (figure_kind IS NULL OR figure_kind IN ('image', 'table', 'svg', 'chart'));

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS figure_chart_data JSONB;

CREATE INDEX IF NOT EXISTS idx_quiz_questions_figure_pending_chart
  ON public.quiz_questions (id)
  WHERE image_url IS NOT NULL
    AND (figure_kind IS NULL OR figure_kind = 'image')
    AND figure_chart_data IS NULL;
```

### `question_history` (edit trail with snapshots)

```sql
-- supabase/migrations/20260518153300_question_history.sql

CREATE TABLE IF NOT EXISTS question_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  before_state  JSONB NOT NULL,   -- snapshot of the row + choices BEFORE the edit
  after_state   JSONB NOT NULL,   -- same shape, AFTER the edit
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  edited_by     TEXT NOT NULL,    -- Clerk user id
  edit_source   TEXT NOT NULL CHECK (edit_source IN ('inspector', 'bulk', 'api', 'apply-fix')),
  edit_note     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_history_question_created
  ON question_history (question_id, created_at DESC);

-- Later: 20260524010000_edit_source_add_preview.sql adds 'preview' to the enum
--   CHECK (edit_source IN ('inspector', 'bulk', 'api', 'apply-fix', 'preview'));
```

### `grader_votes` (latest verdict per row)

```sql
-- supabase/migrations/20260523090000_quiz_questions_grader_votes.sql

ALTER TABLE quiz_questions
ADD COLUMN IF NOT EXISTS grader_votes JSONB;

COMMENT ON COLUMN quiz_questions.grader_votes IS
  'Latest multi-vote grader verdict + per-LLM answers. Written by '
  'scripts/question-audit/multi-vote-grader.mjs. Shape documented '
  'in migration 20260523090000.';
```

### `rejected_questions` (soft-delete bin)

```sql
-- supabase/migrations/20260524000000_rejected_questions.sql

CREATE TABLE IF NOT EXISTS rejected_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The id the question had when it was still in quiz_questions.
  original_id uuid NOT NULL,

  -- Full point-in-time snapshot of the quiz_questions row.
  question_snapshot jsonb NOT NULL,
  choices_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,

  rejected_at timestamptz NOT NULL DEFAULT now(),
  rejected_by_user_id text,
  rejected_reason text,

  -- Denormalized columns for fast listing without JSONB extraction.
  source_pdf text,
  source_page int,
  domain text,
  subject text,
  question_preview text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rejected_questions_rejected_at_idx
  ON rejected_questions (rejected_at DESC);
CREATE INDEX IF NOT EXISTS rejected_questions_source_pdf_idx
  ON rejected_questions (source_pdf);
CREATE INDEX IF NOT EXISTS rejected_questions_original_id_idx
  ON rejected_questions (original_id);
```

### Full `quiz_questions` column inventory

| Column | Type | Nullable | Written by | Read by |
| --- | --- | --- | --- | --- |
| `id` | uuid | no | DB | everything |
| `node_id` | text | yes | importer (slug→node map) | quiz selectors, admin |
| `question_text` | text | no | extractor | renderer, grader, audit |
| `correct_answer` | text | no | extractor, grader fix | answer-eval, grader |
| `question_type` | enum | no | importer (derived from subject) | renderer |
| `answer_format` | enum (`multiple_choice`/`numeric_entry`) | no | extractor | renderer, grader |
| `difficulty` | enum (`foundational`/.../`mastery`) | no | importer (legacy map) | adaptive pick |
| `difficulty_level` | int2 (1–7) | no | extractor | adaptive pick, audit |
| `subject` | enum (`reading`/`math`) | no | importer (derived from domain) | filters |
| `topic_cluster` | text | no | importer (derived from domain) | filters |
| `domain` | text (8-value CHECK) | yes | extractor | filters, adaptive |
| `concept_slug` | text (89-value CHECK NOT VALID) | yes | extractor | slug→node mapping |
| `passage`, `passage_intro`, `passage_a`, `passage_b` | text | yes | extractor | renderer |
| `hint` | text | yes | (not filled by pipeline) | renderer |
| `explanation_text` | text | no | `generate-explanation-text.mjs` | renderer |
| `explanation_per_choice` | jsonb | yes | `generate-per-choice-explanations.mjs` | renderer |
| `desmos_strategy` | text | yes | `generate-desmos-tips.mjs` | renderer (math) |
| `numeric_tolerance` | numeric | yes | extractor (SPR) | answer-eval |
| `image_url` | text | yes | `extract-figures.mjs` → CSV → importer | renderer |
| `image_alt` | text | yes | extractor (seed) + figure stage | renderer (a11y) |
| `image_storage_path` | text | yes | `bulk-import.ts materializeImage()` | n/a |
| `figure_kind` | enum (`image`/`table`/`svg`/`chart`) | yes | table/chart backfill scripts | renderer (picks native vs raster) |
| `figure_table_data` | jsonb | yes | `extract-table-data.mjs` | `QuestionTable.tsx` |
| `figure_chart_data` | jsonb (ChartFigure shape) | yes | `extract-chart-data.mjs` | `ChartFigure.tsx` |
| `answer_source` | text (`extracted`/`inferred`/`hand_corrected`) | yes | extractor | grader filter, admin |
| `source_pdf` | text | yes | importer | dedup key, admin filter |
| `source_page` | int | yes | extractor | admin |
| `content_hash` | text (SHA-1) | yes | CSV emitter | dedup key |
| `import_status` | text (`ok`/`needs_review`) | yes | extractor + importer + figure stage | `is_live` generated column |
| `import_flag_type` | text (`skip`/`partial_emit`) | yes | extractor / importer | review UI |
| `import_flag_reason` | text | yes | extractor / importer / grader fix | review UI |
| `grader_votes` | jsonb | yes | `multi-vote-grader.mjs` | review UI badges |
| `is_live` | bool GENERATED | yes | DB | `quiz_questions_live` view |
| `is_flagged` | bool | yes | student flag action | admin |
| `flag_count` | int | yes | student flag action | admin |
| `created_at`, `updated_at` | timestamptz | yes | DB / triggers | audit |

### `answer_choices`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PRIMARY KEY | |
| `question_id` | uuid FK → `quiz_questions(id)` | |
| `letter` | enum (`A`/`B`/`C`/`D`) | |
| `choice_text` | text | |
| `is_correct` | bool | matches `quiz_questions.correct_answer` |

> **Drift on denormalized fields:**
> - `subject` is derived from `domain` at import time. Drifts if domain changes without subject update.
> - `topic_cluster` is derived from `domain` via the static 8-entry map. Same drift risk.
> - `difficulty` (legacy enum) is derived from `difficulty_level` (1–7 int) via `legacyDifficulty()`. Drift if one is updated without the other.
> - `correct_answer` is duplicated by `answer_choices.is_correct=true`. Out-of-sync rows are a real risk; `apply-grader-fixes.mjs --from-db` updates both together.

---

## 12. The 89-slug taxonomy

Source of truth: `src/lib/question-bank/taxonomy.ts:56-61`, derived at
module load from `src/data/curriculum/{math,reading-writing}.ts`. The
same list is duplicated in three other places:

1. `scripts/pdf-pipeline/extract-with-gemini.mjs:80-178` (hardcoded for post-validation)
2. `question-imports/chatgpt/KarmanGPT.txt` §6 (Claude Sonnet's system prompt)
3. `supabase/migrations/20260518003000_concept_slug_check.sql` (DB CHECK constraint, NOT VALID)

### The taxonomy.ts source-of-truth

```typescript
// ============================================================
// SAT question taxonomy — single source of truth for the
// 8 domains, 8 cluster labels, and the concept slugs that the
// PDF-ingestion routine emits and the importer validates.
//
// Slugs are 1:1 with curriculum nodes (see src/data/curriculum.ts).
// ============================================================

import { MATH_NODES, RW_NODES } from "@/data/curriculum";

export const SAT_DOMAINS = [
  "algebra", "advanced_math", "geometry", "data_analysis",
  "info_ideas", "craft_structure", "expression_ideas", "conventions",
] as const;

export type SATDomain = (typeof SAT_DOMAINS)[number];

export const CLUSTER_BY_DOMAIN: Record<SATDomain, string> = {
  algebra: "Algebra",
  advanced_math: "Advanced Math",
  geometry: "Geometry & Trigonometry",
  data_analysis: "Problem-Solving & Data Analysis",
  info_ideas: "Information & Ideas",
  craft_structure: "Craft & Structure",
  expression_ideas: "Expression of Ideas",
  conventions: "Standard English Conventions",
};

export interface ConceptSlug {
  slug: string;
  label: string;
  domain: SATDomain;
  nodeId: string;     // 1:1 with slug
}

// All concept slugs (one per curriculum node).
export const CONCEPT_SLUGS: ConceptSlug[] = [...RW_NODES, ...MATH_NODES].map((n) => ({
  slug: n.concept_slug,
  label: n.topic,
  domain: n.domain,
  nodeId: n.id,
}));

const SLUG_INDEX = new Map<string, ConceptSlug>(CONCEPT_SLUGS.map((c) => [c.slug, c]));

export function isValidSlug(slug: string): slug is ConceptSlug["slug"] {
  return SLUG_INDEX.has(slug);
}
export function clusterFromSlug(slug: string): string | undefined { /* ... */ }
export function domainFromSlug(slug: string): SATDomain | undefined { /* ... */ }
export function nodeIdFromSlug(slug: string): string | undefined { /* ... */ }
export function labelFromSlug(slug: string): string { /* ... */ }
export function isValidDomain(domain: string): domain is SATDomain { /* ... */ }
export function isValidNodeId(nodeId: string): boolean { /* ... */ }
export function searchSlugs(query: string): ConceptSlug[] { /* ... */ }
```

### Full 89-slug list (grouped by domain)

#### Algebra (6)

- `linear-equations-one-variable` (`ma-00`, t1d1)
- `linear-equations-two-variables` (`ma-01`, t1d1)
- `linear-inequalities` (`ma-02`, t1d1)
- `systems-of-linear-equations` (`ma-15`, t2d2)
- `systems-of-linear-inequalities` (`ma-16`, t2d2)
- `absolute-value-equations` (`ma-25`, t2d2)

#### Advanced Math (17)

- `properties-of-exponents` (`ma-06`, t1d1)
- `simplifying-algebraic-expressions` (`ma-07`, t1d1)
- `evaluating-and-interpreting-functions` (`ma-08`, t1d2)
- `introduction-to-polynomials` (`ma-10`, t1d2)
- `quadratic-equations-factoring` (`ma-17`, t2d2)
- `quadratic-equations-quadratic-formula` (`ma-18`, t2d2)
- `quadratic-functions-vertex-form` (`ma-19`, t2d2)
- `polynomial-operations` (`ma-20`, t2d2)
- `rational-expressions` (`ma-21`, t2d2)
- `radical-expressions` (`ma-22`, t2d2)
- `exponential-growth-and-decay` (`ma-23`, t2d2)
- `function-transformations` (`ma-26`, t2d2)
- `linear-vs-exponential-models` (`ma-27`, t2d2)
- `nonlinear-systems-of-equations` (`ma-35`, t3d3)
- `algebraic-manipulation-of-complex-expressions` (`ma-46`, t3d3)
- `multi-step-problem-solving` (`ma-48`, t3d3)
- `full-section-strategy` (`ma-49`, t3d3)

#### Geometry & Trigonometry (8)

- `area-perimeter-and-volume` (`ma-11`, t1d2)
- `angle-relationships` (`ma-12`, t1d2)
- `coordinate-plane-geometry` (`ma-13`, t1d2)
- `triangle-congruence-and-similarity` (`ma-32`, t2d2)
- `pythagorean-theorem-and-distance-formula` (`ma-33`, t2d2)
- `trigonometric-ratios` (`ma-34`, t2d3)
- `circle-equations-in-standard-form` (`ma-41`, t3d3)
- `arc-length-and-sector-area` (`ma-42`, t3d3)

#### Problem-Solving & Data Analysis (9)

- `ratios-and-proportions` (`ma-03`, t1d1)
- `percentages` (`ma-04`, t1d1)
- `unit-rates-and-conversions` (`ma-05`, t1d1)
- `scatterplots-and-lines-of-best-fit` (`ma-28`, t2d2)
- `statistical-measures` (`ma-29`, t2d2)
- `probability-basics` (`ma-30`, t2d2)
- `two-way-tables` (`ma-31`, t2d2)
- `statistical-inference-and-margin-of-error` (`ma-43`, t3d3)
- `interpreting-complex-data` (`ma-47`, t3d3)

#### Information & Ideas (15)

- `main-idea-and-central-claims` (`rw-00`, t1d1)
- `supporting-details-and-evidence` (`rw-01`, t1d1)
- `inference-and-implicit-meaning` (`rw-05`, t1d1)
- `central-idea-vs-theme` (`rw-15`, t2d2)
- `citing-textual-evidence` (`rw-18`, t2d2)
- `cross-text-synthesis` (`rw-21`, t2d2)
- `charts-and-data-in-passages` (`rw-22`, t2d2)
- `interpreting-graphs-alongside-text` (`rw-23`, t2d2)
- `command-of-evidence-textual` (`rw-30`, t2d2)
- `command-of-evidence-quantitative` (`rw-31`, t2d2)
- `counterclaims-and-rebuttals` (`rw-33`, t2d3)
- `dual-passage-analysis` (`rw-37`, t3d3)
- `statistical-claim-evaluation` (`rw-42`, t3d3)
- `information-and-ideas-integration` (`rw-43`, t3d3)
- `cross-disciplinary-evidence-use` (`rw-47`, t3d3)

#### Craft & Structure (14)

- `authors-purpose-and-intent` (`rw-02`, t1d1)
- `text-organization-patterns` (`rw-03`, t1d1)
- `vocabulary-in-context` (`rw-04`, t1d1)
- `word-choice-and-connotation` (`rw-06`, t1d1)
- `rhetorical-appeals` (`rw-16`, t2d2)
- `tone-and-point-of-view` (`rw-17`, t2d2)
- `evaluating-argument-strength` (`rw-19`, t2d2)
- `authorial-perspective-and-bias` (`rw-24`, t2d2)
- `advanced-argumentation-analysis` (`rw-36`, t3d3)
- `literary-authorial-purpose` (`rw-38`, t3d3)
- `nuanced-vocabulary-in-context` (`rw-40`, t3d3)
- `precise-word-choice-in-context` (`rw-45`, t3d3)
- `structural-analysis-of-texts` (`rw-46`, t3d3)
- `logical-structure-of-arguments` (`rw-48`, t3d3)

#### Expression of Ideas (6)

- `transitional-words-and-phrases` (`rw-20`, t2d2)
- `redundancy-and-conciseness` (`rw-25`, t2d2)
- `sentence-variety-and-combining` (`rw-26`, t2d2)
- `multi-paragraph-structure` (`rw-34`, t2d3)
- `rhetorical-synthesis` (`rw-35`, t3d3)
- `advanced-transitions-and-cohesion` (`rw-41`, t3d3)

#### Standard English Conventions (14)

- `subject-verb-agreement` (`rw-50`, t1d2)
- `verb-tense` (`rw-51`, t1d2)
- `pronouns-and-nouns` (`rw-52`, t1d2)
- `apostrophes-plural-vs-possessive` (`rw-53`, t1d2)
- `periods-and-semicolons` (`rw-54`, t1d2)
- `comma-fanboys` (`rw-55`, t1d2)
- `commas-and-dependent-clauses` (`rw-56`, t1d2)
- `non-essential-information` (`rw-57`, t1d2)
- `commas-with-names-and-titles` (`rw-58`, t1d2)
- `additional-comma-uses-and-misuses` (`rw-59`, t1d2)
- `colons-and-dashes` (`rw-60`, t1d2)
- `parallel-structure-and-word-pairs` (`rw-61`, t1d2)
- `question-marks` (`rw-62`, t1d2)
- `modifier-placement` (`rw-28`, t2d2)

> **Drift inventory for the taxonomy:**
> 1. `taxonomy.ts` (canonical) — imports curriculum nodes at module load
> 2. `extract-with-gemini.mjs` (hardcoded 89-element array) — used for post-validation only
> 3. `KarmanGPT.txt` §6 (system prompt list) — what the LLM sees
> 4. DB CHECK constraint (89-value enum, NOT VALID) — what Postgres enforces
> 5. Per-domain catalog passed into Pass 8 grader prompt (built from curriculum at runtime)
>
> A `scripts/sync-taxonomy.ts` exists in spirit (referenced in
> KarmanGPT.txt as the regen hook for the autogen block) but human
> discipline is the only enforcement.


---

## 13. Deterministic audit rules

`src/lib/question-bank/audit-rules.ts` is the importable, server-safe
subset of the deterministic checks. The full ~30 codes live in
`scripts/question-audit/audit-csv.mjs`. The rules below are the ones
that directly catch the math / OCR / structural issues the redesign
discussion needs to know about.

### The auditable row shape

```typescript
export interface AuditableRow {
  question_text: string | null;
  correct_answer: string | null;
  answer_format: string | null; // 'multiple_choice' | 'numeric_entry'
  difficulty_level: number | null;
  hint: string | null;
  explanation_text: string | null;
  explanation_per_choice: Record<string, string> | null;
  passage: string | null;
  passage_intro: string | null;
  passage_a: string | null;
  passage_b: string | null;
  domain: string | null;
  concept_slug: string | null;
  image_url: string | null;
  image_alt: string | null;
  numeric_tolerance: number | null;
  choices: { letter: string; choice_text: string; is_correct: boolean }[];
}

export type Severity = "BLOCKING" | "WARNING" | "NOTICE";

export interface RuleFinding {
  code: string;
  severity: Severity;
  category: "schema" | "formatting" | "cross_field" | "quality" | "ocr_pattern";
  message: string;
  value?: string | null;
}
```

### The math-region extractor (shared)

```typescript
function extractMathRegions(s: string) {
  const out: { content: string }[] = [];
  let i = 0;
  while (i < s.length) {
    const start = s.indexOf("$", i);
    if (start === -1) break;
    const isDisplay = s[start + 1] === "$";
    const openLen = isDisplay ? 2 : 1;
    const closeNeedle = isDisplay ? "$$" : "$";
    const end = s.indexOf(closeNeedle, start + openLen);
    if (end === -1) break;
    out.push({ content: s.substring(start + openLen, end) });
    i = end + closeNeedle.length;
  }
  return out;
}
```

### Rule B1 — unbalanced `$` delimiters (BLOCKING)

```typescript
// Balanced $ delimiters
const inlineDollars = (v.match(/(^|[^\\])\$/g) || []).length;
if (inlineDollars % 2 !== 0) {
  push({
    code: "B1_unbalanced_dollar",
    severity: "BLOCKING",
    category: "formatting",
    message: `${name}: odd number of $ delimiters`,
    value: v.slice(0, 80),
  });
}
```

Catches `"$x^2 = 4` with a missing closing `$`.

### Rule B5 — unbalanced `{ }` braces (BLOCKING)

```typescript
// Balanced braces — stack-balanced scan
let depth = 0;
let braceFail = false;
for (const c of v) {
  if (c === "{") depth++;
  else if (c === "}") {
    if (depth === 0) { braceFail = true; break; }
    depth--;
  }
}
if (braceFail || depth !== 0) {
  push({
    code: "B5_unbalanced_braces",
    severity: "BLOCKING",
    category: "formatting",
    message: `${name}: unbalanced { } braces`,
    value: v.slice(0, 80),
  });
}
```

Catches `\frac{1}` (missing `}`), `\sqrt{x}}` (extra closing).

### Rule F1 — bare letter+digit inside `$…$` (likely missing exponent) — WARNING

```typescript
// F1: bare letter+digit inside $...$ — likely missing exponent
const mathRegions = extractMathRegions(v);
let f1Hit = false;
for (const region of mathRegions) {
  // Match a letter followed by a digit 2-9, NOT preceded by ^, _, digit, or \
  const re = /(?<![\^_0-9\\])([a-zA-Z])([2-9])(?![0-9])/g;
  if (re.test(region.content)) {
    f1Hit = true;
    break;
  }
}
if (f1Hit) {
  push({
    code: "F1_bare_digit_after_letter",
    severity: "WARNING",
    category: "ocr_pattern",
    message: `${name}: math expression has bare letter+digit (likely missing exponent)`,
    value: v.slice(0, 80),
  });
}
```

Catches `$x2 + 5$` (should be `$x^2 + 5$`). Detection only — no repair.

### Rule F5 — question_text ending mid-sentence (WARNING)

```typescript
// F5: question_text ending mid-sentence
if (name === "question_text") {
  const trimmed = v.trim();
  if (trimmed.length > 20) {
    const lastChar = trimmed.slice(-1);
    if (!".?:".includes(lastChar) && !"$})".includes(lastChar) && !/\d/.test(lastChar)) {
      push({
        code: "F5_no_terminal_punct",
        severity: "WARNING",
        category: "ocr_pattern",
        message: `${name}: ends mid-sentence without . ? :`,
        value: "..." + trimmed.slice(-60),
      });
    }
  }
}
```

### Rule F7 — Unicode replacement character (BLOCKING)

```typescript
if (/�/.test(v)) {
  push({
    code: "F7_replacement_char",
    severity: "BLOCKING",
    category: "ocr_pattern",
    message: `${name}: contains U+FFFD replacement char (encoding error)`,
  });
}
```

### Cross-field rules

```typescript
// HAS_FIGURE_HINT_RE matches "the figure shown", "the table above",
// "based on the graph", etc.
const HAS_FIGURE_HINT_RE = new RegExp(
  [
    "\\bshown\\s+(above|below|here|in\\s+the)\\b",
    "\\bthe\\s+(figure|scatterplot|scatter\\s*plot|histogram|box\\s*plot|diagram)\\b",
    "\\bthe\\s+(table|chart|graph|bar\\s+graph|line\\s+graph)\\s+(shown|above|below|here|preceding)\\b",
    "\\bcoordinate[\\s-]+plane\\s+(figure|graph)\\b",
  ].join("|"), "i"
);

// C1 — figure implied but missing
if (row.question_text && HAS_FIGURE_HINT_RE.test(row.question_text) && !row.image_url) {
  push({
    code: "C1_figure_missing",
    severity: "BLOCKING",
    category: "cross_field",
    message: "question text references a figure but image_url is empty",
    value: row.question_text.slice(0, 100),
  });
}

// C2 — image_alt sounds like UI noise (rejects "Mark for Review",
// "answer input field", etc.)
const REJECT_ALT_SUBSTRINGS = [
  "answer box", "answer input", "input field", "input box",
  "empty rectangle", "blank box", "empty input",
  "mark for review", "examples", "acceptable ways",
  "directions", "instructions", "reference sheet", "formula sheet",
];
if (row.image_alt) {
  const altLow = row.image_alt.toLowerCase();
  const hit = REJECT_ALT_SUBSTRINGS.find((s) => altLow.includes(s));
  if (hit) {
    push({
      code: "C2_alt_ui_noise",
      severity: "WARNING",
      category: "cross_field",
      message: `image_alt mentions UI/instruction phrase '${hit}'`,
      value: row.image_alt,
    });
  }
}

// C4 — cross-text passages must come in pairs
if ((row.passage_a && !row.passage_b) || (row.passage_b && !row.passage_a)) {
  push({
    code: "C4_lone_passage_ab",
    severity: "BLOCKING",
    category: "cross_field",
    message: "passage_a/passage_b must both be set or both empty",
  });
}

// C6 — duplicate choice text
const dup = new Set<string>();
for (const t of choiceTexts) {
  if (t && dup.has(t.toLowerCase())) {
    push({
      code: "C6_duplicate_choices",
      severity: "BLOCKING",
      category: "cross_field",
      message: "two or more MC choices have identical text",
    });
    break;
  }
  if (t) dup.add(t.toLowerCase());
}

// C6b — the correct-letter has empty choice text
const target = row.choices.find((c) => c.letter === row.correct_answer);
if (target && !target.choice_text.trim()) {
  push({
    code: "C6b_correct_letter_empty",
    severity: "BLOCKING",
    category: "cross_field",
    message: `correct_answer=${row.correct_answer} but that choice is empty`,
  });
}
```

### Schema rules

```typescript
if (!row.question_text) push({ code: "A2_empty_question_text", severity: "BLOCKING", category: "schema", message: "question_text is empty" });
if (!row.correct_answer) push({ code: "A3_empty_correct_answer", severity: "BLOCKING", category: "schema", message: "correct_answer is empty" });
if (row.difficulty_level == null || row.difficulty_level < 1 || row.difficulty_level > 7) {
  push({ code: "A7_bad_difficulty", severity: "BLOCKING", category: "schema",
         message: "difficulty_level must be 1-7", value: String(row.difficulty_level) });
}
if (row.concept_slug && !isValidSlug(row.concept_slug)) {
  push({ code: "A9_bad_concept_slug", severity: "BLOCKING", category: "schema",
         message: "concept_slug not in canonical 89", value: row.concept_slug });
}
if (isMc) {
  if (!/^[A-D]$/.test(row.correct_answer ?? "")) {
    push({ code: "A15_mc_bad_letter", severity: "BLOCKING", category: "schema",
           message: "MC correct_answer must be A|B|C|D", value: row.correct_answer ?? "" });
  }
  const choiceTexts = row.choices.map((c) => c.choice_text.trim());
  if (choiceTexts.some((t) => !t)) {
    push({ code: "A17_mc_missing_choice", severity: "BLOCKING", category: "schema",
           message: "MC row missing one or more choice texts" });
  }
} else if (isSpr) {
  if (row.choices.some((c) => c.choice_text.trim() !== "")) {
    push({ code: "A18_spr_has_choice", severity: "WARNING", category: "schema",
           message: "SPR row has non-empty choice text" });
  }
}
```

### Quality heuristics

```typescript
if (!row.explanation_text) {
  push({ code: "D0_no_explanation", severity: "BLOCKING", category: "quality",
         message: "explanation_text is empty" });
} else if (row.explanation_text.length < 30) {
  push({ code: "D1_short_explanation", severity: "NOTICE", category: "quality",
         message: `explanation_text only ${row.explanation_text.length} chars` });
}
if (isMc) {
  const epc = row.explanation_per_choice ?? {};
  const peCount = ["A", "B", "C", "D"].filter((l) => (epc[l] ?? "").trim()).length;
  if (peCount === 0) {
    push({ code: "D6_no_per_choice_expl", severity: "NOTICE", category: "quality",
           message: "MC row has 0 per-choice explanations" });
  } else if (peCount < 4) {
    push({ code: "D7_partial_per_choice_expl", severity: "NOTICE", category: "quality",
           message: `MC row has ${peCount}/4 per-choice explanations` });
  }
}
```

### Additional F-codes in the full CLI auditor (not in audit-rules.ts)

- **F2** — `sqrt(...)` outside math mode (should be `\sqrt{...}`)
- **F3** — Unicode math symbols mixed with LaTeX command equivalents (e.g. `π` + `\pi`)
- **F4** — plain `N/M` outside math mode (likely should be `\frac{N}{M}`)
- **F6** — question contains `___` or `[BLANK]` — verify the blank pattern

---

## 14. Renderer expectations

### `MathText` — the KaTeX renderer

```typescript
function parse(text: string): Seg[] {
  // Extract $$…$$ first (greedy block), then remaining $…$ inline.
  //
  // Both regexes accept `\$` (escaped dollar) inside the math span
  // — that's how KaTeX writes a literal currency symbol, and the
  // old `[^\$]` class was rejecting it, which truncated every
  // expression containing money (e.g. `$\$80$ is on sale for $25\%$ off`).

  // Block pass — greedy [\s\S]
  while (true) {
    const m = rest.match(/\$\$((?:\\\$|[^$])+?)\$\$/);
    if (!m) break;
    // ... push block
  }
  // Inline pass — same fix for `\$`.
  while (true) {
    const m = remaining.match(/\$((?:\\\$|[^$\n])+?)\$/);
    if (!m) break;
    // ... push inline
  }
}

function renderKaTeX(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
      output: "htmlAndMathml",
    });
  } catch {
    return displayMode ? `<pre>${latex}</pre>` : latex;
  }
}
```

`throwOnError: false` means bad LaTeX renders with a red-tinted error
span instead of throwing. Truly catastrophic falls back to the raw
string.

### Fill-in-the-blank markers

```typescript
// Patterns for fill-in-the-blank markers:
//   Underscores-only:  `__`, `_____`           (universal — always replaced)
//   Word "blank":      `blank`, `_blank_`,
//                      `-blank-`, `__blank__`  (passage-only — opt-in via treatBlankWord)
const UNDERSCORE_PATTERN = /_{2,}/g;
const BLANK_OR_UNDERSCORE_PATTERN = /_{2,}|(?<!\w)[_-]*blank[_-]*(?!\w)/gi;

// Each marker → one continuous underline span:
//   <span style="display:inline-block; width:4em;
//                borderBottom:0.12em solid currentColor;
//                verticalAlign:baseline; margin:0 0.2em;" />
```

### `ChartFigure` JSON shape — `src/types/chart.ts`

```typescript
export type ChartKind = "scatterplot" | "line_graph" | "bar_chart" | "function_plot";

export interface ChartAxis {
  label: string;          // empty when unlabeled
  min: number | null;
  max: number | null;
  tick_step: number | null;
  categories: string[] | null;  // bar_chart only; mutually exclusive w/ min/max
}

export type ChartSeries = ScatterSeries | LineSeries | BarSeries | FunctionSeries;
// FunctionSeries.expression:
//   | { kind: "linear"; m: number; b: number }              // y = m·x + b
//   | { kind: "quadratic"; a: number; b: number; c: number } // y = a·x² + b·x + c
//   | { kind: "absolute_value"; a: number; h: number; k: number }  // y = a·|x − h| + k
//   | { kind: "exponential"; a: number; b: number }         // y = a · b^x

export interface ChartFigure {
  kind: ChartKind;
  title: string | null;
  x_axis: ChartAxis;
  y_axis: ChartAxis;
  show_grid: boolean;
  series: ChartSeries[];
  confidence: number;            // 0.0 — 1.0
  extracted_by: string;          // e.g. "gemini-2.5-pro@2026-05-19"
  extracted_at: string;
  extractor_note: string | null;
}

// Subject → series color for single-series figures
export const SUBJECT_CHART_COLOR: Record<string, string> = {
  math: "#2fa8ff",
  reading: "#d84f73",
};

// 5-color sequential palette for multi-series
export const SEQUENTIAL_PALETTE = [
  "#2fa8ff", // math blue
  "#d84f73", // R&W rose
  "#e4c86a", // accent gold
  "#42d9ff", // math glow (lighter blue)
  "#f06a8c", // rose glow (lighter rose)
] as const;
```

`ChartFigure.tsx` renders a 600×400 viewBox SVG with `PAD = { top:
28, right: 24, bottom: 56, left: 64 }`. Pure component — no state, no
interactivity.

### `QuestionTable` JSON shape

```typescript
export interface QuestionTableData {
  caption?: string | null;
  header_row?: string[] | null;
  rows: string[][];
  footer_note?: string | null;
}
```

Rendered as native HTML `<table>` with Karman observatory tokens (warm
dark canvas + bronze rules + ivory text). Cell values pass through
`MathText` so inline `$...$` renders.

> **Drift:** Renderer falls back to `image_url` (the raster crop)
> whenever `figure_kind != 'table'` (or `'chart'`) OR the corresponding
> data column is null. So a chart with confidence < 0.8 still renders
> as the raster screenshot, not the SVG.

---

## 15. CI workflows

### `process-pdf.yml` — main pipeline trigger

```yaml
# ============================================================
# process-pdf — runs the full PDF ingestion pipeline against
# a single PDF queued in pdf_processing_jobs.
#
# TRIGGERS
#   repository_dispatch (event_type: process-pdf)
#     Fired by the Cloudflare Worker when a user uploads a PDF.
#   workflow_dispatch (manual)
#     Lets you trigger from the GitHub UI for testing.
# ============================================================

name: Process PDF

on:
  repository_dispatch:
    types: [process-pdf]
  workflow_dispatch:
    inputs:
      job_id:
        description: "pdf_processing_jobs.id (UUID) to process"
        required: true
        type: string

permissions:
  contents: read

jobs:
  process:
    runs-on: ubuntu-latest
    # 60 was too tight — run #26324439132 was cancelled at the
    # 60-minute Actions timeout while grader was at 85/654.
    # 6 hours of headroom is plenty even for a full re-grade.
    timeout-minutes: 360

    env:
      JOB_ID: ${{ github.event.inputs.job_id || github.event.client_payload.job_id }}
      GITHUB_RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
      GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
      R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
      R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
      R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
      R2_BUCKET_NAME: ${{ secrets.R2_BUCKET_NAME }}
      R2_PUBLIC_URL: ${{ secrets.R2_PUBLIC_URL }}

    steps:
      - name: Validate JOB_ID
        run: |
          if [ -z "$JOB_ID" ]; then
            echo "::error::JOB_ID is empty. Was the dispatch payload missing client_payload.job_id?"
            exit 1
          fi

      - name: Checkout
        uses: actions/checkout@v5

      - name: Install Poppler (for pdftoppm page rendering)
        run: |
          sudo apt-get update
          sudo apt-get install -y poppler-utils
          pdftoppm -v 2>&1 | head -2

      - name: Setup Node 22
        uses: actions/setup-node@v6
        with:
          node-version: "22"
          cache: "npm"

      - name: Pin npm to v11 (match local dev)
        run: npm install -g npm@11

      - name: Install dependencies
        run: npm ci

      - name: Run pipeline
        run: node scripts/pdf-pipeline/orchestrate.mjs --from-r2

      - name: Upload debug artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v5
        with:
          name: pipeline-debug-${{ github.run_id }}
          path: |
            ./gemini-raw-error.txt
            /tmp/*-gemini-extracted.json
            /tmp/*-figures-log.json
            /tmp/*-import.csv
          retention-days: 14
          if-no-files-found: ignore

      - name: Mark job failed (backstop)
        # If the orchestrator crashed before it could write a
        # failure status, this ensures the job row doesn't get
        # stuck in "running" forever.
        if: failure()
        run: |
          curl -X PATCH "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/pdf_processing_jobs?id=eq.$JOB_ID" \
            -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
            -H "authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
            -H "content-type: application/json" \
            -H "prefer: return=minimal" \
            -d "{\"status\":\"failed\",\"error_message\":\"Workflow crashed before orchestrator could record failure. See run logs: $GITHUB_RUN_URL\",\"completed_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
```

### `grade-only.yml` — re-grade without re-extracting

```yaml
# ============================================================
# grade-only — runs ONLY the multi-vote answer-key grader against
# the live database. No PDF extraction, no fill, no R2 reads.
# Use this when:
#   · A prior process-pdf run got cancelled mid-grading.
#   · You want to re-grade the bank without re-running the whole pipeline.
# ============================================================

name: Grade only

on:
  workflow_dispatch:
    inputs:
      limit:
        description: "Max questions to grade in this run (default: all)"
        required: false
        type: string
      answer_source:
        description: "Filter to one answer_source (e.g. 'inferred')"
        required: false
        type: string
      import_status:
        description: "Filter to one import_status (e.g. 'needs_review')"
        required: false
        type: string
      source_pdf:
        description: "Filter to questions from a single PDF"
        required: false
        type: string

jobs:
  grade:
    runs-on: ubuntu-latest
    timeout-minutes: 360
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
      GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
      GRADE_LIMIT: ${{ github.event.inputs.limit }}
      FILTER_ANSWER_SOURCE: ${{ github.event.inputs.answer_source }}
      FILTER_IMPORT_STATUS: ${{ github.event.inputs.import_status }}
      FILTER_SOURCE_PDF: ${{ github.event.inputs.source_pdf }}

    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with: { node-version: "22", cache: "npm" }
      - run: npm install -g npm@11
      - run: npm ci
      - name: Run grader
        run: |
          if [ -n "$GRADE_LIMIT" ]; then
            LIMIT="$GRADE_LIMIT" node scripts/question-audit/multi-vote-grader.mjs --from-db
          else
            node scripts/question-audit/multi-vote-grader.mjs --from-db
          fi
```

### `audit-nightly.yml` — deterministic auditor + ingest

```yaml
# ============================================================
# Audit nightly — deterministic auditor + ingest, no LLM.
# Runs every night at 09:00 UTC against question_findings.
# Catches regressions in the curriculum without requiring an admin
# to remember to trigger a manual audit.
#
# What it does NOT do
#   · No LLM grader — that costs money / hits free-tier limits.
#   · No alerting — that's a separate workflow (audit-alert.yml).
# ============================================================

name: Audit (nightly)

on:
  schedule:
    - cron: "0 9 * * *"   # 09:00 UTC = 01:00 PT (DST) / 02:00 PT (standard)
  pull_request:
    paths:
      - "src/data/curriculum/**"
      - "scripts/question-audit/**"
      - "src/lib/question-bank/**"
  workflow_dispatch:

concurrency:
  group: audit-nightly-${{ github.ref }}
  cancel-in-progress: true

jobs:
  audit:
    name: Run audit + ingest
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm install --no-audit --no-fund

      - name: Run deterministic auditor (--from-db)
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          mkdir -p audit-out
          node scripts/question-audit/audit-csv.mjs --from-db

      - name: Ingest auditor findings
        # PR-trigger runs in dry-run mode so we don't write to prod
        # from preview branches.
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            node scripts/question-audit/ingest-findings.mjs --only=auditor --dry-run
          else
            node scripts/question-audit/ingest-findings.mjs --only=auditor
          fi

      - name: Upload audit-report artifact
        uses: actions/upload-artifact@v4
        with:
          name: audit-report-${{ github.run_id }}
          path: |
            audit-out/audit-report.json
            audit-out/audit-report.md
            audit-out/unmatched-findings.json
          retention-days: 30
          if-no-files-found: warn
```

### `audit-alert.yml` — daily threshold email

```yaml
# ============================================================
# Audit alert — daily threshold check + Resend email.
# Runs every morning at 13:00 UTC (06:00 PT), AFTER the nightly
# audit ingest has finished updating question_findings.
#
# Trigger thresholds (escalation ladder)
#   · blocking_open >= 5    → urgent email (subject: "🚨 …")
#   · blocking_open >= 1    → daily digest
#   · 0 blocking + new_24h findings → quiet digest
#   · totally clean         → no email (silence is success)
# ============================================================

name: Audit alert

on:
  schedule:
    - cron: "0 13 * * *"
  workflow_dispatch:

concurrency:
  group: audit-alert-${{ github.ref }}
  cancel-in-progress: false

jobs:
  alert:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm install --no-audit --no-fund

      - name: Snapshot quality state
        id: snapshot
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          node scripts/question-audit/audit-summary.mjs --json > /tmp/summary.json
          BLOCKING=$(jq -r '.totals.blocking_open' /tmp/summary.json)
          OPEN=$(jq -r '.totals.open' /tmp/summary.json)
          AFFECTED=$(jq -r '.totals.questions_affected' /tmp/summary.json)
          TOTAL=$(jq -r '.totals.questions_total' /tmp/summary.json)
          echo "blocking=$BLOCKING" >> $GITHUB_OUTPUT
          echo "open=$OPEN" >> $GITHUB_OUTPUT
          echo "affected=$AFFECTED" >> $GITHUB_OUTPUT
          echo "total=$TOTAL" >> $GITHUB_OUTPUT

      - name: Decide whether to alert
        id: decide
        run: |
          BLOCKING=${{ steps.snapshot.outputs.blocking }}
          OPEN=${{ steps.snapshot.outputs.open }}
          if [ "$BLOCKING" -ge 5 ]; then
            echo "tier=urgent" >> $GITHUB_OUTPUT
            echo "subject=🚨 Karman audit: $BLOCKING blocking findings open" >> $GITHUB_OUTPUT
          elif [ "$BLOCKING" -ge 1 ]; then
            echo "tier=digest" >> $GITHUB_OUTPUT
            echo "subject=Karman audit: $BLOCKING blocking · $OPEN open total" >> $GITHUB_OUTPUT
          elif [ "$OPEN" -gt 0 ]; then
            echo "tier=quiet" >> $GITHUB_OUTPUT
            echo "subject=Karman audit: $OPEN findings open (all NOTICE/WARNING)" >> $GITHUB_OUTPUT
          else
            echo "tier=silent" >> $GITHUB_OUTPUT
            echo "subject=" >> $GITHUB_OUTPUT
          fi

      - name: Send email via Resend
        if: steps.decide.outputs.tier != 'silent'
        env:
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          RESEND_FROM_EMAIL: ${{ secrets.RESEND_FROM_EMAIL }}
          ADMIN_EMAIL: ${{ secrets.AUDIT_ALERT_RECIPIENT }}
          SUBJECT: ${{ steps.decide.outputs.subject }}
        run: |
          # [Build body, send via curl to Resend API]
```

---

## 16. Known failure modes (live + recently fixed)

### Recently fixed (commits visible in `main`)

- **`image_url` silently dropped during DB import** (`6866ed1`, #162).
  The `insertPayload` in `import-csv-direct.mjs` literally didn't
  include `image_url` or `image_alt`. Every figure cropped + uploaded
  to R2 was orphaned. 0/654 rows in the bank had a URL despite
  hundreds existing in R2. Backfilled via
  `scripts/maintenance/backfill-figure-urls.mjs`.

- **Prod hydration crash from `toLocaleString`** (#160). The
  grader-votes badge had `title={`graded ${new Date(votes.graded_at).toLocaleString()}`}`.
  Cloudflare Worker (UTC) vs browser (PT) produced different strings →
  React hydration mismatch → every admin page errored.

- **R&W question_text duplicating the passage** (#157). Extractor was
  putting passage prose into `question_text`. Fix had two parts:
  prompt update (enumerate the 7 canonical stem starters) AND a
  backfill script (`scripts/maintenance/fix-rw-stem-passage-split.mjs`).
  Post-validation in `extract-with-gemini.mjs:459-472` now flags
  duplications.

- **Gemini returning a bare array instead of `{questions: [...]}`** (#152).
  100 KB of valid data was silently discarded because `result?.questions`
  was undefined. Fix accepts both shapes; added fast-fail with exit
  code 4 if 0 questions returned.

- **Gemini `RECITATION` filter on SAT prose** (#153). Switched
  extractor from Gemini Flash to Claude Sonnet 4.6. Filename kept as
  `extract-with-gemini.mjs`.

- **DeepSeek voter silently failing.** Em-dash in `X-Title` HTTP
  header threw "character > 255" on every OpenRouter call. Fixed in
  `llm-providers.mjs:425-431` — ASCII-only headers.

- **Gemini `maxTokens=32_000` truncating Sonnet's structured output
  mid-stream** (#154). Bumped to 64K.

- **Hidden Llama voter failures.** Errors on Pass 1 voters were
  swallowed silently — `ok=false` with no detail.
  `multi-vote-grader.mjs:410-417` now includes `error` text in the
  persisted verdict.

- **GitHub Actions HTTP timeout.** `undici` default 5-minute
  `headersTimeout` tore down long Gemini calls. Fixed in
  `llm-providers.mjs:36-45` with a 15-minute ceiling. Triggering
  bug: Actions run #26315666375.

- **60-minute Actions cap.** Grader was at 85/654 when the job got
  cancelled at 60 min. `process-pdf.yml` now sets `timeout-minutes: 360`.

### Known live failure modes

- **Diagnostic test isn't connected to the question bank** (CRIT-1).
  Hand-typed 35 questions in `src/data/diagnostic-questions.ts`.
  Submit endpoint trusts the browser to say whether each answer was
  correct (CRIT-5).

- **Slug+node typeahead pain in Review UI** (bug #1). 89-node list
  manually picked for every accept; auto-pick from slug not done.

- **Per-choice explanations + hint + desmos hidden from Review UI**
  (bugs #5 + #6). DB has the data; the Review tab only renders
  `explanation_text`.

- **Paste-from-Finder doesn't work** (bug #7). Browser security;
  drag-drop dropzone is the fix.

- **Web upload PDF → 4-module fan-out architecture** (bug #3).
  Originally aspirational; the current Sonnet-with-document path
  handles 80–98-question PDFs in one inference, so the
  multi-Claude-session design didn't ship. `pdf_processing_jobs.module_status`
  still defaults to a 5-key shape.

- **Cross-text questions can hash-collide** (CRIT-4). `content_hash`
  doesn't include passages. CSV emitter still doesn't (per
  `json-to-import-csv.mjs:102-120`). Documented as "forward-only
  fix" but the script wasn't updated.

- **`fetchAllQuestionsForAdmin` doesn't filter `import_status`**
  (CRIT-2). The `is_live` generated column + `quiz_questions_live`
  view mitigate this — student-facing code should read the view;
  admin code reads the table. Still relies on convention.

- **Multi-source taxonomy drift** (CRIT-3). 89 slugs canonical in
  `taxonomy.ts`; older drafts of the docs said 72; some tests still
  reference legacy slugs.

- **Whole-page figure fallback overused.** `extract-figures.mjs:289-297`
  — if Gemini bbox confidence is `low` or invalid, the whole rendered
  page becomes the figure. On figure-dense pages, this happens a lot.

- **Image-bearing rows auto-flagged for review** (`bulk-import.ts:204-218`).
  Every image row lands `needs_review` for a human visual sanity
  check, regardless of figure quality. Creates a constant review
  backlog.

- **`SKIP_STAGE3` shortcut in the deprecated path.** `pull-pdf-job.mjs`
  honors `SKIP_STAGE3=true` to skip figure extraction. The new path
  has no equivalent flag.

- **Two parallel import code paths.** See §17.

- **Two parallel grader systems.** See §17.

- **Llama as silent fallback.** When Gemini Flash refuses or
  parse-fails, Llama via Groq fills in. The grader keeps a
  `pass1_solver` field so this is visible, but rows graded by Llama
  may have different quality characteristics — no per-solver agreement
  floor.

- **`hint` field never filled.** CSV header + DB column exist;
  KarmanGPT.txt §10 says generate it. No script does.

- **Math notation not repaired anywhere.** Audit rule F1 + grader
  Pass 7 detect "x2" vs "x²" patterns. Neither auto-fixes. Bad math
  in the stem survives to the renderer.

- **No server-side KaTeX validation.** A bad `\frac{1}{` lands in
  `explanation_text` and is only caught when the next audit run hits
  rule B5. The renderer's `throwOnError: false` swallows the rest.

### Inline `console.warn` / `console.error` patterns

A scan of the pipeline scripts surfaces:

- `pdftoppm` failure on a page → throws (`extract-figures.mjs:118-122`); the row's figure is errored.
- DB write failure on a per-row UPDATE → counts as `errors++` and continues (every `generate-*.mjs`).
- `[progress] failed to update job` → warned but never aborts (`pull-pdf-job.mjs:299-301`). "Progress is purely a UI signal, not a correctness requirement."
- `[gemini-diag]` / `[claude-diag]` lines on every call. Useful but voluminous in CI logs.


---

## 17. The two-paths / two-graders / four-taxonomies drift map

This section is the redesign target index. Every drift is a place
where the same logic exists in two or more places and they can (and
do) disagree.

### Drift 1 — TWO import paths

```text
┌──────────────────────────┐    ┌──────────────────────────┐
│  orchestrator path        │    │  web admin upload path    │
│  scripts/pdf-pipeline/    │    │  src/lib/question-bank/   │
│  import-csv-direct.mjs    │    │  bulk-import.ts           │
├──────────────────────────┤    ├──────────────────────────┤
│ Inline RFC-4180 parser    │ vs │ src/lib/question-bank/    │
│  (~50 lines)              │    │  csv-parser.ts (not       │
│                           │    │  used by orchestrator)    │
├──────────────────────────┤    ├──────────────────────────┤
│ Regex-parse curriculum.ts │ vs │ Import taxonomy module    │
│ for slug→node map         │    │ (slugFromNodeId, etc.)    │
├──────────────────────────┤    ├──────────────────────────┤
│ Unknown slug → log,       │ vs │ Unknown slug → THROW      │
│ insert with node_id=null  │    │ "unknown concept_slug X"  │
├──────────────────────────┤    ├──────────────────────────┤
│ image_url base64 data URL │ vs │ materializeImage()        │
│ NOT supported             │    │ decodes + uploads + 2MB   │
│ (assumes URL already https)│    │ cap                       │
├──────────────────────────┤    ├──────────────────────────┤
│ No auto-flag for images   │ vs │ Auto-flag EVERY image     │
│                           │    │ row → needs_review        │
├──────────────────────────┤    ├──────────────────────────┤
│ Cluster: domain-derived   │ vs │ Cluster: slug-derived     │
│ only (CLUSTER_BY_DOMAIN)  │    │ first, then domain        │
├──────────────────────────┤    ├──────────────────────────┤
│ Difficulty: inline        │ vs │ Difficulty: imported      │
│ legacyDifficulty()        │    │ levelToLegacyDifficulty() │
└──────────────────────────┘    └──────────────────────────┘
         ▲                                ▲
         │                                │
         orchestrator path                /admin/questions/import
         (this is the active one          (still wired for the legacy
          for PDFs imported via the       ChatGPT base64-data-URL flow)
          web upload)
```

### Drift 2 — TWO grader systems

```text
┌────────────────────────────────────┐    ┌────────────────────────────────────┐
│  multi-vote-grader.mjs              │    │  llm-grader.mjs                     │
│  IN orchestrator (stage 6)          │    │  NOT in orchestrator                │
├────────────────────────────────────┤    ├────────────────────────────────────┤
│ ONE check: answer-key only          │ vs │ 8 PASSES: solve, figure coherence,  │
│                                     │    │  explanation consistency,           │
│                                     │    │  well-formedness, vision diff,      │
│                                     │    │  slug verification                  │
├────────────────────────────────────┤    ├────────────────────────────────────┤
│ Cascade: Flash+DeepSeek+Llama       │ vs │ Pass 1: Flash; Pass 2: Pro          │
│  → Pro → Opus                       │    │  No multi-voter, no Opus            │
├────────────────────────────────────┤    ├────────────────────────────────────┤
│ Writes: quiz_questions.grader_votes │ vs │ Writes: audit-out/grader-report     │
│  JSONB (latest verdict, overwrites) │    │  .json → question_findings table    │
│                                     │    │  via ingest-findings.mjs            │
├────────────────────────────────────┤    ├────────────────────────────────────┤
│ Read by: /admin/questions/review    │ vs │ Read by: /admin/questions/inspect   │
│  per-row badges                      │    │  findings panel                     │
├────────────────────────────────────┤    ├────────────────────────────────────┤
│ Active in: process-pdf.yml +        │ vs │ Active in: nightly via              │
│  grade-only.yml                     │    │  audit-alert.yml (older flow)       │
└────────────────────────────────────┘    └────────────────────────────────────┘
```

### Drift 3 — FOUR copies of the 89-slug taxonomy

```text
1. src/lib/question-bank/taxonomy.ts (CANONICAL)
   → imports curriculum/{math,reading-writing}.ts as the source

2. scripts/pdf-pipeline/extract-with-gemini.mjs:80-178
   → hardcoded 89-element array for post-validation
   → checks `if (CONCEPT_SLUGS.length !== 89) throw`

3. question-imports/chatgpt/KarmanGPT.txt §6
   → enumerated by domain in the LLM system prompt
   → "AUTOGEN-BEGIN/END" marker, supposedly regen-able via
     `npm run sync:taxonomy` — but discipline is the enforcement

4. supabase/migrations/20260518003000_concept_slug_check.sql
   → 89-value Postgres CHECK enum, NOT VALID (legacy rows exempt)

(Plus a runtime-derived 5th copy for grader Pass 8 — built from
 curriculum.ts at runtime, so it follows #1.)
```

### Drift 4 — Subject is derived from domain in TWO different places

```text
import-csv-direct.mjs:202        bulk-import.ts:228
const subject = READING_DOMAINS  rowSubject = subjectFromDomain(r.domain)
  .has(domain) ? "reading"        // → uses MATH_DOMAINS Set
  : "math";                       //   imported from taxonomy
```

Same outcome (4 reading domains, 4 math domains), but maintained
separately. If you add a 9th domain, both need to update.

### Drift 5 — Difficulty mapping in TWO places

```javascript
// import-csv-direct.mjs:154-161
function legacyDifficulty(level) {
  const n = parseInt(level, 10);
  if (n <= 2) return "foundational";
  if (n <= 4) return "intermediate";
  if (n <= 6) return "advanced";
  return "mastery";
}

// src/types/quiz.ts (referenced by bulk-import.ts)
levelToLegacyDifficulty(level)
// Implementation in src/types/quiz.ts — has to match the orchestrator's
// inline version. No shared module.
```

### Drift 6 — `figure_kind` lifecycle is THREE backfills

- Stage 2 in pipeline writes `image_url` + `image_alt`, no `figure_kind`
- `extract-table-data.mjs` (manual backfill) sets `figure_kind='table'` if table detected, else `figure_kind='image'`
- `extract-chart-data.mjs` (manual backfill) sets `figure_kind='chart'` if confidence ≥ 0.8, else leaves as 'image'

A row's `figure_kind` is only correct after both backfills run, in
sequence. Neither runs automatically.

### Drift 7 — Docs say 30-col CSV, code emits 32

```text
docs/ingestion/spec.md §2: "30 columns"
question-imports/chatgpt/KarmanGPT.txt §5: "exactly 32 columns"
scripts/pdf-pipeline/json-to-import-csv.mjs CSV_HEADERS: 32 entries
src/components/admin/BulkImportPanel.tsx CSV_HEADERS: 32 entries
```

The importer accepts both because it looks up by column name. But docs
read as if 30 is the spec.

### Drift 8 — `module_status` JSONB shape

```sql
DEFAULT '{"key":"pending","m1":"pending","m2":"pending","m3":"pending","m4":"pending"}'::jsonb
```

This 5-key shape was for the deprecated multi-Claude-session fan-out
architecture (one Claude session per module + one for the answer key).
The current pipeline doesn't use these keys at all — it just writes
`progress.stage='done'`. Every new job row gets the legacy shape as a
default.

### Drift 9 — `image_url` is sometimes https, sometimes base64

The DB column accepts both. `bulk-import.ts:materializeImage()` checks
the prefix:

- `https://...` → keep as-is
- `data:image/...;base64,...` → decode, upload to R2, write public URL back

The orchestrator path NEVER produces base64 (it uploads inline during
figure extraction). The legacy ChatGPT path always produced base64.
Both data shapes coexist in the DB.

---

## 18. Cost and wall-time per PDF

### Wall time

| Stage | Documented weight | Real observed |
| --- | --- | --- |
| extracting (Sonnet) | ~35 s (8%) | 5–8 min on a 90-page PDF (Sonnet + 64K output tokens) |
| figures (bbox + crop + R2) | ~45 s (12%) | ~30 figures × ~2 s |
| csv | ~1 s (1%) | <1 s |
| importing | ~5 s (4%) | ~5–10 s |
| filling (Sonnet + Sonnet + Haiku) | ~15 min (60%) | **~15–30 min if the whole bank backlog needs filling** |
| grading (multi-vote) | ~5 min (15%) | **~5–10 min per ~100 questions** |

Total budgeted ceiling: `timeout-minutes: 360` (6 hours). Typical
observed: **5–10 minutes per PDF** when the fill + grade stages aren't
clearing a giant backlog.

### Cost per PDF (~98 questions) — author-supplied estimates

| Stage | Documented cost | Source |
| --- | --- | --- |
| extract (Sonnet 4.6) | "~$0.03 per PDF" (was Flash); Sonnet ~5–10× pricier → **estimated $0.15–$0.30/PDF** | `extract-with-gemini.mjs:27-29` |
| figures (Gemini Flash bbox) | "~$0.001 per figure" → ~$0.03 for 30 figures | `extract-figures.mjs:33-35` |
| import | DB writes only, no LLM | — |
| explanation_text (Sonnet) | "~$0.02/question" (longer math) → ~$1.50/PDF | `generate-explanation-text.mjs:27-29` |
| per-choice (Sonnet) | "~$0.013/question" → ~$0.60/PDF | `generate-per-choice-explanations.mjs:29-33` |
| desmos (Haiku) | "~$0.002/question" → ~$0.10/PDF | `generate-desmos-tips.mjs:27-29` |
| grader Pass 1 (Flash + DeepSeek + Llama) | "~$0.025/PDF" | `multi-vote-grader.mjs:48-53` |
| grader Pass 2 (Pro on ~5% disagree) | "~$0.013/PDF" | same |
| grader Pass 3 (Opus on ~1% double-dis) | "~$0.050/PDF" | same |
| **Total per PDF** | **"~$2.20–2.25/PDF" documented** | `fill-all.mjs:43`, ADR #4 |

**Adjusted estimate after the Sonnet switch:** **~$2.30–$2.50/PDF**.
Token usage IS logged per call (`[gemini-diag]` / `[claude-diag]`
stderr lines log `input_tokens` / `output_tokens`) but **no script
aggregates them into a cost summary per PDF**. To compute actual cost,
parse the diag lines from `audit-out/` or workflow logs.

### Cloudflare R2 cost

Negligible. `question-figures/<stem>/p<page>-<i>.png` images at ~140
KB each; bucket-level cost is sub-dollar even at 10,000 questions.

### GitHub Actions cost

Within free tier on standard `ubuntu-latest` runners (2000 free
minutes/month).

---

## 19. Open questions and redesign opportunities

This is the section ChatGPT should chew on. Each item is framed as a
question with the relevant context already inlined above.

### Q1 — Should the two import paths be unified?

Both `import-csv-direct.mjs` (orchestrator) and `bulk-import.ts` (web
admin) parse the same 32-column CSV and write the same `quiz_questions`
+ `answer_choices` shape. They diverge on:

- CSV parser (inline vs shared `csv-parser.ts`)
- Slug validation (warn vs throw)
- Image handling (https-only vs base64-decode+upload)
- Auto-flag logic (off vs every-image-flagged)
- Cluster derivation order

Direction to consider: collapse to one path that lives in
`src/lib/question-bank/bulk-import.ts`, expose a CLI entry that the
orchestrator can invoke (`node scripts/bin/bulk-import.mjs <csv>`),
delete `import-csv-direct.mjs`. The web admin path is the stricter,
more battle-tested one.

### Q2 — Should the two grader systems be unified, or kept separate by purpose?

Current state:

- `multi-vote-grader.mjs` writes `grader_votes` JSONB. Tight scope:
  answer-key only. 3-tier cascade. In the orchestrator.
- `llm-grader.mjs` writes `question_findings` rows. Broad scope: 8
  passes covering answer + figure + explanation + slug + vision diff.
  Not in the orchestrator.

Are these complementary (each covers what the other doesn't) or
redundant (the multi-vote could be a Pass 1 of the older grader)?

Subquestions:
- Should `multi-vote-grader.mjs` ALSO write `question_findings` rows
  (BLOCKING for `likely_wrong`) so the Inspector shows them?
- Should `llm-grader.mjs`'s Pass 1 be replaced by the multi-vote
  cascade?
- Should Pass 7 (vision diff) be promoted into the orchestrator? It
  catches OCR errors the deterministic auditor only heuristic-detects.
- Should Pass 8 (slug verification) be moved into the orchestrator?
  Right now it only runs nightly, so a freshly-imported PDF can sit
  with bad slugs for up to 24h.

### Q3 — Should the extractor and figure stage merge into one Claude call?

Today:

- Stage 1: Sonnet reads the PDF, emits structural rows with
  `has_figure: true | false` + `figure_alt: "<seed text>"`.
- Stage 2: Gemini Flash takes a rendered page and returns a bbox in
  Gemini's normalized 0–1000 space; sharp crops; R2 uploads.

The two-stage pipeline exists because Claude's tool-use response was
shaped around extraction structure, not figure coordinates. But:

- Could Sonnet emit bboxes directly in its first pass (it sees the PDF
  pages)?
- If not bboxes, could it emit a more structured `figure_alt` (e.g. a
  `ChartFigure` JSON for charts)?
- Could the figure stage use Claude's vision (which has no
  `RECITATION` filter) instead of Gemini's?

### Q4 — Is the 5-language multi-vote cascade the right shape?

Pass 1 = Gemini Flash + DeepSeek V3 + Llama 3.3 70B in parallel.
Pass 2 = Gemini 2.5 Pro. Pass 3 = Claude Opus 4.7.

Questions:

- Is the 3-voter Pass 1 actually independent enough? All three are
  general LLMs trained on similar internet corpora. Real "ensemble"
  value depends on uncorrelated errors.
- Should the cascade respect SUBJECT (math vs R&W) and route
  accordingly? Math benefits from a math-specialized model; R&W from
  passage-reasoning models.
- Should the cascade respect DIFFICULTY? Tier 1 questions probably
  don't need Opus.
- Should the cascade run vision too? Pure-text voting on figure-bearing
  questions is a known blind spot (the Pass 1 prompt strips the
  figure URL entirely).

### Q5 — The `content_hash` is broken for cross-text questions.

```javascript
// json-to-import-csv.mjs:102-120
const parts = row.question_format === "numeric_entry"
  ? [row.question_text || ""]
  : [row.question_text || "", row.choice_a || "", row.choice_b || "",
     row.choice_c || "", row.choice_d || ""];
```

Cross-text R&W questions share generic stems ("Which choice best
illustrates the central idea of both texts?") and matching choices.
Different Text 1 + Text 2 → same content_hash → unique index trips →
silent skip on import.

Fix: include `passage_a` + `passage_b` (or `passage`) in the hash
input. Forward-only; existing rows are immutable.

### Q6 — Should `hint` be filled?

The CSV header includes `hint`. The DB has a column. KarmanGPT.txt §10
defines what a good hint looks like. No script in `content-generation/`
targets it. Every pipeline-imported row has `hint=null`. Should
`fill-all.mjs` add a stage 1.5 that fills hints?

### Q7 — Math notation repair, not just detection.

Pipeline catches `x2` (rule F1) and "transcription_diffs: page shows
'x²' but extracted has 'x2'" (grader Pass 7) but never auto-fixes.

Options:
- A scripted post-extraction repair pass (Sonnet rewrites the stem
  with proper KaTeX).
- A grader Pass 9 that produces an auto-fix proposal alongside the
  finding, which `apply-grader-fixes.mjs` can batch-apply.
- Server-side KaTeX rendering at import time that flips rows to
  `needs_review` on parse failure.

### Q8 — Whole-page figure fallback is a constant review burden.

`extract-figures.mjs` falls back to whole-page rendering whenever
Gemini's bbox `confidence === "low"` OR the bbox is invalid (out of
bounds, too small). On figure-dense pages this happens often. The row
flips to `needs_review` with reason "whole-page figure fallback used."
Operators must then crop manually.

Options:
- Try Pro vision instead of Flash for low-confidence retry.
- Try `claude-opus-4-7` vision (no RECITATION filter, possibly higher
  spatial reasoning).
- Run multiple bbox candidates and pick the best by overlap with the
  question's source-page text bounds (filter out text-only regions).
- Accept manual review as inherent for ~10% of figures.

### Q9 — `figure_kind` is set by two separate backfills that run only when an admin remembers.

Pipeline writes `image_url` + `image_alt` but never sets `figure_kind`
or populates `figure_table_data` / `figure_chart_data`. Two manual
scripts have to run after every batch. Until they do, every figure
renders as the raster crop, missing the native HTML/SVG rendering.

Should the orchestrator chain in these two backfill stages? They're
cheap (Gemini Flash for tables, Gemini Pro for charts) and idempotent.

### Q10 — The deprecated paths still on disk.

These files are still in the repo but not in the active pipeline:

- `scripts/pdf-pipeline/pull-pdf-job.mjs` (the local Claude-CLI daemon, deprecated banner at top)
- `scripts/pdf-pipeline/finalize-pdf-job.mjs` (Hybrid Lite flow)
- `question-imports/stage1_extract.py` / `stage2_classify.py` / `stage3_figures.py` (Python OCR pipeline)
- `/api/cron/ingest-csv-inbox` route (folder-watch cron, alive but only the deprecated path calls it)

Should these be deleted? Or kept as escape hatches?

### Q11 — There is no actual aggregated cost / token telemetry per job.

Per-call `input_tokens` / `output_tokens` are logged to stderr in CI
logs. No script aggregates them into the `pdf_processing_jobs` row.
`pdf_processing_jobs.imported_counts` JSONB defaults to `{}` and is
never populated. Operators don't know what a given job actually cost.

Should the orchestrator append per-stage token counts + estimated
cost to `pdf_processing_jobs.progress.stats`?

### Q12 — `is_live` view is a convention enforcer, not a hard guarantee.

The `quiz_questions_live` view is documented as the student-facing
read surface; admin reads the table directly. But `fetchAllQuestionsForAdmin`
doesn't filter `import_status`, so a future code path that reads the
table without filter could leak `needs_review` rows to students. Should
the table itself enforce via RLS (admin-role can read all, student-role
can read live only)?

### Q13 — There's no end-to-end test of the pipeline.

The CLAUDE.md mentions Vitest + RTL + Playwright + visual regression
for the app. The pipeline scripts have ZERO automated tests:

- No unit test for `legacyDifficulty()` mapping.
- No fixture-based test that the CSV → DB → query round-trip preserves the row.
- No integration test that a tiny golden-PDF produces N expected rows.
- No test for the slug→node regex parse (would catch a curriculum.ts format change).
- No test for the prompt's "7 canonical stem starters" rule.

What's the minimum useful test surface?

### Q14 — The KarmanGPT prompt has internal drift.

- §4 describes a Python OCR workflow that doesn't run.
- §5 says `image_url` is base64; reality is https.
- §14 describes embedded PyMuPDF + base64 encoding; reality is sharp + R2.
- §17 sanity checks reference "the 32-column CSV" — fine — but the
  actual extraction doesn't emit 32 columns (it emits a subset; the
  CSV emitter fills the rest).

Should this prompt be split into:
- An EXTRACTION prompt (Sonnet's system message — what the pipeline
  actually uses) — slimmer, no Python/OCR/base64 references.
- A separate "operator runbook" for the deprecated ChatGPT-mode path.

### Q15 — `extractJsonObject` is doing a lot of heavy lifting.

The bracket-balanced parser in `llm-providers.mjs:335-382` exists
because Claude tool-use responses + LaTeX `{` braces don't play with
naive substring extraction. It's good code, but the existence of this
function indicates we're working around something the API gives us. Is
there a cleaner contract (e.g. response format hints) that would let
us delete this fallback?

### Q16 — The `quiz_questions.module_status` JSONB default is dead weight.

```sql
DEFAULT '{"key":"pending","m1":"pending","m2":"pending","m3":"pending","m4":"pending"}'::jsonb
```

Every new job inherits this 5-key shape that's never used. Strip it
out? Or repurpose for the new pipeline's per-stage progress?

### Q17 — The bbox prompt asks Gemini for `y_min, x_min, y_max, x_max` (y BEFORE x).

This is documented in the prompt as "Gemini's standard" but is
non-obvious to a reviewer. Should:
- The prompt accept either order and the script reorder?
- We just use a vision model that takes pixel coordinates directly?

### Q18 — `apply-grader-fixes.mjs` writes Pro's reasoning verbatim into `explanation_text` and CLEARS per-choice.

When the grader auto-fixes a likely-wrong answer, it overwrites the
existing explanation with the grader's reasoning AND blanks
`explanation_per_choice`. The row gets `needs_review` so a human can
review before live. But the human now sees raw grader reasoning, not
the higher-quality Sonnet output. Should the auto-fix instead
TRIGGER a re-run of stage 5a + 5b on that row?

### Q19 — The `progress` JSONB shape evolved without a schema.

```jsonc
{
  "stage": "extracting", "stage_label": "...", "percent": 23,
  "stage_percent": 0, "message": "...", "stats": { ... },
  "started_at": "...", "updated_at": "...",
  "github_run_id": "...", "github_run_url": "...",
  "error_stage": "..."  // only on failure
}
```

The website's polling code (`/admin/jobs/...`) reads this column with
no type contract. Adding a field works fine. Removing one would
silently break the UI. Should this be a typed JSONB schema (Postgres
JSON Schema validation) or just typed in TS at the read site?

### Q20 — One Claude inference vs four module-bounded inferences.

The current architecture sends an entire ~80-100-page PDF to Claude in
one inference. ~98 questions × ~500 output tokens = ~50K output. With
64K cap. This works (Claude Sonnet 4.6's context window absorbs it),
but the failure mode (mid-stream truncation, empty tool calls — fixed
in #154) is real.

Alternative: chunk the PDF into 4 module sub-PDFs (~20 pages each),
send 4 parallel Claude calls, each emitting ~22-27 questions. Faster
wall time, less risk of truncation, but loses the "single inference
reasons about the whole test" coherence. Was prototyped in the
deprecated `pull-pdf-job.mjs` flow (the `module_status` JSONB shape
remembers it). Worth revisiting?

---

## Appendix: file paths quick index

### Active pipeline files
- Orchestrator: `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/orchestrate.mjs`
- Local wrapper: `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/run-extraction.mjs`
- Stage 1 (extract): `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/extract-with-gemini.mjs`
- Stage 2 (figures): `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/extract-figures.mjs`
- Stage 3 (CSV): `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/json-to-import-csv.mjs`
- Stage 4 (DB import — orch): `/Users/zakariabennis/Karman-Prep/scripts/pdf-pipeline/import-csv-direct.mjs`
- Stage 4 (DB import — web): `/Users/zakariabennis/Karman-Prep/src/lib/question-bank/bulk-import.ts`
- Stage 5 (fill): `/Users/zakariabennis/Karman-Prep/scripts/content-generation/fill-all.mjs`
- Stage 5a: `/Users/zakariabennis/Karman-Prep/scripts/content-generation/generate-explanation-text.mjs`
- Stage 5b: `/Users/zakariabennis/Karman-Prep/scripts/content-generation/generate-per-choice-explanations.mjs`
- Stage 5c: `/Users/zakariabennis/Karman-Prep/scripts/content-generation/generate-desmos-tips.mjs`
- Stage 6 (grader): `/Users/zakariabennis/Karman-Prep/scripts/question-audit/multi-vote-grader.mjs`
- LLM client: `/Users/zakariabennis/Karman-Prep/scripts/lib/llm-providers.mjs`
- Job status: `/Users/zakariabennis/Karman-Prep/scripts/lib/job-status.mjs`

### Auditor + older grader
- Older 8-pass grader: `/Users/zakariabennis/Karman-Prep/scripts/question-audit/llm-grader.mjs`
- Deterministic auditor (CLI): `/Users/zakariabennis/Karman-Prep/scripts/question-audit/audit-csv.mjs`
- Server-importable rule subset: `/Users/zakariabennis/Karman-Prep/src/lib/question-bank/audit-rules.ts`
- Findings ingest: `/Users/zakariabennis/Karman-Prep/scripts/question-audit/ingest-findings.mjs`
- Apply fixes: `/Users/zakariabennis/Karman-Prep/scripts/question-audit/apply-grader-fixes.mjs`

### Taxonomy + curriculum
- Taxonomy module: `/Users/zakariabennis/Karman-Prep/src/lib/question-bank/taxonomy.ts`
- Math curriculum: `/Users/zakariabennis/Karman-Prep/src/data/curriculum/math.ts`
- R&W curriculum: `/Users/zakariabennis/Karman-Prep/src/data/curriculum/reading-writing.ts`

### Renderer
- KaTeX text: `/Users/zakariabennis/Karman-Prep/src/components/learn/MathText.tsx`
- Chart SVG: `/Users/zakariabennis/Karman-Prep/src/components/learn/ChartFigure.tsx`
- Native table: `/Users/zakariabennis/Karman-Prep/src/components/learn/QuestionTable.tsx`
- Chart type: `/Users/zakariabennis/Karman-Prep/src/types/chart.ts`

### Native-figure backfills
- Table: `/Users/zakariabennis/Karman-Prep/scripts/figure-extraction/extract-table-data.mjs`
- Chart: `/Users/zakariabennis/Karman-Prep/scripts/figure-extraction/extract-chart-data.mjs`

### Maintenance scripts
- Image URL backfill: `/Users/zakariabennis/Karman-Prep/scripts/maintenance/backfill-figure-urls.mjs`
- R&W stem/passage split: `/Users/zakariabennis/Karman-Prep/scripts/maintenance/fix-rw-stem-passage-split.mjs`

### Workflows
- Process: `/Users/zakariabennis/Karman-Prep/.github/workflows/process-pdf.yml`
- Grade only: `/Users/zakariabennis/Karman-Prep/.github/workflows/grade-only.yml`
- Audit nightly: `/Users/zakariabennis/Karman-Prep/.github/workflows/audit-nightly.yml`
- Audit alert: `/Users/zakariabennis/Karman-Prep/.github/workflows/audit-alert.yml`

### Schema migrations
- Question ingestion: `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260514002443_question_ingestion.sql`
- PDF jobs: `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260514002444_pdf_processing_jobs.sql`
- Jobs progress: `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260514002445_pdf_jobs_progress.sql`
- Slug CHECK: `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260518003000_concept_slug_check.sql`
- Live view: `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260518004500_quiz_questions_live_view.sql`
- Findings: `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260518130917_question_findings.sql`
- Native table figures: `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260518140651_quiz_questions_figure_native.sql`
- Edit history: `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260518153300_question_history.sql`
- Chart figures: `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260519000000_quiz_questions_figure_chart.sql`
- Grader votes: `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260523090000_quiz_questions_grader_votes.sql`
- Rejected questions: `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260524000000_rejected_questions.sql`
- Edit source 'preview': `/Users/zakariabennis/Karman-Prep/supabase/migrations/20260524010000_edit_source_add_preview.sql`

### The single biggest artifact
- KarmanGPT system prompt: `/Users/zakariabennis/Karman-Prep/question-imports/chatgpt/KarmanGPT.txt`

### Companion docs
- Lean as-of: `/Users/zakariabennis/Karman-Prep/docs/ingestion/pipeline-as-of-2026-05-24.md`
- Routine spec: `/Users/zakariabennis/Karman-Prep/docs/ingestion/spec.md`
- How-to-run: `/Users/zakariabennis/Karman-Prep/docs/ingestion/routine.md`
- ADR (ChatGPT path — deprecated): `/Users/zakariabennis/Karman-Prep/docs/adr/0003-chatgpt-custom-gpt-imports.md`
- ADR (Gemini local pipeline — current): `/Users/zakariabennis/Karman-Prep/docs/adr/0004-gemini-local-pdf-pipeline.md`
- Audit findings: `/Users/zakariabennis/Karman-Prep/docs/question-bank-audit-2026-05-17.md`
- Bug list: `/Users/zakariabennis/Karman-Prep/docs/bugs.md`

