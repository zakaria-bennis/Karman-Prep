"use client";

// Mockups of the rebuilt student portal: the menu and the Library (see page.tsx). The backdrop is the
// portal's own painting of the day; the type and the level shades are the portal's too. Everything else
// here is new.
import { useMemo, useState, type CSSProperties } from "react";
import "@/components/portal/portal.css";
import PaintedBackdrop from "@/components/portal/PaintedBackdrop";
import { portalFontVars } from "@/components/portal/fonts";
import { choosePainting } from "@/lib/painting/schedule";
import "./portal-mock.css";

export type MockSkill = { id: string; name: string; level: number };
export type MockDomain = {
  id: string;
  name: string;
  groups: { name: string; skills: MockSkill[] }[];
};
export type MockSection = { id: string; name: string; domains: MockDomain[] };
type Props = { version: "a" | "b" | "c"; plan: "pro" | "cohort"; sections: MockSection[] };

const LEVELS = ["Not Started", "Learning", "Understanding", "Proficient"];
const MENUS = {
  pro: ["Library", "Practice", "Progress", "Rewards", "More"],
  cohort: ["Homework", "Library", "Class", "Progress", "More"],
};

const NO_EVENTS = {};
const all = (d: MockDomain) => d.groups.flatMap((g) => g.skills);
const strong = (skills: MockSkill[]) => skills.filter((s) => s.level >= 2).length;

/** One square per skill, shaded by its level. */
function Squares({ skills, big }: { skills: MockSkill[]; big?: boolean }) {
  return (
    <span
      className="pm-sqs"
      data-big={big || undefined}
      role="img"
      aria-label={`${strong(skills)} of ${skills.length} at Understanding or above`}
    >
      {skills.map((s) => (
        <i key={s.id} data-lv={s.level} title={`${s.name}: ${LEVELS[s.level]}`} />
      ))}
    </span>
  );
}

function SkillRow({ s }: { s: MockSkill }) {
  return (
    <a className="pm-skill" href="#skill">
      <i className="pm-sq" data-lv={s.level} aria-hidden="true" />
      <span>
        <b>{s.name}</b>
        <small>{LEVELS[s.level]}</small>
      </span>
      <em>{s.level === 0 ? "Start" : "Practice"}</em>
    </a>
  );
}

function Groups({ d }: { d: MockDomain }) {
  return (
    <div className="pm-groups">
      {d.groups.map((g, i) => (
        <section key={g.name} style={{ "--i": i } as CSSProperties}>
          <h4>
            {g.name}
            <Squares skills={g.skills} />
          </h4>
          {g.skills.map((s) => (
            <SkillRow key={s.id} s={s} />
          ))}
        </section>
      ))}
    </div>
  );
}

