import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PRICING_TIERS } from "@/types";
import styles from "./landing.module.css";

export function PlanCards({ onPlansPage = false }: { onPlansPage?: boolean }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5"
      aria-label="Compare all four plans"
    >
      {PRICING_TIERS.map((tier) => (
        <Link
          key={tier.id}
          href={`${onPlansPage ? "" : "/plans"}#${tier.id}`}
          className={`${styles.planCard} flex min-w-0 flex-col rounded-2xl border border-bronze bg-surface p-4 text-ivory sm:p-6`}
        >
          <h3 className="font-plex-serif text-xl sm:text-2xl">{tier.name}</h3>
          <p className="mt-4 font-plex-sans text-3xl font-semibold tracking-tight sm:text-4xl">
            {tier.price}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-taupe sm:text-sm">{tier.period}</p>
          <span className="mt-5 flex min-h-7 items-center justify-between gap-2 text-sm font-medium">
            Plan details <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 bg-night px-5 py-16 text-ivory md:px-8 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gold">Room for your kind of prep</p>
            <h2 className="mt-3 font-plex-serif text-4xl leading-tight sm:text-5xl">
              Find your fit.
            </h2>
          </div>
          <Link
            href="/plans"
            className="inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4"
          >
            Compare plans <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <PlanCards />
        <p className="mt-5 text-sm text-taupe">
          Seminar includes a 7-day trial. See each plan’s details and charge timing before choosing.
        </p>
      </div>
    </section>
  );
}
