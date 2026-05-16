"use client";

// ============================================================
// NodePicker — auto-defaults to the curriculum node implied by the
// row's concept_slug (1:1 mapping built into taxonomy.ts), then
// lets the admin search across all 89 nodes if the default is wrong.
//
// Used inside QuestionCard's expanded "Accept" flow. Kept in its
// own file because it owns its own state machine (autoNodeId,
// selectedNodeId, query) + a non-trivial keyboard-focus useEffect.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CLUSTER_BY_DOMAIN,
  CONCEPT_SLUGS,
  nodeIdFromSlug,
  searchSlugs,
  type ConceptSlug,
} from "@/lib/question-bank/taxonomy";

// Build once — used by the picker to display the currently-selected
// node's label without rebuilding the search index per render.
const NODE_INDEX = new Map<string, ConceptSlug>(CONCEPT_SLUGS.map((c) => [c.nodeId, c]));

export function NodePicker({
  slug,
  busy,
  onAccept,
  onCancel,
}: {
  slug: string | null;
  busy: boolean;
  onAccept: (nodeId: string | null) => void;
  onCancel: () => void;
}) {
  const autoNodeId = slug ? (nodeIdFromSlug(slug) ?? null) : null;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(autoNodeId);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the search input on open so admins can type immediately.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return searchSlugs(q).slice(0, 8);
  }, [query]);

  const selected = selectedNodeId ? (NODE_INDEX.get(selectedNodeId) ?? null) : null;
  const isAutoPick = selectedNodeId === autoNodeId && autoNodeId !== null;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
      {/* Current selection */}
      <div className="flex items-center gap-2 text-xs">
        <span className="shrink-0 text-slate-400">Send to:</span>
        {selected ? (
          <>
            <span className="shrink-0 font-mono text-slate-400">{selected.nodeId}</span>
            <span className="truncate text-slate-200">{selected.label}</span>
            <span className="shrink-0 text-slate-400">·</span>
            <span className="shrink-0 text-slate-400">{CLUSTER_BY_DOMAIN[selected.domain]}</span>
            {isAutoPick && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-emerald-400">
                <Sparkles className="h-3 w-3" /> auto-picked from slug
              </span>
            )}
          </>
        ) : (
          <span className="italic text-slate-400">No node — question stays in bank</span>
        )}
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-2 py-1">
        <Search className="h-3 w-3 shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={selected ? "Search for a different node…" : "Type to search 89 nodes…"}
          className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            ×
          </button>
        )}
      </div>

      {/* Match list (only when typing) */}
      {matches.length > 0 && (
        <ul className="max-h-56 divide-y divide-slate-800/60 overflow-y-auto rounded border border-slate-800">
          {matches.map((m) => {
            const isCurrent = m.nodeId === selectedNodeId;
            return (
              <li key={m.nodeId}>
                <button
                  onClick={() => {
                    setSelectedNodeId(m.nodeId);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-slate-800/60",
                    isCurrent && "bg-emerald-500/10"
                  )}
                >
                  <span className="shrink-0 font-mono text-slate-400">{m.nodeId}</span>
                  <span className="flex-1 truncate text-slate-200">{m.label}</span>
                  <span className="shrink-0 text-slate-400">{CLUSTER_BY_DOMAIN[m.domain]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {query.trim() && matches.length === 0 && (
        <div className="px-1 text-xs italic text-slate-400">
          No nodes match &ldquo;{query}&rdquo;.
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => setSelectedNodeId(null)}
          className="text-xs text-slate-400 hover:text-slate-300"
        >
          Keep in bank
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onAccept(selectedNodeId)}
            disabled={busy}
            className="rounded bg-emerald-500 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-400 disabled:opacity-50"
          >
            <Check className="mr-1 inline h-3 w-3" /> Accept
          </button>
        </div>
      </div>
    </div>
  );
}
