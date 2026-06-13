"use client";

// ============================================================
// FAQ client — accordion Q&A sections with smooth open/close
// ============================================================

import { useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_SECTIONS: { title: string; items: FAQItem[] }[] = [
  {
    title: "Getting Started",
    items: [
      {
        q: "What is Karman?",
        a: "Karman is a personalized SAT tutoring platform built around two expert tutors — Zakaria and Nabil. We combine adaptive diagnostic assessments, structured lesson plans, and 1-on-1 coaching to help students improve their SAT scores by an average of 285 points.",
      },
      {
        q: "How does the free trial work?",
        a: "Every subscription plan includes a 7-day free trial. You'll enter your card details upfront, but you won't be charged until day 8. You can cancel anytime before then with no fee. If you cancel, you keep access through the end of your trial period.",
      },
      {
        q: "Who are the tutors?",
        a: "Zakaria and Nabil are the core tutors at Karman. Both scored in the 99th percentile on the SAT and have collectively tutored over 2,400 students. They specialize in SAT math and have developed a teaching methodology that consistently produces 200–300+ point improvements. Students regularly credit them by name for their success.",
      },
      {
        q: "What's the first thing I should do after signing up?",
        a: "Take the free 20-question diagnostic assessment. It covers all four SAT math domains and gives you a predicted score range, a domain-by-domain breakdown, and an auto-generated learning path. The whole thing takes about 35 minutes and immediately tells you where to focus.",
      },
      {
        q: "Is Karman just for math, or does it cover Reading & Writing too?",
        a: "Our current curriculum is focused on SAT Math, which is where the largest score improvements come from for most students. Reading & Writing content is on our roadmap and will be available soon.",
      },
    ],
  },
  {
    title: "Tutors & Sessions",
    items: [
      {
        q: "Will I work with Zakaria or Nabil directly?",
        a: "Yes — on Private and Elite plans, you're matched directly with Zakaria or Nabil for 1-on-1 sessions. On Seminar plans, sessions are also led by our expert tutors. You'll get to indicate any preference during onboarding.",
      },
      {
        q: "How do I schedule a session?",
        a: "After subscribing, you'll get access to the scheduling portal where you can book sessions directly on Zakaria and Nabil's calendars. Sessions are typically available weekday evenings and weekend mornings/afternoons.",
      },
      {
        q: "What happens if I need to reschedule?",
        a: "You can reschedule any session up to 24 hours in advance at no charge. Cancellations or reschedules within 24 hours may be counted as a used session depending on your plan.",
      },
      {
        q: "Are sessions conducted online or in person?",
        a: "All sessions are conducted online via video call (Zoom or Google Meet). Sessions are recorded so you can review them afterward — especially useful for revisiting how Zakaria or Nabil solved a tricky problem.",
      },
      {
        q: "What does a typical 1-on-1 session look like?",
        a: "Sessions usually start with a quick review of recent practice problems, then move into targeted instruction on your weakest concepts. Zakaria and Nabil use a Socratic method — they guide you to the answer rather than just giving it, which builds genuine understanding and test-day confidence.",
      },
    ],
  },
  {
    title: "Pricing & Billing",
    items: [
      {
        q: "What plans are available?",
        a: "We offer four plans: Seminar ($40/month) for live seminar-style group sessions and full curriculum access; Private ($135/session) for 1-on-1 sessions booked as you go; Elite ($800/month) for 8 private sessions per month with a dedicated elite specialist; and Annual ($384/year) for the best per-month value on full access.",
      },
      {
        q: "Can I switch plans after signing up?",
        a: "Yes. You can upgrade, downgrade, or cancel at any time through the Billing page in your dashboard. Upgrades take effect immediately; downgrades take effect at the next billing cycle.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover) via Stripe. All transactions are encrypted and PCI-compliant.",
      },
      {
        q: "Is there a discount for paying annually?",
        a: "Yes — the Annual plan is $384/year, which works out to $32/month. That's a 20% saving compared to the Group monthly plan, plus you get two bonus 1-on-1 coaching sessions included.",
      },
      {
        q: "Do sessions roll over if I don't use them?",
        a: "On the Elite plan, unused session credits do not roll over month to month. On the Private plan, you only pay per session you book, so there's nothing to roll over.",
      },
    ],
  },
  {
    title: "Score Improvement Guarantee",
    items: [
      {
        q: "What is the score improvement guarantee?",
        a: "If you follow your personalized learning path consistently for 16 weeks and don't improve by at least 50 points on your next official SAT, we'll give you a full refund — no questions asked.",
      },
      {
        q: "What does 'following the learning path' mean?",
        a: "It means completing at least 80% of the recommended lessons each week, taking all scheduled practice quizzes, and attending your scheduled tutoring sessions. We track this automatically in your dashboard.",
      },
      {
        q: "Does the guarantee apply to all plans?",
        a: "Yes — the 50-point improvement guarantee applies to all active subscribers across all plans. Elite students typically see even higher improvements (our average is +285 pts), but the guarantee is 50 points minimum.",
      },
      {
        q: "How do I claim the guarantee?",
        a: "Email us at support@karmanprep.com with your official SAT score report (before and after). We'll review your completion record in the dashboard and process your refund within 5 business days if you qualify.",
      },
    ],
  },
  {
    title: "The Curriculum & Learning Path",
    items: [
      {
        q: "How does the diagnostic work?",
        a: "The diagnostic is a 20-question adaptive assessment timed at 90 seconds per question. It covers Algebra, Advanced Math, Geometry, and Data Analysis. After you finish, you instantly see your predicted score range, a color-coded domain breakdown, and a personalized concept map of what to study first.",
      },
      {
        q: "How are concepts unlocked?",
        a: "Concepts unlock linearly based on prerequisites. For example, you need to master Linear Equations before Systems of Equations becomes available. A concept is marked 'mastered' when you score 80% or above on its quiz.",
      },
      {
        q: "How many lessons are in the curriculum?",
        a: "The current library has 15 core SAT math concepts with associated lessons, videos, and practice questions. We're adding 10–15 new concepts per month, aiming for 100+ concepts by end of year.",
      },
      {
        q: "Can parents track their child's progress?",
        a: "Yes — parents who sign up with the Parent role get a dedicated dashboard showing their child's streak, mastered concepts, domain progress, and predicted score trend. Weekly progress emails are also sent automatically.",
      },
    ],
  },
  {
    title: "Technical & Account",
    items: [
      {
        q: "What devices can I use Karman on?",
        a: "Karman is fully mobile-responsive and works on any device — phone, tablet, or desktop. Most students do self-paced lessons on their phones and tutoring sessions on a laptop.",
      },
      {
        q: "Can I use Karman on multiple devices?",
        a: "Yes — your account syncs across all devices. Start a lesson on your phone and continue on your laptop seamlessly.",
      },
      {
        q: "How do I reset my password?",
        a: "Click 'Sign In' and then 'Forgot password'. You'll receive a reset link by email within a few minutes. If you don't see it, check your spam folder.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "Go to Dashboard → Billing → Manage Plan. From there you can cancel, downgrade, or update your payment method directly through the Stripe portal. Your access continues until the end of the current billing period.",
      },
    ],
  },
];

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-bronze last:border-0 dark:border-bronze">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold text-ivory transition-colors hover:text-info dark:text-ivory dark:hover:text-info-bright"
      >
        <span>{item.q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-taupe transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        )}
      >
        <p className="text-sm leading-relaxed text-taupe dark:text-ivory">{item.a}</p>
      </div>
    </div>
  );
}

