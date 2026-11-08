import type { Metadata } from "next";
import JoinPage from "@/components/tutor-affiliate/JoinPage";

export const metadata: Metadata = { title: "Tutor code" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <JoinPage code="" />;
}
