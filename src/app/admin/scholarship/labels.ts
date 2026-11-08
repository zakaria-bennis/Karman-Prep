import type { Tone } from "@/components/admin/workbench";

export const VERDICT_TONE: Record<string, Tone> = { pass: "ok", warn: "warn", fail: "fail" };
export const VERDICT_LABEL: Record<string, string> = {
  pass: "Passed",
  warn: "Look closely",
  fail: "Failed",
};
export const STATUS_TONE: Record<string, Tone> = {
  submitted: "info",
  approved: "warn",
  paid: "ok",
  rejected: "neutral",
};
export const STATUS_LABEL: Record<string, string> = {
  submitted: "Waiting",
  approved: "Approved, not paid",
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
  refund_succeeded: "Cohort price refunded",
  bonus_succeeded: "Merit bonus credited",
  payout_failed: "Payout stopped",
  paid: "Paid in full",
};
