"use client";

// Every page of the site, by area, with your verdict and how many open notes each has.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleAlert, Search, X } from "lucide-react";
import { AREAS, STUDIO_PAGES, type StudioPage } from "@/lib/page-studio/inventory";
import type { PageMark } from "@/lib/page-studio/types";
import styles from "./studio.module.css";

type Filter = "all" | "unreviewed" | "needs_work" | "notes";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unreviewed", label: "Not reviewed" },
  { id: "needs_work", label: "Needs work" },
  { id: "notes", label: "Has notes" },
];

interface Props {
  currentId: string | null;
  marks: Record<string, PageMark>;
  openNotes: Record<string, number>;
  onOpen: (page: StudioPage) => void;
  onClose?: () => void;
}

export default function PageList({ currentId, marks, openNotes, onOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const body = useRef<HTMLDivElement>(null);

  // Keep the open page in sight as you flip.
  useEffect(() => {
    body.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [currentId]);

  const reviewable = STUDIO_PAGES.filter((p) => !p.redirects);
  const reviewed = reviewable.filter((p) => marks[p.id]).length;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AREAS.map((area) => ({
      area,
      pages: STUDIO_PAGES.filter((p) => {
        if (p.area !== area.id) return false;
        if (q && !`${p.title} ${p.path}`.toLowerCase().includes(q)) return false;
        if (filter === "unreviewed") return !p.redirects && !marks[p.id];
        if (filter === "needs_work") return marks[p.id] === "needs_work";
        if (filter === "notes") return (openNotes[p.id] ?? 0) > 0;
        return true;
      }),
    })).filter((g) => g.pages.length);
  }, [query, filter, marks, openNotes]);

  return (
    <nav className={styles.pageList} aria-label="Pages">
      <div className={styles.listHead}>
        <div className={styles.listTitle}>
          <strong>Pages</strong>
          <span>
            {reviewed} of {reviewable.length} reviewed
          </span>
          {onClose && (
            <button
              type="button"
              className={`${styles.iconButton} ${styles.closeNarrow}`}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className={styles.progress} aria-hidden>
          <div style={{ width: `${(reviewed / reviewable.length) * 100}%` }} />
        </div>
        <label className={styles.search}>
          <Search size={14} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a page"
            aria-label="Find a page"
          />
        </label>
        <div className={styles.chips} role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={filter === f.id ? styles.chipOn : styles.chip}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={body} className={styles.listBody}>
        {groups.map(({ area, pages }) => (
          <section key={area.id}>
            <h3 className={styles.areaTitle}>{area.label}</h3>
            <ul>
              {pages.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`${styles.pageRow} ${p.id === currentId ? styles.pageRowOn : ""} ${
                      p.redirects ? styles.pageRowDim : ""
                    }`}
                    onClick={() => onOpen(p)}
                    aria-current={p.id === currentId ? "page" : undefined}
                  >
                    <span className={styles.pageName}>
                      {p.title}
                      <small>{p.redirects ? `Old address, goes to ${p.redirects}` : p.path}</small>
                    </span>
                    {(openNotes[p.id] ?? 0) > 0 && (
                      <span className={styles.count} aria-label={`${openNotes[p.id]} open notes`}>
                        {openNotes[p.id]}
                      </span>
                    )}
                    {marks[p.id] === "good" && (
                      <Check size={15} className={styles.good} aria-label="Good" />
                    )}
                    {marks[p.id] === "needs_work" && (
                      <CircleAlert size={15} className={styles.needsWork} aria-label="Needs work" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length && <p className={styles.empty}>No pages match.</p>}
      </div>
    </nav>
  );
}
