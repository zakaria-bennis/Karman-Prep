"use client";

// Rewards, first version (2026-11-16), built from what the founder has settled and marked where it is
// a guess (rewardsData.ts says which is which).
//   Coins        what the student holds, the multiplier their challenge-question streak has earned
//                (a quarter more each day, up to 5x), and where this week's coins came from.
//   The box      the mystery box, opened for coins (RewardsBox.tsx).
//   Shop         themes and quiz-engine skins, bought with coins and then put on.
//   Characters   the 16, each unlocked by its own challenge. Pressing one says how it is unlocked
//                and how far along the student is. Only the fox is drawn so far.
// With room, the three pieces stand side by side on one screen. On a phone each is a page of its own,
// under a slim line that always shows the coins held.
// Coins are spent only here: they appear nowhere else in the portal (founder, 2026-11-07).
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import lib from "./library.module.css";
import styles from "./rewards.module.css";
import MysteryBox, { Coin, Wearing } from "./RewardsBox";
import {
  BOX_PRICE,
  CHARACTERS,
  COINS,
  DAYS_TO_TOP,
  EARNED,
  PRIZES,
  SKINS,
  STREAK,
  THEMES,
  multiplierFor,
  type Good,
  type Wear,
} from "./rewardsData";
import { ping, tick } from "./sound";

const PAGES = ["Box", "Coins", "Shop", "Characters"] as const;
const count = (n: number) => n.toLocaleString("en-US");
const times = (n: number) => `${n}x`;

/** A shelf of things to buy: each is bought once, then put on. */
function Shelf({
  title,
  goods,
  coins,
  owned,
  using,
  onBuy,
  onUse,
}: {
  title: string;
  goods: Good[];
  coins: number;
  owned: string[];
  using: string;
  onBuy: (good: Good) => void;
  onUse: (good: Good) => void;
}) {
  return (
    <div className={styles.shelf}>
      <h3>{title}</h3>
      <ul>
        {goods.map((good) => {
          const mine = owned.includes(good.name);
          return (
            <li key={good.name} className={styles.good}>
              <i style={{ background: good.look }} />
              <b>{good.name}</b>
              {mine ? (
                <button
                  type="button"
                  className={styles.quiet}
                  aria-pressed={using === good.name}
                  onClick={() => {
                    onUse(good);
                    tick();
                  }}
                >
                  {using === good.name ? "In use" : "Use"}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.price}
                  disabled={coins < good.price}
                  aria-label={`Buy ${good.name} for ${good.price} coins`}
                  onClick={() => {
                    onBuy(good);
                    ping();
                  }}
                >
                  <Coin size={16} />
                  {count(good.price)}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Rewards({ rail }: { rail: boolean }) {
  const still = useReducedMotion() ?? false;
  const [page, setPage] = useState<(typeof PAGES)[number]>("Box");
  const [coins, setCoins] = useState(COINS);
  const [opened, setOpened] = useState(0);
  const [wearing, setWearing] = useState<Wear | null>(null);
  const [owned, setOwned] = useState([THEMES[0].name, SKINS[0].name]);
  const [theme, setTheme] = useState(THEMES[0].name);
  const [skin, setSkin] = useState(SKINS[0].name);
  const [picked, setPicked] = useState(0);
  const show = (name: (typeof PAGES)[number]) => rail || page === name;

  const multiplier = multiplierFor(STREAK);
  const buy = (good: Good) => {
    setCoins(coins - good.price);
    setOwned([...owned, good.name]);
  };
  const unlocked = CHARACTERS.filter((c) => c.done >= c.of).length;
  const chosen = CHARACTERS[picked];
  const has = chosen.done >= chosen.of;

  return (
    <div className={`${lib.library} ${styles.rewards}`}>
      {!rail && (
        <>
          {/* the coins held are always in sight on a phone, whatever page is open */}
          <p className={styles.purse}>
            <Coin size={22} />
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
        <section className={`${lib.glass} ${styles.coins}`} aria-label="Coins">
          <h2>Coins</h2>
          <p className={styles.held}>
            <Coin size={44} />
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
      )}

      {(show("Box") || show("Shop")) && (
        <section className={`${lib.glass} ${styles.middle}`} aria-label="Mystery box and shop">
          {show("Box") && (
            <MysteryBox
              coins={coins}
              wearing={wearing}
              onOpen={() => {
                setCoins(coins - BOX_PRICE);
                setOpened(opened + 1);
                return PRIZES[opened % PRIZES.length].key;
              }}
              onWear={setWearing}
            />
          )}
          {show("Shop") && (
            <div className={styles.shop}>
              <Shelf
                title="Themes"
                goods={THEMES}
                coins={coins}
                owned={owned}
                using={theme}
                onBuy={buy}
                onUse={(good) => setTheme(good.name)}
              />
              <Shelf
                title="Skins"
                goods={SKINS}
                coins={coins}
                owned={owned}
                using={skin}
                onBuy={buy}
                onUse={(good) => setSkin(good.name)}
              />
            </div>
          )}
        </section>
      )}

      {show("Characters") && (
        <section className={`${lib.glass} ${styles.cast}`} aria-label="Characters">
          <header>
            <h2>Characters</h2>
            <p>
              <b>{unlocked}</b> of {CHARACTERS.length}
            </p>
          </header>
          <div className={styles.grid} role="group" aria-label="Characters">
            {CHARACTERS.map((c, i) => {
              const mine = c.done >= c.of;
              return (
                <button
                  key={c.name}
                  type="button"
                  className={styles.face}
                  data-mine={mine || undefined}
                  aria-pressed={picked === i}
                  aria-label={`${c.name}, ${mine ? "unlocked" : "locked"}`}
                  onClick={() => {
                    setPicked(i);
                    tick();
                  }}
                >
                  {i === 0 ? (
                    <Wearing wear={wearing} size={40} />
                  ) : (
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <rect x="5.500" y="10.500" width="13" height="9.500" rx="2.500" />
                      <path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500" />
                    </svg>
                  )}
                  {/* how far along a locked one is, along the foot of its square */}
                  {!mine && <i style={{ width: `${Math.round((c.done / c.of) * 100)}%` }} />}
                </button>
              );
            })}
          </div>
          {/* what the pressed one is and how it is unlocked. Its height is fixed, so pressing moves
              nothing. */}
          <div className={styles.card} aria-live="polite">
            <div>
              <h3>{chosen.name}</h3>
              <p className={styles.far}>
                {has ? (
                  "Unlocked"
                ) : (
                  <>
                    <b>{count(chosen.done)}</b> of {count(chosen.of)}
                  </>
                )}
              </p>
            </div>
            <p>{chosen.challenge}</p>
          </div>
        </section>
      )}
    </div>
  );
}
