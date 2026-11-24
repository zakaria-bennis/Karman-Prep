"use client";

// The note you write after clicking an element in Comment mode (or on the whole page).
import { useEffect, useRef, useState } from "react";
import type { NoteCategory } from "@/lib/page-studio/schemas";
import type { Box } from "./devices";
import styles from "./studio.module.css";

const KINDS: { id: NoteCategory; label: string; hint: string }[] = [
  { id: "visual", label: "Looks", hint: "Size, colour, spacing, motion" },
  { id: "functional", label: "How it works", hint: "What a click does, what opens" },
  { id: "copy", label: "Words", hint: "What it says" },
  { id: "other", label: "Other", hint: "Anything else" },
];

interface Props {
  label: string;
  /** Where the element is on screen; null for a note on the whole page. */
  box: Box | null;
  room: { w: number; h: number };
  saving: boolean;
  onSave: (category: NoteCategory, body: string) => void;
  onCancel: () => void;
}

const WIDTH = 300;

export default function NoteComposer({ label, box, room, saving, onSave, onCancel }: Props) {
  const [category, setCategory] = useState<NoteCategory>("visual");
  const [body, setBody] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => input.current?.focus(), []);

  // Below the element when there is room, else above it; always inside the frame.
  const left = box
    ? Math.min(Math.max(8, box.x), Math.max(8, room.w - WIDTH - 8))
    : (room.w - WIDTH) / 2;
  const below = box ? box.y + box.h + 8 : room.h / 3;
  const top =
    box && below + 230 > room.h ? Math.max(8, box.y - 238) : Math.min(below, room.h - 238);

  const save = () => body.trim() && !saving && onSave(category, body.trim());

  return (
    <div
      className={styles.composer}
      style={{ left, top: Math.max(8, top), width: Math.min(WIDTH, room.w - 16) }}
      role="dialog"
      aria-label="New note"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
      }}
    >
      <p className={styles.composerWhere}>{label}</p>
      <div className={styles.chips} role="radiogroup" aria-label="What kind of note">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={category === k.id}
            title={k.hint}
            className={category === k.id ? styles.chipOn : styles.chip}
            onClick={() => setCategory(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>
      <textarea
        ref={input}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="What should change?"
        aria-label="Note"
      />
      <div className={styles.composerActions}>
        <button type="button" className={styles.ghost} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.primary}
          disabled={!body.trim() || saving}
          onClick={save}
        >
          Save note
        </button>
      </div>
    </div>
  );
}
