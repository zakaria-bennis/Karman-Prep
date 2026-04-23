"use client";

// ============================================================
// Pricing section — all four tiers with feature lists.
// Each CTA links to Stripe checkout (via sign-up flow).
// ============================================================

import Link from "next/link";
import { Check, Zap, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRICING_TIERS } from "@/types";

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Transparent pricing. No surprises.
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            All plans include a 7-day free trial. Cancel anytime before day 8.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={cn(
                "relative rounded-2xl p-6 flex flex-col gap-5 transition-all",
                tier.highlighted
                  ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-2xl shadow-blue-500/25 scale-105 border-0"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md",
                tier.bestValue && "pt-8"
              )}
            >
              {tier.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Most Popular
                </div>
              )}
              {tier.bestValue && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 shadow-md shadow-amber-500/30">
                  <Gem className="w-3 h-3" /> Best Value
                </div>
              )}

              {/* Header */}
              <div>
                <h3
                  className={cn(
                    "text-lg font-bold mb-1",
                    tier.highlighted ? "text-white" : "text-slate-900 dark:text-white"
                  )}
                >
                  {tier.name}
                </h3>
                <p
                  className={cn(
                    "text-xs leading-relaxed",
                    tier.highlighted ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {tier.description}
                </p>
              </div>

              {/* Price */}
              <div className="flex items-end gap-1">
                <span
                  className={cn(
                    "text-4xl font-extrabold",
                    tier.highlighted ? "text-white" : "text-slate-900 dark:text-white"
                  )}
                >
                  {tier.price}
                </span>
                <span
                  className={cn(
                    "text-sm mb-1.5",
                    tier.highlighted ? "text-blue-200" : "text-slate-400"
                  )}
                >
                  {tier.period}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={cn(
                        "w-4 h-4 shrink-0 mt-0.5",
                        tier.highlighted ? "text-blue-200" : "text-emerald-500"
                      )}
                    />
                    <span className={tier.highlighted ? "text-blue-100" : "text-slate-600 dark:text-slate-300"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={`/auth/sign-up?tier=${tier.id}`}
                className={cn(
                  "text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all",
                  tier.highlighted
                    ? "bg-white text-blue-700 hover:bg-blue-50 shadow-lg"
                    : "btn-primary"
                )}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Guarantee note */}
        <div className="text-center mt-8 space-y-1.5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            All plans include our{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">50-point score improvement guarantee*</span>
            {" "}or your money back.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            *Terms apply.{" "}
            <Link href="/guarantee" className="underline hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              See full guarantee terms
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
