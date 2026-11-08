"use client";

// ============================================================
// The decision box on a scholarship claim:
//   1. approve (a note is required when the automatic check didn't
//      pass) or reject with a reason; re-run the check; undo;
//   2. refund the cohort payment in Stripe test mode;
//   3. record the merit bonus once the bank transfer is sent by
//      hand: the date and the bank's reference.
// A tie splits the award, so the share is shown before approving.
// ============================================================

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { WbSection } from "@/components/admin/workbench";
import { APPROVE_BLOCK_MESSAGES, type ApproveCheck } from "@/lib/scholarship/ranking";
import {
  actionApproveScholarship,
  actionMarkScholarshipBonusPaid,
  actionPayScholarship,
  actionRejectScholarship,
  actionReopenScholarship,
  actionRerunScholarshipCheck,
} from "../actions";

type Result = { ok: true } | { ok: false; error: string };
type BlockReason = Exclude<ApproveCheck, { ok: true }>["reason"];

interface Props {
  claimId: string;
  status: "submitted" | "approved" | "rejected" | "paid";
  verdict: "pass" | "warn" | "fail" | null;
  payoutStatus: string;
  payoutError: string | null;
  reviewReason: string | null;
  isTop: boolean;
  approveBlock: BlockReason | null;
  shareLabel: string;
  tiedWith: number;
  refundLabel: string;
  bonusLabel: string;
  refundId: string | null;
  transfer: { paidOn: string; reference: string } | null;
  paidAt: string | null;
}

