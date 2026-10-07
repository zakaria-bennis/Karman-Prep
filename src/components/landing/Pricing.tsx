import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { PRICING_TIERS } from "@/types";

export default function Pricing() {
  return (
    <section id="pricing" className="bg-night py-20 text-ivory sm:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.55fr)] md:items-end">
          <h2 className="max-w-2xl font-plex-serif text-4xl leading-tight sm:text-5xl">
            Compare what each plan includes.
          </h2>
          <p className="max-w-sm leading-relaxed text-taupe">
            Review the current plan details and checkout terms before choosing. All plans include a
            7-day free trial, cancel any time.
          </p>
        </div>

        <div className="mt-10 border-t border-bronze">
          {PRICING_TIERS.map((tier) => (
            <article
              key={tier.id}
              className="grid gap-6 border-b border-bronze py-8 lg:grid-cols-[minmax(13rem,0.7fr)_minmax(0,1.3fr)_minmax(11rem,0.6fr)] lg:gap-10"
            >
              <div>
                <h3 className="font-plex-serif text-2xl sm:text-3xl">{tier.name}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-taupe">
                  {tier.description}
                </p>
              </div>
              <ul className="grid content-start gap-3 sm:grid-cols-2 sm:gap-x-8">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm leading-relaxed text-taupe"
                  >
                    <Check className="mt-1 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-4 lg:block lg:text-right">
                <p>
                  <span className="font-plex-serif text-3xl">{tier.price}</span>
                  <span className="ml-1 text-sm text-taupe">{tier.period}</span>
                </p>
                <Link
                  href={`/auth/sign-up?tier=${tier.id}`}
                  className="inline-flex min-h-11 items-center gap-1 border-b border-gold py-2 font-semibold text-ivory transition-colors hover:text-gold-bright"
                >
                  {tier.cta}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-taupe">
          The 50-point score improvement guarantee has eligibility requirements. Read the{" "}
          <Link href="/guarantee" className="font-semibold text-ivory underline underline-offset-4">
            full guarantee terms
          </Link>{" "}
          before choosing a plan.
        </p>
      </div>
    </section>
  );
}
