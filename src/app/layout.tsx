// ============================================================
// Root layout — Clerk + ThemeProvider + global styles
// ============================================================

import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
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
  title: {
    default: "Strata — SAT Tutoring That Gets Results",
    template: "%s | Strata",
  },
  description:
    "Personalized SAT prep with expert tutors, adaptive diagnostics, and a score improvement guarantee. Group, private, and elite plans starting at $40/month.",
  keywords: ["SAT tutoring", "SAT prep", "SAT math", "college admissions", "score improvement", "online SAT tutor"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "Strata",
    title: "Strata — SAT Tutoring That Gets Results",
    description: "Personalized SAT prep with expert tutors, adaptive diagnostics, and a score improvement guarantee.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Strata — SAT Tutoring That Gets Results",
    description: "Personalized SAT prep. Score improvement guarantee.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard/student"
      signUpFallbackRedirectUrl="/onboarding"
      afterSignOutUrl="/"
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
