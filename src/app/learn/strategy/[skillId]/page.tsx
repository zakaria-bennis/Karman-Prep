import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { skill72 } from "@/lib/skills/ids72";
import { StrategyStart } from "@/app/dashboard/student/_portal/play/StrategyStart";

type Params = { params: Promise<{ skillId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const skill = skill72(decodeURIComponent((await params).skillId));
  return { title: skill ? `${skill.name}: strategy quiz` : "Strategy quiz" };
}

/** A skill's strategy quiz (the compass), opened from the end of its lesson. */
export default async function StrategyQuizPage({ params }: Params) {
  const id = decodeURIComponent((await params).skillId);
  if (!skill72(id)) notFound();
  return <StrategyStart skillId={id} />;
}
