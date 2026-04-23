// ============================================================
// /admin — Route layout. Role-gated (admin only).
// Clean utilitarian chrome.
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Settings } from "lucide-react";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { StrataLogo } from "@/components/shared/StrataLogo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const role = await fetchUserRole(userId);
  if (role !== "admin") redirect("/dashboard/student");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="h-14 shrink-0 flex items-center gap-4 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Link href="/" aria-label="Strata home" className="flex items-center gap-2">
          <StrataLogo size={22} />
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <Link href="/admin/curriculum" className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
          <Settings className="w-4 h-4" />
          Admin — Curriculum
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-slate-500 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
            Internal tool
          </span>
          <UserButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
