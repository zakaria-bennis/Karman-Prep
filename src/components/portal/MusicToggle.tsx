"use client";

/*
 * The Background music switch. Its click is the user gesture browsers need, so it starts or
 * stops the theme right away, then stores and broadcasts the choice (MUSIC_EVENT) so the shell's
 * ThemeMusic stays in step. Styled to match the other rows in Sound and motion.
 */
import { useId, useSyncExternalStore } from "react";
import {
  MUSIC_EVENT,
  MUSIC_KEY,
  readThemeMusicPref,
  setThemeMusicPref,
  startThemeMusic,
  stopThemeMusic,
} from "@/lib/audio/theme-music";

function subscribe(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === MUSIC_KEY) listener();
  };
  window.addEventListener(MUSIC_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(MUSIC_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export default function MusicToggle() {
  const on = useSyncExternalStore(subscribe, readThemeMusicPref, () => false);
  const id = useId();

  function toggle() {
    const next = !on;
    if (next) startThemeMusic();
    else stopThemeMusic();
    setThemeMusicPref(next);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        minHeight: 58,
        padding: "9px 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      <span>
        <b id={`${id}-l`} style={{ display: "block", fontWeight: 600, color: "var(--ink)" }}>
          Background music
        </b>
        <small
          id={`${id}-s`}
          style={{ display: "block", color: "var(--mute)", fontSize: 14, lineHeight: "20px" }}
        >
          A soft Karman theme, quietly in the background.
        </small>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-l`}
        aria-describedby={`${id}-s`}
        onClick={toggle}
        style={{
          position: "relative",
          flex: "none",
          width: 52,
          height: 44,
          padding: 0,
          border: 0,
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 6,
            width: 52,
            height: 32,
            boxSizing: "border-box",
            border: on ? "1px solid transparent" : "1px solid var(--line)",
            borderRadius: 16,
            background: on ? "var(--accent)" : "color-mix(in srgb, var(--ink) 14%, transparent)",
            transition: "background 0.2s",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: 3,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: on ? "var(--accent-ink)" : "var(--ink)",
              transform: on ? "translateX(20px)" : "none",
              transition: "transform 0.25s cubic-bezier(0.2, 1.2, 0.4, 1)",
            }}
          />
        </span>
      </button>
    </div>
  );
}
