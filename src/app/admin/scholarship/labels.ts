import type { Tone } from "@/components/admin/workbench";

export const VERDICT_TONE: Record<string, Tone> = { pass: "ok", warn: "warn", fail: "fail" };
export const VERDICT_LABEL: Record<string, string> = {
  pass: "Passed",
  warn: "Look closely",
  fail: "Failed",
};
export type Stage = "submitted" | "approved" | "transfer" | "paid" | "rejected";

/** Where a claim stands: its status, and for an approved claim, which payout step is next. */
export function claimStage(c: { status: string; payout_status: string }): Stage {
  if (c.status === "approved") return c.payout_status === "refunded" ? "transfer" : "approved";
  return c.status as Stage;
}

export const STATUS_TONE: Record<Stage, Tone> = {
  submitted: "info",
  approved: "warn",
  transfer: "warn",
  paid: "ok",
  rejected: "neutral",
};
export const STATUS_LABEL: Record<Stage, string> = {
  submitted: "Waiting",
  approved: "Approved, refund next",
  transfer: "Bank transfer due",
  paid: "Paid",
  rejected: "Rejected",
};
export const REASON_TONE: Record<string, Tone> = { ok: "ok", warn: "warn", fail: "fail" };
export const REASON_LABEL: Record<string, string> = { ok: "OK", warn: "Check", fail: "Fail" };

export const EVENT_LABEL: Record<string, string> = {
  submitted: "Uploaded by the student",
  resubmitted: "New file uploaded by the student",
  checked: "Automatic check ran",
  approved: "Approved",
  rejected: "Rejected",
  reopened: "Decision undone",
  payout_started: "Payout started",
  refund_succeeded: "Cohort payment refunded in Stripe",
  payout_failed: "Refund stopped",
  bonus_transfer_recorded: "Bank transfer recorded",
  paid: "Paid in full",
};
