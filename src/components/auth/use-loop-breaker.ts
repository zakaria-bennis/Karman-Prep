"use client";
import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { safeNext } from "@/lib/auth/portal-home";

const KEY = "karman-signin-bounces";
const WINDOW_MS = 60_000;

/** The sign-in and Get started pages are only shown by the server to someone it does not know. If
 *  the browser's own Clerk session says the visitor IS signed in, the two disagree, and following
 *  a "Go to your portal" link bounces between the portal and this page for ever (founder,
 *  2026-11-17). So: the first time, the session's token is fetched afresh and the visitor is sent
 *  on to where they were going; if that brings them straight back, the stale session is signed
 *  out, which leaves the form on screen so signing in works. Never more than one bounce. */
export function useLoopBreaker(next: string | undefined) {
  const { isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let bounces: number[] = [];
    try {
      bounces = (JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as number[]).filter(
        (t) => Date.now() - t < WINDOW_MS
      );
    } catch {
      /* no storage: treat this as the first time */
    }
    const remember = (list: number[]) => {
      try {
        sessionStorage.setItem(KEY, JSON.stringify(list));
      } catch {
        /* a per-tab convenience only */
      }
    };
    if (bounces.length >= 1) {
      remember([]);
      void clerk.signOut({ redirectUrl: window.location.pathname + window.location.search });
      return;
    }
    remember([...bounces, Date.now()]);
    let gone = false;
    void (async () => {
      try {
        await clerk.session?.getToken({ skipCache: true });
      } catch {
        /* the next arrival here signs the stale session out */
      }
      if (!gone) window.location.replace(safeNext(next));
    })();
    return () => {
      gone = true;
    };
  }, [isLoaded, isSignedIn, clerk, next]);
}
