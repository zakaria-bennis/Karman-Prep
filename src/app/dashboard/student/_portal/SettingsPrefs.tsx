"use client";

// Settings, the Preferences set: Display, Sounds and music, Quizzes and calculator, Notifications.
// Every choice here is kept with a signed-in student's account (settingsStore.ts saves it once the
// student stops moving the control). Notifications are saved, but nothing sends them yet.
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { setStillChosen } from "@/lib/painting/motion";
import { TRACK_NAMES } from "./music";
import { Chevron, Group, Icon, Pick, Row, Seg, Slider, Toggle } from "./settingsControls";
import type { PaneProps } from "./SettingsPanes";
import { TEXT_NAMES, TRACKS, clock, setSetting, useSettings } from "./settingsStore";
import { tick } from "./sound";
import styles from "./settings.module.css";

export function Sound() {
  const s = useSettings();
  return (
    <>
      <Group title="Sound effects">
        <Row name="All sound effects">
          <Toggle label="Sound effects" on={s.sounds} onChange={(on) => setSetting("sounds", on)} />
        </Row>
        {s.sounds && (
          <>
            <Row name="Right and wrong answers">
              <Toggle
                label="Sounds for right and wrong answers"
                on={s.soundAnswers}
                onChange={(on) => setSetting("soundAnswers", on)}
              />
            </Row>
            <Row name="Typing and taps">
              <Toggle
                label="Sounds for typing and taps"
                on={s.soundKeys}
                onChange={(on) => setSetting("soundKeys", on)}
              />
            </Row>
            <Row name="Coins and rewards">
              <Toggle
                label="Sounds for coins and rewards"
                on={s.soundRewards}
                onChange={(on) => setSetting("soundRewards", on)}
              />
            </Row>
          </>
        )}
        <Row
          name="Effects volume"
          value={`${s.soundVolume}%`}
          below={
            <Slider
              label="Sound volume"
              value={s.soundVolume}
              min={0}
              max={100}
              step={5}
              onChange={(v) => (setSetting("soundVolume", v), tick())}
              low={<Icon name="quiet" size={20} />}
              high={<Icon name="sound" size={20} />}
            />
          }
        />
      </Group>
      <Group title="Focus music">
        <Row name="Play focus music">
          <Toggle
            label="Play focus music"
            on={s.music}
            onChange={(on) => setSetting("music", on)}
          />
        </Row>
        <Row
          name="Music volume"
          value={`${s.musicVolume}%`}
          below={
            <Slider
              label="Music volume"
              value={s.musicVolume}
              min={0}
              max={100}
              step={5}
              onChange={(v) => setSetting("musicVolume", v)}
              low={<Icon name="quiet" size={20} />}
              high={<Icon name="sound" size={20} />}
            />
          }
        />
        <Row name="Auto play">
          <Toggle
            label="Start music by itself"
            on={s.musicAuto}
            onChange={(on) => setSetting("musicAuto", on)}
          />
        </Row>
        {s.musicAuto && (
          <Row
            name="Start time"
            value={clock(720 + s.musicAt)}
            below={
              <Slider
                label="Music starts at"
                value={s.musicAt}
                min={360}
                max={690}
                step={30}
                say={(v) => clock(720 + v)}
                onChange={(v) => setSetting("musicAt", v)}
              />
            }
          />
        )}
      </Group>
      <Group title="Track">
        <Pick
          label="Track"
          value={s.track}
          options={TRACKS.map((track) => ({ value: track, label: TRACK_NAMES[track] }))}
          onChange={(track) => track && setSetting("track", track)}
        />
      </Group>
    </>
  );
}

