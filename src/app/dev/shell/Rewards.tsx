"use client";

// Rewards (2026-11-16), built from what the founder has settled and marked where it is a guess
// (rewardsData.ts says which is which).
//   Coins        what the student holds, the multiplier their
//                challenge-question streak has earned (a quarter more each day, up to 5x), and where
//                this week's coins came from.
//   The box      the mystery box, opened for coins: it holds one of 200 things to wear
//                (RewardsBox.tsx, accessories.tsx). The wardrobe, opened from the box, shows what has
//                been won and lets the fox put things on, one in each place: head, eyes, neck, side.
//   Records      little things worth knowing (lifetime coins, best day and so on), under Coins.
//   Passes       things of real use: starting a full-length exam outside Saturday's window,
//                keeping a streak through a missed day, and a second chance after a miss inside a
//                skill set (bought here ahead of time, used there). Each is limited.
//   Characters   the 16, each with its own name under its square and a little story, each unlocked
//                by its own challenge. One still locked shows its face grayed out, with a ring round
//                its square for how far along it is; the three hardest are black shapes named "???".
//                The card above the faces tells the pressed one's story and how to unlock it.
// With room, the three pieces stand side by side on one screen. On a phone each is a page of its own,
// under a slim line that always shows the coins held.
// Coins are spent only here: they appear nowhere else in the portal (founder, 2026-11-07).
// Themes and skins were here in the first version and are off the page while he rethinks them.
import { motion, useReducedMotion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import { Face } from "./characters";
import lib from "./library.module.css";
import styles from "./rewards.module.css";
import cast from "./rewardsCast.module.css";
import ward from "./rewardsWardrobe.module.css";
import { ACCESSORIES, Dressed, SLOTS, type Accessory, type Outfit, type Slot } from "./accessories";
import MysteryBox, { Coin } from "./RewardsBox";
import { PassIcon } from "./RewardsPassIcon";
import {
  BOX_PRICE,
  CHARACTERS,
  DAYS_TO_TOP,
  EARNED,
  PASSES,
  RECORDS,
  STREAK,
  COINS,
  multiplierFor,
  type Pass,
} from "./rewardsData";
import { ping, tick } from "./sound";

const PAGES = ["Box", "Coins", "Passes", "Characters"] as const;
const count = (n: number) => n.toLocaleString("en-US");
const times = (n: number) => `${n}x`;

export default function Rewards({ rail }: { rail: boolean }) {
  const still = useReducedMotion() ?? false;
  const [page, setPage] = useState<(typeof PAGES)[number]>("Box");
  const [coins, setCoins] = useState(COINS);
  /** The things to wear that have been won from boxes, by id, newest last. */
  const [owned, setOwned] = useState<string[]>([]);
  /** What the fox has on: one thing, or none, in each place. */
  const [outfit, setOutfit] = useState<Outfit>({});
  const [wardrobe, setWardrobe] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  /** How many of each pass are held, bought on this page (nothing is saved yet). */
  const [held, setHeld] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState(0);
  const show = (name: (typeof PAGES)[number]) => rail || page === name;

  const multiplier = multiplierFor(STREAK);
  const buy = (pass: Pass) => {
    setCoins(coins - pass.price);
    setHeld({ ...held, [pass.name]: (held[pass.name] ?? 0) + 1 });
    ping();
  };
  /** The next thing a box gives: one not yet won, taken in an order that looks like chance and
   *  reaches all 200 before it repeats. */
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
  const mine = ACCESSORIES.filter((a) => owned.includes(a.id) && (!slot || a.slot === slot));
  const unlocked = CHARACTERS.filter((c) => c.done >= c.of).length;
  const chosen = CHARACTERS[picked];
  const has = chosen.done >= chosen.of;
  const hidden = chosen.mystery && !has;

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
                aria-label={`${STREAK} of ${DAYS_TO_TOP} days toward 5x`}
              >
                {Array.from({ length: DAYS_TO_TOP }, (_, i) => (
                  <i key={i} data-on={i < STREAK || undefined} />
                ))}
              </div>
              <p className={styles.ends}>
                <span>
                  <b>{STREAK}</b> day streak
                </span>
                <span>
                  {multiplier < 5 ? `${times(multiplierFor(STREAK + 1))} tomorrow` : "At the top"}
                </span>
              </p>
            </div>

            <div className={styles.part}>
              <h3>This week</h3>
              <ul className={styles.earned}>
                {EARNED.map((row) => (
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
              {RECORDS.map((record) => (
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
          {show("Box") && !wardrobe && (
            <MysteryBox
              coins={coins}
              outfit={outfit}
              owned={owned.length}
              left={ACCESSORIES.length - owned.length}
              onOpen={() => {
                const prize = next();
                setCoins(coins - BOX_PRICE);
                setOwned([...owned, prize.id]);
                return prize;
              }}
              onWear={(prize) => setOutfit({ ...outfit, [prize.slot]: prize.id })}
              onWardrobe={() => {
                setWardrobe(true);
                tick();
              }}
            />
          )}
          {/* the wardrobe takes the box's place: everything won, to put on and take off */}
          {show("Box") && wardrobe && (
            <div className={ward.wardrobe}>
              <header>
                <button
                  type="button"
                  className={ward.backIn}
                  onClick={() => {
                    setWardrobe(false);
                    tick();
                  }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="M14.500 6.500L9 12l5.500 5.500" />
                  </svg>
                  Box
                </button>
                <h2>Wardrobe</h2>
                <p>
                  <b>{owned.length}</b> of {ACCESSORIES.length}
                </p>
              </header>
              <div className={ward.fitting}>
                <Dressed face="fox" outfit={outfit} size={104} />
              </div>
              <div className={`${lib.filter} ${ward.slots}`} role="group" aria-label="Worn on">
                {([null, ...(Object.keys(SLOTS) as Slot[])] as (Slot | null)[]).map((key) => (
                  <button
                    key={key ?? "all"}
                    type="button"
                    aria-pressed={slot === key}
                    onClick={() => {
                      setSlot(key);
                      tick();
                    }}
                  >
                    {slot === key && (
                      <motion.span
                        layoutId="rewards-slot"
                        className={lib.lens}
                        transition={
                          still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }
                        }
                      />
                    )}
                    <span>{key ? SLOTS[key] : "All"}</span>
                  </button>
                ))}
              </div>
              {mine.length > 0 ? (
                <ul className={ward.rack}>
                  {mine.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={ward.thing}
                        aria-pressed={outfit[item.slot] === item.id}
                        onClick={() => {
                          wear(item);
                          tick();
                        }}
                      >
                        <Dressed face="fox" outfit={{ [item.slot]: item.id }} size={56} />
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={ward.bare}>
                  <p>
                    {owned.length
                      ? "Nothing for that place yet."
                      : "Open a box to win your first one."}
                  </p>
                </div>
              )}
              {/* for trying things on while the page is being designed; not for students */}
              {owned.length < ACCESSORIES.length && (
                <button
                  type="button"
                  className={styles.quiet}
                  onClick={() => {
                    setOwned(ACCESSORIES.map((a) => a.id));
                    tick();
                  }}
                >
                  Unlock all 200 for testing
                </button>
              )}
            </div>
          )}
          {/* with room, the open wardrobe has the whole pane, so the passes step aside */}
          {show("Passes") && !(rail && wardrobe) && (
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
                        {/* an exam pass or a streak saver is held one at a time; second chances
                            may be kept in number, to use later inside a skill set */}
                        <button
                          type="button"
                          className={styles.price}
                          disabled={(mine > 0 && !pass.stacks) || coins < pass.price}
                          aria-label={`Buy ${pass.name} for ${pass.price} coins`}
                          onClick={() => buy(pass)}
                        >
                          <Coin size={20} />
                          {count(pass.price)}
                        </button>
                        <small>{mine > 0 ? `You have ${mine}` : pass.limit}</small>
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
            {CHARACTERS.map((c, i) => {
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
