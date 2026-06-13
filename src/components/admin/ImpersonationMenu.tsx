"use client";

// ============================================================
// ImpersonationMenu — admin-only "View as" dropdown. Lives in
// the admin header. Selecting a role sets the impersonation
// cookie and navigates to that portal.
// ============================================================

import { useState, useRef, useEffect, useTransition } from "react";
import { Eye, ChevronDown, Loader2 } from "lucide-react";
import { actionSetImpersonation } from "@/app/admin/impersonation-actions";

type ViewAsRole = "student" | "tutor" | "parent";

export default function ImpersonationMenu() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function viewAs(role: ViewAsRole) {
    setOpen(false);
    startTransition(() => actionSetImpersonation(role));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-bronze bg-surface-raised/60 px-2.5 py-1 text-xs font-semibold text-ivory hover:bg-surface-raised disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
        View as
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-lg border border-bronze bg-surface shadow-2xl"
        >
          {(["student", "tutor", "parent"] as const).map((r) => (
            <button
              key={r}
              role="menuitem"
              onClick={() => viewAs(r)}
              className="block w-full px-3 py-2 text-left text-xs capitalize text-ivory hover:bg-surface/5"
            >
              {r}
            </button>
          ))}
          <div className="border-t border-bronze px-3 py-2 text-[10px] text-taupe">
            Real role stays admin.
          </div>
        </div>
      )}
    </div>
  );
}
