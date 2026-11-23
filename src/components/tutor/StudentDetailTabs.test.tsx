import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RW_NODES } from "@/data/curriculum";
import type { QuizAttempt } from "@/types/quiz";

vi.mock("@/app/tutor/actions", () => ({
  actionResolveFlag: vi.fn(),
  actionEditFlaggedQuestion: vi.fn(),
}));

const { default: StudentDetailTabs } = await import("./StudentDetailTabs");

const node = RW_NODES[0];
const attempts: QuizAttempt[] = [
  {
    id: "a1",
    student_id: "s1",
    node_id: node.id,
    attempt_number: 2,
    score: 85,
    questions_answered: 3,
    questions_correct: 2,
    confidence_band: "proficient",
    started_at: "2026-11-01T10:00:00Z",
    completed_at: "2026-11-01T10:06:30Z",
    adaptive_path: [
      { question_id: "q1", difficulty: "intermediate", was_correct: true },
      { question_id: "q2", difficulty: "advanced", was_correct: false },
    ],
  },
];

function render(activeTab: "flagged" | "quiz") {
  return renderToStaticMarkup(
    <StudentDetailTabs
      studentId="s1"
      attempts={attempts}
      flagged={[]}
      responsesByAttempt={{}}
      activeTab={activeTab}
    />
  );
}

/** Tailwind utilities the tabs used before they moved to the portal's look. */
const TAILWIND =
  /class="[^"]*\b(rounded-lg|text-\[color|px-3|py-2|space-y-\d|flex-wrap|text-xs|bg-\[)/;

describe("the tutor's student tabs, in the portal's look", () => {
  it("draws the tabs on portal classes, with no Tailwind utilities on any tab", () => {
    for (const tab of ["flagged", "quiz"] as const) {
      const html = render(tab);
      expect(html).toContain('class="kp-st-tabs"');
      expect(html).not.toMatch(TAILWIND);
      expect(html).not.toContain("wb-tab");
    }
  });

  it("gives each quiz attempt a score ring, and keeps its time and path summary", () => {
    const html = render("quiz");
    expect(html).toContain('aria-label="Score 85%"');
    expect(html).toContain("6m 30s");
    expect(html).toContain("Reached: intermediate → advanced");
    expect(html).toContain('aria-expanded="false"');
  });

  it("keeps the empty states", () => {
    expect(render("flagged")).toContain("No flagged questions.");
  });
});
