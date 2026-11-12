"use client";

// Cohort seats by how they pay: $995 at once, or the $95 deposit and three monthly payments.
// The bar splits the money booked into what is in and what is still to come; the timeline
// below shows the deposit and each payment date, filled once it has passed.

import { MARCH_PROGRAM } from "@/lib/marketing/offer";
import type { CohortPaymentsSummary } from "../_types";
import { fmtDay, fmtMoney } from "./format";

export function CohortPayments({ data }: { data: CohortPaymentsSummary }) {
  if (data.seats === 0) {
    return <p className="kp-rev-empty">No cohort seats sold yet.</p>;
  }
  const full = data.paidInFull * MARCH_PROGRAM.price;
  const inFromInstalments = data.collected - full;
  const booked = data.collected + data.scheduled + data.notRecordedValue;
  const parts = [
    { key: "full", label: "Paid in full", value: full, color: "var(--rev-cohort)" },
    {
      key: "inst",
      label: "Deposits and payments in",
      value: inFromInstalments,
      color: "var(--rev-cohort-soft)",
    },
    { key: "due", label: "Still to come", value: data.scheduled, color: "var(--rev-due)" },
    {
      key: "unk",
      label: "Option not recorded",
      value: data.notRecordedValue,
      color: "var(--rev-unknown)",
    },
  ].filter((p) => p.value > 0);

  const steps = [
    {
      label: "Deposit",
      amount: MARCH_PROGRAM.depositAmount,
      at: null as string | null,
      count: data.onInstallments,
    },
    ...data.upcoming.map((u) => ({
      label: fmtDay(u.at).replace(/, \d{4}$/, ""),
      amount: u.amount,
      at: u.at,
      count: u.count,
    })),
  ];
  const along = data.installmentProgress
    .map((count, paid) => ({ count, paid }))
    .filter((p) => p.paid > 0 && p.count > 0);

  return (
    <div className="kp-rev-cohort">
      <p className="kp-rev-cohort-lead">
        <b className="kp-num">{fmtMoney(data.collected)}</b> in
        {data.scheduled > 0 && (
          <>
            {" "}
            · <b className="kp-num">{fmtMoney(data.scheduled)}</b> still to come
          </>
        )}{" "}
        <small>
          of {fmtMoney(booked)} booked across {data.seats} seats
        </small>
      </p>
      <div
        className="kp-rev-split"
        role="img"
        aria-label={parts.map((p) => `${p.label} ${fmtMoney(p.value)}`).join(", ")}
      >
        {parts.map((p, i) => (
          <i
            key={p.key}
            data-kind={p.key}
            style={{ flexGrow: p.value, background: p.color, ["--i" as string]: i }}
            title={`${p.label}: ${fmtMoney(p.value)}`}
          />
        ))}
      </div>
      <ul className="kp-rev-key">
        {parts.map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} data-kind={p.key} aria-hidden="true" />
            {p.label} <b className="kp-num">{fmtMoney(p.value)}</b>
          </li>
        ))}
      </ul>
      <div className="kp-rev-seats">
        <span>
          <b className="kp-num">{data.paidInFull}</b> paid {fmtMoney(MARCH_PROGRAM.price)} at once
        </span>
        <span>
          <b className="kp-num">{data.onInstallments}</b> on {fmtMoney(MARCH_PROGRAM.depositAmount)}{" "}
          + {MARCH_PROGRAM.installments.count} × {fmtMoney(MARCH_PROGRAM.installments.amount)}
        </span>
        {data.notRecorded > 0 && (
          <span>
            <b className="kp-num">{data.notRecorded}</b> not recorded (counted at{" "}
            {fmtMoney(MARCH_PROGRAM.price)})
          </span>
        )}
      </div>
      {data.onInstallments > 0 && (
        <ol className="kp-rev-track" aria-label="Instalment payments">
          {steps.map((s, i) => (
            <li
              key={`${s.label}-${i}`}
              data-done={s.at === null ? "" : undefined}
              style={{ ["--i" as string]: i }}
            >
              <i aria-hidden="true" />
              <b>{s.label}</b>
              <small>
                {s.at === null
                  ? `${s.count} × ${fmtMoney(s.amount)}`
                  : `${s.count} × ${fmtMoney(MARCH_PROGRAM.installments.amount)} = ${fmtMoney(s.amount)}`}
              </small>
            </li>
          ))}
        </ol>
      )}
      {along.length > 0 && (
        <p className="kp-rev-note">
          {along
            .map(
              (p) =>
                `${p.count} ${p.count === 1 ? "seat has" : "seats have"} made ${p.paid} of ${MARCH_PROGRAM.installments.count} payments`
            )
            .join("; ")}
          .
        </p>
      )}
    </div>
  );
}
