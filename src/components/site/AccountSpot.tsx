"use client";

// The top right of the site for someone signed in (founder, 2026-11-14): their own picture, in place of
// "Sign in" and "Get started". Pressing it opens a small menu: their portal, and Sign out, which brings
// them back to the home page. Escape or a press anywhere else closes it. Whether someone is signed in is
// known before the page paints (SitePage.tsx, SIGNED_IN_BOOT), so the circle is there at once; the picture
// fills it when Clerk has loaded. If Clerk disagrees with that first guess, the header is put right.
// A picture is shown only when the person has one of their own: Clerk's stand-in picture is left out, and
// their initial is shown instead, or a plain figure when there is no name yet.
import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { ROUTES } from "./routes";

/** Kept here, not in site-copy.ts, because that file is at its size limit. */
const SIGN_OUT = "Sign out";

export default function AccountSpot({ label }: { label: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ks = document.getElementById("ks");
    if (!ks || !isLoaded) return;
    if (isSignedIn) ks.dataset.in = "1";
    else delete ks.dataset.in;
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      wrap.current?.querySelector("button")?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const name = user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const picture = user?.hasImage && !broken ? user.imageUrl : null;
  return (
    <div className="acct-wrap when-in" ref={wrap}>
      <button
        type="button"
        className="acct"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {picture ? (
          // the picture comes from Clerk's own image host, already sized: next/image adds nothing here
          // eslint-disable-next-line @next/next/no-img-element
          <img src={picture} alt="" width={46} height={46} onError={() => setBroken(true)} />
        ) : name ? (
          <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="9" r="4" />
            <path d="M4.500 20.500c1.200-3.800 4-5.500 7.500-5.500s6.300 1.700 7.500 5.500" />
          </svg>
        )}
      </button>
      {open ? (
        <div className="acct-menu" role="menu">
          <a role="menuitem" href={ROUTES.portal}>
            {label}
          </a>
          <button
            type="button"
            role="menuitem"
            disabled={leaving}
            onClick={() => {
              setLeaving(true);
              void clerk.signOut({ redirectUrl: "/" });
            }}
          >
            {SIGN_OUT}
          </button>
        </div>
      ) : null}
    </div>
  );
}
