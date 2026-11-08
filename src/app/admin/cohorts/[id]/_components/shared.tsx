"use client";

// ============================================================
// Small helpers shared by the cohort-detail tabs.
// ============================================================

import Image from "next/image";
import { formatSatDate, tutorDisplay } from "../../format";

export type TabKey = "members" | "notes" | "homework";

/** Students and tutors are both shown as "First Last", or their email. */
export const studentDisplay = tutorDisplay;

/** A timestamp as "Mar 14, 2026". */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export { formatSatDate, tutorDisplay };

export function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const box = {
    width: 28,
    height: 28,
    flex: "none",
    borderRadius: 999,
    border: "1px solid var(--line)",
  } as const;
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={28}
        height={28}
        style={{ ...box, objectFit: "cover" }}
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
    <span
      aria-hidden="true"
      style={{
        ...box,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--raised)",
        fontSize: "0.7rem",
        fontWeight: 600,
      }}
    >
      {initials || "?"}
    </span>
  );
}
