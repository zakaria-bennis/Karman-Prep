"use client";

export function DoneSummary({
  tier,
  placement,
}: {
  tier: string;
  placement: Record<string, unknown>;
}) {
  if (tier === "group" || tier === "small_group") {
    const name = placement.cohortName as string | undefined;
    const created = placement.cohortCreated as boolean | undefined;
    return (
      <p className="text-sm text-slate-300">
        You&apos;ve been placed in{" "}
        <span className="font-semibold text-white">{name ?? "your cohort"}</span>.
        {created ? " (Brand-new cohort created for your SAT date.)" : ""}
      </p>
    );
  }
  if (tier === "private" || tier === "elite") {
    const matched = placement.matchedAvailability as boolean | undefined;
    return (
      <p className="text-sm text-slate-300">
        You&apos;ve been paired with a tutor.{" "}
        {matched
          ? "Their availability matches yours."
          : "We'll fine-tune the match once your tutor reviews your schedule."}
      </p>
    );
  }
  return <p className="text-sm text-slate-300">You&apos;re all set.</p>;
}
