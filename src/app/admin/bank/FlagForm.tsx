"use client";

// ============================================================
// Flag a question for the import team, and mark a flag resolved.
// Both call the server actions in ./actions, which validate and
// check the admin role again on the server.
// ============================================================

import { useState, useTransition, type FormEvent } from "react";
import { flagQuestion, resolveFlag, type FlagActionResult } from "./actions";

export function FlagForm({
  questionId,
  reasons,
}: {
  questionId: string;
  reasons: ReadonlyArray<{ value: string; label: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FlagActionResult | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const next = await flagQuestion({
        questionId,
        reason: String(data.get("reason") ?? ""),
        note: String(data.get("note") ?? ""),
      });
      setResult(next);
      // Keep what was typed when it did not save, so nothing is lost.
      if (next.ok) form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label className="wb-field">
        <span>Reason</span>
        <select className="wb-select" name="reason" required defaultValue="">
          <option value="" disabled>
            Pick a reason
          </option>
          {reasons.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
      </label>
      <label className="wb-field">
        <span>Note (optional)</span>
        <textarea
          className="wb-textarea"
          name="note"
          rows={4}
          maxLength={2000}
          placeholder="What is wrong, and where?"
        />
      </label>
      <div>
        <button className="wb-btn" data-variant="primary" type="submit" disabled={pending}>
          {pending ? "Flagging…" : "Flag for the import team"}
        </button>
      </div>
      {result && !result.ok && (
        <p role="alert" className="wb-alert">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <p role="status" className="wb-alert" data-tone="ok">
          Flagged. It is now in the open flags list.
        </p>
      )}
    </form>
  );
}

export function ResolveFlagButton({ flagId, questionId }: { flagId: string; questionId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
      <button
        className="wb-btn"
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const next = await resolveFlag({ flagId, questionId });
            setError(next.ok ? null : next.error);
          })
        }
      >
        {pending ? "Saving…" : "Mark resolved"}
      </button>
      {error && (
        <p role="alert" className="wb-alert">
          {error}
        </p>
      )}
    </div>
  );
}
