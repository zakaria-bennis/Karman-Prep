"use client";

// ============================================================
// Navbar — sticky top bar on the warm night canvas.
//
// Observatory system (docs/brand.md): night ground, bronze
// hairline, ivory/taupe text, a single gold CTA. The product is
// dark-only by design, so there is no theme toggle here.
// ============================================================

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, UserButton } from "@clerk/nextjs";
import { KarmanLogo } from "@/components/shared/KarmanLogo";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn } = useAuth();

  const navLinks = [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Results", href: "/#results" },
    { label: "FAQ", href: "/faq" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-bronze/60 bg-night/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" aria-label="Karman home">
            <KarmanLogo size={28} />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-taupe transition-colors duration-fast hover:text-ivory"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side: auth */}
          <div className="hidden items-center gap-3 md:flex">
            {!isSignedIn && (
              <>
                <Link
                  href="/auth/sign-in"
                  className="px-3 py-2 text-sm font-medium text-taupe transition-colors duration-fast hover:text-ivory"
                >
                  Sign In
                </Link>
                <Link href="/auth/sign-up" className="btn-primary px-5 py-2.5 text-sm">
                  Start Free Trial
                </Link>
              </>
            )}
            {isSignedIn && (
              <>
                <Link href="/dashboard/student" className="btn-secondary px-5 py-2.5 text-sm">
                  Dashboard
                </Link>
                <UserButton />
              </>
            )}
          </div>

          {/* Mobile: hamburger */}
          <div className="flex items-center md:hidden">
            <button
              className="rounded-lg p-2 text-taupe transition-colors duration-fast hover:bg-surface hover:text-ivory"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-normal md:hidden",
            isOpen ? "max-h-96 pb-4" : "max-h-0"
          )}
        >
          <div className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-taupe transition-colors duration-fast hover:bg-surface hover:text-ivory"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 px-4 pt-3">
              {!isSignedIn && (
                <>
                  <Link href="/auth/sign-in" className="btn-secondary py-2.5 text-center text-sm">
                    Sign In
                  </Link>
                  <Link href="/auth/sign-up" className="btn-primary py-2.5 text-center text-sm">
                    Start Free Trial
                  </Link>
                </>
              )}
              {isSignedIn && (
                <Link href="/dashboard/student" className="btn-primary py-2.5 text-center text-sm">
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
