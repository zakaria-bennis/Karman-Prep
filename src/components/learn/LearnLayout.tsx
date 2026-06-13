"use client";

// ============================================================
// Learn portal layout — full-screen content with a FLOATING
// translucent glass top bar. The content below takes the full
// viewport (no fixed-height header eating 56 px).
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { KarmanLogoMark } from "@/components/shared/KarmanLogo";

const SUBJECT_HREFS = ["/learn/reading", "/learn/math"];

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onConstellation = SUBJECT_HREFS.some((h) => pathname.startsWith(h));

  return (
    <div className="relative min-h-screen bg-[#070605]">
      {/* ── Content (full 100vh) ────────────────────────── */}
      <main className="relative z-0 min-h-screen">{children}</main>

      {/* ── Floating translucent top bar ─────────────────
          On /learn (the hero) it's subtle; on constellation pages
          it's even more minimal (just translucent mark + back). */}
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-40 flex items-center gap-3 px-4 py-3",
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
            Dashboard
          </Link>
        </div>

        {/* Subject switch (only on constellation pages) — a tiny floating pill */}
        {onConstellation && (
          <div className="pointer-events-auto ml-auto mr-12 hidden items-center gap-1 rounded-full border border-ivory/10 bg-night/35 p-1 shadow-lg backdrop-blur-md sm:inline-flex">
            <Link
              href="/learn/reading"
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors",
                pathname.startsWith("/learn/reading")
                  ? "bg-error/20 text-error-bright"
                  : "text-taupe hover:text-ivory/90"
              )}
            >
              Reading
            </Link>
            <Link
              href="/learn/math"
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors",
                pathname.startsWith("/learn/math")
                  ? "bg-info/20 text-info-bright"
                  : "text-taupe hover:text-ivory/90"
              )}
            >
              Math
            </Link>
          </div>
        )}

        {/* User button — floats top-right, translucent */}
        <div
          className={cn(
            "pointer-events-auto rounded-full border border-ivory/10 bg-night/35 p-1 shadow-lg backdrop-blur-md",
            !onConstellation && "ml-auto"
          )}
        >
          <UserButton />
        </div>
      </header>
    </div>
  );
}
