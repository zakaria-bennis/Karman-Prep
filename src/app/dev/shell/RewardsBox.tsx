"use client";

// The mystery box, and what comes out of it (founder, 2026-10-30): a chunky gift box in the manner of
// Crossy Road's, pressed to open, one at a time. It bursts into blocks; nothing unfolds like paper and
// it casts no shadow. The prize is shown on the fox and is never put on for the student: they choose
// "Wear it" or "Keep for later". One sound for each real moment. Everything is drawn here in code.
// It is opened with tokens, and it holds only things to wear (founder, 2026-11-16).
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Fox } from "@/components/portal/Fox";
import styles from "./rewards.module.css";
import { BOX_PRICE, PRIZES, type Wear } from "./rewardsData";
import { chosen, tick, whoosh } from "./sound";

/** A token: a gold piece with the fox's head set into it (founder, 2026-11-16). The same gold in
 *  every theme, lit from the upper left; the fox is a darker gold with a lighter left side. */
export function Token({ size = 20 }: { size?: number }) {
  return (
    <svg className={styles.token} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="kp-token" x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#fff3b8" />
          <stop offset="0.45" stopColor="#f2b632" />
          <stop offset="1" stopColor="#a66f00" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.500" fill="url(#kp-token)" stroke="#8a5a00" strokeWidth="1" />
      <circle
        cx="12"
        cy="12"
        r="8.800"
        fill="none"
        stroke="#fff3b8"
        strokeOpacity="0.55"
        strokeWidth="0.700"
      />
      {/* the fox: ears, cheeks and chin, as on the mark */}
      <path
        d="M6.900 5.800L10.800 9.400L12 9.100L13.200 9.400L17.100 5.800L16.500 11.500L18 13L16.500 17.800L12 19L7.500 17.800L6 13L7.500 11.500Z"
        fill="#b97c0a"
      />
      <path
        d="M6.900 5.800L10.800 9.400L12 9.100L12 19L7.500 17.800L6 13L7.500 11.500Z"
        fill="#d99a16"
      />
      <path
        d="M6 13L9.600 15.700L12 19L7.500 17.800ZM18 13L14.400 15.700L12 19L16.500 17.800Z"
        fill="#ffe28a"
      />
      <path d="M9.600 15.700L12 14.200L14.400 15.700L12 19Z" fill="#ffe9a3" />
      <circle cx="9.750" cy="13.600" r="0.950" fill="#6b4300" />
      <circle cx="14.250" cy="13.600" r="0.950" fill="#6b4300" />
      <path d="M11.250 15.900H12.750L12 16.700Z" fill="#6b4300" />
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

/** The box itself: a cube with a lid, in the page's green, tied with gold. */
function Box() {
  return (
    <svg className={styles.box} viewBox="0 0 200 204" aria-hidden="true">
      {/* the body */}
      <path d="M30 89L100 124L100 196L30 161Z" fill="#38a47b" />
      <path d="M170 89L100 124L100 196L170 161Z" fill="#0a5a43" />
      <path d="M58 103L72 110L72 182L58 175Z" fill="#f6c549" />
      <path d="M142 103L128 110L128 182L142 175Z" fill="#c98a0a" />
      {/* the lid: a little wider than the body, so it reads as a lid */}
      <path d="M22 67L100 106L100 126L22 87Z" fill="#45b48a" />
      <path d="M178 67L100 106L100 126L178 87Z" fill="#0e6f53" />
      <path d="M100 28L178 67L100 106L22 67Z" fill="#86d0ac" />
      <path d="M58 85L72 92L72 112L58 105Z" fill="#ffd96b" />
      <path d="M142 85L128 92L128 112L142 105Z" fill="#d99a16" />
      <path d="M58 85L72 92L150 53L136 46Z" fill="#ffe28a" />
      <path d="M128 92L142 85L64 46L50 53Z" fill="#f6c549" />
      {/* the bow */}
      <path d="M100 66L78 48L74 62Z" fill="#d99a16" />
      <path d="M100 66L122 48L126 62Z" fill="#f6c549" />
      <path d="M93 62L100 58L107 62L100 70Z" fill="#fff3b8" />
    </svg>
  );
}

/** Where each block of the burst flies to: sixteen, all round the box, the same every time. */
const BLOCKS = Array.from({ length: 16 }, (_, i) => {
  const turn = (i / 16) * Math.PI * 2 + (i % 2) * 0.2;
  const far = 92 + (i % 3) * 26;
  return {
    x: Math.cos(turn) * far,
    y: Math.sin(turn) * far - 20,
    spin: (i % 2 ? 1 : -1) * (120 + i * 14),
    tint: ["#38a47b", "#0a5a43", "#86d0ac", "#f6c549"][i % 4],
  };
});

export default function MysteryBox({
  tokens,
  wearing,
  onOpen,
  onWear,
}: {
  tokens: number;
  /** What the fox has on now. */
  wearing: Wear | null;
  /** Takes the price, and says which prize came out. */
  onOpen: () => Wear;
  onWear: (wear: Wear) => void;
}) {
  const still = useReducedMotion() ?? false;
  const [stage, setStage] = useState<"closed" | "burst" | "prize">("closed");
  const [prize, setPrize] = useState<Wear | null>(null);
  const short = tokens < BOX_PRICE;
  useEffect(() => {
    if (stage !== "burst") return;
    const done = setTimeout(
      () => {
        setStage("prize");
        chosen();
      },
      still ? 0 : 620
    );
    return () => clearTimeout(done);
  }, [stage, still]);

  const name = PRIZES.find((p) => p.key === prize)?.name;
  return (
    <div className={styles.boxPart}>
      <div className={styles.stage}>
        <AnimatePresence initial={false}>
          {stage === "closed" && (
            <motion.div
              key="box"
              className={styles.boxHold}
              initial={still ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={still ? undefined : { scale: 1.18, opacity: 0, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              <Box />
            </motion.div>
          )}
          {stage === "burst" &&
            !still &&
            BLOCKS.map((block, i) => (
              <motion.i
                key={i}
                className={styles.block}
                style={{ background: block.tint }}
                initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
                animate={{ x: block.x, y: block.y, scale: 0.4, rotate: block.spin, opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.3, 1] }}
              />
            ))}
          {stage === "prize" && prize && (
            <motion.div
              key="prize"
              className={styles.prize}
              initial={still ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 20 }}
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
                disabled={short || stage === "burst"}
                onClick={() => {
                  setPrize(onOpen());
                  setStage("burst");
                  whoosh();
                }}
              >
                Open
                <Token size={20} />
                {BOX_PRICE}
              </button>
            </div>
            {/* said only when it matters, in a place that is always kept */}
            <p className={styles.note}>
              {short
                ? `${BOX_PRICE - tokens} more tokens to open one`
                : wearing && `Wearing: ${PRIZES.find((p) => p.key === wearing)?.name}`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
