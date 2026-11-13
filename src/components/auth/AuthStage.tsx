"use client";

// The sign-in and Start free pages, in the home page's world: the live landscape behind, a serif headline,
// and Clerk's form restyled as frosted glass with pill fields (auth.css does the restyling by Clerk's own
// class names, so it follows day and night with the page).
//
// TEMPORARY (2026-11-13): five layouts for the founder to choose from, switched by a row of buttons at the
// bottom on the dev server only:
//   1 Card    the headline over one frosted card, centred
//   2 Split   the headline on the left, the form on the right
//   3 Pills   no card: the fields sit straight on the landscape as glass pills
//   4 Fox     the fox peeks over the card and watches the pointer; he hides his eyes for the password
//   5 Sheet   a tall frosted panel docked to one side, the headline large beside it
// On this computer Clerk's form cannot draw (the live keys only work on karmanprep.com), so on the dev server
// a stand-in with the same parts and the same class names takes its place. It signs nobody in.
import { useEffect, useRef, useState } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { Fox } from "@/components/portal/Fox";

const PICK = process.env.NODE_ENV !== "production";
const NAMES = ["Card", "Split", "Pills", "Fox", "Sheet"];

/** Dev server only: what Clerk's form looks like, built from its own class names, for judging the layouts. */
function StandIn({ mode }: { mode: "sign-in" | "sign-up" }) {
  const up = mode === "sign-up";
  return (
    <div className="cl-rootBox">
      <div className="cl-cardBox">
        <div className="cl-card sn-standin">
          <button type="button" className="cl-socialButtonsBlockButton">
            <span className="cl-socialButtonsBlockButtonText">Continue with Google</span>
          </button>
          <div className="sn-or">
            <i className="cl-dividerLine" />
            <span className="cl-dividerText">or</span>
            <i className="cl-dividerLine" />
          </div>
          <label className="cl-formFieldLabel">
            Email address
            <input className="cl-formFieldInput" type="email" autoComplete="off" />
          </label>
          <label className="cl-formFieldLabel">
            Password
            <input className="cl-formFieldInput" type="password" autoComplete="off" />
          </label>
          <button type="button" className="cl-formButtonPrimary">
            Continue
          </button>
        </div>
        <div className="cl-footer">
          <div className="cl-footerAction">
            <span className="cl-footerActionText">
              {up ? "Already have an account?" : "Don't have an account?"}
            </span>
            <a className="cl-footerActionLink" href={up ? "/auth/sign-in" : "/auth/sign-up"}>
              {up ? "Sign in" : "Start free"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

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

export default function AuthStage({
  mode,
  headline,
  line,
}: {
  mode: "sign-in" | "sign-up";
  headline: string;
  line: string;
}) {
  const [look, setLook] = useState(1);
  const [shy, setShy] = useState(false);
  /** Dev server only: Clerk's form has not appeared, so the stand-in shows. */
  const [standIn, setStandIn] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      el.style.setProperty("--mx", String((e.clientX / innerWidth) * 2 - 1));
      el.style.setProperty("--my", String((e.clientY / innerHeight) * 2 - 1));
    };
    // the fox looks away while a password is being typed
    const focus = (e: FocusEvent) =>
      setShy((e.target as HTMLElement | null)?.getAttribute?.("type") === "password");
    const wait = PICK
      ? setTimeout(() => setStandIn(!el.querySelector(".cl-card:not(.sn-standin)")), 2500)
      : undefined;
    addEventListener("pointermove", move);
    el.addEventListener("focusin", focus);
    return () => {
      clearTimeout(wait);
      removeEventListener("pointermove", move);
      el.removeEventListener("focusin", focus);
    };
  }, []);

  return (
    <section className="sn" data-look={look} ref={root}>
      <div className="sn-say">
        <h1>{headline}</h1>
        <p>{line}</p>
      </div>
      <div className="sn-form">
        {look === 4 ? (
          <span className="sn-fox" data-shy={shy || undefined} aria-hidden="true">
            <Fox size={120} />
            <i />
            <i />
          </span>
        ) : null}
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
      {PICK ? (
        <p className="sn-pick">
          {NAMES.map((n, i) => (
            <button
              key={n}
              type="button"
              aria-pressed={look === i + 1}
              onClick={() => setLook(i + 1)}
            >
              {i + 1} {n}
            </button>
          ))}
        </p>
      ) : null}
    </section>
  );
}
