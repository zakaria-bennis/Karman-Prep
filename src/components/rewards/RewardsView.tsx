"use client";
/*
 * The Rewards page body: the token balance and the next box, the mystery box to open (tokens are
 * spent on the server, atomically), the companions earned and the accessories found. Choosing a
 * companion or an accessory saves it, and the companion cheers. A companion that joined since the
 * last visit gets its moment first. An admin previewing a student sees everything and can change
 * nothing.
 */
import { useEffect, useRef, useState } from "react";
import { Card, Cta, Num, Panel, Ring, SectionHeader } from "@/components/portal";
import { actionCompanionsSeen, actionWear } from "@/app/dashboard/student/rewards/actions";
import {
  ACCESSORIES,
  ACCESSORY_IDS,
  ANIMALS,
  ANIMAL_IDS,
  BOX_COST,
  type AccessoryId,
  type AnimalId,
} from "@/lib/rewards/catalog";
import { boxProgress, boxesAffordable, type RewardState } from "@/lib/rewards/economy";
import { Balance } from "./Balance";
import { CompanionMoment } from "./CompanionMoment";
import { Pet, type PetHandle } from "./companion/Pet";
import { AccessoryIcon, PrizeReveal } from "./PrizeReveal";
import { RewardBox } from "./RewardBox";
import { touchNow } from "./motion";
import { SFX } from "./sfx";
import s from "./rewards.module.css";

export function RewardsView({
  initial,
  preview,
}: {
  initial: RewardState | null;
  preview: boolean;
}) {
  if (!initial)
    return (
      <Panel>
        <Card>
          <SectionHeader title="Rewards" />
          <p className="kp-meta">Your rewards could not be loaded just now. Try again soon.</p>
        </Card>
      </Panel>
    );
  return <Rewards initial={initial} preview={preview} />;
}

