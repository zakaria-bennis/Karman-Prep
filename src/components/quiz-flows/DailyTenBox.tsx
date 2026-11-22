"use client";
/*
 * The Daily 10's box (the approved "Box first" ending): the box lands, shivers and bursts open,
 * today's coins are thrown out and fly to the balance, which counts up as each one lands. Boxes
 * are opened only in the portal's Rewards (one ledger for every coin, 2026-11-22). Tap or press
 * any key to skip ahead. Still: the box stands open with the balance already counted.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Num } from "@/components/portal";
import { Balance } from "@/components/rewards/Balance";
import { RewardBox } from "@/components/rewards/RewardBox";
import { flyTokens } from "@/components/rewards/tokens";
import { stillNow } from "@/components/rewards/motion";
import { SFX } from "@/components/rewards/sfx";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import r from "@/components/rewards/rewards.module.css";

type Stage = "drop" | "open";

export function DailyTenBox({
  tokens,
  balanceBefore,
  balanceAfter,
  onDone,
}: {
  /** Tokens this Daily 10 earned. */
  tokens: number;
  balanceBefore: number;
  /** The balance with today's tokens in it (null when the rewards could not be read). */
  balanceAfter: number | null;
  onDone(balance: number | null): void;
}) {
  const after = balanceAfter ?? balanceBefore + tokens;
  const [stage, setStage] = useState<Stage>("drop");
  const [balance, setBalance] = useState(balanceBefore);
  const box = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const finished = useRef(false);

  // Skipping lands every coin at once, then the results.
  const skip = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setBalance(after);
    onDone(balanceAfter);
  }, [after, balanceAfter, onDone]);

  useEffect(() => {
    if (stillNow()) {
      // Reduced motion: no throw and no flight.
      finished.current = true;
      setBalance(after);
      onDone(balanceAfter);
      return;
    }
    let live = true;
    const timers: number[] = [];
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
    later(1100, () => {
      setStage("open");
      playRewardSound("levelUp");
    });
    later(1750, () => {
      const n = Math.min(8, Math.max(1, Math.round(tokens / 15)));
      SFX.tokens(0, n * 2, 0.05);
      void flyTokens(box.current, pill.current, n, (i) => {
        if (!live || finished.current) return;
        setBalance(Math.round(balanceBefore + ((after - balanceBefore) * (i + 1)) / n));
      }).then(() => {
        if (!live || finished.current) return;
        later(900, skip);
      });
    });
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      live = false;
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", skip);
    };
    // The box plays once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pillRow = (
    <div className={r.boxTop}>
      {balanceAfter !== null && <Balance ref={pill} value={balance} />}
    </div>
  );

  const earned = (
    <p className={r.boxText} aria-live="polite">
      {stage === "drop" ? (
        "Your Daily 10 box"
      ) : (
        <>
          You earned <Num count>{tokens}</Num> coins
        </>
      )}
    </p>
  );

  return (
    <div className={r.boxCard}>
      {pillRow}
      <button type="button" className={r.boxStage} onClick={skip} aria-label="Skip to your results">
        <span ref={box} style={{ display: "block" }}>
          <RewardBox open={stage === "open"} />
        </span>
        {earned}
      </button>
    </div>
  );
}
