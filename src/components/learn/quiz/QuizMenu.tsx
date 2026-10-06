"use client";

import { ThemeSelector } from "@/components/shared/ThemeSelector";
import { Menu } from "lucide-react";

export function QuizMenu({
  transfersEnabled,
  onTransfersChange,
  realistic,
  subject,
}: {
  transfersEnabled: boolean;
  onTransfersChange: (enabled: boolean) => void;
  realistic: boolean;
  subject?: string | null;
}) {
  return (
    <details className="relative">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-xs text-taupe hover:bg-surface-raised hover:text-ivory [&::-webkit-details-marker]:hidden">
        <Menu className="h-4 w-4" aria-hidden="true" /> Menu
      </summary>
      <div className="absolute right-0 top-11 z-[80] w-64 rounded-xl border border-bronze bg-night p-4 shadow-xl">
        <ThemeSelector />
        {subject === "math" && (
          <>
            <label className="flex items-start gap-3 text-sm text-ivory">
              <input
                type="checkbox"
                checked={!realistic && transfersEnabled}
                disabled={realistic}
                onChange={(event) => onTransfersChange(event.target.checked)}
                aria-describedby="desmos-transfer-description"
                className="mt-1 h-4 w-4 accent-info"
              />
              Desmos transfers
            </label>
            <p id="desmos-transfer-description" className="mt-2 text-xs leading-relaxed text-taupe">
              {realistic
                ? "Disabled during realistic timed exams."
                : "Send given functions, equations, expressions, x–y tables, and points to the calculator during practice."}
            </p>
          </>
        )}
      </div>
    </details>
  );
}
