import { useRef, useState, type RefObject } from "react";
import { MysteryBox, AccessoryIcon, ACCESSORY_NAMES } from "@/design-system/marks";
import type { AccessoryId } from "@/design-system/marks/accessories";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { useConfetti } from "@/design-system/components/Confetti";
import { EASE } from "@/design-system/motion";
import { Pet, type PetHandle } from "../companion/Pet";
import { Rays } from "../pieces/Rays";
import { Cubes, type Cube } from "../pieces/Cubes";
import { fadeIn, useScript, waitTap, type Run } from "../run";
import { SFX } from "../sfx";

/*
 * The mystery box, in place (Crossy Road's feel): it drops, bounces, hops while
 * it waits, and the student taps it open. It bursts into blocks, the prize turns
 * once in its rays, then the fox steps into the light wearing it. Wear it or
 * keep it for later is a real tap; nothing is put on for them.
 */
export type Choice = "wear" | "keep";

export function MysteryBoxMoment({
  prize,
  size,
  startAt,
  fox,
  touch,
  onChoice,
  onTitle,
}: {
  prize: AccessoryId;
  size: number;
  startAt: "drop" | "prize";
  fox: RefObject<PetHandle | null>;
  touch: boolean;
  onChoice(c: Choice): void;
  /** The page title follows the moment: the box at the drop, the find when the prize appears. */
  onTitle(t: string): void;
}) {
  const box = useRef<HTMLButtonElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const prizeEl = useRef<HTMLDivElement>(null);
  const item = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLDivElement>(null);
  const acts = useRef<HTMLDivElement>(null);
  const pv = useRef<PetHandle>(null);
  const tap = useRef<(() => void) | null>(null);
  const pick = useRef<((c: Choice) => void) | null>(null);
  type Stage = "box" | "prize" | "preview" | "done";
  const [stage, setStage] = useState<Stage>(startAt === "prize" ? "prize" : "box");
  const [label, setLabel] = useState("New accessory");
  const [cubes, setCubes] = useState<Cube[]>([]);
  const [deciding, setDeciding] = useState(false);
  const confetti = useConfetti();
  const ps = Math.round(size * 0.9); // the prize's stage, a little under the box

  const hop = async (run: Run, waiting: { on: boolean }) => {
    const svg = box.current?.querySelector("svg");
    while (waiting.on && run.alive()) {
      await run.wait(900);
      if (!waiting.on) break;
      run.anim(
        svg,
        [
          { transform: "none" },
          { transform: "translateY(-8px) scale(.98,1.03)", offset: 0.4 },
          { transform: "scale(1.03,.97)", offset: 0.8 },
          { transform: "none" },
        ],
        { duration: 520, easing: "ease-out" }
      );
    }
  };

  useScript(async (run) => {
    if (startAt === "drop") {
      onTitle("Your mystery box");
      const b = box.current;
      await run.spring(
        -420,
        0,
        (v) => b && (b.style.transform = `translateX(-50%) translateY(${v}px)`),
        0.42,
        0.62
      );
      SFX.thud();
      fadeIn(run, hint.current);
      const waiting = { on: true };
      void hop(run, waiting).catch(() => {});
      await run.wait(1100);
      await waitTap<void>(run, (res) => (tap.current = res));
      waiting.on = false;
      const svg = b?.querySelector("svg");
      svg?.getAnimations().forEach((a) => a.cancel());
      if (hint.current) hint.current.style.opacity = "0";
      const shake = run.anim(
        svg,
        [
          { transform: "none" },
          { transform: "rotate(-5deg)" },
          { transform: "rotate(4deg)" },
          { transform: "rotate(-3deg)" },
          { transform: "none" },
        ],
        { duration: 420, easing: "ease-in-out" }
      );
      await (shake?.finished.catch(() => {}) ?? Promise.resolve());
      SFX.open();
      if (b) b.style.opacity = "0";
      const n = 16;
      setCubes(
        Array.from({ length: n }, (_, i) => ({
          id: i,
          s: size * (0.14 + (i % 3) * 0.04),
          x: 0.2 + ((i * 37) % 60) / 100,
          y: 0.15 + ((i * 53) % 65) / 100,
          a: (i / n) * Math.PI * 2,
          d: size * (0.5 + (i % 4) * 0.12),
          dir: i % 2 ? 1 : -1,
        }))
      );
      setStage("prize");
      await run.wait(30); // the prize mounts with the stage; its ref is read after the commit
    }
    const p = prizeEl.current;
    await run.spring(
      0,
      1,
      (k) => {
        if (!p) return;
        p.style.transform = `translate(-50%, -62%) scale(${k})`;
        p.style.opacity = String(Math.min(1, k * 3));
      },
      0.42,
      0.6
    );
    SFX.chime();
    onTitle(`You found ${ACCESSORY_NAMES[prize].toLowerCase()}`);
    if (p) confetti.fire("prize", p);
    fadeIn(run, name.current);
    const inner = item.current;
    await run.tween(1500, (k) => {
      const v = Math.cos(k * Math.PI * 4);
      if (inner)
        inner.style.transform = `scaleX(${(v < 0 ? -1 : 1) * Math.max(0.06, Math.abs(v))})`;
    });
    if (inner) inner.style.transform = "none";
    await run.wait(300);
    // the preview: their own fox steps into the glow wearing it
    run.anim(
      inner,
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "scale(.6)" },
      ],
      { duration: 260, fill: "forwards" }
    );
    run.anim(fox.current?.el, [{ opacity: 1 }, { opacity: 0 }], {
      duration: 260,
      fill: "forwards",
    });
    setStage("preview");
    setLabel("Preview on your fox");
    await run.wait(30);
    run.anim(
      pv.current?.el,
      [
        { opacity: 0, transform: "translate(-50%, -50%) translateY(16px) scale(.9)" },
        { opacity: 1, transform: "translate(-50%, -50%)" },
      ],
      { duration: 420, easing: EASE, fill: "backwards" }
    );
    fadeIn(run, acts.current, 150);
    setDeciding(true);
    const choice = await waitTap<Choice>(run, (res) => (pick.current = res));
    setDeciding(false);
    if (choice === "wear") {
      SFX.pop();
      pv.current?.cheer();
      if (pv.current?.el) confetti.fire("level", pv.current.el);
      await run.wait(1200);
    } else {
      pv.current?.wear(undefined);
      setLabel("Saved to your collection");
      await run.wait(1100);
    }
    [prizeEl.current, name.current, acts.current].forEach((e) =>
      run.anim(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" })
    );
    if (choice === "wear") fox.current?.wear(prize, false);
    run.anim(fox.current?.el, [{ opacity: 0 }, { opacity: 1 }], {
      duration: 300,
      fill: "forwards",
    });
    await run.wait(320);
    setStage("done");
    onChoice(choice);
  });
  const top = "44%";
  return (
    <>
      {stage === "box" ? (
        <>
          <button
            ref={box}
            type="button"
            onClick={() => tap.current?.()}
            aria-label="Open the mystery box"
            className="my-box absolute left-1/2 z-[30] block cursor-pointer rounded-panel focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-accent"
            style={{
              top,
              width: size,
              transform: "translateX(-50%) translateY(-420px)",
              translate: "0 -60%",
            }}
          >
            <MysteryBox size={size} />
          </button>
          <div
            ref={hint}
            className="absolute left-1/2 z-[31] text-dense text-muted"
            style={{ top: `calc(${top} + ${size * 0.62}px)`, opacity: 0, translate: "-50% 0" }}
            aria-hidden="true"
          >
            Tap to open
          </div>
        </>
      ) : null}
      <Cubes cubes={cubes} size={size} top={top} onDone={() => setCubes([])} />
      {stage !== "box" && stage !== "done" ? (
        <>
          <div
            ref={prizeEl}
            className="absolute left-1/2 z-[31]"
            style={{
              top,
              width: ps,
              height: ps,
              transform: "translate(-50%, -62%) scale(0)",
              opacity: 0,
            }}
          >
            <Rays />
            <div ref={item} className="absolute inset-0 grid place-items-center">
              <AccessoryIcon id={prize} size={Math.round(ps * 0.74)} />
            </div>
            {stage === "preview" ? (
              <Pet
                ref={pv}
                animal="fox"
                mood="h"
                accessory={prize}
                size={Math.round(ps * 0.82)}
                touch={touch}
                className="absolute left-1/2 top-[52%] z-[2]"
                style={{ transform: "translate(-50%, -50%)" }}
              />
            ) : null}
          </div>
          <div
            ref={name}
            className="absolute left-1/2 z-[31] grid justify-items-center whitespace-nowrap text-center"
            style={{ top: `calc(${top} + ${size * 0.42}px)`, opacity: 0, translate: "-50% 0" }}
          >
            <span className="text-dense text-muted">{label}</span>
            <b className="block text-[24px] font-semibold tracking-[-0.01em]">
              {ACCESSORY_NAMES[prize]}
            </b>
          </div>
          {stage === "preview" ? (
            <div
              ref={acts}
              className="absolute left-1/2 z-[31] flex items-center gap-5 whitespace-nowrap"
              style={{
                top: `calc(${top} + ${size * 0.42 + 64}px)`,
                opacity: 0,
                translate: "-50% 0",
              }}
            >
              <GlassButton
                variant="primary"
                disabled={!deciding}
                onClick={() => pick.current?.("wear")}
              >
                Wear it
              </GlassButton>
              <button
                type="button"
                disabled={!deciding}
                onClick={() => pick.current?.("keep")}
                className="min-h-tap border-b border-border px-0.5 text-dense font-semibold text-text transition-colors hover:border-text disabled:opacity-50"
              >
                Keep for later
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
