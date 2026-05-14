// ============================================================
// Unit tests for the Karman bullying classifier.
//
// Stubs global fetch + OPENAI_API_KEY so the tests run offline.
// Locks down the request shape (model, structured-output format,
// system + user messages) and the response parsing.
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callKarmanClassifier } from "./karman-classifier";

interface CapturedRequest {
  url: string;
  body: {
    model?: string;
    temperature?: number;
    response_format?: { type?: string };
    messages?: Array<{ role: string; content: string }>;
  };
}

let captured: CapturedRequest | null;

function stubFetch(modelOutput: unknown, ok = true): void {
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    captured = {
      url: typeof url === "string" ? url : url.toString(),
      body: init?.body ? JSON.parse(init.body as string) : {},
    };
    const payload = {
      choices: [{ message: { content: JSON.stringify(modelOutput) } }],
    };
    return new Response(JSON.stringify(payload), {
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

describe("callKarmanClassifier — request shape", () => {
  it("calls the chat-completions endpoint with gpt-4o-mini + JSON response_format", async () => {
    stubFetch({ flagged: false, reason: "clean" });
    await callKarmanClassifier("hello world");
    expect(captured?.url).toBe("https://api.openai.com/v1/chat/completions");
    expect(captured?.body.model).toBe("gpt-4o-mini");
    expect(captured?.body.response_format).toEqual({ type: "json_object" });
    expect(captured?.body.temperature).toBe(0);
  });

  it("sends a system prompt + the message text as the user message", async () => {
    stubFetch({ flagged: false, reason: "clean" });
    await callKarmanClassifier("study group tonight?");
    const messages = captured?.body.messages ?? [];
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    // The system prompt must include the audience context — a
    // future refactor that drops "14-18" or "Karman" should fail
    // this assertion until the prompt is reviewed.
    expect(messages[0].content).toMatch(/14-18/);
    expect(messages[0].content).toMatch(/Karman/);
    expect(messages[1]).toEqual({ role: "user", content: "study group tonight?" });
  });

  it("trims whitespace before sending", async () => {
    stubFetch({ flagged: false, reason: "clean" });
    await callKarmanClassifier("   hi   \n");
    const messages = captured?.body.messages ?? [];
    expect(messages[1].content).toBe("hi");
  });

  it("short-circuits to {flagged:false} without a network call when content is empty", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as typeof fetch;
    const r = await callKarmanClassifier("");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(r.flagged).toBe(false);
  });
});

describe("callKarmanClassifier — response handling", () => {
  it("parses a clean response", async () => {
    stubFetch({ flagged: false, reason: "academic discussion" });
    const r = await callKarmanClassifier("how do I solve question 7?");
    expect(r.flagged).toBe(false);
    expect(r.reason).toBe("academic discussion");
  });

  it("parses a flagged response", async () => {
    stubFetch({ flagged: true, reason: "put-down directed at another student" });
    const r = await callKarmanClassifier("you're so dumb");
    expect(r.flagged).toBe(true);
    expect(r.reason).toContain("put-down");
  });

  it("coerces missing reason field to a default string", async () => {
    stubFetch({ flagged: true });
    const r = await callKarmanClassifier("...");
    expect(r.flagged).toBe(true);
    expect(typeof r.reason).toBe("string");
  });

  it("throws on non-200 HTTP", async () => {
    stubFetch({ error: "boom" }, false);
    await expect(callKarmanClassifier("hi")).rejects.toThrow(/karman-classifier HTTP/);
  });

  it("throws when the model returns non-JSON content", async () => {
    globalThis.fetch = vi.fn(async () => {
      const payload = {
        choices: [{ message: { content: "not actually json" } }],
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    await expect(callKarmanClassifier("hi")).rejects.toThrow(/non-JSON/);
  });

  it("throws when OPENAI_API_KEY is not set", async () => {
    vi.unstubAllEnvs();
    delete process.env.OPENAI_API_KEY;
    await expect(callKarmanClassifier("hi")).rejects.toThrow(/OPENAI_API_KEY/);
  });
});
