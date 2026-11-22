"use client";

// Settings: Plan and billing. A signed-in student sees their exact plan (Free, Practice, Pro, the
// Cohort...) and how it is held (paid through a date, from a school or a tutor, ending after the
// SAT), the plans above it, and Stripe's own billing page for the card, receipts and plan changes.
// /billing sends a student here, carrying a plan picked on the pricing page (?plan=&term=), which
// is then offered with one "Continue to payment". Stripe is untouched: checkout is /checkout/start
// and the billing page is /api/stripe/portal, as before. The design page shows made-up ones.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CONTACT, PRACTICE_PLAN, PRO_PLAN } from "@/lib/marketing/offer";
import { findStripePrice, priceLabel, type BillingTerm } from "@/lib/integrations/stripe/prices";
import { actionPlanState } from "@/lib/portal/settings-plan-actions";
import {
  checkoutHref,
  planStateLine,
  readChoice,
  upgradesFor,
  type PlanState,
} from "@/lib/portal/settings-rules";
import { PLAN_NAMES } from "@/lib/student/plan-gate";
import type { Plan } from "./plans";
import { usePortalData } from "./portalData";
import { hours, hoursText } from "./scheduleData";
import { Group, Row, Say, Seg } from "./settingsControls";
import type { PaneProps } from "./SettingsPanes";
import styles from "./settings.module.css";

const NAMES = { practice: PRACTICE_PLAN.name, pro: PRO_PLAN.name } as const;

/** The design page's made-up plan for each menu. */
const STAND_IN: Record<Plan, PlanState> = {
  practice: {
    planId: "practice",
    source: "subscription",
    endsAt: "2026-12-03T12:00:00Z",
    status: "active",
    hasBilling: true,
    renewing: true,
  },
  cohort: {
    planId: "cohort",
    source: "purchase",
    endsAt: "2027-03-14T12:00:00Z",
    status: null,
    hasBilling: false,
    renewing: false,
  },
  private: {
    planId: "private-20",
    source: "purchase",
    endsAt: null,
    status: null,
    hasBilling: false,
    renewing: false,
  },
};

const price = (planId: "practice" | "pro", term: BillingTerm) => {
  const spec = findStripePrice(planId, term);
  return spec ? priceLabel(spec) : undefined;
};

export function PlanPane({ plan, onGo }: PaneProps) {
  const real = usePortalData();
  const q = useSearchParams();
  const choice = readChoice((key) => q.get(key));
  const required = q.get("required") === "1";
  const [state, setState] = useState<PlanState | null>(real ? null : STAND_IN[plan]);
  const [problem, setProblem] = useState<string | null>(null);
  const [term, setTerm] = useState<BillingTerm>(choice?.term ?? "month");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);

  useEffect(() => {
    if (!real) return;
    let live = true;
    actionPlanState({})
      .then((r) => {
        if (!live) return;
        if (r.ok) setState(r);
        else setProblem(r.error);
      })
      .catch(() => live && setProblem("Your plan didn't load. Try again in a moment."));
    return () => {
      live = false;
    };
  }, [real]);

  /* Stripe's own billing page: card, receipts, and changing or ending a renewing plan */
  const openBilling = async () => {
    setSaid(null);
    if (!real) return setSaid("On a real account this opens Stripe's billing page.");
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { url?: string };
      if (json.url) return void (window.location.href = json.url);
    } catch {
      // said below
    }
    setBusy(false);
    setSaid(`Billing didn't open. Email ${CONTACT.billing} and we'll sort it out.`);
  };
  /* a new plan is bought at Stripe Checkout; a live renewing plan is changed on the billing page */
  const upgrade = (planId: "practice" | "pro", t: BillingTerm) => {
    setSaid(null);
    if (!real) return setSaid("On a real account this opens checkout.");
    if (state?.renewing) return void openBilling();
    window.location.href = checkoutHref(planId, t);
  };

  const planId = state?.planId ?? real?.planId ?? STAND_IN[plan].planId;
  const left = real
    ? real.schedule
      ? hours(real.schedule.account).left
      : null
    : plan === "private"
      ? 12
      : null;
  const upgrades = state ? upgradesFor(planId) : [];
  const offer =
    choice && choice.planId !== planId && upgrades.includes(choice.planId) ? choice : null;
  const line = state ? planStateLine(state) : null;

  return (
    <>
      <Group title="Plan">
        <Row name={PLAN_NAMES[planId]} note={line ?? undefined} />
        {left !== null && (
          <Row name={`${hoursText(left)} hours left`}>
            <button type="button" className={styles.go} onClick={() => onGo("schedule")}>
              Add hours
            </button>
          </Row>
        )}
      </Group>
      {problem && <Say tone="problem">{problem}</Say>}
      {required && !offer && upgrades.length > 0 && <Say>That page needs a paid plan.</Say>}

      {offer && (
        <Group title="Your choice">
          <Row name={NAMES[offer.planId]} note={price(offer.planId, offer.term)} />
          {required && <Say>That page needs a paid plan.</Say>}
          <div className={styles.pair}>
            <button
              type="button"
              className={styles.go}
              disabled={busy}
              onClick={() => upgrade(offer.planId, offer.term)}
            >
              {state?.renewing ? "Change in billing" : "Continue to payment"}
            </button>
          </div>
        </Group>
      )}

      {!offer && upgrades.length > 0 && (
        <Group title="Upgrade">
          <Seg
            label="How often to pay"
            value={term}
            options={[
              { value: "month", label: "Monthly" },
              { value: "quarter", label: "Every 3 months" },
            ]}
            onChange={setTerm}
          />
          {upgrades.map((id) => (
            <Row key={id} name={NAMES[id]} note={price(id, term)}>
              <button
                type="button"
                className={styles.go}
                disabled={busy}
                onClick={() => upgrade(id, term)}
              >
                Upgrade
              </button>
            </Row>
          ))}
        </Group>
      )}

      {said && <Say tone="problem">{said}</Say>}

      <Group title="Billing">
        {state?.hasBilling ? (
          <Row name="Card, receipts and plan" note="On Stripe's secure page">
            <button
              type="button"
              className={styles.soft}
              disabled={busy}
              onClick={() => void openBilling()}
            >
              {busy ? "Opening" : "Manage"}
            </button>
          </Row>
        ) : (
          <Row name="Receipts" note="Emailed when you paid">
            <a
              className={styles.soft}
              href={`mailto:${CONTACT.billing}?subject=${encodeURIComponent("A copy of my receipt")}`}
            >
              Ask for a copy
            </a>
          </Row>
        )}
        <Row name="Every plan">
          <Link className={styles.soft} href="/pricing">
            Compare
          </Link>
        </Row>
      </Group>
    </>
  );
}
