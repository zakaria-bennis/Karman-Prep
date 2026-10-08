// ============================================================
// Clerk-powered Sign Up — branded backdrop
// ============================================================

import { ThemedSignUp as SignUp } from "@/components/shared/ThemedClerkWidgets";
import Link from "next/link";
import { KarmanLogo } from "@/components/shared/KarmanLogo";
import AuthBackdrop from "@/components/shared/AuthBackdrop";
import { isFreeTrialEligibleTier } from "@/lib/integrations/stripe/checkout-policy";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier } = await searchParams;
  const trialMessage = tier
    ? isFreeTrialEligibleTier(tier)
      ? "Seminar includes a 7-day trial for new checkouts."
      : "This tier does not include a trial. Checkout will show its terms before purchase."
    : "A 7-day trial is currently available only on Seminar; checkout shows the selected offer's terms before purchase.";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <AuthBackdrop />

      <Link href="/" className="relative z-10 mb-4" aria-label="Karman home">
        <KarmanLogo size={64} variant="stacked" />
      </Link>
      <p className="relative z-10 mb-6 max-w-sm text-center text-xs text-taupe">{trialMessage}</p>

      <SignUp routing="path" path="/auth/sign-up" signInUrl="/auth/sign-in" />
    </div>
  );
}
