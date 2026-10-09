"use client";

import { ThemeSelector } from "@/components/shared/ThemeSelector";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Menu } from "lucide-react";

export function QuizMenu({ subject }: { realistic?: boolean; subject?: string | null }) {
  return (
    <div className="flex items-center gap-1">
      <ThemeToggle />
      <details className="relative">
        <summary className="flex h-9 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-xs text-taupe hover:bg-surface-raised hover:text-ivory [&::-webkit-details-marker]:hidden">
          <Menu className="h-4 w-4" aria-hidden="true" /> Menu
        </summary>
        <div className="absolute right-0 top-11 z-[80] w-64 rounded-xl border border-bronze bg-night p-4 shadow-xl">
          <ThemeSelector />
          {subject === "math" && (
            <p className="mt-3 text-xs leading-relaxed text-taupe">
              The official SAT calculator opens in a new tab. Your question and answers stay here.
              Enter equations and tables directly in the calculator.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
