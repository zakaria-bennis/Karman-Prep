import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { PlanCards } from "@/components/landing/Pricing";
import { PRICING_TIERS } from "@/types";
import { GUARANTEE_POLICY } from "@/lib/guarantee/policy";

export const metadata: Metadata = {
  title: "SAT Prep Plans | Karman Prep",
  description:
    "Compare Seminar, Small Group, Private and Elite SAT prep formats and current pricing.",
};
const FORMATS: Record<string, string> = {
  group: "A regular seminar setting, with curriculum access and live group instruction.",
  small_group: "Tutor-led work in a small cohort, with time to focus on concepts together.",
  private:
    "Individual one-on-one sessions, booked as you go. Bring the skills and questions you want to work on.",
  elite: "Eight private sessions each month with a dedicated SAT specialist.",
};
export default function PlansPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-night text-ivory">
        <section className="mx-auto max-w-7xl px-5 pb-12 pt-8 md:px-8 md:pb-16 md:pt-14">
          <h1 className="font-plex-serif text-4xl leading-tight tracking-tight sm:text-6xl">
            Find your fit.
          </h1>
          <p className="mb-6 mt-3 text-base text-taupe sm:text-lg">
            Four ways to make SAT prep part of your week.
          </p>
          <PlanCards onPlansPage />
          <p className="mt-4 text-sm leading-relaxed text-taupe">
            A {GUARANTEE_POLICY.trial.days}-day trial is offered on Seminar only.
          </p>
        </section>
        <section className="bg-espresso px-5 py-12 md:px-8 md:py-16" aria-label="Plan details">
          <div className="mx-auto max-w-7xl divide-y divide-bronze border-y border-bronze">
            {PRICING_TIERS.map((tier) => (
              <article
                key={tier.id}
                id={tier.id}
                className="grid scroll-mt-24 gap-6 py-8 md:grid-cols-[0.65fr_1fr_0.6fr] md:gap-10"
              >
                <div>
                  <h2 className="font-plex-serif text-3xl">{tier.name}</h2>
                  <p className="mt-3 text-2xl font-semibold">
                    {tier.price}
                    <span className="ml-1 text-sm font-normal text-taupe">{tier.period}</span>
                  </p>
                </div>
                <div>
                  <p className="text-lg leading-relaxed">{FORMATS[tier.id]}</p>
                  <p className="mt-4 text-sm leading-relaxed text-taupe">
                    {tier.id === "group"
                      ? "The 7-day trial applies to Seminar. Review the subscription renewal date and charge shown at checkout."
                      : tier.id === "elite"
                        ? "Monthly subscription. This plan starts without a trial; review renewal and charge details at checkout."
                        : "Priced per session. This format starts without a trial; review the session charge before confirming."}
                  </p>
                </div>
                <div className="md:text-right">
                  <Link
                    href={`/auth/sign-up?tier=${tier.id}`}
                    className="inline-flex min-h-12 items-center gap-2 border-b border-gold font-semibold"
                  >
                    {tier.cta}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <p className="mt-3 text-sm leading-relaxed text-taupe">
                    Continue to your account to review the offer.
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="mx-auto mt-8 max-w-7xl text-sm leading-relaxed text-taupe">
            <p>
              No current standard plan is configured for course-fee protection. Read the{" "}
              <Link href="/guarantee" className="text-ivory underline underline-offset-4">
                guarantee terms
              </Link>{" "}
              and{" "}
              <Link href="/refunds" className="text-ivory underline underline-offset-4">
                refund policy
              </Link>{" "}
              before choosing.
            </p>
            <p className="mt-3">
              Need help choosing?{" "}
              <a
                href="mailto:billing@karmanprep.com"
                className="text-ivory underline underline-offset-4"
              >
                Email Karman Support!
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
