export type CohortPlanStatus = "forming" | "active" | "completed";

export function cohortTopicPresentation(
  status: CohortPlanStatus,
  topic: string | null
): { label: string; topic: string } | null {
  const trimmed = topic?.trim();
  if (!trimmed) return null;

  const label =
    status === "completed"
      ? "Last topic"
      : status === "forming"
        ? "Planned topic"
        : "Current topic";
  return { label, topic: trimmed };
}

export function cohortTopicEmptyMessage(status: CohortPlanStatus): string {
  return status === "completed"
    ? "No topic recorded"
    : status === "forming"
      ? "No planned topic set"
      : "No current topic set";
}

export function cohortPlacementTitle(status: CohortPlanStatus): string {
  return status === "completed"
    ? "Completed cohort"
    : status === "forming"
      ? "Forming cohort"
      : "Active cohort";
}
