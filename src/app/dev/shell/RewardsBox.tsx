"use client";

// The coin, the mystery box, and what comes out of it. Everything is drawn here in code.
//   The coin   a gold piece with the fox's head carved into it (founder, 2026-11-16): a reeded rim,
//              a sunk field, and the fox cut into that field, dark along its upper left edges and
//              lit along its lower right ones, with slanted eyes.
//   The box    a chunky gift box (in the manner of Crossy Road's), shaded on every face, tied in gold
//              with a full bow. It shakes now and then and gives off sparks. Pressed, it hops, rays
//              break out behind it, the lid bursts away in pieces, and the prize rises out of it
//              (founder, 2026-11-16; this replaces the first version's burst into blocks).
// The prize is shown on the fox and is never put on for the student: they choose "Wear it" or "Keep
// for later". A box holds only things to wear. One sound for each real moment.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import { Fox } from "@/components/portal/Fox";
import styles from "./rewards.module.css";
import { BOX_PRICE, PRIZES, type Wear } from "./rewardsData";
import { chosen, tick, whoosh } from "./sound";

const FOX = "M-34 -80L-8 -56L0 -58L8 -56L34 -80L30 -42L40 -32L30 0L0 8L-30 0L-40 -32L-30 -42Z";

export function Coin({ size = 20 }: { size?: number }) {
  return (
    <svg className={styles.coin} viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="kp-coin-rim" x1="0.15" y1="0.08" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#fff6c9" />
          <stop offset="0.4" stopColor="#f5bd3a" />
          <stop offset="1" stopColor="#9a6500" />
        </linearGradient>
        <radialGradient id="kp-coin-field" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#f7c84a" />
          <stop offset="1" stopColor="#c98a0a" />
        </radialGradient>
        <linearGradient id="kp-coin-fox" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b97c0a" />
          <stop offset="1" stopColor="#e0a326" />
        </linearGradient>
      </defs>
      {/* the rim, with its reeded edge */}
      <circle
        cx="24"
        cy="24"
        r="22.500"
        fill="url(#kp-coin-rim)"
        stroke="#7a4d00"
        strokeWidth="1"
      />
      <circle
        cx="24"
        cy="24"
        r="21"
        fill="none"
        stroke="#8a5a00"
        strokeOpacity="0.5"
        strokeWidth="1.600"
        strokeDasharray="0.9 1.3"
      />
      {/* the field, sunk below the rim: shadow along its upper left, light along its lower right */}
      <circle cx="24" cy="24" r="17.800" fill="url(#kp-coin-field)" />
      <circle
        cx="23.500"
        cy="23.500"
        r="17.800"
        fill="none"
        stroke="#6b4300"
        strokeOpacity="0.55"
      />
      <circle cx="24.600" cy="24.600" r="17.800" fill="none" stroke="#fff3b8" strokeOpacity="0.7" />
      {/* the fox, carved into the field */}
      <g transform="translate(24 35.800) scale(0.3)">
        <path d={FOX} transform="translate(2.600 2.600)" fill="#fff3b8" fillOpacity="0.85" />
        <path d={FOX} transform="translate(-2.200 -2.200)" fill="#5a3800" fillOpacity="0.75" />
        <path d={FOX} fill="url(#kp-coin-fox)" />
        {/* the inner ears, the brow and the mask, cut as lines */}
        <path
          d="M-28 -48L-30 -68L-16 -56ZM28 -48L30 -68L16 -56Z"
          fill="#8a5a00"
          fillOpacity="0.8"
        />
        <path
          d="M-40 -32L0 -26L40 -32M-40 -32L-16 -14L0 8L16 -14L40 -32M-16 -14L0 -24L16 -14"
          fill="none"
          stroke="#6b4300"
          strokeOpacity="0.7"
          strokeWidth="2.200"
          strokeLinejoin="round"
        />
        <path
          d="M-40 -32L-16 -14L0 8L-30 0ZM40 -32L16 -14L0 8L30 0Z"
          fill="#ffe9a3"
          fillOpacity="0.55"
        />
        {/* slanted eyes, each with a point of light */}
        <ellipse
          cx="-15"
          cy="-28"
          rx="7"
          ry="4.400"
          transform="rotate(20 -15 -28)"
          fill="#4a2e00"
        />
        <ellipse cx="15" cy="-28" rx="7" ry="4.400" transform="rotate(-20 15 -28)" fill="#4a2e00" />
        <circle cx="-12.600" cy="-29.800" r="1.700" fill="#fff3b8" />
        <circle cx="17.400" cy="-29.800" r="1.700" fill="#fff3b8" />
        <path d="M-5 -15L5 -15L0 -9Z" fill="#4a2e00" />
        <path
          d="M-4 -5Q0 -2 4 -5"
          fill="none"
          stroke="#4a2e00"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      {/* light catching the upper left of the rim */}
      <path
        d="M7.500 17A18 18 0 0 1 19 6.600"
        fill="none"
        stroke="#fffdf0"
        strokeOpacity="0.8"
        strokeWidth="1.400"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Something worn, drawn over the fox on the fox's own grid. */
export function Worn({ wear }: { wear: Wear }) {
  return (
    <svg className={styles.worn} viewBox="-60 -112 120 128" aria-hidden="true">
      {wear === "glasses" && (
        <g
          fill="#ffffff"
          fillOpacity="0.2"
          stroke="#24180F"
          strokeWidth="2.600"
          strokeLinecap="round"
        >
          <circle cx="-15" cy="-28" r="10.500" />
          <circle cx="15" cy="-28" r="10.500" />
          <path d="M-4.500 -28h9M-25.500 -30l-10 -5M25.500 -30l10 -5" fill="none" />
        </g>
      )}
      {wear === "hat" && (
        <>
          <path d="M-17 -54L0 -100L0 -54Z" fill="#e0683a" />
          <path d="M17 -54L0 -100L0 -54Z" fill="#b8472a" />
          <path d="M-12.500 -66L0 -70L0 -60L-15 -58Z" fill="#fff0da" />
          <path d="M12.500 -66L0 -70L0 -60L15 -58Z" fill="#ecd9bb" />
          <path d="M-5 -98L0 -106L5 -98L0 -92Z" fill="#fff8ee" />
        </>
      )}
      {wear === "crown" && (
        <>
          <path d="M-23 -52L-23 -76L-11 -64L0 -82L0 -52Z" fill="#f6c549" />
          <path d="M23 -52L23 -76L11 -64L0 -82L0 -52Z" fill="#c98a0a" />
          <path d="M-23 -52L23 -52L23 -57L-23 -57Z" fill="#8a5a00" opacity="0.35" />
          <path d="M-3 -62L0 -67L3 -62L0 -57Z" fill="#c0392b" />
        </>
      )}
      {wear === "leaf" && (
        <>
          <path d="M26 -74Q42 -96 58 -84Q46 -64 26 -74Z" fill="#38a47b" />
          <path d="M26 -74Q46 -80 58 -84Q46 -64 26 -74Z" fill="#0a5a43" />
          <path d="M27 -74L54 -83" stroke="#fff8ee" strokeWidth="1.200" opacity="0.7" />
        </>
      )}
    </svg>
  );
}

/** The fox, with whatever it is wearing. */
export function Wearing({ wear, size }: { wear: Wear | null; size: number }) {
  return (
    <span className={styles.wearing} style={{ width: size, height: (size * 128) / 120 }}>
      <Fox size={size} />
      {wear && <Worn wear={wear} />}
    </span>
  );
}

/** The gradients the box's faces and ribbons are filled with. */
function BoxPaints() {
  const fill = (id: string, from: string, to: string, across = false) => (
    <linearGradient id={id} x1="0" y1="0" x2={across ? "1" : "0"} y2="1">
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
  return (
    <defs>
      {fill("kp-box-left", "#4cc096", "#2d9a70")}
      {fill("kp-box-right", "#157a5b", "#084736")}
      {fill("kp-box-top", "#b9efd6", "#7fd2ab", true)}
      {fill("kp-lid-left", "#5fd0a6", "#3aa97f")}
      {fill("kp-lid-right", "#1b8767", "#0b5a44")}
      {fill("kp-gold-lit", "#fff0b3", "#f2b632")}
      {fill("kp-gold-mid", "#f8cf5c", "#d99a16")}
      {fill("kp-gold-dark", "#dda01c", "#a66f00")}
    </defs>
  );
}

/** The box below its lid. */
function BoxBody() {
  return (
    <svg className={styles.boxArt} viewBox="0 0 240 250" aria-hidden="true">
      <BoxPaints />
      <path d="M36 104L120 146L120 234L36 192Z" fill="url(#kp-box-left)" />
      <path d="M204 104L120 146L120 234L204 192Z" fill="url(#kp-box-right)" />
      {/* the ribbon down each face */}
      <path d="M70 121L86 129L86 217L70 209Z" fill="url(#kp-gold-mid)" />
      <path d="M154 129L170 121L170 209L154 217Z" fill="url(#kp-gold-dark)" />
      {/* the shade the lid throws, and the light along the near corner */}
      <path d="M36 104L120 146L204 104L204 118L120 160L36 118Z" fill="#052a20" fillOpacity="0.28" />
      <path d="M120 150V234" stroke="#bff3dc" strokeOpacity="0.5" strokeWidth="1.500" />
    </svg>
  );
}

/** The lid, with the ribbon over it and the bow on top. */
function BoxLid() {
  return (
    <svg className={styles.boxArt} viewBox="0 0 240 250" aria-hidden="true">
      <BoxPaints />
      <path d="M26 81L120 128L120 152L26 105Z" fill="url(#kp-lid-left)" />
      <path d="M214 81L120 128L120 152L214 105Z" fill="url(#kp-lid-right)" />
      <path d="M120 34L214 81L120 128L26 81Z" fill="url(#kp-box-top)" />
      <path d="M70 103L86 111L86 135L70 127Z" fill="url(#kp-gold-mid)" />
      <path d="M154 111L170 103L170 127L154 135Z" fill="url(#kp-gold-dark)" />
      <path d="M70 103L86 111L180 64L164 56Z" fill="url(#kp-gold-lit)" />
      <path d="M154 111L170 103L76 56L60 64Z" fill="url(#kp-gold-mid)" />
      {/* light along the lid's near edges */}
      <path
        d="M26 81L120 128L214 81"
        fill="none"
        stroke="#e9fff5"
        strokeOpacity="0.7"
        strokeWidth="1.600"
      />
      {/* the bow: two full loops, each with its hollow, the tails, and the knot over them */}
      <path d="M112 86L92 112L106 116L120 92Z" fill="url(#kp-gold-dark)" />
      <path d="M128 86L148 112L134 116L120 92Z" fill="url(#kp-gold-mid)" />
      <path d="M118 80C98 42 54 38 54 62C54 84 94 90 118 84Z" fill="url(#kp-gold-lit)" />
      <path d="M108 76C96 56 70 54 70 64C70 74 92 78 108 78Z" fill="#a66f00" />
      <path d="M108 76C98 62 78 60 74 64C80 62 96 66 108 78Z" fill="#7a4d00" fillOpacity="0.5" />
      <path d="M122 80C142 42 186 38 186 62C186 84 146 90 122 84Z" fill="url(#kp-gold-mid)" />
      <path d="M132 76C144 56 170 54 170 64C170 74 148 78 132 78Z" fill="#8a5a00" />
      <path
        d="M132 76C142 62 162 60 166 64C160 62 144 66 132 78Z"
        fill="#5a3800"
        fillOpacity="0.5"
      />
      <rect x="109" y="68" width="22" height="20" rx="7" fill="url(#kp-gold-lit)" />
      <path
        d="M113 72C116 70 124 70 127 72"
        fill="none"
        stroke="#fffdf0"
        strokeOpacity="0.9"
        strokeWidth="1.600"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Where each piece of the lid flies to when it bursts: twelve, up and out, the same every time. */
const SHARDS = Array.from({ length: 12 }, (_, i) => {
  const turn = Math.PI * (1.08 + (i / 11) * 0.84);
  const far = 120 + (i % 3) * 34;
  return {
    x: Math.cos(turn) * far,
    y: Math.sin(turn) * far - 10,
    spin: (i % 2 ? 1 : -1) * (140 + i * 16),
    tint: ["#7fd2ab", "#f2b632", "#3aa97f", "#fff0b3"][i % 4],
  };
});
/** Where the sparks that drift off the resting box begin, and when. */
const SPARKS = [
  { x: -78, y: -6, lag: 0 },
  { x: 74, y: -30, lag: 0.9 },
  { x: -52, y: -74, lag: 1.7 },
  { x: 58, y: 34, lag: 2.4 },
  { x: -88, y: 46, lag: 3.1 },
  { x: 22, y: -92, lag: 3.8 },
];

export default function MysteryBox({
  coins,
  wearing,
  onOpen,
  onWear,
}: {
  coins: number;
  /** What the fox has on now. */
  wearing: Wear | null;
  /** Takes the price, and says which prize came out. */
  onOpen: () => Wear;
  onWear: (wear: Wear) => void;
}) {
  const still = useReducedMotion() ?? false;
  const [stage, setStage] = useState<"closed" | "opening" | "prize">("closed");
  const [prize, setPrize] = useState<Wear | null>(null);
  const short = coins < BOX_PRICE;
  useEffect(() => {
    if (stage !== "opening") return;
    const done = setTimeout(
      () => {
        setStage("prize");
        chosen();
      },
      still ? 0 : 900
    );
    return () => clearTimeout(done);
  }, [stage, still]);

  const name = PRIZES.find((p) => p.key === prize)?.name;
  const open = stage !== "closed";
  return (
    <div className={styles.boxPart}>
      <div className={styles.stage} data-stage={stage}>
        {/* rays break out behind the box as it opens, and turn slowly behind the prize */}
        <AnimatePresence>
          {open && !still && (
            <motion.svg
              key="rays"
              className={styles.rays}
              viewBox="-100 -100 200 200"
              aria-hidden="true"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <g>
                {Array.from({ length: 12 }, (_, i) => (
                  <path key={i} d="M0 0L-7 -98L7 -98Z" transform={`rotate(${i * 30})`} />
                ))}
              </g>
            </motion.svg>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {stage !== "prize" && (
            <motion.div
              key="box"
              className={styles.boxHold}
              data-idle={stage === "closed" || undefined}
              initial={still ? false : { scale: 0.6, opacity: 0 }}
              animate={
                stage === "opening" && !still
                  ? { y: [0, -22, 0], scale: [1, 1.07, 1], opacity: 1 }
                  : { y: 0, scale: 1, opacity: 1 }
              }
              exit={
                still
                  ? undefined
                  : { scale: 0.7, y: 30, opacity: 0, transition: { duration: 0.18 } }
              }
              transition={
                stage === "opening"
                  ? { duration: 0.5, ease: [0.3, 0.9, 0.4, 1] }
                  : { type: "spring", stiffness: 420, damping: 22 }
              }
            >
              <BoxBody />
              {/* the lid: it sits on the box, and is gone the moment the box is opened */}
              {stage === "closed" && (
                <span className={styles.lid}>
                  <BoxLid />
                </span>
              )}
              {stage === "closed" &&
                !still &&
                SPARKS.map((spark, i) => (
                  <i
                    key={i}
                    className={styles.spark}
                    style={
                      {
                        "--x": `${spark.x}px`,
                        "--y": `${spark.y}px`,
                        "--lag": `${spark.lag}s`,
                      } as CSSProperties
                    }
                  />
                ))}
            </motion.div>
          )}
          {/* the lid bursts outward in pieces */}
          {stage === "opening" &&
            !still &&
            SHARDS.map((shard, i) => (
              <motion.i
                key={`shard ${i}`}
                className={styles.shard}
                style={{ background: shard.tint }}
                initial={{ x: 0, y: -30, scale: 1, rotate: 0, opacity: 1 }}
                animate={{ x: shard.x, y: shard.y, scale: 0.5, rotate: shard.spin, opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.15, 0.8, 0.3, 1], delay: 0.16 }}
              />
            ))}
          {/* the prize rises out of the box */}
          {open && prize && (
            <motion.div
              key="prize"
              className={styles.prize}
              initial={still ? false : { y: 40, scale: 0.3, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: still ? 0 : 0.3 }}
            >
              <Wearing wear={prize} size={132} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* the words and buttons under the box keep one height, so opening it moves nothing */}
      <div className={styles.under} aria-live="polite">
        {stage === "prize" && prize ? (
          <>
            <h2>{name}</h2>
            <div className={styles.pair}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  onWear(prize);
                  setStage("closed");
                  tick();
                }}
              >
                Wear it
              </button>
              <button
                type="button"
                className={styles.quiet}
                onClick={() => {
                  setStage("closed");
                  tick();
                }}
              >
                Keep for later
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Mystery box</h2>
            <div className={styles.pair}>
              <button
                type="button"
                className={styles.primary}
                disabled={short || stage === "opening"}
                onClick={() => {
                  setPrize(onOpen());
                  setStage("opening");
                  whoosh();
                }}
              >
                Open
                <Coin size={22} />
                {BOX_PRICE}
              </button>
            </div>
            {/* said only when it matters, in a place that is always kept */}
            <p className={styles.note}>
              {short
                ? `${BOX_PRICE - coins} more coins to open one`
                : wearing && `Wearing: ${PRIZES.find((p) => p.key === wearing)?.name}`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
