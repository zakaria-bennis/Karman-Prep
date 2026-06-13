// ============================================================
// Onboarding page — role selection after sign-up.
// Wraps the client component in Suspense for useSearchParams.
// ============================================================

import { Suspense } from "react";
import OnboardingClient from "./OnboardingClient";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-info/40 border-t-transparent" />
        </div>
      }
    >
      <OnboardingClient />
    </Suspense>
  );
}
