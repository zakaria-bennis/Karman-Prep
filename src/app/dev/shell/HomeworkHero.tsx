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
        {/* his body: small under a big head, like a bobblehead, with short thick arms and legs, in a
            hero's suit. He flies with one fist out ahead, his legs and his tail trailing behind. */}
        <svg className={styles.body} viewBox="-60 -112 120 128">
          {/* everything that trails back from the shoulders is drawn along its own line, tilted */}
          <g transform="translate(-24 27) rotate(56)">
            {/* the tail, behind the legs */}
            <g data-tail>
              <path d="M2 14C14 22 20 40 10 54C2 46 -4 30 2 14Z" data-fur />
              <path d="M10 54C16 46 17 40 15 34C10 38 8 44 10 54Z" data-tip />
            </g>
            {/* the far arm, back along his side */}
            <path d="M-13 -6C-22 -2 -24 8 -20 16" data-sleeve />
            <circle cx="-20" cy="17" r="5.600" data-paw />
            {/* two short thick legs in boots */}
            <path d="M-7 16V30" data-leg />
            <path d="M7 16V31" data-leg />
            <path d="M-7 27V33" data-boot />
            <path d="M7 28V34" data-boot />
            {/* the suit, with trunks, a belt and his mark on the chest */}
            <rect x="-15" y="-14" width="30" height="33" rx="12" data-suit />
            <path
              d="M-14.200 10C-8 13.500 8 13.500 14.200 10V13C12 21 -12 21 -14.200 13Z"
              data-trunks
            />
            <path d="M-14.600 8.500C-8 12 8 12 14.600 8.500" data-belt />
            <circle cx="0" cy="-2" r="6.600" data-badge />
            <path d="M-2 -5.500V1.500M2.600 -5.500L-1.600 -2L2.800 1.500" data-letter />
          </g>
          {/* the near arm, out ahead, in a fist */}
          <path d="M-12 22C2 20 18 24 32 30" data-sleeve />
          <circle cx="35" cy="31" r="7" data-paw />
        </svg>
        <span className={styles.head}>
          <Fox size={150} />
          {/* the mask, over the eyes: a shaped band with its eyeholes cut out, a line of stitching
              inside its edge, light along its brow, and two ties streaming back from the knot */}
          <svg className={styles.mask} viewBox="-60 -112 120 128">
            <path data-tie d="M-40 -31C-56 -36 -66 -26 -82 -34C-70 -22 -58 -24 -42 -26Z" />
            <path data-tie d="M-40 -28C-54 -24 -62 -14 -78 -16C-64 -8 -52 -16 -40 -23Z" />
            <path
              data-band
              fillRule="evenodd"
              d="M-43 -31C-32 -45 -9 -42 0 -35C9 -42 32 -45 43 -31C34 -15 12 -17 0 -21C-12 -17 -34 -15 -43 -31ZM-15 -36.500a8 8.200 0 1 0 0 16.400a8 8.200 0 1 0 0-16.400ZM15 -36.500a8 8.200 0 1 0 0 16.400a8 8.200 0 1 0 0-16.400Z"
            />
            <path
              data-stitch
              d="M-38 -31C-30 -40 -10 -38 0 -31C10 -38 30 -40 38 -31C31 -20 12 -21 0 -25C-12 -21 -31 -20 -38 -31Z"
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
