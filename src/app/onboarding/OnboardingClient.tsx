"use client";

// ============================================================
// Onboarding client — role selection form.
// useSearchParams must be in a client component inside Suspense.
// ============================================================

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, BookOpen, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES = [
  { id: "student", icon: GraduationCap, label: "I'm a Student", desc: "I want to improve my SAT score." },
  { id: "tutor",   icon: BookOpen,      label: "I'm a Tutor",   desc: "I want to manage my students." },
  { id: "parent",  icon: Users,         label: "I'm a Parent",  desc: "I want to track my child's progress." },
] as const;

export default function OnboardingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") || "group";

  const [role, setRole] = useState<string>("student");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    try {
      // Sync user to Supabase
      await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (role === "student") {
        // Redirect to Stripe checkout
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier }),
        });
        const { url } = await res.json();
        if (url) {
          window.location.href = url;
        } else {
          router.push("/dashboard/student");
        }
      } else {
        router.push("/dashboard/student");
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Who are you?</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">We&apos;ll personalize your experience.</p>
        </div>

        <div className="space-y-3 mb-6">
          {ROLES.map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setRole(id)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                role === id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                role === id ? "bg-blue-500" : "bg-slate-100 dark:bg-slate-700"
              )}>
                <Icon className={cn("w-5 h-5", role === id ? "text-white" : "text-slate-600 dark:text-slate-300")} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={loading}
          className="btn-primary w-full text-base py-4"
        >
          {loading ? "Setting up your account..." : "Continue"}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
