// ============================================================
// Clerk-powered Sign In page
// ============================================================

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { StrataLogo } from "@/components/shared/StrataLogo";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8" aria-label="Strata home">
        <StrataLogo size={30} theme="dark" />
      </Link>
      <SignIn
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
