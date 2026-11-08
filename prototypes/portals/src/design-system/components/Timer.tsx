import { useEffect, useRef, useState } from "react";
import { cn } from "../cn";
import { Icon } from "../icons";

/*
 * Timer: a countdown in tabular figures with a face that hides (rule 56).
 * The hours, minutes and seconds parts follow Countdown Timer (21st.dev 6067,
 * anubra266); its Ark UI runtime and three coloured buttons were not ported.
 */
export function useCountdown(seconds: number, running: boolean, onDone?: () => void) {
  const [left, setLeft] = useState(seconds);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => setLeft(seconds), [seconds]);
  useEffect(() => {
    if (!running || left <= 0) return;
    const t = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [running, left]);
  useEffect(() => {
    if (left === 0) done.current?.();
  }, [left]);
  return left;
}

export function formatClock(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function Timer({
  seconds,
  running = true,
  hideable = true,
  onDone,
  className,
}: {
  seconds: number;
  running?: boolean;
  hideable?: boolean;
  onDone?(): void;
  className?: string;
}) {
  const left = useCountdown(seconds, running, onDone);
  const [hidden, setHidden] = useState(false);
  const low = left <= 60;
  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      role="timer"
      aria-label={hidden ? "Timer hidden" : `${formatClock(left)} left`}
    >
      <span
        className={cn("tabular text-[17px] font-semibold", low && "text-negative")}
        aria-hidden={hidden}
      >
        {hidden ? "Timer hidden" : formatClock(left)}
      </span>
      {hideable ? (
        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          className="grid h-11 w-11 min-w-11 shrink-0 place-items-center rounded-control text-muted hover:text-text"
          aria-pressed={hidden}
          aria-label={hidden ? "Show timer" : "Hide timer"}
        >
          <Icon name={hidden ? "eye" : "eyeOff"} size={20} />
        </button>
      ) : null}
    </div>
  );
}
