// ============================================================
// Privacy Policy page
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — Karman SAT Tutoring",
  description:
    "How Karman collects, uses, and protects your personal information. GDPR and CCPA compliant.",
};

const SECTIONS = [
  {
    id: "overview",
    title: "1. Overview",
    content: `Karman ("we", "us", "our") operates karmanprep.com and the Karman tutoring platform. This Privacy Policy explains what personal information we collect, how we use it, and your rights regarding that information. We are committed to protecting student and family privacy and comply with applicable U.S. privacy laws including CCPA.`,
  },
  {
    id: "what-we-collect",
    title: "2. Information We Collect",
    content: null,
    subsections: [
      {
        subtitle: "Account information",
        items: [
          "Name and email address (provided at sign-up)",
          "Password (stored securely and hashed by Clerk — never visible to Karman)",
          "Role (student, parent, or tutor)",
          "SAT test date (optional, provided during onboarding)",
        ],
      },
      {
        subtitle: "Platform activity",
        items: [
          "Diagnostic assessment answers and scores",
          "Practice quiz responses and concept progress",
          "Session attendance and scheduling history",
          "Login timestamps and session duration",
        ],
      },
      {
        subtitle: "Payment information",
        items: [
          "Billing details are processed entirely by Stripe. Karman never stores or has access to your full credit card number, CVV, or bank account details.",
          "We retain: your Stripe customer ID, subscription tier, subscription status, and billing history for account management.",
        ],
      },
      {
        subtitle: "Communications",
        items: [
          "Email address for transactional emails (receipts, session reminders, progress reports)",
          "Email address for marketing communications (only with your explicit consent)",
          "Support messages sent to Karman",
        ],
      },
      {
        subtitle: "Automatically collected data",
        items: [
          "Browser type, operating system, and IP address",
          "Pages visited and features used within the platform",
          "Error logs (via Sentry) to identify and fix technical issues",
          "Product analytics (via PostHog) to understand how features are used — no personally identifiable information is included in these analytics reports",
        ],
      },
    ],
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Information",
    content: null,
    list: [
      "Create and manage your Karman account",
      "Personalize your diagnostic results and study path",
      "Deliver and schedule tutoring sessions",
      "Send transactional emails (receipts, reminders, progress reports)",
      "Send marketing emails (only if you opted in — unsubscribe at any time)",
      "Process payments and manage your subscription via Stripe",
      "Monitor platform performance and fix technical issues",
      "Analyze how the platform is used to improve it for all students",
      "Comply with legal obligations",
    ],
  },
  {
    id: "third-parties",
    title: "4. Third-Party Services",
    content:
      "We share minimal data with the following trusted third-party services, each bound by their own privacy policies:",
    table: [
      {
        service: "Clerk",
        purpose: "Authentication — handles sign-in, sign-up, and password security",
        link: "https://clerk.com/privacy",
      },
      {
        service: "Stripe",
        purpose: "Payments — processes all subscription billing and payouts",
        link: "https://stripe.com/privacy",
      },
      {
        service: "Supabase",
        purpose:
          "Database — stores account data, progress, and diagnostic results on encrypted servers",
        link: "https://supabase.com/privacy",
      },
      {
        service: "Resend",
        purpose: "Email delivery — sends transactional and marketing emails",
        link: "https://resend.com/privacy",
      },
      {
        service: "Sentry",
        purpose: "Error monitoring — captures anonymized crash reports to fix platform bugs",
        link: "https://sentry.io/privacy/",
      },
      {
        service: "PostHog",
        purpose: "Product analytics — aggregated, non-personally-identifiable usage data",
        link: "https://posthog.com/privacy",
      },
    ],
  },
  {
    id: "data-retention",
    title: "5. Data Retention",
    content: null,
    list: [
      "Account and progress data is retained for as long as your subscription is active.",
      "After cancellation, your data is retained for 90 days to allow reactivation, then deleted.",
      "Payment records are retained for 7 years as required by financial regulations.",
      "You may request earlier deletion at any time — see Your Rights below.",
    ],
  },
  {
    id: "your-rights",
    title: "6. Your Rights",
    content: "You have the following rights regarding your personal information:",
    list: [
      "Access: request a copy of the personal data we hold about you",
      "Correction: request that we correct inaccurate or incomplete data",
      "Deletion: request that we delete your personal data (subject to legal retention requirements)",
      "Portability: request your data in a machine-readable format",
      "Opt-out of marketing emails: use the unsubscribe link in any email or email privacy@karmanprep.com",
      "California residents (CCPA): you have the right to know what data we sell (we do not sell personal data) and to opt out of any future sale",
    ],
  },
  {
    id: "children",
    title: "7. Children's Privacy",
    content: `The Karman platform is designed for students age 13 and older. We do not knowingly collect personal information from children under 13. If a parent or guardian believes their child under 13 has created an account, please contact us at privacy@karmanprep.com and we will promptly delete the account. For students between 13–17, we encourage parental involvement and offer parent dashboard accounts.`,
  },
  {
    id: "security",
    title: "8. Security",
    content: `We use industry-standard security measures including encrypted data transmission (HTTPS/TLS), encrypted data storage via Supabase, row-level security policies that ensure users can only access their own data, and third-party authentication management via Clerk. No system is 100% secure. If you believe your account has been compromised, contact privacy@karmanprep.com immediately.`,
  },
  {
    id: "changes",
    title: "9. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. We will notify you by email at least 14 days before any material changes take effect. Continued use of the platform after that date constitutes acceptance of the updated policy.`,
  },
  {
    id: "contact",
    title: "10. Contact",
    content: `For any privacy-related questions, requests, or concerns, email privacy@karmanprep.com. We respond within 5 business days.`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface dark:bg-night">
        {/* Header */}
        <section className="bg-gradient-to-b from-surface to-white px-4 pb-12 pt-20 text-center dark:from-surface dark:to-night">
          <div className="mx-auto max-w-2xl">
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-ivory dark:text-ivory">
              Privacy Policy
            </h1>
            <p className="text-base text-taupe dark:text-taupe">
              Effective April 2025 · Questions:{" "}
              <a
                href="mailto:privacy@karmanprep.com"
                className="text-info underline dark:text-info"
              >
                privacy@karmanprep.com
              </a>
            </p>
          </div>
        </section>

        {/* Table of contents + content */}
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6 lg:flex-row">
          {/* TOC sidebar */}
          <aside className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-taupe">
                Contents
              </p>
              <nav className="space-y-1">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block py-0.5 text-sm text-taupe transition-colors hover:text-info dark:text-taupe dark:hover:text-info-bright"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 space-y-10">
            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="mb-3 text-lg font-bold text-ivory dark:text-ivory">
                  {section.title}
                </h2>

                {section.content && (
                  <p className="mb-3 text-sm leading-relaxed text-taupe dark:text-ivory">
                    {section.content}
                  </p>
                )}

                {/* Subsections (for What We Collect) */}
                {"subsections" in section && section.subsections && (
                  <div className="space-y-5">
                    {section.subsections.map((sub) => (
                      <div key={sub.subtitle}>
                        <p className="mb-2 text-sm font-semibold text-ivory dark:text-ivory">
                          {sub.subtitle}
                        </p>
                        <ul className="space-y-1.5">
                          {sub.items.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 text-sm leading-relaxed text-taupe dark:text-ivory"
                            >
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-info" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Simple bullet list */}
                {"list" in section && section.list && (
                  <ul className="space-y-2.5">
                    {section.list.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm leading-relaxed text-taupe dark:text-ivory"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-info" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Third-party table */}
                {"table" in section && section.table && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-bronze dark:border-bronze">
                          <th className="w-28 py-2 pr-4 text-left font-semibold text-ivory dark:text-ivory">
                            Service
                          </th>
                          <th className="py-2 text-left font-semibold text-ivory dark:text-ivory">
                            Purpose
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.map((row) => (
                          <tr
                            key={row.service}
                            className="border-b border-bronze dark:border-bronze"
                          >
                            <td className="py-3 pr-4 align-top font-medium text-ivory dark:text-ivory">
                              <a
                                href={row.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-info hover:underline dark:text-info"
                              >
                                {row.service}
                              </a>
                            </td>
                            <td className="py-3 leading-relaxed text-taupe dark:text-ivory">
                              {row.purpose}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}

            <div className="flex flex-wrap gap-4 border-t border-bronze pt-8 text-sm dark:border-bronze">
              <Link href="/terms" className="text-info hover:underline dark:text-info">
                Terms of Service
              </Link>
              <Link href="/refunds" className="text-info hover:underline dark:text-info">
                Refund Policy
              </Link>
              <Link href="/guarantee" className="text-info hover:underline dark:text-info">
                Score Guarantee
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
