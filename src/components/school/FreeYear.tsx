/*
 * The school's free year as a ring that empties as the year runs out, with the days left inside.
 * It sits beside the plan on the school home and on Billing, so the one date that matters to a
 * school (when billing starts) reads at a glance. The ring fills on arrival like every portal ring.
 */
import { Num, Ring, Row } from "@/components/portal";
import { freeYearLeft, planStatusLine } from "@/lib/school/terms";

export function FreeYearRow({
  freeUntil,
  sub,
  now,
}: {
  freeUntil: string;
  /**
   * The line under the title. Defaults to the plan's terms ("Free until …, then $8 per student a
   * year"); null leaves it out where the page already says them.
   */
  sub?: string | null;
  now?: Date;
}) {
  const { days, share } = freeYearLeft(freeUntil, now);
  const ended = days === 0;
  return (
    <Row
      leading={
        <Ring
          value={share}
          size={52}
          width={6}
          label={
            ended
              ? "The free year has ended"
              : `${days} ${days === 1 ? "day" : "days"} of the free year left`
          }
        >
          <Num>{days}</Num>
        </Ring>
      }
      title={
        ended ? "The free year has ended" : `${days === 1 ? "day" : "days"} of the free year left`
      }
      sub={sub === null ? undefined : (sub ?? planStatusLine(freeUntil))}
    />
  );
}
