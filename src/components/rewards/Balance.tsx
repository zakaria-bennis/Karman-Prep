"use client";
/*
 * The token balance pill. When its value changes it rolls to the new number and bumps, so a
 * token landing on it is felt. Still: it shows the new number at once.
 */
import { forwardRef, useEffect, useRef, useState } from "react";
import { stillNow } from "./motion";
import { TokenIcon } from "./RewardBox";
import s from "./rewards.module.css";

export const Balance = forwardRef<HTMLSpanElement, { value: number; label?: string }>(
  function Balance({ value, label = "Tokens" }, ref) {
    const [shown, setShown] = useState(value);
    const [bump, setBump] = useState(0);
    const from = useRef(value);
    useEffect(() => {
      const start = from.current;
      from.current = value;
      if (start === value) return;
      if (value > start) setBump((n) => n + 1);
      if (stillNow()) {
        setShown(value);
        return;
      }
      const t0 = performance.now();
      const ms = Math.min(700, 180 + Math.abs(value - start) * 2);
      let raf = 0;
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3);
        setShown(Math.round(start + (value - start) * e));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [value]);
    return (
      <span
        ref={ref}
        key={bump}
        className={s.balance}
        data-bump={bump > 0}
        role="status"
        aria-label={`${label}: ${value}`}
      >
        <TokenIcon size={20} />
        <span aria-hidden="true">{shown}</span>
      </span>
    );
  }
);
