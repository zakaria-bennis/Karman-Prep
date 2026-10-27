"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SITE_THEMES } from "@/lib/themes/palettes";
import { useTheme } from "@/components/shared/ThemeProvider";
import { seededRandom } from "@/lib/student/assemble";
import {
  CloseIcon,
  GamesIcon,
  HomeIcon,
  SkillsIcon,
  TestsIcon,
  ThemeIcon,
  TrialIcon,
} from "./icons";
import { LAYER_ID } from "./Layer";
import s from "./student.module.css";

const NAV = [
  { href: "", label: "Home", Icon: HomeIcon },
  { href: "/skills", label: "Skills", Icon: SkillsIcon },
  { href: "/time-trial", label: "Time Trial", Icon: TrialIcon },
  { href: "/games", label: "Games", Icon: GamesIcon },
  { href: "/tests", label: "Tests", Icon: TestsIcon },
];

/** The student app's frame: constellation ground (rule 49), slim icon rail on wide screens,
 *  a glass tab bar on phones (rule 52). */
export function AppFrame({ base, children }: { base: string; children: ReactNode }) {
  const path = usePathname();
  const [themeOpen, setThemeOpen] = useState(false);
  const active = (href: string) => (href === "" ? path === base : path.startsWith(base + href));
  return (
    <div className={s.app}>
      <Ground />
      <nav className={s.rail} aria-label="Student">
        <span className={s.wordmark} aria-hidden="true">
          K
        </span>
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={label}
            href={base + href}
            className={s.railItem}
            aria-current={active(href) ? "page" : undefined}
            aria-label={label}
            title={label}
          >
            <Icon />
          </Link>
        ))}
        <button
          type="button"
          className={`${s.railItem} ${s.railBottom}`}
          aria-label="Theme"
          title="Theme"
          onClick={() => setThemeOpen(true)}
        >
          <ThemeIcon />
        </button>
      </nav>
      <main className={s.main}>{children}</main>
      <nav className={`${s.tabBar} ${s.glass}`} aria-label="Student">
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={label}
            href={base + href}
            className={s.tab}
            aria-current={active(href) ? "page" : undefined}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <button
        type="button"
        className={`${s.themeFab} ${s.glassButton}`}
        aria-label="Theme"
        onClick={() => setThemeOpen(true)}
      >
        <ThemeIcon size={20} />
      </button>
      <AnimatePresence>
        {themeOpen && <ThemeSheet onClose={() => setThemeOpen(false)} />}
      </AnimatePresence>
      <div id={LAYER_ID} className={s.layer} />
    </div>
  );
}

function ThemeSheet({ onClose }: { onClose(): void }) {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <motion.div
        className={s.scrim}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-label="Theme"
        className={`${s.sheet} ${s.panel}`}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      >
        <div className={s.sheetHead}>
          <h2 className={s.h2}>Theme</h2>
          <button type="button" className={s.iconButton} aria-label="Close" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        </div>
        <div className={s.swatches}>
          {SITE_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={s.swatch}
              aria-pressed={theme === t.id}
              onClick={() => setTheme(t.id)}
            >
              <span
                className={s.swatchChip}
                style={{ background: t.canvas, borderColor: t.border }}
              >
                <span style={{ background: t.gold }} />
                <span style={{ background: t.math }} />
                <span style={{ background: t.reading }} />
              </span>
              {t.name}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

/** Faint stars and a few joining lines, drifting very slowly. Still under reduced motion. */
export function Ground() {
  const { stars, lines } = useMemo(() => {
    const rand = seededRandom(1987);
    const stars = Array.from({ length: 90 }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      r: 0.05 + rand() * 0.11,
      o: 0.18 + rand() * 0.4,
    }));
    // Short chains: each line walks to the nearest unused star, like a drawn constellation.
    const used = new Set<number>();
    const lines = [5, 27, 48, 70].map((start) => {
      const chain = [start];
      used.add(start);
      for (let k = 0; k < 3; k++) {
        const from = stars[chain.at(-1)!];
        let best = -1;
        let dist = Infinity;
        stars.forEach((st, i) => {
          const d = Math.hypot(st.x - from.x, st.y - from.y);
          if (!used.has(i) && d < dist) [best, dist] = [i, d];
        });
        if (dist > 16) break;
        used.add(best);
        chain.push(best);
      }
      return chain.map((i) => stars[i]);
    });
    return { stars, lines };
  }, []);
  return (
    <svg
      className={s.ground}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g className={s.groundDrift}>
        {lines.map((pts, i) => (
          <polyline
            key={i}
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            className={s.groundLine}
          />
        ))}
        {stars.map((st, i) => (
          <circle key={i} cx={st.x} cy={st.y} r={st.r} opacity={st.o} className={s.groundStar} />
        ))}
      </g>
    </svg>
  );
}
