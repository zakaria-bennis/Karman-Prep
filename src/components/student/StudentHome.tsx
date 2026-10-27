"use client";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import {
  buildStudentHome,
  type StudentHome as Home,
  type StudentHomeInput,
} from "@/lib/student/home-model";
import { useMergedInput, useLiveNow } from "./preview-store";
import { SkillSky } from "./SkillSky";
import { TrialChart, fmt } from "./TrialChart";
import { CalendarIcon, GamesIcon, TestsIcon, TrialIcon, TutorIcon } from "./icons";
import { AssignmentStatus } from "./AssignmentStatus";
import s from "./student.module.css";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
  });
const satLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" });

export function StudentHome({
  input,
  nowMs,
  base,
}: {
  input: StudentHomeInput;
  nowMs: number;
  base: string;
}) {
  const now = useLiveNow(nowMs);
  const home = buildStudentHome(useMergedInput(input), now, base);
  const reduce = useReducedMotion();
  const rise: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 14 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { type: "spring", bounce: 0, duration: 0.55, delay: reduce ? 0 : i * 0.06 },
    }),
  };
  const block = (i: number) => ({
    variants: rise,
    initial: "hidden" as const,
    animate: "show" as const,
    custom: i,
  });

  return (
    <div className={s.home}>
      <div className={s.col}>
        <motion.header className={s.hero} {...block(0)}>
          <h1 className={s.h1}>
            {home.satDays !== null
              ? `${home.firstName}, ${home.satDays} days to your SAT.`
              : `${home.firstName}, welcome back.`}
          </h1>
          <div className={s.heroFacts}>
            {home.satDate && (
              <span className={s.fact}>
                SAT <strong>{satLabel(home.satDate)}</strong>
              </span>
            )}
            {home.diagnosticRange && (
              <span className={s.fact}>
                Diagnostic range{" "}
                <strong className={s.num}>
                  {home.diagnosticRange.low} to {home.diagnosticRange.high}
                </strong>
              </span>
            )}
            <span className={s.fact}>
              Points <strong className={s.num}>{home.points.total.toLocaleString()}</strong>
            </span>
          </div>
          <div className={s.heroActions}>
            <Link href={home.primary.href} className={s.primary}>
              {home.primary.label}
            </Link>
            {home.dailyDone && <span className={s.fact}>Daily 10 done today</span>}
          </div>
        </motion.header>

        <motion.section className={s.panel} aria-labelledby="skills-h" {...block(1)}>
          <div className={s.sectionHead}>
            <h2 id="skills-h" className={s.h2}>
              Skills
            </h2>
            <Link href={`${base}/skills`} className={s.link}>
              All skills
            </Link>
          </div>
          <SkillSky home={home} base={base} />
        </motion.section>

        {home.due.length > 0 && (
          <motion.section className={s.panel} aria-labelledby="due-h" {...block(2)}>
            <h2 id="due-h" className={s.h2} style={{ marginBottom: 6 }}>
              Due
            </h2>
            <ul className={s.list}>
              {home.due.map((d) => (
                <li key={d.id}>
                  <Link href={base + d.href} className={s.item}>
                    <CalendarIcon size={20} className={s.muted} />
                    <span>
                      <span className={s.itemTitle}>{d.title}</span>
                      <span className={s.itemWhen} style={{ display: "block" }}>
                        Due {when(d.dueAt)} · from {d.from}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </div>

      <div className={s.col}>
        <motion.section className={s.panel} aria-labelledby="trial-h" {...block(2)}>
          <div className={s.sectionHead}>
            <h2
              id="trial-h"
              className={s.h2}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <TrialIcon size={20} /> Time Trial
            </h2>
          </div>
          {(["math", "reading"] as const).map((sec) => {
            const t = home.trials[sec];
            return (
              <div key={sec} className={s.trialRow}>
                <div>
                  <div className={s.fact}>
                    {sec === "math" ? "Math module" : "Reading and Writing module"}
                  </div>
                  <div className={s.trialTarget}>{fmt(t.target)}</div>
                  <div className={s.fact}>
                    Goal <strong className={s.num}>{fmt(t.goal)}</strong>
                  </div>
                  <AssignmentStatus a={t.next} tutor="David" />
                </div>
                <TrialChart steps={t.steps} goal={t.goal} />
              </div>
            );
          })}
          <Link href={`${base}/time-trial`} className={s.glassButton} style={{ marginTop: 12 }}>
            {home.trials.math.next?.state === "open" || home.trials.reading.next?.state === "open"
              ? "Start your Time Trial"
              : "See Time Trials"}
          </Link>
        </motion.section>

        {home.nextClass && (
          <motion.section className={s.panel} aria-labelledby="class-h" {...block(3)}>
            <h2 id="class-h" className={s.h2} style={{ marginBottom: 6 }}>
              Next class
            </h2>
            <div className={s.item}>
              <CalendarIcon size={20} className={s.muted} />
              <span>
                <span className={s.itemTitle}>{home.nextClass.title}</span>
                <span className={s.itemWhen} style={{ display: "block" }}>
                  {when(home.nextClass.startsAt)} on Zoom · {home.nextClass.tutor}
                </span>
              </span>
            </div>
          </motion.section>
        )}

        <motion.section className={s.panel} aria-labelledby="more-h" {...block(4)}>
          <h2 id="more-h" className={s.h2} style={{ marginBottom: 6 }}>
            Games and tests
          </h2>
          <ul className={s.list}>
            <li>
              <Link href={`${base}/games`} className={s.item}>
                <GamesIcon size={20} />
                <span className={s.itemTitle}>Wordline</span>
              </Link>
            </li>
            <li>
              <Link href={`${base}/games#word-parts`} className={s.item}>
                <GamesIcon size={20} />
                <span className={s.itemTitle}>Word parts</span>
              </Link>
            </li>
            <li>
              <Link href={`${base}/tests`} className={s.item}>
                <TestsIcon size={20} />
                <span className={s.examText}>
                  <span className={s.itemTitle}>{home.nextExam?.title ?? "Full-length exams"}</span>
                  <AssignmentStatus a={home.nextExam} tutor="David" />
                </span>
              </Link>
            </li>
          </ul>
        </motion.section>

        <motion.section className={s.panel} aria-labelledby="points-h" {...block(5)}>
          <h2 id="points-h" className={s.h2}>
            Points
          </h2>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, margin: "6px 0 10px" }}>
            <span className={s.pointsTotal}>{home.points.total.toLocaleString()}</span>
            <span className={s.fact}>
              <strong className={s.num}>+{home.points.week.toLocaleString()}</strong> this week
            </span>
          </div>
          <TopSkills home={home} />
        </motion.section>

        <Link
          href={`${base}/tutor`}
          className={s.link}
          style={{ display: "inline-flex", gap: 8, alignItems: "center", justifySelf: "start" }}
        >
          <TutorIcon size={18} /> Preview David&rsquo;s unlock screen
        </Link>
      </div>
    </div>
  );
}

function TopSkills({ home }: { home: Home }) {
  const skills = home.domains
    .flatMap((d) => d.skills)
    .filter((k) => k.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);
  const max = skills[0]?.points ?? 1;
  return (
    <div>
      {skills.map((k) => {
        const math = CATALOG_SKILLS.find((c) => c.id === k.id)?.subject === "math";
        return (
          <div key={k.id} className={s.pointBar}>
            <span className={s.rowLabel}>{k.label}</span>
            <span className={s.num}>{k.points}</span>
            <div className={`${s.meter} ${math ? s.mathRow : s.readingRow}`}>
              <span style={{ transform: `scaleX(${k.points / max})` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
