"use client";

// What stands behind each number, for the span chosen on its page (founder, 2026-11-16). One or more
// panes of glass per number. His rules for them: a title is one or two words; no subtitle unless it
// is needed; a figure must be readable at a glance, with nothing to work out.
//   time        By domain: each section's time as one band cut into its four domains, darkest for
//               the most, with the domains keyed under it. Never by skill, never by kind of work.
//               By weekday: upright bars, and the average day.
//   questions   By domain and By mode: how many were answered, then one band for all of them, green
//               for the share that was right and red for the share missed, beside the percent right.
//               Missed most: the skills missed most often. Accuracy lives here; it has no page of
//               its own, and nothing is shown by difficulty level (founder: students do not see it).
//   skills      Sections: the Library's rings. Recent gains and Recent slips: the eight to ten latest
//               changes of level, up or down, each skill opening in the Library.
//   exams       Every exam with its total, sections, date and change; the exams left; Start. This
//               page has no trend: a count of exams over time says nothing.
//   pace        By outcome: pace on right answers and on missed ones. Slowest skills: the ten slowest.
//   days        Past 100 days, then Past 200 days, then Past year, as the student goes on: a grid of
//               squares. Streaks, and the best weekday.
// Every mark is the Library's one green. Every figure is a stand-in (progressBreakdowns.ts).
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { Pips, ringOf, tally } from "./Library";
import lib from "./library.module.css";
import { GoButton } from "./practice";
import {
  accuracyByDomain,
  byDomain,
  byMode,
  byWeekday,
  daysShown,
  examRows,
  examsInPlan,
  longestStreak,
  mostMissed,
  paceOf,
  skillsOf,
  recentGains,
  recentSlips,
  slowest,
  type DomainPart,
  type Found,
  type PacePart,
} from "./progressBreakdowns";
import { dateOf, short, streak, type DayLog, type Student } from "./progressData";
import styles from "./progressDetails.module.css";
import { clock, minSec, type StatKey } from "./progressStats";
import { LEVELS, SECTIONS } from "./skills72";

/** The panes each number's page has, in order. On a phone each is a page of its own. */
export const panesOf = (stat: StatKey, student: Student): string[] =>
  ({
    time: ["By domain", "By weekday"],
    questions: ["By domain", "By mode", "Missed most"],
    skills: ["Sections", "Recent gains", "Recent slips"],
    exams: ["Exams"],
    pace: ["By outcome", "Slowest skills"],
    accuracy: [],
    days: [daysShown(student).title, "Streaks"],
  })[stat];

/** On a phone, the one pane to draw; with room, none is named and all are drawn. */
export const Only = createContext<string | null>(null);

