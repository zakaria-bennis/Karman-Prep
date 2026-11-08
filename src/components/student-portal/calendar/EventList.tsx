"use client";

/* Workshops and office hours, with a real "Save a spot" (and "Can't go" to give it back). */
import { useState, useTransition } from "react";
import type { LiveEvent } from "@/lib/student/calendar";
import { actionSetEventSpot } from "./actions";
import styles from "./calendar.module.css";

export interface EventRow extends LiveEvent {
  /** "Thu, Nov 12, 7:00 PM", in the student's zone. */
  when: string;
}

function Item({ row }: { row: EventRow }) {
  const [saved, setSaved] = useState(row.saved);
  const [message, setMessage] = useState<{ text: string; late?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const who = row.hostName ? `with ${row.hostName}, on Zoom` : "on Zoom";

  function set(save: boolean) {
    setMessage(null);
    start(async () => {
      try {
        const res = await actionSetEventSpot({ eventId: row.id, save });
        if (!res.ok) {
          console.warn("[student calendar] spot not saved:", res.message);
          setMessage({ text: res.message, late: true });
          return;
        }
        setSaved(res.saved);
        setMessage({
          text: res.saved
            ? "Spot saved. The Zoom link comes before it starts."
            : "Spot given back.",
        });
      } catch (err) {
        console.warn("[student calendar] spot request failed:", err);
        setMessage({ text: "That didn’t save. Try again.", late: true });
      }
    });
  }

  return (
    <div className={styles.session}>
      <span className={styles.what}>
        <b>{row.title}</b>
        <small>
          {row.when} &middot; {who}
        </small>
      </span>
      <span className={styles.actions}>
        {saved ? (
          <>
            <span className={styles.state}>Spot saved</span>
            <button
              type="button"
              className={styles.quiet}
              disabled={pending}
              onClick={() => set(false)}
            >
              Can&rsquo;t go
            </button>
          </>
        ) : row.full ? (
          <span className={styles.state}>Full</span>
        ) : (
          <button
            type="button"
            className={styles.quiet}
            disabled={pending}
            onClick={() => set(true)}
          >
            {pending ? "Saving…" : "Save a spot"}
          </button>
        )}
      </span>
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

export default function EventList({ rows }: { rows: EventRow[] }) {
  return (
    <div className={styles.list}>
      {rows.map((row) => (
        <Item key={row.id} row={row} />
      ))}
    </div>
  );
}
