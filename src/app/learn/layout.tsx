// ============================================================
// Learn portal route layout — auth guard + learn shell
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LearnLayout from "@/components/learn/LearnLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  return <LearnLayout>{children}</LearnLayout>;
}
