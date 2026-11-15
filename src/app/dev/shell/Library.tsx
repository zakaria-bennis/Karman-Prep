"use client";

// One side of the Library (Reading and Writing, or Math): what to do next, where every skill stands,
// and the skills themselves, domain by domain. Every piece is frosted glass sized to what it holds.
//
// What the page is for, and what each part answers (worked out with Intent and Perception-First Design):
//   "What should I do now?"       Next up: the one skill closest to Proficient, and a button to start it.
//   "How am I doing overall?"     One number, one gold line.
//   "Where do my skills stand?"   The lanes: every skill is one dot, standing in the lane of its level.
//                                 A dot moves up a lane when a skill set is passed, so the figure is the
//                                 rule itself, drawn. It is the same figure for the side and for a domain.
//   "Show me less."               A filter: all, in progress, not started, Proficient.
//   "Which skill, and how far?"   Each row: the skill, and three pips, one for each skill set it takes
//                                 (founder, 2026-11-15: a set is 8 questions; one level per set).
// One colour carries progress: gold. Studied first: Khan Academy's SAT course (one square per skill, a key
// at the top, "Up next for you"), Uxcel and Coursera (a lead card to continue), Quizlet (three states).
// The levels shown are stand-ins: no student data is read yet.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./library.module.css";
import type { OpenSkill } from "./SkillPage";
import { LEVELS, SECTIONS, SKILLS, type Domain, type Section, type Skill } from "./skills72";
import { buzz, constellation, tick } from "./sound";

export { SECTIONS, type Section };
export const DOMAINS = SKILLS;
const TOP = LEVELS.length - 1;

/** How many skills sit at each level, from Not started to Proficient. */
export const tally = (skills: Skill[]) =>
  LEVELS.map((_, level) => skills.filter((s) => s.level === level).length);

const FILTERS = {
  all: { label: "All", keep: () => true },
  doing: { label: "In progress", keep: (s: Skill) => s.level > 0 && s.level < TOP },
  todo: { label: "Not started", keep: (s: Skill) => s.level === 0 },
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

/** A skill's three skill sets as three pips: one fills for each set passed. Proficient earns its star. */
export function Pips({ level }: { level: number }) {
  const label =
    level === TOP
      ? "Proficient: all 3 skill sets done"
      : `${LEVELS[level]}: ${level} of 3 skill sets done`;
  return (
    <span className={styles.pips} data-level={level} role="img" aria-label={label} title={label}>
      {[1, 2, 3].map((n) => (
        <i key={n} data-on={level >= n || undefined} />
      ))}
      {level === TOP && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={STAR} />
        </svg>
      )}
    </span>
  );
}

/** The lanes: one dot for each skill, standing in the lane of its level, Proficient at the top. */
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
            <b>{done}</b> of {domain.skills.length} Proficient
          </small>
        </span>
        <Lanes skills={domain.skills} hot={hot} />
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
                    });
                  }}
                  onPointerEnter={() => setHot(skill.name)}
                  onPointerLeave={() => setHot(null)}
                  onFocus={() => setHot(skill.name)}
                  onBlur={() => setHot(null)}
                >
                  <span className={styles.label}>{skill.name}</span>
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
  const total = all.length;

  // Next up: the skill nearest to Proficient that is not there yet, in the order of the course
  const next = [2, 1, 0]
    .map((level) =>
      domains.flatMap((d) =>
        d.skills.filter((s) => s.level === level).map((s) => ({ ...s, domain: d.name }))
      )
    )
    .find((list) => list.length > 0)?.[0];

  const visible = domains
    .map((domain) => ({ domain, skills: domain.skills.filter(FILTERS[filter].keep) }))
    .filter((d) => d.skills.length > 0);
  const [left, right] = columns(visible);

  /* GSAP brings the figures in: the gold line runs out, then the dots take their places lane by lane */
  useEffect(() => {
    if (still || !root.current) return;
    let revert = () => {};
    let gone = false;
    import("gsap").then(({ gsap }) => {
      if (gone || !root.current) return;
      const ctx = gsap.context(() => {
        gsap.fromTo(
          "[data-band]",
          { scaleX: 0 },
          { scaleX: 1, duration: 1.2, ease: "power3.out", delay: 0.15 }
        );
        gsap.fromTo(
          "[data-dot]",
          { scale: 0 },
          { scale: 1, duration: 0.5, ease: "back.out(3)", delay: 0.25, stagger: 0.008 }
        );
      }, root);
      revert = () => ctx.revert();
      constellation(Math.min(4, counts[TOP]));
    });
    return () => {
      gone = true;
      revert();
    };
    // the counts follow the section
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, section, rail]);

  return (
    <div ref={root} className={styles.library}>
      <div className={styles.lead}>
        <section
          className={`${styles.glass} ${styles.standing}`}
          aria-label="Where your skills stand"
        >
          <p className={styles.count}>
            <b>{counts[TOP]}</b> of {total} skills Proficient
          </p>
          <div className={styles.band}>
            <i data-band style={{ width: `${(counts[TOP] / total) * 100}%` }} />
          </div>
          <Lanes skills={all} named />
        </section>

        {next && (
          <section
            className={`${styles.glass} ${styles.next}`}
            style={{ "--i": 1 } as CSSProperties}
          >
            <h2 className={styles.nextName}>{next.name}</h2>
            <p className={styles.nextWhy}>{next.tests}</p>
            <p className={styles.nextWhere}>
              <Pips level={next.level} />
              {next.level === 2
                ? "Next up: one skill set from Proficient"
                : `Next up: skill set ${next.level + 1} of 3`}
            </p>
            <button
              type="button"
              className={styles.start}
              onClick={() => {
                tick();
                buzz(10);
                onOpen({
                  name: next.name,
                  level: next.level,
                  domain: next.domain,
                  tests: next.tests,
                });
              }}
            >
              Start skill set {next.level + 1}
            </button>
          </section>
        )}
      </div>

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
