"use client";

// The cookie page's own switch (founder, 2026-11-12): the cookie note never comes back once
// answered, so this is where a visitor changes their mind. It writes the same consent cookie as
// the note (POST /api/consent). Choosing "Essentials only" also forgets this device's visit ids,
// so nothing already stored for counting visits stays behind.
import { useEffect, useState } from "react";

type Choice = "yes" | "no";
const CONSENT_COOKIE = "karman_replay_consent";
const VISIT_IDS = ["karman-aid", "karman-visit"];

function readChoice(): Choice | null {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  const value = hit?.split("=")[1];
  return value === "yes" || value === "no" ? value : null;
}

export default function ConsentChoice() {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => setChoice(readChoice()), []);

  async function save(next: Choice) {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      if (next === "no") {
        try {
          for (const key of VISIT_IDS) window.localStorage.removeItem(key);
        } catch {
          // Storage can be blocked; the server still drops events without a yes.
        }
      }
      setChoice(next);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const now =
    choice === "yes"
      ? "You chose Allow all."
      : choice === "no"
        ? "You chose Essentials only."
        : "You haven't chosen yet.";

  return (
    <div className="consent-choice">
      <p aria-live="polite">{error ? "That didn't save. Please try again." : now}</p>
      <div>
        <button
          type="button"
          onClick={() => save("yes")}
          disabled={busy || choice === "yes"}
          aria-pressed={choice === "yes"}
        >
          Allow all
        </button>
        <button
          type="button"
          onClick={() => save("no")}
          disabled={busy || choice === "no"}
          aria-pressed={choice === "no"}
        >
          Essentials only
        </button>
      </div>
    </div>
  );
}
