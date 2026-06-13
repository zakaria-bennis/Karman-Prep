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
    title: "Stay for at least 16 weeks",
    desc: "Maintain an active paid subscription for a minimum of 16 consecutive weeks after your trial ends.",
  },
  {
    icon: CheckCircle,
    title: "Complete the full diagnostic",
    desc: "Take and submit the full Karman diagnostic assessment within your first 7 days on the platform.",
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
    a: "We compare your Karman diagnostic baseline score (taken within your first 7 days) to your official College Board SAT score. If the difference is less than 50 points, you are eligible for a full refund — no questions asked.",
  },
  {
    q: "Does the guarantee apply to the Seminar ($40/mo) plan?",
    a: "Yes — all paid plans are eligible for the 50-point score improvement guarantee as long as you meet the eligibility requirements. The Seminar plan does not include 1-on-1 sessions, so the session attendance requirement applies to the platform practice sessions instead.",
  },
  {
    q: "What if I took an SAT before joining Karman?",
    a: "We use your Karman diagnostic score as the baseline, not any prior SAT score. This makes the benchmark consistent and fair regardless of your testing history before joining.",
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
    <div className="border-b border-bronze last:border-0 dark:border-bronze">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-semibold text-ivory dark:text-ivory">{q}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-taupe transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-taupe dark:text-ivory">{a}</p>}
    </div>
  );
}

export default function GuaranteePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface dark:bg-night">
        {/* Hero */}
        <section className="bg-gradient-to-b from-info/80 to-white px-4 pb-16 pt-20 text-center dark:from-surface dark:to-night">
          <div className="mx-auto max-w-3xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-info">
              <Shield className="h-8 w-8 text-ivory" />
            </div>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-ivory dark:text-ivory sm:text-5xl">
              The 50-Point <span className="text-info dark:text-info">Score Guarantee</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-taupe dark:text-ivory">
              If you follow the Karman program and your SAT score doesn&apos;t improve by at least
              50 points, we will refund every dollar you paid. No fine print. No runaround.
            </p>
          </div>
        </section>

        {/* Main guarantee card */}
        <section className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6">
          {/* The promise */}
          <div className="glass-card border-2 border-info/40 p-8 text-center dark:border-info/40">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-info">
              Our Promise
            </p>
            <p className="text-2xl font-bold leading-snug text-ivory dark:text-ivory">
              Improve your SAT score by 50 points — or get a{" "}
              <span className="text-info dark:text-info">full refund.</span>
            </p>
            <p className="mt-4 text-sm text-taupe dark:text-taupe">
              We measure your improvement from your Karman diagnostic baseline to your official
              College Board SAT score. If the gap is less than 50 points and you met all eligibility
              requirements, we refund 100% of subscription fees paid.
            </p>
          </div>

          {/* Eligibility */}
          <div>
            <h2 className="mb-6 text-xl font-bold text-ivory dark:text-ivory">
              Eligibility requirements
            </h2>
            <div className="space-y-4">
              {ELIGIBILITY.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="glass-card flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/10 dark:bg-info/30">
                    <Icon className="h-5 w-5 text-info dark:text-info" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ivory dark:text-ivory">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-taupe dark:text-taupe">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How to claim */}
          <div className="glass-card p-8">
            <h2 className="mb-4 text-xl font-bold text-ivory dark:text-ivory">How to claim</h2>
            <ol className="space-y-3">
              {[
                "Take your official SAT and receive your College Board score report.",
                "Email guarantee@karmanprep.com with your score report attached within 30 days of your test date.",
                "We will verify your eligibility within 3 business days.",
                "If approved, your full refund is processed to your original payment method within 5–10 business days.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-taupe dark:text-ivory">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info text-xs font-bold text-ivory">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs text-taupe dark:text-taupe">
              Questions? Email{" "}
              <a href="mailto:guarantee@karmanprep.com" className="underline hover:text-info">
                guarantee@karmanprep.com
              </a>{" "}
              — we respond within 24 hours.
            </p>
          </div>

          {/* 7-day trial guarantee */}
          <div className="rounded-2xl border border-success/40 bg-success/10 p-8 dark:border-success/40 dark:bg-success/20">
            <div className="flex items-start gap-4">
              <CheckCircle className="mt-0.5 h-7 w-7 shrink-0 text-success dark:text-success" />
              <div>
                <h2 className="mb-2 text-lg font-bold text-ivory dark:text-ivory">
                  7-Day Trial Money-Back Guarantee
                </h2>
                <p className="text-sm leading-relaxed text-taupe dark:text-ivory">
                  Not a good fit? Cancel any time before the end of your 7-day free trial and you
                  will not be charged — ever. If you are billed on day 8 and contact us within 24
                  hours, we will issue a full refund with no questions asked. This is separate from
                  the 50-point score guarantee.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="mb-2 text-xl font-bold text-ivory dark:text-ivory">
              Frequently asked questions
            </h2>
            <div className="glass-card px-6">
              {FAQS.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="py-4 text-center">
            <p className="mb-5 text-sm text-taupe dark:text-taupe">
              Ready to guarantee your score improvement?
            </p>
            <Link href="/auth/sign-up" className="btn-primary inline-flex px-8 py-4 text-base">
              Start Your Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-xs text-taupe">Cancel anytime</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
