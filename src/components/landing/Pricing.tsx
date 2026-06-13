"use client";

// ============================================================
// Pricing section — all four tiers with feature lists.
// Each CTA links to Stripe checkout (via sign-up flow).
//
// Observatory treatment: four flat surface cards on the night
// canvas. The highlighted tier earns a gold frame and a gold CTA
// — prestige by restraint, not by a louder gradient.
// ============================================================

import Link from "next/link";
import { Check, Zap, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRICING_TIERS } from "@/types";
import Reveal from "@/components/shared/Reveal";

export default function Pricing() {
  return (
    <section id="pricing" className="bg-grain relative overflow-hidden bg-night py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-16 text-center">
          <span className="type-label text-taupe">Pricing</span>
          <h2 className="type-display-lg mt-4 text-ivory">Transparent pricing. No surprises.</h2>
          <p className="type-body-lg mx-auto mt-5 max-w-xl text-balance text-taupe">
            All plans include this 7-day free trial, cancel any time.
          </p>
        </Reveal>

        <Reveal as="stagger" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PRICING_TIERS.map((tier) => (
            <Reveal
              key={tier.id}
              className={cn(
                "relative flex flex-col gap-5 rounded-2xl p-6 transition-colors duration-fast",
                tier.highlighted
                  ? "border border-gold/60 bg-surface shadow-[0_0_48px_-18px_rgba(200,171,106,0.45)]"
                  : "border border-bronze bg-surface hover:border-taupe/40",
                tier.bestValue && "pt-8"
              )}
            >
              {tier.highlighted && (
                <div className="type-label absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-gold px-4 py-1 !text-xs text-night">
                  <Zap className="h-3 w-3" /> Most Popular
                </div>
              )}
              {tier.bestValue && (
                <div className="type-label absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-gold/50 bg-charcoal px-4 py-1 !text-xs text-gold-bright">
                  <Gem className="h-3 w-3" /> Best Value
                </div>
              )}

              {/* Header */}
              <div>
                <h3 className="type-h2 mb-1 text-ivory">{tier.name}</h3>
                <p className="text-xs leading-relaxed text-taupe">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="flex items-end gap-1">
                <span className="type-mono text-4xl font-medium text-ivory">{tier.price}</span>
                <span className="mb-1.5 text-sm text-taupe">{tier.period}</span>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        tier.highlighted ? "text-gold" : "text-taupe"
                      )}
                    />
                    <span className="text-ivory/85">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={`/auth/sign-up?tier=${tier.id}`}
                className={cn(
                  "px-6 py-3 text-center text-sm",
                  tier.highlighted ? "btn-primary" : "btn-secondary"
                )}
              >
                {tier.cta}
              </Link>
            </Reveal>
          ))}
        </Reveal>

        {/* Guarantee note */}
        <div className="mt-10 space-y-1.5 text-center">
          <p className="text-sm text-taupe">
            All plans include our{" "}
            <span className="font-medium text-gold-bright">
              50-point score improvement guarantee*
            </span>{" "}
            or your money back.
          </p>
          <p className="text-xs text-taupe/80">
            *Terms apply.{" "}
            <Link
              href="/guarantee"
              className="underline transition-colors duration-fast hover:text-ivory"
            >
              See full guarantee terms
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
