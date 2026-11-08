import { useState } from "react";
import { Panel } from "@/design-system/glass/Panel";
import { Tabs } from "@/design-system/components/Tabs";
import { Empty } from "@/design-system/components/Empty";
import { Pill } from "@/design-system/components/Pill";
import { PLANS } from "@/plans/plans";
import { fmtDate } from "@/mock";
import { TutorShell } from "../shell";
import { useTutorData } from "../data";
import { goScreen } from "../nav";
import { cohortById, type TutorStudent } from "../mock";
import { coveredStudents, isSlipping, requirementsFor } from "../mock-work";
import { RequirementRow } from "../components/Requirement";
import { Initials } from "../components/Initials";
import { useToast } from "@/design-system/components/Toast";
import { Block, PlanGate, Grid2 } from "./common";

/** "The March SAT Program and Private 20", read from the plan config, never typed. */
const COVERED_PLANS = Object.values(PLANS)
  .filter((p) => p.guarantee)
  .map((p) => p.name)
  .join(" and ");

/**
 * Guarantee: who is at risk of losing it. Every covered student with every
 * requirement as a count against its threshold and the date it must be met
 * by; a slipping student is flagged in the finding, the filter and the row.
 * Students on plans without the guarantee appear only in the locked state,
 * gated, saying what the plan above adds.
 */
export default function Guarantee() {
  const data = useTutorData();
  const toast = useToast();
  const [tab, setTab] = useState("all");
  const covered = data.empty || data.firstDay ? [] : coveredStudents();
  const retry = () =>
    toast.push({
      title: "Still can't load the guarantee",
      detail: "Last updated 9:14 am.",
      kind: "error",
    });
  const slipping = covered.filter((s) => isSlipping(s.id));
  const list = covered.filter((s) =>
    tab === "all" ? true : tab === "slipping" ? slipping.includes(s) : !slipping.includes(s)
  );
  const notCovered = data.locked ? data.privates.filter((s) => !PLANS[s.plan].guarantee) : [];
  const reason = (s: TutorStudent) => {
    const r = requirementsFor(s.id).filter((x) => x.slipping);
    return r
      .map((x) =>
        x.unit === "percent"
          ? `practice at ${x.current}% of ${x.needed}%`
          : x.unit === "date"
            ? x.note?.toLowerCase()
            : `${x.label.toLowerCase()} ${x.current} of ${x.needed}${x.note ? `, ${x.note}` : ""}`
      )
      .join("; ");
  };
  const finding = !covered.length
    ? `No covered students yet. The guarantee covers ${COVERED_PLANS}.`
    : `${covered.length} covered students, ${slipping.length} slipping.${slipping.map((s) => ` ${s.name}: ${reason(s)}.`).join("")}`;

  const card = (s: TutorStudent) => (
    <Block
      key={s.id}
      title={s.name}
      loading={data.loading}
      error={data.error}
      what="the requirements"
      onRetry={retry}
      aside={
        <span className="inline-flex items-center gap-2">
          {(s.cohort && cohortById(s.cohort)?.name) || PLANS[s.plan].name}
          <Pill tone={isSlipping(s.id) ? "negative" : "positive"}>
            {isSlipping(s.id) ? "Slipping" : "On track"}
          </Pill>
        </span>
      }
    >
      <div className="divide-y divide-line">
        {requirementsFor(s.id).map((r) => (
          <RequirementRow key={r.id} r={r} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => goScreen("student", { id: s.id })}
        className="mt-1 min-h-tap text-dense font-semibold text-accent"
      >
        Open {s.name}
      </button>
    </Block>
  );

  return (
    <TutorShell screen="guarantee" title="Guarantee" finding={finding}>
      {covered.length ? (
        <Tabs
          label="Filter by standing"
          className="mb-4"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "all", label: "All", count: covered.length },
            { id: "slipping", label: "Slipping", count: slipping.length },
            { id: "ontrack", label: "On track", count: covered.length - slipping.length },
          ]}
        />
      ) : null}
      {!covered.length && !notCovered.length ? (
        <Empty
          title="No covered students yet"
          detail={`Tracking starts with a cohort's first class or a ${PLANS.private20.name} student's first session.`}
        />
      ) : (
        <Grid2>
          {list.map(card)}
          {notCovered.map((s) => (
            <PlanGate key={s.id} plan={s.plan} bundle="guarantee">
              <Panel as="section" className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Initials initial={s.initials} hue={s.hue} size={32} />
                  <div>
                    <h2 className="text-section">{s.name}</h2>
                    <p className="text-dense text-muted">
                      {PLANS[s.plan].name} · SAT {fmtDate(s.satDate)}
                      {s.cohort ? ` · ${cohortById(s.cohort)?.name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-line">
                  {[
                    "Every session attended",
                    "Full-length tests taken",
                    "Official SAT within 30 days of the last session",
                  ].map((label) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-3 py-3 text-dense"
                    >
                      <span>{label}</span>
                      <span>-</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </PlanGate>
          ))}
        </Grid2>
      )}
    </TutorShell>
  );
}
