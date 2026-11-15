"use client";

// The Library (step 3 of the portal rebuild, first screen). Section, then domain, then skill, from the
// approved skill list. Every piece is frosted glass sized to what it holds; nothing is a white box.
// The levels shown are stand-ins: no student data is read here yet.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import approved from "@/data/curriculum/approved-skill-taxonomy.json";
import styles from "./library.module.css";

/** The founder's four levels, in order (2026-11-14). */
const LEVELS = ["Not started", "Learning", "Understanding", "Proficient"] as const;
const TOP = LEVELS.length - 1;
const SECTIONS = ["Reading and Writing", "Math"] as const;
type Section = (typeof SECTIONS)[number];

interface Skill {
  name: string;
  level: number;
}
interface Domain {
  name: string;
  skills: Skill[];
}

/** A stand-in level for each skill, the same on every load. */
const standIn = (d: number, s: number) =>
  [3, 2, 3, 1, 0, 2, 3, 1, 2, 0, 3, 1][(d * 5 + s * 3) % 12];

const DOMAINS: Record<Section, Domain[]> = { "Reading and Writing": [], Math: [] };
approved.domains.forEach((domain, d) => {
  DOMAINS[domain.section as Section].push({
    name: domain.label,
    skills: domain.skills
      .filter((skill) => skill.selectable)
      .map((skill, s) => ({ name: skill.label, level: standIn(d, s) })),
  });
});

/** Two columns of about the same height, keeping the domains in order. */
function columns(domains: Domain[]): [Domain[], Domain[]] {
  const size = (list: Domain[]) => list.reduce((n, d) => n + d.skills.length + 2, 0);
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

function Square({ level }: { level: number }) {
  return <i className={styles.sq} data-level={level} />;
}

function DomainGlass({
  domain,
  order,
  startOpen,
}: {
  domain: Domain;
  order: number;
  startOpen: boolean;
}) {
  const still = useReducedMotion() ?? false;
  const [open, setOpen] = useState(startOpen);
  const [picked, setPicked] = useState<string | null>(null);
  const done = domain.skills.filter((s) => s.level === TOP).length;
  return (
    <section className={styles.glass} style={{ "--i": order } as CSSProperties}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.name}>{domain.name}</span>
        <span className={styles.tally}>
          <span
            className={styles.strip}
            role="img"
            aria-label={`${done} of ${domain.skills.length} skills Proficient`}
          >
            {domain.skills.map((s) => (
              <Square key={s.name} level={s.level} />
            ))}
          </span>
          <span aria-hidden="true">
            {done} of {domain.skills.length}
          </span>
        </span>
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
            {domain.skills.map((skill) => {
              const on = picked === skill.name;
              return (
                <li key={skill.name}>
                  <button
                    type="button"
                    className={styles.skill}
                    aria-expanded={on}
                    onClick={() => setPicked(on ? null : skill.name)}
                  >
                    <Square level={skill.level} />
                    <span className={styles.label}>{skill.name}</span>
                    <span className={styles.level}>{LEVELS[skill.level]}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.div
                        className={styles.acts}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={still ? STILL : OPEN}
                      >
                        <div>
                          <button type="button" className={styles.go}>
                            {skill.level === 0 ? "Start skill set" : "Continue skill set"}
                          </button>
                          <button type="button" className={styles.quiet}>
                            Lesson
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function Library({ rail }: { rail: boolean }) {
  const still = useReducedMotion() ?? false;
  const [section, setSection] = useState<Section>("Reading and Writing");
  const domains = DOMAINS[section];
  const all = domains.flatMap((d) => d.skills);
  const done = all.filter((s) => s.level === TOP).length;
  const [left, right] = columns(domains);

  return (
    <div className={styles.library}>
      <header className={`${styles.glass} ${styles.top}`}>
        <div className={styles.switch} role="group" aria-label="Section">
          {SECTIONS.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={section === name}
              onClick={() => setSection(name)}
            >
              {section === name && (
                <motion.span
                  layoutId="library-section"
                  className={styles.lens}
                  transition={still ? STILL : SLIDE}
                />
              )}
              <span>{name}</span>
            </button>
          ))}
        </div>
        <p className={styles.count}>
          <strong>
            {done} of {all.length}
          </strong>{" "}
          skills Proficient
        </p>
        <ul className={styles.legend} aria-label="What the squares mean">
          {LEVELS.map((name, level) => (
            <li key={name}>
              <Square level={level} />
              {name}
            </li>
          ))}
        </ul>
      </header>

      {/* a phone reads one column, with the first domain open; a desktop gets two, all open */}
      <div className={styles.cols} key={`${section} ${rail}`}>
        {(rail ? [left, right] : [domains]).map((col, c) => (
          <div key={c} className={styles.col}>
            {col.map((domain) => {
              const order = domains.indexOf(domain);
              return (
                <DomainGlass
                  key={domain.name}
                  domain={domain}
                  order={order}
                  startOpen={rail || order === 0}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
