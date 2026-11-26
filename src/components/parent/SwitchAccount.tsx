"use client";

/* Signs this account out and opens sign-in, coming back to the same page with the other account. */
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function SwitchAccount({ backTo }: { backTo: string }) {
  const clerk = useClerk();
  const router = useRouter();
  const signIn = `/auth/sign-in?redirect_url=${encodeURIComponent(backTo)}`;
  return (
    <button
      className="kp-textbtn"
      type="button"
      onClick={() => void clerk.signOut({ redirectUrl: signIn }).catch(() => router.push(signIn))}
    >
      Sign in with another account
    </button>
  );
}
