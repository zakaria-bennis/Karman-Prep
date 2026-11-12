"use client";
/*
 * Opening a mystery box (the founder's prototype moments/MysteryBoxMoment.tsx, in the portal's
 * look): the box rattles while the server spends the tokens and picks the prize, the lid knocks
 * open, the prize rises into the light and turns once, then the student's own companion steps in
 * wearing it. "Wear it" or "Keep it" is a real choice; nothing is put on for them. Once every
 * accessory is owned the box gives tokens back instead. Still: each step stands finished.
 */
import { useEffect, useRef, useState } from "react";
import { Cta } from "@/components/portal";
import { actionOpenBox, actionWear } from "@/app/dashboard/student/rewards/actions";
import { ACCESSORIES, ANIMALS, type AccessoryId, type AnimalId } from "@/lib/rewards/catalog";
import type { Prize } from "@/lib/rewards/economy";
import { ACCESSORY_ART, ACCESSORY_VIEWBOX } from "./accessories";
import { Pet, type PetHandle } from "./companion/Pet";
import { RewardBox, Rays, TokenIcon } from "./RewardBox";
import { stillNow, touchNow, wait } from "./motion";
import { SFX } from "./sfx";
import s from "./rewards.module.css";

export function AccessoryIcon({ id, size = 64 }: { id: AccessoryId; size?: number }) {
  return (
    <svg
      viewBox={ACCESSORY_VIEWBOX[id]}
      width={size}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ACCESSORY_ART[id] }}
    />
  );
}

type Stage = "opening" | "open" | "prize" | "preview" | "error";

export function PrizeReveal({
  animal,
  onBalance,
  onPrize,
  onDone,
}: {
  animal: AnimalId;
  /** The balance after this box (and its bonus, when it gave tokens back). */
  onBalance(balance: number): void;
  /** The prize, once it is known, and whether it is now worn. */
  onPrize(prize: Prize, worn: boolean): void;
  onDone(): void;
}) {
  const request = useRef<string>("");
  if (!request.current) request.current = crypto.randomUUID();
  const [stage, setStage] = useState<Stage>("opening");
  const [prize, setPrize] = useState<Prize | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pet = useRef<PetHandle>(null);
  const cb = useRef({ onBalance, onPrize, onDone });
  cb.current = { onBalance, onPrize, onDone };

  useEffect(() => {
    let live = true;
    (async () => {
      const started = performance.now();
      const result = await actionOpenBox({ requestId: request.current }).catch(() => null);
      if (!live) return;
      if (!result || !result.ok) {
        setError(result && !result.ok ? result.error : "The box stayed shut. Try again.");
        setStage("error");
        return;
      }
      // Let it rattle a moment, so the opening is felt even on a fast connection.
      const left = 650 - (performance.now() - started);
      if (left > 0) await wait(left);
      if (!live) return;
      setPrize(result.value.prize);
      setStage("open");
      SFX.open();
      await wait(380);
      if (!live) return;
      setStage("prize");
      cb.current.onBalance(result.value.balance);
      cb.current.onPrize(result.value.prize, false);
      await wait(260);
      SFX.chime();
      if (result.value.prize.kind === "tokens") {
        SFX.tokens(0.2, 10, 0.05);
        return;
      }
      await wait(2000);
      if (live) setStage("preview");
    })();
    return () => {
      live = false;
    };
  }, []);

  async function wear(on: boolean) {
    if (!prize || prize.kind !== "accessory" || busy) return;
    setBusy(true);
    if (on) {
      const r = await actionWear({ animal, accessory: prize.id }).catch(() => null);
      if (r?.ok) {
        SFX.pop();
        cb.current.onPrize(prize, true);
        pet.current?.cheer();
        await wait(stillNow() ? 0 : 1100);
      } else setError(r && !r.ok ? r.error : "That could not be saved.");
    }
    setBusy(false);
    cb.current.onDone();
  }

  if (stage === "error")
    return (
      <div className={s.prize} role="alert">
        <RewardBox tokens={false} />
        <p className={s.error}>{error}</p>
        <Cta onClick={() => cb.current.onDone()}>Back</Cta>
      </div>
    );

  if (stage === "opening" || stage === "open")
    return (
      <div className={s.prize} aria-busy="true">
        <RewardBox tokens={false} shake={stage === "opening"} open={stage === "open"} />
        <p className="kp-meta" aria-live="polite">
          Opening your box
        </p>
      </div>
    );

  const p = prize!;
  const name = p.kind === "accessory" ? ACCESSORIES[p.id].name : `${p.bonus} tokens back`;
  return (
    <div className={s.prize}>
      <div className={s.prizeStage}>
        <Rays />
        {stage === "preview" && p.kind === "accessory" ? (
          <div className={s.preview}>
            <Pet
              ref={pet}
              animal={animal}
              stage="young"
              mood="h"
              accessory={p.id}
              size={124}
              touch={touchNow()}
            />
          </div>
        ) : (
          <div className={s.prizeItem}>
            {p.kind === "accessory" ? (
              <AccessoryIcon id={p.id} size={96} />
            ) : (
              <TokenIcon size={72} />
            )}
          </div>
        )}
      </div>
      <p className={s.prizeName} aria-live="polite">
        <small>
          {stage === "preview"
            ? `On your ${ANIMALS[animal].name.toLowerCase()}`
            : p.kind === "accessory"
              ? "You found"
              : "You have every accessory, so this box gave"}
        </small>
        <b>{name}</b>
      </p>
      {error && <p className={s.error}>{error}</p>}
      {stage === "preview" ? (
        <div className={s.choices}>
          <Cta onClick={() => void wear(true)} disabled={busy}>
            Wear it
          </Cta>
          <button
            type="button"
            className={`kp-link ${s.linkButton}`}
            onClick={() => void wear(false)}
            disabled={busy}
          >
            Keep it for later
          </button>
        </div>
      ) : p.kind === "tokens" ? (
        <Cta onClick={() => cb.current.onDone()}>Done</Cta>
      ) : null}
    </div>
  );
}
