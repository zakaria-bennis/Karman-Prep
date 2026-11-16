"use client";

// Rewards (2026-11-16), built from what the founder has settled and marked where it is a guess
// (rewardsData.ts says which is which).
//   Tokens       what the student holds (he calls them tokens, not coins), the multiplier their
//                challenge-question streak has earned (a quarter more each day, up to 5x), and where
//                this week's tokens came from.
//   The box      the mystery box, opened for tokens: it holds things to wear (RewardsBox.tsx).
//   Records      little things worth knowing (lifetime tokens, best day and so on), under Tokens.
//   Passes       things of real use: starting a full-length exam outside Saturday's window,
//                keeping a streak through a missed day, and a second chance after a miss inside a
//                skill set (paid for there, so here it only tells its price). Each is limited.
//   Characters   the 16, each with its own name and a little story, each unlocked by its own
//                challenge. One still locked shows its face grayed out, so the student can see who
//                is waiting; the three hardest are black shapes with no name. The card above the
//                faces tells the pressed one's story and how to unlock it.
// With room, the three pieces stand side by side on one screen. On a phone each is a page of its own,
// under a slim line that always shows the tokens held.
// Tokens are spent only here: they appear nowhere else in the portal (founder, 2026-11-07).
// Themes and skins were here in the first version and are off the page while he rethinks them.
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Face } from "./characters";
import lib from "./library.module.css";
import styles from "./rewards.module.css";
import MysteryBox, { Token, Wearing } from "./RewardsBox";
import { PassIcon } from "./RewardsPassIcon";
import {
  BOX_PRICE,
  CHARACTERS,
  DAYS_TO_TOP,
  EARNED,
  PASSES,
  PRIZES,
  RECORDS,
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
  const hidden = chosen.mystery && !has;

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
        <div className={styles.left}>
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
                      <PassIcon kind={pass.icon} />
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
          {/* who the pressed one is, its story, and how it is unlocked, above the faces. Its height
              is fixed, so pressing moves nothing. A mystery keeps its name and story to itself. */}
          <div className={styles.card} aria-live="polite">
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
            <p className={styles.story}>{hidden ? "A mystery until it is yours." : chosen.story}</p>
            <p className={styles.how}>{chosen.challenge}</p>
          </div>
          <div className={styles.grid} role="group" aria-label="Characters">
            {CHARACTERS.map((c, i) => {
              const mine = c.done >= c.of;
              const secret = c.mystery && !mine;
              return (
                <button
                  key={c.name}
                  type="button"
                  className={styles.face}
                  data-mine={mine || undefined}
                  aria-pressed={picked === i}
                  aria-label={
                    secret
                      ? "A mystery character, locked"
                      : `${c.name} the ${c.kind.toLowerCase()}, ${mine ? "unlocked" : "locked"}`
                  }
                  onClick={() => {
                    setPicked(i);
                    tick();
                  }}
                >
                  {i === 0 ? (
                    <Wearing wear={wearing} size={44} />
                  ) : (
                    // one still to unlock is seen grayed out; the three hardest are black shapes
                    <span className={mine ? undefined : secret ? styles.shade : styles.peek}>
                      <Face kind={c.face} size={44} />
                    </span>
                  )}
                  {/* how far along a locked one is, along the foot of its square */}
                  {!mine && <i style={{ width: `${Math.round((c.done / c.of) * 100)}%` }} />}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
