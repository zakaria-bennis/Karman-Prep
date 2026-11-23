"use client";

// The tutor's one tap that sends this week's curated review set to the student's Homework.
import { useState, useTransition } from "react";
import { Cta } from "@/components/portal";
import { actionSendReviewSet } from "@/lib/portal/review-set-actions";

export function SendReviewSet({
  setId,
  studentClerkId,
  firstName,
}: {
  setId: string;
  studentClerkId: string;
  firstName: string;
}) {
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  if (said?.ok) return <p className="kp-meta">Sent to {firstName}&rsquo;s Homework.</p>;
  return (
    <div className="kp-actions-row">
      <Cta
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={() =>
          start(async () => {
            const r = await actionSendReviewSet({ setId, studentClerkId });
            setSaid(r.ok ? { ok: true, text: "" } : { ok: false, text: r.error });
          })
        }
      >
        {busy ? "Sending…" : `Send to ${firstName}`}
      </Cta>
      {said && !said.ok && (
        <span className="kp-meta" role="alert">
          {said.text}
        </span>
      )}
    </div>
  );
}
