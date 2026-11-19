"use client";

// What is inside each folder of Settings (Settings.tsx lists the folders). His list of 2026-11-18.
// Stand-ins, until the portal reads the signed-in student: the email, the sign-in methods, the
// card, the receipts, the hours and the SAT dates. Nothing here is sent anywhere yet: a choice is
// kept in this browser (settingsStore.ts).
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { setStillChosen, stillChosen } from "@/lib/painting/motion";
import { CONTACT } from "@/lib/marketing/offer";
import { TRACK_NAMES } from "./music";
import { PLANS, type Page, type Plan } from "./plans";
import { AppleCalendarLogo, GoogleCalendarLogo } from "./ScheduleLogos";
import { Chevron, Icon, Row, Seg, Slider, Toggle } from "./settingsControls";
import {
  SAT_DATES,
  TEXT_NAMES,
  TRACKS,
  clock,
  dayName,
  setSetting,
  useSettings,
} from "./settingsStore";
import { Me } from "./shellBits";
import { tick } from "./sound";
import styles from "./settings.module.css";

export type FolderKey =
  | "profile"
  | "people"
  | "sat"
  | "sound"
  | "look"
  | "quiz"
  | "notify"
  | "plan"
  | "calendars"
  | "help";

export type PaneProps = {
  plan: Plan;
  dark: boolean;
  onDark: (dark: boolean) => void;
  onGo: (page: Page) => void;
};

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <div className={styles.rows}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </section>
  );
}

/** A choice from a short list, one to a line, the chosen one ticked. */
function Pick<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | null;
  options: readonly { value: T | null; label: string; extra?: ReactNode }[];
  onChange: (value: T | null) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.pick}>
      {options.map((option) => (
        <button
          key={option.value ?? "none"}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => {
            tick();
            onChange(option.value);
          }}
        >
          <i aria-hidden="true" />
          <span>{option.label}</span>
          {option.extra}
        </button>
      ))}
    </div>
  );
}

function Profile() {
  const s = useSettings();
  const file = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  return (
    <>
      <Group>
        <div className={styles.photo}>
          <span aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- a picture just chosen from this device */}
            {photo ? <img src={photo} alt="" /> : <Me />}
          </span>
          <button type="button" className={styles.soft} onClick={() => file.current?.click()}>
            Upload a picture
          </button>
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const chosen = e.target.files?.[0];
              if (chosen) setPhoto(URL.createObjectURL(chosen));
            }}
          />
        </div>
        <label className={styles.field}>
          <span>Name</span>
          <input
            value={s.name}
            autoComplete="name"
            onChange={(e) => setSetting("name", e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span>Email</span>
          <input value="maya.okafor@example.com" readOnly />
        </label>
      </Group>
      <Group title="Ways to sign in">
        {(["Google", "Apple", "Microsoft"] as const).map((way, i) => (
          <Row key={way} name={way} note={i === 0 ? "Connected" : undefined}>
            <button type="button" className={styles.soft}>
              {i === 0 ? "Remove" : "Connect"}
            </button>
          </Row>
        ))}
      </Group>
    </>
  );
}

/** The people a student works with: a parent who follows along, and a tutor joined by a code. */
function People() {
  const s = useSettings();
  const [parent, setParent] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <>
      <Group title="Invite a parent">
        <form
          className={styles.inline}
          onSubmit={(e) => {
            e.preventDefault();
            if (parent.includes("@")) setSent(true);
          }}
        >
          <label className={styles.field}>
            <span>Parent&rsquo;s email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="off"
              value={parent}
              onChange={(e) => (setParent(e.target.value), setSent(false))}
            />
          </label>
          <button type="submit" className={styles.soft} disabled={!parent.includes("@") || sent}>
            {sent ? "Invite sent" : "Send invite"}
          </button>
        </form>
      </Group>
      <Group title="Your tutor">
        <label className={styles.field}>
          <span>Tutor code</span>
          <input
            value={s.tutorCode}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(e) => setSetting("tutorCode", e.target.value.toUpperCase())}
          />
        </label>
      </Group>
    </>
  );
}

