"use client";

// Settings, the You set: Profile (picture, name, email, ways to sign in) and My SAT (the test date
// and extra time). A signed-in student's name goes to their account (users and Clerk), the picture
// to Clerk and their account, the date to users.sat_test_date. The local sign-in bypass has no Clerk
// session, so there the picture and the ways to sign in are left out. The design page shows
// stand-ins.
import { useClerk, useUser } from "@clerk/nextjs";
import { useRef, useState } from "react";
import { actionSaveName, actionSaveTest, actionSyncPhoto } from "@/lib/portal/settings-actions";
import { usePortalData } from "./portalData";
import { Group, Pick, Row, Say, Seg } from "./settingsControls";
import { SAT_DATES, dayName, setSetting, useSettings } from "./settingsStore";
import { Me } from "./shellBits";
import styles from "./settings.module.css";

type Said = { tone: "done" | "problem"; text: string } | null;

const MAX_PHOTO_MB = 10;
const PROVIDERS: Record<string, string> = {
  google: "Google",
  microsoft: "Microsoft",
  apple: "Apple",
  github: "GitHub",
};

/** The student's picture: their own (Clerk keeps it), or Karman's default one. */
function Photo() {
  const real = usePortalData();
  const { user } = useUser();
  const { photo } = useSettings();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said>(null);
  /* a real student needs a real Clerk session to keep a picture */
  const can = !real || Boolean(user);

  const save = async (chosen: File | null) => {
    setSaid(null);
    if (chosen && !chosen.type.startsWith("image/"))
      return setSaid({ tone: "problem", text: "Choose a picture: a JPG, PNG or HEIC file." });
    if (chosen && chosen.size > MAX_PHOTO_MB * 1024 * 1024)
      return setSaid({ tone: "problem", text: `That picture is over ${MAX_PHOTO_MB} MB.` });
    if (!real) return setSetting("photo", chosen ? URL.createObjectURL(chosen) : null);
    if (!user) return;
    setBusy(true);
    try {
      await user.setProfileImage({ file: chosen });
      await user.reload();
      const r = await actionSyncPhoto({});
      if (!r.ok) return setSaid({ tone: "problem", text: r.error });
      setSetting("photo", r.photo);
      setSaid({ tone: "done", text: chosen ? "Your picture is saved." : "Picture removed." });
    } catch {
      setSaid({ tone: "problem", text: "Your picture didn't save. Try a smaller one." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={styles.photo}>
        <span aria-hidden="true">
          <Me />
        </span>
        {can && (
          <div className={styles.pair}>
            <button
              type="button"
              className={styles.soft}
              disabled={busy}
              onClick={() => file.current?.click()}
            >
              {busy ? "Saving" : photo ? "Change picture" : "Upload a picture"}
            </button>
            {photo && !busy && (
              <button type="button" className={styles.soft} onClick={() => void save(null)}>
                Remove
              </button>
            )}
          </div>
        )}
        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            e.target.value = "";
            if (chosen) void save(chosen);
          }}
        />
      </div>
      {said && <Say tone={said.tone}>{said.text}</Say>}
    </>
  );
}

/** First and last name, saved when the student leaves a field. */
function Name() {
  const real = usePortalData();
  const s = useSettings();
  const full = real ? real.name : s.name;
  const firstWord = real?.firstName?.trim() || full.split(" ")[0] || "";
  const [first, setFirst] = useState(firstWord);
  const [last, setLast] = useState(
    full.startsWith(firstWord) ? full.slice(firstWord.length).trim() : ""
  );
  const [kept, setKept] = useState({ first, last });
  const [said, setSaid] = useState<Said>(null);

  const save = async () => {
    const next = { first: first.trim(), last: last.trim() };
    if (next.first === kept.first && next.last === kept.last) return;
    setSaid(null);
    if (!next.first) return setSaid({ tone: "problem", text: "Type your first name." });
    if (!real) {
      setKept(next);
      return setSetting("name", `${next.first} ${next.last}`.trim());
    }
    const r = await actionSaveName(next);
    if (!r.ok) return setSaid({ tone: "problem", text: r.error });
    setKept({ first: r.first, last: r.last });
    setSetting("name", `${r.first} ${r.last}`.trim());
    setSaid({ tone: "done", text: "Name saved." });
  };
  const field = (label: string, value: string, set: (v: string) => void, auto: string) => (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        value={value}
        maxLength={60}
        autoComplete={auto}
        onChange={(e) => (set(e.target.value), setSaid(null))}
        onBlur={() => void save()}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
    </label>
  );
  return (
    <>
      <div className={styles.twin}>
        {field("First name", first, setFirst, "given-name")}
        {field("Last name", last, setLast, "family-name")}
      </div>
      {said && <Say tone={said.tone}>{said.text}</Say>}
    </>
  );
}

/** The ways this student can sign in, and one button to Clerk's own window to change them. */
function SignIn() {
  const real = usePortalData();
  const { user } = useUser();
  const clerk = useClerk();
  if (real && !user) return null;
  const ways: { name: string; note?: string }[] = user
    ? [
        { name: "Email code", note: user.primaryEmailAddress?.emailAddress },
        ...(user.passwordEnabled ? [{ name: "Password" }] : []),
        ...user.externalAccounts.map((a) => ({
          name: PROVIDERS[a.provider] ?? a.provider.charAt(0).toUpperCase() + a.provider.slice(1),
          note: a.emailAddress || undefined,
        })),
      ]
    : [{ name: "Google", note: "maya.okafor@example.com" }, { name: "Password" }];
  return (
    <Group title="Ways to sign in">
      {ways.map((way) => (
        <Row key={way.name} name={way.name} note={way.note} />
      ))}
      <div className={styles.pair}>
        <button
          type="button"
          className={styles.soft}
          onClick={() => user && clerk.openUserProfile()}
        >
          Manage
        </button>
      </div>
    </Group>
  );
}

export function Profile() {
  const real = usePortalData();
  return (
    <>
      <Group>
        <Photo />
        <Name />
        <label className={styles.field}>
          <span>Email</span>
          <input value={real ? (real.email ?? "") : "maya.okafor@example.com"} readOnly />
        </label>
      </Group>
      <SignIn />
    </>
  );
}

export function Sat() {
  const s = useSettings();
  const real = usePortalData();
  const [said, setSaid] = useState<Said>(null);
  const listed: readonly string[] = real ? real.satDates : SAT_DATES;
  /* the date already chosen stays in view even if the list no longer has it */
  const dates = s.testDate && !listed.includes(s.testDate) ? [s.testDate, ...listed] : listed;
  return (
    <>
      <Group title="Test date">
        <Pick
          label="Test date"
          value={s.testDate}
          options={[
            ...dates.map((day) => ({ value: day, label: dayName(day) })),
            { value: null, label: "Not sure yet" },
          ]}
          onChange={(day) => {
            const was = s.testDate;
            setSaid(null);
            setSetting("testDate", day);
            if (real)
              void actionSaveTest({ testType: "sat", testDate: day }).then((r) => {
                if (r.ok) return setSaid({ tone: "done", text: "Test date saved." });
                setSetting("testDate", was);
                setSaid({ tone: "problem", text: r.error });
              });
          }}
        />
        {said && <Say tone={said.tone}>{said.text}</Say>}
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
