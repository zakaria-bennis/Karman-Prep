"use client";

// ============================================================
// Learn portal layout — minimal dark top bar + full-width content
// Intentionally different from DashboardLayout (no sidebar)
// so the constellation map can breathe.
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft, BookOpen, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { StrataLogo } from "@/components/shared/StrataLogo";

const SUBJECT_TABS = [
  { href: "/learn/reading", label: "Reading & Writing", Icon: BookOpen, color: "text-rose-400" },
  { href: "/learn/math",    label: "Math",              Icon: Calculator,  color: "text-indigo-400" },
];

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onSubjectPage = SUBJECT_TABS.some((t) => pathname.startsWith(t.href));

  return (
    <div className="min-h-screen bg-[#060b16] flex flex-col">
      {/* Top bar */}
      <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-white/5 bg-[#060b16]/90 backdrop-blur-sm z-20">
        {/* Logo */}
        <Link href="/" className="mr-1" aria-label="Strata home">
          <StrataLogo size={22} theme="dark" />
        </Link>

        {/* Back to dashboard */}
        <Link
          href="/dashboard/student"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        {/* Subject tabs (shown on /learn/reading and /learn/math) */}
        {onSubjectPage && (
          <nav className="flex items-center gap-1 ml-4">
            {SUBJECT_TABS.map(({ href, label, Icon, color }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", active ? color : "")} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User button */}
        <UserButton />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
