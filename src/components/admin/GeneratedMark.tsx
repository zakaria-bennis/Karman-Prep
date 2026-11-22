"use client";

// The admin's "Generated" mark on a question, with a Report button that pulls a bad one out of every
// pool (founder, 2026-11-22 round 2). Render it only for ids that generatedMarks() returned: that
// server action answers only an admin, so a student never gets an id to mark.
import { useState, useTransition } from "react";
import { reportGenerated } from "@/app/admin/generated/actions";
import styles from "./GeneratedMark.module.css";

export default function GeneratedMark({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "done" | string>("idle");
  const [pending, start] = useTransition();

  if (state === "done")
    return (
      <span className={styles.mark} role="status">
        Reported: pulled out of practice
      </span>
    );

  return (
    <span className={styles.wrap}>
      <span className={styles.mark}>Generated</span>
      {!open ? (
        <button type="button" className={styles.report} onClick={() => setOpen(true)}>
          Report
        </button>
      ) : (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            start(async () => {
              const result = await reportGenerated({ questionId, reason });
              setState(result.ok ? "done" : result.error);
            });
          }}
        >
          <label className={styles.label}>
            What is wrong?
            <input
              className={styles.input}
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              autoFocus
            />
          </label>
          <button type="submit" className={styles.pull} disabled={pending || !reason.trim()}>
            {pending ? "Pulling it out" : "Pull it out"}
          </button>
          <button type="button" className={styles.report} onClick={() => setOpen(false)}>
            Cancel
          </button>
          {state !== "idle" && (
            <span className={styles.error} role="alert">
              {state}
            </span>
          )}
        </form>
      )}
    </span>
  );
}
