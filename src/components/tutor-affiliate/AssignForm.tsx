"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Cta, SectionHeader } from "@/components/portal";
import { assignHomeworkAction } from "@/app/tutor/affiliate-actions";
import "./affiliate.css";

type Kind = "skill_practice" | "domain_quiz" | "full_length_test";

interface Option {
  id: string;
  label: string;
  group: string;
}

const KINDS: { value: Kind; label: string }[] = [
  { value: "skill_practice", label: "Skill practice" },
  { value: "domain_quiz", label: "Domain quiz" },
  { value: "full_length_test", label: "Full-length test" },
];

function inDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function grouped(options: Option[]): [string, Option[]][] {
  const map = new Map<string, Option[]>();
  for (const option of options) map.set(option.group, [...(map.get(option.group) ?? []), option]);
  return [...map.entries()];
}

/** Assign one piece of work with a due date; it shows in the student's Homework. */
export default function AssignForm({
  studentClerkId,
  firstName,
  skills,
  domains,
}: {
  studentClerkId: string;
  firstName: string;
  skills: Option[];
  domains: Option[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("skill_practice");
  const [target, setTarget] = useState("");
  const [dueOn, setDueOn] = useState(inDays(7));
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const options = kind === "skill_practice" ? skills : kind === "domain_quiz" ? domains : [];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (kind !== "full_length_test" && !target) {
      setStatus({ text: "Pick what to practice first.", error: true });
      return;
    }
    startTransition(async () => {
      const result = await assignHomeworkAction({
        studentClerkId,
        kind,
        targetId: kind === "full_length_test" ? null : target,
        dueOn,
        note: note.trim() ? note.trim() : null,
      });
      if (result.ok) {
        setStatus({ text: result.message ?? "Assigned." });
        setTarget("");
        setNote("");
        router.refresh();
      } else {
        setStatus({ text: result.error, error: true });
      }
    });
  }

  return (
    <Card>
      <SectionHeader title={`Assign work to ${firstName}`} />
      <form className="ka-stack" onSubmit={submit}>
        <fieldset className="ka-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ marginBottom: 6 }}>What kind</legend>
          <div className="kp-cta-row">
            {KINDS.map((k) => (
              <label
                key={k.value}
                style={{ display: "inline-flex", gap: 8, minHeight: 44, alignItems: "center" }}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k.value}
                  checked={kind === k.value}
                  onChange={() => {
                    setKind(k.value);
                    setTarget("");
                  }}
                />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>
        {kind !== "full_length_test" && (
          <label className="ka-field">
            {kind === "skill_practice" ? "Skill" : "Domain"}
            <select className="ka-input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Choose…</option>
              {grouped(options).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        )}
        <div className="ka-pair">
          <label className="ka-field">
            Due
            <input
              className="ka-input"
              type="date"
              value={dueOn}
              min={inDays(0)}
              onChange={(e) => setDueOn(e.target.value)}
              required
            />
          </label>
          <label className="ka-field">
            Note <small>Optional</small>
            <input
              className="ka-input"
              type="text"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>
        <div>
          <Cta type="submit" disabled={pending}>
            {pending ? "Assigning…" : "Assign"}
          </Cta>
        </div>
        <p className="ka-status" role="status" data-tone={status?.error ? "error" : undefined}>
          {status?.text ?? ""}
        </p>
      </form>
    </Card>
  );
}
