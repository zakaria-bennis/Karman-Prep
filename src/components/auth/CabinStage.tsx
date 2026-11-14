"use client";

// The warm sign-in (founder, 2026-11-13): the snowy cabin behind (CabinScene), a greeting that types itself
// in, and Clerk's own form restyled as warm pills (cabin.css, by Clerk's class names). Clerk does all the
// signing in, so every later step (the emailed code, a password, errors) is Clerk's too.
// The ways in are whichever are switched on in Clerk. When Google or Microsoft is on, they show as pills, Google
// first, and email folds behind a third pill, "Continue with email". When neither is on, the email field
// simply shows.
// On this computer Clerk's form cannot draw (the live keys only work on karmanprep.com), so on the dev server
// a stand-in with the same parts and the same class names takes its place. It signs nobody in.
import { useEffect, useRef, useState } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import CabinScene from "./CabinScene";
import PasswordHelp from "./PasswordHelp";

const DEV = process.env.NODE_ENV !== "production";

/** Clerk works out its own colours from these, so the steps this file does not restyle still read well on
 *  the night scene. Everything on the first step is then set in cabin.css. */
const APPEARANCE = {
  layout: {
    logoPlacement: "none" as const,
    socialButtonsVariant: "blockButton" as const,
    socialButtonsPlacement: "top" as const,
  },
  variables: {
    colorPrimary: "#ffc98a",
    colorTextOnPrimaryBackground: "#2a1c16",
    colorBackground: "transparent",
    colorText: "#fff3df",
    colorTextSecondary: "#f1dcc4",
    colorInputBackground: "#fff6e8",
    colorInputText: "#2a1c16",
    colorDanger: "#ffb4ab",
    borderRadius: "1.5rem",
    fontFamily: "var(--font-hanken), system-ui, sans-serif",
    fontSize: "1rem",
  },
};

const LOGO = {
  Google: (
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
  Microsoft: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#f25022" d="M2 2h9.500v9.500H2z" />
      <path fill="#7fba00" d="M12.500 2H22v9.500h-9.500z" />
      <path fill="#00a4ef" d="M2 12.500h9.500V22H2z" />
      <path fill="#ffb900" d="M12.500 12.500H22V22h-9.500z" />
    </svg>
  ),
};

const MAIL = (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5.500" width="18" height="13" rx="3.500" />
    <path d="M4.500 8l7.500 5.500L19.500 8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Dev server only: Clerk's first step as it looks with Google and Microsoft switched on, built from Clerk's own
 *  class names, for judging the design. */
function StandIn({ mode }: { mode: "sign-in" | "sign-up" }) {
  const step = mode === "sign-in" ? "cl-signIn-start" : "cl-signUp-start";
  return (
    <div className="cl-rootBox">
      <div className={`cl-cardBox ${step}`}>
        <div className={`cl-card ${step}`}>
          <div className="cl-main">
            <div className="cl-socialButtons">
              {(["Microsoft", "Google"] as const).map((k) => (
                <button
                  type="button"
                  key={k}
                  className={`cl-socialButtonsBlockButton cl-socialButtonsBlockButton__${k.toLowerCase()}`}
                >
                  <span className="cl-socialButtonsProviderIcon">{LOGO[k]}</span>
                  <span className="cl-socialButtonsBlockButtonText">Continue with {k}</span>
                </button>
              ))}
            </div>
            <div className="cl-dividerRow">
              <div className="cl-dividerLine" />
              <p className="cl-dividerText">or</p>
              <div className="cl-dividerLine" />
            </div>
            <form className="cl-form" onSubmit={(e) => e.preventDefault()}>
              <div className="cl-formField">
                <label className="cl-formFieldLabel" htmlFor="standin-email">
                  Email address
                </label>
                <input
                  id="standin-email"
                  className="cl-formFieldInput"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email address"
                />
              </div>
              {mode === "sign-up" ? (
                <div className="cl-formField cl-formField__password">
                  <label className="cl-formFieldLabel" htmlFor="standin-password">
                    Password
                  </label>
                  <div className="cl-formFieldInputGroup" style={{ position: "relative" }}>
                    <input
                      id="standin-password"
                      className="cl-formFieldInput"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      className="cl-formFieldInputShowPasswordButton"
                      style={{
                        position: "absolute",
                        right: 14,
                        top: 0,
                        height: "100%",
                        background: "none",
                      }}
                    >
                      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                        <path
                          d="M1.500 8s2.500-4.500 6.500-4.500S14.500 8 14.500 8 12 12.500 8 12.500 1.500 8 1.500 8z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.400"
                        />
                        <circle cx="8" cy="8" r="2" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : null}
              <button type="submit" className="cl-formButtonPrimary">
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      {/* one inline run, so the caret stays at the end of the last word */}
      <span className="cb-line" aria-hidden="true">
        {text}
        <i
          className="cb-caret"
          data-idle={text ? undefined : ""}
          data-done={text === full && full ? "" : undefined}
        />
      </span>
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
  /** The visitor chose email, so Clerk's email field is unfolded. */
  const [email, setEmail] = useState(false);
  /** Dev server only: Clerk's form has not appeared, so the stand-in shows. */
  const [standIn, setStandIn] = useState(false);
  const form = useRef<HTMLDivElement>(null);
  const up = mode === "sign-up";

  useEffect(() => {
    if (!DEV) return;
    const wait = setTimeout(() => setStandIn(!form.current?.querySelector(".cl-card")), 2500);
    return () => clearTimeout(wait);
  }, []);

  // once the email field is unfolded, the cursor goes straight into it
  useEffect(() => {
    if (email) form.current?.querySelector<HTMLInputElement>(".cl-formFieldInput")?.focus();
  }, [email]);

  return (
    <section className="cb" data-email={email ? "" : undefined}>
      <CabinScene />
      <div className="cb-in">
        <Typed pool={greetings} />
        <div className="cb-form" ref={form}>
          {standIn ? (
            <StandIn mode={mode} />
          ) : up ? (
            <SignUp
              routing="path"
              path="/auth/sign-up"
              signInUrl="/auth/sign-in"
              appearance={APPEARANCE}
            />
          ) : (
            <SignIn
              routing="path"
              path="/auth/sign-in"
              signUpUrl="/auth/sign-up"
              appearance={APPEARANCE}
            />
          )}
          <button type="button" className="cb-email-pill" onClick={() => setEmail(true)}>
            {MAIL}
            Continue with email
          </button>
          {up ? <PasswordHelp within={form} /> : null}
        </div>
        <p className="cb-foot">
          {up ? "Already have an account?" : "New here?"}{" "}
          <a href={up ? "/auth/sign-in" : "/auth/sign-up"}>{up ? "Sign in" : "Get started"}</a>
        </p>
      </div>
    </section>
  );
}
