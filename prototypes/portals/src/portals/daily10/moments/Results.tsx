import { useRef, useState } from "react";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { Row } from "@/design-system/components/Row";
import { useConfetti } from "@/design-system/components/Confetti";
import type { AccessoryId } from "@/design-system/marks/accessories";
import type { MockState } from "@/mock";
import { Pet, cheerAll, type PetHandle } from "../companion/Pet";
import { type Flyer } from "../pieces/TokenPill";
import { ResultsBar } from "../pieces/ResultsBar";
import { ScoreGauge } from "../pieces/ScoreGauge";
import { AnswerPath } from "../pieces/AnswerPath";
import { ReviewSheet } from "../pieces/ReviewSheet";
import { SkillsSheet } from "../pieces/SkillsSheet";
import { ReplayLink, Shimmer } from "../pieces/controls";
import { Skills, type SkillsHandle } from "./Skills";
import { fadeIn, useScript } from "../run";
import { SFX } from "../sfx";
import { toStudent } from "../nav";
import { reviewFor, type Daily10Data } from "../mock";

/*
 * The results: one calm column. How today went (the fox wearing only what
 * she chose, the score in its gauge, each section, the answer path), then
 * the one next step (Practice, with the weakest skill preselected), then the
 * skills that moved. Streak and tokens sit quietly in the top bar; Done goes
 * home. It fits on one iPhone screen. Embedded (behind a plan lock) it renders
 * in flow without its bar, so the bar stays live outside the lock.
 */
