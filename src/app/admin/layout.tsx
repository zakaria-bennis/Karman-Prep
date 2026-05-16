// ============================================================
// /admin — Dark-themed role-gated (admin only) layout.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  Settings,
  BookOpen,
  Users,
  UserCog,
  DollarSign,
  ClipboardCheck,
  Upload,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { KarmanLogo } from "@/components/shared/KarmanLogo";
import ImpersonationMenu from "@/components/admin/ImpersonationMenu";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await safeAuth();
  if (!userId) redirect("/auth/sign-in");

  const role = await fetchUserRole(userId);
  if (role !== "admin") redirect("/dashboard/student");

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b border-slate-800 bg-slate-900/70 px-5 backdrop-blur-sm">
        <Link href="/" aria-label="Karman home" className="flex items-center">
          <KarmanLogo size={24} />
        </Link>
        <span className="text-slate-400">/</span>
        <div className="flex items-center gap-1">
          <Settings className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-bold text-white">Admin Console</span>
        </div>
        <nav className="ml-6 flex items-center gap-1 text-sm">
          <AdminNavLink href="/admin/curriculum" icon={BookOpen} label="Curriculum" />
          <AdminNavLink href="/admin/questions/import" icon={Upload} label="Import" />
          <AdminNavLink href="/admin/questions/review" icon={ClipboardCheck} label="Review" />
          <AdminNavLink href="/admin/questions/preview" icon={Eye} label="Preview" />
          <AdminNavLink href="/admin/cohorts" icon={Users} label="Cohorts" />
          <AdminNavLink href="/admin/users" icon={UserCog} label="Users" />
          <AdminNavLink href="/admin/revenue" icon={DollarSign} label="Revenue" />
          <AdminNavLink href="/admin/moderation" icon={ShieldAlert} label="Moderation" />
          {/* Top-bar "Flagged" link removed — redundant with the in-page
              Nodes/Flagged tab on /admin/curriculum. The count badge
              there is the canonical surface for unresolved flags. */}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <ImpersonationMenu />
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300/80">
            Internal tool
          </span>
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-7 h-7" } }} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function AdminNavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
