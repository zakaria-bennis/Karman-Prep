// ============================================================
// Root layout — Clerk + ThemeProvider + global styles
// ============================================================

import type { Metadata } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { strataClerkAppearance } from "@/lib/clerkAppearance";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { ConfirmProvider } from "@/components/shared/ConfirmDialog";
import ImpersonationBanner from "@/components/admin/ImpersonationBanner";
import { IMPERSONATE_COOKIE } from "@/lib/supabase/queries/admin";
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

export const metadata: Metadata = {
  // Resolves relative OG image paths and canonical URLs to the production
  // domain so social-share previews work in dev and prod.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://karmanprep.com"
  ),
  title: {
    default: "Karman — SAT Tutoring That Gets Results",
    template: "%s | Karman",
  },
  description:
    "Personalized SAT prep with expert tutors, adaptive diagnostics, and a score improvement guarantee. Group, private, and elite plans starting at $40/month.",
  keywords: ["SAT tutoring", "SAT prep", "SAT math", "college admissions", "score improvement", "online SAT tutor"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "Karman",
    title: "Karman — SAT Tutoring That Gets Results",
    description: "Personalized SAT prep with expert tutors, adaptive diagnostics, and a score improvement guarantee.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Karman — SAT Tutoring That Gets Results",
    description: "Personalized SAT prep. Score improvement guarantee.",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Check for the admin "View as" cookie — if set, we float a banner
  // site-wide so the admin can always exit impersonation, even from
  // inside a portal they don't normally control.
  const cookieStore = await cookies();
  const impersonatedRole = cookieStore.get(IMPERSONATE_COOKIE)?.value ?? null;

  return (
    <ClerkProvider
      appearance={strataClerkAppearance}
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
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ThemeProvider>
            <ConfirmProvider>
              {impersonatedRole && <ImpersonationBanner role={impersonatedRole} />}
              {children}
            </ConfirmProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
