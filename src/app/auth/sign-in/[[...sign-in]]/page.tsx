// ============================================================
// Clerk-powered Sign In — branded backdrop
// ============================================================

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { KarmanLogo } from "@/components/shared/KarmanLogo";
import AuthBackdrop from "@/components/shared/AuthBackdrop";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <AuthBackdrop />

      <Link href="/" className="relative z-10 mb-8" aria-label="Karman home">
        <KarmanLogo size={64} variant="stacked" />
      </Link>

      <SignIn routing="path" path="/auth/sign-in" signUpUrl="/auth/sign-up" />
    </div>
  );
}
