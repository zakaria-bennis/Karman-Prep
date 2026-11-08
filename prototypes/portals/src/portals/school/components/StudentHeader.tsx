import { CountUp } from "@/design-system/components/CountUp";
import { PLANS, type PlanId } from "@/plans/plans";
import { daysUntil, fmtDate } from "@/mock";
import { Initials } from "@/portals/tutor/shared";

/*
 * The student header for a school seat: the tutor portal's StudentHeader
 * (src/portals/tutor/components/StudentHeader.tsx) with the target and the
 * SAT date nullable. A school seat carries neither unless the student set
 * one, so when they are null the header says nothing instead of guessing
 * (copy rule 2, rule 47). To promote: give the tutor header these two null
 * cases and delete this file.
 */
export interface SchoolHeaderStudent {
  name: string;
  initials: string;
  hue: number;
  plan: PlanId;
  satDate: string | null;
  target: number | null;
  predicted: number | null;
  baseline: number | null;
}

export function SchoolStudentHeader({ s }: { s: SchoolHeaderStudent }) {
  const facts = [
    PLANS[s.plan].name,
    s.satDate ? `SAT ${fmtDate(s.satDate)}, in ${daysUntil(s.satDate)} days` : null,
  ].filter(Boolean) as string[];
  return (
    <div className="flex items-start gap-3">
      <Initials initial={s.initials} hue={s.hue} size={40} className="mt-0.5" />
      <div className="min-w-0">
        <p className="flex flex-wrap gap-x-3 text-body text-muted">
          {facts.map((f) => (
            <span key={f} className="whitespace-nowrap">
              {f}
            </span>
          ))}
        </p>
        {s.predicted ? (
          <p className="tabular mt-1 flex flex-wrap items-baseline gap-x-3 text-dense">
            <span className="whitespace-nowrap">
              <span className="text-muted">Karman predicted score </span>
              <CountUp to={s.predicted} from={s.baseline ?? 0} className="text-kpi font-medium" />
            </span>
            {s.target ? (
              <span className="whitespace-nowrap text-muted">
                target {s.target.toLocaleString("en-US")}
              </span>
            ) : null}
            {s.baseline ? (
              <span className="whitespace-nowrap text-positive">
                +{s.predicted - s.baseline} since the baseline
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-1 text-dense text-muted">
            No score yet. A full-length review session gives the first Karman predicted score.
          </p>
        )}
      </div>
    </div>
  );
}
