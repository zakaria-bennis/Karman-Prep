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
import { StrataLogoMark } from "@/components/shared/StrataLogo";

const SUBJECT_HREFS = ["/learn/reading", "/learn/math"];

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onConstellation = SUBJECT_HREFS.some((h) => pathname.startsWith(h));

  return (
    <div className="relative min-h-screen bg-[#02040a]">
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
            "border border-white/10 bg-black/35 shadow-lg backdrop-blur-md"
          )}
        >
          <Link
            href="/"
            aria-label="Karman home"
            className="opacity-80 transition-opacity hover:opacity-100"
          >
            <StrataLogoMark size={20} />
          </Link>
          <span className="h-4 w-px bg-white/10" />
          <Link
            href="/dashboard/student"
            className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            Dashboard
          </Link>
        </div>

        {/* Subject switch (only on constellation pages) — a tiny floating pill */}
        {onConstellation && (
          <div className="pointer-events-auto ml-auto mr-12 hidden items-center gap-1 rounded-full border border-white/10 bg-black/35 p-1 shadow-lg backdrop-blur-md sm:inline-flex">
            <Link
              href="/learn/reading"
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors",
                pathname.startsWith("/learn/reading")
                  ? "bg-pink-500/20 text-pink-300"
                  : "text-slate-500 hover:text-slate-200"
              )}
            >
              Reading
            </Link>
            <Link
              href="/learn/math"
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors",
                pathname.startsWith("/learn/math")
                  ? "bg-sky-500/20 text-sky-300"
                  : "text-slate-500 hover:text-slate-200"
              )}
            >
              Math
            </Link>
          </div>
        )}

        {/* User button — floats top-right, translucent */}
        <div
          className={cn(
            "pointer-events-auto rounded-full border border-white/10 bg-black/35 p-1 shadow-lg backdrop-blur-md",
            !onConstellation && "ml-auto"
          )}
        >
          <UserButton />
        </div>
      </header>
    </div>
  );
}
