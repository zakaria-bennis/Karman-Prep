"use client";

// One side of the Library (Reading and Writing, or Math). Every piece is frosted glass sized to what it
// holds. From the top (founder's notes of 2026-11-15):
//   Where your skills stand   a ring whose colour shows, at a glance, how much is Proficient,
//                             Understanding, Learning and not started, with the share Proficient to one
//                             decimal in the middle; beside it, a rounded square for each skill in the lane
//                             of its level, which is also the key.
//   Today                     the Daily 10 and the Challenge question, to start if not done (practice.tsx).
//   More ways to practise     time trials, endless mode, strategy quizzes, full-length exams, and on the
//                             Reading and Writing side flashcards and the word game (practice.tsx).
//   A filter, then the domains and their skills. Each row: the skill, how many questions it holds, and
//   three bars, one for each level it climbs, with a star at Proficient. Skill sets are never numbered.
// One hue carries progress, in three clear steps: deep evergreen by day, marigold by night.
// The levels and the question counts are stand-ins: no student data is read, and the bank is not yet
// tagged to these 72 skills.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./library.module.css";
import { Modes, Today } from "./practice";
import type { OpenSkill } from "./SkillPage";
import { LEVELS, SECTIONS, SKILLS, type Domain, type Section, type Skill } from "./skills72";
import { buzz, tick } from "./sound";

export { SECTIONS, type Section };
export const DOMAINS = SKILLS;
const TOP = LEVELS.length - 1;

/** How many skills sit at each level, from Not started to Proficient. */
export const tally = (skills: Skill[]) =>
  LEVELS.map((_, level) => skills.filter((s) => s.level === level).length);

const FILTERS = {
  all: { label: "All", keep: () => true },
  todo: { label: "Not started", keep: (s: Skill) => s.level === 0 },
  learning: { label: "Learning", keep: (s: Skill) => s.level === 1 },
  understanding: { label: "Understanding", keep: (s: Skill) => s.level === 2 },
  done: { label: "Proficient", keep: (s: Skill) => s.level === TOP },
} as const;
type Filter = keyof typeof FILTERS;

/** Two columns of about the same height, keeping the domains in order. */
function columns<T extends { skills: unknown[] }>(domains: T[]): [T[], T[]] {
  if (domains.length < 2) return [domains, []];
  const size = (list: T[]) => list.reduce((n, d) => n + d.skills.length + 2, 0);
  let best = 1;
  for (let k = 1; k < domains.length; k++) {
    const gap = (i: number) => Math.abs(size(domains.slice(0, i)) - size(domains.slice(i)));
    if (gap(k) < gap(best)) best = k;
  }
  return [domains.slice(0, best), domains.slice(best)];
}

const OPEN = { type: "spring", stiffness: 380, damping: 36, mass: 1 } as const;
const SLIDE = { type: "spring", stiffness: 520, damping: 34, mass: 1 } as const;
const STILL = { duration: 0 } as const;
const STAR =
  "M12 2.800l2.850 5.900 6.450.900-4.700 4.500 1.150 6.400L12 17.450 6.250 20.500l1.150-6.400L2.700 9.600l6.450-.900z";

/** A gradient round a ring whose colours run into each other: Proficient first, then down the levels. */
function flow(counts: number[]): string {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const order = [3, 2, 1, 0].filter((level) => counts[level] > 0);
  const soft = 14;
  let at = 0;
  const stops = order.map((level, i) => {
    const end = at + (counts[level] / total) * 360;
    const from = i === 0 ? 0 : at + soft / 2;
    const to = i === order.length - 1 ? 360 : end - soft / 2;
    at = end;
    return `var(--p${level}) ${Math.min(from, to)}deg ${Math.max(from, to)}deg`;
  });
  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}

/** A skill's level as three bars, one for each level it climbs; Proficient earns its star. The star's
 *  place is always kept, so the bars line up down a column whether or not a row has one. */
export function Pips({ level }: { level: number }) {
  return (
    <span
      className={styles.pips}
      data-level={level}
      role="img"
      aria-label={LEVELS[level]}
      title={LEVELS[level]}
    >
      {[1, 2, 3].map((n) => (
        <i key={n} data-on={level >= n || undefined} />
      ))}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={STAR} />
      </svg>
    </span>
  );
}

/** The lanes: one rounded square for each skill, in the lane of its level, Proficient at the top. */
function Lanes({ skills, hot, named }: { skills: Skill[]; hot?: string | null; named?: boolean }) {
  return (
    <span className={styles.lanes} data-named={named || undefined} aria-hidden="true">
      {[3, 2, 1, 0].map((level) => {
        const here = skills.filter((s) => s.level === level);
        return (
          <span key={level} className={styles.lane} data-level={level}>
            {named && <span className={styles.laneName}>{LEVELS[level]}</span>}
            <span className={styles.dots}>
              {here.map((s) => (
                <i
                  key={s.name}
                  data-dot
                  data-hot={hot === s.name || undefined}
                  title={`${s.name}: ${LEVELS[level]}`}
                />
              ))}
            </span>
            {named && <b>{here.length}</b>}
          </span>
        );
      })}
    </span>
  );
}

/** A domain at a glance: one row of rounded squares, one for each skill, the furthest along first. */
function Strip({ skills, hot }: { skills: Skill[]; hot: string | null }) {
  return (
    <span className={styles.strip} aria-hidden="true">
      {[...skills]
        .sort((a, b) => b.level - a.level)
        .map((s) => (
          <i key={s.name} data-dot data-level={s.level} data-hot={hot === s.name || undefined} />
        ))}
    </span>
  );
}

