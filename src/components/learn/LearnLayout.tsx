"use client";

// ============================================================
// Learn portal layout — full-screen content with a FLOATING
// translucent glass top bar. The content below takes the full
// viewport (no fixed-height header eating 56 px).
// ============================================================

import Link from "next/link";
import { ThemeSelector } from "@/components/shared/ThemeSelector";
import { ThemedUserButton as UserButton } from "@/components/shared/ThemedClerkWidgets";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { KarmanLogoMark } from "@/components/shared/KarmanLogo";

export { LEARN_HEADER_CLEARANCE } from "./learn-header";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-night">
      {/* ── Floating translucent top bar ─────────────────
          On /learn (the hero) it's subtle; on constellation pages
          it's even more minimal (just translucent mark + back). */}
      <header
        className={cn(
          // In the page flow (sticky, not fixed), so the pill always sits above a page's title and
          // never covers it at any width (2026-11-09: it covered "Daily 10" and "Diagnostic" at 768).
          "sticky left-0 right-0 top-0 z-40 flex items-center gap-3 px-4 pb-1.5 pt-3",
          "pointer-events-none", // children re-enable interactions
          // A quiz screen (full screen, its own top bar and Exit) or a painted portal screen (its own
          // nav and account menu) hides this bar, which would sit over them.
          "[:root:has(.kp-shell)_&]:hidden [:root:has([data-quiz-bar])_&]:hidden [body:has([data-quiz-shell])_&]:hidden"
        )}
      >
        <div
          className={cn(
            "pointer-events-auto inline-flex items-center gap-3 rounded-full px-3 py-1.5",
            "border border-ivory/10 bg-night/35 shadow-lg backdrop-blur-md"
          )}
        >
          <Link
            href="/"
            aria-label="Karman home"
            className="opacity-80 transition-opacity hover:opacity-100"
          >
            <KarmanLogoMark size={20} />
          </Link>
          <span className="h-4 w-px bg-surface/10" />
          <Link
            href="/dashboard/student"
            className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-ivory/80 transition-colors hover:text-ivory"
          >
            <ArrowLeft className="h-3 w-3" />
            Today
          </Link>
        </div>

        {/* User button — floats top-right, translucent */}
        <div
          className={cn(
            "pointer-events-auto ml-auto flex items-center gap-1 rounded-full border border-ivory/10 bg-night/35 p-1 shadow-lg backdrop-blur-md"
          )}
        >
          <ThemeSelector compact />
          <UserButton />
        </div>
      </header>

      <main className="relative z-0 min-h-screen">{children}</main>
    </div>
  );
}
