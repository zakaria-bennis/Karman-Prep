// ============================================================
// Refund Policy page
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle, AlertCircle, CreditCard, Shield } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Refund Policy — Karman SAT Tutoring",
  description:
    "Karman's refund policy: 7-day trial money-back guarantee and 50-point score improvement guarantee. Full details on how to request a refund.",
};

const SECTIONS = [
  {
    icon: CheckCircle,
    color: "text-success dark:text-success",
    bg: "bg-success/10 dark:bg-success/20",
    border: "border-success/40 dark:border-success/40",
    title: "7-Day Trial Money-Back Guarantee",
    content: (
      <>
        <p className="mb-3 text-sm leading-relaxed text-taupe dark:text-ivory">
          All new Karman subscriptions include a 7-day free trial. You will not be charged during
          this period. If you cancel before day 8, you owe nothing — ever.
        </p>
        <p className="mb-3 text-sm leading-relaxed text-taupe dark:text-ivory">
          If you are billed on day 8 and contact us within 24 hours of that charge, we will issue a
          full refund, no questions asked. This applies to all plans.
        </p>
        <p className="text-sm leading-relaxed text-taupe dark:text-ivory">
          To cancel during your trial: go to{" "}
          <strong>Account → Billing → Cancel Subscription</strong>, or email{" "}
          <a href="mailto:billing@karmanprep.com" className="text-info underline dark:text-info">
            billing@karmanprep.com
          </a>
          .
        </p>
      </>
    ),
  },
  {
    icon: Shield,
    color: "text-info dark:text-info",
    bg: "bg-info/10 dark:bg-info/20",
    border: "border-info/40 dark:border-info/40",
    title: "50-Point Score Improvement Guarantee",
    content: (
      <>
        <p className="mb-3 text-sm leading-relaxed text-taupe dark:text-ivory">
          If you complete the Karman program — including the full diagnostic, maintaining an active
          subscription for at least 16 weeks, attending your scheduled sessions, and taking an
          official College Board SAT — and your score does not improve by at least 50 points, we
          will refund every dollar you paid.
        </p>
        <p className="text-sm leading-relaxed text-taupe dark:text-ivory">
          Full eligibility requirements and how to claim are detailed on our{" "}
          <Link href="/guarantee" className="text-info underline hover:opacity-80 dark:text-info">
            Score Guarantee page
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    icon: CreditCard,
    color: "text-gold dark:text-gold",
    bg: "bg-gold/10 dark:bg-gold/20",
    border: "border-gold/40 dark:border-gold/40",
    title: "Cancellation vs. Refund",
    content: (
      <>
        <p className="mb-3 text-sm leading-relaxed text-taupe dark:text-ivory">
          <strong className="text-ivory dark:text-ivory">Cancellation</strong> stops future billing.
          You keep access to the platform through the end of your current billing period, and no
          further charges are made. Cancellation does not automatically trigger a refund for the
          current period.
        </p>
        <p className="text-sm leading-relaxed text-taupe dark:text-ivory">
          <strong className="text-ivory dark:text-ivory">Refunds</strong> return money already
          charged. Outside of the 7-day trial window and the 50-point guarantee, Karman does not
          offer prorated refunds for unused time in a billing period — but we review edge cases
          individually. Contact us at{" "}
          <a href="mailto:billing@karmanprep.com" className="text-info underline dark:text-info">
            billing@karmanprep.com
          </a>
          .
        </p>
      </>
    ),
  },
  {
    icon: AlertCircle,
    color: "text-warning dark:text-warning",
    bg: "bg-warning/10 dark:bg-warning/20",
    border: "border-warning/40 dark:border-warning/40",
    title: "Annual Plans",
    content: (
      <>
        <p className="mb-3 text-sm leading-relaxed text-taupe dark:text-ivory">
          Annual plan subscribers may request a prorated refund within the first 30 days of
          purchase. After 30 days, annual subscriptions are non-refundable but remain active for the
          full year.
        </p>
        <p className="text-sm leading-relaxed text-taupe dark:text-ivory">
          The 50-point score improvement guarantee applies to annual plans under the same
          eligibility conditions as monthly plans.
        </p>
      </>
    ),
  },
];

export default function RefundsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface dark:bg-night">
        {/* Header */}
        <section className="bg-gradient-to-b from-surface to-white px-4 pb-12 pt-20 text-center dark:from-surface dark:to-night">
          <div className="mx-auto max-w-2xl">
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-ivory dark:text-ivory">
              Refund Policy
            </h1>
            <p className="text-base text-taupe dark:text-taupe">
              Effective April 2025 · Questions? Email{" "}
              <a
                href="mailto:billing@karmanprep.com"
                className="text-info underline dark:text-info"
              >
                billing@karmanprep.com
              </a>
            </p>
          </div>
        </section>

        {/* Policy sections */}
        <section className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
          {SECTIONS.map(({ icon: Icon, color, bg, border, title, content }) => (
            <div key={title} className={`rounded-2xl border ${border} p-6`}>
              <div className="flex items-start gap-4">
                <div
                  className={`h-10 w-10 rounded-xl ${bg} flex shrink-0 items-center justify-center`}
                >
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="flex-1">
                  <h2 className="mb-3 font-bold text-ivory dark:text-ivory">{title}</h2>
                  {content}
                </div>
              </div>
            </div>
          ))}

          {/* How to request */}
          <div className="glass-card p-6">
            <h2 className="mb-4 font-bold text-ivory dark:text-ivory">How to request a refund</h2>
            <ol className="space-y-3">
              {[
                "Email billing@karmanprep.com with your account email and the reason for your refund request.",
                "For the 50-point guarantee: attach your official College Board score report.",
                "We will respond within 1 business day to confirm receipt.",
                "Approved refunds are returned to your original payment method within 5–10 business days.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-taupe dark:text-ivory">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info text-xs font-bold text-ivory">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Non-refundable note */}
          <div className="glass-card p-6">
            <h2 className="mb-3 font-bold text-ivory dark:text-ivory">Non-refundable items</h2>
            <ul className="space-y-2">
              {[
                "Sessions already delivered by a tutor",
                "Monthly subscription fees outside the 7-day trial window (unless covered by the score guarantee)",
                "Annual plan fees after the first 30 days",
                "Subscription fees for months where the 50-point guarantee eligibility requirements were not met",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-taupe dark:text-ivory"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-taupe" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 text-center">
            <Link href="/guarantee" className="btn-primary inline-flex px-6 py-3 text-sm">
              View Full Score Guarantee Terms
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
