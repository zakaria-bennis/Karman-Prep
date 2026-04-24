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

export default function ConstellationSidebar({ subject, nodes, onNodeClick, selectedNodeId }: Props) {
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
        "absolute top-16 left-4 bottom-4 z-20 flex flex-col",
        "bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl",
        "transition-all duration-300",
        collapsed ? "w-12" : "w-64"
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-2 px-3 py-3 border-b border-white/10 shrink-0">
        <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: hex }} />
        {!collapsed && (
          <>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300 flex-1 truncate">
              Skills Index
            </span>
            <span className="text-[10px] text-slate-500 tabular-nums">
              {masteredCount}/{nodes.length}
            </span>
          </>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight className={cn("w-3 h-3 transition-transform", collapsed ? "" : "rotate-180")} />
        </button>
      </header>

      {/* Scrollable body */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin">
          {clusters.map(({ cluster, nodes: clusterNodes }) => {
            const isOpen = openCluster === cluster;
            const mastered = clusterNodes.filter((n) => n.status === "mastered").length;
            return (
              <div key={cluster}>
                <button
                  onClick={() => setOpenCluster(isOpen ? null : cluster)}
                  className={cn(
                    "w-full text-left flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs transition-colors",
                    isOpen
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )}
                >
                  <ChevronRight
                    className={cn("w-3 h-3 transition-transform shrink-0", isOpen && "rotate-90")}
                    style={{ color: isOpen ? hex : undefined }}
                  />
                  <span className="font-semibold truncate flex-1">{cluster}</span>
                  <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
                    {mastered}/{clusterNodes.length}
                  </span>
                </button>

                {/* Expanded node list */}
                {isOpen && (
                  <ul className="mt-0.5 mb-1 space-y-0.5 pl-5 pr-1 border-l border-white/5 ml-2">
                    {clusterNodes.map((n) => {
                      const isSelected = selectedNodeId === n.id;
                      const isLocked = n.status === "locked";
                      const statusIcon =
                        n.status === "mastered" ? (
                          <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : isLocked ? (
                          <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                        ) : (
                          <Circle
                            className="w-3 h-3 shrink-0"
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
                              "w-full text-left flex items-start gap-1.5 px-2 py-1.5 rounded text-[11px] transition-colors leading-tight",
                              isLocked && "opacity-40 cursor-not-allowed",
                              !isLocked && isSelected && "bg-white/15 text-white font-semibold",
                              !isLocked && !isSelected && "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                            )}
                            style={!isLocked && isSelected ? { boxShadow: `inset 2px 0 0 ${hex}` } : undefined}
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
        <footer className="px-3 py-2 border-t border-white/10 text-[10px] text-slate-500 uppercase tracking-wider">
          Click a skill to zoom to its star
        </footer>
      )}
    </aside>
  );
}