function Pane({ title, children }: { title: string; children: ReactNode }) {
  const only = useContext(Only);
  if (only !== null && only !== title) return null;
  return (
    <section className={`${lib.glass} ${styles.pane}`} aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** A whole shared out among its parts: one band cut into them, the darkest for the largest, and the
 *  parts named under it beside the same mark. Used for time, where the parts add up to the whole. */
function Shares({ parts, show }: { parts: DomainPart[]; show: (value: number) => string }) {
  return (
    <>
      {SECTIONS.map((section) => {
        const mine = parts.filter((p) => p.section === section).sort((a, b) => b.value - a.value);
        const total = mine.reduce((n, p) => n + p.value, 0);
        return (
          <div key={section} className={styles.group}>
            <h3>
              {section}
              <b>{show(total)}</b>
            </h3>
            <span className={styles.stack} aria-hidden="true">
              {mine.map((p, i) => (
                <i key={p.name} data-shade={i} style={{ flexGrow: Math.max(p.value, 0.001) }} />
              ))}
            </span>
            <ul className={styles.keyed}>
              {mine.map((p, i) => (
                <li key={p.name}>
                  <i data-shade={i} />
                  {p.name}
                  <b>{show(p.value)}</b>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

type Line = { name: string; head?: boolean; count?: number; share: number };

/** A small table of rows: a name, optionally how many, optionally a band, and a percent. The band is
 *  the whole of what was answered: green for the share that was right, red for the share missed
 *  (founder, 2026-11-16). There are no column heads: the colors say it. */
function Table({ counted, band, lines }: { counted?: boolean; band?: boolean; lines: Line[] }) {
  return (
    <table className={styles.table} data-counted={counted || undefined}>
      <tbody>
        {lines.map((line) => (
          <tr key={line.name} data-head={line.head || undefined}>
            <th scope="row">{line.name}</th>
            {counted && <td>{line.count?.toLocaleString("en-US")}</td>}
            {band && (
              <td>
                <span className={styles.band} aria-hidden="true">
                  <i style={{ width: `${line.share * 100}%` }} />
                </span>
              </td>
            )}
            <td>{Math.round(line.share * 100)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The eight domains under their two sections, as lines for a table. */
const domainLines = (
  parts: DomainPart[],
  shareOf: (part: DomainPart, i: number) => number,
  counted: boolean
): Line[] =>
  SECTIONS.flatMap((section) => {
    const mine = parts.filter((p) => p.section === section);
    const asked = mine.reduce((n, p) => n + p.value, 0);
    const shares = mine.map((p) => shareOf(p, parts.indexOf(p)));
    // a section's share is its domains' shares weighed by how many questions each had
    const whole = counted
      ? mine.reduce((n, p, i) => n + p.value * shares[i], 0) / Math.max(1, asked)
      : shares.reduce((a, b) => a + b, 0) / shares.length;
    return [
      { name: section, head: true, count: asked, share: whole },
      ...mine.map((p, i) => ({ name: p.name, count: p.value, share: shares[i] })),
    ];
  });

/** Upright bars to compare a few things: the tallest in the dark green. */
function Bars({ bars }: { bars: { name: string; value: number; said: string }[] }) {
  const most = Math.max(...bars.map((b) => b.value), 1);
  return (
    <ol className={styles.bars} style={{ "--n": bars.length } as CSSProperties}>
      {bars.map((bar) => (
        <li key={bar.name} data-top={bar.value === most || undefined}>
          <b>{bar.said}</b>
          <i style={{ height: `${Math.max(4, (bar.value / most) * 100)}%` }} />
          <span>{bar.name}</span>
        </li>
      ))}
    </ol>
  );
}

/** A big figure over what it counts. */
function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.fact}>
      <b>{value}</b>
      {label}
    </div>
  );
}

/** A skill that opens in the Library, with a figure about it or the level it is at now. */
function SkillRow({
  found,
  value,
  level,
  onSkill,
}: {
  found: Found;
  value?: string;
  level?: number;
  onSkill: (found: Found) => void;
}) {
  return (
    <li>
      <button type="button" className={styles.skill} onClick={() => onSkill(found)}>
        <span>{found.skill.name}</span>
        {level !== undefined && <Pips level={level} />}
        <b>{level === undefined ? value : LEVELS[level]}</b>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M9.500 6.500l5.500 5.500-5.500 5.500" />
        </svg>
      </button>
    </li>
  );
}

export default function Details({
  stat,
  student,
  logs,
  book,
  from,
  part,
  onSkill,
}: {
  stat: StatKey;
  student: Student;
  logs: DayLog[];
  book: Record<StatKey, number[]>;
  from: number;
  part: PacePart;
  onSkill: (found: Found) => void;
}) {
  const to = student.days;
  const inSpan = (key: StatKey) => book[key][to] - (from > 0 ? book[key][from] : 0);
  const accuracy = book.accuracy[to];
  const weekdays = byWeekday(student, logs, from, (day) => dateOf(student, day).getDay());

  if (stat === "time") {
    const minutes = inSpan("time");
    const practiced = Math.max(1, inSpan("days"));
    return (
      <>
        <Pane title="By domain">
          <Shares parts={byDomain(minutes)} show={clock} />
        </Pane>
        <Pane title="By weekday">
          <Bars
            bars={weekdays.map((d) => ({
              name: d.name.slice(0, 3),
              value: d.minutes,
              said: d.minutes >= 60 ? `${Math.round(d.minutes / 60)}h` : `${d.minutes}m`,
            }))}
          />
          <Fact value={clock(Math.round(minutes / practiced))} label="Average day" />
        </Pane>
      </>
    );
  }

  if (stat === "questions") {
    const asked = inSpan("questions");
    const lean = accuracyByDomain(accuracy);
    return (
      <>
        <Pane title="By domain">
          <Table
            counted
            band
            lines={domainLines(byDomain(asked), (_, i) => lean[i].value / 100, true)}
          />
        </Pane>
        <Pane title="By mode">
          <Table
            counted
            band
            lines={byMode(asked, inSpan("exams"), accuracy).map((kind) => ({
              name: kind.name,
              count: kind.asked,
              share: kind.right / kind.asked,
            }))}
          />
        </Pane>
        <Pane title="Missed most">
          <ul className={styles.rows}>
            {mostMissed().map((f) => (
              <SkillRow key={f.skill.name} found={f} value={`${f.accuracy}%`} onSkill={onSkill} />
            ))}
          </ul>
        </Pane>
      </>
    );
  }

  if (stat === "skills") {
    return (
      <>
        <Pane title="Sections">
          <div className={styles.rings}>
            {SECTIONS.map((section) => {
              const skills = skillsOf(section);
              const counts = tally(skills);
              return (
                <div key={section}>
                  <div
                    className={lib.ring}
                    role="img"
                    aria-label={`${counts[3]} of ${skills.length}`}
                  >
                    <i style={{ background: ringOf(counts) }} />
                    <p>
                      <b>{counts[3]}</b>
                      of {skills.length}
                    </p>
                  </div>
                  <h3>{section}</h3>
                </div>
              );
            })}
          </div>
        </Pane>
        {/* the eight to ten latest changes of level, up and down: every level counts */}
        <Pane title="Recent gains">
          <ul className={styles.rows}>
            {recentGains().map((c) => (
              <SkillRow key={c.skill.name} found={c} level={c.to} onSkill={onSkill} />
            ))}
          </ul>
        </Pane>
        <Pane title="Recent slips">
          <ul className={styles.rows}>
            {recentSlips().map((c) => (
              <SkillRow key={c.skill.name} found={c} level={c.to} onSkill={onSkill} />
            ))}
          </ul>
        </Pane>
      </>
    );
  }

  if (stat === "exams") {
    const rows = examRows(student);
    const plan = examsInPlan(student);
    return (
      <Pane title="Exams">
        <ol className={styles.exams}>
          {rows.map((row) => (
            <li key={row.number}>
              <span>Full-length exam {row.number}</span>
              <span className={styles.parts}>
                {short(dateOf(student, row.day))}
                <span>
                  Reading and Writing <b>{row.rw}</b>
                </span>
                <span>
                  Math <b>{row.math}</b>
                </span>
              </span>
              <b className={styles.examTotal}>{row.total}</b>
              {/* its place is kept on the first exam, which has nothing before it to compare with */}
              <b
                className={styles.moved}
                data-way={
                  row.moved === null || row.moved === 0 ? "flat" : row.moved > 0 ? "up" : "down"
                }
              >
                {row.moved === null
                  ? ""
                  : `${row.moved > 0 ? "+" : row.moved < 0 ? "−" : ""}${Math.abs(row.moved)}`}
              </b>
            </li>
          ))}
        </ol>
        <div className={styles.left}>
          <p>
            <b>{plan - rows.length}</b> of {plan} left
          </p>
          <span
            className={styles.slots}
            style={{ "--n": plan } as CSSProperties}
            aria-hidden="true"
          >
            {Array.from({ length: plan }, (_, i) => (
              <i key={i} data-on={i < rows.length || undefined} />
            ))}
          </span>
        </div>
        {rows.length < plan && <GoButton wide>Start full-length exam {rows.length + 1}</GoButton>}
      </Pane>
    );
  }

  if (stat === "pace") {
    const pace = paceOf(book.pace, part)[to];
    const slow = slowest(
      pace,
      part === "all" ? undefined : part === "rw" ? SECTIONS[0] : SECTIONS[1]
    );
    return (
      <>
        <Pane title="By outcome">
          <div className={styles.facts}>
            <Fact value={minSec(pace - 6)} label="Right answers" />
            <Fact value={minSec(pace + 19)} label="Missed answers" />
          </div>
        </Pane>
        <Pane title="Slowest skills">
          <ul className={styles.rows}>
            {slow.map((f) => (
              <SkillRow key={f.skill.name} found={f} value={minSec(f.pace)} onSkill={onSkill} />
            ))}
          </ul>
        </Pane>
      </>
    );
  }

  // days practiced: the last 100 days, 200 days or year, a column a week, today the last square
  const shownDays = daysShown(student);
  const firstDay = to - (shownDays.many - 1);
  // squares before the first day only fill out its week, so the columns line up; they are not drawn
  const lead = new Date(dateOf(student, to).getTime() - (shownDays.many - 1) * 86_400_000).getDay();
  const cells = [
    ...Array.from({ length: lead }, () => -2),
    ...Array.from({ length: shownDays.many }, (_, i) => {
      const day = firstDay + i;
      const done = day < 0 ? -1 : logs[day].questions;
      return done < 0 ? -1 : done === 0 ? 0 : done <= 18 ? 1 : done <= 36 ? 2 : 3;
    }),
  ];
  const columns = Math.ceil(cells.length / 7);
  const best = [...weekdays].sort((a, b) => b.practiced - a.practiced)[0];
  return (
    <>
      <Pane title={shownDays.title}>
        <div
          className={styles.year}
          style={{ maxWidth: columns * 30 } as CSSProperties}
          role="img"
          aria-label={`${book.days[to]} days practiced`}
        >
          {cells.map((level, i) => (
            <i
              key={i}
              data-level={level < 0 ? undefined : level}
              data-out={level === -1 || undefined}
              data-pad={level === -2 || undefined}
            />
          ))}
        </div>
      </Pane>
      <Pane title="Streaks">
        <div className={styles.facts}>
          <Fact value={`${streak(logs)} days`} label="Current" />
          <Fact value={`${longestStreak(logs)} days`} label="Longest" />
        </div>
        <Fact value={`${best.name}s`} label="Best weekday" />
      </Pane>
    </>
  );
}
