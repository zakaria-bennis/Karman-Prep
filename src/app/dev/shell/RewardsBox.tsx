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
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import { Dressed, type Accessory, type Outfit } from "./accessories";
import styles from "./rewards.module.css";
import box from "./rewardsBox.module.css";
import { BOX_PRICE } from "./rewardsData";
import { chosen, tick, whoosh } from "./sound";

const FOX = "M-34 -80L-8 -56L0 -58L8 -56L34 -80L30 -42L40 -32L30 0L0 8L-30 0L-40 -32L-30 -42Z";
// The wig, as on the portrait on a dollar bill: hair swept back over the whole top of the head, a
// big rolled puff at each side where the ears would be on a man, and a smaller roll under it. The
// fox's own ears come up through it. Under the chin are the coat's shoulders and a cravat.
const WIG_BACK = "M-55 -26C-61 -66 -30 -82 0 -82C30 -82 61 -66 55 -26Z";
const WIG_FRONT =
  "M-34 -35C-25 -50 -8 -54 0 -47C8 -54 25 -50 34 -35L48 -41C43 -62 20 -69 0 -67C-20 -69 -43 -62 -48 -41Z";
const EARS = "M-44 -54L-39 -94L-13 -66ZM44 -54L39 -94L13 -66Z";
const EARS_IN = "M-38 -61L-36 -83L-22 -67ZM38 -61L36 -83L22 -67Z";
const COAT = "M-80 54C-74 20 -46 6 -26 0L26 0C46 6 74 20 80 54Z";
const CRAVAT = "M-13 9C-6 14 6 14 13 9L17 25C9 21 4 27 0 43C-4 27 -9 21 -17 25Z";
const ROLLS = [
  { x: 49, y: -21, rx: 16, ry: 14.5 },
  { x: 46, y: 5, rx: 12, ry: 10 },
];
const PALE = "#fff0b8";
const LINE = "#8a5a00";

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
        <linearGradient id="kp-coin-coat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7a4d00" />
          <stop offset="1" stopColor="#a8700a" />
        </linearGradient>
        <clipPath id="kp-coin-clip">
          <circle cx="24" cy="24" r="17.800" />
        </clipPath>
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
        stroke={LINE}
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
      {/* Karman as the head on the coin: a portrait to the shoulders, cut off by the field's edge */}
      <g clipPath="url(#kp-coin-clip)">
        <g transform="translate(24 31.400) scale(0.235)">
          {/* the coat, and the turn of its collar */}
          <path d={COAT} transform="translate(-2 -2)" fill="#5a3800" fillOpacity="0.6" />
          <path d={COAT} fill="url(#kp-coin-coat)" />
          <path
            d="M-26 1L-9 34M26 1L9 34M-52 14L-40 54M52 14L40 54"
            fill="none"
            stroke="#ffe9a3"
            strokeOpacity="0.55"
            strokeWidth="2.400"
            strokeLinecap="round"
          />
          {/* the hair behind the head, over the whole top of it */}
          <path d={WIG_BACK} transform="translate(-2 -2)" fill="#5a3800" fillOpacity="0.6" />
          <path d={WIG_BACK} fill={PALE} />
          {/* the fox's ears come up through the hair */}
          <path d={EARS} fill="url(#kp-coin-fox)" stroke="#6b4300" strokeWidth="1.600" />
          <path d={EARS_IN} fill={LINE} fillOpacity="0.8" />
          {/* the face */}
          <path d={FOX} transform="translate(-2.200 -2.200)" fill="#5a3800" fillOpacity="0.75" />
          <path d={FOX} fill="url(#kp-coin-fox)" />
          <path
            d="M-40 -32L-16 -14L0 8L16 -14L40 -32M-16 -14L0 -24L16 -14"
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
          {/* the hair swept back from the brow, which hides where the ears begin */}
          <path d={WIG_FRONT} fill={PALE} />
          <path
            d="M-34 -35C-25 -50 -8 -54 0 -47C8 -54 25 -50 34 -35"
            fill="none"
            stroke={LINE}
            strokeOpacity="0.6"
            strokeWidth="1.800"
            strokeLinecap="round"
          />
          <path
            d="M-22 -47C-21 -58 -14 -68 -8 -76M-9 -51C-9 -60 -6 -70 -3 -78M9 -51C9 -60 6 -70 3 -78M22 -47C21 -58 14 -68 8 -76M-36 -43C-36 -52 -31 -58 -27 -62M36 -43C36 -52 31 -58 27 -62"
            fill="none"
            stroke={LINE}
            strokeOpacity="0.45"
            strokeWidth="1.600"
            strokeLinecap="round"
          />
          {/* the rolls at each side, each with the line of its curl */}
          {ROLLS.map((r) =>
            [-1, 1].map((way) => (
              <g key={`${r.y}${way}`} transform={`translate(${way * r.x} ${r.y}) scale(${way} 1)`}>
                <ellipse
                  cx="-1.600"
                  cy="-1.600"
                  rx={r.rx}
                  ry={r.ry}
                  fill="#5a3800"
                  fillOpacity="0.55"
                />
                <ellipse rx={r.rx} ry={r.ry} fill={way < 0 ? PALE : "#ffe7a0"} />
                <path
                  d={`M${-r.rx * 0.62} 1C${-r.rx * 0.5} ${-r.ry * 0.7} ${r.rx * 0.5} ${-r.ry * 0.7} ${r.rx * 0.6} 0C${r.rx * 0.5} ${r.ry * 0.55} ${-r.rx * 0.1} ${r.ry * 0.55} ${-r.rx * 0.15} 0`}
                  fill="none"
                  stroke={LINE}
                  strokeOpacity="0.7"
                  strokeWidth="1.800"
                  strokeLinecap="round"
                />
              </g>
            ))
          )}
          {/* the cravat under the chin */}
          <path d={CRAVAT} transform="translate(-1.600 -1.600)" fill="#5a3800" fillOpacity="0.55" />
          <path d={CRAVAT} fill={PALE} />
          <path
            d="M-9 13C-3 17 3 17 9 13M0 17L0 36"
            fill="none"
            stroke={LINE}
            strokeOpacity="0.6"
            strokeWidth="1.600"
            strokeLinecap="round"
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
          <ellipse
            cx="15"
            cy="-28"
            rx="7"
            ry="4.400"
            transform="rotate(-20 15 -28)"
            fill="#4a2e00"
          />
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
  const still = useReducedMotion() ?? false;
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
