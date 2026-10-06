"use client";

import { useId } from "react";
import { Palette } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { SITE_THEMES } from "@/lib/themes/palettes";

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, saving, notice } = useTheme();
  const id = useId();
  return (
    <details
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.removeAttribute("open");
          event.currentTarget.querySelector("summary")?.focus();
          event.stopPropagation();
        }
      }}
    >
      <summary
        aria-label="Appearance menu"
        className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm text-taupe hover:bg-surface-raised hover:text-ivory [&::-webkit-details-marker]:hidden"
      >
        <Palette className="h-5 w-5 shrink-0" aria-hidden="true" />
        {!compact && "Appearance"}
      </summary>
      <div className="fixed inset-x-3 top-16 z-[90] max-h-[calc(100dvh-5rem)] overflow-auto rounded-xl border border-bronze bg-surface p-4 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-72">
        <button
          type="button"
          aria-label="Close appearance menu"
          onClick={(event) => {
            const details = event.currentTarget.closest("details");
            details?.removeAttribute("open");
            details?.querySelector("summary")?.focus();
          }}
          className="float-right flex h-9 w-9 items-center justify-center rounded-lg text-ivory hover:bg-surface-raised"
        >
          ×
        </button>
        <label htmlFor={id} className="text-sm font-semibold text-ivory">
          Choose your theme
        </label>
        <select
          id={id}
          value={theme}
          disabled={saving}
          onChange={(event) => setTheme(event.target.value)}
          className="mt-3 min-h-11 w-full rounded-lg border border-bronze bg-night px-3 text-sm text-ivory"
        >
          {[...new Set(SITE_THEMES.map((item) => item.family))].map((family) => (
            <optgroup key={family} label={family}>
              {SITE_THEMES.filter((item) => item.family === family).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="mt-3 text-xs leading-relaxed text-taupe">
          Your choice changes the app and question figures.
        </p>
        <p role="status" className="mt-2 text-xs text-taupe">
          {notice}
        </p>
      </div>
    </details>
  );
}
