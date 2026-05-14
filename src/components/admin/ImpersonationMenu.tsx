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
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 disabled:opacity-50"
      >
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
        View as
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-44 rounded-lg border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden z-30"
        >
          {(["student", "tutor", "parent"] as const).map((r) => (
            <button
              key={r}
              role="menuitem"
              onClick={() => viewAs(r)}
              className="block w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-white/5 capitalize"
            >
              {r}
            </button>
          ))}
          <div className="px-3 py-2 text-[10px] text-slate-500 border-t border-slate-800">
            Real role stays admin.
          </div>
        </div>
      )}
    </div>
  );
}
