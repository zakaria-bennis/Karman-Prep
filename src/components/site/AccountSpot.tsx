"use client";

// The top right of the site for someone signed in (founder, 2026-11-14): their own picture, in place of
// "Sign in" and "Get started". One press opens their portal (the student portal sends a parent or a tutor
// on to theirs), where the account menu and Sign out live. Whether someone is signed in is known before
// the page paints (SitePage.tsx, SIGNED_IN_BOOT), so the circle is there at once and the picture fills it
// when Clerk has loaded. If Clerk disagrees with that first guess, the header is put right.
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { ROUTES } from "./routes";

export default function AccountSpot({ label }: { label: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  useEffect(() => {
    const ks = document.getElementById("ks");
    if (!ks || !isLoaded) return;
    if (isSignedIn) ks.dataset.in = "1";
    else delete ks.dataset.in;
  }, [isLoaded, isSignedIn]);
  const initial = (user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? "").slice(0, 1);
  return (
    <a className="acct when-in" href={ROUTES.portal} aria-label={label} title={label}>
      {user?.imageUrl ? (
        // the picture comes from Clerk's own image host, already sized: next/image adds nothing here
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.imageUrl} alt="" width={46} height={46} />
      ) : (
        <span aria-hidden="true">{initial.toUpperCase()}</span>
      )}
    </a>
  );
}
