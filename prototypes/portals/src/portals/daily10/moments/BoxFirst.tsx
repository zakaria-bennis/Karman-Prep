import { useRef, useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { BoxIcon, Token } from "@/design-system/marks";
import type { AccessoryId } from "@/design-system/marks/accessories";
import { Pet, type PetHandle } from "../companion/Pet";
import { TokenPill } from "../pieces/TokenPill";
import { RollingNumber } from "../pieces/RollingNumber";
import { SoundToggle, ReplayLink } from "../pieces/controls";
import { MysteryBoxMoment, type Choice } from "./MysteryBoxMoment";
import { fadeIn, leave, useScript, waitTap, type Run } from "../run";
import { SFX } from "../sfx";
import type { Daily10Data } from "../mock";
import type { Flyer } from "../pieces/TokenPill";

/*
 * Box first: when today's tokens reach a box, the box comes before the results.
 * The tokens earned count up and fly to the corner counter with the payout
 * sound; the title becomes "Enough for a mystery box"; the fox and the offer
 * arrive; Open or Save for later is a real tap. The offer carries one light
 * travelling its edge while it waits (Border Beam, 21st.dev 23408).
 */
export interface BoxResult {
  box: "opened" | "saved";
  wear?: AccessoryId;
}

export function BoxFirst({
  data,
  startAt,
  fly,
  onDone,
  onReplay,
  touch,
  phone,
}: {
  data: Daily10Data;
  startAt: "earn" | "prize";
  fly: Flyer;
  onDone(r: BoxResult): void;
  onReplay(): void;
  touch: boolean;
  phone: boolean;
}) {
  const page = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const earned = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLDivElement>(null);
  const boxCounter = useRef<HTMLDivElement>(null);
  const offer = useRef<HTMLDivElement>(null);
  const offerIcon = useRef<HTMLSpanElement>(null);
  const fox = useRef<PetHandle>(null);
  const choose = useRef<((c: "open" | "save") => void) | null>(null);
  const [earnedN, setEarnedN] = useState(0);
  const [balance, setBalance] = useState(data.tokensBefore);
  const [titleText, setTitleText] = useState(
    startAt === "prize" ? "Your mystery box" : `You earned ${data.tokensToday} tokens`
  );
  const [stage, setStage] = useState<"earn" | "offer" | "box" | "saved">(
    startAt === "prize" ? "box" : "earn"
  );
  const [boxes, setBoxes] = useState(0);
  const prizeDone = useRef<((c: Choice) => void) | null>(null);

  useScript(async (run) => {
    if (startAt === "earn") {
      fadeIn(run, title.current);
      fadeIn(run, earned.current, 150);
      await run.count(0, data.tokensToday, 700, (v) => setEarnedN(Math.round(v)));
      await run.wait(300);
      const coin = counter.current?.querySelector(".tk-icon");
      if (earned.current && coin)
        await Promise.all([
          fly(run, earned.current, coin, {}),
          (async () => {
            await run.wait(560);
            await run.count(data.tokensBefore, data.tokens, 14 * 50 + 80, (v) =>
              setBalance(Math.round(v))
            );
          })(),
        ]);
      run.anim(earned.current, [{ opacity: 1 }, { opacity: 0 }], {
        duration: 300,
        fill: "forwards",
      });
      setTitleText("Enough for a mystery box");
      setStage("offer");
      await run.wait(30);
      fadeIn(run, fox.current?.el, 200);
      fadeIn(run, offer.current);
      await run.wait(800);
      const choice = await waitTap<"open" | "save">(run, (res) => (choose.current = res));
      if (choice === "save") {
        await save(run);
        return;
      }
      run.anim(offer.current, [{ opacity: 1 }, { opacity: 0 }], {
        duration: 250,
        fill: "forwards",
      });
      void run.count(data.tokens, data.tokensAfter, 420, (v) => setBalance(Math.round(v)));
      setStage("box");
    } else setBalance(data.tokensAfter);
    const c = await waitTap<Choice>(run, (res) => (prizeDone.current = res));
    setBalance(data.tokensAfter);
    await run.wait(400);
    await leave(run, page.current);
    onDone({ box: "opened", wear: c === "wear" ? data.prize : data.wearing });
  });

  // saved: the tokens pay for it, and the box flies up to a counter in the corner, which then slips away
  const save = async (run: Run) => {
    void run.count(data.tokens, data.tokensAfter, 420, (v) => setBalance(Math.round(v)));
    setStage("saved");
    await run.wait(30);
    run.anim(
      boxCounter.current,
      [
        { opacity: 0, transform: "translateY(-8px) scale(.9)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 300, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" }
    );
    const from = offerIcon.current;
    const to = boxCounter.current?.querySelector(".tk-icon");
    run.anim(offer.current, [{ opacity: 1 }, { opacity: 0, transform: "translateY(6px)" }], {
      duration: 300,
      fill: "forwards",
    });
    if (from && to) {
      from.style.visibility = "hidden";
      await fly(run, from, to, { n: 1, ms: 640, kind: "box" });
    }
    SFX.pop();
    setBoxes(1);
    run.anim(
      boxCounter.current,
      [{ transform: "scale(1)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }],
      { duration: 260 }
    );
    await run.wait(1100);
    const out = run.anim(
      boxCounter.current,
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "translateY(-14px)" },
      ],
      { duration: 360, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }
    );
    await (out?.finished.catch(() => {}) ?? Promise.resolve());
    await run.wait(300);
    await leave(run, page.current);
    onDone({ box: "saved", wear: data.wearing });
  };

  // the stage: on a phone it grows so the offer sits in thumb reach and the fox comes down to it;
  // on an iPad or desktop it is short, so the card follows the fox directly
  const areaH = phone ? 430 : 300;
  return (
    <div
      ref={page}
      className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain"
    >
      <div
        className={`relative flex min-h-full flex-col items-center px-5 pb-[calc(24px+env(safe-area-inset-bottom))] ${phone ? "pt-[110px]" : "pt-[54px]"}`}
      >
        <div
          className={`absolute left-4 z-[3] flex items-center gap-2 ${phone ? "top-[54px]" : "top-4"}`}
        >
          <SoundToggle />
          <ReplayLink onReplay={onReplay} />
        </div>
        <div
          className={`absolute z-[3] flex items-center gap-2 ${phone ? "right-[18px] top-[58px]" : "right-[26px] top-[22px]"}`}
        >
          {stage === "saved" ? (
            <TokenPill
              ref={boxCounter}
              value={boxes}
              icon="box"
              size={phone ? "sm" : "md"}
              style={{ opacity: 0 }}
            />
          ) : null}
          <TokenPill ref={counter} value={balance} size={phone ? "sm" : "md"} />
        </div>
        <h1
          ref={title}
          className={`text-center font-semibold tracking-[-0.02em] ${phone ? "text-[24px] leading-[1.2]" : "text-[30px] leading-[1.2]"}`}
          style={{ opacity: startAt === "prize" ? 1 : 0 }}
        >
          {titleText}
        </h1>
        {stage === "earn" ? (
          <div
            ref={earned}
            className={`absolute left-1/2 z-[2] inline-flex items-center gap-2 font-semibold ${phone ? "top-[196px] text-[38px]" : "top-[150px] text-[44px]"}`}
            style={{ opacity: 0, translate: "-50% 0" }}
          >
            <span className="tk-icon flex items-center">
              <Token size={36} />
            </span>
            <RollingNumber value={`+${earnedN}`} />
          </div>
        ) : null}
        <div
          // on a phone the stage grows so the offer sits in thumb reach; larger screens keep it mid-screen
          className={`relative mt-[18px] w-full ${phone ? "flex-1" : ""}`}
          style={phone ? { maxWidth: 820, minHeight: areaH } : { maxWidth: 820, height: areaH }}
        >
          {stage !== "earn" ? (
            <Pet
              ref={fox}
              animal="fox"
              mood="h"
              accessory={data.wearing}
              size={phone ? 104 : 132}
              touch={touch}
              className="bf-fox absolute"
              style={{
                opacity: startAt === "prize" ? 1 : 0,
                // the fox has the stage to itself while the offer waits; it steps aside for the box
                ...(stage === "box"
                  ? phone
                    ? { left: "calc(100% - 104px)", top: "calc(100% - 118px)", translate: "0 0" }
                    : { left: "calc(98% - 132px)", top: "38%", translate: "0 0" }
                  : phone
                    ? { left: "50%", top: "calc(100% - 140px)", translate: "-50% -50%" }
                    : { left: "50%", top: "46%", translate: "-50% -50%" }),
              }}
            />
          ) : null}
          {stage === "box" ? (
            <MysteryBoxMoment
              prize={data.prize}
              size={phone ? 150 : 170}
              startAt={startAt === "prize" ? "prize" : "drop"}
              fox={fox}
              touch={touch}
              onChoice={(c) => prizeDone.current?.(c)}
              onTitle={setTitleText}
            />
          ) : null}
        </div>
        <div className={`grid min-h-[110px] justify-items-center ${phone ? "w-full" : ""}`}>
          {stage === "offer" || stage === "saved" ? (
            <div
              ref={offer}
              className={`relative grid gap-[14px] rounded-panel border p-4 ${phone ? "w-full" : "w-[360px] max-w-full"}`}
              style={{
                opacity: 0,
                background: "color-mix(in srgb, rgb(var(--k-accent)) 9%, rgb(var(--k-panel)))",
                borderColor: "rgb(var(--k-accent) / 0.25)",
              }}
            >
              {stage === "offer" ? <span className="k-beam" aria-hidden="true" /> : null}
              <div className="flex items-center gap-3">
                <span ref={offerIcon} className="tk-icon block shrink-0" style={{ width: 36 }}>
                  <BoxIcon size={36} />
                </span>
                <h2 className="text-body font-semibold">Mystery box ready</h2>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <GlassButton variant="primary" onClick={() => choose.current?.("open")}>
                  Open
                </GlassButton>
                <button
                  type="button"
                  onClick={() => choose.current?.("save")}
                  className="min-h-tap border-b border-border px-0.5 text-dense font-semibold text-text transition-colors hover:border-text"
                >
                  Save for later
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
