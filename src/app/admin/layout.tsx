// ============================================================
// /admin — Dark-themed role-gated (admin only) layout.
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Settings, BookOpen, Flag, Users } from "lucide-react";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { StrataLogo } from "@/components/shared/StrataLogo";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const role = await fetchUserRole(userId);
  if (role !== "admin") redirect("/dashboard/student");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="h-14 shrink-0 flex items-center gap-4 px-5 border-b border-slate-800 bg-slate-900/70 backdrop-blur-sm sticky top-0 z-20">
        <Link href="/" aria-label="Strata home" className="flex items-center">
          <StrataLogo size={24} />
        </Link>
        <span className="text-slate-700">/</span>
        <div className="flex items-center gap-1">
          <Settings className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-white">Admin Console</span>
        </div>
        <nav className="ml-6 flex items-center gap-1 text-sm">
          <AdminNavLink href="/admin/curriculum" icon={BookOpen} label="Curriculum" />
          <AdminNavLink href="/admin/cohorts" icon={Users} label="Cohorts" />
          <AdminNavLink href="/admin/curriculum?tab=flagged" icon={Flag} label="Flagged" />
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[11px] font-semibold text-amber-300/80 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
            Internal tool
          </span>
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-7 h-7" } }} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function AdminNavLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}
