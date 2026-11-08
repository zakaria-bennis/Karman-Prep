"use client";

/* The Calendar's one main button: book a 1:1 with your tutor (plans with 1:1s only). */
import { useState } from "react";
import { Cta } from "@/components/portal";
import SlotPicker from "./SlotPicker";
import styles from "./calendar.module.css";

export default function BookSession({
  tutor,
  preview,
}: {
  tutor: { clerkId: string; name: string; eventTypeId: number };
  preview: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className={styles.cta}>
      <Cta
        aria-expanded={open}
        onClick={() => {
          if (preview) {
            setMessage("You’re previewing this student, so sessions can’t be booked here.");
            return;
          }
          setMessage(null);
          setOpen((v) => !v);
        }}
      >
        Book a session
      </Cta>
      {open && (
        <div className={styles.panelBox}>
          <SlotPicker
            eventTypeId={tutor.eventTypeId}
            tutorClerkId={tutor.clerkId}
            tutorName={tutor.name}
            onDone={(text) => {
              setOpen(false);
              setMessage(text);
            }}
          />
        </div>
      )}
      {message && (
        <p role="status" className={styles.message}>
          {message}
        </p>
      )}
    </div>
  );
}
