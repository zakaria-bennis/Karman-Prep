import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/integrations/resend/client", () => ({ resend: {}, FROM: "test" }));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => ({}) }));

import { threadFor } from "./answer";

const row = (sender_id: string, content: string | null, more: object = {}) => ({
  sender_id,
  content,
  moderation_status: "approved",
  ...more,
});

describe("the chat so far, as the assistant reads it", () => {
  it("is oldest first and says who wrote each message", () => {
    // rows come newest first, as the database returns them
    const thread = threadFor(
      [
        row("tutor", "I'm the assistant.", { from_assistant: true }),
        row("student", "Why is it B?"),
        row("tutor", "Try set 4 tonight."),
      ],
      "student"
    );
    expect(thread).toEqual([
      { from: "tutor", text: "Try set 4 tonight." },
      { from: "student", text: "Why is it B?" },
      { from: "assistant", text: "I'm the assistant." },
    ]);
  });

  it("leaves out stopped messages, held ones and ones with no words", () => {
    const thread = threadFor(
      [
        row("student", "stopped", { moderation_status: "rejected" }),
        row("student", "held", { moderation_status: "flagged" }),
        row("student", null),
        row("student", "kept"),
      ],
      "student"
    );
    expect(thread).toEqual([{ from: "student", text: "kept" }]);
  });

  it("keeps only the newest dozen", () => {
    const rows = Array.from({ length: 20 }, (_, i) => row("student", `m${i}`));
    const thread = threadFor(rows, "student");
    expect(thread).toHaveLength(12);
    expect(thread.at(-1)?.text).toBe("m0");
  });
});
