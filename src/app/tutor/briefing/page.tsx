import type { Metadata } from "next";
import Link from "next/link";
import { readDailyBriefing } from "@/lib/educator-briefing/daily";
import { BriefingUnavailable, DailyBriefingView } from "@/components/tutor/briefing/BriefingViews";

export const metadata: Metadata = { title: "Daily briefing — Tutor Portal" };
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
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Link href="/tutor" className="inline-flex min-h-11 items-center text-sm text-info underline">
        All students
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-ivory">Daily session briefing</h1>
        <p className="mt-2 text-sm text-taupe">
          Open a student&apos;s saved practice before your session.
        </p>
      </header>
      {briefing ? <DailyBriefingView briefing={briefing} /> : <BriefingUnavailable />}
    </section>
  );
}
