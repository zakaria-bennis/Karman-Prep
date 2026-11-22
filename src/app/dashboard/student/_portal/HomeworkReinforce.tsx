"use client";
// Suggestions on Homework (founder, 2026-11-22 round 2): the last full-length exam's Reinforce skills,
// shown as suggestions, never as assigned work. Each opens the skill's lesson, then an 8-question set.
import Link from "next/link";
import { usePortalData } from "./portalData";
import styles from "./homeworkReinforce.module.css";

export function HomeworkReinforce() {
  const skills = usePortalData()?.reinforce ?? [];
  if (!skills.length) return null;
  return (
    <div className={styles.box}>
      <h3>Suggested: Reinforce</h3>
      <p>From your last full-length exam. Not assigned.</p>
      <ul>
        {skills.map((s) => (
          <li key={s.skillId}>
            <Link href={`/dashboard/student?page=library&skill=${encodeURIComponent(s.skillId)}`}>
              <span>{s.name}</span>
              <b>{s.points} pts</b>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
