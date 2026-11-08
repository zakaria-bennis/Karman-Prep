"use client";

// ============================================================
// Shared primitives used across the cohort-detail tabs.
// Carved out of the old monolithic CohortDetailClient.tsx
// (audit M1).
// ============================================================

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { tierLabel } from "@/lib/scheduling/tiers";
import type { CohortTier, CohortStatus } from "@/lib/supabase/queries/cohorts";

export type TabKey = "members" | "notes" | "homework";

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
        active ? "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] text-[color:var(--accent-text)]" : "border-transparent text-[color:var(--mute)] hover:text-[color:var(--ink)]"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count > 0 && (
        <span className={cn("font-mono text-xs", active ? "text-[color:var(--accent-text)]" : "text-[color:var(--mute)]")}>
          {count}
        </span>
      )}
    </Link>
  );
}

export function EmptyBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--line)] px-8 py-12 text-center">
      <h3 className="text-base font-semibold text-[color:var(--ink)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--mute)]">{subtitle}</p>
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
        className="h-7 w-7 rounded-full border border-[color:var(--line)] object-cover"
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
      className="flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--raised)] text-xs font-semibold text-[color:var(--ink)]"
      aria-hidden="true"
    >
      {initials || "?"}
    </div>
  );
}

export function TierBadge({ tier }: { tier: CohortTier }) {
  const classes =
    tier === "small_group"
      ? "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[color:var(--good)] border-[color-mix(in_srgb,var(--good)_20%,transparent)]"
      : "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[color:var(--accent-text)] border-[color-mix(in_srgb,var(--accent)_20%,transparent)]";
  return (
    <span
      className={cn("inline-block rounded-md border px-2 py-0.5 text-xs font-semibold", classes)}
    >
      {tierLabel(tier)}
    </span>
  );
}

export function StatusBadge({ status }: { status: CohortStatus }) {
  const map: Record<CohortStatus, string> = {
    forming: "bg-[color-mix(in_srgb,var(--raised)_10%,transparent)] text-[color:var(--ink)] border-[color-mix(in_srgb,var(--line)_20%,transparent)]",
    active: "bg-[color-mix(in_srgb,var(--good)_10%,transparent)] text-[color:var(--good)] border-[color-mix(in_srgb,var(--good)_20%,transparent)]",
    completed: "bg-[color-mix(in_srgb,var(--raised)_20%,transparent)] text-[color:var(--mute)] border-[color-mix(in_srgb,var(--line)_30%,transparent)]",
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
