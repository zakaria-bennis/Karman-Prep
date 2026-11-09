// Pure formatting helpers for the session recap draft page.

export function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export function timeSince(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
export function humanizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === "already_sent")
    return "This recap has already been sent. Refresh the page to see the locked state.";
  if (msg === "group_session_deferred")
    return "Cohort and weekly live session recaps come later. Only private tutoring recaps send for now.";
  if (msg === "no_resolved_emails")
    return "None of the selected recipients have email addresses on file.";
  if (msg === "missing_student_data") return "Couldn't find the student's data on this booking.";
  if (msg === "missing_tutor_data") return "Couldn't find the tutor's data on this booking.";
  if (msg === "no_transcript") return "There's no transcript saved for this session yet.";
  if (msg === "empty_transcript") return "Paste a transcript before saving.";
  if (msg === "forbidden") return "You don't have permission to edit this booking.";
  if (msg.startsWith("resend_failed:"))
    return `Email delivery failed: ${msg.slice("resend_failed: ".length)}`;
  if (msg.startsWith("booking_update_failed_after_send:")) {
    return "The email was sent BUT the booking record didn't update. Contact admin — manual fix needed.";
  }
  return msg;
}
