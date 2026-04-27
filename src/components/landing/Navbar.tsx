"use client";

// ============================================================
// Navbar — sticky top bar with theme toggle, FAQ link, auth CTAs
// ============================================================

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useAuth, UserButton } from "@clerk/nextjs";
import { StrataLogo } from "@/components/shared/StrataLogo";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn } = useAuth();

  const navLinks = [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing",      href: "/#pricing" },
    { label: "Results",      href: "/#results" },
    { label: "FAQ",          href: "/faq" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" aria-label="Karman Prep home">
            <StrataLogo size={28} />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side: theme toggle + auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {!isSignedIn && (
              <>
                <Link
                  href="/auth/sign-in"
                  className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link href="/auth/sign-up" className="btn-primary text-sm px-5 py-2.5">
                  Start Free Trial
                </Link>
              </>
            )}
            {isSignedIn && (
              <>
                <Link href="/dashboard/student" className="btn-secondary text-sm px-5 py-2.5">
                  Dashboard
                </Link>
                <UserButton />
              </>
            )}
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle />
            <button
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={cn(
          "md:hidden overflow-hidden transition-all duration-300",
          isOpen ? "max-h-96 pb-4" : "max-h-0"
        )}>
          <div className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-3 px-4">
              {!isSignedIn && (
                <>
                  <Link href="/auth/sign-in" className="btn-secondary text-sm py-2.5 text-center">Sign In</Link>
                  <Link href="/auth/sign-up" className="btn-primary text-sm py-2.5 text-center">Start Free Trial</Link>
                </>
              )}
              {isSignedIn && (
                <Link href="/dashboard/student" className="btn-primary text-sm py-2.5 text-center">Go to Dashboard</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
