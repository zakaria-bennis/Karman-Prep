"use client";

// ============================================================
// Shared dashboard layout — sidebar nav + top bar
// Used by student, tutor, and parent dashboards.
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard, BookOpen, BarChart3,
  CreditCard, Menu, X, CalendarClock, Users as UsersIcon,
  MessageSquare, UserCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { StrataLogoMark, StrataWordmark } from "@/components/shared/StrataLogo";
import { useUnreadChat } from "@/lib/hooks/useUnreadChat";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  /** When true, the nav link renders the unread-DM badge from
   *  useUnreadChat() to the right of the label. */
  showUnreadBadge?: boolean;
}

const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard/student",           icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/student/schedule",  icon: CalendarClock,   label: "Schedule" },
  { href: "/dashboard/student/chat",      icon: MessageSquare,   label: "Chat", showUnreadBadge: true },
  { href: "/learn",                       icon: BookOpen,        label: "Learn" },
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = pickNav(pathname);
  const unreadChat = useUnreadChat();
  // Imperative handle to open Clerk's profile modal — lets us
  // render the Profile row as a plain icon button so it lines up
  // perfectly with the other nav rows (Clerk's UserButton has
  // its own internal padding/centering that breaks the layout).
  const clerk = useClerk();

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
      {/* Layout spacer — reserves the collapsed sidebar width on
          lg+ so the main content never shifts when the sidebar
          expands on hover. */}
      <div className="hidden lg:block lg:w-16 lg:shrink-0" aria-hidden />

      {/* Sidebar — collapsed icon rail by default; on lg+ it
          expands to ~14rem when hovered, revealing the labels with
          a smooth fade. Mobile keeps the drawer pattern. */}
      <aside
        className={cn(
          "group fixed inset-y-0 left-0 z-40 w-16 lg:hover:w-56",
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800",
          "flex flex-col overflow-hidden",
          "transition-[width,transform] duration-200 ease-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {/* Logo row — links back to the marketing landing page
              (the in-dashboard "Dashboard" nav item already covers
              the home jump, so this is the escape hatch). The
              wordmark uses the brand's gradient — pink → purple →
              cyan — and only fades in once the sidebar expands. */}
          <Link
            href="/"
            aria-label="Go to the Karman landing page"
            className="relative flex items-center gap-3 h-12 px-3.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <StrataLogoMark size={20} />
            <span className="whitespace-nowrap opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150 inline-flex">
              <StrataWordmark fontSize={14} letterSpacing="0.22em" />
            </span>
          </Link>

          {navItems.map(({ href, icon: Icon, label, showUnreadBadge }) => {
            const active = href === activeHref;
            const badge = showUnreadBadge ? unreadChat : 0;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                title={label}
                aria-label={label}
                className={cn(
                  "relative flex items-center gap-3 h-12 px-3.5 rounded-xl transition-all",
                  active
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {/* Label — clipped while collapsed (overflow-hidden
                    on the aside), fades in cleanly when expanded. */}
                <span className="text-sm font-medium whitespace-nowrap opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">
                  {label}
                </span>
                {badge > 0 && (
                  <span
                    aria-label={`${badge} unread message${badge === 1 ? "" : "s"}`}
                    className={cn(
                      "absolute inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold shadow-[0_2px_6px_rgba(59,130,246,0.5)] transition-all",
                      // Corner pip while collapsed; slides to the
                      // right edge of the row when expanded.
                      "top-1 right-1 ring-2 ring-white dark:ring-slate-900",
                      "lg:group-hover:top-1/2 lg:group-hover:right-3 lg:group-hover:-translate-y-1/2 lg:group-hover:ring-0"
                    )}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Profile — plain icon row (Lucide UserCircle) that
              opens Clerk's profile modal via useClerk(). This keeps
              the icon and label perfectly aligned with the nav rows
              above on both collapsed and expanded states. */}
          <button
            type="button"
            onClick={() => clerk.openUserProfile()}
            title="Profile"
            aria-label="Profile"
            className="relative flex items-center gap-3 h-12 px-3.5 rounded-xl w-full text-left text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <UserCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">
              Profile
            </span>
          </button>
        </nav>
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
          <Link href="/" aria-label="Go to the Karman landing page"><StrataLogoMark size={24} /></Link>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
