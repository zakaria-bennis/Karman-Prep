// What the student's settings do outside the Settings page: the portal's sounds and their volume,
// and night music (on, off, the piece, its volume, and starting by itself at the hour chosen).
import { useEffect } from "react";
import { playMusic, setMusicVolume, stopMusic } from "./music";
import { setSetting, type Settings } from "./settingsStore";
import { setSound, setSoundVolume } from "./sound";

const STARTED = "kp-music-night";

export function useSettingsEffects(s: Settings) {
  useEffect(() => setSound(s.sounds), [s.sounds]);
  useEffect(() => setSoundVolume(s.soundVolume), [s.soundVolume]);

  useEffect(() => {
    if (!s.music) return stopMusic();
    playMusic(s.track, s.musicVolume);
    // a browser lets a page play only after a press, so try again at the next one
    const again = () => playMusic(s.track, s.musicVolume);
    window.addEventListener("pointerdown", again, { once: true });
    return () => window.removeEventListener("pointerdown", again);
    // the volume has its own effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.music, s.track]);
  useEffect(() => setMusicVolume(s.musicVolume), [s.musicVolume]);

  // starting by itself: once a night, at the chosen time or the first look at the portal after it
  useEffect(() => {
    if (!s.musicAuto || s.music) return;
    const look = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const night = now.toDateString();
      if (minutes < 720 + s.musicAt) return;
      try {
        if (window.localStorage.getItem(STARTED) === night) return;
        window.localStorage.setItem(STARTED, night);
      } catch {
        return;
      }
      setSetting("music", true);
    };
    look();
    const timer = window.setInterval(look, 30_000);
    return () => window.clearInterval(timer);
  }, [s.musicAuto, s.musicAt, s.music]);
}
