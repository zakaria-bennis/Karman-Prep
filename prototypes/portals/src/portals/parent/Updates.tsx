import { Panel } from "@/design-system/glass/Panel";
import { Skeleton } from "@/design-system/components/Skeleton";
import { Empty, ErrorBlock } from "@/design-system/components/Empty";
import { usePlan } from "@/plans/PlanProvider";
import { fmtDate } from "@/mock";
import { Shell } from "./Shell";
import { ParentProvider, useParent, useBlock } from "./view";
import { LockedPanel } from "./LockedPanel";
import { UpdateTimeline } from "./UpdateTimeline";
import { updatesFor, NEXT_UPDATE } from "./mock-updates";
import { isNew } from "./mock";
import { STAMP } from "./Home";

/*
 * Weekly updates: "What happened each week?" Every update by week on one
 * rail, newest first, the latest marked; a long-time family sees a term of
 * them, capped at eight with the total stated. One action: read the latest.
 */
export default function Updates() {
  return (
    <ParentProvider lock="parent">
      <UpdatesScreen />
    </ParentProvider>
  );
}

function UpdatesScreen() {
  const v = useParent();
  const { plan, has } = usePlan();
  const blk = useBlock();
  const updates = updatesFor(v.student, plan, v.state);
  const latest = updates[0];
  const nextOn = isNew(v.student) ? "2026-11-08" : NEXT_UPDATE;
  const finding = blk.loading ? (
    <Skeleton.Text lines={1} width="60%" />
  ) : updates.length ? (
    `${updates.length} updates since ${fmtDate(v.student.since, "long")}. The next arrives Sunday, ${fmtDate(nextOn)}.`
  ) : (
    `No updates yet. The first arrives ${fmtDate(nextOn, "long")}, with the week’s practice, the skills that moved and any test score.`
  );
  const primary =
    latest && !blk.loading && !blk.error && has("parent")
      ? { label: "Read the latest update", onClick: () => v.go("update") }
      : null;
  const body = (
    <Panel as="section" className="px-4 py-3">
      <h2 className="sr-only">By week</h2>
      {blk.loading ? (
        <div>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton.Row key={i} sub />
          ))}
        </div>
      ) : blk.error ? (
        <ErrorBlock what="the updates" lastGood={STAMP} onRetry={blk.retry} />
      ) : updates.length ? (
        <UpdateTimeline items={updates} onOpen={(u) => v.go("update", { week: u.id })} />
      ) : (
        <Empty title="No updates yet" detail={`The first arrives ${fmtDate(nextOn, "long")}.`} />
      )}
    </Panel>
  );
  return (
    <Shell screen="updates" title="Weekly updates" finding={finding} primary={primary}>
      {has("parent") ? (
        body
      ) : (
        <LockedPanel bundle="parent" onUpgrade={() => v.go("plan")}>
          {body}
        </LockedPanel>
      )}
    </Shell>
  );
}
