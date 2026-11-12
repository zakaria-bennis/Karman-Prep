"use client";

// ============================================================
// /admin/schools: "Create school". Name, free-until date (one
// year out by default), the school admin's email (an existing
// account) and, optionally, the request it answers. Picking a
// request fills in its school and email. actions.ts checks it
// all again.
// ============================================================

import { useRouter } from "next/navigation";
import { useState, useTransition, type CSSProperties } from "react";
import { createSchool } from "./actions";

export interface RequestOption {
  id: string;
  school: string;
  email: string;
}

const form: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "end",
  maxWidth: 920,
};

export default function CreateSchoolForm({
  requests,
  defaultFreeUntil,
  minFreeUntil,
}: {
  requests: RequestOption[];
  defaultFreeUntil: string;
  minFreeUntil: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [requestId, setRequestId] = useState("");
  const [name, setName] = useState("");
  const [freeUntil, setFreeUntil] = useState(defaultFreeUntil);
  const [adminEmail, setAdminEmail] = useState("");

  function pick(id: string) {
    setRequestId(id);
    const r = requests.find((x) => x.id === id);
    if (r) {
      setName(r.school);
      setAdminEmail(r.email);
    }
  }

  return (
    <form
      style={form}
      aria-label="Create a school"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        start(async () => {
          const r = await createSchool({ name, freeUntil, adminEmail, requestId });
          if (r.ok) {
            setMessage({ ok: true, text: r.message });
            setRequestId("");
            setName("");
            setAdminEmail("");
            setFreeUntil(defaultFreeUntil);
            router.refresh();
          } else setMessage({ ok: false, text: r.error });
        });
      }}
    >
      {requests.length > 0 && (
        <label className="wb-field">
          <span>From a request (optional)</span>
          <select className="wb-select" value={requestId} onChange={(e) => pick(e.target.value)}>
            <option value="">None</option>
            {requests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.school} ({r.email})
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="wb-field">
        <span>School name</span>
        <input
          className="wb-input"
          type="text"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="wb-field">
        <span>Free until</span>
        <input
          className="wb-input"
          type="date"
          required
          min={minFreeUntil}
          value={freeUntil}
          onChange={(e) => setFreeUntil(e.target.value)}
        />
      </label>
      <label className="wb-field">
        <span>School admin&apos;s email</span>
        <input
          className="wb-input"
          type="email"
          required
          maxLength={254}
          autoComplete="off"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          aria-describedby="create-school-note"
        />
      </label>
      <button type="submit" className="wb-btn" disabled={pending}>
        {pending ? "Creating…" : "Create school"}
      </button>
      <p id="create-school-note" className="wb-note" style={{ gridColumn: "1 / -1", margin: 0 }}>
        The school admin needs a Karman account with this email first. Nothing is emailed to them.
      </p>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={message.ok ? "wb-note" : "wb-alert"}
          style={{ gridColumn: "1 / -1", margin: 0 }}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
