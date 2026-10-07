"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/shared/ThemeProvider";

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const { toggleMode, saving } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleMode}
      disabled={saving}
      aria-label="Toggle light and dark mode"
      title="Toggle light and dark mode"
      className={
        floating
          ? "fixed right-3 top-[4.75rem] z-50 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-bronze bg-surface px-3 text-ivory shadow-lg transition-colors hover:bg-surface-raised disabled:opacity-60 sm:right-5 sm:top-20"
          : "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-ivory transition-colors hover:bg-surface-raised disabled:opacity-60"
      }
    >
      <Sun className="hidden h-5 w-5 dark:block" aria-hidden="true" />
      <Moon className="h-5 w-5 dark:hidden" aria-hidden="true" />
      {floating && (
        <>
          <span className="hidden text-xs font-semibold dark:sm:inline">Light</span>
          <span className="hidden text-xs font-semibold dark:hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
}
