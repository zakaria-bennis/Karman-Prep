"use client";

// ============================================================
// The decision box on a scholarship claim: approve (with a note
// when the automatic check didn't pass), reject with a reason,
// re-run the check, undo a decision, and pay in Stripe test mode.
// ============================================================

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { WbSection } from "@/components/admin/workbench";
import {
  actionApproveScholarship,
  actionPayScholarship,
  actionRejectScholarship,
  actionReopenScholarship,
  actionRerunScholarshipCheck,
} from "../actions";

type Result = { ok: true } | { ok: false; error: string };

interface Props {
  claimId: string;
  status: "submitted" | "approved" | "rejected" | "paid";
  verdict: "pass" | "warn" | "fail" | null;
  payoutStatus: string;
  payoutError: string | null;
  reviewReason: string | null;
  isTop: boolean;
  refundLabel: string;
  bonusLabel: string;
  paid: {
    refund: string;
    bonus: string;
    refundId: string | null;
    bonusId: string | null;
    paidAt: string;
  } | null;
}

export default function ReviewPanel(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [paymentId, setPaymentId] = useState("");

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

  return (
    <WbSection title="Decision">
      <div className="wb-grid">
        {p.status === "submitted" && (
          <>
            {!p.isTop && (
              <p className="wb-note">
                Another claim in this cohort has a higher score. Only the top claim can be approved.
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
                disabled={pending || !p.isTop || (needsNote && note.trim().length < 3)}
                onClick={() =>
                  run(
                    () => actionApproveScholarship({ claimId: p.claimId, note }),
                    "Approved. The payout is next."
                  )
                }
              >
                Approve the scholarship
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

        {(rejecting || (p.status === "approved" && rejecting)) && (
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

        {p.status === "approved" && (
          <>
            <p className="wb-note">
              The payout refunds the cohort payment ({p.refundLabel}) and credits a {p.bonusLabel}{" "}
              merit bonus to the family&apos;s Stripe balance. It runs in Stripe test mode only, and
              every step is safe to retry.
            </p>
            {p.payoutStatus === "refunded" && (
              <p className="wb-alert">
                The refund went through; the bonus didn&apos;t. Pay again to finish.
              </p>
            )}
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
                    "Paid in Stripe test mode."
                  )
                }
              >
                {pending ? "Paying…" : "Pay in Stripe test mode"}
              </button>
              {p.payoutStatus === "none" && (
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
              {p.payoutStatus === "none" && !rejecting && (
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

        {p.status === "paid" && p.paid && (
          <dl className="wb-dl">
            <dt>Refunded</dt>
            <dd>
              {p.paid.refund} <small>{p.paid.refundId}</small>
            </dd>
            <dt>Merit bonus</dt>
            <dd>
              {p.paid.bonus} as a customer balance credit <small>{p.paid.bonusId}</small>
            </dd>
            <dt>Paid</dt>
            <dd>{p.paid.paidAt}</dd>
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
