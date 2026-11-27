"use client";

// The studio's top bar: which page, the next and previous ones, how you're using it (Use, Comment,
// Edit words), screen size, who you're viewing the site as, and your verdict on the page.
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutList,
  Laptop,
  Monitor,
  NotebookPen,
  RotateCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import type { Viewport } from "@/lib/page-studio/schemas";
import type { StudioAccount, PageMark, ViewingAs } from "@/lib/page-studio/types";
import { DEVICES, MODES, type Mode } from "./devices";
import styles from "./studio.module.css";

const DEVICE_ICON: Record<Viewport, typeof Monitor> = {
  desktop: Monitor,
  laptop: Laptop,
  tablet: Tablet,
  phone: Smartphone,
};

const ROLE_GROUPS: { role: StudioAccount["role"]; label: string }[] = [
  { role: "student", label: "Students" },
  { role: "parent", label: "Parents" },
  { role: "tutor", label: "Tutors and teachers" },
  { role: "affiliate_tutor", label: "Affiliate tutors" },
];

export function viewValue(v: ViewingAs | null): string {
  if (!v) return "self";
  return v.userId ? `user:${v.userId}` : `role:${v.role}`;
}

interface Props {
  title: string;
  path: string;
  hint?: string;
  mode: Mode;
  onMode: (m: Mode) => void;
  viewport: Viewport;
  onViewport: (v: Viewport) => void;
  viewing: ViewingAs | null;
  accounts: StudioAccount[];
  onViewAs: (value: string) => void;
  matchPage: boolean;
  onMatchPage: (on: boolean) => void;
  showEdits: boolean;
  onShowEdits: (on: boolean) => void;
  mark: PageMark | undefined;
  onMark: (m: PageMark) => void;
  canMark: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReload: () => void;
  openHref: string;
  onPages: () => void;
  onNotes: () => void;
  noteCount: number;
  busy: boolean;
}

export default function Toolbar(p: Props) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.toolRow}>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.onlyNarrow}`}
          onClick={p.onPages}
          aria-label="Pages"
        >
          <LayoutList size={18} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={p.onPrev}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={18} />
        </button>
        <div className={styles.where}>
          <strong>{p.title}</strong>
          <span title={p.hint}>{p.path}</span>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={p.onNext}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={p.onReload}
          aria-label="Reload and replay"
          title="Reload (replays the page's motion)"
        >
          <RotateCw size={16} />
        </button>
        <a
          className={styles.iconButton}
          href={p.openHref}
          target="_blank"
          rel="noreferrer"
          aria-label="Open in a new tab"
          title="Open in a new tab"
        >
          <ExternalLink size={16} />
        </a>
        <div className={styles.markGroup} role="group" aria-label="Your verdict on this page">
          <button
            type="button"
            disabled={!p.canMark}
            className={p.mark === "good" ? styles.markGood : styles.markOff}
            onClick={() => p.onMark("good")}
            aria-pressed={p.mark === "good"}
          >
            <Check size={14} aria-hidden /> Good
          </button>
          <button
            type="button"
            disabled={!p.canMark}
            className={p.mark === "needs_work" ? styles.markBad : styles.markOff}
            onClick={() => p.onMark("needs_work")}
            aria-pressed={p.mark === "needs_work"}
          >
            <CircleAlert size={14} aria-hidden /> Needs work
          </button>
        </div>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.onlyMid}`}
          onClick={p.onNotes}
          aria-label="Notes"
        >
          <NotebookPen size={17} />
          {p.noteCount > 0 && <span className={styles.badge}>{p.noteCount}</span>}
        </button>
      </div>

      <div className={styles.toolRow}>
        <div className={styles.segmented} role="radiogroup" aria-label="Mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={p.mode === m.id}
              title={`${m.hint} (${m.key.toUpperCase()})`}
              className={p.mode === m.id ? styles.segOn : styles.seg}
              onClick={() => p.onMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className={styles.segmented} role="radiogroup" aria-label="Screen size">
          {(Object.keys(DEVICES) as Viewport[]).map((v) => {
            const Icon = DEVICE_ICON[v];
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={p.viewport === v}
                aria-label={DEVICES[v].label}
                title={`${DEVICES[v].label} (${DEVICES[v].width}px)`}
                className={p.viewport === v ? styles.segOn : styles.seg}
                onClick={() => p.onViewport(v)}
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>

        <label className={styles.viewAs}>
          <span>View as</span>
          <select
            value={viewValue(p.viewing)}
            onChange={(e) => p.onViewAs(e.target.value)}
            disabled={p.busy}
          >
            <option value="self">Yourself (admin)</option>
            <optgroup label="A role, no account">
              <option value="role:student">Any student (empty)</option>
              <option value="role:parent">Any parent (empty)</option>
              <option value="role:tutor">Any tutor (empty)</option>
            </optgroup>
            {ROLE_GROUPS.map((g) => {
              const list = p.accounts.filter((a) => a.role === g.role);
              if (!list.length) return null;
              return (
                <optgroup key={g.role} label={g.label}>
                  {list.map((a) => (
                    <option key={a.userId} value={`user:${a.userId}`}>
                      {a.name}
                      {a.sample ? " (sample)" : ""}
                      {a.detail ? `, ${a.detail}` : ""}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </label>
        <label
          className={styles.toggle}
          title="Switch to a student, parent or tutor account to match each page you open"
        >
          <input
            type="checkbox"
            checked={p.matchPage}
            onChange={(e) => p.onMatchPage(e.target.checked)}
          />
          Match each page
        </label>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => p.onShowEdits(!p.showEdits)}
          aria-pressed={p.showEdits}
          title="Show your copy edits on the page, or the words as they are now"
        >
          {p.showEdits ? <Eye size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
          {p.showEdits ? "Showing my edits" : "Showing the live words"}
        </button>
      </div>
    </header>
  );
}
