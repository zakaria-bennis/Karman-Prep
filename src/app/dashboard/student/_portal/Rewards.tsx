"use client";

// Rewards (2026-11-16), built from what the founder has settled and marked where it is a guess
// (rewardsData.ts says which is which).
//   Coins        what the student holds, the multiplier their
//                challenge-question streak has earned (a quarter more each day, up to 5x), and where
//                this week's coins came from.
//   The box      the mystery box, opened for coins: it holds one of 100 things to wear
//                (RewardsBox.tsx, accessories.tsx). Once all 100 are won, no more can be opened.
//                The wardrobe, opened from the box, is a screen of its own (Wardrobe.tsx).
//   Records      little things worth knowing (lifetime coins, best day and so on), under Coins.
//   Passes       things of real use: starting a full-length exam outside Saturday's window,
//                keeping a streak through a missed day, and a second chance after a miss inside a
//                skill set (bought here ahead of time, used there). Each may be bought once in
//                its own stretch of time, and up to three kept.
//   Characters   the 16, each with its own name under its square and a little story, each unlocked
//                by its own challenge. One still locked shows its face grayed out, with a ring round
//                its square for how far along it is; the three hardest are black shapes named "???".
//                The card above the faces tells the pressed one's story and how to unlock it.
// With room, the three pieces stand side by side on one screen. On a phone each is a page of its own,
// under a slim line that always shows the coins held.
// Coins are spent only here: they appear nowhere else in the portal (founder, 2026-11-07).
// Themes and skins were here in the first version and are off the page while he rethinks them.
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Face } from "./characters";
import lib from "./library.module.css";
import styles from "./rewards.module.css";
import cast from "./rewardsCast.module.css";
import { ACCESSORIES, Dressed, type Accessory, type Outfit } from "./accessories";
import type { Trail } from "./MistakeLog";
import { getEquipped, setEquipped } from "./equipped";
import MysteryBox, { Coin } from "./RewardsBox";
import { PassIcon } from "./RewardsPassIcon";
import Wardrobe from "./Wardrobe";
import {
  BOX_PRICE,
  CHARACTERS,
  DAYS_TO_TOP,
  EARNED,
  PASSES,
  RECORDS,
  COINS,
  multiplierFor,
  type Pass,
} from "./rewardsData";
import { useBestStreak, usePortalData, useSkills, useStreak } from "./portalData";
import { withProgress } from "./characterProgress";
import {
  actionBuyPass,
  actionOpenBox,
  actionWear,
  type SpendResult,
} from "@/lib/portal/reward-actions";
import { ping, tick } from "./sound";

const PAGES = ["Box", "Coins", "Passes", "Characters"] as const;
const count = (n: number) => n.toLocaleString("en-US");
const times = (n: number) => `${n}x`;

