"use client";

// Settings, Parent, tutor and class: invite a parent (a fresh link, sent from the student's own
// email), where the student stands with a tutor's group (join with a code, leave, or read that the
// tutor removed them), and a school class code. /join, /join/[code] and /join/class send a student
// here with the code filled in (?code= for a tutor, ?class= for a class). The design page shows
// stand-ins.
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { dismissNoticeAction, leaveTutorAction, redeemCodeAction } from "@/app/join/actions";
import {
  actionJoinClass,
  actionPeople,
  type PeopleState,
} from "@/lib/portal/settings-people-actions";
import { actionParentInviteLink } from "@/lib/portal/settings-actions";
import { redeemMessage } from "@/lib/portal/settings-rules";
import { usePortalData } from "./portalData";
import { Group, Row, Say } from "./settingsControls";
import styles from "./settings.module.css";

type Said = { tone: "done" | "problem" | "note"; text: string } | null;

function Parent() {
  const real = usePortalData() !== null;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said>(null);
  const ok = /^\S+@\S+\.\S+$/.test(email.trim());
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!ok || busy) return;
    setSaid(null);
    if (!real) return setSaid({ tone: "done", text: "Your email app opens with the invite." });
    setBusy(true);
    const made = await actionParentInviteLink().catch(() => null);
    setBusy(false);
    if (!made || !made.ok)
      return setSaid({
        tone: "problem",
        text: made?.error ?? "The invite didn't save. Try again.",
      });
    const body = `Follow my SAT practice on Karman: ${made.link}`;
    window.location.href = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(
      "Join me on Karman"
    )}&body=${encodeURIComponent(body)}`;
    setSaid({
      tone: "done",
      text: "Your email app opened with the invite. Send it from there. The link works once.",
    });
  };
  return (
    <Group title="Invite a parent">
      <form className={styles.inline} onSubmit={(e) => void send(e)}>
        <label className={styles.field}>
          <span>Parent&rsquo;s email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => (setEmail(e.target.value), setSaid(null))}
          />
        </label>
        <button type="submit" className={styles.soft} disabled={!ok || busy}>
          {busy ? "Making the link" : "Send invite"}
        </button>
      </form>
      {said && <Say tone={said.tone}>{said.text}</Say>}
    </Group>
  );
}

/** A code box with its button: the tutor's code and the class code are both one of these. */
function CodeBox({
  label,
  start,
  max,
  busy,
  onJoin,
}: {
  label: string;
  start: string;
  max: number;
  busy: boolean;
  onJoin: (code: string) => void;
}) {
  const [code, setCode] = useState(start);
  return (
    <form
      className={styles.inline}
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) onJoin(code.trim());
      }}
    >
      <label className={styles.field}>
        <span>{label}</span>
        <input
          value={code}
          maxLength={max}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
      </label>
      <button type="submit" className={styles.go} disabled={busy || !code.trim()}>
        {busy ? "Checking" : "Join"}
      </button>
    </form>
  );
}

function Tutor({ state, onChange }: { state: PeopleState | null; onChange: () => void }) {
  const real = usePortalData() !== null;
  const asked = useSearchParams().get("code") ?? "";
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said>(null);
  const [sure, setSure] = useState(false);
  const [switchTo, setSwitchTo] = useState<string | null>(null);
  const tutor = state?.tutor ?? { state: "none" as const };

  const join = async (code: string, switchTutor = false) => {
    setSaid(null);
    if (!real) return setSaid({ tone: "done", text: "You're in Ms. Rivera's group." });
    setBusy(true);
    const r = await redeemCodeAction({ code, switchTutor });
    setBusy(false);
    const askSwitch = !r.ok && r.reason === "linked_elsewhere";
    setSwitchTo(askSwitch ? code : null);
    setSaid({ tone: r.ok ? "done" : askSwitch ? "note" : "problem", text: redeemMessage(r) });
    if (r.ok) onChange();
  };
  const leave = async () => {
    setBusy(true);
    const r = await leaveTutorAction();
    setBusy(false);
    setSure(false);
    if (!r.ok) return setSaid({ tone: "problem", text: "You couldn't leave just now. Try again." });
    setSaid({ tone: "done", text: "You left the group. You're on the Free plan now." });
    onChange();
  };

  if (tutor.state === "active" || tutor.state === "lapsed") {
    const name = tutor.tutorName;
    return (
      <Group title="Your tutor">
        <Row
          name={tutor.state === "active" ? `You're in ${name}'s group` : `${name}'s plan has ended`}
          note={
            tutor.state === "active"
              ? "Practice comes from your tutor. They see your progress and set homework."
              : "You're on Free for now. Your work is saved, and Practice comes back if they restart."
          }
        >
          {!sure && (
            <button type="button" className={styles.soft} onClick={() => setSure(true)}>
              Leave
            </button>
          )}
        </Row>
        {sure && (
          <>
            <Say>Leave {name}&rsquo;s group? You move to the Free plan.</Say>
            <div className={styles.pair}>
              <button type="button" className={styles.soft} onClick={() => setSure(false)}>
                Stay
              </button>
              <button
                type="button"
                className={styles.danger}
                disabled={busy}
                onClick={() => void leave()}
              >
                {busy ? "Leaving" : "Leave the group"}
              </button>
            </div>
          </>
        )}
        {said && <Say tone={said.tone}>{said.text}</Say>}
      </Group>
    );
  }

  return (
    <Group title="Your tutor">
      {tutor.state === "removed" && !tutor.noticeSeen && (
        <>
          <Say>
            {tutor.tutorName} removed you from their group, so you&rsquo;re on the Free plan now.
            Your work is saved.
          </Say>
          <div className={styles.pair}>
            <button
              type="button"
              className={styles.soft}
              onClick={() =>
                void dismissNoticeAction({ linkId: tutor.linkId }).then(() => onChange())
              }
            >
              Got it
            </button>
          </div>
        </>
      )}
      <CodeBox label="Tutor code" start={asked.slice(0, 20)} max={20} busy={busy} onJoin={join} />
      {said && <Say tone={said.tone}>{said.text}</Say>}
      {switchTo && (
        <div className={styles.pair}>
          <button
            type="button"
            className={styles.go}
            disabled={busy}
            onClick={() => void join(switchTo, true)}
          >
            Switch groups
          </button>
        </div>
      )}
    </Group>
  );
}

