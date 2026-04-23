// ============================================================
// Clerk-powered Sign Up page
// Reads ?tier= query param to pass selected plan to onboarding.
// ============================================================

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { StrataLogo } from "@/components/shared/StrataLogo";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-4" aria-label="Strata home">
        <StrataLogo size={30} theme="dark" />
      </Link>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">7-day free trial · No charge until day 8</p>
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
            card: "shadow-xl rounded-2xl",
          },
        }}
      />
    </div>
  );
}
