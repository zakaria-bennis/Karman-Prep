"use client";

// ============================================================
// KeyboardCheatSheet — overlay shown on `?` (and via the help
// button in the toolbar). Lists every shortcut the preview page
// registers, grouped by category. Click outside or press Escape
// to dismiss.
//
// The shortcut list is passed in as data — the same array used
// to register the handlers via useKeyboardShortcuts. This way
// the cheat sheet can't drift from what's actually wired.
// ============================================================

import { useEffect, useRef } from "react";
import { X, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Shortcut } from "./useKeyboardShortcuts";

interface Props {
  open: boolean;
  shortcuts: Shortcut[];
  onClose: () => void;
}

export function KeyboardCheatSheet({ open, shortcuts, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Focus the dialog when it opens so Escape works without
  // requiring the user to click into it first.
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!open) return null;

  // Group shortcuts in display order — matches the Shortcut.group
  // string union.
  const GROUP_ORDER: Shortcut["group"][] = ["Navigation", "Actions", "Panels", "View", "Help"];
  const groups = new Map<Shortcut["group"], Shortcut[]>();
  for (const g of GROUP_ORDER) groups.set(g, []);
  for (const s of shortcuts) groups.get(s.group)?.push(s);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="relative max-h-[88vh] w-[min(720px,92vw)] overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl shadow-black/70 focus:outline-none"
      >
        <header className="mb-4 flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-indigo-300" />
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-300">
            Keyboard shortcuts
          </h2>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500">
            press <KeyHint>?</KeyHint> any time to reopen
          </span>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200"
            aria-label="Close shortcuts"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {GROUP_ORDER.map((groupName) => {
            const items = groups.get(groupName) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={groupName}>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {groupName}
                </h3>
                <ul className="space-y-1.5">
                  {items.map((s) => (
                    <li
                      key={s.key + s.description}
                      className="flex items-center gap-3 text-xs text-slate-200"
                    >
                      <KeyHint>{formatKey(s.key)}</KeyHint>
                      <span className="flex-1">{s.description}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className="mt-5 border-t border-slate-800 pt-3 text-[10px] text-slate-500">
          Shortcuts are ignored while typing in a text field — click out (or press{" "}
          <KeyHint>Esc</KeyHint>) to enable them again.
        </footer>
      </div>
    </div>
  );
}

function formatKey(raw: string): string {
  if (raw === "ArrowLeft") return "←";
  if (raw === "ArrowRight") return "→";
  if (raw === "Escape") return "Esc";
  if (raw.startsWith("Shift+")) return `⇧ ${raw.slice("Shift+".length).toUpperCase()}`;
  return raw.length === 1 ? raw.toUpperCase() : raw;
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-[1.6rem] items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5",
        "font-mono text-[11px] font-semibold text-slate-200 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_-1px_0_0_rgba(0,0,0,0.6)_inset]"
      )}
    >
      {children}
    </kbd>
  );
}
