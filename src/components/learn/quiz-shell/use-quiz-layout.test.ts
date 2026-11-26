import { describe, expect, it } from "vitest";
import { layoutForWidth } from "./use-quiz-layout";

describe("layoutForWidth", () => {
  it("gives phones one pane", () => expect(layoutForWidth(390, 844)).toBe("compact"));
  it("gives a tablet held upright the stacked layout", () =>
    expect(layoutForWidth(820, 1180)).toBe("medium"));
  it("gives a tablet held sideways two panes side by side", () => {
    expect(layoutForWidth(1080, 810)).toBe("wide");
    expect(layoutForWidth(1180, 820)).toBe("wide");
  });
  it("gives a computer two panes side by side", () =>
    expect(layoutForWidth(1440, 900)).toBe("wide"));
});
