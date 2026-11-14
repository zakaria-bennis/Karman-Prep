"use client";

// The password rules on Get started (founder, 2026-11-13): a small "i" inside the password pill, and a list
// that opens the moment the visitor starts on a password. Each rule is an empty circle until it is met, then
// the circle fills green and a tick draws itself. Clerk draws the password field, so this finds it inside
// Clerk's form and places itself there. It only tests what is typed; the password is never kept.
// The five rules are the founder's, and must match Clerk's password settings (User & authentication,
// Password): 15 characters or more, an uppercase letter, a lowercase letter, a number and a symbol.
import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

/** Clerk's minimum password length (Clerk dashboard, password settings). */
const MIN_LENGTH = 15;

const RULES: [string, (p: string) => boolean][] = [
  [`${MIN_LENGTH} characters or more`, (p) => p.length >= MIN_LENGTH],
  ["An uppercase letter", (p) => /\p{Lu}/u.test(p)],
  ["A lowercase letter", (p) => /\p{Ll}/u.test(p)],
  ["A number", (p) => /\d/.test(p)],
  ["A symbol, like $ or #", (p) => /[^\p{L}\d\s]/u.test(p)],
];

export default function PasswordHelp({ within }: { within: RefObject<HTMLDivElement | null> }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [met, setMet] = useState<boolean[]>(() => RULES.map(() => false));
  /** Counts the times Continue was pressed with a rule unmet, to nudge the list each time. */
  const [nudge, setNudge] = useState(0);

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
      if (el.matches?.("input")) setMet(RULES.map(([, test]) => test(el.value)));
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

  // Clerk's own password rules are a paid feature, so Clerk would accept any 15 characters. Until that is
  // switched on, the form is held here while a rule is unmet: the list opens, the unmet rules are nudged, and
  // the visitor is put back in the password field.
  useEffect(() => {
    const root = within.current;
    if (!root || !host) return;
    const hold = (e: Event) => {
      const input = host.querySelector<HTMLInputElement>("input");
      if (!input || RULES.every(([, test]) => test(input.value))) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
      setNudge((n) => n + 1);
      input.focus();
    };
    root.addEventListener("submit", hold, true);
    return () => root.removeEventListener("submit", hold, true);
  }, [within, host]);

  if (!host) return null;
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
      <ul
        className="cb-pw"
        id="cb-pw-rules"
        hidden={!open}
        aria-live="polite"
        key={nudge}
        data-nudge={nudge ? "" : undefined}
      >
        {RULES.map(([name], i) => (
          <li key={name} data-ok={met[i] ? "" : undefined}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="9" />
              <path pathLength={1} d="M5.500 10.500l3 3 6-7" />
            </svg>
            {name}
            <span className="cb-sr">{met[i] ? ", done" : ", still needed"}</span>
          </li>
        ))}
      </ul>
    </>,
    host
  );
}
