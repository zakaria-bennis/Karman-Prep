// What the student's settings do outside the Settings page: the portal's sounds and their volume,
// night music (on, off, the piece, its volume, and starting by itself at the hour chosen), Reduce
// motion, and, for a signed-in student, saving each change with their account.
import { useEffect } from "react";
import { setStillChosen, stillChosen } from "@/lib/painting/motion";
import { actionSavePrefs } from "@/lib/portal/settings-actions";
import { playMusic, setMusicVolume, stopMusic } from "./music";
import { usePortalData } from "./portalData";
import { flushSettings, saveSettingsWith, setSetting, type Settings } from "./settingsStore";
import { setSound, setSoundKinds, setSoundVolume } from "./sound";

const STARTED = "kp-music-night";

export function useSettingsEffects(s: Settings) {
  const real = usePortalData() !== null;

  // a signed-in student's changes go to their account, and whatever is waiting is sent when the page
  // is hidden or left
  useEffect(() => {
    if (!real) return;
    saveSettingsWith((patch) => actionSavePrefs({ patch }));
    const hidden = () => document.visibilityState === "hidden" && flushSettings();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", flushSettings);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", flushSettings);
      saveSettingsWith(null);
    };
  }, [real]);

  // Reduce motion is the site's own switch, kept on this device: the account's choice is put on it
  // when the portal opens here
  useEffect(() => {
    if (stillChosen() !== s.still) setStillChosen(s.still);
  }, [s.still]);

  useEffect(() => setSound(s.sounds), [s.sounds]);
  useEffect(
    () => setSoundKinds({ keys: s.soundKeys, rewards: s.soundRewards }),
    [s.soundKeys, s.soundRewards]
  );
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
