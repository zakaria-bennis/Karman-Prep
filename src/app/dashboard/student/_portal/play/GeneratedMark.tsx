"use client";
// The admin-only "Generated" mark (shared contract 2 of the overnight build): a question the
// generator made shows a small mark for an admin, in the Mistake Log as in the quiz. The server
// decides (actionGeneratedIds checks the admin role); a student's answer is always "none", so a
// student never sees the mark and no student payload ever carries where a question came from.
import { useEffect, useState } from "react";
import { actionGeneratedIds } from "@/app/learn/play-actions";

/** Answers already asked, so each question is asked about once a page. */
const known = new Map<string, boolean>();

export function GeneratedMark({ questionId }: { questionId?: string }) {
  const [generated, setGenerated] = useState(() => !!questionId && known.get(questionId) === true);
  useEffect(() => {
    if (!questionId) return;
    if (known.has(questionId)) return setGenerated(known.get(questionId) === true);
    let live = true;
    actionGeneratedIds({ questionIds: [questionId] })
      .then((r) => {
        const yes = r.ok && r.value.includes(questionId);
        known.set(questionId, yes);
        if (live) setGenerated(yes);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [questionId]);
  if (!generated) return null;
  return (
    <span
      title="Made by the question generator (only admins see this)"
      style={{
        display: "inline-block",
        marginLeft: 8,
        padding: "2px 8px",
        borderRadius: 999,
        font: "650 11px/1.5 var(--font-hanken, system-ui)",
        letterSpacing: "0.02em",
        background: "rgb(127 127 127 / 0.18)",
        boxShadow: "inset 0 0 0 1px rgb(127 127 127 / 0.35)",
        verticalAlign: "middle",
      }}
    >
      Generated
    </span>
  );
}
