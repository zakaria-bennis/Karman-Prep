// ============================================================
// Onboarding page — role selection after sign-up.
// Wraps the client component in Suspense for useSearchParams.
// ============================================================

import { Suspense } from "react";
import OnboardingClient from "./OnboardingClient";

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OnboardingClient />
    </Suspense>
  );
}
