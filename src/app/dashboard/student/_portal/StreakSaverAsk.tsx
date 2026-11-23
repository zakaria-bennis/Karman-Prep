"use client";
// The Streak saver, used by hand (founder, round 2, 2026-11-22): the morning after a missed day, a
// student who holds one is asked once whether to spend it. Keep: the day is saved and the streak
// and coin multiplier go on. Not now: asked no more about that day. Nothing shows to a student
// with no saver or nothing to save, nor on the design page.
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { prefersStill } from "@/lib/painting/motion";
import { actionSaverOffer, actionSpendSaver } from "@/app/learn/play-actions";
import lib from "./library.module.css";
import { Icon } from "./practice";
import { usePortalData } from "./portalData";
import go from "./play/go.module.css";
import { chosen, tick } from "./sound";
import s from "./streakSaver.module.css";

const askedKey = (day: string) => `kp-saver-asked:${day}`;
const wasAsked = (day: string) => {
  try {
    return window.localStorage.getItem(askedKey(day)) === "1";
  } catch {
    return false;
  }
};
const markAsked = (day: string) => {
  try {
    window.localStorage.setItem(askedKey(day), "1");
  } catch {
    /* a private window: asked again next time, which is fine */
  }
};

export function StreakSaverAsk() {
  const real = usePortalData() !== null;
  const router = useRouter();
  const [offer, setOffer] = useState<{ day: string; held: number } | null>(null);
  const [state, setState] = useState<"ask" | "busy" | "kept" | "error">("ask");
  const [error, setError] = useState("");
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!real) return;
    let live = true;
    actionSaverOffer()
      .then((r) => live && r.ok && r.value && !wasAsked(r.value.day) && setOffer(r.value))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [real]);

  useLayoutEffect(() => {
    if (!offer || !card.current || prefersStill()) return;
    const tween = gsap.fromTo(
      card.current,
      { y: 40, scale: 0.94, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.6)" }
    );
    return () => void tween.kill();
  }, [offer]);

  if (!offer) return null;
  const close = () => {
    markAsked(offer.day);
    setOffer(null);
  };
  const keep = () => {
    chosen();
    setState("busy");
    actionSpendSaver()
      .then((r) => {
        if (!r.ok) {
          setError(r.error);
          return setState("error");
        }
        markAsked(offer.day);
        setState("kept");
        router.refresh();
        window.setTimeout(() => setOffer(null), prefersStill() ? 1200 : 1800);
      })
      .catch(() => {
        setError("Your streak saver was not used. Try again.");
        setState("error");
      });
  };
  const missed = new Date(`${offer.day}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  return (
    <div className={s.screen} role="dialog" aria-modal="true" aria-labelledby="saver-title">
      <div
        ref={card}
        className={`${lib.glass} ${s.card}`}
        data-kept={state === "kept" || undefined}
      >
        <span className={s.flame} aria-hidden="true">
          <Icon name="flame" size={64} />
        </span>
        <h2 id="saver-title">{state === "kept" ? "Streak kept" : "Keep your streak?"}</h2>
        {state !== "kept" && (
          <p>
            You missed {missed}.
            <small>
              You have {offer.held} {offer.held === 1 ? "saver" : "savers"}.
            </small>
          </p>
        )}
        {state === "error" && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        {state !== "kept" && (
          <div className={s.pair}>
            <button
              type="button"
              className={`${go.go} ${s.keep}`}
              disabled={state === "busy"}
              onClick={keep}
              autoFocus
            >
              <span>{state === "busy" ? "Keeping it" : "Use a Streak saver"}</span>
            </button>
            <button
              type="button"
              className={s.later}
              disabled={state === "busy"}
              onClick={() => {
                tick();
                close();
              }}
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
