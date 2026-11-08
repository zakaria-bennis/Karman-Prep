"use client";

/*
 * Booked sessions: 1:1s (move once, cancel) and cohort classes. Move and Cancel are quiet text
 * buttons wired to the existing booking flow (/api/bookings/reschedule and /cancel). Cancelling
 * asks first, and says plainly when it would use up the session (inside 24 hours).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CHANGE_WINDOW_HOURS,
  changeFailedMessage,
  type BookedSession,
} from "@/lib/student/calendar";
import JoinButton from "../JoinButton";
import SlotPicker from "./SlotPicker";
import styles from "./calendar.module.css";

export interface BookedRow extends BookedSession {
  /** "Tomorrow, 4:00 PM", in the student's zone. */
  when: string;
  /** Starting within 30 minutes or under way: the Join link shows. */
  joinable: boolean;
}

type Mode = "idle" | "confirm" | "move";

const PREVIEW = "You’re previewing this student, so sessions can’t be changed here.";
const NO_CALENDAR =
  "Moving needs your tutor’s booking calendar, which isn’t set up yet. Email your tutor and they’ll move it.";

function Item({ row, preview }: { row: BookedRow; preview: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; late?: boolean } | null>(null);
  const who = row.tutorName ? `with ${row.tutorName}, on Zoom` : "on Zoom";
  const tutor = row.moveWith;

  function startMove() {
    setMessage(null);
    if (preview) return setMessage({ text: PREVIEW });
    if (!tutor || tutor.eventTypeId === null) {
      console.warn("[student calendar] move unavailable: tutor booking calendar not set up");
      return setMessage({ text: NO_CALENDAR });
    }
    setMode(mode === "move" ? "idle" : "move");
  }

  function startCancel() {
    setMessage(null);
    if (preview) return setMessage({ text: PREVIEW });
    setMode(mode === "confirm" ? "idle" : "confirm");
  }

  async function cancel() {
    setBusy(true);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: row.id }),
      });
      if (!res.ok) {
        console.warn("[student calendar] cancel failed:", res.status);
        setMessage({ text: changeFailedMessage("cancel", res.status), late: true });
        setMode("idle");
        return;
      }
      setMode("idle");
      setMessage({ text: "Cancelled." });
      router.refresh();
    } catch (err) {
      console.warn("[student calendar] cancel request failed:", err);
      setMessage({ text: changeFailedMessage("cancel", null), late: true });
      setMode("idle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.session}>
      <span className={styles.what}>
        <b>{row.title}</b>
        <small>
          {row.when} &middot; {who}
          {row.moved ? " · moved once" : ""}
        </small>
      </span>
      <span className={styles.actions}>
        {row.joinable && row.joinUrl && <JoinButton href={row.joinUrl} what={row.title} />}
        {row.canMove && (
          <button
            type="button"
            className={styles.quiet}
            aria-expanded={mode === "move"}
            onClick={startMove}
          >
            Move
          </button>
        )}
        {row.canCancel && (
          <button
            type="button"
            className={styles.quiet}
            aria-expanded={mode === "confirm"}
            onClick={startCancel}
          >
            Cancel
          </button>
        )}
      </span>
      {mode === "confirm" && (
        <div className={styles.panelBox} role="group" aria-label="Cancel this session?">
          <p>
            {row.late
              ? `It starts in less than ${CHANGE_WINDOW_HOURS} hours, so cancelling now uses up this session.`
              : `Cancel this session? It’s free until ${CHANGE_WINDOW_HOURS} hours before.`}
          </p>
          <div className={styles.buttons}>
            <button type="button" className={styles.quiet} disabled={busy} onClick={cancel}>
              {busy ? "Cancelling…" : "Yes, cancel it"}
            </button>
            <button
              type="button"
              className={styles.quiet}
              disabled={busy}
              onClick={() => setMode("idle")}
            >
              Keep it
            </button>
          </div>
        </div>
      )}
      {mode === "move" && tutor && tutor.eventTypeId !== null && (
        <div className={styles.panelBox}>
          <SlotPicker
            eventTypeId={tutor.eventTypeId}
            tutorClerkId={tutor.clerkId}
            tutorName={row.tutorName ?? tutor.name}
            bookingId={row.id}
            onDone={(text) => {
              setMode("idle");
              setMessage({ text });
            }}
          />
          <div className={styles.buttons}>
            <button type="button" className={styles.quiet} onClick={() => setMode("idle")}>
              Keep the current time
            </button>
          </div>
        </div>
      )}
      {message && (
        <p
          role={message.late ? "alert" : "status"}
          className={styles.message}
          data-tone={message.late ? "late" : undefined}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

export default function BookedList({ rows, preview }: { rows: BookedRow[]; preview: boolean }) {
  return (
    <div className={styles.list}>
      {rows.map((row) => (
        <Item key={`${row.kind}:${row.id}`} row={row} preview={preview} />
      ))}
    </div>
  );
}
