"use client";
/*
 * A new companion gets its own moment, then it goes (the approved "Box first" ending, from the
 * founder's prototype moments/CompanionMoment.tsx): it springs up into thin turning rays, one warm
 * chord plays when sounds are on, the line arrives a word at a time and the reason under it. It
 * moves on by itself after a few seconds, or on Continue. Still: it all stands finished and waits
 * for Continue.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import { Cta } from "@/components/portal";
import { ANIMALS, type AnimalId } from "@/lib/rewards/catalog";
import { joinLine } from "@/lib/rewards/economy";
import { Pet, type PetHandle } from "./companion/Pet";
import { Rays } from "./RewardBox";
import { stillNow, touchNow } from "./motion";
import { SFX } from "./sfx";
import s from "./rewards.module.css";

export function CompanionMoment({
  animal,
  onDone,
  more = false,
}: {
  animal: AnimalId;
  onDone(): void;
  /** Another companion's moment follows this one. */
  more?: boolean;
}) {
  const pet = useRef<PetHandle>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const words = joinLine(animal).split(" ");

  useEffect(() => {
    SFX.companion();
    const still = stillNow();
    const cheer = window.setTimeout(() => pet.current?.cheer(), still ? 0 : 950);
    const leave = still ? 0 : window.setTimeout(() => done.current(), 4600);
    return () => {
      window.clearTimeout(cheer);
      if (leave) window.clearTimeout(leave);
    };
  }, [animal]);

  return (
    <section className={s.joins} aria-labelledby="joins-line">
      <div className={s.joinsStage}>
        <Rays />
        <Pet
          ref={pet}
          animal={animal}
          stage="young"
          mood="h"
          size={132}
          touch={touchNow()}
          className={s.joinsPet}
        />
      </div>
      <h2
        className={`kp-title ${s.joinsLine}`}
        id="joins-line"
        aria-live="polite"
        aria-label={words.join(" ")}
      >
        {words.map((w, i) => (
          <span key={i}>
            {i ? " " : ""}
            <span className={s.word} style={{ "--i": i } as CSSProperties}>
              {w}
            </span>
          </span>
        ))}
      </h2>
      <p className={s.joinsReason}>{ANIMALS[animal].reason}</p>
      <Cta onClick={() => done.current()}>{more ? "Next" : "Continue"}</Cta>
    </section>
  );
}