/** The two sections, as a switch with a pill that slides (after 21st.dev's animated tabs, in plain code). */
function Switch({
  sections,
  at,
  set,
}: {
  sections: MockSection[];
  at: number;
  set: (n: number) => void;
}) {
  return (
    <div className="pm-switch" role="tablist" style={{ "--at": at } as CSSProperties}>
      {sections.map((s, i) => (
        <button key={s.id} type="button" role="tab" aria-selected={i === at} onClick={() => set(i)}>
          {s.name}
        </button>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <p className="pm-legend">
      {LEVELS.map((l, i) => (
        <span key={l}>
          <i className="pm-sq" data-lv={i} aria-hidden="true" />
          {l}
        </span>
      ))}
    </p>
  );
}

/** What sits beside the Library on a wide screen, and under it on a phone. */
function Rail({ plan }: { plan: Props["plan"] }) {
  return (
    <aside className="pm-rail">
      <section className="pm-paper pm-daily">
        <h3>Your Daily 10</h3>
        <p>Ten questions from the skills that need you most. It keeps your skills topped up.</p>
        <a className="pm-btn" href="#daily">
          Start
        </a>
      </section>
      {plan === "cohort" ? (
        <section className="pm-paper">
          <h3>To do</h3>
          <ul className="pm-todo">
            <li>
              <b>Reading and Writing</b>
              <span>Transitions, skill set</span>
              <small>Due Thursday</small>
            </li>
            <li>
              <b>Math</b>
              <span>Linear functions, skill set</span>
              <small>Due Thursday</small>
            </li>
            <li>
              <b>Full-length exam 2</b>
              <span>98 questions</span>
              <small>Due Saturday</small>
            </li>
          </ul>
        </section>
      ) : null}
      <section className="pm-paper">
        <h3>Levels</h3>
        <Legend />
      </section>
    </aside>
  );
}

/** A: shelves. Four domains as four panels; one opens in place. Desktop: the open domain sits beside them. */
function Shelves({ sec }: { sec: MockSection }) {
  const [open, setOpen] = useState(0);
  const d = sec.domains[Math.min(open, sec.domains.length - 1)];
  return (
    <div className="pm-shelves">
      <div className="pm-shelf-list">
        {sec.domains.map((dom, i) => (
          <div
            key={dom.id}
            className="pm-paper pm-shelf"
            data-open={i === open || undefined}
            style={{ "--i": i } as CSSProperties}
          >
            <button type="button" onClick={() => setOpen(i)} aria-expanded={i === open}>
              <span>
                <b>{dom.name}</b>
                <small>
                  {strong(all(dom))} of {all(dom).length} at Understanding or above
                </small>
              </span>
              <Squares skills={all(dom)} />
            </button>
            {i === open ? (
              <div className="pm-only-phone">
                <Groups d={dom} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="pm-paper pm-detail pm-only-desk" key={d.id}>
        <h3>{d.name}</h3>
        <Groups d={d} />
      </div>
    </div>
  );
}

/** B: the ladder. One long list, Khan's way, with the domains as a row of chips to jump between. */
function Ladder({ sec }: { sec: MockSection }) {
  return (
    <div className="pm-ladder">
      <nav className="pm-chips" aria-label="Domains">
        {sec.domains.map((d) => (
          <a key={d.id} href={`#d-${d.id}`}>
            {d.name}
          </a>
        ))}
      </nav>
      {sec.domains.map((d, i) => (
        <section
          key={d.id}
          id={`d-${d.id}`}
          className="pm-paper pm-rung"
          style={{ "--i": i } as CSSProperties}
        >
          <header>
            <h3>{d.name}</h3>
            <span
              className="pm-meter"
              style={{ "--p": strong(all(d)) / all(d).length } as CSSProperties}
            >
              {Math.round((strong(all(d)) / all(d).length) * 100)}%
            </span>
          </header>
          <Groups d={d} />
        </section>
      ))}
    </div>
  );
}

/** C: the board. Every domain's squares on one screen; pressing a domain opens its skills below. */
function Board({ sec }: { sec: MockSection }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="pm-board">
      <div className="pm-paper pm-grid">
        {sec.domains.map((d, i) => (
          <button
            key={d.id}
            type="button"
            data-on={open === i || undefined}
            onClick={() => setOpen(open === i ? null : i)}
            style={{ "--i": i } as CSSProperties}
          >
            <b>{d.name}</b>
            <Squares skills={all(d)} big />
            <small>
              {strong(all(d))} of {all(d).length}
            </small>
          </button>
        ))}
      </div>
      {open !== null ? (
        <div className="pm-paper pm-detail" key={sec.domains[open].id}>
          <h3>{sec.domains[open].name}</h3>
          <Groups d={sec.domains[open]} />
        </div>
      ) : null}
    </div>
  );
}

export default function PortalMock({ version, plan, sections }: Props) {
  const [at, setAt] = useState(0);
  const choice = useMemo(() => choosePainting(new Date()), []);
  const sec = sections[at];
  const menu = MENUS[plan];
  return (
    <div className={`kp-shell ${portalFontVars} pm`} data-v={version}>
      <PaintedBackdrop choice={choice} events={NO_EVENTS} />
      <nav className="pm-menu" aria-label="Student portal (mockup)">
        <b className="pm-brand">Karman</b>
        {menu.map((m) => (
          <a key={m} href="#menu" aria-current={m === "Library" ? "page" : undefined}>
            <i aria-hidden="true" />
            {m}
          </a>
        ))}
      </nav>
      <main className="pm-main">
        <header className="pm-top">
          <h1>Library</h1>
          <span className="pm-streak" aria-label="Challenge streak: 4 days">
            4 day streak
          </span>
        </header>
        <Switch sections={sections} at={at} set={setAt} />
        <div className="pm-body" key={sec.id}>
          {version === "a" ? (
            <Shelves sec={sec} />
          ) : version === "b" ? (
            <Ladder sec={sec} />
          ) : (
            <Board sec={sec} />
          )}
          <Rail plan={plan} />
        </div>
      </main>
    </div>
  );
}
