"use client";

// ============================================================
// NodeQuestionSearch — search bar at the top-right of
// /admin/curriculum. Searches both:
//   · Curriculum NODES — client-side fuzzy match on the static
//     curriculum (89 nodes, shipped once at component mount).
//   · Bank/live QUESTIONS — server action against quiz_questions,
//     debounced at 250 ms.
//
// Result rows link to:
//   · Node                    → /admin/curriculum/<nodeId>
//   · Question with node      → /admin/curriculum/<nodeId>?q=<id>
//   · Question in bank        → /admin/questions/review?tab=bank&q=<id>
//
// UX:
//   · Empty input → dropdown hidden.
//   · ↑ / ↓ to highlight, Enter to open, Esc to clear/close.
//   · Click anywhere outside the box also closes.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, GraduationCap, FileQuestion, Inbox, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RW_NODES, MATH_NODES, type CurriculumNode } from "@/data/curriculum";
import {
  actionSearchBankQuestions,
  type QuestionSearchResult,
} from "@/app/admin/curriculum/search-actions";

const DEBOUNCE_MS = 250;
const MAX_NODE_RESULTS = 8;

interface NodeResult {
  kind: "node";
  node: CurriculumNode;
}
interface QuestionResult {
  kind: "question";
  q: QuestionSearchResult;
}
type Result = NodeResult | QuestionResult;

const ALL_NODES: CurriculumNode[] = [...RW_NODES, ...MATH_NODES];

function searchNodes(query: string): NodeResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const matches = ALL_NODES.filter(
    (n) =>
      n.topic.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      n.concept_slug.toLowerCase().includes(q) ||
      n.id.toLowerCase().includes(q)
  );
  // Bias towards exact-prefix topic matches.
  matches.sort((a, b) => {
    const aPrefix = a.topic.toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = b.topic.toLowerCase().startsWith(q) ? 0 : 1;
    return aPrefix - bPrefix;
  });
  return matches.slice(0, MAX_NODE_RESULTS).map((node) => ({ kind: "node", node }));
}

export default function NodeQuestionSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [questionResults, setQuestionResults] = useState<QuestionSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Debounced server-side question search ─────────────────
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setQuestionResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await actionSearchBankQuestions(trimmed);
        setQuestionResults(r);
      } catch (err) {
        console.error("[search] action failed:", err);
        setQuestionResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // ── Combined ordered list (nodes first, then questions) ───
  const nodeResults = useMemo(() => searchNodes(query), [query]);
  const results: Result[] = useMemo(
    () => [
      ...nodeResults,
      ...questionResults.map<QuestionResult>((q) => ({ kind: "question", q })),
    ],
    [nodeResults, questionResults]
  );

  // Reset highlight when results change.
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  // Auto-open when there's any text; close when empty.
  useEffect(() => {
    setOpen(query.trim().length >= 2);
  }, [query]);

  // ── Click-outside to close ────────────────────────────────
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function navigateTo(r: Result) {
    if (r.kind === "node") {
      router.push(`/admin/curriculum/${r.node.id}`);
    } else if (r.q.location === "node" && r.q.node_id) {
      router.push(`/admin/curriculum/${r.q.node_id}?q=${r.q.id}`);
    } else {
      router.push(`/admin/questions/review?tab=bank&q=${r.q.id}`);
    }
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (query) {
        setQuery("");
      } else {
        inputRef.current?.blur();
      }
      setOpen(false);
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) navigateTo(r);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-lg border border-bronze bg-surface px-3 py-1.5 transition-colors focus-within:border-gold/60 focus-within:bg-surface/90">
        <Search className="h-3.5 w-3.5 shrink-0 text-taupe" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(query.trim().length >= 2)}
          onKeyDown={onKeyDown}
          placeholder="Search nodes, questions, slugs…"
          className="flex-1 bg-transparent text-sm text-ivory placeholder:text-taupe focus:outline-none"
          aria-label="Search nodes and questions"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="text-taupe hover:text-ivory"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-[28rem] max-w-[90vw] overflow-hidden rounded-lg border border-bronze bg-night/95 shadow-xl shadow-black/50 backdrop-blur-sm">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-taupe">
              {loading ? "Searching…" : `No results for "${query.trim()}".`}
            </div>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-bronze/60 overflow-y-auto">
              {nodeResults.length > 0 && (
                <li className="bg-surface/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-taupe">
                  Nodes ({nodeResults.length})
                </li>
              )}
              {nodeResults.map((r, i) => (
                <ResultRow
                  key={`node-${r.node.id}`}
                  active={activeIndex === i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => navigateTo(r)}
                  icon={<GraduationCap className="h-3.5 w-3.5 text-gold" />}
                  primary={r.node.topic}
                  secondary={`${r.node.id} · ${r.node.concept_slug}`}
                  tertiary={r.node.description}
                />
              ))}
              {questionResults.length > 0 && (
                <li className="bg-surface/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-taupe">
                  Questions ({questionResults.length})
                </li>
              )}
              {questionResults.map((q, i) => {
                const idx = nodeResults.length + i;
                const isBank = q.location === "bank";
                return (
                  <ResultRow
                    key={`q-${q.id}`}
                    active={activeIndex === idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => navigateTo({ kind: "question", q })}
                    icon={
                      isBank ? (
                        <Inbox className="h-3.5 w-3.5 text-warning" />
                      ) : (
                        <FileQuestion className="h-3.5 w-3.5 text-success" />
                      )
                    }
                    primary={
                      q.question_text.slice(0, 100) + (q.question_text.length > 100 ? "…" : "")
                    }
                    secondary={[
                      q.concept_slug,
                      q.source_pdf
                        ? `${q.source_pdf}${q.source_page ? `:${q.source_page}` : ""}`
                        : null,
                      isBank ? "in bank" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                );
              })}
            </ul>
          )}
          <div className="flex items-center gap-3 border-t border-bronze/60 px-3 py-1.5 text-[10px] text-taupe">
            <kbd className="text-taupe">↑↓</kbd> navigate
            <kbd className="text-taupe">↵</kbd> open
            <kbd className="text-taupe">esc</kbd> close
            {loading && <span className="ml-auto text-gold">searching…</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultRow({
  active,
  onMouseEnter,
  onClick,
  icon,
  primary,
  secondary,
  tertiary,
}: {
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  tertiary?: string;
}) {
  return (
    <li
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-start gap-2 px-3 py-2 text-sm",
        active ? "bg-gold/10" : "hover:bg-surface-raised/60"
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <div className="truncate text-ivory">{primary}</div>
        {secondary && <div className="truncate font-mono text-[11px] text-taupe">{secondary}</div>}
        {tertiary && <div className="truncate text-[11px] text-taupe">{tertiary}</div>}
      </span>
    </li>
  );
}
