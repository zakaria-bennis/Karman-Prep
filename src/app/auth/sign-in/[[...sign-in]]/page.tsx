// ============================================================
// Clerk-powered Sign In — branded backdrop
// ============================================================

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { StrataLogo } from "@/components/shared/StrataLogo";
import AuthBackdrop from "@/components/shared/AuthBackdrop";

export default function SignInPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      <AuthBackdrop />

      <Link href="/" className="mb-8 relative z-10" aria-label="Karman home">
        <StrataLogo size={64} variant="stacked" />
      </Link>

      <SignIn routing="path" path="/auth/sign-in" signUpUrl="/auth/sign-up" />
    </div>
  );
}
