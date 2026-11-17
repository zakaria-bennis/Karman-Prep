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
            d="M-6 4C-40 -2 -78 20 -118 2C-124 14 -126 26 -122 40C-86 52 -44 30 -4 20Z"
          />
          <path
            data-over
            d="M-4 -4C-38 -16 -76 6 -116 -12C-122 0 -124 12 -120 26C-84 38 -42 16 -2 8Z"
          />
          <path data-fold d="M-20 -4C-46 -8 -74 8 -104 -2M-18 6C-46 4 -76 20 -108 12" />
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
