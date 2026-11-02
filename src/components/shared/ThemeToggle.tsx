"use client";

import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/shared/ThemeProvider";
import { SITE_PAGES } from "@/components/site/routes";

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const pathname = usePathname();
  const { toggleMode, saving } = useTheme();
  const [ready, setReady] = useState(false);
  // Server-rendered buttons must not accept clicks before React attaches the handler.
  // This waits for this control to hydrate, independently of Clerk loading.
  useEffect(() => setReady(true), []);
  // Shells and the marketing pages provide an in-flow control, clear of content. /calculator has
  // none: its bar stays quiet and the calculator keeps the classic skin in either theme.
  const portalHasThemeControl =
    ["/dashboard/student", "/dashboard/parent", "/tutor", "/admin", "/learn"].some(
      (prefix) => pathname === prefix || pathname?.startsWith(prefix + "/")
    ) ||
    // the marketing pages draw their own light and dark switch in their header
    [...SITE_PAGES, "/calculator"].includes((pathname ?? "") as (typeof SITE_PAGES)[number]);
  if (floating && portalHasThemeControl) return null;
  return (
    <button
      type="button"
      onClick={toggleMode}
      disabled={!ready || saving}
      aria-label="Toggle light and dark mode"
      title="Toggle light and dark mode"
      className={
        floating
          ? "fixed right-3 top-[4.75rem] z-50 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-bronze bg-surface px-3 text-ivory shadow-lg transition-colors hover:bg-surface-raised disabled:opacity-60 sm:right-5 sm:top-20"
          : "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ivory transition-colors hover:bg-surface-raised disabled:opacity-60"
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
