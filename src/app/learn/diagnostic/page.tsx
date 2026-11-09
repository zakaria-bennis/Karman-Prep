import type { Metadata } from "next";
import { DiagnosticFlow } from "@/components/quiz-flows/Flows";
import { loadFlowUser } from "@/components/quiz-flows/load-user";
import { latestRunOfKind } from "@/lib/assembler/run-store";
import { diagnosticRetakesLeft } from "@/lib/assembler/diagnostic-record";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Diagnostic" };

/** The diagnostic, assembled from the live question bank. */
export default async function DiagnosticRunPage() {
  const { clerkId, user } = await loadFlowUser();
  const saved = await latestRunOfKind(clerkId, "diagnostic").catch(() => null);
  // A finished diagnostic with a granted retake asks before starting the retake.
  const retake = !!saved?.completedAt && (await diagnosticRetakesLeft(clerkId).catch(() => 0)) > 0;
  return <DiagnosticFlow user={user} resumable={!!saved && !retake} retake={retake} />;
}
