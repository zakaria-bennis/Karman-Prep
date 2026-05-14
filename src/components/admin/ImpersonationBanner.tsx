"use client";

// ============================================================
// ImpersonationBanner — floating notice that appears site-wide
// whenever the admin "View as" cookie is set. Click × to exit
// back to the real admin role.
// ============================================================

import { Eye, X, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { actionClearImpersonation } from "@/app/admin/impersonation-actions";

export default function ImpersonationBanner({ role }: { role: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="status"
      className="fixed left-1/2 top-2 z-[100] inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-lg ring-1 ring-amber-950/10"
    >
      <Eye className="h-3.5 w-3.5" />
      <span className="uppercase tracking-wide">Admin viewing as</span>
      <span className="font-extrabold">{role}</span>
      <button
        onClick={() => startTransition(() => actionClearImpersonation())}
        disabled={pending}
        className="ml-1 rounded-full bg-amber-950/20 p-0.5 hover:bg-amber-950/40 disabled:opacity-50"
        aria-label="Exit impersonation and return to admin"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
      </button>
    </div>
  );
}
