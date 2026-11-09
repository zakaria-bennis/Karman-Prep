import { forwardRef, type RefObject } from "react";
import { Flame } from "@/design-system/marks";
import { TokenPill } from "./TokenPill";
import { SoundToggle } from "./controls";

/*
 * The results' top bar: the streak and the token balance sit quietly on the
 * left, the sound toggle and Done (a plain link home) on the right. It shares
 * the results column's edges on iPad and desktop, and the phone's gutters.
 */
export const ResultsBar = forwardRef<
  HTMLDivElement,
  {
    streak: number;
    balance: number;
    pill: RefObject<HTMLDivElement | null>;
    home: string;
    phone: boolean;
    narrow: boolean;
    style?: React.CSSProperties;
  }
>(function ResultsBar({ streak, balance, pill, home, phone, narrow, style }, ref) {
  return (
    <div
      ref={ref}
      className={`mx-auto flex w-full items-center gap-2 ${phone ? "px-[18px] pt-[54px]" : "px-10 pt-[18px]"}`}
      style={{ maxWidth: phone ? undefined : narrow ? 640 : 1000, ...style }}
    >
      <span
        className={`tabular inline-flex items-center gap-[6px] rounded-pill border border-line font-semibold ${phone ? "h-[30px] px-[11px] text-[14px]" : "h-[34px] px-[13px] text-[15px]"}`}
        style={{ background: "color-mix(in srgb, rgb(var(--k-text)) 6%, rgb(var(--k-surface)))" }}
        aria-label={`${streak} ${streak === 1 ? "day" : "days"} in a row`}
      >
        <Flame size={14} />
        <b>{streak}</b>
        <span className="font-medium text-muted">{streak === 1 ? "day" : "days"} in a row</span>
      </span>
      <TokenPill ref={pill} value={balance} size={phone ? "sm" : "md"} />
      <span className="ml-auto flex items-center gap-2">
        <SoundToggle />
        <a
          href={home}
          className="inline-flex min-h-tap items-center px-1 text-[16px] font-semibold text-accent underline-offset-4 hover:underline"
        >
          Done
        </a>
      </span>
    </div>
  );
});
