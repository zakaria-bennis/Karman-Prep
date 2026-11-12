import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RW_NODES } from "@/data/curriculum";
import type { NodeStatusSnapshot } from "@/lib/supabase/queries/tutor";
import type { QuizAttempt } from "@/types/quiz";

vi.mock("@/app/tutor/actions", () => ({
  actionResolveFlag: vi.fn(),
  actionEditFlaggedQuestion: vi.fn(),
  actionApplyNodeOverride: vi.fn(),
  actionAssignCheckpointRetake: vi.fn(),
  actionOverrideCooldown: vi.fn(),
}));

const { default: StudentDetailTabs } = await import("./StudentDetailTabs");

const node = RW_NODES[0];
const statuses: NodeStatusSnapshot[] = [
  {
    node_id: node.id,
    status: "in_progress",
    best_quiz_score: 72,
    last_quiz_score: 72,
    attempts: 3,
    watch_percentage: 50,
    confidence_band: "developing",
    completed_at: null,
    updated_at: "2026-11-01T10:00:00Z",
  },
];
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

function render(activeTab: "skills" | "controls" | "flagged" | "quiz") {
  return renderToStaticMarkup(
    <StudentDetailTabs
      studentId="s1"
      statuses={statuses}
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
    for (const tab of ["skills", "controls", "flagged", "quiz"] as const) {
      const html = render(tab);
      expect(html).toContain('class="kp-st-tabs"');
      expect(html).not.toMatch(TAILWIND);
      expect(html).not.toContain("wb-tab");
    }
  });

  it("shows how the skills spread across the bands as rings, then the full table", () => {
    const html = render("skills");
    expect(html).toContain('aria-label="Developing: 1 of ');
    expect(html.match(/class="kp-ring"/g)?.length).toBe(4);
    expect(html).toContain(node.topic.replace(/&/g, "&amp;"));
    expect(html).toContain('data-band="developing"');
  });

  it("gives each quiz attempt a score ring, and keeps its time and path summary", () => {
    const html = render("quiz");
    expect(html).toContain('aria-label="Score 85%"');
    expect(html).toContain("6m 30s");
    expect(html).toContain("Reached: intermediate → advanced");
    expect(html).toContain('aria-expanded="false"');
  });

  it("keeps the empty states", () => {
    expect(render("flagged")).toContain("This student has no flagged questions.");
  });

  it("keeps every override control", () => {
    const html = render("controls");
    expect(html).toContain("Node status overrides");
    expect(html.match(/Assign retake/g)).toHaveLength(6);
    expect(html.match(/Override cooldown/g)).toHaveLength(6);
  });
});
