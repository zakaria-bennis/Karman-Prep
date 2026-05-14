// ============================================================
// Unit tests for the OpenAI moderation provider.
//
// We stub global fetch + OPENAI_API_KEY so the tests run offline.
// The point of these tests isn't to verify OpenAI's behavior —
// that's their job — but to lock down the request shape we send:
//   · text-only → string input
//   · text + images → multimodal array input
//   · images only → multimodal array (no text part)
//   · empty + empty → no network call at all
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callOpenAIModeration } from "./providers";

interface CapturedRequest {
  url: string;
  body: unknown;
}

let captured: CapturedRequest | null;

function stubFetch(response: unknown, ok = true): void {
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    captured = {
      url: typeof url === "string" ? url : url.toString(),
      body: init?.body ? JSON.parse(init.body as string) : null,
    };
    return new Response(JSON.stringify(response), {
      status: ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

beforeEach(() => {
  captured = null;
  vi.stubEnv("OPENAI_API_KEY", "sk-test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("callOpenAIModeration — request shape", () => {
  it("uses string input form when there are no images", async () => {
    stubFetch({ results: [{ flagged: false, categories: {}, category_scores: {} }] });
    await callOpenAIModeration("hello world", []);
    expect(captured?.url).toBe("https://api.openai.com/v1/moderations");
    expect(captured?.body).toMatchObject({
      model: "omni-moderation-latest",
      input: "hello world",
    });
  });

  it("uses multimodal array form when there are images", async () => {
    stubFetch({ results: [{ flagged: false, categories: {}, category_scores: {} }] });
    await callOpenAIModeration("look at this", ["https://cdn.example.com/a.jpg"]);
    expect(captured?.body).toMatchObject({
      model: "omni-moderation-latest",
      input: [
        { type: "text", text: "look at this" },
        { type: "image_url", image_url: { url: "https://cdn.example.com/a.jpg" } },
      ],
    });
  });

  it("omits the text part when content is empty but images are present (image-only message)", async () => {
    stubFetch({ results: [{ flagged: false, categories: {}, category_scores: {} }] });
    await callOpenAIModeration("", ["https://cdn.example.com/a.jpg"]);
    expect(captured?.body).toMatchObject({
      input: [{ type: "image_url", image_url: { url: "https://cdn.example.com/a.jpg" } }],
    });
  });

  it("forwards multiple image URLs in order", async () => {
    stubFetch({ results: [{ flagged: false, categories: {}, category_scores: {} }] });
    await callOpenAIModeration("a", [
      "https://cdn.example.com/1.jpg",
      "https://cdn.example.com/2.jpg",
      "https://cdn.example.com/3.jpg",
    ]);
    const body = captured?.body as { input: Array<{ type: string }> };
    expect(body.input.filter((p) => p.type === "image_url")).toHaveLength(3);
  });

  it("short-circuits with no network call when both text and images are empty", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as typeof fetch;
    const result = await callOpenAIModeration("", []);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      flagged: false,
      worstCategory: null,
      worstScore: 0,
      isHighSeverity: false,
    });
  });
});

describe("callOpenAIModeration — response handling", () => {
  it("returns a clean result when OpenAI says not flagged", async () => {
    stubFetch({ results: [{ flagged: false, categories: {}, category_scores: {} }] });
    const r = await callOpenAIModeration("hi", []);
    expect(r.flagged).toBe(false);
    expect(r.isHighSeverity).toBe(false);
  });

  it("returns flagged + high severity for sexual/minors regardless of score", async () => {
    stubFetch({
      results: [
        {
          flagged: true,
          categories: { "sexual/minors": true },
          category_scores: { "sexual/minors": 0.42 },
        },
      ],
    });
    const r = await callOpenAIModeration("...", []);
    expect(r.flagged).toBe(true);
    expect(r.isHighSeverity).toBe(true);
    expect(r.worstCategory).toBe("sexual/minors");
  });

  it("returns flagged but NOT high severity for plain harassment (without /threatening)", async () => {
    stubFetch({
      results: [
        {
          flagged: true,
          categories: { harassment: true },
          category_scores: { harassment: 0.85 },
        },
      ],
    });
    const r = await callOpenAIModeration("...", []);
    expect(r.flagged).toBe(true);
    expect(r.isHighSeverity).toBe(false);
  });

  it("picks the highest-scoring flagged category as worstCategory", async () => {
    stubFetch({
      results: [
        {
          flagged: true,
          categories: { harassment: true, hate: true },
          category_scores: { harassment: 0.6, hate: 0.9 },
        },
      ],
    });
    const r = await callOpenAIModeration("...", []);
    expect(r.worstCategory).toBe("hate");
    expect(r.worstScore).toBeCloseTo(0.9);
  });

  it("throws on non-200 HTTP response (pipeline.ts fails closed on this)", async () => {
    stubFetch({ error: "boom" }, false);
    await expect(callOpenAIModeration("hi", [])).rejects.toThrow(/openai-moderation HTTP/);
  });

  it("throws when OPENAI_API_KEY is not set", async () => {
    vi.unstubAllEnvs();
    delete process.env.OPENAI_API_KEY;
    await expect(callOpenAIModeration("hi", [])).rejects.toThrow(/OPENAI_API_KEY/);
  });
});
