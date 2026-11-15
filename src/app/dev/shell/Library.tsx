"use client";

// One section of the Library (Reading and Writing, or Math): its domains, and the skills in each.
// Every piece is frosted glass sized to what it holds.
// Progress is one colour, gold, and it is drawn as night sky (founder, 2026-11-15: "one color filling up"
// and "the constellation ideas ... combine them"): each skill is a star that fills with gold as it
// climbs, each domain is the constellation of its skills, and a line between two Proficient stars lights
// up. Stars answer the pointer, the rows and the stars point at each other, and a lit constellation
// plays a few quiet notes. The levels shown are stand-ins: no student data is read yet.
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

/** Two columns of about the same height, keeping the domains in order. */
function columns(domains: Domain[]): [Domain[], Domain[]] {
  const size = (list: Domain[]) => list.reduce((n, d) => n + d.skills.length + 4, 0);
  let best = 1;
  for (let k = 1; k < domains.length; k++) {
    const gap = (i: number) => Math.abs(size(domains.slice(0, i)) - size(domains.slice(i)));
    if (gap(k) < gap(best)) best = k;
  }
  return [domains.slice(0, best), domains.slice(best)];
}

const OPEN = { type: "spring", stiffness: 380, damping: 36, mass: 1 } as const;
const STILL = { duration: 0 } as const;
const STAR =
  "M12 2.800l2.850 5.900 6.450.900-4.700 4.500 1.150 6.400L12 17.450 6.250 20.500l1.150-6.400L2.700 9.600l6.450-.900z";

/** A skill's level as one drop of gold that fills: empty, a third, two thirds, then full with its star. */
export function StarMeter({ level }: { level: number }) {
  return (
    <span
      className={styles.meter}
      data-level={level}
      role="img"
      aria-label={LEVELS[level]}
      title={LEVELS[level]}
    >
      <i style={{ clipPath: `inset(${100 - (level / TOP) * 100}% 0 0 0)` }} />
      {level === TOP && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={STAR} />
        </svg>
      )}
    </span>
  );
}

/** A domain as a constellation: one star for each skill, joined in order. */
function Sky({
  skills,
  hot,
  onHot,
  onOpen,
}: {
  skills: Skill[];
  hot: number | null;
  onHot: (i: number | null) => void;
  onOpen: (i: number) => void;
}) {
  const n = skills.length;
  const at = skills.map((_, i) => ({
    x: n === 1 ? 50 : 4 + (92 * i) / (n - 1),
    y: 50 + 30 * Math.sin(i * 2.3 + n * 0.7),
  }));
  return (
    <div className={styles.sky} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        {at.slice(1).map((p, i) => (
          <line
            key={i}
            x1={at[i].x}
            y1={at[i].y}
            x2={p.x}
            y2={p.y}
            vectorEffect="non-scaling-stroke"
            data-line
            data-lit={(skills[i].level === TOP && skills[i + 1].level === TOP) || undefined}
          />
        ))}
      </svg>
      <div className={styles.stars}>
        {skills.map((skill, i) => (
          <button
            key={skill.name}
            type="button"
            tabIndex={-1}
            className={styles.star}
            data-star
            data-level={skill.level}
            data-hot={hot === i || undefined}
            title={`${skill.name}: ${LEVELS[skill.level]}`}
            style={
              {
                left: `${at[i].x}%`,
                top: `${at[i].y}%`,
                "--tw": `${((i * 0.37) % 2).toFixed(2)}s`,
              } as CSSProperties
            }
            onPointerEnter={() => onHot(i)}
            onPointerLeave={() => onHot(null)}
            onClick={() => onOpen(i)}
          >
            <i />
          </button>
        ))}
      </div>
    </div>
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
  const [hot, setHot] = useState<number | null>(null);
  const lit = domain.skills.filter((s) => s.level === TOP).length;
  const go = (i: number) => {
    const skill = domain.skills[i];
    tick();
    buzz(8);
    onOpen({ name: skill.name, level: skill.level, domain: domain.name, tests: skill.tests });
  };
  return (
    <section className={styles.glass} style={{ "--i": order } as CSSProperties}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={open}
        aria-label={`${domain.name}: ${lit} of ${domain.skills.length} stars lit`}
        onClick={() => {
          setOpen(!open);
          tick();
        }}
      >
        <span className={styles.name}>
          {domain.name}
          <small>
            <b>{lit}</b> of {domain.skills.length} lit
          </small>
        </span>
        <svg className={styles.chev} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M6.500 9.500l5.500 5.500 5.500-5.500" />
        </svg>
      </button>
      <Sky skills={domain.skills} hot={hot} onHot={setHot} onOpen={go} />
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            className={styles.skills}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={still ? STILL : OPEN}
          >
            {domain.skills.map((skill, i) => (
              <li key={skill.name}>
                <button
                  type="button"
                  className={styles.skill}
                  data-hot={hot === i || undefined}
                  onClick={() => go(i)}
                  onPointerEnter={() => setHot(i)}
                  onPointerLeave={() => setHot(null)}
                  onFocus={() => setHot(i)}
                  onBlur={() => setHot(null)}
                >
                  <span className={styles.label}>{skill.name}</span>
                  <StarMeter level={skill.level} />
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
  const domains = DOMAINS[section];
  const counts = tally(domains.flatMap((d) => d.skills));
  const total = counts.reduce((a, b) => a + b, 0);
  const [left, right] = columns(domains);

  /* GSAP lights the sky: the gold line runs out, each constellation's lines draw, its stars pop in */
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
        // each line grows from the star it starts at to the next one
        gsap.from("[data-line]", {
          attr: {
            x2: (_: number, el: Element) => Number(el.getAttribute("x1")),
            y2: (_: number, el: Element) => Number(el.getAttribute("y1")),
          },
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
          delay: 0.3,
          stagger: 0.02,
        });
        gsap.fromTo(
          "[data-star]",
          { scale: 0 },
          { scale: 1, duration: 0.6, ease: "back.out(3)", delay: 0.3, stagger: 0.018 }
        );
      }, root);
      revert = () => ctx.revert();
      constellation(counts[TOP]);
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
      <header className={`${styles.glass} ${styles.top}`}>
        <p className={styles.count}>
          <b>{counts[TOP]}</b> of {total} stars lit
        </p>
        <div className={styles.band}>
          <i data-band style={{ width: `${(counts[TOP] / total) * 100}%` }} />
        </div>
        <ul className={styles.key} aria-label="What a star shows">
          {[1, 2, 3].map((level) => (
            <li key={level}>
              <StarMeter level={level} />
              {LEVELS[level]}
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
