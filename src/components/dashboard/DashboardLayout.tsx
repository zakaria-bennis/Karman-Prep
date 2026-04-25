"use client";

// ============================================================
// Shared dashboard layout — sidebar nav + top bar
// Used by student, tutor, and parent dashboards.
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard, BookOpen, BarChart3, ClipboardList,
  CreditCard, Menu, X, CalendarClock, Users as UsersIcon,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { StrataLogo } from "@/components/shared/StrataLogo";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard/student",           icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/student/schedule",  icon: CalendarClock,   label: "Schedule" },
  { href: "/dashboard/student/chat",      icon: MessageSquare,   label: "Chat" },
  { href: "/learn",                       icon: BookOpen,        label: "Learn" },
  { href: "/diagnostic",                  icon: ClipboardList,   label: "Diagnostic" },
  { href: "/dashboard/student/progress",  icon: BarChart3,       label: "Progress" },
  { href: "/billing",                     icon: CreditCard,      label: "Billing" },
];

const TUTOR_NAV: NavItem[] = [
  { href: "/tutor",          icon: UsersIcon,     label: "My Students" },
  { href: "/tutor/schedule", icon: CalendarClock, label: "My Schedule" },
];

function pickNav(pathname: string): NavItem[] {
  if (pathname.startsWith("/tutor")) return TUTOR_NAV;
  return STUDENT_NAV;
}

function pickHome(pathname: string): string {
  if (pathname.startsWith("/tutor")) return "/tutor";
  return "/dashboard/student";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = pickNav(pathname);
  const homeHref = pickHome(pathname);

  // Active item = longest href that's an exact match or a path prefix.
  // Without this, /tutor/schedule lights up *both* "My Students" (/tutor)
  // and "My Schedule" (/tutor/schedule) because both prefix-match.
  const activeHref = (() => {
    let bestLen = -1;
    let best = "";
    for (const { href } of navItems) {
      const matches = pathname === href || pathname.startsWith(href + "/");
      if (matches && href.length > bestLen) {
        best = href;
        bestLen = href.length;
      }
    }
    return best;
  })();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo — links the signed-in user to their own home (student
            dashboard or tutor portal). Marketing landing is reachable
            through the global nav after sign-out. */}
        <Link href={homeHref} className="flex items-center px-5 h-16 border-b border-slate-200 dark:border-slate-800" aria-label="Go to your dashboard">
          <StrataLogo size={26} />
        </Link>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <UserButton />
            <span className="text-xs text-slate-500 dark:text-slate-400">Account</span>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden h-14 flex items-center px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link href={homeHref} aria-label="Go to your dashboard"><StrataLogo size={24} /></Link>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
