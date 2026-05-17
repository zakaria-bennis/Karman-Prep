// ============================================================
// Root layout — Clerk + ThemeProvider + global styles
// ============================================================

import type { Metadata } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import {
  IBM_Plex_Serif,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Atkinson_Hyperlegible,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { karmanClerkAppearance } from "@/lib/clerkAppearance";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { ConfirmProvider } from "@/components/shared/ConfirmDialog";
import ImpersonationBanner from "@/components/admin/ImpersonationBanner";
import ReplayConsentBanner from "@/components/consent/ReplayConsentBanner";
import { IMPERSONATE_COOKIE, IMPERSONATE_USER_COOKIE } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveConsentState } from "@/lib/consent/server";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// ─── Karman type stack (docs/brand.md) ────────────────────────
//   Plex Serif    → display + headings
//   Plex Sans     → body, UI labels, buttons
//   Plex Mono     → technical labels, code, equations
//   Atkinson      → LMS long-form reading (lesson text, passages)
//
// Each registers a CSS variable on <body>; consumed in components
// via `font-family: var(--font-plex-serif), Georgia, serif;` etc.
// Weights below 300 and above 600 are explicitly forbidden by the
// brand brief — only request what's actually used.
// `display: swap` shows the fallback immediately and swaps when
// the webfont loads; LCP-friendly.
const plexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  variable: "--font-plex-serif",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  display: "swap",
});
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  variable: "--font-atkinson",
  weight: ["400", "700"], // Atkinson only ships Regular + Bold
  display: "swap",
});

export const metadata: Metadata = {
  // Resolves relative OG image paths and canonical URLs to the production
  // domain so social-share previews work in dev and prod.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://karmanprep.com"),
  title: {
    default: "Karman — SAT Tutoring That Gets Results",
    template: "%s | Karman",
  },
  description:
    "Personalized SAT prep with expert tutors, adaptive diagnostics, and a score improvement guarantee. Group, private, and elite plans starting at $40/month.",
  keywords: [
    "SAT tutoring",
    "SAT prep",
    "SAT math",
    "college admissions",
    "score improvement",
    "online SAT tutor",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "Karman",
    title: "Karman — SAT Tutoring That Gets Results",
    description:
      "Personalized SAT prep with expert tutors, adaptive diagnostics, and a score improvement guarantee.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Karman — SAT Tutoring That Gets Results",
    description: "Personalized SAT prep. Score improvement guarantee.",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Check for the admin "View as" cookies — if either is set, float
  // a banner site-wide so the admin can always exit impersonation,
  // even from inside a portal they don't normally control.
  const cookieStore = await cookies();
  const impersonatedRole = cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null;
  const impersonatedUserId = cookieStore.get(IMPERSONATE_USER_COOKIE)?.value ?? null;
  const consentState = await resolveConsentState();

  let impersonatedUserName: string | null = null;
  if (impersonatedUserId) {
    const { data } = await createAdminClient()
      .from("users")
      .select("first_name, last_name, email")
      .eq("id", impersonatedUserId)
      .maybeSingle();
    if (data) {
      const full = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
      impersonatedUserName = full || (data.email as string | null) || null;
    }
  }

  return (
    <ClerkProvider
      appearance={karmanClerkAppearance}
      localization={{
        signIn: {
          start: {
            title: "Log in to Karman",
            subtitle: "Welcome back",
          },
        },
        signUp: {
          start: {
            title: "Create your Karman account",
            subtitle: "Start your free trial",
          },
        },
      }}
      signInFallbackRedirectUrl="/dashboard/student"
      signUpFallbackRedirectUrl="/onboarding"
      afterSignOutUrl="/"
    >
      <html lang="en" className="dark" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${plexSerif.variable} ${plexSans.variable} ${plexMono.variable} ${atkinson.variable} antialiased`}
        >
          <ThemeProvider>
            <ConfirmProvider>
              {impersonatedRole && (
                <ImpersonationBanner role={impersonatedRole} userName={impersonatedUserName} />
              )}
              {children}
              <ReplayConsentBanner show={consentState === "banner_show"} />
            </ConfirmProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
