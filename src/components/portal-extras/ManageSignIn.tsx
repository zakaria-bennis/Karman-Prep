"use client";

/*
 * Opens Clerk's own account window, where a person changes their name, email or password.
 * Settings shows the name and email read only and sends changes here. Off while an admin is
 * previewing someone else's account.
 */
import { useClerk } from "@clerk/nextjs";
import s from "@/components/student-portal/settings/settings.module.css";

export default function ManageSignIn({ locked = false }: { locked?: boolean }) {
  const clerk = useClerk();
  return (
    <button
      type="button"
      className={s.button}
      disabled={locked}
      onClick={() => clerk.openUserProfile()}
    >
      Change name, email or password
    </button>
  );
}
