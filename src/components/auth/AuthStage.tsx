"use client";

// The sign-in and Get started pages, in the home page's world: the live landscape behind, a serif headline on
// the left, and Clerk's form on the right as a frosted-glass panel that slides in (centred on a phone). The
// form is restyled in auth.css by Clerk's own class names, so it follows day and night with the page. The
// ways in (Google, Apple, a texted code, email) are whichever are switched on in Clerk; each button's logo
// pops in once and then sits still.
// On this computer Clerk's form cannot draw (the live keys only work on karmanprep.com), so on the dev server
// a stand-in with the same parts and the same class names takes its place. It signs nobody in.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { AUTH_OPTIONS, type AuthOption } from "./auth-option-list";

const DEV = process.env.NODE_ENV !== "production";

/** Clerk draws its own colours from these; everything visible is then set in auth.css. */
const APPEARANCE = {
  layout: { logoPlacement: "none" as const, socialButtonsVariant: "blockButton" as const },
  variables: {
    colorPrimary: "#2449b8",
    borderRadius: "1.5rem",
    fontFamily: "var(--font-hanken), system-ui, sans-serif",
    fontSize: "1rem",
  },
};

const LOGOS = {
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
  Apple: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.500 12.600c0-2.300 1.900-3.400 2-3.500-1.100-1.600-2.800-1.800-3.400-1.800-1.400-.1-2.800.9-3.500.9-.7 0-1.800-.8-3-.8-1.500 0-3 .9-3.700 2.300-1.600 2.800-.4 6.900 1.100 9.200.8 1.100 1.700 2.300 2.900 2.300 1.100 0 1.600-.7 3-.7s1.800.7 3 .7c1.200 0 2-1.100 2.800-2.200.9-1.300 1.200-2.500 1.300-2.600-.1 0-2.500-1-2.500-3.800zM14.200 5.800c.6-.8 1-1.800.9-2.800-.9 0-2 .6-2.600 1.400-.6.700-1.100 1.700-.9 2.700 1 .1 2-.5 2.600-1.300z"
      />
    </svg>
  ),
  Phone: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="6.500"
        y="2"
        width="11"
        height="20"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M10.500 18.500h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

/** Dev server only: what Clerk's form looks like, built from its own class names, for judging the design. */
function StandIn({ mode }: { mode: "sign-in" | "sign-up" }) {
  const up = mode === "sign-up";
  return (
    <div className="cl-rootBox">
      <div className="cl-cardBox">
        <div className="cl-card sn-standin">
          <div className="cl-socialButtons">
            {(["Google", "Apple", "Phone"] as const).map((k, i) => (
              <button
                type="button"
                className="cl-socialButtonsBlockButton"
                key={k}
                style={{ "--i": i } as CSSProperties}
              >
                <span className="cl-socialButtonsProviderIcon">{LOGOS[k]}</span>
                <span className="cl-socialButtonsBlockButtonText">
                  Continue with {k === "Phone" ? "phone number" : k}
                </span>
              </button>
            ))}
          </div>
          <div className="sn-or">
            <i className="cl-dividerLine" />
            <span className="cl-dividerText">or</span>
            <i className="cl-dividerLine" />
          </div>
          <label className="cl-formFieldLabel">
            Email address
            <input
              className="cl-formFieldInput"
              type="email"
              placeholder="Email address"
              inputMode="email"
              autoComplete="email"
            />
          </label>
          <button type="button" className="cl-formButtonPrimary">
            Continue
          </button>
        </div>
        <div className="cl-footer">
          <div className="cl-footerAction">
            <span className="cl-footerActionText">
              {up ? "Already have an account?" : "New here?"}
            </span>
            <a className="cl-footerActionLink" href={up ? "/auth/sign-in" : "/auth/sign-up"}>
              {up ? "Sign in" : "Get started"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const OPTION_NAME: Record<AuthOption, string> = {
  now: "Live now",
  a: "A",
  b: "B",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
};

const TICK = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4.500 12.800l4.700 4.700L19.500 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** TEMPORARY: the strip that switches between the layouts on offer. */
function OptionPicker({ mode, option }: { mode: "sign-in" | "sign-up"; option: AuthOption }) {
  const other = mode === "sign-in" ? "sign-up" : "sign-in";
  return (
    <nav className="sn-pick" aria-label="Layouts to choose from">
      {AUTH_OPTIONS.map((o) => (
        <a key={o} href={`/auth/${mode}?o=${o}`} aria-current={o === option ? "page" : undefined}>
          {OPTION_NAME[o]}
        </a>
      ))}
      <a className="sn-pick-flip" href={`/auth/${other}?o=${option}`}>
        {mode === "sign-in" ? "See Get started" : "See Sign in"}
      </a>
    </nav>
  );
}

export default function AuthStage({
  mode,
  headline,
  line,
  option = "now",
  perks = [],
  pitch = [],
}: {
  mode: "sign-in" | "sign-up";
  headline: string;
  line: string;
  option?: AuthOption;
  /** Short facts under the headline (Get started only). */
  perks?: string[];
  /** Big lines set on the landscape in layout 5. */
  pitch?: string[];
}) {
  /** Dev server only: Clerk's form has not appeared, so the stand-in shows. */
  const [standIn, setStandIn] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!DEV) return;
    const el = root.current;
    const wait = setTimeout(
      () => setStandIn(!el?.querySelector(".cl-card:not(.sn-standin)")),
      2500
    );
    return () => clearTimeout(wait);
  }, []);

  return (
    <section className={`sn sn-o-${option} sn-${mode}`} ref={root}>
      <OptionPicker mode={mode} option={option} />
      <nav className="sn-seg" aria-label="Sign in or get started">
        <a
          href={`/auth/sign-in?o=${option}`}
          aria-current={mode === "sign-in" ? "page" : undefined}
        >
          Sign in
        </a>
        <a
          href={`/auth/sign-up?o=${option}`}
          aria-current={mode === "sign-up" ? "page" : undefined}
        >
          Get started
        </a>
      </nav>
      <p className="sn-mark" aria-hidden="true">
        Karman
      </p>
      <div className="sn-say">
        <h1>{headline}</h1>
        <p>{line}</p>
        {perks.length ? (
          <ul className="sn-perks">
            {perks.map((t, i) => (
              <li key={t} style={{ "--i": i } as CSSProperties}>
                {TICK}
                {t}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="sn-pitch" aria-hidden={pitch.length ? undefined : true}>
        {pitch.map((t, i) => (
          <p key={t} style={{ "--i": i } as CSSProperties}>
            {t}
          </p>
        ))}
      </div>
      <div className="sn-form">
        {standIn ? (
          <StandIn mode={mode} />
        ) : mode === "sign-in" ? (
          <SignIn
            routing="path"
            path="/auth/sign-in"
            signUpUrl="/auth/sign-up"
            appearance={APPEARANCE}
          />
        ) : (
          <SignUp
            routing="path"
            path="/auth/sign-up"
            signInUrl="/auth/sign-in"
            appearance={APPEARANCE}
          />
        )}
      </div>
    </section>
  );
}
