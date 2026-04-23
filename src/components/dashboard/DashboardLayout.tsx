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
  CreditCard, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { StrataLogo } from "@/components/shared/StrataLogo";

const NAV_ITEMS = [
  { href: "/dashboard/student", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/learn",             icon: BookOpen,        label: "Learn" },
  { href: "/diagnostic",        icon: ClipboardList,   label: "Diagnostic" },
  { href: "/dashboard/student/progress", icon: BarChart3, label: "Progress" },
  { href: "/billing",           icon: CreditCard,      label: "Billing" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        {/* Logo — links to landing page */}
        <Link href="/" className="flex items-center px-5 h-16 border-b border-slate-200 dark:border-slate-800" aria-label="Strata home">
          <StrataLogo size={26} />
        </Link>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
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
          <Link href="/" aria-label="Strata home"><StrataLogo size={24} /></Link>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
