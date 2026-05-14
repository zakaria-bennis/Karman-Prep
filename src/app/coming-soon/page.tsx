// ============================================================
// /coming-soon — public-facing maintenance page.
//
// Shown to every visitor who isn't signed in (see middleware.ts).
// Intentionally generic: no team names, no bios, no scoreboard,
// no admin paths. Just the wordmark, a short tagline, and a
// passive-voice email-notify form.
//
// To launch the site, set NEXT_PUBLIC_KARMAN_LAUNCHED=true in
// the env (Cloudflare Worker secret) and redeploy. The middleware
// gate flips off and existing public routes (/, /faq, /about, etc.)
// become reachable again.
// ============================================================

import type { Metadata } from "next";
import { StrataLogo } from "@/components/shared/StrataLogo";
import ComingSoonForm from "./ComingSoonForm";

export const metadata: Metadata = {
  title: "Karman — Coming Soon",
  description: "Coming soon.",
  // Discourage indexing while the site is gated. Robots that
  // honor this won't archive coming-soon as the canonical page.
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <main className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center mb-8">
          <StrataLogo size={56} variant="stacked" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
          Coming <span className="italic font-light text-slate-400">soon</span>
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed mb-8">
          We&apos;re finalizing something we&apos;ve been working on for a long time.
          Drop your email and we&apos;ll let you know the moment it&apos;s ready.
        </p>

        <ComingSoonForm />

        <p className="mt-10 text-[11px] text-slate-600">
          © {new Date().getFullYear()} Karman
        </p>
      </main>
    </div>
  );
}
