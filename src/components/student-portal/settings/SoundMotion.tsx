"use client";

/*
 * Settings, Sound and motion. Three switches, each remembered on this device:
 * - Background music: the portal theme (src/lib/audio/theme-music.ts), on by default. The click
 *   is the gesture browsers need, so it starts or stops the music at once.
 * - Quiz sounds: the quiz's reward jingles (src/lib/quiz/reward-sound.ts), on by default.
 *   Left out for parents (`quizSounds={false}`), who never take a quiz.
 * - Reduce motion: holds the painting still and turns off the shell's springs and slides
 *   (src/lib/painting/motion.ts). Locked on when the device already asks for less motion.
 */
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import {
  readThemeMusicPref,
  setThemeMusicPref,
  startThemeMusic,
  stopThemeMusic,
  subscribeThemeMusic,
} from "@/lib/audio/theme-music";
import { quizSoundsEnabled, setQuizSounds, subscribeQuizSounds } from "@/lib/quiz/reward-sound";
import { MOTION_KEY, setStillChosen, stillChosen } from "@/lib/painting/motion";
import s from "./settings.module.css";

function Switch({
  label,
  sub,
  on,
  onChange,
  disabled = false,
}: {
  label: string;
  sub?: string;
  on: boolean;
  onChange: (on: boolean) => void;
  /** Locked, for example when the device already asks for less motion. */
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={s.switchRow}>
      <span>
        <b id={`${id}-l`}>{label}</b>
        {sub && <small id={`${id}-s`}>{sub}</small>}
      </span>
      <button
        type="button"
        role="switch"
        className={s.switch}
        aria-checked={on}
        aria-labelledby={`${id}-l`}
        aria-describedby={sub ? `${id}-s` : undefined}
        disabled={disabled}
        onClick={() => onChange(!on)}
      />
    </div>
  );
}

export default function SoundMotion({ quizSounds = true }: { quizSounds?: boolean }) {
  const music = useSyncExternalStore(subscribeThemeMusic, readThemeMusicPref, () => true);
  const quiz = useSyncExternalStore(subscribeQuizSounds, quizSoundsEnabled, () => true);
  const [still, setStill] = useState(false);
  const [deviceCalm, setDeviceCalm] = useState(false);

  useEffect(() => {
    setStill(stillChosen());
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    setDeviceCalm(media.matches);
    const onMedia = () => setDeviceCalm(media.matches);
    const onStorage = (e: StorageEvent) => {
      if (e.key === MOTION_KEY) setStill(stillChosen());
    };
    media.addEventListener("change", onMedia);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onMedia);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function changeMusic(next: boolean) {
    if (next) startThemeMusic();
    else stopThemeMusic();
    setThemeMusicPref(next);
  }

  function changeMotion(next: boolean) {
    setStill(next);
    setStillChosen(next);
  }

  return (
    <div>
      <Switch
        label="Background music"
        sub="A soft Karman theme, very quiet. Remembered on this device."
        on={music}
        onChange={changeMusic}
      />
      {quizSounds && (
        <Switch
          label="Quiz sounds"
          sub="A short chime for right answers and new levels."
          on={quiz}
          onChange={setQuizSounds}
        />
      )}
      <Switch
        label="Reduce motion"
        sub={
          deviceCalm
            ? "Your device already asks for less motion, so this is on."
            : "Holds the painting still and turns off slides and springs."
        }
        on={still || deviceCalm}
        disabled={deviceCalm}
        onChange={changeMotion}
      />
    </div>
  );
}