function Sat() {
  const s = useSettings();
  return (
    <>
      <Group title="Test date">
        <Pick
          label="Test date"
          value={s.testDate}
          options={[
            ...SAT_DATES.map((day) => ({ value: day as string, label: dayName(day) })),
            { value: null, label: "Not sure yet" },
          ]}
          onChange={(day) => setSetting("testDate", day)}
        />
      </Group>
      <Group title="Extra time on the SAT">
        <Seg
          label="Extra time"
          value={s.extraTime}
          options={[
            { value: 1, label: "Standard" },
            { value: 1.5, label: "1.5x" },
            { value: 2, label: "2x" },
          ]}
          onChange={(x) => setSetting("extraTime", x)}
        />
      </Group>
    </>
  );
}

function Sound() {
  const s = useSettings();
  return (
    <>
      <Group title="Sound effects">
        <Row name="Sound effects" note="Everything below, on or off">
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

function Look({ dark, onDark }: PaneProps) {
  const s = useSettings();
  const [still, setStill] = useState(() => stillChosen());
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
        <Row name="Reduce motion" note="Stills the background and the animations">
          <Toggle
            label="Reduce motion"
            on={still}
            onChange={(on) => (setStillChosen(on), setStill(on))}
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

function Quiz() {
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

function Notify({ plan }: PaneProps) {
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

function PlanPane({ plan, onGo }: PaneProps) {
  return (
    <>
      <Group title="Plan">
        <Row name={PLANS[plan].name} note={plan === "private" ? "20 hours" : undefined}>
          {plan !== "private" && (
            <button type="button" className={styles.go}>
              Upgrade
            </button>
          )}
        </Row>
        {plan === "private" && (
          <Row name="12 hours left">
            <button type="button" className={styles.go} onClick={() => onGo("schedule")}>
              Add hours
            </button>
          </Row>
        )}
      </Group>
      <Group title="Payment method">
        <Row name="Visa ending 4242">
          <button type="button" className={styles.soft}>
            Change
          </button>
        </Row>
      </Group>
      <Group title="Receipts">
        {["November 3, 2026", "October 3, 2026"].map((day) => (
          <Row key={day} name={day}>
            <button type="button" className={styles.soft}>
              View
            </button>
          </Row>
        ))}
      </Group>
    </>
  );
}

function Calendars() {
  const s = useSettings();
  return (
    <Group>
      <Row name="Apple Calendar" note={s.apple ? "Connected" : undefined}>
        <span className={styles.logo}>
          <AppleCalendarLogo size={24} />
        </span>
        <button type="button" className={styles.soft} onClick={() => setSetting("apple", !s.apple)}>
          {s.apple ? "Remove" : "Connect"}
        </button>
      </Row>
      <Row name="Google Calendar" note={s.google ? "Connected" : undefined}>
        <span className={styles.logo}>
          <GoogleCalendarLogo size={24} />
        </span>
        <button
          type="button"
          className={styles.soft}
          onClick={() => setSetting("google", !s.google)}
        >
          {s.google ? "Remove" : "Connect"}
        </button>
      </Row>
    </Group>
  );
}

function Help() {
  const [sure, setSure] = useState(false);
  return (
    <>
      <Group>
        <a className={styles.fold} href={`mailto:${CONTACT.support}?subject=A%20problem`}>
          <b>Report a problem</b>
          <Chevron />
        </a>
        <a className={styles.fold} href={`mailto:${CONTACT.support}`}>
          <b>Contact support</b>
          <Chevron />
        </a>
      </Group>
      <Group title="Your data">
        {sure ? (
          <div className={styles.sure}>
            <p>This deletes your account and all your work. It cannot be undone.</p>
            <button type="button" className={styles.soft} onClick={() => setSure(false)}>
              Keep my account
            </button>
            <button type="button" className={styles.danger}>
              Delete my account
            </button>
          </div>
        ) : (
          <button type="button" className={styles.fold} onClick={() => setSure(true)}>
            <b data-danger>Delete my account</b>
            <Chevron />
          </button>
        )}
      </Group>
    </>
  );
}

export const PANES: Record<FolderKey, (props: PaneProps) => ReactNode> = {
  profile: Profile,
  people: People,
  sat: Sat,
  sound: Sound,
  look: Look,
  quiz: Quiz,
  notify: Notify,
  plan: PlanPane,
  calendars: Calendars,
  help: Help,
};
