import { useRef } from "react";
import { Medal } from "@/design-system/marks";
import { useConfetti } from "@/design-system/components/Confetti";
import { EASE } from "@/design-system/motion";
import { Pet, type PetHandle } from "../companion/Pet";
import { Rays } from "../pieces/Rays";
import { SoundToggle, ReplayLink } from "../pieces/controls";
import { fadeIn, leave, useScript } from "../run";
import { SFX } from "../sfx";
import type { Daily10Data } from "../mock";

/*
 * A new companion gets its own moment, then it goes; it never sits beside the
 * fox. The owl springs up into thin turning rays, the chord plays once, the
 * line arrives a word at a time (Blur In Text, 21st.dev 19228), and the medal
 * beside it comes from Achievement Unlocked (21st.dev 13045); its pill was
 * dropped (no badge above a headline).
 */
export function CompanionMoment({
  data,
  onDone,
  onReplay,
  touch,
  phone,
  hold = false,
}: {
  data: Daily10Data;
  onDone(): void;
  onReplay(): void;
  touch: boolean;
  phone: boolean;
  /** Stay on the moment (the standalone route), instead of leaving for the next phase. */
  hold?: boolean;
}) {
  const page = useRef<HTMLDivElement>(null);
  const rays = useRef<HTMLDivElement>(null);
  const owl = useRef<PetHandle>(null);
  const text = useRef<HTMLDivElement>(null);
  const confetti = useConfetti();
  const line = "The owl joins your journey".split(" ");
  // no pill above the title: the medal sits beside it, the reason in the line under it

  useScript(async (run) => {
    const el = owl.current?.el;
    run.anim(
      rays.current,
      [
        { opacity: 0, transform: "scale(.6)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 700, easing: EASE, fill: "backwards" }
    );
    SFX.companion();
    await run.spring(
      0,
      1,
      (k) => {
        if (!el) return;
        el.style.transform = `translateY(${(1 - k) * 60}px) scale(${0.4 + 0.6 * k})`;
        el.style.opacity = String(Math.min(1, k * 2));
      },
      0.5,
      0.62
    );
    if (el) confetti.fire("companion", el);
    Array.from(text.current?.children ?? []).forEach((t, i) => fadeIn(run, t, i * 110));
    owl.current?.cheer();
    await run.wait(2600);
    if (hold) return;
    await leave(run, page.current);
    onDone();
  });

  return (
    <div
      ref={page}
      className="absolute inset-0 grid place-items-center overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-10 text-center"
    >
      <div
        className={`absolute left-4 z-[2] flex items-center gap-2 ${phone ? "top-[54px]" : "top-4"}`}
      >
        <SoundToggle />
        <ReplayLink onReplay={onReplay} />
      </div>
      <div className="grid justify-items-center">
        <div
          className="relative grid place-items-center"
          style={{ width: phone ? 180 : 220, height: phone ? 180 : 220, marginBottom: 6 }}
        >
          <div ref={rays} className="pointer-events-none absolute" style={{ inset: "-40%" }}>
            <Rays />
          </div>
          <Pet
            ref={owl}
            animal="owl"
            mood="h"
            size={phone ? 120 : 150}
            touch={touch}
            className="relative"
            style={{ opacity: 0 }}
          />
        </div>
        <div ref={text} className="relative z-[1] grid justify-items-center gap-[6px]">
          <h1
            className={`inline-flex items-center gap-2 font-semibold tracking-[-0.02em] ${phone ? "text-[25px] leading-[1.15]" : "text-[30px] leading-[1.15]"}`}
            style={{ opacity: 0 }}
          >
            <Medal size={phone ? 24 : 28} className="shrink-0" />
            <span>
              {line.map((w, i) => (
                <span key={i}>
                  {i ? " " : ""}
                  <span
                    className="k-word"
                    style={{ "--i": i, "--d": "350ms" } as React.CSSProperties}
                  >
                    {w}
                  </span>
                </span>
              ))}
            </span>
          </h1>
          <p className="text-[16px] text-muted" style={{ opacity: 0 }}>
            A new companion, for {data.streak} days in a row
          </p>
        </div>
      </div>
    </div>
  );
}
