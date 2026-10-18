"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCheck,
  CircleUserRound,
  ClipboardCheck,
  CreditCard,
  Eye,
  FolderOpen,
  History,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { KarmanLogo } from "./KarmanLogo";
import { ThemeSelector } from "./ThemeSelector";
import { cn } from "@/lib/utils";

type Area = "student" | "tutor" | "admin";
interface Destination {
  href: string;
  label: string;
  icon: LucideIcon;
  group?: string;
}

const DESTINATIONS: Record<Area, Destination[]> = {
  student: [
    { href: "/dashboard/student", label: "Your week", icon: LayoutDashboard },
    { href: "/learn", label: "Learn and practice", icon: BookOpen },
    { href: "/learn/daily", label: "Daily practice", icon: Sparkles },
    { href: "/dashboard/student/progress", label: "Progress", icon: ChartNoAxesCombined },
    { href: "/dashboard/student/quizzes", label: "Quiz history", icon: History },
    {
      href: "/dashboard/student/schedule",
      label: "Schedule",
      icon: CalendarDays,
      group: "Your support",
    },
    { href: "/dashboard/student/chat", label: "Messages", icon: MessageSquare },
    { href: "/billing", label: "Billing", icon: CreditCard },
  ],
  tutor: [
    { href: "/tutor", label: "Students", icon: Users },
    { href: "/tutor/schedule", label: "Schedule", icon: CalendarDays },
    { href: "/tutor/earnings", label: "Earnings", icon: ChartNoAxesCombined },
    { href: "/tutor/payouts", label: "Payouts", icon: Wallet },
    {
      href: "/tutor/settings/booking",
      label: "Booking settings",
      icon: Settings,
      group: "Your account",
    },
    { href: "/tutor/settings/payment", label: "Payment settings", icon: CreditCard },
  ],
  admin: [
    { href: "/admin/questions/dashboard", label: "Question overview", icon: LayoutDashboard },
    { href: "/admin/curriculum", label: "Curriculum", icon: BookOpen },
    { href: "/admin/questions/review", label: "Review questions", icon: ClipboardCheck },
    { href: "/admin/questions/preview", label: "Question preview", icon: Eye },
    { href: "/admin/questions/preview/rapid", label: "Rapid student view", icon: CheckCheck },
    { href: "/admin/questions/import", label: "Import questions", icon: Upload },
    { href: "/admin/users", label: "People", icon: Users, group: "Manage" },
    { href: "/admin/cohorts", label: "Cohorts", icon: FolderOpen },
    { href: "/admin/revenue", label: "Revenue", icon: ChartNoAxesCombined },
    { href: "/admin/moderation", label: "Moderation", icon: ShieldCheck },
    { href: "/admin/jobs", label: "Background jobs", icon: ListChecks },
    { href: "/admin/pdf-pipeline/jobs", label: "Import jobs", icon: Upload },
  ],
};
const AREA_LABEL: Record<Area, string> = {
  student: "Student workspace",
  tutor: "Educator workspace",
  admin: "Admin workspace",
};

export default function PortalShell({
  area,
  children,
  actions,
  onProfile,
  unread = 0,
}: {
  area: Area;
  children: ReactNode;
  actions?: ReactNode;
  onProfile?: () => void;
  unread?: number;
}) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const items = DESTINATIONS[area];
  const active = items
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
  function close() {
    drawer.current?.close();
  }
  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
    ).filter((element) => element.getClientRects().length > 0);
    if (controls.length === 0) return;
    // Include links consistently even when Safari's system tab preference only
    // visits form controls. The DOM order remains the keyboard reading order.
    const current = controls.indexOf(document.activeElement as HTMLElement);
    const next = (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    event.preventDefault();
    controls[next].focus();
  }
  function navigation() {
    return (
      <nav aria-label={AREA_LABEL[area]} className="space-y-1 px-3 pb-5">
        {items.map(({ href, label, icon: Icon, group }) => (
          <div key={href}>
            {group && <p className="px-3 pb-2 pt-7 text-xs font-medium text-taupe">{group}</p>}
            <Link
              href={href}
              onClick={close}
              aria-current={active?.href === href ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active?.href === href
                  ? "bg-gold/10 text-ivory ring-1 ring-inset ring-gold/30"
                  : "text-taupe hover:bg-surface-raised hover:text-ivory"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span>{label}</span>
              {href.endsWith("/chat") && unread > 0 && (
                <span
                  className="ml-auto rounded-full bg-gold px-2 py-0.5 text-xs text-night"
                  aria-label={`${unread} unread messages`}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          </div>
        ))}
        {onProfile && (
          <button
            type="button"
            onClick={() => {
              close();
              onProfile();
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-taupe hover:bg-surface-raised hover:text-ivory"
          >
            <CircleUserRound className="h-[18px] w-[18px]" aria-hidden="true" />
            Profile
          </button>
        )}
      </nav>
    );
  }
  return (
    <div className="portal-shell min-h-screen bg-night text-ivory">
      <a
        href="#workspace-content"
        className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-gold px-4 py-3 text-night focus:not-sr-only"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-bronze/35 bg-surface lg:flex">
        <Link
          href="/"
          aria-label="Karman home"
          className="mx-6 my-7 inline-flex min-h-11 items-center"
        >
          <KarmanLogo size={32} />
        </Link>
        <p className="px-6 pb-5 text-xs text-taupe">{AREA_LABEL[area]}</p>
        <div className="min-h-0 flex-1 overflow-y-auto">{navigation()}</div>
        <a
          href="mailto:billing@karmanprep.com"
          className="m-5 rounded-xl border border-bronze/40 p-3 text-sm text-taupe hover:text-ivory"
        >
          Need a hand? <span className="block font-medium text-ivory">Contact support</span>
        </a>
      </aside>
      <div className="min-w-0 lg:pl-60">
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-bronze/35 bg-night/95 px-4 py-2 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={opener}
              type="button"
              onClick={() => drawer.current?.showModal()}
              aria-label="Open navigation"
              aria-haspopup="dialog"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-bronze/60 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="truncate text-sm font-medium">
              {active?.label ?? AREA_LABEL[area]}
            </span>
          </div>
          <div className="flex max-w-full items-center gap-2">
            <ThemeSelector compact />
            {actions}
          </div>
        </header>
        <main id="workspace-content" tabIndex={-1} className="min-w-0 outline-none">
          {children}
        </main>
      </div>
      <dialog
        ref={drawer}
        aria-label={`${AREA_LABEL[area]} navigation`}
        onKeyDown={containFocus}
        onClose={() => opener.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,calc(100vw-3rem))] max-w-none border-0 border-r border-bronze bg-surface p-0 text-ivory shadow-2xl backdrop:bg-black/45"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-5">
          <Link href="/" aria-label="Karman home">
            <KarmanLogo size={32} />
          </Link>
          <button
            type="button"
            autoFocus
            onClick={close}
            aria-label="Close navigation"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-bronze/60"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="px-6 pb-5 text-sm text-taupe">{AREA_LABEL[area]}</p>
        {navigation()}
      </dialog>
    </div>
  );
}