export function Results({
  data,
  box,
  wear,
  mode,
  still = false,
  embedded = false,
  fly,
  onReplay,
  touch,
  phone,
  narrow,
}: {
  data: Daily10Data;
  box: "opened" | "saved" | null;
  wear?: AccessoryId;
  mode: MockState;
  still?: boolean;
  embedded?: boolean;
  fly?: Flyer;
  onReplay(): void;
  touch: boolean;
  phone: boolean;
  narrow: boolean;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const fox = useRef<PetHandle>(null);
  const big = useRef<HTMLDivElement>(null);
  const split = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLElement>(null);
  const skills = useRef<SkillsHandle>(null);
  const confetti = useConfetti();
  const [score, setScore] = useState(still ? data.right : 0);
  const [done, setDone] = useState(still);
  const [shown, setShown] = useState(still ? data.total : 0);
  const [balance, setBalance] = useState(box || still ? data.tokensAfter : data.tokensBefore);
  const [review, setReview] = useState<number | null>(null);
  const [allSkills, setAllSkills] = useState(false);
  const hidden = still ? undefined : { opacity: 0 };

  useScript(
    async (run) => {
      if (still) return;
      fadeIn(run, bar.current);
      fadeIn(run, fox.current?.el);
      await run.wait(200);
      for (let i = 1; i <= data.right; i++) {
        setScore(i);
        await run.wait(150);
      }
      SFX.score();
      cheerAll();
      setDone(true);
      if (big.current) confetti.fire("score", big.current);
      await run.wait(300);
      fadeIn(run, split.current);
      for (let i = 1; i <= data.total; i++) {
        setShown(i);
        await run.wait(30);
      }
      fadeIn(run, next.current);
      await run.wait(400);
      // with no box today, the tokens land in the top bar now
      const coin = pill.current?.querySelector(".tk-icon");
      if (!box && fly && big.current && coin && data.tokensToday > 0)
        await Promise.all([
          fly(run, big.current, coin, {}),
          (async () => {
            await run.wait(560);
            await run.count(data.tokensBefore, data.tokens, 14 * 50 + 80, (v) =>
              setBalance(Math.round(v))
            );
          })(),
        ]);
      await skills.current?.play(run, (m) => {
        fox.current?.mood(m);
        setTimeout(() => fox.current?.mood("h"), 700);
      });
    },
    [still]
  );

  const miss = data.misses.length;
  const first = data.first;
  return (
    <div
      className={
        embedded
          ? "relative"
          : "absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain"
      }
    >
      {embedded ? null : (
        <ResultsBar
          ref={bar}
          streak={data.streak}
          balance={balance}
          pill={pill}
          home={toStudent("home")}
          phone={phone}
          narrow={narrow}
          style={hidden}
        />
      )}
      <div
        className={`mx-auto grid w-full ${phone ? "gap-6 px-[18px] pb-[calc(24px+env(safe-area-inset-bottom))] pt-1" : narrow ? "gap-[34px] px-10 pb-7 pt-1" : "gap-x-14 gap-y-[34px] px-10 pb-7 pt-1"}`}
        style={{
          maxWidth: narrow ? 640 : 1000,
          gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)",
          gridTemplateAreas: narrow ? `"hero" "next" "sk"` : `"hero hero" "next sk"`,
          alignContent: "start",
        }}
      >
        <section
          className="grid justify-items-center gap-[6px] text-center"
          style={{ gridArea: "hero" }}
        >
          <Pet
            ref={fox}
            animal="fox"
            mood="h"
            accessory={wear}
            size={phone ? 58 : 72}
            touch={touch}
            style={hidden}
          />
          <h1 className="text-[19px] font-semibold tracking-[-0.01em]">
            {first ? "Your first Daily 10 is done" : "Your Daily 10 is done"}
          </h1>
          <ScoreGauge value={score} total={data.total} done={done} size={phone ? 138 : 176}>
            <div
              ref={big}
              className={`tabular font-semibold leading-none tracking-[-0.035em] ${phone ? "text-[52px]" : "text-[66px]"}`}
            >
              {score}
            </div>
            <div className={`font-medium text-muted ${phone ? "text-[13px]" : "text-[15px]"}`}>
              of {data.total}
            </div>
          </ScoreGauge>
          <div
            ref={split}
            className="flex flex-wrap justify-center gap-x-[26px] gap-y-[6px]"
            style={hidden}
          >
            {data.split.map((s) => (
              <span key={s.section} className="inline-flex items-baseline gap-2">
                <span className="text-[12.5px] font-medium tracking-[0.01em] text-muted">
                  {s.section}
                </span>
                <b className="tabular text-[16px] font-semibold">
                  {s.right} of {s.total}
                </b>
              </span>
            ))}
          </div>
          <div className={`w-full ${phone ? "mt-3" : "mt-[18px]"}`}>
            <AnswerPath
              answers={data.answers}
              shown={shown}
              runEnd={data.runEnd}
              onPick={setReview}
              phone={phone}
            />
          </div>
        </section>
        <section
          ref={next}
          className="grid content-start gap-3"
          style={{ gridArea: "next", ...hidden }}
        >
          <h2 className="text-[12.5px] font-medium tracking-[0.01em] text-muted">Your next step</h2>
          {data.weakest ? (
            <Shimmer className="w-full">
              <GlassButton
                variant="primary"
                className={`h-auto min-h-[58px] w-full whitespace-normal px-6 py-3 text-center leading-[1.25] ${phone ? "text-[16px]" : "text-[17px]"}`}
                onClick={() =>
                  (location.hash = toStudent("practice", { skill: data.weakest?.id ?? "" }))
                }
              >
                Practice {data.weakest.label.toLowerCase()}
              </GlassButton>
            </Shimmer>
          ) : null}
          {miss ? (
            <Row
              title={`Review the ${miss} you missed`}
              trailing={data.misses.join(", ")}
              onPress={() => setReview(data.misses[0])}
              className="-mx-1"
            />
          ) : (
            <p className="text-body text-muted">You got every one right. Nothing to review.</p>
          )}
        </section>
        <Skills
          ref={skills}
          data={data}
          mode={mode}
          still={still}
          onSeeAll={() => setAllSkills(true)}
        />
        <p className="text-center" style={{ gridColumn: "1 / -1" }}>
          <ReplayLink onReplay={onReplay} />
        </p>
      </div>
      <ReviewSheet
        answer={review === null ? null : reviewFor(data, review)}
        misses={data.misses}
        onClose={() => setReview(null)}
        onPick={setReview}
      />
      <SkillsSheet
        open={allSkills}
        onClose={() => setAllSkills(false)}
        moved={data.moved}
        levels={data.levels}
      />
    </div>
  );
}