export default function Rewards({
  rail,
  onTrail,
}: {
  rail: boolean;
  /** Tells the page what its title and way back should say while the wardrobe is open. */
  onTrail: (trail: Trail | null) => void;
}) {
  const still = useReducedMotion() ?? false;
  const [page, setPage] = useState<(typeof PAGES)[number]>("Box");
  /* a signed-in student's own coins, things and passes, saved as they change */
  const data = usePortalData();
  const real = data?.rewards ?? null;
  const skills = useSkills();
  // a signed-in student's own progress toward each character; the design page keeps its stand-ins
  const crew = useMemo(
    () =>
      data
        ? CHARACTERS.map((c) =>
            withProgress(c, {
              skills,
              exams: data.student.exams,
              bestStreak: data.bestStreak,
              lifetimeCoins: data.rewards.lifetime,
            })
          )
        : CHARACTERS,
    [data, skills]
  );
  const [coins, setCoins] = useState(real?.coins ?? COINS);
  /** The things to wear that have been won from boxes, by id, newest last. */
  const [owned, setOwned] = useState<string[]>(real?.owned ?? []);
  /** What the fox has on: one thing, or none, in each place. */
  const [outfit, setOutfit] = useState<Outfit>(() => getEquipped().outfit);
  // other pages show the character in the same things, and a real student's is kept
  const dressed = useRef(false);
  useEffect(() => {
    setEquipped({ outfit });
    if (!real) return;
    if (!dressed.current) {
      dressed.current = true;
      return;
    }
    const wait = window.setTimeout(
      () => void actionWear({ face: getEquipped().face, outfit: outfit as Record<string, string> }),
      600
    );
    return () => window.clearTimeout(wait);
  }, [outfit, real]);
  /** A real spend: shown at once, put back if the server refuses it. */
  const spendReal = (go: () => Promise<SpendResult>, undo: () => void) =>
    void go()
      .then((r) => {
        if (r.ok) return setCoins(r.coins);
        undo();
        window.alert(r.error);
      })
      .catch(() => {
        undo();
        window.alert("That did not go through. No coins were spent; please try again.");
      });
  const [wardrobe, setWardrobe] = useState(false);
  // the wardrobe is a screen of its own: the page's title names it and its back pill leaves it
  useEffect(() => {
    onTrail(wardrobe ? { name: "Wardrobe", back: "Rewards", go: () => setWardrobe(false) } : null);
    return () => onTrail(null);
  }, [wardrobe, onTrail]);
  useEffect(() => {
    if (!wardrobe) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWardrobe(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [wardrobe]);
  /** How many of each pass are held. One may be bought in each pass's own stretch of time and up to
   *  three kept; on this page, where no time passes, that is one of each (nothing is saved yet). */
  const [held, setHeld] = useState<Record<string, number>>(real?.passes ?? {});
  const [picked, setPicked] = useState(0);
  const show = (name: (typeof PAGES)[number]) => rail || page === name;

  const streak = useStreak();
  const best = useBestStreak();
  const multiplier = multiplierFor(streak);
  const buy = (pass: Pass) => {
    setCoins(coins - pass.price);
    setHeld({ ...held, [pass.name]: (held[pass.name] ?? 0) + 1 });
    ping();
    if (real)
      spendReal(
        () => actionBuyPass({ name: pass.name }),
        () => {
          setCoins(coins);
          setHeld(held);
        }
      );
  };
  /** The next thing a box gives: one not yet won, taken in an order that looks like chance and
   *  reaches all 100 before it repeats. */
  const next = (): Accessory => {
    const many = ACCESSORIES.length;
    for (let n = owned.length; n < owned.length + many; n++) {
      const pick = ACCESSORIES[(n * 37 + 11) % many];
      if (!owned.includes(pick.id)) return pick;
    }
    return ACCESSORIES[0];
  };
  /** Puts a thing on, or takes it off if it is already on. */
  const wear = (item: Accessory) =>
    setOutfit({ ...outfit, [item.slot]: outfit[item.slot] === item.id ? undefined : item.id });
  const unlocked = crew.filter((c) => c.done >= c.of).length;
  const chosen = crew[picked];
  const has = chosen.done >= chosen.of;
  const hidden = chosen.mystery && !has;

  if (wardrobe)
    return (
      <Wardrobe
        owned={owned}
        outfit={outfit}
        onWear={wear}
        onUnlockAll={
          real
            ? undefined
            : () => {
                setOwned(ACCESSORIES.map((a) => a.id));
                tick();
              }
        }
      />
    );
  return (
    <div className={`${lib.library} ${styles.rewards}`}>
      {!rail && (
        <>
          {/* the coins held are always in sight on a phone, whatever page is open */}
          <p className={styles.purse}>
            <Coin size={24} />
            <b>{count(coins)}</b>
            <span>{times(multiplier)} multiplier</span>
          </p>
          <div className={`${lib.pager} ${styles.tabs}`} role="group" aria-label="Page">
            {PAGES.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={page === name}
                onClick={() => {
                  setPage(name);
                  tick();
                }}
              >
                {page === name && (
                  <motion.span
                    layoutId="rewards-pager"
                    className={lib.lens}
                    transition={
                      still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }
                    }
                  />
                )}
                <span>{name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {show("Coins") && (
        <div className={styles.left}>
          <section className={`${lib.glass} ${styles.coins}`} aria-label="Coins">
            <h2>Coins</h2>
            {/* a long number is set smaller, so it stays inside the pane */}
            <p className={styles.held} data-long={coins >= 10000 || undefined}>
              <Coin size={52} />
              {count(coins)}
            </p>

            <div className={styles.part}>
              <p className={styles.figure}>
                <b>{times(multiplier)}</b> multiplier
              </p>
              {/* the climb from 1x to 5x, a step for each day in a row */}
              <div
                className={styles.climb}
                role="img"
                aria-label={`${streak} of ${DAYS_TO_TOP} days toward 5x`}
              >
                {Array.from({ length: DAYS_TO_TOP }, (_, i) => (
                  <i key={i} data-on={i < streak || undefined} />
                ))}
              </div>
              <p className={styles.ends}>
                <span>
                  <b>{streak}</b> day streak
                </span>
                <span>
                  {multiplier < 5 ? `${times(multiplierFor(streak + 1))} tomorrow` : "At the top"}
                </span>
              </p>
            </div>

            <div className={styles.part}>
              <h3>This week</h3>
              {real && real.week.length === 0 && (
                <p className={styles.ends}>
                  No coins yet this week. Finish a Daily 10 to earn your first.
                </p>
              )}
              <ul className={styles.earned}>
                {(real?.week ?? EARNED).map((row) => (
                  <li key={row.name}>
                    <span>{row.name}</span>
                    <b>+{count(row.coins)}</b>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          {/* little things worth knowing, which also balance the page against the characters */}
          <section className={`${lib.glass} ${styles.records}`} aria-label="Records">
            <h2>Records</h2>
            <dl>
              {(real
                ? [
                    { name: "Lifetime coins", value: real.lifetime.toLocaleString("en-US") },
                    { name: "Earned today", value: real.today.toLocaleString("en-US") },
                    { name: "Best day", value: real.bestDay.toLocaleString("en-US") },
                    { name: "Boxes opened", value: String(owned.length) },
                    { name: "Longest streak", value: `${best} days` },
                    { name: "Top multiplier", value: `${multiplierFor(best)}x` },
                  ]
                : RECORDS
              ).map((record) => (
                <div key={record.name}>
                  <dd>{record.value}</dd>
                  <dt>{record.name}</dt>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}

      {(show("Box") || show("Passes")) && (
        <section className={`${lib.glass} ${styles.middle}`} aria-label="Mystery box and passes">
          {show("Box") && (
            <MysteryBox
              all={ACCESSORIES.length}
              coins={coins}
              outfit={outfit}
              owned={owned.length}
              left={ACCESSORIES.length - owned.length}
              onOpen={() => {
                const prize = next();
                setCoins(coins - BOX_PRICE);
                setOwned([...owned, prize.id]);
                if (real)
                  spendReal(
                    () => actionOpenBox({ prizeId: prize.id }),
                    () => {
                      setCoins(coins);
                      setOwned(owned);
                    }
                  );
                return prize;
              }}
              onWear={(prize) => setOutfit({ ...outfit, [prize.slot]: prize.id })}
              onWardrobe={() => {
                setWardrobe(true);
                tick();
              }}
            />
          )}
          {show("Passes") && (
            <div className={styles.passes}>
              <h3>Passes</h3>
              <ul>
                {PASSES.map((pass) => {
                  const mine = held[pass.name] ?? 0;
                  return (
                    <li key={pass.name} className={styles.pass}>
                      <PassIcon kind={pass.icon} />
                      <div>
                        <b>{pass.name}</b>
                        <span>{pass.does}</span>
                      </div>
                      <div className={styles.buy}>
                        {/* once one is bought, the next waits for the pass's own stretch of time;
                            up to three can be kept */}
                        <button
                          type="button"
                          className={styles.price}
                          disabled={(mine > 0 && !!pass.next) || coins < pass.price}
                          aria-label={`Buy ${pass.name} for ${pass.price} coins`}
                          onClick={() => buy(pass)}
                        >
                          <Coin size={20} />
                          {count(pass.price)}
                        </button>
                        <small>{mine > 0 && pass.next ? `Next ${pass.next}` : pass.limit}</small>
                        <small>
                          {mine > 0
                            ? `You have ${mine}${pass.bank ? ` of ${pass.bank}` : ""}`
                            : pass.bank
                              ? `Keep up to ${pass.bank}`
                              : "Buy any number"}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {show("Characters") && (
        <section className={`${lib.glass} ${styles.cast} ${cast.cast}`} aria-label="Characters">
          <header>
            <h2>Characters</h2>
            <p>
              <b>{unlocked}</b> of {CHARACTERS.length}
            </p>
          </header>
          {/* who the pressed one is, its story, and how it is unlocked, above the faces. Its height
              is fixed, so pressing moves nothing. A mystery keeps its name and story to itself. */}
          <div className={cast.card} aria-live="polite">
            <div>
              <h3>
                {hidden ? (
                  "???"
                ) : (
                  <>
                    {chosen.name} <small>{chosen.kind}</small>
                  </>
                )}
              </h3>
              <p className={cast.far}>
                {has ? (
                  "Unlocked"
                ) : (
                  <>
                    <b>{count(chosen.done)}</b> of {count(chosen.of)}
                  </>
                )}
              </p>
            </div>
            <p className={cast.story}>{hidden ? "A mystery until it is yours." : chosen.story}</p>
            <p className={cast.how}>{chosen.challenge}</p>
          </div>
          <div className={cast.grid} role="group" aria-label="Characters">
            {crew.map((c, i) => {
              const mine = c.done >= c.of;
              const secret = c.mystery && !mine;
              return (
                <button
                  key={c.name}
                  type="button"
                  className={cast.cell}
                  aria-pressed={picked === i}
                  aria-label={
                    secret
                      ? "A mystery character, locked"
                      : `${c.name}, ${mine ? "unlocked" : "locked"}`
                  }
                  onClick={() => {
                    setPicked(i);
                    tick();
                  }}
                >
                  {/* the square: how far along a locked one is runs round it as a ring set into
                      its edge */}
                  <span
                    className={cast.face}
                    data-mine={mine || undefined}
                    style={{ "--far": Math.round((c.done / c.of) * 100) } as CSSProperties}
                  >
                    {i === 0 ? (
                      <Dressed face="fox" outfit={outfit} size={44} />
                    ) : (
                      // one still to unlock is seen grayed out; the three hardest are black shapes
                      <span className={mine ? undefined : secret ? cast.shade : cast.peek}>
                        <Face kind={c.face} size={44} />
                      </span>
                    )}
                  </span>
                  <span className={cast.named}>{secret ? "???" : c.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