function Rewards({ initial, preview }: { initial: RewardState; preview: boolean }) {
  const [state, setState] = useState(initial);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<AnimalId[]>(() =>
    preview ? [] : initial.companions.filter((c) => !c.seen).map((c) => c.animal)
  );
  const pet = useRef<PetHandle>(null);
  const [touch, setTouch] = useState(false);
  useEffect(() => setTouch(touchNow()), []);
  useEffect(() => {
    if (joining.length) void actionCompanionsSeen({ animals: joining }).catch(() => undefined);
    // Marked once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const box = boxProgress(state.balance);
  const owned = new Set(state.companions.map((c) => c.animal));
  const fresh = new Set(initial.companions.filter((c) => !c.seen).map((c) => c.animal));
  const { animal, accessory } = state.wear;

  async function choose(next: { animal: AnimalId; accessory: AccessoryId | null }) {
    if (preview) return setError("You're previewing this student, so changes are off.");
    const before = state.wear;
    setError(null);
    setState((st) => ({ ...st, wear: next }));
    SFX.pop();
    window.setTimeout(() => pet.current?.cheer(), 60);
    const r = await actionWear(next).catch(() => null);
    if (!r?.ok) {
      setState((st) => ({ ...st, wear: before }));
      setError(r && !r.ok ? r.error : "That could not be saved. Try again.");
    }
  }

  const companionNow = (
    <div className={s.heroPet}>
      <Pet
        ref={pet}
        animal={animal}
        stage="young"
        mood="h"
        accessory={accessory ?? undefined}
        size={112}
        touch={touch}
      />
      <small className="kp-meta">{ANIMALS[animal].name}</small>
    </div>
  );

  return (
    <Panel label="Your rewards">
      <Card label="Your tokens">
        {joining.length > 0 ? (
          <CompanionMoment
            key={joining[0]}
            animal={joining[0]}
            more={joining.length > 1}
            onDone={() => setJoining((j) => j.slice(1))}
          />
        ) : (
          <div className={s.hero}>
            <div className={s.heroText}>
              <SectionHeader title="Your tokens" />
              <span className={s.heroNum}>
                <Balance value={state.balance} />
              </span>
              <div className={s.heroRing}>
                <Ring
                  value={box.share}
                  size={52}
                  width={5}
                  label={`Next mystery box: ${Math.min(state.balance, BOX_COST)} of ${BOX_COST} tokens`}
                >
                  <Num>{Math.round(box.share * 100)}%</Num>
                </Ring>
                <p>
                  {box.ready ? (
                    <>
                      Enough for <Num>{boxesAffordable(state.balance)}</Num>{" "}
                      {boxesAffordable(state.balance) === 1 ? "box" : "boxes"}.
                    </>
                  ) : (
                    <>
                      <Num>{box.toGo}</Num> tokens to your next box.
                    </>
                  )}
                </p>
              </div>
              <p>Each right answer earns 10 tokens, a hard one 15.</p>
            </div>
            {companionNow}
          </div>
        )}
      </Card>

      <Card label="Mystery box">
        <SectionHeader
          title="Mystery box"
          note={state.boxesOpened > 0 ? `${state.boxesOpened} opened` : undefined}
        />
        {opening ? (
          <PrizeReveal
            animal={animal}
            onBalance={(balance) => setState((st) => ({ ...st, balance }))}
            onPrize={(p, worn) =>
              setState((st) => ({
                ...st,
                boxesOpened: worn ? st.boxesOpened : st.boxesOpened + 1,
                accessories:
                  p.kind === "accessory" && !st.accessories.includes(p.id)
                    ? [...st.accessories, p.id]
                    : st.accessories,
                wear: worn && p.kind === "accessory" ? { ...st.wear, accessory: p.id } : st.wear,
              }))
            }
            onDone={() => setOpening(false)}
          />
        ) : (
          <div className={s.boxCard}>
            <RewardBox tokens={false} wait={box.ready} />
            <p className="kp-meta">
              {box.ready
                ? `One box is ${BOX_COST} tokens. Inside: something new for your companion.`
                : `A box is ${BOX_COST} tokens. Keep answering and one will be ready.`}
            </p>
            <Cta onClick={() => setOpening(true)} disabled={!box.ready || preview}>
              Open a box
            </Cta>
          </div>
        )}
      </Card>

      <Card label="Companions">
        <SectionHeader title="Companions" note={`${owned.size} of ${ANIMAL_IDS.length}`} />
        <ul className={s.grid}>
          {ANIMAL_IDS.map((id) => {
            const have = owned.has(id);
            const drawing = (
              <Pet animal={id} stage="young" mood={have ? "h" : "n"} size={84} touch={touch} />
            );
            return (
              <li key={id}>
                {have ? (
                  <button
                    type="button"
                    className={s.tile}
                    aria-pressed={animal === id}
                    onClick={() => void choose({ animal: id, accessory })}
                  >
                    {fresh.has(id) && <span className={s.newTag}>New</span>}
                    {drawing}
                    <b>{ANIMALS[id].name}</b>
                    <small>{animal === id ? "With you now" : "Choose"}</small>
                  </button>
                ) : (
                  <div className={`${s.tile} ${s.locked}`}>
                    {drawing}
                    <b>{ANIMALS[id].name}</b>
                    <small>{ANIMALS[id].unlock}</small>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card label="Accessories">
        <SectionHeader
          title="Accessories"
          note={`${state.accessories.length} of ${ACCESSORY_IDS.length}`}
        />
        <ul className={s.grid}>
          <li>
            <button
              type="button"
              className={s.tile}
              aria-pressed={accessory === null}
              onClick={() => void choose({ animal, accessory: null })}
            >
              <span className={s.accIcon}>
                <span className={s.mystery} aria-hidden="true" />
              </span>
              <b>Nothing</b>
              <small>{accessory === null ? "Wearing" : "Take it off"}</small>
            </button>
          </li>
          {ACCESSORY_IDS.map((id) => {
            const have = state.accessories.includes(id);
            return (
              <li key={id}>
                {have ? (
                  <button
                    type="button"
                    className={s.tile}
                    aria-pressed={accessory === id}
                    onClick={() => void choose({ animal, accessory: id })}
                  >
                    <span className={s.accIcon}>
                      <AccessoryIcon id={id} size={68} />
                    </span>
                    <b>{ACCESSORIES[id].name}</b>
                    <small>{accessory === id ? "Wearing" : "Wear it"}</small>
                  </button>
                ) : (
                  <div className={s.tile}>
                    <span className={s.accIcon}>
                      <span className={s.mystery} aria-hidden="true">
                        ?
                      </span>
                    </span>
                    <b>Not found yet</b>
                    <small>In a mystery box</small>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
      </Card>
    </Panel>
  );
}
