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
      {/* ── Content (full 100vh) ────────────────────────── */}
      <main className="relative z-0 min-h-screen">{children}</main>

      {/* ── Floating translucent top bar ─────────────────
          On /learn (the hero) it's subtle; on constellation pages
          it's even more minimal (just translucent mark + back). */}
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-40 flex items-center gap-3 px-4 pb-1.5 pt-3",
          "pointer-events-none" // children re-enable interactions
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
    </div>
  );
}