export default function FAQClient() {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggle = (key: string) => setOpenItem(openItem === key ? null : key);

  return (
    <main className="min-h-screen bg-surface dark:bg-night">
      {/* Hero */}
      <div className="bg-gradient-to-b from-info/10 to-white px-4 py-16 text-center dark:from-surface dark:to-night">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-info/10 px-4 py-1.5 text-sm font-semibold text-info dark:bg-info/30 dark:text-info-bright">
          <TrendingUp className="h-3.5 w-3.5" />
          Frequently Asked Questions
        </div>
        <h1 className="mb-4 text-4xl font-extrabold text-ivory dark:text-ivory sm:text-5xl">
          Got questions? We&apos;ve got answers.
        </h1>
        <p className="mx-auto max-w-xl text-taupe dark:text-taupe">
          Everything you need to know about Karman, our tutors, pricing, and the score improvement
          guarantee.
        </p>
      </div>

      {/* FAQ sections */}
      <div className="mx-auto max-w-3xl space-y-12 px-4 py-16 sm:px-6">
        {FAQ_SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="mb-2 border-b-2 border-info/40 pb-3 text-lg font-bold text-ivory dark:text-ivory">
              {section.title}
            </h2>
            <div>
              {section.items.map((item, idx) => {
                const key = `${section.title}-${idx}`;
                return (
                  <AccordionItem
                    key={key}
                    item={item}
                    isOpen={openItem === key}
                    onToggle={() => toggle(key)}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {/* Still have questions CTA */}
        <div className="glass-card p-8 text-center">
          <h3 className="mb-2 text-xl font-bold text-ivory dark:text-ivory">
            Still have questions?
          </h3>
          <p className="mb-6 text-sm text-taupe dark:text-taupe">
            Our team is happy to help. Reach out and we&apos;ll get back to you within a few hours.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a href="mailto:support@karmanprep.com" className="btn-secondary text-sm">
              Email support@karmanprep.com
            </a>
            <Link href="/auth/sign-up" className="btn-primary text-sm">
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
