"use client";

// ============================================================
// useKeyboardShortcuts — minimal keyboard-shortcut registrar
// for the preview page. Listens at the window level. Ignores
// keystrokes while focus is inside an input/textarea/contentEditable
// so the inline-edit textareas (phase 3) keep behaving normally.
//
// Modifier handling:
//   · `Shift` is a SECONDARY modifier we use for device-frame
//     toggles. Shortcuts that DON'T require Shift will skip
//     firing if Shift is pressed alone (so Shift+M isn't
//     accidentally treated as M).
//   · Cmd/Ctrl/Alt-modified keystrokes are skipped entirely
//     (don't shadow browser shortcuts like Cmd+S).
//
// Convention for the `key` field:
//   · Single character (case-insensitive): "a", "1", "?"
//   · Special: "ArrowLeft", "ArrowRight", "Escape"
//   · Shift-modified: prefix with "Shift+" (e.g. "Shift+M")
// ============================================================

import { useEffect } from "react";

export interface Shortcut {
  /** Key to match. See module header for format. */
  key: string;
  /** Action when fired. */
  handler: () => void;
  /** Human-readable description for the cheat sheet. */
  description: string;
  /** Group label for cheat-sheet sectioning. */
  group: "Navigation" | "Actions" | "Panels" | "View" | "Help";
  /** If true, skip even when an input/textarea has focus. Defaults
   *  to false. Use sparingly — Escape is the main legitimate case. */
  fireInInputs?: boolean;
}

function isTypingInInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function matches(shortcut: Shortcut, e: KeyboardEvent): boolean {
  // Skip if any "hard" modifier is pressed — these belong to the
  // browser / OS / other handlers.
  if (e.metaKey || e.ctrlKey || e.altKey) return false;

  const want = shortcut.key;
  const wantsShift = want.startsWith("Shift+");
  const wantKey = wantsShift ? want.slice("Shift+".length) : want;

  // Shift must match exactly: a shortcut that doesn't ask for Shift
  // bails when Shift is held, so that e.g. typing 'A' (Shift+a) into
  // an input doesn't fire the Approve shortcut.
  if (wantsShift !== e.shiftKey) return false;

  // Special keys: match by `e.key` directly (case-sensitive for
  // ArrowLeft / Escape / etc.).
  if (wantKey.length > 1) {
    return e.key === wantKey;
  }
  // Single-char: match case-insensitively against e.key.
  return e.key.toLowerCase() === wantKey.toLowerCase();
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      const typing = isTypingInInput(e.target);
      for (const s of shortcuts) {
        if (typing && !s.fireInInputs) continue;
        if (matches(s, e)) {
          e.preventDefault();
          s.handler();
          return; // first match wins
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts, enabled]);
}
