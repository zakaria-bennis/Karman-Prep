"use client";

// The Library (step 3 of the portal rebuild, first screen). Section, then domain, then skill, from the
// approved skill list. Every piece is frosted glass sized to what it holds; nothing is a white box.
// Progress is drawn, not written (founder, 2026-11-15: "figures, animations ... not just a wall of text"):
// a bar for the section, a ring for each domain and a three-step meter for each skill, in one warm scale
// (honey, amber, then green), never blue. The levels shown are stand-ins: no student data is read yet.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import approved from "@/data/curriculum/approved-skill-taxonomy.json";
import styles from "./library.module.css";
import type { OpenSkill } from "./SkillPage";

/** The founder's four levels, in order (2026-11-14). */
const LEVELS = ["Not started", "Learning", "Understanding", "Proficient"] as const;
const TOP = LEVELS.length - 1;
export const SECTIONS = ["Reading and Writing", "Math"] as const;
export type Section = (typeof SECTIONS)[number];

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

export const DOMAINS: Record<Section, Domain[]> = { "Reading and Writing": [], Math: [] };
approved.domains.forEach((domain, d) => {
  DOMAINS[domain.section as Section].push({
    name: domain.label,
    skills: domain.skills
      .filter((skill) => skill.selectable)
      .map((skill, s) => ({ name: skill.label, level: standIn(d, s) })),
  });
});

/** How many skills sit at each level, from Not started to Proficient. */
export const tally = (skills: Skill[]) =>
  LEVELS.map((_, level) => skills.filter((s) => s.level === level).length);

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
const STILL = { duration: 0 } as const;

/** A skill's level as three steps that fill: none, one, two, three. */
function Meter({ level }: { level: number }) {
  return (
    <span
      className={styles.meter}
      data-level={level}
      role="img"
      aria-label={LEVELS[level]}
      title={LEVELS[level]}
    >
      {[1, 2, 3].map((step) => (
        <i
          key={step}
          data-on={level >= step || undefined}
          style={{ "--s": step } as CSSProperties}
        />
      ))}
    </span>
  );
}

/**
 * A gradient whose colours run into each other, Proficient first, then Understanding, Learning and what
 * is not started. `unit` is "deg" for a ring and "%" for a bar. Each border is a soft blend, never a cut
 * (founder, 2026-11-15: "I wish it was fluid").
 */
export function flow(counts: number[], unit: "deg" | "%", shape: string): string {
  const whole = unit === "deg" ? 360 : 100;
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const order = [3, 2, 1, 0].filter((level) => counts[level] > 0);
  const soft = whole * 0.07;
  let at = 0;
  const stops: string[] = [];
  order.forEach((level, i) => {
    const end = at + (counts[level] / total) * whole;
    const from = i === 0 ? 0 : at + soft / 2;
    const to = i === order.length - 1 ? whole : end - soft / 2;
    stops.push(`var(--l${level}) ${Math.min(from, to)}${unit} ${Math.max(from, to)}${unit}`);
    at = end;
  });
  return unit === "deg"
    ? `conic-gradient(${shape}, ${stops.join(", ")})`
    : `linear-gradient(${shape}, ${stops.join(", ")})`;
}

/** A domain at a glance: one ring whose colours flow round it, with the number Proficient inside. */
function Ring({ counts }: { counts: number[] }) {
  return (
    <span className={styles.ring}>
      <i data-ring style={{ background: flow(counts, "deg", "from 0deg") }} />
      <b>{counts[TOP]}</b>
    </span>
  );
}

function DomainGlass({
  domain,
  order,
  startOpen,
  onOpen,
}: {
  domain: Domain;
  order: number;
  startOpen: boolean;
  onOpen: (skill: OpenSkill) => void;
}) {
  const still = useReducedMotion() ?? false;
  const [open, setOpen] = useState(startOpen);
  const counts = tally(domain.skills);
  return (
    <section className={styles.glass} style={{ "--i": order } as CSSProperties}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={open}
        aria-label={`${domain.name}: ${counts[TOP]} of ${domain.skills.length} skills Proficient`}
        onClick={() => setOpen(!open)}
      >
        <Ring counts={counts} />
        <span className={styles.name}>
          {domain.name}
          <small>
            {counts[TOP]} of {domain.skills.length} Proficient
          </small>
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
              return (
                <li key={skill.name}>
                  <button
                    type="button"
                    className={styles.skill}
                    onClick={() =>
                      onOpen({ name: skill.name, level: skill.level, domain: domain.name })
                    }
                  >
                    <span className={styles.label}>{skill.name}</span>
                    <Meter level={skill.level} />
                  </button>
                </li>
              );
            })}
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
  const domains = DOMAINS[section];
  const counts = tally(domains.flatMap((d) => d.skills));
  const [left, right] = columns(domains);

  /* GSAP draws the figures in: the bar runs out from the left, then each ring sweeps round */
  useEffect(() => {
    if (still || !root.current) return;
    let revert = () => {};
    let gone = false;
    import("gsap").then(({ gsap }) => {
      if (gone || !root.current) return;
      const ctx = gsap.context(() => {
        gsap.fromTo(
          "[data-bar]",
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.1,
            ease: "power3.out",
            delay: 0.15,
          }
        );
        gsap.fromTo(
          "[data-ring]",
          { "--sweep": 0, rotate: -90 },
          { "--sweep": 1, rotate: 0, duration: 1.3, ease: "power3.out", delay: 0.25, stagger: 0.09 }
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
      <header className={`${styles.glass} ${styles.top}`}>
        {/* the section at a glance: one bar, and its key carries the numbers */}
        <div className={styles.spread} key={section}>
          <div
            className={styles.bar}
            data-bar
            aria-hidden="true"
            style={{ background: flow(counts, "%", "to right") }}
          />
          <ul className={styles.key}>
            {[3, 2, 1, 0].map((level) => (
              <li key={level}>
                <i data-level={level} />
                <b>{counts[level]}</b>
                {LEVELS[level]}
              </li>
            ))}
          </ul>
        </div>
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
                  onOpen={onOpen}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
