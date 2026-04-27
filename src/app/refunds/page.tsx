// ============================================================
// Refund Policy page
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, AlertCircle, CreditCard, Shield } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Refund Policy — Karman Prep SAT Tutoring",
  description:
    "Karman Prep's refund policy: 7-day trial money-back guarantee and 50-point score improvement guarantee. Full details on how to request a refund.",
};

const SECTIONS = [
  {
    icon: CheckCircle,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-700",
    title: "7-Day Trial Money-Back Guarantee",
    content: (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
          All new Karman Prep subscriptions include a 7-day free trial. You will not be charged during this period. If you cancel before day 8, you owe nothing — ever.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
          If you are billed on day 8 and contact us within 24 hours of that charge, we will issue a full refund, no questions asked. This applies to all plans.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          To cancel during your trial: go to <strong>Account → Billing → Cancel Subscription</strong>, or email <a href="mailto:billing@karmanprep.com" className="text-blue-600 dark:text-blue-400 underline">billing@karmanprep.com</a>.
        </p>
      </>
    ),
  },
  {
    icon: Shield,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-700",
    title: "50-Point Score Improvement Guarantee",
    content: (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
          If you complete the Karman Prep program — including the full diagnostic, maintaining an active subscription for at least 16 weeks, attending your scheduled sessions, and taking an official College Board SAT — and your score does not improve by at least 50 points, we will refund every dollar you paid.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Full eligibility requirements and how to claim are detailed on our{" "}
          <Link href="/guarantee" className="text-blue-600 dark:text-blue-400 underline hover:opacity-80">
            Score Guarantee page
          </Link>.
        </p>
      </>
    ),
  },
  {
    icon: CreditCard,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-700",
    title: "Cancellation vs. Refund",
    content: (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
          <strong className="text-slate-900 dark:text-white">Cancellation</strong> stops future billing. You keep access to the platform through the end of your current billing period, and no further charges are made. Cancellation does not automatically trigger a refund for the current period.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong className="text-slate-900 dark:text-white">Refunds</strong> return money already charged. Outside of the 7-day trial window and the 50-point guarantee, Karman Prep does not offer prorated refunds for unused time in a billing period — but we review edge cases individually. Contact us at{" "}
          <a href="mailto:billing@karmanprep.com" className="text-blue-600 dark:text-blue-400 underline">billing@karmanprep.com</a>.
        </p>
      </>
    ),
  },
  {
    icon: AlertCircle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-700",
    title: "Annual Plans",
    content: (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
          Annual plan subscribers may request a prorated refund within the first 30 days of purchase. After 30 days, annual subscriptions are non-refundable but remain active for the full year.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The 50-point score improvement guarantee applies to annual plans under the same eligibility conditions as monthly plans.
        </p>
      </>
    ),
  },
];

export default function RefundsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white dark:bg-slate-950">

        {/* Header */}
        <section className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 pt-20 pb-12 text-center px-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Refund Policy
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base">
              Effective April 2025 · Questions? Email{" "}
              <a href="mailto:billing@karmanprep.com" className="text-blue-600 dark:text-blue-400 underline">
                billing@karmanprep.com
              </a>
            </p>
          </div>
        </section>

        {/* Policy sections */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          {SECTIONS.map(({ icon: Icon, color, bg, border, title, content }) => (
            <div key={title} className={`rounded-2xl border ${border} p-6`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
                  {content}
                </div>
              </div>
            </div>
          ))}

          {/* How to request */}
          <div className="glass-card p-6">
            <h2 className="font-bold text-slate-900 dark:text-white mb-4">How to request a refund</h2>
            <ol className="space-y-3">
              {[
                "Email billing@karmanprep.com with your account email and the reason for your refund request.",
                "For the 50-point guarantee: attach your official College Board score report.",
                "We will respond within 1 business day to confirm receipt.",
                "Approved refunds are returned to your original payment method within 5–10 business days.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Non-refundable note */}
          <div className="glass-card p-6">
            <h2 className="font-bold text-slate-900 dark:text-white mb-3">Non-refundable items</h2>
            <ul className="space-y-2">
              {[
                "Sessions already delivered by a tutor",
                "Monthly subscription fees outside the 7-day trial window (unless covered by the score guarantee)",
                "Annual plan fees after the first 30 days",
                "Subscription fees for months where the 50-point guarantee eligibility requirements were not met",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center pt-4">
            <Link href="/guarantee" className="btn-primary inline-flex text-sm px-6 py-3">
              View Full Score Guarantee Terms
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
