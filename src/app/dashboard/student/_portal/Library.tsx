"use client";

// One side of the Library (Reading and Writing, or Math), in two pages so nothing is crowded (founder,
// 2026-11-15: "we can have subpages. We'll just focus on the domains first"):
//   Library      the side as a whole: a ring of where the skills stand, today's two tasks, the ways to
//                practice, and the four domains set side by side to compare. Choosing a domain opens it.
//   DomainPage   one domain: a filter, then its skills. Choosing a skill opens the skill's page.
// On a phone the first page is itself split into three, with buttons to move between them, so nobody
// scrolls a long way: Skills, Today, Practice.
// Progress is one green, dark for Proficient and light for Learning in both modes, and every mark has a
// thin edge so it stands clear of the glass. Bands are cut clean where two levels meet: no blending.
// The levels and question counts are the student's own (useSkills); signed out, the stand-ins.
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import styles from "./library.module.css";
import { EndlessButton, Modes, Today, TrialButton } from "./practice";
import { WorkshopBanner } from "./Workshops";
import type { OpenSkill } from "./SkillPage";
import { LEVELS, SECTIONS, type Domain, type Section, type Skill } from "./skills72";
import { useSkills } from "./portalData";
import { buzz, tick } from "./sound";

export { SECTIONS, type Section };
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

/** A ring cut clean by level: Proficient first, then down the levels. Where two levels meet there is a
 *  hairline in the same colour as the ring's edge. */
export function ringOf(counts: number[]): string {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const line = 1.4;
  let at = 0;
  const stops: string[] = [];
  [3, 2, 1, 0].forEach((level) => {
    if (!counts[level]) return;
    const end = at + (counts[level] / total) * 360;
    stops.push(
      `var(--sq-edge) ${at}deg ${at + line}deg`,
      `var(--p${level}) ${at + line}deg ${end}deg`
    );
    at = end;
  });
  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}

/** A skill's level as three bars, one for each level it climbs. A filled bar glows and shimmers. */
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
function Key({ skills, onLevel }: { skills: Skill[]; onLevel?: (level: number) => void }) {
  const counts = tally(skills);
  return (
    <ul className={styles.key}>
      {[3, 2, 1, 0].map((level) => {
        const inner = (
          <>
            <i data-level={level} />
            {LEVELS[level]}
            <b>{counts[level]}</b>
          </>
        );
        return (
          <li key={level}>
            {onLevel ? (
              <button type="button" disabled={!counts[level]} onClick={() => onLevel(level)}>
                {inner}
              </button>
            ) : (
              <span>{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const PAGES = ["Skills", "Today", "Practice"] as const;

export default function Library({
  rail,
  section,
  taught,
  pro,
  onDomain,
}: {
  rail: boolean;
  section: Section;
  /** A Cohort or Private student: the workshop stands where the Daily 10 and challenge would. */
  taught: boolean;
  /** A Pro student may see the workshops coming up. */
  pro: boolean;
  onDomain: (domain: string) => void;
}) {
  const still = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<(typeof PAGES)[number]>("Skills");
  const domains = useSkills()[section];
  const all = domains.flatMap((d) => d.skills);
  const bank = all.reduce((n, s) => n + s.questions, 0);
  const show = (name: (typeof PAGES)[number]) => rail || page === name;
  // the domain with the smallest share Proficient is the one to work on first
  // The weakest domain: every skill counts for how far it has climbed (none 0, Learning 1, Understanding
  // 2, Proficient 3), and a domain's score is its average climb out of 3. Averaging makes a domain of
  // twelve skills comparable with one of six. A tie goes to the domain with more skills not started.
  const climb = (d: Domain) =>
    d.skills.reduce((n, sk) => n + sk.level, 0) / (d.skills.length * TOP);
  const weakest = [...domains].sort(
    (x, y) => climb(x) - climb(y) || tally(y.skills)[0] - tally(x.skills)[0]
  )[0];

  useEffect(() => {
    if (still || !root.current) return;
    let revert = () => {};
    let gone = false;
    import("gsap").then(({ gsap }) => {
      if (gone || !root.current) return;
      const ctx = gsap.context(() => {
        // the ring opens fast and eases to a stop
        gsap.fromTo(
          "[data-ring]",
          { "--sweep": 0 },
          { "--sweep": 1, duration: 1.6, ease: "expo.out" }
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
              <Key
                skills={all}
                onLevel={(level) => {
                  tick();
                  onDomain(LEVELS[level]);
                }}
              />
              <p className={styles.bank}>
                {bank.toLocaleString("en-US")} total{" "}
                {section === "Math" ? "math" : "reading and writing"} questions
              </p>
            </div>
          </section>
        )}
        {/* a taught student has the Daily 10 and the challenge question on Homework; here, in
            their place, is this side's workshop */}
        {show("Today") && (taught ? <WorkshopBanner section={section} /> : <Today />)}
      </div>

      {show("Practice") && <Modes workshops={pro} section={section} />}

      {show("Skills") && (
        <section className={`${styles.glass} ${styles.domains}`} aria-label="Domains">
          <h2>Domains</h2>
          <ul>
            {domains.map((domain) => {
              const done = tally(domain.skills)[TOP];
              const first = domain === weakest;
              return (
                <li key={domain.name}>
                  <button
                    type="button"
                    className={styles.domain}
                    data-first={first || undefined}
                    onClick={() => {
                      tick();
                      buzz(8);
                      onDomain(domain.name);
                    }}
                  >
                    <span className={styles.name}>
                      {domain.name}
                      {first && <small>Weakest domain</small>}
                    </span>
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
        <EndlessButton kind="domain" name={domain.name} />
        <TrialButton kind="domain" name={domain.name} />
      </section>

      <div className={`${styles.filter} ${styles.levels}`} role="group" aria-label="Show">
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

/** Every skill at one level, across the side's domains. It has no share or filter of its own: it is
 *  already one level, so those would say nothing (founder, 2026-11-15). */
export function LevelPage({
  section,
  level,
  onOpen,
}: {
  section: Section;
  level: number;
  onOpen: (skill: OpenSkill) => void;
}) {
  const skills = useSkills();
  const groups = skills[section]
    .map((domain) => ({ domain, skills: domain.skills.filter((sk) => sk.level === level) }))
    .filter((g) => g.skills.length > 0);
  const count = groups.reduce((n, g) => n + g.skills.length, 0);
  return (
    <div className={styles.library}>
      <p className={styles.lede}>
        <b>{count}</b> {count === 1 ? "skill" : "skills"} in {section}
      </p>
      {groups.map(({ domain, skills }) => (
        <section key={domain.name} className={`${styles.glass} ${styles.skills}`}>
          <h2 className={styles.group}>{domain.name}</h2>
          <ul>
            {skills.map((skill) => (
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
                      domain: LEVELS[level],
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
        </section>
      ))}
    </div>
  );
}
