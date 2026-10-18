// ============================================================
// Learn portal route layout — auth guard + learn shell, wrapped in
// the per-request calculator version (AR-7).
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import LearnLayout from "@/components/learn/LearnLayout";
import { CalculatorVersionProvider } from "@/components/calculator/CalculatorVersion";
import { resolveCalculatorVersion } from "@/lib/calculator-version";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");

  // Never rejects: any failure resolves "v1" (AR-6).
  const version = await resolveCalculatorVersion();
  return (
    <CalculatorVersionProvider version={version}>
      <LearnLayout>{children}</LearnLayout>
    </CalculatorVersionProvider>
  );
}
