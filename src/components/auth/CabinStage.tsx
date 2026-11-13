"use client";

// The warm sign-in (founder, 2026-11-13): the snowy cabin behind (CabinScene), a greeting that types itself
// in, three pills (Google, Apple, email) and single sign-on as a quiet link under them.
// MOCK: the pills do not sign anyone in yet. Once the founder approves the look, they are wired to Clerk.
import { useEffect, useState } from "react";
import CabinScene from "./CabinScene";

const LOGO = {
  google: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23 12.3c0-.8-.1-1.6-.2-2.300H12v4.400h6.200a5.300 5.300 0 0 1-2.300 3.500v2.900h3.700c2.200-2 3.400-5 3.400-8.500z"
      />
      <path
        fill="#34A853"
        d="M12 23.500c3.100 0 5.700-1 7.600-2.800l-3.700-2.900c-1 .7-2.300 1.100-3.900 1.100-3 0-5.500-2-6.400-4.700H1.800v3A11.500 11.500 0 0 0 12 23.500z"
      />
      <path
        fill="#FBBC05"
        d="M5.600 14.200a6.900 6.900 0 0 1 0-4.400v-3H1.800a11.500 11.500 0 0 0 0 10.400z"
      />
      <path
        fill="#EA4335"
        d="M12 5.100c1.700 0 3.200.6 4.400 1.700l3.300-3.300A11.500 11.500 0 0 0 1.800 6.800l3.800 3C6.500 7.100 9 5.100 12 5.100z"
      />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.500 12.600c0-2.300 1.900-3.400 2-3.500-1.100-1.600-2.800-1.800-3.400-1.800-1.400-.1-2.800.9-3.500.9-.7 0-1.800-.8-3-.8-1.500 0-3 .9-3.700 2.300-1.600 2.800-.4 6.900 1.100 9.200.8 1.100 1.700 2.300 2.900 2.300 1.100 0 1.600-.7 3-.7s1.800.7 3 .7c1.200 0 2-1.100 2.800-2.200.9-1.300 1.200-2.500 1.300-2.600-.1 0-2.500-1-2.500-3.800zM14.200 5.800c.6-.8 1-1.800.9-2.800-.9 0-2 .6-2.600 1.400-.6.700-1.100 1.700-.9 2.700 1 .1 2-.5 2.600-1.300z"
      />
    </svg>
  ),
  email: (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5.500" width="18" height="13" rx="3.500" />
      <path d="M4.500 8l7.500 5.500L19.500 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/** One greeting, picked at random on each visit, typed in a letter at a time. */
function Typed({ pool }: { pool: readonly string[] }) {
  const [text, setText] = useState("");
  const [full, setFull] = useState("");

  useEffect(() => {
    const line = pool[Math.floor(Math.random() * pool.length)];
    setFull(line);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(line);
      return;
    }
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      i += 1;
      setText(line.slice(0, i));
      if (i >= line.length) return;
      const ch = line[i - 1];
      // a breath after a full stop, a shorter one after a comma
      timer = setTimeout(step, ch === "." ? 520 : ch === "," ? 260 : 42 + Math.random() * 46);
    };
    timer = setTimeout(step, 1900);
    return () => clearTimeout(timer);
  }, [pool]);

  return (
    <h1 className="cb-hello" aria-label={full || pool[0]}>
      <span aria-hidden="true">{text}</span>
      <i
        className="cb-caret"
        data-idle={text ? undefined : ""}
        data-done={text === full && full ? "" : undefined}
        aria-hidden="true"
      />
    </h1>
  );
}

export default function CabinStage({
  mode,
  greetings,
}: {
  mode: "sign-in" | "sign-up";
  greetings: readonly string[];
}) {
  const [email, setEmail] = useState(false);
  const up = mode === "sign-up";
  return (
    <section className="cb">
      <CabinScene />
      <div className="cb-in">
        <Typed pool={greetings} />
        <div className="cb-pills">
          <button type="button" className="cb-pill">
            {LOGO.google}
            Continue with Google
          </button>
          <button type="button" className="cb-pill">
            {LOGO.apple}
            Continue with Apple
          </button>
          {email ? (
            <form className="cb-email" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Your email address"
                aria-label="Email address"
                autoFocus
              />
              <button type="submit">Continue</button>
            </form>
          ) : (
            <button type="button" className="cb-pill" onClick={() => setEmail(true)}>
              {LOGO.email}
              Continue with email
            </button>
          )}
        </div>
        <p className="cb-foot">
          <button type="button" className="cb-sso">
            Use single sign-on (SSO)
          </button>
          <span>
            {up ? "Already have an account?" : "New here?"}{" "}
            <a href={`/auth/${up ? "sign-in" : "sign-up"}?o=cabin`}>
              {up ? "Sign in" : "Get started"}
            </a>
          </span>
        </p>
      </div>
    </section>
  );
}
