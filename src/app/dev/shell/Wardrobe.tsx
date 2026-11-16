"use client";

// The wardrobe: its own screen inside Rewards (founder, 2026-11-16). The things won from boxes are
// at the left, by the place they are worn; the character is at the right, wearing what is put on.
// Pressing a thing puts it on, or takes it off if it is on. Over the character are the faces of the
// characters: pressing one tries the same things on it (a mystery character is left out until it
// is unlocked). On a phone the character is on top and the things are under it, in a pane that
// scrolls inside itself.
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { ACCESSORIES, Dressed, SLOTS, type Accessory, type Outfit, type Slot } from "./accessories";
import type { FaceKind } from "./characters";
import lib from "./library.module.css";
import styles from "./rewardsWardrobe.module.css";
import { CHARACTERS } from "./rewardsData";
import { tick } from "./sound";

export default function Wardrobe({
  owned,
  outfit,
  onWear,
  onUnlockAll,
}: {
  /** The ids of the things won so far. */
  owned: string[];
  outfit: Outfit;
  onWear: (item: Accessory) => void;
  /** For trying everything on while the page is being designed; not for students. */
  onUnlockAll: () => void;
}) {
  const still = useReducedMotion() ?? false;
  const [slot, setSlot] = useState<Slot | null>(null);
  const [face, setFace] = useState<FaceKind>("fox");
  const mine = ACCESSORIES.filter((a) => owned.includes(a.id) && (!slot || a.slot === slot));
  const on = (Object.keys(SLOTS) as Slot[])
    .map((key) => ACCESSORIES.find((a) => a.id === outfit[key]))
    .filter((a): a is Accessory => a !== undefined);

  return (
    <div className={`${lib.library} ${styles.wardrobe}`}>
      <section className={`${lib.glass} ${styles.things}`} aria-label="Things to wear">
        <header>
          <div className={`${lib.filter} ${styles.slots}`} role="group" aria-label="Worn on">
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
                    layoutId="wardrobe-slot"
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
          <p>
            <b>{owned.length}</b> of {ACCESSORIES.length}
          </p>
        </header>
        {mine.length > 0 ? (
          <ul className={styles.rack}>
            {mine.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.thing}
                  aria-pressed={outfit[item.slot] === item.id}
                  onClick={() => {
                    onWear(item);
                    tick();
                  }}
                >
                  <Dressed face={face} outfit={{ [item.slot]: item.id }} size={56} />
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.bare}>
            <p>
              {owned.length ? "Nothing for that place yet." : "Open a box to win your first one."}
            </p>
          </div>
        )}
        {owned.length < ACCESSORIES.length && (
          <button type="button" className={styles.test} onClick={onUnlockAll}>
            Unlock all {ACCESSORIES.length} for testing
          </button>
        )}
      </section>

      <section className={`${lib.glass} ${styles.fitting}`} aria-label="Character">
        {/* the characters to try things on: pressing one puts the same things on it. A mystery
            character stays out of sight until it has been unlocked. */}
        <div className={styles.faces} role="group" aria-label="Try on">
          {CHARACTERS.filter((c) => !c.mystery || c.done >= c.of).map((c) => (
            <button
              key={c.name}
              type="button"
              aria-pressed={face === c.face}
              aria-label={`Try on ${c.name}`}
              onClick={() => {
                setFace(c.face);
                tick();
              }}
            >
              <Dressed face={c.face} outfit={{}} size={34} />
            </button>
          ))}
        </div>
        <div className={styles.mirror}>
          <div className={styles.figure}>
            <Dressed face={face} outfit={outfit} size={168} />
          </div>
          {/* what is on now: pressing one takes it off. The line keeps its height when empty. */}
          <ul className={styles.on} aria-label="Wearing">
            {on.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-label={`Take off ${item.name}`}
                  onClick={() => {
                    onWear(item);
                    tick();
                  }}
                >
                  {item.name}
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d="M7 7l10 10M17 7L7 17" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
