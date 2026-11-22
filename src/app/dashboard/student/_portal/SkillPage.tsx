"use client";

// One skill's page, and the start of its skill set. Opening a skill slides this in over the Library
// (page.tsx). The founder's layout, kept (2026-11-20): the lesson at the left, written or video
// (SkillLesson.tsx), and everything else at the right, made livelier:
//   the student's own character, dressed as they have it, looking round
//   where they stand, as Karman's tails: asleep, two, four, nine (end-options/TailsStage.tsx)
//   their last set on this skill, one dot an answer, and the coins a set can earn
//   when it is due, if it was set as homework (the date only, not who set it)
//   one green Start, glowing; then, small, Endless mode, Time trial and Review mistakes
// What moves a skill up is never said here: the level-up is a surprise. No timer, difficulty or
// calculator switch: skill sets are untimed, their difficulty adjusts itself, and the calculator is
// always there. Everything shown is a stand-in: no student data is read yet.
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { Coin } from "@/components/portal/Coin";
import { prefersStill } from "@/lib/painting/motion";
import { TailsMark } from "@/app/dev/end-options/TailsStage";
import go from "@/app/dev/end-options/parts.module.css";
import { ACCESSORIES } from "./accessories";
import { openEndless } from "./endless";
import { getEquipped } from "./equipped";
import { Buddy } from "./HomeworkBuddy";
import lib from "./library.module.css";
import { Icon, Tile } from "./practice";
import practice from "./practice.module.css";
import { SkillLesson } from "./SkillLesson";
import { usePortalData } from "./portalData";
import { catalogSkillOf } from "@/lib/portal/skill-bridge";
import { practiceSet } from "@/lib/student/quiz-routes";
import styles from "./skill.module.css";

const LEVELS = ["Not started", "Learning", "Understanding", "Proficient"] as const;

export interface OpenSkill {
  name: string;
  level: number;
  domain: string;
  /** What the skill tests, in a line. */
  tests?: string;
  /** How many questions the Library holds for it. */
  questions?: number;
}

/** The design page's stand-ins: the last set, the coins, the due date. A signed-in student's own
 *  come from `useSkillFacts`; "Up to 120" coins is what a set can earn. */
const LAST = [1, 1, 0, 1, 1, 1, 0, 1];
const LAST_WHEN = "2 days ago";
const COINS = 120;
const DUE = "Thursday";
const TO_REVIEW = 3;

/** Start: the set is played on the real quiz screen and ends on the new ending (end-options, ?play=1),
 *  in the same light, with the character as it is dressed, then comes back here. */
function playSetUrl(name: string, level: number) {
  const dark = document.documentElement.getAttribute("data-kp-mode") !== "light";
  const { face, outfit } = getEquipped();
  const wear = Object.values(outfit)
    .map((id) => ACCESSORIES.find((a) => a.id === id)?.name)
    .filter(Boolean)
    .join(",");
  const q = new URLSearchParams({
    play: "1",
    skill: name,
    from: String(level),
    mode: dark ? "dark" : "light",
    face,
    back: `/dev/shell?night=${dark ? 1 : 0}`,
  });
  if (wear) q.set("wear", wear);
  return `/dev/end-options?${q}`;
}

function Trail({ level }: { level: number }) {
  return (
    <ol className={styles.trail} aria-label={`Your level: ${LEVELS[level]}`}>
      {LEVELS.map((name, i) => (
        <li
          key={name}
          data-stop
          data-past={i < level || undefined}
          data-here={i === level || undefined}
          data-ahead={i > level || undefined}
        >
          <span className={styles.stop}>
            <TailsMark level={i} size={i === level ? 76 : 48} />
          </span>
          <small>{name}</small>
        </li>
      ))}
    </ol>
  );
}

/** The last set on this skill, the homework due on it and the misses to review, for a signed-in
 *  student; the stand-ins on the design page. */
