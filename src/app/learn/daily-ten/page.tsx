import type { Metadata } from "next";
import { DailyTenFlow } from "@/components/quiz-flows/Flows";
import { loadFlowUser } from "@/components/quiz-flows/load-user";

export const metadata: Metadata = { title: "Daily 10" };
export const dynamic = "force-dynamic";

export default async function DailyTenPage() {
  const { user } = await loadFlowUser();
  return <DailyTenFlow user={user} />;
}
