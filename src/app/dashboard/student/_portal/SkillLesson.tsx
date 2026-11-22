"use client";

// The lesson on a skill's page (SkillPage.tsx): written or video, switched at the top. The written
// lesson ends with the skill's strategy quiz, so a student reads the lesson and then takes it (founder,
// 2026-11-20: "the strategy quiz actually lives at the end of the lesson"). The lesson below is a
// stand-in for Circles, the one skill drawn so far: every other skill shows the same, until the real
// lessons are written. Its picture draws itself: the slice of the circle sweeps open to its angle.
import gsap from "gsap";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Icon, Tile } from "./practice";
import styles from "./skill.module.css";

const LESSONS = { written: "Written", video: "Video" } as const;
type Lesson = keyof typeof LESSONS;

const R = 74;
/** The slice's edge, for an angle in degrees measured clockwise from the top. */
function slice(deg: number) {
  const a = (Math.min(deg, 359.9) * Math.PI) / 180;
  const x = (R * Math.sin(a)).toFixed(2);
  const y = (-R * Math.cos(a)).toFixed(2);
  const big = deg > 180 ? 1 : 0;
  return {
    sector: `M0 0 L0 ${-R} A${R} ${R} 0 ${big} 1 ${x} ${y}Z`,
    arc: `M0 ${-R} A${R} ${R} 0 ${big} 1 ${x} ${y}`,
    edge: { x: Number(x), y: Number(y) },
  };
}

/** A circle with a slice of 72 degrees that sweeps open, its arc in gold. */
function Slice() {
  const sector = useRef<SVGPathElement>(null);
  const arc = useRef<SVGPathElement>(null);
  const edge = useRef<SVGLineElement>(null);
  const label = useRef<SVGTextElement>(null);
  const still = useReducedMotion() ?? false;
  useEffect(() => {
    const at = { deg: still ? 72 : 0 };
    const draw = () => {
      const s = slice(at.deg);
      sector.current?.setAttribute("d", s.sector);
      arc.current?.setAttribute("d", s.arc);
      edge.current?.setAttribute("x2", String(s.edge.x));
      edge.current?.setAttribute("y2", String(s.edge.y));
      if (label.current) label.current.textContent = `${Math.round(at.deg)}°`;
    };
    draw();
    if (still) return;
    const tl = gsap
      .timeline({ delay: 0.5, repeat: -1, repeatDelay: 2.4 })
      .to(at, { deg: 72, duration: 1.4, ease: "power2.inOut", onUpdate: draw })
      .to(at, { deg: 0, duration: 0.9, ease: "power2.in", onUpdate: draw }, "+=4");
    return () => {
      tl.kill();
    };
  }, [still]);
  return (
    <svg className={styles.slice} viewBox="-100 -100 200 200" aria-hidden="true">
      <circle r={R} className={styles.disc} />
      <path ref={sector} className={styles.sector} />
      <path ref={arc} className={styles.arc} />
      <line x1="0" y1="0" x2="0" y2={-R} className={styles.radius} />
      <line ref={edge} x1="0" y1="0" className={styles.radius} />
      <circle r="3" className={styles.centre} />
      <text x="-12" y={-R / 2} className={styles.mark}>
        r
      </text>
      <text ref={label} x="14" y="-16" className={styles.angle}>
        72°
      </text>
    </svg>
  );
}

/** The written lesson: what it is, how to spot it, a worked example, then the strategy quiz. */
function Written({ name }: { name: string }) {
  return (
    <article className={styles.written}>
      <div className={styles.intro}>
        <div>
          <h3>What it is</h3>
          <p>
            A slice of a circle is a <b className={styles.warm}>sector</b>. Its curved edge is an{" "}
            <b className={styles.gold}>arc</b>. Both are the same fraction of the whole circle: the
            central angle over 360°.
          </p>
          <p className={styles.rules}>
            <span>
              Arc = <Frac top="θ" bottom="360" /> × 2πr
            </span>
            <span>
              Sector = <Frac top="θ" bottom="360" /> × πr²
            </span>
          </p>
        </div>
        <Slice />
      </div>

      <div>
        <h3>How to spot it</h3>
        <p>
          A central angle, a slice, or the words arc, sector or minor arc. In radians the angle is
          already the fraction: arc = rθ.
        </p>
      </div>

      <div>
        <h3>An example</h3>
        <p>A circle has a radius of 10. A sector has a central angle of 72°. What is its area?</p>
        <ol className={styles.steps}>
          <li>
            The fraction: <Frac top="72" bottom="360" /> = <Frac top="1" bottom="5" />
          </li>
          <li>The whole circle: π × 10² = 100π</li>
          <li>
            The sector: <Frac top="1" bottom="5" /> × 100π = <b className={styles.warm}>20π</b>
          </li>
        </ol>
      </div>

      {/* at the end of the lesson, the strategy for it in five questions */}
      <button type="button" className={styles.strategy}>
        <Tile name="strategy" />
        <span>
          <b>Strategy quiz</b>
          <small>Fraction of the circle · 5 questions</small>
        </span>
        <Icon name="go" size={20} />
      </button>
      <p className={styles.standIn}>A stand-in lesson for {name}.</p>
    </article>
  );
}

function Frac({ top, bottom }: { top: string; bottom: string }) {
  return (
    <span className={styles.frac} aria-label={`${top} over ${bottom}`}>
      <span>{top}</span>
      <span>{bottom}</span>
    </span>
  );
}

/** The video lesson, until there is one: its picture, its length and when it comes. */
function Video() {
  return (
    <div className={styles.video}>
      <Slice />
      <span className={styles.play} aria-hidden="true">
        <Icon name="video" size={30} />
      </span>
      <p>
        Video lesson
        <small>Coming this winter</small>
      </p>
    </div>
  );
}

export function SkillLesson({ name }: { name: string }) {
  const still = useReducedMotion() ?? false;
  const [lesson, setLesson] = useState<Lesson>("written");
  return (
    <>
      <div className={styles.toggle} role="group" aria-label="Lesson">
        {(Object.keys(LESSONS) as Lesson[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={lesson === key}
            onClick={() => setLesson(key)}
          >
            {lesson === key && (
              <motion.span
                layoutId="lesson-toggle"
                className={styles.lens}
                transition={
                  still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }
                }
              />
            )}
            <span>
              <Icon name={key} size={18} />
              {LESSONS[key]}
            </span>
          </button>
        ))}
      </div>
      {lesson === "written" ? <Written name={name} /> : <Video />}
    </>
  );
}
