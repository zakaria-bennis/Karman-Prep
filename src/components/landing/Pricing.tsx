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
    <section id="pricing" className="bg-cloud-night bg-grain relative overflow-hidden py-24">
      {/* Atmospheric glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-10 h-[400px] w-[700px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(ellipse, rgba(127,179,255,0.08), transparent 70%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-16 text-center">
          <span className="type-label text-blue-300/80">Pricing</span>
          <h2 className="type-display-lg mt-4 text-white">
            Transparent pricing. No{" "}
            <span className="font-[650] italic text-blue-200">surprises</span>.
          </h2>
          <p className="type-body-lg mx-auto mt-5 max-w-xl text-balance text-slate-400">
            All plans include this 7-day free trial, cancel any time.
          </p>
        </Reveal>

        <Reveal as="stagger" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PRICING_TIERS.map((tier) => (
            <Reveal
              key={tier.id}
              className={cn(
                "relative flex flex-col gap-5 rounded-2xl p-6 backdrop-blur-md transition-all",
                tier.highlighted
                  ? "scale-105 border-0 bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-2xl shadow-blue-500/25"
                  : "border border-white/10 bg-white/[0.04] shadow-xl hover:border-white/20 hover:bg-white/[0.07]",
                tier.bestValue && "pt-8"
              )}
            >
              {tier.highlighted && (
                <div className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-amber-400 px-4 py-1 text-xs font-bold text-amber-900">
                  <Zap className="h-3 w-3" /> Most Popular
                </div>
              )}
              {tier.bestValue && (
                <div className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-amber-500 px-4 py-1 text-xs font-bold text-slate-900 shadow-md shadow-amber-500/30">
                  <Gem className="h-3 w-3" /> Best Value
                </div>
              )}

              {/* Header */}
              <div>
                <h3
                  className={cn(
                    "mb-1 text-lg font-bold",
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
                    "mb-1.5 text-sm",
                    tier.highlighted ? "text-blue-200" : "text-slate-400"
                  )}
                >
                  {tier.period}
                </span>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
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
                  "rounded-xl px-6 py-3 text-center text-sm font-semibold transition-all",
                  tier.highlighted
                    ? "bg-white text-blue-700 shadow-lg hover:bg-blue-50"
                    : "btn-primary"
                )}
              >
                {tier.cta}
              </Link>
            </Reveal>
          ))}
        </Reveal>

        {/* Guarantee note */}
        <div className="mt-10 space-y-1.5 text-center">
          <p className="text-sm text-slate-400">
            All plans include our{" "}
            <span className="font-semibold text-slate-200">
              50-point score improvement guarantee*
            </span>{" "}
            or your money back.
          </p>
          <p className="text-xs text-slate-400">
            *Terms apply.{" "}
            <Link href="/guarantee" className="underline transition-colors hover:text-blue-300">
              See full guarantee terms
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
