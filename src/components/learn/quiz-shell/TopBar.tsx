"use client";
import type { ReactNode } from "react";
import styles from "./quiz-shell.module.css";

export function TopBar({
  section,
  topic,
  centre,
  tools,
}: {
  section: string;
  topic: string;
  centre?: ReactNode;
  tools?: ReactNode;
}) {
  return (
    <header data-quiz-bar="top" className={`${styles.topBar} ${styles.glass}`}>
      <div className={styles.barTitle}>
        <p className={styles.section}>{section}</p>
        <p className={styles.topic}>{topic}</p>
      </div>
      <div className={styles.barCentre}>{centre}</div>
      <div className={styles.tools}>{tools}</div>
    </header>
  );
}
