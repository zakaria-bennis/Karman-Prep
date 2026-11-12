import type { Metadata } from "next";
import { z } from "zod";
import { FlowFrame } from "@/components/quiz-flows/FlowFrame";
import { TimeTrialFlow } from "@/components/quiz-flows/Flows";
import { TrialPicker } from "@/components/quiz-flows/TrialPicker";
import { loadFlowUser } from "@/components/quiz-flows/load-user";
import { loadTrialStatus, trialSectionSchema } from "@/lib/assembler/time-trial-run";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Time trial" };

const EXIT = "/dashboard/student/library";

const query = z.object({
  section: trialSectionSchema.optional().catch(undefined),
  again: z.string().max(20).optional().catch(undefined),
});

type Props = { searchParams?: Promise<{ section?: string; again?: string }> };

/** Time trials: pick a section, then one module against the clock at the student's pace. */
export default async function TimeTrialPage({ searchParams }: Props) {
  const { section, again } = query.parse((await searchParams) ?? {});
  const { clerkId, user } = await loadFlowUser();
  const status = await loadTrialStatus(clerkId);
  const picked = section ? status.find((s) => s.section === section) : undefined;
  if (!picked)
    return (
      <FlowFrame user={user} title="Time trial">
        <TrialPicker status={status} exitHref={EXIT} />
      </FlowFrame>
    );
  return (
    <TimeTrialFlow
      // "Next round" links carry a fresh `again` value, so the player remounts for a new round.
      key={`${picked.section}:${again ?? ""}`}
      user={user}
      section={picked.section}
      standing={picked.standing}
      resumable={picked.open}
      exitHref={EXIT}
    />
  );
}
