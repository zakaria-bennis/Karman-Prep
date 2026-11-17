"use client";

// The challenge question's picture, the whole of its banner: the fox as a hero, flying through the
// city with his cape streaming behind him (founder, 2026-11-16). By night the city is lit under a
// moon and stars; by day it stands in a bright sky. The city is four depths that slide past at four
// speeds, the nearest (the rooftops he skims) passing in front of him, so he is in among the
// buildings and not over a backdrop. The depths are painted once (heroCity.ts) and then only moved.
import { useEffect, useState, type CSSProperties } from "react";
import { Fox } from "@/components/portal/Fox";
import { TILE, WIDE, paintCity, paintStars, type Depth } from "./heroCity";
import styles from "./homeworkHero.module.css";

const DEPTHS: Depth[] = ["far", "mid", "near", "front"];

export function HeroFlight() {
  const [strips, setStrips] = useState<Partial<Record<Depth | "stars", string>>>({});
  // the city is painted for the page's own light, and again if that is switched
  useEffect(() => {
    const root = document.documentElement;
    const paint = () => {
      const night = root.getAttribute("data-kp-mode") !== "light";
      setStrips({
        ...Object.fromEntries(DEPTHS.map((d) => [d, paintCity(d, night)])),
        stars: night ? paintStars() : "",
      });
    };
    paint();
    const watch = new MutationObserver(paint);
    watch.observe(root, { attributes: true, attributeFilter: ["data-kp-mode"] });
    return () => watch.disconnect();
  }, []);
  return (
    <span className={styles.flight} aria-hidden="true">
      {strips.stars && (
        <span className={styles.stars} style={{ backgroundImage: `url(${strips.stars})` }} />
      )}
      <span className={styles.orb} />
      <span className={styles.cloud} />
      <span className={styles.cloud} />
      {DEPTHS.slice(0, 3).map(
        (d) =>
          strips[d] && (
            <span
              key={d}
              className={styles.strip}
              data-depth={d}
              style={
                {
                  backgroundImage: `url(${strips[d]})`,
                  "--wide": WIDE[d] / TILE.h,
                } as CSSProperties
              }
            />
          )
      )}
      {/* wind going by */}
      <i className={styles.wind} />
      <i className={styles.wind} />
      <i className={styles.wind} />
      <span className={styles.flyer}>
        {/* the cape, behind him: its underside, then its upper side, rippling a beat apart */}
        <svg className={styles.cape} viewBox="-60 -112 120 128">
          <path
            data-under
            d="M-6 6C-40 0 -78 20 -118 2C-124 14 -126 26 -122 40C-86 52 -44 34 -4 26Z"
          />
          <path
            data-over
            d="M-4 -2C-38 -16 -76 6 -116 -12C-122 0 -124 12 -120 26C-84 38 -42 18 -2 12Z"
          />
          <path data-fold d="M-20 -4C-46 -8 -74 8 -104 -2M-18 6C-46 4 -76 20 -108 12" />
        </svg>
        {/* his body, in a Funko Pop's proportions: a big head on a small, sturdy body with short
            thick legs and short arms. The suit is one thought: blue, with a gold shield and belt,
            and red gloves and boots to go with the cape. He flies with one fist out ahead; the
            other hand is open at his side; his legs and tail trail behind. */}
        <svg className={styles.body} viewBox="-60 -112 120 128">
          {/* everything below the neck is drawn upright and then leaned back as he flies */}
          <g transform="translate(-8 9) rotate(40)">
            <g data-tail>
              <path d="M-3 21C-21 25 -27 46 -15 61C-4 53 5 38 4 23Z" data-fur />
              <path d="M-15 61C-21 53 -21 47 -18 42C-12 47 -11 55 -15 61Z" data-tip />
            </g>
            {/* the far arm, short, down along his side, its gloved hand open */}
            <path d="M-13 5.500C-18 9 -19.500 13.500 -19 18" data-limb />
            <path
              d="M-22.300 23.500v4.400M-20 24.600v4.800M-17.600 24.600v4.400M-15.400 23.500v3.600"
              data-finger
            />
            <ellipse cx="-18.800" cy="21.600" rx="4.800" ry="4.400" data-glove />
            <path d="M-14.600 20.200l2.600 1.500" data-finger />
            <path d="M-22.600 17.600h7.400" data-trim />
            {/* two short thick legs, in boots */}
            <rect x="-12.200" y="23" width="10.800" height="12" rx="3" data-suit />
            <rect x="1.400" y="23" width="10.800" height="12" rx="3" data-suit />
            <path
              d="M-12.800 31.500h11.800v5a3.600 3.600 0 0 1-3.600 3.600h-4.600a3.600 3.600 0 0 1-3.600-3.600Z"
              data-glove
            />
            <path
              d="M1 31.500h11.800v5a3.600 3.600 0 0 1-3.600 3.600H4.600A3.600 3.600 0 0 1 1 36.500Z"
              data-glove
            />
            <path d="M-12.800 31.500h11.800M1 31.500h11.800" data-trim />
            {/* the suit */}
            <path
              d="M-14 6.500C-14 1.500 -10.500 -1 -6 -1H6C10.500 -1 14 1.500 14 6.500L12.600 25C8 28.500 -8 28.500 -12.600 25Z"
              data-suit
            />
            <path d="M-10.500 4C-11.500 9 -11.500 15 -10.500 20" data-light />
            <path
              d="M-12.900 21.300C-6 24.400 6 24.400 12.900 21.300L12.600 25C8 28.500 -8 28.500 -12.600 25Z"
              data-gold
            />
            <circle cx="0" cy="24.800" r="2.300" data-buckle />
            <path
              d="M-6 6H6V10.800C6 14.600 2.800 16.700 0 17.800C-2.800 16.700 -6 14.600 -6 10.800Z"
              data-gold
            />
            <path d="M-1.900 8.600V14.400M2.200 8.600L-1.700 11.500L2.400 14.400" data-ink />
          </g>
          {/* the near arm: short, out ahead and a little up, ending in a fist with its fingers
              curled and its thumb across them */}
          <path d="M-1 21.500C5 21.500 11 20 16 17.500" data-limb />
          <g transform="translate(20.500 15.800) rotate(-16)">
            <rect x="-5.200" y="-4.800" width="10.800" height="9.600" rx="3.700" data-glove />
            <path d="M5.300 -2.300h-3.200M5.500 0.100h-3.600M5.300 2.500h-3.200" data-knuckle />
            <path d="M-2.600 -5c2.400-1.500 5.200-.7 5.800 1.300" data-finger />
            <path d="M-5.300 -4.200v8.400" data-trim />
          </g>
        </svg>
        <span className={styles.head}>
          <Fox size={150} />
          {/* the mask, over the eyes: a shaped band with its eyeholes cut out, light along its
              brow, and two ties streaming back from the knot */}
          <svg className={styles.mask} viewBox="-60 -112 120 128">
            <path data-tie d="M-40 -31C-56 -36 -66 -26 -82 -34C-70 -22 -58 -24 -42 -26Z" />
            <path data-tie d="M-40 -28C-54 -24 -62 -14 -78 -16C-64 -8 -52 -16 -40 -23Z" />
            <path
              data-band
              fillRule="evenodd"
              d="M-43 -31C-32 -45 -9 -42 0 -35C9 -42 32 -45 43 -31C34 -15 12 -17 0 -21C-12 -17 -34 -15 -43 -31ZM-15 -36.500a8 8.200 0 1 0 0 16.400a8 8.200 0 1 0 0-16.400ZM15 -36.500a8 8.200 0 1 0 0 16.400a8 8.200 0 1 0 0-16.400Z"
            />
            <path data-shine d="M-36 -34C-28 -41 -14 -41 -5 -36M7 -37C16 -42 28 -41 35 -35" />
            <circle cx="-43" cy="-30" r="3.400" data-knot />
          </svg>
          {/* the cape's clasp at his throat */}
          <svg className={styles.mask} viewBox="-60 -112 120 128">
            <path data-collar d="M-22 0C-10 10 10 10 22 0L16 12C6 17 -6 17 -16 12Z" />
            <circle cx="0" cy="11" r="4.600" data-clasp />
          </svg>
        </span>
      </span>
      {/* the rooftops nearest of all pass in front of him */}
      {strips.front && (
        <span
          className={styles.strip}
          data-depth="front"
          style={
            {
              backgroundImage: `url(${strips.front})`,
              "--wide": WIDE.front / TILE.h,
            } as CSSProperties
          }
        />
      )}
    </span>
  );
}
