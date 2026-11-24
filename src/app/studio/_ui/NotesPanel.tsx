"use client";

// Your notes: on this page or everywhere, what Claude asked, and the button that sends them on.
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  RotateCcw,
  Send,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { pageById } from "@/lib/page-studio/inventory";
import type { NoteStatus } from "@/lib/page-studio/schemas";
import type { StudioNote } from "@/lib/page-studio/types";
import styles from "./studio.module.css";

const STATUS: Record<NoteStatus, { label: string; tone: string }> = {
  draft: { label: "Not sent", tone: styles.toneDraft },
  sent: { label: "With Claude", tone: styles.toneSent },
  question: { label: "Claude asked", tone: styles.toneQuestion },
  working: { label: "Claude is on it", tone: styles.toneSent },
  in_pr: { label: "In a pull request", tone: styles.toneSent },
  done: { label: "Done", tone: styles.toneDone },
  dismissed: { label: "Dropped", tone: styles.toneDraft },
};

const CATEGORY: Record<string, string> = {
  visual: "Looks",
  functional: "How it works",
  copy: "Words",
  other: "Note",
};

interface Props {
  notes: StudioNote[];
  currentPageId: string | null;
  activeId: string | null;
  busy: boolean;
  onFocus: (note: StudioNote) => void;
  onDelete: (note: StudioNote) => void;
  onStatus: (note: StudioNote, status: "done" | "dismissed" | "sent") => void;
  onReply: (note: StudioNote, body: string) => Promise<boolean>;
  onSend: () => void;
  onCopyBrief: () => void;
  onCommentPage: () => void;
  onClose?: () => void;
}

