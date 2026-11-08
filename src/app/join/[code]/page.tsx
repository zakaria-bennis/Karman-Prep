import type { Metadata } from "next";
import JoinPage from "@/components/tutor-affiliate/JoinPage";

export const metadata: Metadata = { title: "Join your tutor's group — Karman" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinPage code={decodeURIComponent(code).slice(0, 20)} />;
}
