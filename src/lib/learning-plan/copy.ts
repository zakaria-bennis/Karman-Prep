// Shared language for existing learning-plan surfaces. These records are
// separate: an available lesson, a tutor draft, and a posted assignment do
// not establish that a student completed the work.
export const learningPlanCopy = {
  studentHeading: "Your next learning step",
  tutorPracticeField: "Practice to plan before the next session",
  cohortPostButton: "Post planned practice",
  parentHeading: "Current focus and posted plan",
  parentUpcomingLabel: "Upcoming posted assignment: ",
  parentEvidenceNote:
    "This view shows posted plans, not assignment completion or a score prediction.",
} as const;

export function studentLessonLabel(status: string): string {
  return status === "in_progress" ? "Continue this lesson" : "Available lesson";
}
