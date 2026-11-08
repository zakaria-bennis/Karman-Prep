import type { Metadata } from "next";
import { DiagnosticFlow } from "@/components/quiz-flows/Flows";
import { loadFlowUser } from "@/components/quiz-flows/load-user";
import { findRunByKey } from "@/lib/assembler/run-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Diagnostic" };

/** The diagnostic, assembled from the live question bank. */
export default async function DiagnosticRunPage() {
  const { clerkId, user } = await loadFlowUser("/learn/diagnostic");
  const saved = await findRunByKey(clerkId, "diagnostic:1").catch(() => null);
  return <DiagnosticFlow user={user} resumable={!!saved} />;
}
