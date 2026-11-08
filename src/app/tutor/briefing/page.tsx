import type { Metadata } from "next";
import { Card } from "@/components/portal";
import { readDailyBriefing } from "@/lib/educator-briefing/daily";
import { BriefingUnavailable, DailyBriefingView } from "@/components/tutor/briefing/BriefingViews";

export const metadata: Metadata = { title: "Daily briefing" };
export const dynamic = "force-dynamic";

export default async function DailyBriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  let briefing: Awaited<ReturnType<typeof readDailyBriefing>> | null = null;
  try {
    briefing = await readDailyBriefing(date);
  } catch {
    /* Fail closed without exposing private errors. */
  }
  return (
    <Card>
      <p className="kp-meta">Open a student&apos;s saved practice before your session.</p>
      {briefing ? <DailyBriefingView briefing={briefing} /> : <BriefingUnavailable />}
    </Card>
  );
}
