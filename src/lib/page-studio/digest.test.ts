import { describe, expect, it } from "vitest";
import { digest } from "./digest";
import type { StudioNote } from "./types";

const base: StudioNote = {
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: "2026-11-24T20:00:00Z",
  pageKey: "student.library",
  pagePath: "/dashboard/student?page=library",
  persona: "Student: Maya (Practice)",
  viewport: "desktop",
  kind: "copy",
  category: "copy",
  selector: "main > h1",
  elementLabel: 'heading "Your library"',
  elementText: "Your library",
  oldText: "Your library",
  newText: "Your skills",
  body: "",
  status: "sent",
  prUrl: null,
  sentAt: null,
  messages: [],
};

describe("page studio digest", () => {
  it("says so when there is nothing", () => {
    expect(digest([])).toBe("No notes to send.");
  });

  it("groups notes by page, with the page file and both versions of the words", () => {
    const out = digest([
      base,
      {
        ...base,
        id: "22222222-2222-4222-8222-222222222222",
        kind: "comment",
        category: "visual",
        oldText: null,
        newText: null,
        body: "Make this bigger",
        messages: [
          { id: "m1", author: "claude", body: "How much bigger?", createdAt: base.createdAt },
          { id: "m2", author: "founder", body: "Twice", createdAt: base.createdAt },
        ],
      },
    ]);
    expect(out).toContain("# Page Studio notes (2)");
    expect(out.match(/^## /gm)).toHaveLength(1);
    expect(out).toContain("File: `src/app/dashboard/student/page.tsx`");
    expect(out).toContain('Before: "Your library"');
    expect(out).toContain('After: "Your skills"');
    expect(out).toContain("**Visual comment**");
    expect(out).toContain("Claude asked: How much bigger?");
    expect(out).toContain("Founder answered: Twice");
  });

  it("splits the same page seen on another device", () => {
    const out = digest([base, { ...base, viewport: "phone" }]);
    expect(out.match(/^## /gm)).toHaveLength(2);
  });
});
