import { useState } from "react";
import { cn } from "@/design-system/cn";
import { Panel } from "@/design-system/glass/Panel";
import { GlassButton } from "@/design-system/glass/GlassButton";
import { ProgressBar } from "@/design-system/components/ProgressBar";
import { Heatmap } from "@/design-system/components/Heatmap";
import { Skeleton } from "@/design-system/components/Skeleton";
import { Empty, ErrorBlock } from "@/design-system/components/Empty";
import {
  Token,
  TokenCount,
  MysteryBox,
  Streak,
  CompanionHead,
  AccessoryIcon,
  ACCESSORY_NAMES,
  type AccessoryId,
} from "@/design-system/marks";
import { TODAY, BOX_COST, practiceDays } from "@/mock";
import { StudentShell, TextLink, withStudent } from "./Shell";
import { BoxOpen } from "./BoxOpen";
import { useStudentView } from "./view";
import { retry } from "./nav";

/*
 * Rewards, carried over from the end screen: gold tokens and the balance, one
 * mystery box at a time (open now or save for later), the fox and its
 * wardrobe (wear it or keep it, never worn by itself), the companions earned
 * from achievements, and days in a row. Tokens and the medal stay gold in
 * every theme; everything else takes the theme's accent.
 */
const ALL: AccessoryId[] = ["glasses", "cap", "headphones", "scarf", "bow"];
const OWL_DAYS = 7;

function Rewards() {
  const v = useStudentView();
  const r = v.rewards;
  const [tokens, setTokens] = useState(r?.tokens ?? 0);
  const [boxes, setBoxes] = useState(r?.boxes ?? 0);
  const [owned, setOwned] = useState<AccessoryId[]>(r?.owned ?? []);
  const [wearing, setWearing] = useState<AccessoryId | undefined>(r?.wearing);
  const [opening, setOpening] = useState<AccessoryId | null>(null);
  const [saved, setSaved] = useState(false);
  const prize = ALL.find((a) => !owned.includes(a)) ?? "bow";
  const owl = (r?.streak ?? 0) >= OWL_DAYS;
  const days = v.quiet ? [] : practiceDays(v.student.id);
  const toNext = tokens % BOX_COST;

  if (v.loading)
    return (
      <StudentShell screen="rewards" title="Rewards">
        <Panel className="grid gap-4 p-4">
          <Skeleton.Kpi label="Tokens" lead />
          <Skeleton.Block height={120} />
          <Skeleton.Row />
        </Panel>
      </StudentShell>
    );

  return (
    <StudentShell screen="rewards" title="Rewards">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="grid gap-5">
          <Panel as="section" aria-label="Tokens and boxes" className="grid gap-4 p-4 sm:p-5">
            {v.error ? (
              // The balance failed to load; the fox, the companions and the days keep their last good data.
              <ErrorBlock what="your token balance" lastGood="9:14" onRetry={retry} />
            ) : null}
            <div className="grid gap-1">
              <p className="text-dense text-muted">Tokens</p>
              <p className="tabular inline-flex items-center gap-2 text-kpi-lg text-gold">
                <Token size={28} />
                {tokens.toLocaleString("en-US")}
              </p>
              {r?.tokensToday ? (
                <p className="text-dense text-positive">+{r.tokensToday} today</p>
              ) : null}
            </div>
            {opening ? (
              <BoxOpen
                prize={opening}
                onWear={() => {
                  setWearing(opening);
                  setOpening(null);
                }}
                onKeep={() => setOpening(null)}
              />
            ) : boxes > 0 ? (
              <div className="grid items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                <MysteryBox size={120} />
                <div className="grid gap-3">
                  <p className="text-body font-semibold">A mystery box is waiting.</p>
                  <p className="text-dense text-muted">
                    One at a time. Inside: something for the fox.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <GlassButton
                      variant="primary"
                      className="k-sheen"
                      onClick={() => {
                        setOpening(prize);
                        setOwned((o) => [...o, prize]);
                        setBoxes((b) => b - 1);
                        setTokens((t) => t - BOX_COST);
                        setSaved(false);
                      }}
                    >
                      Open it now
                    </GlassButton>
                    {saved ? (
                      <span className="text-dense text-muted">Saved for later</span>
                    ) : (
                      <TextLink onClick={() => setSaved(true)}>Save it for later</TextLink>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <ProgressBar
                value={toNext}
                max={BOX_COST}
                label="Next mystery box"
                endLabel={`${toNext} of ${BOX_COST}`}
              />
            )}
          </Panel>
          <Panel as="section" aria-label="The fox" className="grid gap-4 p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <CompanionHead
                animal="fox"
                accessory={wearing}
                size={96}
                mood={wearing ? "h" : "n"}
              />
              <div>
                <h2 className="text-section">The fox</h2>
                <p className="text-dense text-muted">
                  {wearing
                    ? `Wearing the ${ACCESSORY_NAMES[wearing].toLowerCase()}`
                    : "Wearing nothing"}
                </p>
              </div>
            </div>
            {owned.length ? (
              <div
                role="radiogroup"
                aria-label="Wardrobe"
                className="grid grid-cols-3 gap-2 sm:grid-cols-4"
              >
                {owned.map((a) => {
                  const on = wearing === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setWearing(on ? undefined : a)}
                      className={cn(
                        "grid min-h-tap justify-items-center gap-1 rounded-card border p-2 text-dense",
                        on ? "border-accent bg-accent/10" : "border-line hover:border-border"
                      )}
                    >
                      <AccessoryIcon id={a} size={48} />
                      <span>{ACCESSORY_NAMES[a]}</span>
                      <span className="text-small text-muted">{on ? "Wearing" : "Wear"}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Empty
                title="The wardrobe is empty"
                detail={`Mystery boxes hold the fox's things. The first costs ${BOX_COST} tokens.`}
              />
            )}
          </Panel>
        </div>
        <div className="grid gap-5">
          <Panel as="section" aria-label="Companions" className="grid gap-3 p-4">
            <h2 className="text-section">Companions</h2>
            <div className="flex items-center gap-3">
              <CompanionHead animal="fox" size={56} accessory={wearing} />
              <p className="text-body font-semibold">The fox</p>
            </div>
            <div className="flex items-center gap-3">
              <CompanionHead
                animal="owl"
                size={56}
                mood={owl ? "n" : "h"}
                className={owl ? "" : "opacity-40"}
              />
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold">The owl</p>
                {owl ? (
                  <p className="text-dense text-muted">Earned for {OWL_DAYS} days in a row</p>
                ) : (
                  <ProgressBar
                    value={r?.streak ?? 0}
                    max={OWL_DAYS}
                    label={`${OWL_DAYS} days in a row to earn`}
                    endLabel={`${r?.streak ?? 0} of ${OWL_DAYS}`}
                  />
                )}
              </div>
            </div>
          </Panel>
          <Panel as="section" aria-label="Days in a row" className="grid gap-3 p-4">
            {r?.streak ? (
              <Streak days={r.streak} />
            ) : (
              <p className="text-dense text-muted">No days in a row yet.</p>
            )}
            <Heatmap data={days} end={TODAY} weeks={12} />
          </Panel>
          <p className="px-1 text-dense text-muted">
            <TokenCount value={10} size={16} className="text-dense" /> a right answer, 15 when it
            was hard. A box costs {BOX_COST}.
          </p>
        </div>
      </div>
    </StudentShell>
  );
}

export default withStudent(Rewards);
