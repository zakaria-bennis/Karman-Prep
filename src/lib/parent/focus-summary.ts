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
  homework: ParentFocusHomework[],
  today: string
): ParentFocusSummary {
  const focus = currentTopic?.trim() || null;
  const upcoming = homework
    .filter((item) => item.due_at && item.due_at.slice(0, 10) >= today)
    .sort((a, b) => a.due_at!.localeCompare(b.due_at!))[0];
  const recent = [...homework].sort((a, b) => b.assigned_at.localeCompare(a.assigned_at))[0];

  return {
    focus,
    nextAction: upcoming?.title || null,
    nextDueAt: upcoming?.due_at || null,
    recentAssignment: recent?.title || null,
  };
}
