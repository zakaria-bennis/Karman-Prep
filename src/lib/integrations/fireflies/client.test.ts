// ============================================================
// Unit tests for the Fireflies API client helpers.
// Network-dependent functions (fetchFirefliesTranscript) aren't
// tested here — those need integration mocks. We cover the pure
// helpers that operate on already-fetched data.
// ============================================================

import { describe, expect, it } from "vitest";
import { parseZoomMeetingId, renderTranscriptText } from "./client";

describe("parseZoomMeetingId", () => {
  it("extracts ID from a /j/ join URL", () => {
    expect(parseZoomMeetingId("https://us05web.zoom.us/j/12345678901?pwd=abc")).toBe("12345678901");
  });

  it("extracts ID from a /wc/ web-client URL", () => {
    expect(parseZoomMeetingId("https://zoom.us/wc/12345678901/join")).toBe("12345678901");
  });

  it("returns null for non-Zoom URLs", () => {
    expect(parseZoomMeetingId("https://meet.google.com/abc-defg-hij")).toBe(null);
    expect(parseZoomMeetingId("https://example.com/")).toBe(null);
  });

  it("returns null for null/undefined/empty input", () => {
    expect(parseZoomMeetingId(null)).toBe(null);
    expect(parseZoomMeetingId(undefined)).toBe(null);
    expect(parseZoomMeetingId("")).toBe(null);
  });

  it("requires at least 8 digits — rejects too-short IDs", () => {
    expect(parseZoomMeetingId("https://zoom.us/j/1234567")).toBe(null);
    expect(parseZoomMeetingId("https://zoom.us/j/12345678")).toBe("12345678");
  });
});

describe("renderTranscriptText", () => {
  it("formats sentences as 'Speaker: text'", () => {
    const result = renderTranscriptText([
      { speaker_name: "Zakaria", text: "Today we covered quadratics.", start_time: 0 },
      { speaker_name: "Maya", text: "I struggled with negative coefficients.", start_time: 12 },
    ]);
    expect(result).toBe(
      "Zakaria: Today we covered quadratics.\nMaya: I struggled with negative coefficients."
    );
  });

  it("filters out empty/whitespace-only text", () => {
    const result = renderTranscriptText([
      { speaker_name: "Maya", text: "Hello.", start_time: 0 },
      { speaker_name: "Maya", text: "   ", start_time: 5 },
      { speaker_name: "Maya", text: "", start_time: 6 },
      { speaker_name: "Maya", text: "World.", start_time: 10 },
    ]);
    expect(result).toBe("Maya: Hello.\nMaya: World.");
  });

  it("uses 'Unknown' when speaker_name is null", () => {
    const result = renderTranscriptText([
      { speaker_name: null, text: "Some announcement.", start_time: 0 },
    ]);
    expect(result).toBe("Unknown: Some announcement.");
  });

  it("returns empty string for empty input", () => {
    expect(renderTranscriptText([])).toBe("");
  });
});
