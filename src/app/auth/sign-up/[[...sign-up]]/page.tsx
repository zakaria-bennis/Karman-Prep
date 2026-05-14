// ============================================================
// Clerk-powered Sign Up — branded backdrop
// ============================================================

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { StrataLogo } from "@/components/shared/StrataLogo";
import AuthBackdrop from "@/components/shared/AuthBackdrop";

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <AuthBackdrop />

      <Link href="/" className="relative z-10 mb-4" aria-label="Karman home">
        <StrataLogo size={64} variant="stacked" />
      </Link>
      <p className="relative z-10 mb-6 text-xs text-slate-400">7-day free trial</p>

      <SignUp routing="path" path="/auth/sign-up" signInUrl="/auth/sign-in" />
    </div>
  );
}
