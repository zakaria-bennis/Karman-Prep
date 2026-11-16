"use client";

// One side of the Library (Reading and Writing, or Math), in two pages so nothing is crowded (founder,
// 2026-11-15: "we can have subpages. We'll just focus on the domains first"):
//   Library      the side as a whole: a ring of where the skills stand, today's two tasks, the ways to
//                practise, and the four domains set side by side to compare. Choosing a domain opens it.
//   DomainPage   one domain: a filter, then its skills. Choosing a skill opens the skill's page.
// On a phone the first page is itself split into three, with buttons to move between them, so nobody
// scrolls a long way: Skills, Today, Practise.
// Progress is one green, dark for Proficient and light for Learning in both modes, and every mark has a
// thin edge so it stands clear of the glass. Bands are cut clean where two levels meet: no blending.
// The levels and the question counts are stand-ins: no student data is read yet.
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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
const share = (skills: Skill[]) => ((tally(skills)[TOP] / skills.length) * 100).toFixed(1);

const FILTERS = {
  all: { label: "All", keep: () => true },
  todo: { label: "Not started", keep: (s: Skill) => s.level === 0 },
  learning: { label: "Learning", keep: (s: Skill) => s.level === 1 },
  understanding: { label: "Understanding", keep: (s: Skill) => s.level === 2 },
  done: { label: "Proficient", keep: (s: Skill) => s.level === TOP },
} as const;
type Filter = keyof typeof FILTERS;

const SLIDE = { type: "spring", stiffness: 520, damping: 34, mass: 1 } as const;
const STILL = { duration: 0 } as const;
const STAR =
  "M12 2.800l2.850 5.900 6.450.900-4.700 4.500 1.150 6.400L12 17.450 6.250 20.500l1.150-6.400L2.700 9.600l6.450-.900z";

/** A ring cut clean by level: Proficient first, then down the levels, each touching the next. */
function ringOf(counts: number[]): string {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  let at = 0;
  const stops = [3, 2, 1, 0].map((level) => {
    const from = at;
    at += (counts[level] / total) * 360;
    return `var(--p${level}) ${from}deg ${at}deg`;
  });
  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}

/** A skill's level as three bars, one for each level it climbs, and a star at Proficient. The star's
 *  place is always kept, so the bars line up down a column. */
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

/** A band cut clean by level, as wide as it is given: the same picture as the ring, laid flat. */
function Band({ skills }: { skills: Skill[] }) {
  const counts = tally(skills);
  return (
    <span className={styles.band} aria-hidden="true">
      {[3, 2, 1, 0].map(
        (level) =>
          counts[level] > 0 && (
            <i key={level} data-level={level} style={{ flexGrow: counts[level] }} />
          )
      )}
    </span>
  );
}

/** The key: each level's name, its mark, and how many skills are there. */
function Key({ skills }: { skills: Skill[] }) {
  const counts = tally(skills);
  return (
    <ul className={styles.key}>
      {[3, 2, 1, 0].map((level) => (
        <li key={level}>
          <i data-level={level} />
          {LEVELS[level]}
          <b>{counts[level]}</b>
        </li>
      ))}
    </ul>
  );
}

const PAGES = ["Skills", "Today", "Practise"] as const;

export default function Library({
  rail,
  section,
  onDomain,
}: {
  rail: boolean;
  section: Section;
  onDomain: (domain: string) => void;
}) {
  const still = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<(typeof PAGES)[number]>("Skills");
  const domains = DOMAINS[section];
  const all = domains.flatMap((d) => d.skills);
  const bank = all.reduce((n, s) => n + s.questions, 0);
  const show = (name: (typeof PAGES)[number]) => rail || page === name;

  useEffect(() => {
    if (still || !root.current) return;
    let revert = () => {};
    let gone = false;
    import("gsap").then(({ gsap }) => {
      if (gone || !root.current) return;
      const ctx = gsap.context(() => {
        gsap.fromTo(
          "[data-ring]",
          { "--sweep": 0 },
          { "--sweep": 1, duration: 0.6, ease: "power3.out" }
        );
        gsap.fromTo(
          "[data-grow]",
          { scaleX: 0 },
          { scaleX: 1, duration: 0.5, ease: "power3.out", stagger: 0.04 }
        );
      }, root);
      revert = () => ctx.revert();
    });
    return () => {
      gone = true;
      revert();
    };
  }, [still, section, rail, page]);

  return (
    <div ref={root} className={styles.library}>
      {!rail && (
        <div className={styles.pager} role="group" aria-label="Page">
          {PAGES.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={page === name}
              onClick={() => {
                setPage(name);
                tick();
              }}
            >
              {page === name && (
                <motion.span
                  layoutId="library-pager"
                  className={styles.lens}
                  transition={still ? STILL : SLIDE}
                />
              )}
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.lead}>
        {show("Skills") && (
          <section
            className={`${styles.glass} ${styles.standing}`}
            aria-label="Where your skills stand"
          >
            <div
              className={styles.ring}
              role="img"
              aria-label={`${share(all)}% of skills Proficient`}
            >
              <i data-ring style={{ background: ringOf(tally(all)) }} />
              <p>
                <b>{share(all)}%</b>
                Proficient
              </p>
            </div>
            <div className={styles.standingWords}>
              <Key skills={all} />
              <p className={styles.bank}>
                {bank.toLocaleString("en-US")} questions to practise from
              </p>
            </div>
          </section>
        )}
        {show("Today") && <Today />}
      </div>

      {show("Practise") && <Modes />}

      {show("Skills") && (
        <section className={`${styles.glass} ${styles.domains}`} aria-label="Domains">
          <h2>Domains</h2>
          <ul>
            {domains.map((domain) => {
              const done = tally(domain.skills)[TOP];
              return (
                <li key={domain.name}>
                  <button
                    type="button"
                    className={styles.domain}
                    onClick={() => {
                      tick();
                      buzz(8);
                      onDomain(domain.name);
                    }}
                  >
                    <span className={styles.name}>{domain.name}</span>
                    <span className={styles.grow} data-grow>
                      <Band skills={domain.skills} />
                    </span>
                    <span className={styles.tally}>
                      <b>{done}</b> of {domain.skills.length}
                    </span>
                    <svg
                      className={styles.go}
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      aria-hidden="true"
                    >
                      <path d="M9.500 6.500l5.500 5.500-5.500 5.500" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/** One domain: where it stands, a filter, and its skills. */
export function DomainPage({
  domain,
  onOpen,
}: {
  domain: Domain;
  onOpen: (skill: OpenSkill) => void;
}) {
  const still = useReducedMotion() ?? false;
  const [filter, setFilter] = useState<Filter>("all");
  const shown = domain.skills.filter(FILTERS[filter].keep);
  const questions = domain.skills.reduce((n, s) => n + s.questions, 0);
  return (
    <div className={styles.library}>
      <section className={`${styles.glass} ${styles.summary}`}>
        <p className={styles.count}>
          <b>{share(domain.skills)}%</b> Proficient
          <span className={styles.bank}>{questions.toLocaleString("en-US")} questions</span>
        </p>
        <Band skills={domain.skills} />
        <Key skills={domain.skills} />
      </section>

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
                layoutId="library-filter"
                className={styles.lens}
                transition={still ? STILL : SLIDE}
              />
            )}
            <span>{FILTERS[key].label}</span>
          </button>
        ))}
      </div>

      <section className={`${styles.glass} ${styles.skills}`}>
        <ul>
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
        </ul>
        {shown.length === 0 && <p className={styles.none}>No skills here yet.</p>}
      </section>
    </div>
  );
}
