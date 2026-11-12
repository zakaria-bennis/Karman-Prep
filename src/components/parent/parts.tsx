/* Small pieces shared by the parent pages: the guarantee card and session times. */
import { Card, Legend, Num, Ring, SectionHeader } from "@/components/portal";
import { GUARANTEE } from "@/lib/marketing/offer";
import type { GuaranteeStatus } from "@/lib/parent/guarantee";

/** Family times show in Central time until families pick their own zone. */
const ZONE = "America/Chicago";

export function sessionWhen(iso: string, opts: { date?: boolean } = {}): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: ZONE,
  });
  if (opts.date) return day;
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: ZONE,
  });
  return `${day}, ${time} CT`;
}

export function GuaranteeCard({
  status,
  childName,
}: {
  status: GuaranteeStatus;
  childName: string;
}) {
  if (status.none) {
    return (
      <Card>
        <SectionHeader title="Score guarantee" />
        <p className="kp-meta">
          {childName} started at <Num>{status.baseline}</Num>. From a starting score of{" "}
          <Num>{GUARANTEE.noGuaranteeFrom}</Num> or higher, the {status.plan} plan promises that the
          score rises. If it does not, {childName} gets {GUARANTEE.highStartProMonths} months of Pro
          free.
        </p>
      </Card>
    );
  }
  if (status.baseline === null || status.needed === null) {
    return (
      <Card>
        <SectionHeader title="Score guarantee" />
        <p className="kp-meta">
          {childName}&rsquo;s {status.plan} plan carries the guarantee. It starts from the first
          full practice test.
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <SectionHeader title="Score guarantee" note={status.met ? "Met" : "In progress"} />
      <div className="kp-ring-row">
        <Ring
          value={Math.min(1, status.gained / status.needed)}
          label={`Guarantee: ${status.gained} of ${status.needed} points gained`}
        >
          <Num>+{status.gained}</Num>
        </Ring>
        <span className="kp-meta">
          The {status.plan} guarantee is <Num>+{status.needed}</Num> points from a starting score of{" "}
          <Num>{status.baseline}</Num>.
        </span>
      </div>
      <Legend
        items={[
          { label: "Gained", value: <Num>+{status.gained}</Num>, color: "var(--l3)" },
          { label: "Target score", value: <Num>{status.target}</Num>, color: "var(--l1)" },
        ]}
      />
    </Card>
  );
}
