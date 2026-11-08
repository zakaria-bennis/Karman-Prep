import { useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Sheet } from "@/design-system/components/Sheet";
import { Skeleton } from "@/design-system/components/Skeleton";
import { useToast } from "@/design-system/components/Toast";
import { usePlan } from "@/plans/PlanProvider";
import { BUNDLES, PLANS } from "@/plans/plans";
import { fmtDate } from "@/mock";
import { cn } from "@/design-system/cn";
import { Shell, useDesktop, useWide } from "./Shell";
import { ParentProvider, useParent, useBlock } from "./view";
import { PlanLadder } from "./PlanLadder";
import { money } from "./InvoiceList";
import { BillingBlock } from "./BillingBlock";
import { Requirements } from "./Requirements";
import { billingFor, requirementsFor, nextPlanFor, type Billing } from "./mock-plan";
import { questionsAnswered } from "./mock-updates";
import { periodFor, allowanceFor } from "./mock-period";
import { Allowance } from "./Allowance";
import { PeriodBlock } from "./PeriodBlock";

/*
 * Plan: "What am I paying for, and what would the next plan add?" The plan
 * and the next rung with one upgrade action, what is included, the billing
 * in its own shape (monthly and cancel any time, the cohort’s deposit and
 * installments, Private hours left, a school seat), the question allowance
 * on a plan with a finite bank, what the plan bought since the last charge
 * (the practice done, as figures), and the guarantee’s requirements against
 * their thresholds on the two plans that carry it.
 */
export default function Plan() {
  return (
    <ParentProvider lock="parent">
      <PlanScreen />
    </ParentProvider>
  );
}

function findingFor(
  b: Billing,
  name: string,
  priceLabel: string,
  used: number,
  bank: number | "all"
) {
  if (b.kind === "monthly")
    return `${name}, ${priceLabel}. Next charge ${money(b.amount)} on ${fmtDate(b.nextCharge, "long")}. Cancel any time.`;
  if (b.kind === "installments") {
    const due = b.installments.find((c) => c.state === "due");
    return `${name}, ${money(b.total)}. ${money(b.left)} left${due ? `: ${money(due.amount)} due ${fmtDate(due.date, "long")}` : ""}.`;
  }
  if (b.kind === "hours")
    return `${name}: ${b.left} of ${b.bought} hours left${b.booked ? `, next session ${fmtDate(b.booked.date, "long")}` : ""}.`;
  if (b.kind === "school")
    return `A school seat, paid by ${b.school} through ${fmtDate(b.through, "long")}.`;
  return typeof bank === "number"
    ? `${name}. ${Math.min(used, bank).toLocaleString("en-US")} of ${bank.toLocaleString("en-US")} questions used.`
    : `${name}. ${used.toLocaleString("en-US")} questions answered.`;
}

