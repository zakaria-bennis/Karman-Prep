import { describe, expect, it } from "vitest";
import { isChatMediaUrl } from "./media";

const BASE = "https://abc123.supabase.co";

describe("isChatMediaUrl", () => {
  it("accepts a signed address in the chat-media bucket", () => {
    expect(
      isChatMediaUrl(`${BASE}/storage/v1/object/sign/chat-media/user_1/a.jpg?token=x`, BASE)
    ).toBe(true);
  });

  it("refuses any other site, bucket or scheme", () => {
    expect(isChatMediaUrl("https://cdn.example.com/a.jpg", BASE)).toBe(false);
    expect(isChatMediaUrl(`${BASE}/storage/v1/object/sign/other-bucket/a.jpg`, BASE)).toBe(false);
    expect(isChatMediaUrl(`${BASE}/storage/v1/object/public/chat-media/a.jpg`, BASE)).toBe(false);
    expect(
      isChatMediaUrl("http://abc123.supabase.co/storage/v1/object/sign/chat-media/a.jpg", BASE)
    ).toBe(false);
    expect(
      isChatMediaUrl(
        "https://abc123.supabase.co.evil.com/storage/v1/object/sign/chat-media/a.jpg",
        BASE
      )
    ).toBe(false);
    expect(isChatMediaUrl("not a url", BASE)).toBe(false);
  });

  it("refuses everything when the storage address is not configured", () => {
    expect(isChatMediaUrl(`${BASE}/storage/v1/object/sign/chat-media/a.jpg`, undefined)).toBe(
      false
    );
  });
});
