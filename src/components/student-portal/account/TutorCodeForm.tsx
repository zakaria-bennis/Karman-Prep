"use client";

/* Redeem a tutor's code. The answer says exactly what happened: joined, already in, or why not. */
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { actionRedeemTutorCode } from "@/app/dashboard/student/account/actions";
import s from "./account.module.css";

export default function TutorCodeForm({ locked }: { locked: string | null }) {
  const router = useRouter();
  const id = useId();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return setStatus({ tone: "error", text: locked });
    if (!code.trim()) return setStatus({ tone: "error", text: "Enter your tutor's code." });
    setStatus(null);
    start(async () => {
      const r = await actionRedeemTutorCode({ code });
      if (!r.ok) return setStatus({ tone: "error", text: r.error });
      setCode("");
      setStatus({ tone: "good", text: r.message });
      router.refresh();
    });
  }

  return (
    <form className={s.form} onSubmit={redeem} noValidate>
      <div className={s.field}>
        <label className={s.label} htmlFor={`${id}-code`}>
          Code
        </label>
        <input
          id={`${id}-code`}
          className={s.input}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          placeholder="ABCD-EFGH"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <div className={s.actions}>
        <button type="submit" className={s.button} disabled={pending}>
          {pending ? "Checking" : "Redeem"}
        </button>
        {status && (
          <p className={s.status} data-tone={status.tone} role="status">
            {status.text}
          </p>
        )}
      </div>
    </form>
  );
}
