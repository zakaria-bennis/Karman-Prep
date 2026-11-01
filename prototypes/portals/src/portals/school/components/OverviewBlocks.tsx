import { Row, List } from "@/design-system/components/Row";
import { Skeleton } from "@/design-system/components/Skeleton";
import { Pill } from "@/design-system/components/Pill";
import { BUNDLES } from "@/plans/plans";
import { fmtDate } from "@/mock";
import { Initials } from "@/portals/tutor/shared";
import { money, perSeat, type SchoolData } from "../data";
import { goScreen } from "../nav";
import { SCHOOL_PLAN } from "../mock";
import { SeatLedger } from "./SeatLedger";
import { Block } from "../screens/common";

/** The overview's side blocks: the seat ledger, the teachers, what a seat includes (from the plan config). */
export function LedgerBlock({ d }: { d: SchoolData }) {
  const inClass = d.students.filter((s) => s.classId).length;
  return (
    <Block
      title="Seats"
      loading={d.loading}
      aside={`${d.students.length} of ${d.seats} used`}
      fallback={<Skeleton.Block height={96} />}
    >
      <SeatLedger
        seats={d.seats}
        inClass={inClass}
        unassigned={d.unassigned.length}
        paused={d.ended}
        className="pt-1"
      />
    </Block>
  );
}

export function TeachersBlock({ d }: { d: SchoolData }) {
  return (
    <Block title="Teachers" loading={d.loading} padded={false} aside={`${d.teachers.length}`}>
      <div className="px-4 pb-1">
        {d.teachers.length ? (
          <List>
            {d.teachers.map((t) => (
              <Row
                key={t.id}
                title={t.name}
                leading={<Initials initial={t.initials} hue={t.hue} size={24} />}
                sub={
                  t.signedIn
                    ? undefined
                    : {
                        kind: "state",
                        text: `Invited ${fmtDate(t.invited ?? d.today)}, not signed in yet`,
                      }
                }
                trailing={`${d.classes.filter((c) => c.teacher === t.id).length} classes`}
                onPress={() => goScreen("teachers")}
              />
            ))}
          </List>
        ) : (
          <p className="py-3 text-dense text-muted">
            No teachers yet. Classes can be yours until one is added.
          </p>
        )}
      </div>
    </Block>
  );
}

/** The licence on the first morning: the pilot's dates and what comes after, and what every seat includes. */
export function PilotBlock({ d }: { d: SchoolData }) {
  const names = SCHOOL_PLAN.bundles.map((b) => BUNDLES[b].name);
  const rows = d.licence.pilot
    ? [
        ["Seats", String(d.seats)],
        ["Free until", fmtDate(d.licence.ends, "long")],
        ["Then", `${SCHOOL_PLAN.priceLabel}, ${money(d.seats * perSeat)} a year`],
        ["Renewal quote", fmtDate(d.licence.renewalQuote, "long")],
      ]
    : [
        ["Seats", String(d.seats)],
        ["Price", SCHOOL_PLAN.priceLabel],
        ["Term", `${fmtDate(d.licence.starts)} to ${fmtDate(d.licence.ends, "long")}`],
      ];
  return (
    <Block
      title={SCHOOL_PLAN.name}
      loading={d.loading}
      aside={d.licence.pilot ? <Pill tone="accent">Founding pilot</Pill> : undefined}
    >
      <dl className="divide-y divide-line">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-dense"
          >
            <dt className="text-muted">{k}</dt>
            <dd className="tabular text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-dense text-muted">
        <span className="font-medium text-text">Every seat includes</span> {names.join(" · ")}, with{" "}
        {SCHOOL_PLAN.questions.toLocaleString("en-US")} questions.
      </p>
    </Block>
  );
}