function useSkillFacts(name: string) {
  const real = usePortalData();
  if (!real)
    return { last: LAST, lastWhen: LAST_WHEN, due: DUE as string | null, toReview: TO_REVIEW };
  const sittings = real.student.sittings ?? [];
  const mine = sittings.find((s) => s.mode === "skill" && s.asked.some((q) => q.skill === name));
  const missed = sittings.flatMap((s) => s.asked).filter((q) => q.skill === name && !q.right);
  const work = real.homework?.work.find(
    (w) => w.state !== "done" && w.from >= 0 && w.name.includes(name)
  );
  return {
    last: (mine?.asked ?? []).filter((q) => q.skill === name).map((q) => (q.right ? 1 : 0)),
    lastWhen: mine ? daysAgo(real.student.days - mine.day) : "",
    due: work ? dueWord(work.from) : null,
    toReview: missed.length,
  };
}
const daysAgo = (n: number) => (n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`);
const dueWord = (from: number) =>
  from === 0
    ? "today"
    : from === 1
      ? "tomorrow"
      : new Date(Date.now() + from * 86_400_000).toLocaleDateString("en-US", { weekday: "long" });

export default function SkillPage({ skill }: { skill: OpenSkill }) {
  const page = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const level = Math.max(0, Math.min(3, skill.level));
  const real = usePortalData() !== null;
  const {
    last: LAST,
    lastWhen: LAST_WHEN,
    due: DUE,
    toReview: TO_REVIEW,
  } = useSkillFacts(skill.name);
  // the right side comes in piece by piece: the character, the stops along the trail one after
  // another, the last set's dots, then Start
  useLayoutEffect(() => {
    const el = page.current;
    if (!el || prefersStill()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-rise]",
        { y: 14, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.06,
        }
      );
      gsap.fromTo(
        "[data-stop]",
        { y: 10, scale: 0.6, opacity: 0 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: "back.out(2.2)",
          stagger: 0.09,
          delay: 0.2,
        }
      );
      gsap.fromTo(
        "[data-dot]",
        { scale: 0 },
        {
          scale: 1,
          duration: 0.35,
          ease: "back.out(3)",
          stagger: 0.04,
          delay: 0.55,
        }
      );
    }, el);
    return () => ctx.revert();
  }, [skill.name]);

  return (
    <div ref={page} className={`${lib.library} ${styles.page}`}>
      {/* where the student stands, and the one thing to do */}
      <section className={`${lib.glass} ${styles.level}`}>
        <div className={styles.hello} data-rise>
          <span className={styles.buddy}>
            <Buddy size={112} cheer={0} />
          </span>
          <div>
            {skill.tests && <p className={styles.tests}>{skill.tests}</p>}
            {DUE && (
              <p className={styles.due}>
                <Icon name="check" size={14} />
                Due {DUE}
              </p>
            )}
          </div>
        </div>

        <Trail level={level} />

        <div className={styles.facts} data-rise>
          <div className={styles.last}>
            <small>Last set</small>
            {LAST.length === 0 ? (
              <b>None yet</b>
            ) : (
              <>
                <span
                  className={styles.dots}
                  aria-label={`${LAST.filter(Boolean).length} of ${LAST.length}`}
                >
                  {LAST.map((right, i) => (
                    <i key={i} data-dot data-right={right === 1 || undefined} />
                  ))}
                </span>
                <b>
                  {LAST.filter(Boolean).length} of {LAST.length} <span>· {LAST_WHEN}</span>
                </b>
              </>
            )}
          </div>
          <div className={styles.coins}>
            <small>Up to</small>
            <b>
              <Coin size={22} />
              {COINS}
            </b>
          </div>
        </div>

        <button
          type="button"
          className={`${go.go} ${styles.start}`}
          data-rise
          onClick={() => {
            // a signed-in student plays a real skill set on the live quiz screen
            const catalog = real ? catalogSkillOf(skill.name) : null;
            if (catalog) return window.location.assign(practiceSet(catalog).path);
            router.push(playSetUrl(skill.name, level));
          }}
        >
          <span>Start skill set</span>
          <Icon name="go" size={20} />
        </button>
      </section>

      {/* the lesson: written or video, with the strategy quiz at its end */}
      <section className={`${lib.glass} ${styles.lesson}`}>
        <SkillLesson name={skill.name} />
      </section>

      {/* other ways to practice this one skill */}
      <section className={`${lib.glass} ${styles.more}`}>
        {(
          [
            ["endless", "Endless mode", null],
            ["trial", "Time trial", null],
            ["review", "Review mistakes", `${TO_REVIEW} to review`],
          ] as const
        ).map(([icon, name, note]) => (
          <button
            key={name}
            type="button"
            className={`${practice.mode} ${styles.row}`}
            onClick={() => icon === "endless" && openEndless({ kind: "skill", name: skill.name })}
          >
            {icon === "review" ? (
              <span className={`${practice.tile} ${styles.reviewTile}`}>
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                  <path d="M6 6.500v4h4" />
                  <path d="M6.400 10.500A7 7 0 1 1 6 14" />
                  <path d="M12 8.500V12l2.500 1.500" />
                </svg>
              </span>
            ) : (
              <Tile name={icon} />
            )}
            <b>
              {name}
              {note && <small>{note}</small>}
            </b>
            <svg
              className={styles.chev}
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
            >
              <path d="M9.500 6.500l5.500 5.500-5.500 5.500" />
            </svg>
          </button>
        ))}
      </section>
    </div>
  );
}
