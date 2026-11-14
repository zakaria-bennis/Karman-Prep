"use client";

// Three mockups of the welcome after payment (see page.tsx). Karman is the earnable fox from the quiz
// engine (Guide), the buttons and progress are the guided forms' own, and the landscape flies forward
// with each step, as it does in the plan-finder and the registration flight.
import { useEffect, useState } from "react";
import { Guide } from "@/app/onboarding/_steps/Guide";
import { Progress } from "@/app/onboarding/_steps/Parts";

type Props = { version: "a" | "b" | "c"; name: string; plan: string; got: string[] };

/** The four places a new student is shown. The little drawings are built from the place's own shapes. */
const STOPS = [
  {
    id: "today",
    name: "Today",
    say: "This is Today. Your Daily 10 waits here every day.",
    note: "Ten questions, picked from the skills you miss.",
  },
  {
    id: "tests",
    name: "Practice tests",
    say: "Full-length practice tests live here.",
    note: "Timed like the real thing, section by section.",
  },
  {
    id: "library",
    name: "Library",
    say: "The Library holds every lesson.",
    note: "Each question comes with its explanation.",
  },
  {
    id: "progress",
    name: "Progress",
    say: "Progress shows every skill, one by one.",
    note: "A parent can follow along on their phone.",
  },
] as const;
type Stop = (typeof STOPS)[number]["id"];

const FIRST_STEPS = [
  {
    title: "Do your first Daily 10",
    note: "Ten questions. It is the quickest way to see how this works.",
    go: "Start",
  },
  {
    title: "Take a full practice test",
    note: "It shows where you stand, skill by skill.",
    go: "Pick a time",
  },
  { title: "Invite a parent", note: "They get your progress on their phone.", go: "Send the link" },
];

const fly = (to: number) => document.dispatchEvent(new CustomEvent("karman:fly", { detail: to }));