export default function NotesPanel(p: Props) {
  const [scope, setScope] = useState<"page" | "all">("page");
  const drafts = p.notes.filter((n) => n.status === "draft").length;
  const questions = p.notes.filter((n) => n.status === "question").length;

  const shown = useMemo(() => {
    const list = scope === "page" ? p.notes.filter((n) => n.pageKey === p.currentPageId) : p.notes;
    // Claude's questions first, then newest.
    return [...list].sort(
      (a, b) =>
        Number(b.status === "question") - Number(a.status === "question") ||
        b.createdAt.localeCompare(a.createdAt)
    );
  }, [p.notes, p.currentPageId, scope]);

  const pageNotes = p.notes.filter((n) => n.pageKey === p.currentPageId);

  return (
    <aside className={styles.notes} aria-label="Notes">
      <div className={styles.notesHead}>
        <div className={styles.listTitle}>
          <strong>Notes</strong>
          {questions > 0 && <span className={styles.toneQuestion}>{questions} from Claude</span>}
          {p.onClose && (
            <button
              type="button"
              className={`${styles.iconButton} ${styles.closeNarrow}`}
              onClick={p.onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className={styles.chips} role="group" aria-label="Show notes">
          <button
            type="button"
            className={scope === "page" ? styles.chipOn : styles.chip}
            onClick={() => setScope("page")}
          >
            This page ({pageNotes.length})
          </button>
          <button
            type="button"
            className={scope === "all" ? styles.chipOn : styles.chip}
            onClick={() => setScope("all")}
          >
            All ({p.notes.length})
          </button>
        </div>
      </div>

      <div className={styles.notesBody}>
        {scope === "page" && (
          <button type="button" className={styles.ghost} onClick={p.onCommentPage}>
            <MessageSquare size={14} aria-hidden /> Note on the whole page
          </button>
        )}
        {!shown.length && (
          <p className={styles.empty}>
            {scope === "page"
              ? "No notes here yet. Pick Comment or Edit words above, then click the page."
              : "No notes yet."}
          </p>
        )}
        {shown.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            showPage={scope === "all"}
            active={p.activeId === n.id}
            onFocus={() => p.onFocus(n)}
            onDelete={() => p.onDelete(n)}
            onStatus={(s) => p.onStatus(n, s)}
            onReply={(body) => p.onReply(n, body)}
          />
        ))}
      </div>

      <div className={styles.notesFoot}>
        <button
          type="button"
          className={styles.primary}
          disabled={!drafts || p.busy}
          onClick={p.onSend}
        >
          <Send size={14} aria-hidden />
          {drafts ? `Send ${drafts} to Claude` : "Nothing new to send"}
        </button>
        <button type="button" className={styles.ghost} onClick={p.onCopyBrief} disabled={p.busy}>
          <Copy size={14} aria-hidden /> Copy for Claude
        </button>
      </div>
    </aside>
  );
}

function NoteCard({
  note: n,
  showPage,
  active,
  onFocus,
  onDelete,
  onStatus,
  onReply,
}: {
  note: StudioNote;
  showPage: boolean;
  active: boolean;
  onFocus: () => void;
  onDelete: () => void;
  onStatus: (s: "done" | "dismissed" | "sent") => void;
  onReply: (body: string) => Promise<boolean>;
}) {
  const [reply, setReply] = useState("");
  const status = STATUS[n.status];
  const page = pageById(n.pageKey);
  const closed = n.status === "done" || n.status === "dismissed";

  return (
    <article className={`${styles.card} ${active ? styles.cardOn : ""}`}>
      <button type="button" className={styles.cardMain} onClick={onFocus}>
        <span className={styles.cardTop}>
          {n.kind === "copy" ? (
            <Type size={13} aria-hidden />
          ) : (
            <MessageSquare size={13} aria-hidden />
          )}
          <span>{n.kind === "copy" ? "Words" : CATEGORY[n.category]}</span>
          <span className={`${styles.status} ${status.tone}`}>{status.label}</span>
        </span>
        {showPage && <span className={styles.cardPage}>{page?.title ?? n.pageKey}</span>}
        <span className={styles.cardWhere}>{n.elementLabel || "Whole page"}</span>
        {n.kind === "copy" ? (
          <span className={styles.diff}>
            <del>{n.oldText}</del>
            <ArrowRight size={12} aria-hidden />
            <ins>{n.newText}</ins>
          </span>
        ) : (
          <span className={styles.cardBody}>{n.body}</span>
        )}
        {n.kind === "copy" && n.body && <span className={styles.cardBody}>{n.body}</span>}
      </button>

      {n.messages.length > 0 && (
        <ul className={styles.thread}>
          {n.messages.map((m) => (
            <li key={m.id} className={m.author === "claude" ? styles.fromClaude : styles.fromYou}>
              <strong>{m.author === "claude" ? "Claude" : "You"}</strong> {m.body}
            </li>
          ))}
        </ul>
      )}

      {n.status === "question" && (
        <form
          className={styles.replyForm}
          onSubmit={async (e) => {
            e.preventDefault();
            if (reply.trim() && (await onReply(reply.trim()))) setReply("");
          }}
        >
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Answer Claude"
            rows={2}
            aria-label="Answer Claude"
          />
          <button type="submit" className={styles.primary} disabled={!reply.trim()}>
            Answer
          </button>
        </form>
      )}

      <div className={styles.cardActions}>
        {n.prUrl && (
          <a href={n.prUrl} target="_blank" rel="noreferrer" className={styles.ghost}>
            <ExternalLink size={13} aria-hidden /> Pull request
          </a>
        )}
        {!closed && n.status !== "draft" && (
          <button type="button" className={styles.ghost} onClick={() => onStatus("done")}>
            <Check size={13} aria-hidden /> Done
          </button>
        )}
        {closed && (
          <button type="button" className={styles.ghost} onClick={() => onStatus("sent")}>
            <RotateCcw size={13} aria-hidden /> Reopen
          </button>
        )}
        {!closed && (
          <button type="button" className={styles.ghost} onClick={onDelete}>
            <Trash2 size={13} aria-hidden /> {n.status === "draft" ? "Delete" : "Drop"}
          </button>
        )}
      </div>
    </article>
  );
}
