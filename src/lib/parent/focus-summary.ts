export interface ParentFocusHomework {
  title: string;
  assigned_at: string;
  due_at: string | null;
}

export interface ParentFocusSummary {
  focus: string | null;
  nextAction: string | null;
  nextDueAt: string | null;
  recentAssignment: string | null;
}

// Only describes work already visible on the linked student's parent page.
// Assignment presence does not establish completion or improvement.
export function buildParentFocusSummary(
  currentTopic: string | null,
  cohortStatus: string | null,
  recentHomework: ParentFocusHomework[],
  nextHomework: ParentFocusHomework | null,
  today: string
): ParentFocusSummary {
  const focus = cohortStatus === "active" ? currentTopic?.trim() || null : null;
  const upcoming =
    nextHomework?.due_at && nextHomework.due_at.slice(0, 10) >= today ? nextHomework : null;
  const recent = [...recentHomework].sort((a, b) => b.assigned_at.localeCompare(a.assigned_at))[0];

  return {
    focus,
    nextAction: upcoming?.title || null,
    nextDueAt: upcoming?.due_at || null,
    recentAssignment: recent?.title || null,
  };
}