export default function ReviewPanel(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");

  function run(fn: () => Promise<Result>, done: string) {
    setMessage(null);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMessage({ ok: true, text: done });
        setRejecting(false);
        router.refresh();
      } else {
        setMessage({ ok: false, text: r.error });
      }
    });
  }

  const needsNote = p.verdict !== "pass";
  const refundDone = p.status === "approved" && p.payoutStatus === "refunded";
  const canUndo =
    p.status === "approved" && (p.payoutStatus === "none" || p.payoutStatus === "failed");

  return (
    <WbSection title="Decision">
      <div className="wb-grid">
        {p.status === "submitted" && (
          <>
            {p.approveBlock ? (
              <p className="wb-note">{APPROVE_BLOCK_MESSAGES[p.approveBlock]}</p>
            ) : (
              <p className="wb-note">
                {p.tiedWith > 0
                  ? `Tied for the top score with ${p.tiedWith} other ${p.tiedWith === 1 ? "student" : "students"}: the award splits, so this claim gets ${p.shareLabel}.`
                  : `Top score in the cohort: this claim gets ${p.shareLabel}.`}
              </p>
            )}
            <label className="wb-field">
              <span>{needsNote ? "What you checked by hand (required)" : "Note (optional)"}</span>
              <textarea
                className="wb-textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={2000}
                placeholder={
                  needsNote ? "For example: compared with the College Board account on a call" : ""
                }
              />
            </label>
            <div className="wb-actions">
              <button
                type="button"
                className="wb-btn"
                data-variant="primary"
                disabled={
                  pending || Boolean(p.approveBlock) || (needsNote && note.trim().length < 3)
                }
                onClick={() =>
                  run(
                    () => actionApproveScholarship({ claimId: p.claimId, note }),
                    "Approved. The refund is next."
                  )
                }
              >
                Approve {p.shareLabel}
              </button>
              <button
                type="button"
                className="wb-btn"
                disabled={pending}
                onClick={() => setRejecting((v) => !v)}
              >
                Reject
              </button>
              <button
                type="button"
                className="wb-btn"
                disabled={pending}
                onClick={() =>
                  run(
                    () => actionRerunScholarshipCheck({ claimId: p.claimId }),
                    "The check ran again."
                  )
                }
              >
                Run the check again
              </button>
            </div>
          </>
        )}

        {rejecting && (
          <form
            className="wb-grid"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => actionRejectScholarship({ claimId: p.claimId, reason }),
                "Rejected. The student sees your reason."
              );
            }}
          >
            <label className="wb-field">
              <span>Why (the student sees this)</span>
              <textarea
                className="wb-textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={3}
                maxLength={2000}
              />
            </label>
            <div className="wb-actions">
              <button
                type="submit"
                className="wb-btn"
                data-variant="danger"
                disabled={pending || reason.trim().length < 3}
              >
                Reject the claim
              </button>
              <button type="button" className="wb-btn" onClick={() => setRejecting(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {p.status === "approved" && !refundDone && (
          <>
            <p className="wb-note">
              Approved for {p.shareLabel}. First, refund the cohort payment ({p.refundLabel}) in
              Stripe. It runs in test mode only, and it is safe to retry.{" "}
              {p.bonusLabel === "$0"
                ? "Nothing is left for a bank transfer."
                : `Then send the ${p.bonusLabel} merit bonus by bank transfer and record it here.`}
            </p>
            {p.payoutError && <p className="wb-alert">Last attempt: {p.payoutError}</p>}
            <label className="wb-field">
              <span>Cohort payment id (only if it isn&apos;t found automatically)</span>
              <input
                className="wb-input"
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value.trim())}
                placeholder="pi_…"
                pattern="pi_[A-Za-z0-9]+"
              />
            </label>
            <div className="wb-actions">
              <button
                type="button"
                className="wb-btn"
                data-variant="primary"
                disabled={pending}
                onClick={() =>
                  run(
                    () => actionPayScholarship({ claimId: p.claimId, paymentIntentId: paymentId }),
                    "Refunded in Stripe test mode."
                  )
                }
              >
                {pending ? "Refunding…" : `Refund ${p.refundLabel} in Stripe test mode`}
              </button>
              {canUndo && (
                <button
                  type="button"
                  className="wb-btn"
                  disabled={pending}
                  onClick={() =>
                    run(() => actionReopenScholarship({ claimId: p.claimId }), "Approval undone.")
                  }
                >
                  Undo the approval
                </button>
              )}
              {canUndo && !rejecting && (
                <button
                  type="button"
                  className="wb-btn"
                  disabled={pending}
                  onClick={() => setRejecting(true)}
                >
                  Reject instead
                </button>
              )}
            </div>
          </>
        )}

        {refundDone && (
          <form
            className="wb-grid"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => actionMarkScholarshipBonusPaid({ claimId: p.claimId, paidOn, reference }),
                "Recorded. The scholarship is paid."
              );
            }}
          >
            <p className="wb-note">
              The cohort payment is refunded ({p.refundLabel}, {p.refundId ?? "no refund needed"}).
              Send the {p.bonusLabel} merit bonus to the parent or guardian by bank transfer, then
              record it here.
            </p>
            <div className="wb-grid" data-columns="2">
              <label className="wb-field">
                <span>Date sent</span>
                <input
                  className="wb-input"
                  type="date"
                  value={paidOn}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPaidOn(e.target.value)}
                  required
                />
              </label>
              <label className="wb-field">
                <span>Bank reference</span>
                <input
                  className="wb-input"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  minLength={2}
                  maxLength={120}
                  required
                />
              </label>
            </div>
            <div className="wb-actions">
              <button
                type="submit"
                className="wb-btn"
                data-variant="primary"
                disabled={pending || reference.trim().length < 2}
              >
                Mark as paid by bank transfer
              </button>
            </div>
          </form>
        )}

        {p.status === "rejected" && (
          <>
            <p className="wb-note">Rejected: {p.reviewReason}</p>
            <div className="wb-actions">
              <button
                type="button"
                className="wb-btn"
                disabled={pending}
                onClick={() =>
                  run(() => actionReopenScholarship({ claimId: p.claimId }), "Rejection undone.")
                }
              >
                Undo the rejection
              </button>
            </div>
          </>
        )}

        {p.status === "paid" && (
          <dl className="wb-dl">
            <dt>Award</dt>
            <dd>{p.shareLabel}</dd>
            <dt>Refunded in Stripe</dt>
            <dd>
              {p.refundLabel} <small>{p.refundId ?? "none needed"}</small>
            </dd>
            <dt>Bank transfer</dt>
            <dd>
              {p.transfer
                ? `${p.bonusLabel} sent ${p.transfer.paidOn}, reference ${p.transfer.reference}`
                : "None needed"}
            </dd>
            <dt>Paid</dt>
            <dd>{p.paidAt ?? "—"}</dd>
          </dl>
        )}

        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className="wb-alert"
            data-tone={message.ok ? "ok" : undefined}
          >
            {message.text}
          </p>
        )}
      </div>
    </WbSection>
  );
}
