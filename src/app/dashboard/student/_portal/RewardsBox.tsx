"use client";

// The coin, the mystery box, and what comes out of it. Everything is drawn here in code.
//   The coin   a gold piece with Karman the fox on it as George Washington is on a dollar bill
//              (founder, 2026-11-16, with the portrait as his reference): a reeded rim, a sunk
//              field, and in it the fox to the shoulders, the wig over his whole head with a roll at
//              each side, his ears up through it, a coat and a cravat.
//   The box    a chunky gift box in the manner of Crossy Road's, shaded on every face, tied in gold
//              with a soft bow. It shakes now and then and gives off sparks. Pressed, it squashes
//              and shakes for a moment, then the lid flies off, a burst of blocks goes up, light
//              pours out of the open box, and the prize pops out and hangs over it. The open box
//              shows its inside. (He asked for elements of Crossy Road's opening; this is built from
//              what I know of it, not from watching it again.)
// The prize is one of the 100 things to wear (accessories.tsx); once all are won, none can be
// opened. It is shown on the fox and is never put on for the student: they choose "Keep for later" or
// "Wear it". One sound for each real moment.
import { Coin } from "@/components/portal/Coin";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import { Dressed, type Accessory, type Outfit } from "./accessories";
import styles from "./rewards.module.css";
import box from "./rewardsBox.module.css";
import { BOX_PRICE } from "./rewardsData";
import { chosen, tick, whoosh } from "./sound";
import { useStill } from "@/lib/painting/useStill";

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
      {fill("kp-box-in-left", "#0c5441", "#052a20")}
      {fill("kp-box-in-right", "#127257", "#0a4031")}
      {fill("kp-gold-lit", "#fff0b3", "#f2b632")}
      {fill("kp-gold-mid", "#f8cf5c", "#d99a16")}
      {fill("kp-gold-dark", "#dda01c", "#a66f00")}
    </defs>
  );
}

/** The box below its lid. */
function BoxBody() {
  return (
    <svg className={box.boxArt} viewBox="0 0 240 250" aria-hidden="true">
      <BoxPaints />
      {/* the inside, seen when the lid is off: the two far walls, darker toward the bottom */}
      <path d="M36 104L120 62L120 146Z" fill="url(#kp-box-in-left)" />
      <path d="M204 104L120 62L120 146Z" fill="url(#kp-box-in-right)" />
      <path
        d="M36 104L120 62L204 104"
        fill="none"
        stroke="#bff3dc"
        strokeOpacity="0.55"
        strokeWidth="1.500"
      />
      <path d="M36 104L120 146L120 234L36 192Z" fill="url(#kp-box-left)" />
      <path d="M204 104L120 146L120 234L204 192Z" fill="url(#kp-box-right)" />
      {/* the ribbon down each face */}
      <path d="M70 121L86 129L86 217L70 209Z" fill="url(#kp-gold-mid)" />
      <path d="M154 129L170 121L170 209L154 217Z" fill="url(#kp-gold-dark)" />
      {/* the light along the near corner and the near rim */}
      <path
        d="M36 104L120 146L204 104"
        fill="none"
        stroke="#d6fbea"
        strokeOpacity="0.7"
        strokeWidth="1.500"
      />
      <path d="M120 150V234" stroke="#bff3dc" strokeOpacity="0.5" strokeWidth="1.500" />
    </svg>
  );
}

/** The lid, with the ribbon over it and the bow on top: two soft loops, each lit above and shaded
 *  below with a crease where it is pulled into the knot, and two tails that curl down the lid. */
