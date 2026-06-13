"use client";

// ============================================================
// ImpersonationBanner — floating notice that appears site-wide
// whenever the admin "View as" cookie is set. Click × to exit
// back to the real admin role.
//
// Shows the target user's name when granular impersonation is
// active (audit issue #17), otherwise just the role.
// ============================================================

import { Eye, X, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { actionClearImpersonation } from "@/app/admin/impersonation-actions";

export default function ImpersonationBanner({
  role,
  userName,
}: {
  role: string;
  userName?: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="status"
      className="fixed left-1/2 top-2 z-[100] inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-warning px-3 py-1.5 text-xs font-bold text-night shadow-lg ring-1 ring-warning/10"
    >
      <Eye className="h-3.5 w-3.5" />
      <span className="uppercase tracking-wide">Admin viewing as</span>
      {userName ? (
        <>
          <span className="font-extrabold">{userName}</span>
          <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            {role}
          </span>
        </>
      ) : (
        <span className="font-extrabold">{role}</span>
      )}
      <button
        onClick={() => startTransition(() => actionClearImpersonation())}
        disabled={pending}
        className="ml-1 rounded-full bg-warning/20 p-0.5 hover:bg-warning/40 disabled:opacity-50"
        aria-label="Exit impersonation and return to admin"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
      </button>
    </div>
  );
}
