// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));

import LearnPage from "./page";
import MathPage from "./math/page";
import ReadingPage from "./reading/page";

describe("old Learn pages open the Library", () => {
  it("sends the landing page and both skill maps to the Library", () => {
    expect(() => LearnPage()).toThrow("redirect:/dashboard/student/library");
    expect(() => MathPage()).toThrow("redirect:/dashboard/student/library/math");
    expect(() => ReadingPage()).toThrow("redirect:/dashboard/student/library/reading-writing");
  });
});
