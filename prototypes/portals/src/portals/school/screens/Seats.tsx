import { useRef, useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row, List } from "@/design-system/components/Row";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import { Pill } from "@/design-system/components/Pill";
import { useToast } from "@/design-system/components/Toast";
import { useConfetti } from "@/design-system/components/Confetti";
import { BUNDLES, PLANS, upgradeFor } from "@/plans/plans";
import { fmtDate } from "@/mock";
import { SchoolShell } from "../shell";
import { money, perSeat, useSchoolData } from "../data";
import { SCHOOL_PLAN } from "../mock";
import { useStore, markRenewed } from "../store";
import { SeatsSheet } from "../components/MoreSheets";
import { Block, Columns, fullDate, schoolYear, yearsOn } from "./common";

/**
 * Seats and plan. The question: how much of what we bought is in use, and
 * what does it cost? The licence from the plan config (price per student a
 * year), the term, the pilot label, the invoices, what every seat includes,
 * and what a family can add on their own. The one action adds seats, or
 * renews once the year has ended (Peak-End: renewing is the year's last
 * screen, so it ends on a high note).
 */
export default function Seats() {
  const d = useSchoolData();
  const toast = useToast();
  const confetti = useConfetti();
  const { renewed } = useStore();
  const head = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const used = d.students.length;
  const free = Math.max(0, d.seats - used);
  const yearly = d.seats * perSeat;
  const family = upgradeFor("school", "workshops");
  const familyPlan = family ? PLANS[family] : null;
  const term = `${fmtDate(d.licence.starts)} to ${fullDate(d.licence.ends)}`;
  // The renewal runs the same dates one year on.
  const next = { starts: yearsOn(d.licence.starts, 1), ends: yearsOn(d.licence.ends, 1) };
  const nextYear = schoolYear(next.starts, next.ends);
  const finding = d.ended
    ? renewed
      ? `Renewed: ${d.seats} seats for ${fullDate(next.starts)} to ${fullDate(next.ends)}, ${money(yearly)}. Keys work again once the invoice is paid.`
      : `The licence ended ${fmtDate(d.licence.ends)}. ${used} of ${d.seats} seats were used this year. The renewal quote for ${d.seats} seats, ${money(yearly)}, went out ${fmtDate(d.licence.renewalQuote)}.`
    : d.licence.pilot
      ? `${used} of ${d.seats} seats used, ${free} free. Founding pilot: free until ${fullDate(d.licence.ends)}; the renewal quote comes ${fmtDate(d.licence.renewalQuote)}.`
      : `${used} of ${d.seats} seats used, ${free} free. The licence runs ${term}; the renewal quote goes out ${fmtDate(d.licence.renewalQuote)}.`;
  const renew = () => {
    markRenewed();
    toast.push({
      title: `${d.seats} seats renewed for ${nextYear}`,
      detail: `${money(yearly)}. The invoice is on its way; keys work again once it is paid.`,
      kind: "success",
    });
    if (head.current) confetti.fire("level", head.current);
  };
  const primary = d.ended ? (
    renewed ? null : (
      <GlassButton variant="primary" onClick={renew}>
        Renew {d.seats} seats
      </GlassButton>
    )
  ) : (
    <GlassButton variant="primary" onClick={() => setOpen(true)}>
      Add seats
    </GlassButton>
  );

  return (
    <SchoolShell screen="seats" title="Seats and plan" finding={finding} primary={primary}>
      <div ref={head}>
        <Columns
          main={
            <>
              <Block
                title={SCHOOL_PLAN.name}
                loading={d.loading}
                error={d.error}
                what="the plan"
                aside={d.licence.pilot ? <Pill tone="accent">Founding pilot</Pill> : undefined}
              >
                <dl className="divide-y divide-line">
                  {[
                    ["Seats", `${d.seats}`],
                    [
                      "Price",
                      d.licence.pilot
                        ? `Free in the pilot, then ${SCHOOL_PLAN.priceLabel}`
                        : SCHOOL_PLAN.priceLabel,
                    ],
                    [
                      "A year",
                      d.licence.pilot
                        ? `${money(0)} to ${fullDate(d.licence.ends)}, then ${money(yearly)}`
                        : money(yearly),
                    ],
                    ["Term", term],
                    [
                      "Renewal quote",
                      d.ended
                        ? `Sent ${fullDate(d.licence.renewalQuote)}`
                        : fullDate(d.licence.renewalQuote),
                    ],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-dense"
                    >
                      <dt className="text-muted">{k}</dt>
                      <dd className="tabular text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
                <ProgressBar
                  className="mt-3"
                  value={used}
                  max={d.seats}
                  label="Seats used"
                  startLabel="0"
                  endLabel={`${d.seats}`}
                />
              </Block>
              <Block
                title="Invoices"
                loading={d.loading}
                padded={false}
                aside={`${d.licence.paid.length + (renewed ? 1 : 0)}`}
              >
                <div className="px-4 pb-1">
                  {d.licence.paid.length || renewed ? (
                    <List>
                      {renewed ? (
                        <Row
                          title={`${nextYear} licence`}
                          sub={{ kind: "state", text: "Sent today, due in 30 days" }}
                          trailing={money(yearly)}
                        />
                      ) : null}
                      {d.licence.paid.map((p) => (
                        <Row
                          key={p.date}
                          title={`${schoolYear(p.date, yearsOn(p.date, 1))} licence`}
                          sub={{ kind: "state", text: `Paid ${fullDate(p.date)}` }}
                          trailing={money(p.amount)}
                        />
                      ))}
                    </List>
                  ) : (
                    <p className="py-3 text-dense text-muted">
                      Nothing to pay in the pilot. The first invoice comes with the renewal.
                    </p>
                  )}
                </div>
              </Block>
            </>
          }
          side={
            <>
              <Block title="What every seat includes" loading={d.loading}>
                <ul className="divide-y divide-line">
                  {SCHOOL_PLAN.bundles.map((b) => (
                    <li key={b} className="py-2 text-dense">
                      {BUNDLES[b].name}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-dense text-muted">
                  {SCHOOL_PLAN.questions.toLocaleString("en-US")} questions per seat.
                </p>
              </Block>
              {familyPlan ? (
                <Block title="What a family can add" loading={d.loading}>
                  <p className="pt-1 text-dense text-muted">
                    {BUNDLES.workshops.name} is in {familyPlan.name}, {familyPlan.priceLabel}. A
                    family buys it from their own account; the seat stays the school's.
                  </p>
                </Block>
              ) : null}
            </>
          }
        />
      </div>
      <SeatsSheet open={open} onClose={() => setOpen(false)} ends={d.licence.ends} />
    </SchoolShell>
  );
}
