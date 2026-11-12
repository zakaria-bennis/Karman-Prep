"use client";
/*
 * The Daily 10's box (the approved "Box first" ending): the box lands, shivers and bursts open,
 * today's tokens are thrown out and fly to the balance, which counts up as each one lands. When
 * the balance pays for a mystery box, the student can open one now or save it for later (the
 * tokens stay theirs, and Rewards opens it any time). Tap or press any key to skip ahead. Still:
 * the box stands open with the balance already counted.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Cta, Num } from "@/components/portal";
import { Balance } from "@/components/rewards/Balance";
import { PrizeReveal } from "@/components/rewards/PrizeReveal";
import { RewardBox } from "@/components/rewards/RewardBox";
import { flyTokens } from "@/components/rewards/tokens";
import { stillNow } from "@/components/rewards/motion";
import { SFX } from "@/components/rewards/sfx";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import { BOX_COST, type AnimalId } from "@/lib/rewards/catalog";
import r from "@/components/rewards/rewards.module.css";

type Stage = "drop" | "open" | "offer" | "prize";

export function DailyTenBox({
  tokens,
  balanceBefore,
  balanceAfter,
  animal,
  onDone,
}: {
  /** Tokens this Daily 10 earned. */
  tokens: number;
  balanceBefore: number;
  /** The balance with today's tokens in it (null when the rewards could not be read). */
  balanceAfter: number | null;
  animal: AnimalId;
  onDone(balance: number | null): void;
}) {
  const after = balanceAfter ?? balanceBefore + tokens;
  const canOpen = balanceAfter !== null && balanceAfter >= BOX_COST;
  const [stage, setStage] = useState<Stage>("drop");
  const [balance, setBalance] = useState(balanceBefore);
  const box = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const finished = useRef(false);
  const latest = useRef(after);
  latest.current = balance;

  // Skipping lands every token at once: the offer when there is one, otherwise the results.
  const skip = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setBalance(after);
    if (canOpen) setStage("offer");
    else onDone(balanceAfter);
  }, [after, canOpen, balanceAfter, onDone]);

  useEffect(() => {
    if (stillNow()) {
      // Reduced motion: no throw and no flight. With a box to open, it waits open and counted.
      finished.current = true;
      setBalance(after);
      if (canOpen) setStage("offer");
      else onDone(balanceAfter);
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
        if (canOpen) {
          finished.current = true;
          setStage("offer");
        } else later(900, skip);
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

  if (stage === "prize")
    return (
      <div className={r.boxCard}>
        {pillRow}
        <PrizeReveal
          animal={animal}
          onBalance={setBalance}
          onPrize={() => undefined}
          onDone={() => onDone(latest.current)}
        />
      </div>
    );

  const earned = (
    <p className={r.boxText} aria-live="polite">
      {stage === "drop" ? (
        "Your Daily 10 box"
      ) : (
        <>
          You earned <Num count>{tokens}</Num> tokens
        </>
      )}
    </p>
  );

  if (stage === "offer")
    return (
      <div className={r.boxCard}>
        {pillRow}
        <RewardBox open tokens={false} />
        {earned}
        <div className={r.offer}>
          <p className="kp-title">Enough for a mystery box</p>
          <p className="kp-meta">
            One box is {BOX_COST} tokens. Inside: something new for your companion.
          </p>
          <div className={r.choices}>
            <Cta onClick={() => setStage("prize")}>Open it</Cta>
            <button
              type="button"
              className={`kp-link ${r.linkButton}`}
              onClick={() => onDone(balanceAfter)}
            >
              Save it for later
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className={r.boxCard}>
      {pillRow}
      <button
        type="button"
        className={r.boxStage}
        onClick={skip}
        aria-label={canOpen ? "Skip ahead" : "Skip to your results"}
      >
        <span ref={box} style={{ display: "block" }}>
          <RewardBox open={stage === "open"} />
        </span>
        {earned}
      </button>
    </div>
  );
}