function BoxLid() {
  return (
    <svg className={box.boxArt} viewBox="0 0 240 250" aria-hidden="true">
      <BoxPaints />
      <path d="M26 81L120 128L120 152L26 105Z" fill="url(#kp-lid-left)" />
      <path d="M214 81L120 128L120 152L214 105Z" fill="url(#kp-lid-right)" />
      <path d="M120 34L214 81L120 128L26 81Z" fill="url(#kp-box-top)" />
      <path d="M70 103L86 111L86 135L70 127Z" fill="url(#kp-gold-mid)" />
      <path d="M154 111L170 103L170 127L154 135Z" fill="url(#kp-gold-dark)" />
      <path d="M70 103L86 111L180 64L164 56Z" fill="url(#kp-gold-lit)" />
      <path d="M154 111L170 103L76 56L60 64Z" fill="url(#kp-gold-mid)" />
      <path
        d="M26 81L120 128L214 81"
        fill="none"
        stroke="#e9fff5"
        strokeOpacity="0.7"
        strokeWidth="1.600"
      />
      {/* the tails */}
      <path
        d="M114 88C104 96 98 104 92 116L102 113L106 123C110 108 116 98 121 92Z"
        fill="url(#kp-gold-dark)"
      />
      <path
        d="M126 88C136 96 144 102 152 112L142 112L140 122C134 108 128 98 121 92Z"
        fill="url(#kp-gold-mid)"
      />
      {/* the left loop */}
      <path d="M118 82C104 58 70 44 58 58C48 72 70 88 118 87Z" fill="url(#kp-gold-lit)" />
      <path d="M118 85C98 85 74 79 60 64C58 76 78 90 118 88Z" fill="#b97c0a" fillOpacity="0.75" />
      <path
        d="M118 82C112 76 106 72 99 70C106 77 110 82 112 87Z"
        fill="#7a4d00"
        fillOpacity="0.55"
      />
      <path
        d="M70 56C80 52 92 58 100 66"
        fill="none"
        stroke="#fffdf0"
        strokeOpacity="0.8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* the right loop, a little fuller */}
      <path d="M122 82C138 54 174 44 184 60C192 74 170 90 122 87Z" fill="url(#kp-gold-mid)" />
      <path
        d="M122 85C144 86 170 80 183 64C186 76 164 92 122 88Z"
        fill="#8a5a00"
        fillOpacity="0.7"
      />
      <path
        d="M122 82C128 76 134 72 141 70C134 77 130 82 128 87Z"
        fill="#5a3800"
        fillOpacity="0.5"
      />
      <path
        d="M150 58C160 52 172 54 178 60"
        fill="none"
        stroke="#fff3b8"
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* the knot */}
      <ellipse cx="120" cy="84" rx="9.500" ry="8.500" fill="url(#kp-gold-lit)" />
      <path
        d="M114 81C117 78 123 78 126 81"
        fill="none"
        stroke="#fffdf0"
        strokeOpacity="0.9"
        strokeWidth="1.600"
        strokeLinecap="round"
      />
      <path
        d="M113 88C117 91 123 91 127 88"
        fill="none"
        stroke="#8a5a00"
        strokeOpacity="0.6"
        strokeWidth="1.400"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The blocks that fly up when the lid comes off: fourteen, up and out, the same every time. */
const BLOCKS = Array.from({ length: 14 }, (_, i) => {
  const turn = Math.PI * (1.06 + (i / 13) * 0.88);
  const far = 110 + ((i * 7) % 5) * 22;
  return {
    x: Math.cos(turn) * far,
    y: Math.sin(turn) * far - 6,
    spin: (i % 2 ? 1 : -1) * (160 + i * 18),
    size: 12 + ((i * 5) % 4) * 4,
    tint: ["#7fd2ab", "#f2b632", "#3aa97f", "#fff0b3", "#e0564a", "#6aa9e8"][i % 6],
  };
});
/** The soft shafts of light that pour out of the open box: uneven, as light is. */
const SHAFTS = [
  { turn: -64, long: 150, wide: 22, lag: 0 },
  { turn: -41, long: 205, wide: 30, lag: 0.7 },
  { turn: -22, long: 170, wide: 18, lag: 1.9 },
  { turn: -6, long: 228, wide: 34, lag: 0.3 },
  { turn: 13, long: 186, wide: 20, lag: 1.3 },
  { turn: 31, long: 214, wide: 28, lag: 2.3 },
  { turn: 52, long: 160, wide: 24, lag: 0.9 },
  { turn: 70, long: 132, wide: 16, lag: 1.6 },
];
/** Small stars that come and go round the prize, and drift off the resting box. */
const TWINKLES = [
  { x: -96, y: -60, lag: 0, size: 12 },
  { x: 88, y: -84, lag: 0.5, size: 16 },
  { x: -58, y: -112, lag: 1.1, size: 10 },
  { x: 112, y: -18, lag: 1.6, size: 11 },
  { x: -118, y: 6, lag: 2.1, size: 14 },
  { x: 40, y: -124, lag: 0.8, size: 9 },
  { x: -24, y: -70, lag: 1.9, size: 8 },
  { x: 70, y: 30, lag: 2.6, size: 10 },
];

export default function MysteryBox({
  coins,
  outfit,
  left,
  onOpen,
  onWear,
  onWardrobe,
  owned,
  all,
}: {
  coins: number;
  /** What the fox has on now. */
  outfit: Outfit;
  /** How many things to wear are still to be won. */
  left: number;
  /** Takes the price, and says which prize came out. */
  onOpen: () => Accessory;
  onWear: (prize: Accessory) => void;
  onWardrobe: () => void;
  owned: number;
  /** How many things to wear there are in all. */
  all: number;
}) {
  const still = useStill();
  const [stage, setStage] = useState<"closed" | "shaking" | "open">("closed");
  const [prize, setPrize] = useState<Accessory | null>(null);
  const short = coins < BOX_PRICE;
  useEffect(() => {
    if (stage !== "shaking") return;
    // a moment of shaking before it gives: the wait is half of the pleasure
    const done = setTimeout(
      () => {
        setStage("open");
        chosen();
      },
      still ? 0 : 520
    );
    return () => clearTimeout(done);
  }, [stage, still]);

  const open = stage === "open";
  return (
    <div className={box.boxPart}>
      <div className={box.stage} data-stage={stage}>
        {/* light pours out of the open box: a soft bloom, uneven shafts, small stars */}
        <AnimatePresence>
          {open && !still && (
            <motion.div
              key="glow"
              className={box.glow}
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
            >
              <i className={box.bloom} />
              {SHAFTS.map((shaft, i) => (
                <i
                  key={i}
                  className={box.shaft}
                  style={
                    {
                      "--turn": `${shaft.turn}deg`,
                      "--long": `${shaft.long}px`,
                      "--wide": `${shaft.wide}px`,
                      "--lag": `${shaft.lag}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className={box.boxHold}
          data-idle={stage === "closed" || undefined}
          data-shaking={stage === "shaking" || undefined}
          animate={open ? { y: 34, scale: 0.86 } : { y: 0, scale: 1 }}
          transition={still ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 22 }}
        >
          <BoxBody />
          {/* the lid flies off, tumbling, when the box gives */}
          <AnimatePresence initial={false}>
            {!open && (
              <motion.span
                key="lid"
                className={box.lid}
                initial={still ? false : { y: -40, opacity: 0 }}
                animate={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
                exit={
                  still
                    ? undefined
                    : {
                        y: -210,
                        x: 90,
                        rotate: 70,
                        opacity: 0,
                        transition: { duration: 0.6, ease: [0.2, 0.7, 0.3, 1] },
                      }
                }
                transition={{ type: "spring", stiffness: 380, damping: 20 }}
              >
                <BoxLid />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {(stage === "closed" || open) &&
          !still &&
          TWINKLES.slice(0, open ? 8 : 5).map((spark, i) => (
            <i
              key={`${stage} ${i}`}
              className={box.spark}
              style={
                {
                  "--x": `${spark.x}px`,
                  "--y": `${spark.y + (open ? 0 : 40)}px`,
                  "--lag": `${spark.lag}s`,
                  "--size": `${spark.size}px`,
                } as CSSProperties
              }
            />
          ))}

        {/* a burst of blocks goes up with the lid */}
        {open &&
          !still &&
          BLOCKS.map((block, i) => (
            <motion.i
              key={`block ${i}`}
              className={box.block}
              style={{ background: block.tint, width: block.size, height: block.size }}
              initial={{ x: 0, y: -10, scale: 1, rotate: 0, opacity: 1 }}
              animate={{
                x: block.x,
                y: [-10, block.y, block.y + 70],
                scale: 0.6,
                rotate: block.spin,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 1, ease: [0.15, 0.8, 0.3, 1], times: [0, 0.55, 1] }}
            />
          ))}

        {/* the prize pops out of the box and hangs over it */}
        <AnimatePresence>
          {open && prize && (
            <motion.div
              key="prize"
              className={box.prize}
              initial={still ? false : { y: 46, scale: 0.2, rotate: -18, opacity: 0 }}
              animate={{ y: -34, scale: 1, rotate: 0, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 280, damping: 14, delay: still ? 0 : 0.12 }}
            >
              <span className={box.bob}>
                <Dressed face="fox" outfit={{ ...outfit, [prize.slot]: prize.id }} size={124} />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* the words and buttons under the box keep one height, so opening it moves nothing */}
      <div className={styles.under} aria-live="polite">
        {open && prize ? (
          <>
            <h2>{prize.name}</h2>
            {/* keeping it is the first choice, at the left and in green; wearing it now is beside it */}
            <div className={styles.pair}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setStage("closed");
                  tick();
                }}
              >
                Keep for later
              </button>
              <button
                type="button"
                className={styles.quiet}
                onClick={() => {
                  onWear(prize);
                  setStage("closed");
                  tick();
                }}
              >
                Wear it
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Mystery box</h2>
            <div className={styles.pair}>
              {/* with everything won there is nothing left to open, so the way to open one goes */}
              {left > 0 && (
                <button
                  type="button"
                  className={styles.primary}
                  disabled={short || stage === "shaking"}
                  onClick={() => {
                    setPrize(onOpen());
                    setStage("shaking");
                    whoosh();
                  }}
                >
                  Open
                  <Coin size={22} />
                  {BOX_PRICE}
                </button>
              )}
              <button type="button" className={styles.quiet} onClick={onWardrobe}>
                Wardrobe
              </button>
            </div>
            {/* said in a place that is always kept */}
            <p className={styles.note}>
              {left === 0
                ? `You have all ${all}`
                : short
                  ? `${BOX_PRICE - coins} more coins to open one`
                  : `${owned} of ${all} won`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export { Coin };
