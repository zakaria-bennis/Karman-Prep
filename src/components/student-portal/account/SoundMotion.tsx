"use client";

/*
 * Sound and motion. Sound effects use the app-wide switch (src/lib/sound-preference.ts), which is
 * off at the start of every visit by design. Quiz sounds are the quiz's reward jingles
 * (src/lib/quiz/reward-sound.ts), remembered on this device. "Keep the painting still" is stored
 * on this device under MOTION_KEY; the painting reads it.
 */
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { quizSoundsEnabled, setQuizSounds, subscribeQuizSounds } from "@/lib/quiz/reward-sound";
import { setSoundEnabled, soundEnabled, subscribeSoundPreference } from "@/lib/sound-preference";
import { MOTION_EVENT, MOTION_KEY, stillChosen } from "@/lib/painting/motion";
import s from "./account.module.css";

const readMotion = stillChosen;

function Switch({
  label,
  sub,
  on,
  onChange,
}: {
  label: string;
  sub?: string;
  on: boolean;
  onChange: (on: boolean) => void;
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
        onClick={() => onChange(!on)}
      />
    </div>
  );
}

export default function SoundMotion() {
  const sound = useSyncExternalStore(subscribeSoundPreference, soundEnabled, () => false);
  const quiz = useSyncExternalStore(subscribeQuizSounds, quizSoundsEnabled, () => true);
  const [still, setStill] = useState(false);
  const [deviceCalm, setDeviceCalm] = useState(false);

  useEffect(() => {
    setStill(readMotion());
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    setDeviceCalm(media.matches);
    const onMedia = () => setDeviceCalm(media.matches);
    const onStorage = (e: StorageEvent) => {
      if (e.key === MOTION_KEY) setStill(readMotion());
    };
    media.addEventListener("change", onMedia);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onMedia);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function changeMotion(next: boolean) {
    setStill(next);
    try {
      if (next) localStorage.setItem(MOTION_KEY, "still");
      else localStorage.removeItem(MOTION_KEY);
    } catch {
      /* Storage blocked: the choice lasts for this page only. */
    }
    window.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: next ? "still" : "move" }));
  }

  return (
    <div>
      <Switch
        label="Sound effects"
        sub="Turns off again each time you open Karman."
        on={sound}
        onChange={setSoundEnabled}
      />
      <Switch label="Quiz sounds" on={quiz} onChange={setQuizSounds} />
      <Switch
        label="Keep the painting still"
        sub={
          deviceCalm ? "Your device asks for less motion, so it already holds still." : undefined
        }
        on={still || deviceCalm}
        onChange={changeMotion}
      />
    </div>
  );
}
