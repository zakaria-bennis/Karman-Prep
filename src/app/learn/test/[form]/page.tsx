import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FullTestFlow } from "@/components/quiz-flows/Flows";
import { loadFlowUser } from "@/components/quiz-flows/load-user";
import { findRunByKey } from "@/lib/assembler/run-store";
import { FULL_LENGTH_FORMS } from "@/lib/assembler/forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Full-length practice test" };

export default async function FullTestPage({ params }: { params: Promise<{ form: string }> }) {
  const { form } = await params;
  const number = Number(form);
  if (!Number.isInteger(number) || number < 1 || number > FULL_LENGTH_FORMS) notFound();
  const { clerkId, user } = await loadFlowUser();
  const saved = await findRunByKey(clerkId, `full-test:${number}`).catch(() => null);
  return <FullTestFlow user={user} form={number} resumable={!!saved} />;
}
