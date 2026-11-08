"use client";

/* Invite a parent: their email (and first name, if the student likes). It says plainly whether an email went out. */
import { useId, useState, useTransition } from "react";
import { actionInviteParent } from "@/app/dashboard/student/account/actions";
import s from "./account.module.css";

export default function ParentInviteForm({
  savedEmail,
  locked,
}: {
  savedEmail: string | null;
  locked: string | null;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [saved, setSaved] = useState(savedEmail);
  const [status, setStatus] = useState<{ tone: "good" | "error" | "plain"; text: string } | null>(
    null
  );
  const [pending, start] = useTransition();

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return setStatus({ tone: "error", text: locked });
    if (!email.trim())
      return setStatus({ tone: "error", text: "Enter your parent's email address." });
    setStatus(null);
    start(async () => {
      const r = await actionInviteParent({
        email,
        ...(firstName.trim() ? { firstName } : {}),
      });
      if (!r.ok) return setStatus({ tone: "error", text: r.error });
      setSaved(r.email);
      setEmail("");
      setFirstName("");
      setStatus({ tone: r.sent ? "good" : "plain", text: r.message });
    });
  }

  return (
    <form className={s.form} onSubmit={send} noValidate>
      {saved && (
        <p className={`${s.line} ${s.mute}`}>
          Saved for <b>{saved}</b>
        </p>
      )}
      <div className={s.field}>
        <label className={s.label} htmlFor={`${id}-email`}>
          Parent&rsquo;s email
        </label>
        <input
          id={`${id}-email`}
          className={s.input}
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className={s.field}>
        <label className={s.label} htmlFor={`${id}-name`}>
          Their first name (optional)
        </label>
        <input
          id={`${id}-name`}
          className={s.input}
          type="text"
          autoComplete="off"
          maxLength={60}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>
      <div className={s.actions}>
        <button type="submit" className={s.button} disabled={pending}>
          {pending ? "Sending" : "Send invite"}
        </button>
        {status && (
          <p
            className={s.status}
            data-tone={status.tone === "plain" ? undefined : status.tone}
            role="status"
          >
            {status.text}
          </p>
        )}
      </div>
    </form>
  );
}
