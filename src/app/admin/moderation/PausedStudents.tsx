"use client";

// Students whose chats the moderation check has paused (answer-sharing twice, or sexual content).
// They cannot send anything until an admin has looked and lifts the pause here. Their flagged
// messages are under the Rejected tab.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PausedStudent } from "@/lib/chat/standing";

const WHY = {
  integrity: "Passing answers, flagged more than once",
  content: "Sexual content",
} as const;

export default function PausedStudents({ students }: { students: PausedStudent[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  if (students.length === 0) return null;

  const lift = async (student: PausedStudent) => {
    setBusy(student.userUuid);
    setFailed(null);
    const res = await fetch("/api/admin/moderation/lift-pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserUuid: student.userUuid }),
    });
    setBusy(null);
    if (!res.ok) return setFailed(`Could not lift the pause for ${student.name}. Try again.`);
    startTransition(() => router.refresh());
  };

  return (
    <section aria-label="Paused students" style={{ marginBottom: 24 }}>
      <h2>Chats paused</h2>
      <p>These students cannot send messages until you lift the pause.</p>
      {failed && <p role="alert">{failed}</p>}
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {students.map((s) => (
          <li
            key={s.userUuid}
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}
          >
            <span style={{ flex: "1 1 240px" }}>
              <b>{s.name}</b> <small>{s.email}</small>
              <br />
              <small>
                {WHY[s.reason]}. Paused{" "}
                {new Date(s.pausedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                .
              </small>
            </span>
            <button
              type="button"
              className="wb-btn"
              disabled={pending || busy === s.userUuid}
              onClick={() => lift(s)}
            >
              {busy === s.userUuid ? "Lifting" : "Lift pause"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