function PlanScreen() {
  const v = useParent();
  const { plan } = usePlan();
  const blk = useBlock();
  const toast = useToast();
  const wide = useWide();
  const desktop = useDesktop();
  const [sheet, setSheet] = useState<"upgrade" | "cancel" | null>(null);
  const p = PLANS[plan];
  const s = v.student;
  const billing = billingFor(plan, s);
  const req = requirementsFor(plan, s, v.state);
  const next = nextPlanFor(plan);
  const drops = next ? p.bundles.filter((b) => !next.plan.bundles.includes(b)) : [];
  const used = questionsAnswered(s, plan, v.state);
  const period = periodFor(plan, s, v.state);
  const allowance = allowanceFor(plan, s, v.state);
  const nothingToPay = billing.kind === "free" || billing.kind === "school";
  const finding = blk.loading ? (
    <Skeleton.Text lines={1} width="60%" />
  ) : (
    findingFor(billing, p.name, p.priceLabel, used, p.questions)
  );
  const rows = blk.loading ? (
    <div className="mt-1">
      <Skeleton.Row sub />
      <Skeleton.Row sub />
      <Skeleton.Row sub />
    </div>
  ) : null;

  return (
    <Shell screen="plan" title="Plan" finding={finding}>
      <div className="grid gap-4">
        <div
          className={cn(
            "grid gap-4",
            wide && "grid-cols-2",
            next && !nothingToPay ? "items-stretch" : "items-start"
          )}
        >
          <Panel as="section" className="flex flex-col px-4 py-2">
            <h2 className="pt-2 text-section">Your plan</h2>
            {blk.loading ? (
              rows
            ) : (
              <PlanLadder
                current={p}
                next={next}
                desktop={desktop}
                onUpgrade={() => setSheet("upgrade")}
                className="flex flex-1 flex-col [&>[role=listitem]:last-child]:mt-auto"
              >
                <ul className="grid grid-cols-2 gap-x-6 gap-y-1 py-2 text-dense text-muted">
                  {p.bundles.map((b) => (
                    <li key={b}>{BUNDLES[b].name}</li>
                  ))}
                </ul>
                {allowance ? (
                  <Allowance
                    data={allowance}
                    className="py-2"
                    note={
                      allowance.left === 0
                        ? `Every question in ${p.name} is used.${next ? ` ${next.plan.name} has ${typeof next.plan.questions === "number" ? next.plan.questions.toLocaleString("en-US") : "all of them"}.` : ""}`
                        : undefined
                    }
                  />
                ) : null}
              </PlanLadder>
            )}
          </Panel>
          <div className="grid gap-4">
            <BillingBlock
              billing={billing}
              loading={blk.loading}
              error={blk.error}
              retry={blk.retry}
              studentName={s.name}
              planName={p.name}
              onCancel={() => setSheet("cancel")}
              onReceipt={(c) => toast.push({ title: `Receipt for ${c.label} sent to you` })}
            />
            {/* With nothing to pay, the billing panel is one line, so the practice sits under it and the column closes. */}
            {!blk.error && nothingToPay ? (
              <PeriodBlock period={period} loading={blk.loading} wide={false} />
            ) : null}
          </div>
        </div>
        {!blk.error && !nothingToPay ? (
          <PeriodBlock period={period} loading={blk.loading} wide={wide} />
        ) : null}
        {req ? (
          <Panel as="section" className="p-4">
            <h2 className="text-section">Guarantee</h2>
            {blk.loading ? (
              rows
            ) : (
              <Requirements rows={req.rows} onTrack={req.onTrack} wide={wide} className="mt-2" />
            )}
            <a
              href="https://karmanprep.com/guarantee"
              className="mt-2 inline-flex min-h-tap items-center text-dense font-semibold text-accent hover:underline"
            >
              The full terms
            </a>
          </Panel>
        ) : null}
      </div>
      <Sheet
        open={sheet === "upgrade"}
        onClose={() => setSheet(null)}
        title={next?.plan.name ?? ""}
        side={desktop ? "right" : "bottom"}
      >
        {next ? (
          <div className="grid gap-4">
            <p className="text-body">
              <span className="tabular text-kpi">{next.plan.priceLabel || "Free"}</span>
              {next.plan.billing === "month" ? (
                <span className="block text-dense text-muted">Monthly. Cancel any time.</span>
              ) : next.plan.billing === "once" ? (
                <span className="block text-dense text-muted">One payment, or installments.</span>
              ) : null}
            </p>
            <div>
              <h3 className="text-dense font-semibold">Adds</h3>
              <ul className="mt-1 divide-y divide-line">
                {next.adds.map((b) => (
                  <li key={b.id} className="py-2">
                    <p className="text-body font-medium">{b.name}</p>
                    {/* The guarantee’s terms are never restated here; they live on the guarantee page. */}
                    <p className="text-dense text-muted">
                      {b.id === "guarantee"
                        ? "Its terms are on the guarantee page."
                        : b.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-dense text-muted">
              {drops.length
                ? `Without ${drops.map((b) => BUNDLES[b].name.toLowerCase()).join(", ")}.`
                : `Keeps everything in ${p.name}.`}
            </p>
            <GlassButton
              variant="primary"
              onClick={() => {
                setSheet(null);
                toast.push({ title: "Checkout comes with Phase 2", kind: "status" });
              }}
            >
              Continue to checkout
            </GlassButton>
          </div>
        ) : null}
      </Sheet>
      <Sheet
        open={sheet === "cancel"}
        onClose={() => setSheet(null)}
        title={`Cancel ${p.name}?`}
        side={desktop ? "right" : "bottom"}
      >
        {billing.kind === "monthly" ? (
          <div className="grid gap-4">
            <p className="text-body">
              {s.name} keeps everything until {fmtDate(billing.nextCharge, "long")}. Nothing more is
              charged.
            </p>
            <GlassButton onClick={() => setSheet(null)}>Keep the plan</GlassButton>
            <button
              type="button"
              onClick={() => {
                setSheet(null);
                toast.push({
                  title: "Plan cancelled",
                  detail: `Access until ${fmtDate(billing.nextCharge, "long")}.`,
                });
              }}
              className="min-h-tap text-dense font-semibold text-negative hover:underline"
            >
              Cancel the plan
            </button>
          </div>
        ) : null}
      </Sheet>
    </Shell>
  );
}
