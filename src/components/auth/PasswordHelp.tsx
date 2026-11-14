"use client";

// The password rules on Get started (founder, 2026-11-13): a small "i" inside the password pill, and a list
// that opens the moment the visitor starts on a password and ticks itself off as they type. Clerk draws the
// password field, so this finds it inside Clerk's form and places itself there. It only counts the letters
// typed; the password itself is never read or kept.
// The rules are Clerk's settings: 15 characters or more (the NIST figure for a password used on its own), and
// not a password found in a known leak, which Clerk checks on Continue. There are no symbol or number rules.
import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

/** Clerk's minimum password length (Clerk dashboard, password settings). */
const MIN_LENGTH = 15;

export default function PasswordHelp({ within }: { within: RefObject<HTMLDivElement | null> }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  // Clerk draws its form after this mounts, and redraws it between steps
  useEffect(() => {
    const root = within.current;
    if (!root) return;
    const find = () =>
      setHost(
        root.querySelector<HTMLElement>(
          ":is(.cl-signUp-start, .cl-signUp-root) .cl-formField__password"
        )
      );
    find();
    const watch = new MutationObserver(find);
    watch.observe(root, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, [within]);

  useEffect(() => {
    if (!host) return;
    const typed = (e: Event) => {
      const el = e.target as HTMLInputElement;
      if (el.matches?.("input")) setCount(el.value.length);
    };
    const show = (e: Event) => {
      if ((e.target as HTMLElement).matches?.("input")) setOpen(true);
    };
    host.addEventListener("input", typed);
    host.addEventListener("focusin", show);
    return () => {
      host.removeEventListener("input", typed);
      host.removeEventListener("focusin", show);
    };
  }, [host]);

  if (!host) return null;
  const long = count >= MIN_LENGTH;
  return createPortal(
    <>
      <button
        type="button"
        className="cb-pw-i"
        aria-label="Password rules"
        aria-expanded={open}
        aria-controls="cb-pw-rules"
        onClick={() => setOpen((o) => !o)}
      >
        i
      </button>
      <ul className="cb-pw" id="cb-pw-rules" hidden={!open} aria-live="polite">
        <li data-ok={long ? "" : undefined}>
          <i aria-hidden="true" />
          {MIN_LENGTH} characters or more
          <b>{long ? "Done" : `${count} of ${MIN_LENGTH}`}</b>
        </li>
        <li data-note="">
          <i aria-hidden="true" />
          Not one found in a data leak. We check when you continue.
        </li>
        <li data-note="">
          <i aria-hidden="true" />
          No symbols needed. A few unrelated words work well.
        </li>
      </ul>
    </>,
    host
  );
}
