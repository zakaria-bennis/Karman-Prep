import { Panel } from "@/design-system/glass/Panel";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import { Row, List } from "@/design-system/components/Row";
import { fmtDate } from "@/mock";
import { InvoiceList, money } from "./InvoiceList";
import type { Billing, Charge } from "./mock-plan";
import { STAMP } from "./Home";

/*
 * BillingBlock: the Plan screen’s billing panel in the shape the plan bills
 * in: monthly with the next charge and cancel any time, the cohort’s deposit
 * and installments, Private hours with the sessions so far, a school seat,
 * or nothing to pay. Loading keeps the rows' pitch; an error stays inside.
 */
export function BillingBlock({
  billing,
  loading,
  error,
  retry,
  studentName,
  planName,
  onCancel,
  onReceipt,
}: {
  billing: Billing;
  loading: boolean;
  error: boolean;
  retry(): void;
  studentName: string;
  planName: string;
  onCancel(): void;
  onReceipt(c: Charge): void;
}) {
  const rows = (
    <div className="mt-1">
      <Skeleton.Row sub />
      <Skeleton.Row sub />
      <Skeleton.Row sub />
    </div>
  );
  return (
    <Panel as="section" className="px-4 py-3">
      <h2 className="pt-1 text-section">Billing</h2>
      {error ? (
        <ErrorBlock what="the billing history" lastGood={STAMP} onRetry={retry} className="my-2" />
      ) : loading ? (
        rows
      ) : billing.kind === "monthly" ? (
        <>
          <p className="pb-2 text-dense text-muted">
            Next charge {money(billing.amount)} on {fmtDate(billing.nextCharge, "long")}. Monthly,
            cancel any time.
          </p>
          <InvoiceList charges={billing.charges} onReceipt={onReceipt} />
          <button
            type="button"
            onClick={() => onCancel()}
            className="mt-2 min-h-tap text-dense font-semibold text-negative hover:underline"
          >
            Cancel the plan
          </button>
        </>
      ) : billing.kind === "installments" ? (
        <>
          <p className="pb-2 text-dense text-muted">
            {money(billing.paid)} paid of {money(billing.total)}. {money(billing.left)} left.
          </p>
          <InvoiceList charges={[billing.deposit, ...billing.installments]} onReceipt={onReceipt} />
        </>
      ) : billing.kind === "hours" ? (
        <>
          <ProgressBar
            className="py-2"
            value={billing.used}
            max={billing.bought}
            label="Hours used"
            startLabel="0"
            endLabel={`${billing.bought} hours, ${money(billing.price)}`}
          />
          <p className="pb-2 text-dense text-muted">
            {billing.left} left
            {billing.booked
              ? `, one booked for ${fmtDate(billing.booked.date, "long")}, ${billing.booked.time}`
              : ""}
            . {studentName} books the next session in the student app.
          </p>
          {billing.sessions.length ? (
            <List total={`${billing.sessions.length} sessions`}>
              {billing.sessions.slice(0, 4).map((x) => (
                <Row
                  key={x.date}
                  title={`Full-length review session with ${x.with}, ${x.minutes} minutes`}
                  sub={{ kind: "date", text: fmtDate(x.date, "long") }}
                />
              ))}
            </List>
          ) : (
            <p className="rounded-card border border-dashed border-border/60 px-4 py-3 text-dense text-muted">
              No sessions yet.
            </p>
          )}
        </>
      ) : billing.kind === "school" ? (
        <p className="pb-2 text-dense text-muted">
          Nothing to pay. {billing.school} covers the seat through{" "}
          {fmtDate(billing.through, "long")}.
        </p>
      ) : (
        <p className="pb-2 text-dense text-muted">Nothing to pay on {planName}.</p>
      )}
    </Panel>
  );
}
