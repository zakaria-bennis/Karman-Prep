"use client";

// ============================================================
// Score Guarantee page — full terms for the 50-point guarantee
// and 7-day trial money-back promise.
// ============================================================

import { useState } from "react";
import Link from "next/link";
import { Shield, CheckCircle, ChevronDown, ArrowRight, Clock, Star } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { cn } from "@/lib/utils";

const ELIGIBILITY = [
  {
    icon: Clock,
    title: "Stay for at least 4 months",
    desc: "Maintain an active paid subscription for a minimum of 4 consecutive months after your trial ends.",
  },
  {
    icon: CheckCircle,
    title: "Complete the full diagnostic",
    desc: "Take and submit the full Strata diagnostic assessment within your first 7 days on the platform.",
  },
  {
    icon: Star,
    title: "Attend 80% of scheduled sessions",
    desc: "For private and Elite plans, attend at least 80% of your scheduled tutoring sessions (with at least 24-hour notice for any cancellations).",
  },
  {
    icon: Shield,
    title: "Take an official SAT",
    desc: "Sit for an official College Board SAT exam — not a practice test or third-party simulation.",
  },
  {
    icon: CheckCircle,
    title: "Submit your official score report",
    desc: "Provide your official College Board score report within 30 days of your test date to initiate a claim.",
  },
];

const FAQS = [
  {
    q: "What counts as a 50-point improvement?",
    a: "We compare your Strata diagnostic baseline score (taken within your first 7 days) to your official College Board SAT score. If the difference is less than 50 points, you are eligible for a full refund — no questions asked.",
  },
  {
    q: "Does the guarantee apply to the Seminar ($40/mo) plan?",
    a: "Yes — all paid plans are eligible for the 50-point score improvement guarantee as long as you meet the eligibility requirements. The Seminar plan does not include 1-on-1 sessions, so the session attendance requirement applies to the platform practice sessions instead.",
  },
  {
    q: "What if I took an SAT before joining Strata?",
    a: "We use your Strata diagnostic score as the baseline, not any prior SAT score. This makes the benchmark consistent and fair regardless of your testing history before joining.",
  },
  {
    q: "How long does a refund take to process?",
    a: "Once your claim is verified (usually within 3 business days), refunds are processed to your original payment method within 5–10 business days.",
  },
  {
    q: "Can I get a partial refund if I improved, just not by 50 points?",
    a: "The guarantee is specifically for improvements of less than 50 points. We do not offer partial refunds based on partial improvement — but we will work with you personally to adjust your study plan and help you hit your target.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{q}</span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function GuaranteePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white dark:bg-slate-950">

        {/* Hero */}
        <section className="bg-gradient-to-b from-blue-50/80 to-white dark:from-slate-900 dark:to-slate-950 pt-20 pb-16 text-center px-4">
          <div className="max-w-3xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              The 50-Point{" "}
              <span className="text-blue-600 dark:text-blue-400">Score Guarantee</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
              If you follow the Strata program and your SAT score doesn&apos;t improve by at least 50 points, we will refund every dollar you paid. No fine print. No runaround.
            </p>
          </div>
        </section>

        {/* Main guarantee card */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">

          {/* The promise */}
          <div className="glass-card p-8 text-center border-2 border-blue-200 dark:border-blue-700">
            <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-3">Our Promise</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-snug">
              Improve your SAT score by 50 points — or get a{" "}
              <span className="text-blue-600 dark:text-blue-400">full refund.</span>
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              We measure your improvement from your Strata diagnostic baseline to your official College Board SAT score. If the gap is less than 50 points and you met all eligibility requirements, we refund 100% of subscription fees paid.
            </p>
          </div>

          {/* Eligibility */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              Eligibility requirements
            </h2>
            <div className="space-y-4">
              {ELIGIBILITY.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4 glass-card p-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How to claim */}
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">How to claim</h2>
            <ol className="space-y-3">
              {[
                "Take your official SAT and receive your College Board score report.",
                "Email guarantee@strataSAT.com with your score report attached within 30 days of your test date.",
                "We will verify your eligibility within 3 business days.",
                "If approved, your full refund is processed to your original payment method within 5–10 business days.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">
              Questions? Email <a href="mailto:guarantee@strataSAT.com" className="underline hover:text-blue-500">guarantee@strataSAT.com</a> — we respond within 24 hours.
            </p>
          </div>

          {/* 7-day trial guarantee */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  7-Day Trial Money-Back Guarantee
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Not a good fit? Cancel any time before the end of your 7-day free trial and you will not be charged — ever. If you are billed on day 8 and contact us within 24 hours, we will issue a full refund with no questions asked. This is separate from the 50-point score guarantee.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Frequently asked questions
            </h2>
            <div className="glass-card px-6">
              {FAQS.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center py-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
              Ready to guarantee your score improvement?
            </p>
            <Link href="/auth/sign-up" className="btn-primary text-base px-8 py-4 inline-flex">
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="mt-3 text-xs text-slate-400">Cancel anytime</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
