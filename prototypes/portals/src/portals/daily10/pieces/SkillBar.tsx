import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { BANDS, SEGMENTS, LevelMark, band } from "@/design-system/marks";
import { useConfetti } from "@/design-system/components/Confetti";
import type { SkillLevel } from "@/mock";
import { SFX } from "../sfx";
import { cheerAll } from "../companion/Pet";
import type { Run } from "../run";

/*
 * A skill's four-band bar that plays today's move (the end screen's P.bar): it
 * rises on the slow spring, and crossing a level glows once with the level-up
 * chord; a slip flickers the lost stretch, drains it with the drain tone, and the
 * label says "Needs another look". Same geometry as the design system's LevelBar;
 * the lost stretch is its own element so it can flicker and drain.
 */
export interface SkillBarHandle {
  play(run: Run): Promise<void>;
  el: HTMLDivElement | null;
}
const part = (p: number, [a, b]: [number, number]) =>
  Math.max(0, Math.min(1, (p - a) / (b - a))) * 100;

export const SkillBar = forwardRef<
  SkillBarHandle,
  { skill: SkillLevel; size?: "sm" | "md"; onMood?(m: "o" | "k"): void; className?: string }
>(function SkillBar({ skill, size = "md", onMood, className }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState(skill.was);
  const [lost, setLost] = useState<{ lo: number; hi: number } | null>(null);
  const [mark, setMark] = useState(band(skill.was));
  const [label, setLabel] = useState<string>(BANDS[band(skill.was)]);
  const [tone, setTone] = useState<"muted" | "lvl" | "soft">("muted");
  const [flick, setFlick] = useState(false);
  const confetti = useConfetti();
  const h = size === "sm" ? 6 : 10;

  useImperativeHandle(ref, () => ({
    get el() {
      return el.current;
    },
    async play(run) {
      const { was, now } = skill;
      if (now >= was) {
        const up = band(now) > band(was);
        await run.spring(was, now, setFill, 0.6, 1);
        if (up) {
          setTone("lvl");
          setLabel(BANDS[band(now)]);
          setMark(band(now));
          SFX.levelUp();
          cheerAll();
          onMood?.("o");
          if (track.current) confetti.fire("level", track.current);
          await run.wait(600);
        } else {
          onMood?.("o");
          await run.wait(200);
        }
      } else {
        setFill(now);
        setLost({ lo: now, hi: was });
        setFlick(true);
        onMood?.("k");
        await run.wait(520);
        SFX.drain();
        await run.tween(750, (k) => setLost({ lo: now, hi: was - (was - now) * k }));
        setFlick(false);
        setTone("soft");
        setMark(band(now));
        setLabel("Needs another look");
      }
    },
  }));

  return (
    <div ref={el} className={`w-full ${className ?? ""}`}>
      <div
        className={`mb-[7px] flex items-baseline gap-2 ${size === "sm" ? "text-dense" : "text-body"}`}
      >
        <LevelMark level={mark} size={20} className="relative top-[3px] shrink-0 self-start" />
        <span className="min-w-0 flex-1 leading-[1.3]">{skill.label}</span>
        <span
          className={`shrink-0 text-right text-[13px] transition-colors duration-300 ${
            tone === "lvl"
              ? "font-semibold text-accent"
              : tone === "soft"
                ? "text-text"
                : "text-muted"
          }`}
        >
          {label}
        </span>
      </div>
      <div
        ref={track}
        className={`grid gap-[3px] ${tone === "lvl" ? "sb-lvl" : ""}`}
        style={{ gridTemplateColumns: "35fr 25fr 20fr 20fr", height: h }}
        aria-hidden="true"
      >
        {SEGMENTS.map((seg, i) => {
          const f = part(fill, seg);
          const lo = lost ? part(lost.lo, seg) : 0;
          const hi = lost ? part(lost.hi, seg) : 0;
          return (
            <span key={i} className="relative overflow-hidden rounded-[3px] bg-text/10">
              <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${f}%` }} />
              {lost && hi > lo ? (
                <span
                  className={`absolute inset-y-0 bg-negative/60 ${flick ? "sb-flick" : ""}`}
                  style={{ left: `${lo}%`, width: `${hi - lo}%` }}
                />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
});
