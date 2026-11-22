"use client";
// The paywall every quiz path shows when the Free plan's 100 questions are used (see
// src/lib/assembler/plan-limit.ts): the same offer as the portal's Upgrade sheet (Practice or Pro,
// monthly or three months, figures from offer.ts through src/lib/portal/locks.ts), laid out to sit
// on the quiz's own glass. Each plan's button goes straight to checkout.
import Link from "next/link";
import { useState } from "react";
import { FREE_PLAN } from "@/lib/marketing/offer";
import { FREE_QUESTIONS_MESSAGE } from "@/lib/assembler/plan-limit";
import { checkoutHref, planCard, type Term, type UpgradeTo } from "@/lib/portal/locks";
import s from "./paywall.module.css";

const OFFERS: UpgradeTo[] = ["pro", "practice"];

export function FreeLimitPrompt({
  text,
  back,
}: {
  text: string;
  back?: { href: string; label: string };
}) {
  const [term, setTerm] = useState<Term>("month");
  return (
    <section role="alert" className={s.wall}>
      <h2>That&rsquo;s your {FREE_PLAN.questionLimit} free questions</h2>
      <p className={s.say}>
        {text === FREE_QUESTIONS_MESSAGE ? "" : `${text} `}Keep going with Practice or Pro.
      </p>
      <div className={s.term} role="radiogroup" aria-label="How to pay">
        {(["month", "quarter"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={term === t}
            onClick={() => setTerm(t)}
          >
            {t === "month" ? "Monthly" : "3 months"}
          </button>
        ))}
      </div>
      <ul className={s.plans}>
        {OFFERS.map((to) => {
          const card = planCard(to, term);
          return (
            <li key={to} data-lead={to === "pro" || undefined}>
              <span>
                <b>{card.name}</b>
                <small>
                  {card.price} {card.per}
                </small>
              </span>
              <a
                className={s.buy}
                href={checkoutHref(to, term)}
                data-lead={to === "pro" || undefined}
              >
                Get {card.name}
              </a>
            </li>
          );
        })}
      </ul>
      {back && (
        <Link className={s.back} href={back.href}>
          {back.label}
        </Link>
      )}
    </section>
  );
}
