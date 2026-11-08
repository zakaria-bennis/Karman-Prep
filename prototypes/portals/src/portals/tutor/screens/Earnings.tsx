import { KpiStrip } from "@/design-system/components/KPI";
import { DataTable } from "@/design-system/components/DataTable";
import { Row, List } from "@/design-system/components/Row";
import { Pill } from "@/design-system/components/Pill";
import { Skeleton } from "@/design-system/components/Skeleton";
import { ErrorBlock } from "@/design-system/components/Empty";
import { useToast } from "@/design-system/components/Toast";
import { fmtDate } from "@/mock";
import { TutorShell } from "../shell";
import { useTutorData } from "../data";
import { tutorStudentById } from "../mock";
import {
  PAYOUTS,
  RATE,
  SESSIONS_TAUGHT,
  money,
  payFor,
  sessionsPaid,
  sessionsPending,
  sum,
} from "../mock-earnings";
import { Block, Columns } from "./common";
import { cn } from "@/design-system/cn";

/**
 * Earnings and payouts, read-only: what the next payout is and what it is
 * for. KPIs are type in one strip (the next payout leads), the sessions are
 * a table of rules and right-aligned figures, the payouts a short list.
 */
export default function Earnings() {
  const data = useTutorData();
  const toast = useToast();
  const retry = () =>
    toast.push({
      title: "Still can't load earnings",
      detail: "Last updated 9:14 am.",
      kind: "error",
    });
  const sessions = data.hasSessions ? SESSIONS_TAUGHT : [];
  const pending = data.hasSessions ? sessionsPending() : [];
  const paid = data.hasSessions ? sessionsPaid() : [];
  const hours = sessions.reduce((a, s) => a + s.minutes, 0) / 60;
  const finding = sessions.length
    ? `October: ${sessions.length} sessions, ${hours.toFixed(1)} hours, ${money(sum(sessions))}. ${money(sum(paid))} was paid on ${fmtDate(PAYOUTS[0].date)}; ${money(sum(pending))} goes out on ${fmtDate(PAYOUTS[1].date)}.`
    : "No sessions taught yet. Pay is counted per session, in quarter hours.";
  const rows = sessions.map((s) => ({
    id: s.id,
    date: s.date,
    student: tutorStudentById(s.studentId)?.name ?? s.studentId,
    minutes: s.minutes,
    pay: payFor(s.minutes),
    payout:
      s.date <= PAYOUTS[0].date
        ? `Paid ${fmtDate(PAYOUTS[0].date)}`
        : `${fmtDate(PAYOUTS[1].date)}`,
  }));
  return (
    <TutorShell screen="earnings" title="Earnings" finding={finding}>
      {({ desktop }) => (
        <div className={desktop ? "grid gap-6" : "grid gap-5"}>
          {data.loading ? (
            <div
              className={cn(
                "grid gap-4 rounded-panel border border-line bg-panel p-4",
                desktop ? "grid-cols-4" : "grid-cols-2"
              )}
            >
              <Skeleton.Kpi label="Next payout" lead />
              <Skeleton.Kpi label="Sessions in October" />
              <Skeleton.Kpi label="Hours" />
              <Skeleton.Kpi label="Rate" />
            </div>
          ) : data.error ? (
            <div className="rounded-panel border border-line bg-panel p-4">
              <ErrorBlock what="earnings" lastGood="9:14 am" onRetry={retry} />
            </div>
          ) : (
            <KpiStrip
              items={[
                {
                  label: "Next payout",
                  value: money(sum(pending)),
                  unit: fmtDate(PAYOUTS[1].date),
                  lead: true,
                },
                { label: "Sessions in October", value: String(sessions.length) },
                { label: "Hours", value: hours.toFixed(1) },
                { label: "Rate", value: `$${RATE}`, unit: "an hour" },
              ]}
            />
          )}
          <Columns
            main={
              <Block
                title="Sessions taught"
                loading={data.loading}
                error={data.error}
                what="the sessions"
                onRetry={retry}
                aside={sessions.length ? `${sessions.length} in October` : undefined}
              >
                <DataTable
                  rows={rows}
                  rowKey="id"
                  caption="Sessions taught in October"
                  defaultSort={{ key: "date", dir: "desc" }}
                  emptyMessage="No sessions taught yet."
                  columns={[
                    { key: "date", label: "Date", render: (v) => fmtDate(String(v)) },
                    { key: "student", label: "Student" },
                    { key: "minutes", label: "Minutes", numeric: true },
                    { key: "pay", label: "Pay", numeric: true, render: (v) => money(Number(v)) },
                    { key: "payout", label: "Payout", sortable: false },
                  ]}
                />
              </Block>
            }
            side={
              <Block title="Payouts" loading={data.loading} padded={false}>
                <div className="px-4 pb-2">
                  {!sessions.length ? (
                    <p className="py-3 text-dense text-muted">
                      No payouts yet. The first goes out on the 15th after your first session.
                    </p>
                  ) : null}
                  <List>
                    {(sessions.length ? PAYOUTS : []).map((p) => {
                      const amount = p.status === "paid" ? sum(paid) : sum(pending);
                      return (
                        <Row
                          key={p.id}
                          title={money(amount)}
                          sub={{
                            kind: "date",
                            text: `${p.status === "paid" ? "Paid" : "Goes out"} ${fmtDate(p.date)}`,
                          }}
                          trailing={
                            <Pill tone={p.status === "paid" ? "positive" : "neutral"}>
                              {p.status === "paid" ? "Paid" : "Pending"}
                            </Pill>
                          }
                        />
                      );
                    })}
                  </List>
                  <p className="pt-2 text-small text-muted">
                    Pay is paid hours times the rate, hours rounded down to the quarter hour. The
                    rate and the account are set by the admin.
                  </p>
                </div>
              </Block>
            }
          />
        </div>
      )}
    </TutorShell>
  );
}
