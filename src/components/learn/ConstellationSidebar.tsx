"use client";

// ============================================================
// ConstellationSidebar — left-side "command console" menu that
// lists every topic cluster in the active subject and its nodes.
// Click a node to open its card next to its star.
// ============================================================

import { useMemo, useState } from "react";
import { ChevronRight, Lock, CheckCircle, Sparkles, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MappedNode } from "./ConstellationMap";
import { SUBJECT_COLORS, type Subject } from "@/data/curriculum";

interface Props {
  subject: Subject;
  nodes: MappedNode[];
  onNodeClick: (node: MappedNode) => void;
  selectedNodeId: string | null;
}

export default function ConstellationSidebar({
  subject,
  nodes,
  onNodeClick,
  selectedNodeId,
}: Props) {
  const hex = SUBJECT_COLORS[subject].hex;

  // Group by topic cluster (preserves insertion order)
  const clusters = useMemo(() => {
    const map = new Map<string, MappedNode[]>();
    for (const n of nodes) {
      if (!map.has(n.topic_cluster)) map.set(n.topic_cluster, []);
      map.get(n.topic_cluster)!.push(n);
    }
    return Array.from(map.entries()).map(([cluster, ns]) => ({
      cluster,
      nodes: ns.sort((a, b) => a.tier - b.tier || a.topic.localeCompare(b.topic)),
    }));
  }, [nodes]);

  const [openCluster, setOpenCluster] = useState<string | null>(
    clusters.length > 0 ? clusters[0].cluster : null
  );
  const [collapsed, setCollapsed] = useState(false);

  const masteredCount = nodes.filter((n) => n.status === "mastered").length;

  return (
    <aside
      className={cn(
        "absolute bottom-4 left-4 top-16 z-20 flex flex-col",
        "rounded-2xl border border-white/10 bg-black/55 shadow-2xl backdrop-blur-md",
        "transition-all duration-300",
        collapsed ? "w-12" : "w-64"
      )}
    >
      {/* Header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-3">
        <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: hex }} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">
              Skills Index
            </span>
            <span className="text-[10px] tabular-nums text-slate-400">
              {masteredCount}/{nodes.length}
            </span>
          </>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight
            className={cn("h-3 w-3 transition-transform", collapsed ? "" : "rotate-180")}
          />
        </button>
      </header>

      {/* Scrollable body */}
      {!collapsed && (
        <div className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-2 py-2">
          {clusters.map(({ cluster, nodes: clusterNodes }) => {
            const isOpen = openCluster === cluster;
            const mastered = clusterNodes.filter((n) => n.status === "mastered").length;
            return (
              <div key={cluster}>
                <button
                  onClick={() => setOpenCluster(isOpen ? null : cluster)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                    isOpen
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  <ChevronRight
                    className={cn("h-3 w-3 shrink-0 transition-transform", isOpen && "rotate-90")}
                    style={{ color: isOpen ? hex : undefined }}
                  />
                  <span className="flex-1 truncate font-semibold">{cluster}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                    {mastered}/{clusterNodes.length}
                  </span>
                </button>

                {/* Expanded node list */}
                {isOpen && (
                  <ul className="mb-1 ml-2 mt-0.5 space-y-0.5 border-l border-white/5 pl-5 pr-1">
                    {clusterNodes.map((n) => {
                      const isSelected = selectedNodeId === n.id;
                      const isLocked = n.status === "locked";
                      const statusIcon =
                        n.status === "mastered" ? (
                          <CheckCircle className="h-3 w-3 shrink-0 text-emerald-400" />
                        ) : isLocked ? (
                          <Lock className="h-3 w-3 shrink-0 text-slate-400" />
                        ) : (
                          <Circle
                            className="h-3 w-3 shrink-0"
                            style={{ color: hex }}
                            fill={n.status === "available" ? "transparent" : hex + "66"}
                          />
                        );
                      return (
                        <li key={n.id}>
                          <button
                            onClick={() => !isLocked && onNodeClick(n)}
                            disabled={isLocked}
                            className={cn(
                              "flex w-full items-start gap-1.5 rounded px-2 py-1.5 text-left text-[11px] leading-tight transition-colors",
                              isLocked && "cursor-not-allowed opacity-40",
                              !isLocked && isSelected && "bg-white/15 font-semibold text-white",
                              !isLocked &&
                                !isSelected &&
                                "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                            )}
                            style={
                              !isLocked && isSelected
                                ? { boxShadow: `inset 2px 0 0 ${hex}` }
                                : undefined
                            }
                          >
                            {statusIcon}
                            <span className="flex-1">{n.topic}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <footer className="border-t border-white/10 px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400">
          Click a skill to zoom to its star
        </footer>
      )}
    </aside>
  );
}
