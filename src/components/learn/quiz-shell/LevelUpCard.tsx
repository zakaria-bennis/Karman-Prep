"use client";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import type { ConfidenceBand } from "@/types/quiz";
import styles from "./rewards.module.css";
import shell from "./quiz-shell.module.css";
import { LevelUpConstellation } from "./drawings";
import { BOUNCE, useShellMotion } from "./motion";
import { bandName, bandRank, bandRose } from "./Rewards";

export { bandRank, bandRose };

/** Plays once when a completed skill set moves the skill up a band (spec: Level up). */
export function LevelUpCard({
  skill,
  before,
  after,
  onDone,
}: {
  skill: string;
  before: ConfidenceBand | null;
  after: ConfidenceBand;
  onDone(): void;
}) {
  const { reduced } = useShellMotion();
  const rose = bandRose(before, after);
  useEffect(() => {
    if (rose) playRewardSound("levelUp");
  }, [rose]);
  if (!rose) return null;
  return (
    <motion.div
      role="dialog"
      aria-label="Level up"
      className={`${styles.levelUp} ${shell.glass}`}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduced ? { duration: 0.15 } : BOUNCE}
    >
      <span className={styles.levelArt}>
        <LevelUpConstellation reduced={reduced} />
      </span>
      <p className={styles.levelSkill}>{skill}</p>
      <p className={styles.levelBand}>{bandName(after)}</p>
      <button type="button" className={shell.primary} onClick={onDone} autoFocus>
        Next
      </button>
    </motion.div>
  );
}
