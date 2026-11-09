"use client";

/*
 * Wires the Background music choice to the theme engine (src/lib/audio/theme-music.ts).
 * Renders nothing. Music is on unless switched off in Settings; it starts on the first pointer or
 * key press of the page (browsers block sound before a gesture), never before. It follows the
 * Background music switch through MUSIC_EVENT, other tabs through the storage event, and holds
 * the music while the tab is hidden.
 */
import { useEffect } from "react";
import {
  MUSIC_EVENT,
  MUSIC_KEY,
  pauseThemeMusic,
  readThemeMusicPref,
  resumeThemeMusic,
  startThemeMusic,
  stopThemeMusic,
} from "@/lib/audio/theme-music";

const GESTURES = ["pointerdown", "keydown"] as const;

export default function ThemeMusic() {
  useEffect(() => {
    let armed = false;

    const onGesture = () => {
      disarm();
      if (readThemeMusicPref() && document.visibilityState === "visible") startThemeMusic();
    };
    function arm() {
      if (armed) return;
      armed = true;
      for (const t of GESTURES) window.addEventListener(t, onGesture, { capture: true });
    }
    function disarm() {
      if (!armed) return;
      armed = false;
      for (const t of GESTURES) window.removeEventListener(t, onGesture, { capture: true });
    }

    const onChange = (e: Event) => {
      // The Background music switch already started or stopped the engine on its own click;
      // both calls are safe to repeat.
      if ((e as CustomEvent<string>).detail === "on") {
        disarm();
        startThemeMusic();
      } else {
        disarm();
        stopThemeMusic();
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== MUSIC_KEY) return;
      // Another tab changed it: no gesture here yet, so wait for one before playing.
      if (readThemeMusicPref()) arm();
      else {
        disarm();
        stopThemeMusic();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") pauseThemeMusic();
      else resumeThemeMusic();
    };

    if (readThemeMusicPref()) arm();
    window.addEventListener(MUSIC_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disarm();
      window.removeEventListener(MUSIC_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      stopThemeMusic();
    };
  }, []);

  return null;
}
