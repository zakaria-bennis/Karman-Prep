"use client";

// ============================================================
// Pricing section — all four tiers with feature lists.
// Each CTA links to Stripe checkout (via sign-up flow).
// ============================================================

import Link from "next/link";
import { Check, Zap, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRICING_TIERS } from "@/types";
import Reveal from "@/components/shared/Reveal";

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-24 bg-cloud-night bg-grain overflow-hidden">
      {/* Atmospheric glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(ellipse, rgba(127,179,255,0.08), transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <span className="type-label text-blue-300/80">Pricing</span>
          <h2 className="type-display-lg mt-4 text-white">
            Transparent pricing. No <span className="italic text-blue-200 font-[650]">surprises</span>.
          </h2>
          <p className="type-body-lg mt-5 text-slate-400 max-w-xl mx-auto text-balance">
            All plans include this 7-day free trial, cancel any time.
          </p>
        </Reveal>

        <Reveal as="stagger" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {PRICING_TIERS.map((tier) => (
            <Reveal
              key={tier.id}
              className={cn(
                "relative rounded-2xl p-6 flex flex-col gap-5 transition-all backdrop-blur-md",
                tier.highlighted
                  ? "bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-2xl shadow-blue-500/25 scale-105 border-0"
                  : "bg-white/[0.04] border border-white/10 shadow-xl hover:bg-white/[0.07] hover:border-white/20",
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
                    tier.highlighted ? "text-white" : "text-white"
                  )}
                >
                  {tier.name}
                </h3>
                <p
                  className={cn(
                    "text-xs leading-relaxed",
                    tier.highlighted ? "text-blue-100" : "text-slate-400"
                  )}
                >
                  {tier.description}
                </p>
              </div>

              {/* Price */}
              <div className="flex items-end gap-1">
                <span
                  className={cn(
                    "type-mono text-4xl font-extrabold",
                    tier.highlighted ? "text-white" : "text-white"
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
                        tier.highlighted ? "text-blue-200" : "text-emerald-400"
                      )}
                    />
                    <span className={tier.highlighted ? "text-blue-100" : "text-slate-300"}>
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
            </Reveal>
          ))}
        </Reveal>

        {/* Guarantee note */}
        <div className="text-center mt-10 space-y-1.5">
          <p className="text-sm text-slate-400">
            All plans include our{" "}
            <span className="font-semibold text-slate-200">50-point score improvement guarantee*</span>
            {" "}or your money back.
          </p>
          <p className="text-xs text-slate-500">
            *Terms apply.{" "}
            <Link href="/guarantee" className="underline hover:text-blue-300 transition-colors">
              See full guarantee terms
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
