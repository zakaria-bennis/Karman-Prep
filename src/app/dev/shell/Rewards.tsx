"use client";

// Rewards (2026-11-16), built from what the founder has settled and marked where it is a guess
// (rewardsData.ts says which is which).
//   Tokens       what the student holds (he calls them tokens, not coins), the multiplier their
//                challenge-question streak has earned (a quarter more each day, up to 5x), and where
//                this week's tokens came from.
//   The box      the mystery box, opened for tokens: it holds things to wear (RewardsBox.tsx).
//   Passes       things of real use: starting a full-length exam outside Saturday's window,
//                keeping a streak through a missed day, and a second chance after a miss inside a
//                skill set (paid for there, so here it only tells its price). Each is limited.
//   Characters   the 16, each with its own name and a little story, each unlocked by its own
//                challenge. One still locked shows its face grayed out, if its face is drawn, so the
//                student can see who is waiting. Pressing one tells its story and how to unlock it.
// With room, the three pieces stand side by side on one screen. On a phone each is a page of its own,
// under a slim line that always shows the tokens held.
// Tokens are spent only here: they appear nowhere else in the portal (founder, 2026-11-07).
// Themes and skins were here in the first version and are off the page while he rethinks them.
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Face } from "./characters";
import lib from "./library.module.css";
import { Tile } from "./practice";
import styles from "./rewards.module.css";
import MysteryBox, { Token, Wearing } from "./RewardsBox";
import {
  BOX_PRICE,
  CHARACTERS,
  DAYS_TO_TOP,
  EARNED,
  PASSES,
  PRIZES,
  STREAK,
  TOKENS,
  multiplierFor,
  type Pass,
  type Wear,
} from "./rewardsData";
import { ping, tick } from "./sound";

const PAGES = ["Box", "Tokens", "Passes", "Characters"] as const;
const count = (n: number) => n.toLocaleString("en-US");
const times = (n: number) => `${n}x`;

export default function Rewards({ rail }: { rail: boolean }) {
  const still = useReducedMotion() ?? false;
  const [page, setPage] = useState<(typeof PAGES)[number]>("Box");
  const [tokens, setTokens] = useState(TOKENS);
  const [opened, setOpened] = useState(0);
  const [wearing, setWearing] = useState<Wear | null>(null);
  /** The passes bought on this page (nothing is saved yet). */
  const [held, setHeld] = useState<string[]>([]);
  const [picked, setPicked] = useState(0);
  const show = (name: (typeof PAGES)[number]) => rail || page === name;

  const multiplier = multiplierFor(STREAK);
  const buy = (pass: Pass) => {
    setTokens(tokens - pass.price);
    setHeld([...held, pass.name]);
    ping();
  };
  const unlocked = CHARACTERS.filter((c) => c.done >= c.of).length;
  const chosen = CHARACTERS[picked];
  const has = chosen.done >= chosen.of;

  return (
    <div className={`${lib.library} ${styles.rewards}`}>
      {!rail && (
        <>
          {/* the tokens held are always in sight on a phone, whatever page is open */}
          <p className={styles.purse}>
            <Token size={24} />
            <b>{count(tokens)}</b>
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

      {show("Tokens") && (
        <section className={`${lib.glass} ${styles.tokens}`} aria-label="Tokens">
          <h2>Tokens</h2>
          <p className={styles.held}>
            <Token size={52} />
            {count(tokens)}
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
                  <b>+{count(row.tokens)}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(show("Box") || show("Passes")) && (
        <section className={`${lib.glass} ${styles.middle}`} aria-label="Mystery box and passes">
          {show("Box") && (
            <MysteryBox
              tokens={tokens}
              wearing={wearing}
              onOpen={() => {
                setTokens(tokens - BOX_PRICE);
                setOpened(opened + 1);
                return PRIZES[opened % PRIZES.length].key;
              }}
              onWear={setWearing}
            />
          )}
          {show("Passes") && (
            <div className={styles.passes}>
              <h3>Passes</h3>
              <ul>
                {PASSES.map((pass) => {
                  const mine = held.includes(pass.name);
                  return (
                    <li key={pass.name} className={styles.pass}>
                      <Tile name={pass.icon} />
                      <div>
                        <b>{pass.name}</b>
                        <span>{pass.does}</span>
                      </div>
                      <div className={styles.buy}>
                        {pass.inSet ? (
                          // paid for inside a skill set, at the moment it is needed: its price is
                          // told here, with nothing to press
                          <p className={styles.tag} aria-label={`${pass.price} tokens`}>
                            <Token size={18} />
                            {count(pass.price)}
                          </p>
                        ) : (
                          // one at a time: once held, another cannot be bought until it is used
                          <button
                            type="button"
                            className={styles.price}
                            disabled={mine || tokens < pass.price}
                            aria-label={`Buy ${pass.name} for ${pass.price} tokens`}
                            onClick={() => buy(pass)}
                          >
                            <Token size={18} />
                            {count(pass.price)}
                          </button>
                        )}
                        <small>{mine ? "You have 1" : pass.limit}</small>
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
                  aria-label={`${c.name} the ${c.kind.toLowerCase()}, ${mine ? "unlocked" : "locked"}`}
                  onClick={() => {
                    setPicked(i);
                    tick();
                  }}
                >
                  {i === 0 ? (
                    <Wearing wear={wearing} size={44} />
                  ) : c.face ? (
                    // one still to unlock is seen, grayed out
                    <span className={styles.peek}>
                      <Face kind={c.face} size={44} />
                    </span>
                  ) : (
                    <svg
                      className={styles.lock}
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      aria-hidden="true"
                    >
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
          {/* who the pressed one is, its story, and how it is unlocked. Its height is fixed, so
              pressing moves nothing. */}
          <div className={styles.card} aria-live="polite">
            <div>
              <h3>
                {chosen.name} <small>{chosen.kind}</small>
              </h3>
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
            <p className={styles.story}>{chosen.story}</p>
            <p className={styles.how}>{chosen.challenge}</p>
          </div>
        </section>
      )}
    </div>
  );
}
