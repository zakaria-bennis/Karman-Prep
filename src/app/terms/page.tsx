// ============================================================
// Terms of Service page
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — Karman SAT Tutoring",
  description: "Karman's Terms of Service covering subscriptions, sessions, cancellation, the score guarantee, and acceptable use.",
};

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: `By creating a Karman account or using the Karman platform (karmanprep.com), you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the platform. These terms apply to all users including students, parents, and tutors.`,
  },
  {
    id: "subscriptions",
    title: "2. Subscriptions & Billing",
    content: null,
    list: [
      "Karman offers monthly and annual subscription plans. All plans begin with a 7-day free trial. You will not be charged during the trial period.",
      "On day 8 of your trial, your card on file will be automatically charged at the rate of your selected plan. You authorize this recurring charge by entering your payment details.",
      "Monthly subscriptions renew automatically on the same date each month. Annual subscriptions renew on the anniversary of your purchase date.",
      "All prices are in USD and inclusive of applicable taxes where required.",
      "We reserve the right to change pricing with 30 days' advance notice by email. Continued use after the notice period constitutes acceptance of the new price.",
    ],
  },
  {
    id: "cancellation",
    title: "3. Cancellation",
    content: null,
    list: [
      "You may cancel your subscription at any time through Account → Billing → Cancel Subscription, or by emailing billing@karmanprep.com.",
      "Cancellation stops future billing. You retain full platform access through the end of your current billing period.",
      "Cancellation does not automatically generate a refund for the current billing period. See our Refund Policy for details.",
      "Cancelling during your 7-day trial before day 8 incurs no charge.",
    ],
  },
  {
    id: "sessions",
    title: "4. Session Policies",
    content: null,
    list: [
      "Sessions must be cancelled with at least 24 hours' advance notice to avoid counting against your monthly session allocation.",
      "Late cancellations (under 24 hours) and no-shows count as completed sessions and are not rescheduled without charge.",
      "Three or more no-shows within a single month may result in account review and temporary suspension of session scheduling privileges.",
      "Session recordings: all group sessions are recorded and available to paid subscribers. Private and Elite sessions are not recorded without explicit consent from both the student and tutor.",
      "Karman reserves the right to substitute an equivalent tutor if your scheduled tutor is unavailable, with advance notice where possible.",
    ],
  },
  {
    id: "guarantee",
    title: "5. Score Improvement Guarantee",
    content: `The 50-point score improvement guarantee is subject to full eligibility requirements detailed at karmanprep.com/guarantee. Meeting the eligibility requirements is the student's responsibility. Karman reserves the right to verify claims using official score documentation.`,
  },
  {
    id: "acceptable-use",
    title: "6. Acceptable Use",
    content: null,
    list: [
      "Accounts are for individual use only. Sharing login credentials with others is prohibited and may result in account termination.",
      "You may not reproduce, distribute, or resell any Karman curriculum, lesson content, or platform materials without written permission.",
      "You may not record tutoring sessions without the explicit consent of your tutor and Karman.",
      "Abusive, harassing, or disrespectful behavior toward tutors or Karman staff will result in immediate account termination without refund.",
      "Karman's platform and content are for lawful educational use only.",
    ],
  },
  {
    id: "intellectual-property",
    title: "7. Intellectual Property",
    content: `All content on the Karman platform — including lesson videos, diagnostic questions, curriculum materials, graphics, and software — is the exclusive property of Karman or its licensors. Nothing in these Terms grants you ownership or a license to use Karman's intellectual property outside of your personal, non-commercial educational use on the platform.`,
  },
  {
    id: "disclaimers",
    title: "8. Disclaimers & Limitation of Liability",
    content: null,
    list: [
      'Karman provides the platform "as is" and makes no guarantees of specific score outcomes beyond the terms of the 50-point guarantee.',
      "Karman is not liable for internet connectivity issues, College Board testing irregularities, or student circumstances outside our control that affect test performance.",
      "To the maximum extent permitted by law, Karman's total liability for any claim is limited to the amount you paid in the preceding 3 months.",
    ],
  },
  {
    id: "governing-law",
    title: "9. Governing Law",
    content: `These Terms are governed by the laws of the State of Texas, United States, without regard to conflict of law principles. Any disputes will be resolved in the courts of Travis County, Texas.`,
  },
  {
    id: "changes",
    title: "10. Changes to These Terms",
    content: `Karman may update these Terms at any time. We will notify you by email at least 14 days before material changes take effect. Continued use of the platform after that date constitutes acceptance of the updated Terms.`,
  },
  {
    id: "contact",
    title: "11. Contact",
    content: `Questions about these Terms? Email legal@karmanprep.com. We respond within 2 business days.`,
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white dark:bg-slate-950">

        {/* Header */}
        <section className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 pt-20 pb-12 text-center px-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Terms of Service
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base">
              Effective April 2025 · Governing law: Texas, United States
            </p>
          </div>
        </section>

        {/* Table of contents + content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 flex flex-col lg:flex-row gap-10">

          {/* TOC sidebar — hidden on mobile */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Contents</p>
              <nav className="space-y-1">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-0.5"
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
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                  {section.title}
                </h2>
                {section.content && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {section.content}
                  </p>
                )}
                {section.list && (
                  <ul className="space-y-2.5">
                    {section.list.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <div className="border-t border-slate-200 dark:border-slate-700 pt-8 flex flex-wrap gap-4 text-sm">
              <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>
              <Link href="/refunds" className="text-blue-600 dark:text-blue-400 hover:underline">Refund Policy</Link>
              <Link href="/guarantee" className="text-blue-600 dark:text-blue-400 hover:underline">Score Guarantee</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
