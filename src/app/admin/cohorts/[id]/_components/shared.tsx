"use client";

// ============================================================
// Shared primitives used across the cohort-detail tabs.
// Carved out of the old monolithic CohortDetailClient.tsx
// (audit M1).
// ============================================================

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CohortTier, CohortStatus } from "@/lib/supabase/queries/cohorts";

export type TabKey = "members" | "notes" | "homework";

export const TIER_LABEL: Record<CohortTier, string> = {
  small_group: "Small Group",
  group: "Seminar",
};

export function TabLink({
  cohortId,
  tab,
  activeTab,
  icon: Icon,
  label,
  count,
}: {
  cohortId: string;
  tab: TabKey;
  activeTab: TabKey;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
}) {
  const active = activeTab === tab;
  const href =
    tab === "members" ? `/admin/cohorts/${cohortId}` : `/admin/cohorts/${cohortId}?tab=${tab}`;
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 border-b-2 px-4 pb-3 font-semibold transition-colors",
        active ? "border-gold/40 text-gold" : "border-transparent text-taupe hover:text-ivory"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count > 0 && (
        <span className={cn("font-mono text-xs", active ? "text-gold-bright" : "text-taupe")}>
          {count}
        </span>
      )}
    </Link>
  );
}

export function EmptyBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-dashed border-bronze px-8 py-12 text-center">
      <h3 className="text-base font-semibold text-ivory">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-taupe">{subtitle}</p>
    </div>
  );
}

export function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={28}
        height={28}
        className="h-7 w-7 rounded-full border border-bronze object-cover"
        unoptimized
      />
    );
  }
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-full border border-bronze bg-surface-raised text-xs font-semibold text-ivory"
      aria-hidden="true"
    >
      {initials || "?"}
    </div>
  );
}

export function TierBadge({ tier }: { tier: CohortTier }) {
  const classes =
    tier === "small_group"
      ? "bg-success/10 text-success-bright border-success/20"
      : "bg-gold/10 text-gold-bright border-gold/20";
  return (
    <span
      className={cn("inline-block rounded-md border px-2 py-0.5 text-xs font-semibold", classes)}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}

export function StatusBadge({ status }: { status: CohortStatus }) {
  const map: Record<CohortStatus, string> = {
    forming: "bg-surface-raised/10 text-ivory border-bronze/20",
    active: "bg-success/10 text-success-bright border-success/20",
    completed: "bg-surface-raised/20 text-taupe border-bronze/30",
  };
  return (
    <span
      className={cn(
        "inline-block rounded-md border px-2 py-0.5 text-xs font-semibold",
        map[status]
      )}
    >
      {status}
    </span>
  );
}

export function studentDisplay(s: {
  first_name: string | null;
  last_name: string | null;
  email: string;
}) {
  const full = [s.first_name, s.last_name].filter(Boolean).join(" ");
  return full || s.email;
}

export function tutorDisplay(t: {
  first_name: string | null;
  last_name: string | null;
  email: string;
}) {
  const full = [t.first_name, t.last_name].filter(Boolean).join(" ");
  return full || t.email;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