export function Look({ dark, onDark }: PaneProps) {
  const s = useSettings();
  return (
    <>
      <Group title="Theme">
        <Seg
          label="Theme"
          value={dark ? "dark" : "light"}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(look) => onDark(look === "dark")}
        />
      </Group>
      <Group>
        <Row
          name="Text size"
          value={TEXT_NAMES[s.textStep]}
          below={
            <Slider
              label="Text size"
              value={s.textStep}
              min={0}
              max={3}
              say={(v) => TEXT_NAMES[v]}
              onChange={(v) => setSetting("textStep", v)}
              low={<span className={styles.small}>A</span>}
              high={<span className={styles.big}>A</span>}
            />
          }
        />
        <Row
          name="Glass transparency"
          value={`${s.clear}%`}
          below={
            <Slider
              label="Transparency"
              value={s.clear}
              min={0}
              max={100}
              onChange={(v) => setSetting("clear", v)}
            />
          }
        />
        <Row name="Reduce motion">
          <Toggle
            label="Reduce motion"
            on={s.still}
            onChange={(on) => (setStillChosen(on), setSetting("still", on))}
          />
        </Row>
      </Group>
    </>
  );
}

const SHORTCUTS: readonly [string, string][] = [
  ["Enter", "Check, then next"],
  ["← →", "Back and next"],
  ["C", "Calculator"],
  ["R", "Reference"],
  ["X", "Cross out answers"],
  ["H", "Highlighter"],
  ["P", "Pencil"],
  ["E", "Eraser"],
  ["M", "Mark for review"],
  ["S", "Bookmark"],
  ["+ −", "Text size"],
  ["?", "This list"],
];

export function Quiz() {
  const s = useSettings();
  const [keys, setKeys] = useState(false);
  return (
    <>
      <Group title="Calculator">
        <Seg
          label="Calculator angle unit"
          value={s.angle}
          options={[
            { value: "rad", label: "Radians" },
            { value: "deg", label: "Degrees" },
          ]}
          onChange={(angle) => setSetting("angle", angle)}
        />
      </Group>
      <Group>
        <Row name="Show the timer" note="When a quiz starts">
          <Toggle
            label="Show the timer when a quiz starts"
            on={s.showClock}
            onChange={(on) => setSetting("showClock", on)}
          />
        </Row>
        <button
          type="button"
          className={styles.fold}
          aria-expanded={keys}
          onClick={() => (tick(), setKeys(!keys))}
        >
          <b>Keyboard shortcuts</b>
          <Chevron />
        </button>
        <AnimatePresence initial={false}>
          {keys && (
            <motion.dl
              className={styles.keys}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
            >
              {SHORTCUTS.map(([key, does]) => (
                <div key={key}>
                  <dt>
                    <kbd>{key}</kbd>
                  </dt>
                  <dd>{does}</dd>
                </div>
              ))}
            </motion.dl>
          )}
        </AnimatePresence>
      </Group>
    </>
  );
}

export function Notify({ plan }: PaneProps) {
  const s = useSettings();
  const taught = plan !== "practice";
  return (
    <>
      {taught && (
        <Group title={plan === "cohort" ? "Class reminders" : "Session reminders"}>
          <Row name="Email the day before">
            <Toggle
              label="Email the day before"
              on={s.remindEmail}
              onChange={(on) => setSetting("remindEmail", on)}
            />
          </Row>
          <Row name="Text an hour before">
            <Toggle
              label="Text an hour before"
              on={s.remindText}
              onChange={(on) => setSetting("remindText", on)}
            />
          </Row>
        </Group>
      )}
      {taught && (
        <Group title="Chat">
          <Row name="New message alerts">
            <Toggle
              label="Notify me of new messages"
              on={s.notifyChat}
              onChange={(on) => setSetting("notifyChat", on)}
            />
          </Row>
        </Group>
      )}
      <Group title="Daily 10 reminder">
        <Row name="Remind me every day">
          <Toggle
            label="Daily 10 reminder"
            on={s.remindDaily}
            onChange={(on) => setSetting("remindDaily", on)}
          />
        </Row>
        {s.remindDaily && (
          <Row
            name="Reminder time"
            value={clock(s.dailyAt)}
            below={
              <Slider
                label="Daily 10 reminder time"
                value={s.dailyAt}
                min={360}
                max={1320}
                step={30}
                say={clock}
                onChange={(v) => setSetting("dailyAt", v)}
              />
            }
          />
        )}
      </Group>
    </>
  );
}
