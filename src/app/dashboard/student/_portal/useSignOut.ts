"use client";

// Sign out, wherever the portal offers it (Settings, and the desktop's account menu). A real
// session is ended by Clerk, which then goes home; the local sign-in bypass and the design page have
// no Clerk session, so they just go home.
import { useClerk, useUser } from "@clerk/nextjs";
import { useState } from "react";

export function useSignOut(): { signOut: () => void; leaving: boolean } {
  const clerk = useClerk();
  const { user } = useUser();
  const [leaving, setLeaving] = useState(false);
  const signOut = () => {
    if (leaving) return;
    setLeaving(true);
    if (!user) return window.location.assign("/");
    clerk.signOut({ redirectUrl: "/" }).catch(() => window.location.assign("/"));
  };
  return { signOut, leaving };
}
