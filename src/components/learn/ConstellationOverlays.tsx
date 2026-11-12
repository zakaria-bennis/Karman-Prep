"use client";

// Hover tooltip and status legend drawn over the constellation map.
// Split out of ConstellationMap.tsx.

import { cn } from "@/lib/utils";
import { type NodeStatus, type Subject, TIER_LABELS } from "@/data/curriculum";
import type { MappedNode } from "./ConstellationMap";

export function ConstellationTooltip({
  hoveredNode,
  activeSubject,
}: {
  hoveredNode: MappedNode;
  activeSubject: Subject;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2",
        "flex items-center gap-3 rounded-xl px-4 py-2.5",
        "border border-bronze bg-surface/95 shadow-2xl backdrop-blur-sm",
        "z-30 max-w-xs text-sm text-ivory"
      )}
    >
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          backgroundColor:
            hoveredNode.status === "mastered"
              ? "#E4C86A"
              : hoveredNode.status === "locked"
                ? "#3B3426"
                : hoveredNode.subject === "reading"
                  ? "#D84F73"
                  : "#2FA8FF",
        }}
      />
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {hoveredNode.topic}{" "}
          {hoveredNode.subject !== activeSubject && (
            <span className="text-xs text-taupe">
              ({hoveredNode.subject === "math" ? "Math" : "R&W"} — not active)
            </span>
          )}
        </p>
        <p className="text-xs capitalize text-taupe">
          {TIER_LABELS[hoveredNode.tier]} · Difficulty {hoveredNode.difficulty} ·{" "}
          <span
            className={cn(
              hoveredNode.status === "locked"
                ? "text-taupe/70"
                : hoveredNode.status === "mastered"
                  ? "text-gold-bright"
                  : hoveredNode.status === "partially_complete"
                    ? "text-gold/80"
                    : hoveredNode.status === "available"
                      ? "text-ivory/85"
                      : "text-ivory"
            )}
          >
            {hoveredNode.status === "in_progress"
              ? "in progress"
              : hoveredNode.status.replace(/_/g, " ")}
          </span>
        </p>
      </div>
    </div>
  );
}

export function ConstellationLegend({ activeHex }: { activeHex: string }) {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 rounded-xl border border-bronze bg-night/70 px-3 py-2 backdrop-blur-md">
      {[
        // Mastered is gold — the earned mark — regardless of subject.
        { status: "mastered" as NodeStatus, label: "Mastered", color: "#E4C86A" },
        {
          status: "partially_complete" as NodeStatus,
          label: "Partial pass",
          color: activeHex + "cc",
        },
        { status: "in_progress" as NodeStatus, label: "In progress", color: activeHex + "99" },
        { status: "available" as NodeStatus, label: "Available", color: activeHex + "66" },
        { status: "locked" as NodeStatus, label: "Locked", color: "#3B3426" },
      ].map(({ status, label, color }) => (
        <div key={status} className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full border border-bronze/60"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs text-taupe">{label}</span>
        </div>
      ))}
    </div>
  );
}