/** Paper confetti for the first second of the hello. Drawn in code; still when motion is reduced. */
function Confetti() {
  return (
    <div className="wl-confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--i": i,
              "--x": `${(i * 37) % 100}%`,
              "--h": `${(i * 47) % 360}`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** What the plan includes, ticking in one line at a time. */
function Got({ items }: { items: string[] }) {
  return (
    <ul className="wl-got">
      {items.map((t, i) => (
        <li key={t} style={{ "--i": i } as React.CSSProperties}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="9" />
            <path pathLength={1} d="M5.500 10.500l3 3 6-7" />
          </svg>
          {t}
        </li>
      ))}
    </ul>
  );
}

/** A small moving sketch of one place in the portal. */
function Sketch({ of }: { of: Stop }) {
  if (of === "today")
    return (
      <div className="wl-sk wl-sk-today" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
    );
  if (of === "tests")
    return (
      <div className="wl-sk wl-sk-tests" aria-hidden="true">
        <b>Reading and Writing</b>
        <span />
        <b>Math</b>
        <span />
      </div>
    );
  if (of === "library")
    return (
      <div className="wl-sk wl-sk-library" aria-hidden="true">
        {["Linear equations", "Commas and clauses", "Ratios and rates"].map((t, i) => (
          <p key={t} style={{ "--i": i } as React.CSSProperties}>
            <i />
            {t}
          </p>
        ))}
      </div>
    );
  return (
    <div className="wl-sk wl-sk-progress" aria-hidden="true">
      {[62, 38, 81, 54, 70].map((h, i) => (
        <i key={i} style={{ "--i": i, "--h": `${h}%` } as React.CSSProperties} />
      ))}
    </div>
  );
}

function Go({ label, onClick, centre }: { label: string; onClick: () => void; centre?: boolean }) {
  return (
    <div className="ob-go" data-centre={centre || undefined}>
      <button type="button" className="btn" onClick={onClick}>
        <span className="lb">{label}</span>
      </button>
    </div>
  );
}

/** A: the tour. One thing to a screen, Karman talking, the landscape moving on with each step. */
function Tour({ name, plan, got }: Props) {
  const [at, setAt] = useState(0);
  const last = STOPS.length + 2;
  useEffect(() => {
    fly(at / last);
  }, [at, last]);
  const next = () => setAt((n) => Math.min(last, n + 1));
  const stop = at >= 2 && at < last ? STOPS[at - 2] : null;
  return (
    <div className="ob wl">
      {at === 0 ? (
        <Confetti />
      ) : (
        <Progress total={last} at={at} onBack={() => setAt((n) => n - 1)} canBack />
      )}
      <div className="ob-in" key={at}>
        {at === 0 ? (
          <Guide big say={`You're in, ${name}. Welcome to ${plan}.`} />
        ) : at === 1 ? (
          <>
            <Guide say={`Here is what ${plan} gives you.`} />
            <div className="gq-card wl-card">
              <Got items={got} />
            </div>
          </>
        ) : stop ? (
          <>
            <Guide say={stop.say} />
            <div className="gq-card wl-card wl-stop">
              <Sketch of={stop.id} />
              <p>{stop.note}</p>
            </div>
          </>
        ) : (
          <Guide big say="That is the whole place. Ready for your first ten?" />
        )}
        <Go
          centre={at === 0 || at === last}
          label={
            at === 0
              ? "See what you got"
              : at === 1
                ? "Show me around"
                : at === last
                  ? "Start my first Daily 10"
                  : "Next"
          }
          onClick={next}
        />
      </div>
    </div>
  );
}

/** B: the checklist. One calm page: what you got, and the three first steps, the first one ready to press. */
function Checklist({ name, plan, got }: Props) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    fly(0.2 + done * 0.2);
  }, [done]);
  return (
    <div className="ob wl wl-wide">
      <Confetti />
      <div className="wl-head">
        <Guide big say={`You're in, ${name}. Welcome to ${plan}.`} />
      </div>
      <div className="wl-cols">
        <section className="gq-card wl-card">
          <h2>What you just got</h2>
          <Got items={got} />
        </section>
        <section className="gq-card wl-card">
          <h2>Your first three steps</h2>
          <ol className="wl-steps">
            {FIRST_STEPS.map((s, i) => (
              <li
                key={s.title}
                data-s={i < done ? "done" : i === done ? "now" : undefined}
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className="wl-node" aria-hidden="true">
                  <svg viewBox="0 0 20 20">
                    <path pathLength={1} d="M5.500 10.500l3 3 6-7" />
                  </svg>
                </span>
                <div>
                  <b>{s.title}</b>
                  <p>{s.note}</p>
                  {i === done ? (
                    <button type="button" className="btn" onClick={() => setDone((n) => n + 1)}>
                      <span className="lb">{s.go}</span>
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          <p className="wl-count" aria-live="polite">
            {done} of {FIRST_STEPS.length} done
          </p>
        </section>
      </div>
    </div>
  );
}

/** C: inside the portal. A short hello, then Karman points at each place in the real menu, one at a time,
 *  and a small list of first steps stays docked in the corner. */
function InPortal({ name, plan, got }: Props) {
  const [at, setAt] = useState(-1);
  const stop = at >= 0 && at < STOPS.length ? STOPS[at] : null;
  const over = at >= STOPS.length;
  useEffect(() => {
    fly(Math.max(0, at + 1) / (STOPS.length + 1));
  }, [at]);
  return (
    <div className="ob wl wl-portal" data-touring={stop ? "" : undefined}>
      <aside className="wl-nav" aria-label="The portal's menu (mockup)">
        {STOPS.map((s, i) => (
          <span key={s.id} data-on={i === at ? "" : undefined}>
            {s.name}
          </span>
        ))}
        <span>Rewards</span>
      </aside>
      <div className="wl-stage">
        {at === -1 ? (
          <div className="ob-in">
            <Confetti />
            <Guide big say={`You're in, ${name}. Welcome to ${plan}.`} />
            <div className="gq-card wl-card">
              <Got items={got} />
            </div>
            <Go centre label="Show me around" onClick={() => setAt(0)} />
          </div>
        ) : stop ? (
          <div className="wl-point" key={stop.id} style={{ "--row": at } as React.CSSProperties}>
            <Guide say={stop.say} />
            <div className="gq-card wl-card wl-stop">
              <Sketch of={stop.id} />
              <p>{stop.note}</p>
              <div className="wl-row">
                <span>
                  {at + 1} of {STOPS.length}
                </span>
                <button type="button" className="btn" onClick={() => setAt((n) => n + 1)}>
                  <span className="lb">{at === STOPS.length - 1 ? "Done" : "Next"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="ob-in">
            <Guide big say="That is the whole place. Ready for your first ten?" />
            <Go centre label="Start my first Daily 10" onClick={() => setAt(-1)} />
          </div>
        )}
      </div>
      {over || stop ? (
        <div className="gq-card wl-dock">
          <b>Get set up</b>
          {FIRST_STEPS.map((s) => (
            <span key={s.title}>{s.title}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function WelcomeMock(props: Props) {
  return props.version === "b" ? (
    <Checklist {...props} />
  ) : props.version === "c" ? (
    <InPortal {...props} />
  ) : (
    <Tour {...props} />
  );
}
