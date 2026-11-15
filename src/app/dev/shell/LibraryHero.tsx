"use client";

// The Library's first screen (founder, 2026-11-15): two doors, Reading and Writing, and Math. Pressing
// one goes to that section's Library. The phone and the desktop are composed differently on purpose:
// on a phone two wide doors are stacked, the words at the left and the object at the right; on a desktop
// two tall doors stand side by side, the object above and the words below with the domains named.
// GSAP brings the doors in and plays the press; three.js draws the objects (SubjectModel).
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { DOMAINS, SECTIONS, flow, tally, type Section } from "./Library";
import SubjectModel from "./SubjectModel";
import styles from "./hero.module.css";

export default function LibraryHero({ onPick }: { onPick: (section: Section) => void }) {
  const still = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const [lively, setLively] = useState<Section | null>(null);
  const leaving = useRef(false);

  useEffect(() => {
    if (still || !root.current) return;
    let revert = () => {};
    let gone = false;
    import("gsap").then(({ gsap }) => {
      if (gone || !root.current) return;
      const ctx = gsap.context(() => {
        gsap.from("[data-door]", {
          y: 44,
          opacity: 0,
          scale: 0.96,
          filter: "blur(10px)",
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.12,
          clearProps: "filter,transform,opacity",
        });
        gsap.fromTo(
          "[data-flow]",
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.1,
            ease: "power3.out",
            delay: 0.45,
            stagger: 0.12,
          }
        );
      }, root);
      revert = () => ctx.revert();
    });
    return () => {
      gone = true;
      revert();
    };
  }, [still]);

  const pick = (section: Section, door: HTMLElement) => {
    if (leaving.current) return;
    if (still) return onPick(section);
    leaving.current = true;
    import("gsap").then(({ gsap }) => {
      const others = [...(root.current?.querySelectorAll<HTMLElement>("[data-door]") ?? [])].filter(
        (d) => d !== door
      );
      gsap
        .timeline({ onComplete: () => onPick(section) })
        .to(door, { scale: 0.97, duration: 0.12, ease: "power2.out" })
        .to(
          others,
          { opacity: 0, scale: 0.94, filter: "blur(8px)", duration: 0.35, ease: "power2.in" },
          "<"
        )
        .to(
          door,
          { scale: 1.04, opacity: 0, filter: "blur(10px)", duration: 0.42, ease: "power2.in" },
          ">-0.12"
        );
    });
  };

  return (
    <div ref={root} className={styles.hero}>
      {SECTIONS.map((section) => {
        const domains = DOMAINS[section];
        const counts = tally(domains.flatMap((d) => d.skills));
        const total = counts.reduce((a, b) => a + b, 0);
        return (
          <button
            key={section}
            type="button"
            className={styles.door}
            data-door
            data-lively={lively === section || undefined}
            aria-label={`${section}: ${counts[3]} of ${total} skills Proficient. Open`}
            onClick={(e) => pick(section, e.currentTarget)}
            onPointerEnter={() => setLively(section)}
            onPointerLeave={() => setLively(null)}
            onFocus={() => setLively(section)}
            onBlur={() => setLively(null)}
          >
            <span className={styles.model}>
              <SubjectModel
                kind={section === "Math" ? "math" : "reading"}
                lively={lively === section}
                still={still}
              />
            </span>
            <span className={styles.words}>
              <span className={styles.name}>{section}</span>
              <span className={styles.meta}>
                <b>{counts[3]}</b> of {total} skills Proficient
              </span>
              <span
                className={styles.flow}
                data-flow
                style={{ background: flow(counts, "%", "to right") }}
              />
              <span className={styles.domains}>
                {domains.map((d) => (
                  <span key={d.name}>{d.name}</span>
                ))}
              </span>
            </span>
            <span className={styles.enter} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M5 12h13M12.500 6.500L18 12l-5.500 5.500" />
              </svg>
            </span>
          </button>
        );
      })}
    </div>
  );
}
