"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BAND_LABEL, BAND_ORDER } from "@/lib/student/mastery";
import type { StudentHome } from "@/lib/student/home-model";
import { BandGlyph } from "../icons";
import { Layer } from "../Layer";
import s from "../student.module.css";
import x from "./results.module.css";

/** The results page every run ends on: a headline number, the facts, one next step. */
export function ResultsFrame({ trial, children }: { trial?: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  const body = (
    <div className={`${x.results} ${trial ? x.trial : ""}`}>
      <motion.div
        className={x.inner}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.6 }}
      >
        {children}
      </motion.div>
    </div>
  );
  return trial ? <Layer>{body}</Layer> : body;
}

export type SkillChange = {
  id: string;
  label: string;
  before: StudentHome["domains"][0]["skills"][0];
  after: StudentHome["domains"][0]["skills"][0];
  points: number;
};

export function skillChanges(
  before: StudentHome,
  after: StudentHome,
  touched: Set<string>
): SkillChange[] {
  const b = new Map(before.domains.flatMap((d) => d.skills).map((k) => [k.id, k]));
  return after.domains
    .flatMap((d) => d.skills)
    .filter((k) => touched.has(k.id))
    .map((k) => ({
      id: k.id,
      label: k.label,
      before: b.get(k.id)!,
      after: k,
      points: k.points - b.get(k.id)!.points,
    }));
}

const rose = (c: SkillChange) =>
  BAND_ORDER.indexOf(c.after.band) > BAND_ORDER.indexOf(c.before.band);

/** Level-up: a skill's band moved up. Plays once, as a star that blooms. */
export function LevelUps({ changes }: { changes: SkillChange[] }) {
  const reduce = useReducedMotion();
  const ups = changes.filter(rose);
  if (ups.length === 0) return null;
  return (
    <div className={x.levelUps}>
      {ups.map((c, i) => (
        <motion.div
          key={c.id}
          className={x.levelUp}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.4, duration: 0.7, delay: 0.35 + i * 0.12 }}
        >
          <motion.span
            initial={reduce ? false : { rotate: -90, scale: 0.3 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.9, delay: 0.45 + i * 0.12 }}
            style={{ display: "inline-grid" }}
          >
            <BandGlyph band={c.after.band} size={30} />
          </motion.span>
          <span>
            <strong>{c.label}</strong> is now {BAND_LABEL[c.after.band ?? "none"]}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

export function SkillTable({ changes }: { changes: SkillChange[] }) {
  return (
    <div className={x.table}>
      {changes.map((c) => (
        <div key={c.id} className={x.tr}>
          <BandGlyph band={c.after.band} />
          <span className={s.rowLabel}>{c.label}</span>
          <span className={s.rowMeta}>
            {c.points > 0 ? `+${c.points}` : "0"} ·{" "}
            {c.after.band ? `${c.after.mastery}%` : BAND_LABEL.none}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ResultActions({
  primary,
  secondary,
}: {
  primary: { href: string; label: string };
  secondary?: ReactNode;
}) {
  return (
    <div className={x.actions}>
      <Link href={primary.href} className={s.primary}>
        {primary.label}
      </Link>
      {secondary}
    </div>
  );
}
