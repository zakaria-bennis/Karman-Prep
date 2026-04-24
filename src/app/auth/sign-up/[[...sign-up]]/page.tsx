// ============================================================
// Clerk-powered Sign Up — branded backdrop
// ============================================================

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { StrataLogo } from "@/components/shared/StrataLogo";
import AuthBackdrop from "@/components/shared/AuthBackdrop";

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <AuthBackdrop />

      <Link href="/" className="mb-4 relative z-10" aria-label="Strata home">
        <StrataLogo size={64} variant="stacked" />
      </Link>
      <p className="text-slate-400 text-xs mb-6 relative z-10">
        7-day free trial
      </p>

      <SignUp routing="path" path="/auth/sign-up" signInUrl="/auth/sign-in" />
    </div>
  );
}
