"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { ThemedUserButton as UserButton } from "@/components/shared/ThemedClerkWidgets";
import LandingLogo from "./LandingLogo";

const NAV_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Diagnostic", href: "/#sample-quiz" },
  { label: "Plans", href: "/#pricing" },
  { label: "Questions", href: "/faq" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-bronze bg-night/95 text-ivory backdrop-blur-md">
      <nav aria-label="Main navigation" className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="flex min-h-16 items-center justify-between gap-5">
          <Link href="/" aria-label="Karman home" className="shrink-0">
            <LandingLogo />
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-taupe hover:text-ivory"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard/student"
                  className="text-sm font-semibold text-ivory underline underline-offset-4"
                >
                  Dashboard
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <Link
                  href="/auth/sign-in"
                  className="px-2 py-2 text-sm font-medium text-taupe hover:text-ivory"
                >
                  Sign in
                </Link>
                <Link href="/auth/sign-up" className="btn-primary px-5 py-2.5 text-sm">
                  Create account
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-controls="mobile-navigation"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-bronze text-ivory md:hidden"
          >
            {isOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {isOpen && (
          <div id="mobile-navigation" className="border-t border-bronze py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg px-3 py-3 text-base text-ivory hover:bg-surface"
                >
                  {link.label}
                </Link>
              ))}
              {isSignedIn ? (
                <Link
                  href="/dashboard/student"
                  onClick={() => setIsOpen(false)}
                  className="btn-primary mt-3 text-center"
                >
                  Dashboard
                </Link>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Link
                    href="/auth/sign-in"
                    onClick={() => setIsOpen(false)}
                    className="btn-secondary text-center text-sm"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    onClick={() => setIsOpen(false)}
                    className="btn-primary text-center text-sm"
                  >
                    Create account
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
