// ============================================================
// Clerk-powered Sign Up — branded backdrop
// ============================================================

import { ThemedSignUp as SignUp } from "@/components/shared/ThemedClerkWidgets";
import Link from "next/link";
import { KarmanLogo } from "@/components/shared/KarmanLogo";
import AuthBackdrop from "@/components/shared/AuthBackdrop";
import { FREE_PLAN } from "@/lib/marketing/offer";

/** Every new account starts on the Free plan; paid plans are picked later in Billing. */
const START_FREE = `Start free: ${FREE_PLAN.questionLimit} questions and one full-length test, no card.`;

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <AuthBackdrop />

      <Link href="/" className="relative z-10 mb-4" aria-label="Karman home">
        <KarmanLogo size={64} variant="stacked" />
      </Link>
      <p className="relative z-10 mb-6 max-w-sm text-center text-xs text-taupe">{START_FREE}</p>

      <SignUp routing="path" path="/auth/sign-up" signInUrl="/auth/sign-in" />
    </div>
  );
}
