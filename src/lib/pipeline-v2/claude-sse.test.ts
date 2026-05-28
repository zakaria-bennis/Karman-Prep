// @vitest-environment node
//
// Tests for parseClaudeSSE in scripts/lib/llm-providers.mjs.
//
// SSE streaming is what bypasses Anthropic's 10-minute non-streaming
// timeout. Without it, any callClaude with maxTokens > ~8K and a
// large PDF will hit the cliff on production-size SAT booklets.
//
// We fake the response.body ReadableStream with the exact Anthropic
// SSE event sequence and assert the accumulated final shape matches
// what the non-streaming endpoint would return (so the downstream
// block-finding code at the bottom of callClaude doesn't care which
// transport ran).

import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs has no type decls
import { parseClaudeSSE } from "../../../scripts/lib/llm-providers.mjs";

/**
 * Build a fake Response with a ReadableStream body that emits the
 * given array of SSE event strings (each one a full message including
 * "event:" line, "data:" line, terminating "\n\n").
 */
function fakeStreamResponse(events: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) controller.enqueue(encoder.encode(e));
      controller.close();
    },
  });
  return new Response(stream);
}

/** Build a single SSE message string. */
function sseMessage(eventType: string, data: object): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

describe("parseClaudeSSE — accumulates SSE events into non-stream shape", () => {
  it("accumulates a single text block from multiple text_delta chunks", async () => {
    const events = [
      sseMessage("message_start", { type: "message_start", message: { usage: {} } }),
      sseMessage("content_block_start", {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      }),
      sseMessage("content_block_delta", {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "Hello" },
      }),
      sseMessage("content_block_delta", {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: " world" },
      }),
      sseMessage("content_block_stop", { type: "content_block_stop", index: 0 }),
      sseMessage("message_delta", {
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 5 },
      }),
      sseMessage("message_stop", { type: "message_stop" }),
    ];
    const result = (await parseClaudeSSE(fakeStreamResponse(events))) as {
      content: Array<{ type: string; text?: string; input?: Record<string, unknown> }>;
      stop_reason: string | null;
      usage: { output_tokens?: number; input_tokens?: number };
    };
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe("Hello world");
    expect(result.stop_reason).toBe("end_turn");
    expect(result.usage.output_tokens).toBe(5);
  });

  it("accumulates a tool_use block from input_json_delta chunks", async () => {
    // Tool-use is the critical path — that's what extract-with-gemini.mjs
    // relies on for structured PDF extraction.
    const partialJsonChunks = ['{"questions":[', '{"question_text":"x+', '2=5"}', "]}"];
    const events = [
      sseMessage("message_start", { type: "message_start", message: { usage: {} } }),
      sseMessage("content_block_start", {
        type: "content_block_start",
        index: 0,
        content_block: { type: "tool_use", id: "toolu_x", name: "respond", input: {} },
      }),
      ...partialJsonChunks.map((p) =>
        sseMessage("content_block_delta", {
          type: "content_block_delta",
          index: 0,
          delta: { type: "input_json_delta", partial_json: p },
        })
      ),
      sseMessage("content_block_stop", { type: "content_block_stop", index: 0 }),
      sseMessage("message_stop", { type: "message_stop" }),
    ];
    const result = await parseClaudeSSE(fakeStreamResponse(events));
    expect(result.content[0].type).toBe("tool_use");
    expect(result.content[0].input).toEqual({
      questions: [{ question_text: "x+2=5" }],
    });
    // The internal _partial should be cleaned up
    expect(result.content[0]._partial).toBeUndefined();
  });

  it("survives a chunk being split mid-message (TCP packet boundary)", async () => {
    // Real-world SSE streams arrive in chunks that don't align with
    // event boundaries. The parser MUST buffer partial events until
    // it sees the \n\n separator.
    const fullMessage = sseMessage("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    });
    const part1 = fullMessage.slice(0, 20);
    const part2 = fullMessage.slice(20);
    const events = [
      sseMessage("message_start", { type: "message_start", message: { usage: {} } }),
      part1,
      part2, // contains the rest + the \n\n terminator
      sseMessage("content_block_delta", {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "split-safely" },
      }),
      sseMessage("content_block_stop", { type: "content_block_stop", index: 0 }),
      sseMessage("message_stop", { type: "message_stop" }),
    ];
    const result = await parseClaudeSSE(fakeStreamResponse(events));
    expect(result.content[0].text).toBe("split-safely");
  });

  it("handles malformed input_json_delta gracefully (returns {})", async () => {
    const events = [
      sseMessage("message_start", { type: "message_start", message: { usage: {} } }),
      sseMessage("content_block_start", {
        type: "content_block_start",
        index: 0,
        content_block: { type: "tool_use", id: "toolu_x", name: "respond", input: {} },
      }),
      sseMessage("content_block_delta", {
        type: "content_block_delta",
        index: 0,
        delta: { type: "input_json_delta", partial_json: "{not_valid_json" },
      }),
      sseMessage("content_block_stop", { type: "content_block_stop", index: 0 }),
      sseMessage("message_stop", { type: "message_stop" }),
    ];
    const result = await parseClaudeSSE(fakeStreamResponse(events));
    expect(result.content[0].type).toBe("tool_use");
    expect(result.content[0].input).toEqual({});
  });

  it("ignores unknown event types without crashing", async () => {
    const events = [
      sseMessage("message_start", { type: "message_start", message: { usage: {} } }),
      sseMessage("future_event_type", { type: "future_event_type", random: "data" }),
      sseMessage("content_block_start", {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      }),
      sseMessage("content_block_delta", {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "still works" },
      }),
      sseMessage("content_block_stop", { type: "content_block_stop", index: 0 }),
      sseMessage("message_stop", { type: "message_stop" }),
    ];
    const result = await parseClaudeSSE(fakeStreamResponse(events));
    expect(result.content[0].text).toBe("still works");
  });

  it("supports multiple content blocks indexed correctly", async () => {
    const events = [
      sseMessage("message_start", { type: "message_start", message: { usage: {} } }),
      // Block 0 — text
      sseMessage("content_block_start", {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      }),
      sseMessage("content_block_delta", {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "thinking..." },
      }),
      sseMessage("content_block_stop", { type: "content_block_stop", index: 0 }),
      // Block 1 — tool_use
      sseMessage("content_block_start", {
        type: "content_block_start",
        index: 1,
        content_block: { type: "tool_use", id: "toolu_y", name: "respond", input: {} },
      }),
      sseMessage("content_block_delta", {
        type: "content_block_delta",
        index: 1,
        delta: { type: "input_json_delta", partial_json: '{"a":1}' },
      }),
      sseMessage("content_block_stop", { type: "content_block_stop", index: 1 }),
      sseMessage("message_stop", { type: "message_stop" }),
    ];
    const result = await parseClaudeSSE(fakeStreamResponse(events));
    expect(result.content).toHaveLength(2);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe("thinking...");
    expect(result.content[1].type).toBe("tool_use");
    expect(result.content[1].input).toEqual({ a: 1 });
  });

  it("throws when response has no body to stream from", async () => {
    const noBodyRes = new Response(null);
    await expect(parseClaudeSSE(noBodyRes)).rejects.toThrow(/no body/);
  });
});