function DomainGlass({
  domain,
  shown,
  order,
  startOpen,
  onOpen,
}: {
  domain: Domain;
  shown: Skill[];
  order: number;
  startOpen: boolean;
  onOpen: (skill: OpenSkill) => void;
}) {
  const still = useReducedMotion() ?? false;
  const [open, setOpen] = useState(startOpen);
  const [hot, setHot] = useState<string | null>(null);
  const done = domain.skills.filter((s) => s.level === TOP).length;
  const questions = domain.skills.reduce((n, s) => n + s.questions, 0);
  return (
    <section className={styles.glass} style={{ "--i": order } as CSSProperties}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={open}
        aria-label={`${domain.name}: ${done} of ${domain.skills.length} skills Proficient`}
        onClick={() => {
          setOpen(!open);
          tick();
        }}
      >
        <span className={styles.name}>
          {domain.name}
          <small>
            <span>
              <b>{done}</b> of {domain.skills.length} Proficient
            </span>
            <span className={styles.qty}>{questions.toLocaleString("en-US")} questions</span>
          </small>
        </span>
        <Strip skills={domain.skills} hot={hot} />
        <svg className={styles.chev} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M6.500 9.500l5.500 5.500 5.500-5.500" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            className={styles.skills}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={still ? STILL : OPEN}
          >
            {shown.map((skill) => (
              <li key={skill.name}>
                <button
                  type="button"
                  className={styles.skill}
                  onClick={() => {
                    tick();
                    buzz(8);
                    onOpen({
                      name: skill.name,
                      level: skill.level,
                      domain: domain.name,
                      tests: skill.tests,
                      questions: skill.questions,
                    });
                  }}
                  onPointerEnter={() => setHot(skill.name)}
                  onPointerLeave={() => setHot(null)}
                  onFocus={() => setHot(skill.name)}
                  onBlur={() => setHot(null)}
                >
                  <span className={styles.label}>{skill.name}</span>
                  <span className={styles.qty}>{skill.questions} questions</span>
                  <Pips level={skill.level} />
                  <svg
                    className={styles.go}
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden="true"
                  >
                    <path d="M9.500 6.500l5.500 5.500-5.500 5.500" />
                  </svg>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function Library({
  rail,
  section,
  onOpen,
}: {
  rail: boolean;
  section: Section;
  onOpen: (skill: OpenSkill) => void;
}) {
  const still = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const domains = DOMAINS[section];
  const all = domains.flatMap((d) => d.skills);
  const counts = tally(all);
  const share = ((counts[TOP] / all.length) * 100).toFixed(1);
  const bank = all.reduce((n, sk) => n + sk.questions, 0);

  const visible = domains
    .map((domain) => ({ domain, skills: domain.skills.filter(FILTERS[filter].keep) }))
    .filter((d) => d.skills.length > 0);
  const [left, right] = columns(visible);

  /* GSAP brings the figures in: the ring sweeps round, then the squares take their places lane by lane */
  useEffect(() => {
    if (still || !root.current) return;
    let revert = () => {};
    let gone = false;
    import("gsap").then(({ gsap }) => {
      if (gone || !root.current) return;
      const ctx = gsap.context(() => {
        gsap.fromTo(
          "[data-ring]",
          { "--sweep": 0, rotate: -90 },
          { "--sweep": 1, rotate: 0, duration: 0.7, ease: "power3.out" }
        );
        gsap.fromTo(
          "[data-dot]",
          { scale: 0 },
          { scale: 1, duration: 0.3, ease: "back.out(2)", delay: 0.05, stagger: 0.003 }
        );
      }, root);
      revert = () => ctx.revert();
    });
    return () => {
      gone = true;
      revert();
    };
  }, [still, section, rail]);

  return (
    <div ref={root} className={styles.library}>
      <div className={styles.lead}>
        <section
          className={`${styles.glass} ${styles.standing}`}
          aria-label="Where your skills stand"
        >
          <div className={styles.ring} role="img" aria-label={`${share}% of skills Proficient`}>
            <i data-ring style={{ background: flow(counts) }} />
            <p>
              <b>{share}%</b>
              Proficient
            </p>
          </div>
          <div className={styles.standingWords}>
            <Lanes skills={all} named />
            <p className={styles.bank}>{bank.toLocaleString("en-US")} questions to practise from</p>
          </div>
        </section>
        <Today />
      </div>

      <Modes section={section} />

      <div className={styles.filter} role="group" aria-label="Show">
        {(Object.keys(FILTERS) as Filter[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => {
              setFilter(key);
              tick();
            }}
          >
            {filter === key && (
              <motion.span
                layoutId={`library-filter-${section}`}
                className={styles.lens}
                transition={still ? STILL : SLIDE}
              />
            )}
            <span>
              {FILTERS[key].label} <b>{all.filter(FILTERS[key].keep).length}</b>
            </span>
          </button>
        ))}
      </div>

      {/* a phone reads one column, with the first domain open; a desktop gets two, all open */}
      <div className={styles.cols} key={`${section} ${rail} ${filter}`}>
        {(rail ? [left, right] : [visible]).map((col, c) => (
          <div key={c} className={styles.col}>
            {col.map(({ domain, skills }) => {
              const order = visible.findIndex((v) => v.domain === domain);
              return (
                <DomainGlass
                  key={domain.name}
                  domain={domain}
                  shown={skills}
                  order={order}
                  startOpen={rail || order === 0 || filter !== "all"}
                  onOpen={onOpen}
                />
              );
            })}
          </div>
        ))}
        {visible.length === 0 && (
          <p className={`${styles.glass} ${styles.none}`}>No skills here yet.</p>
        )}
      </div>
    </div>
  );
}