function SchoolClass({ state, onChange }: { state: PeopleState | null; onChange: () => void }) {
  const real = usePortalData() !== null;
  const asked = useSearchParams().get("class") ?? "";
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said>(null);
  const join = async (code: string) => {
    setSaid(null);
    if (!real) return setSaid({ tone: "done", text: "You joined Algebra 2 at Lincoln High." });
    setBusy(true);
    const r = await actionJoinClass({ code });
    setBusy(false);
    if (!r.ok) return setSaid({ tone: "problem", text: r.error });
    setSaid({
      tone: "done",
      text: `You joined ${r.joined}. Your Practice plan from the school is on.`,
    });
    onChange();
  };
  return (
    <Group title="School class">
      {(state?.classes ?? []).map((c) => (
        <Row key={`${c.name} ${c.school}`} name={c.name} note={c.school ?? undefined} />
      ))}
      <CodeBox
        label="Class code"
        start={asked.toUpperCase().slice(0, 12)}
        max={12}
        busy={busy}
        onJoin={join}
      />
      {said && <Say tone={said.tone}>{said.text}</Say>}
    </Group>
  );
}

export function People() {
  const real = usePortalData() !== null;
  const router = useRouter();
  const [state, setState] = useState<PeopleState | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!real) return;
    let live = true;
    actionPeople({})
      .then((r) => {
        if (!live) return;
        if (r.ok) setState({ tutor: r.tutor, classes: r.classes });
        else setProblem(r.error);
      })
      .catch(() => live && setProblem("This didn't load. Try again in a moment."));
    return () => {
      live = false;
    };
  }, [real, round]);
  /* a group or a class changes the plan: read the folder and the portal again */
  const changed = () => {
    setRound((n) => n + 1);
    router.refresh();
  };
  return (
    <>
      <Parent />
      {problem && <Say tone="problem">{problem}</Say>}
      {(!real || state) && (
        <>
          <Tutor state={state} onChange={changed} />
          <SchoolClass state={state} onChange={changed} />
        </>
      )}
    </>
  );
}
