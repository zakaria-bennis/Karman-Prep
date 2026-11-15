"use client";

// The Library's first screen: one sky cut in two, Reading and Writing on one half and Math on the other
// (founder, 2026-11-15, chosen from three demos). The scene is heroes/splitSky.ts, a live three.js scene
// moved by GSAP. It is one canvas; the two choices are real buttons laid over it, so they work with a
// keyboard and a screen reader. A wide stage (desktop) sets the halves side by side; a tall one (phone)
// stacks them. Reduced motion holds the scene still and skips the exit.
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { Hero, Side, Stage } from "./heroes/stage";
import styles from "./hero.module.css";
import { DOMAINS, SECTIONS, tally, type Section } from "./Library";
import { buzz, chosen, ping, rustle, whoosh } from "./sound";

export default function LibraryHero({ onPick }: { onPick: (section: Section) => void }) {
  const still = useReducedMotion() ?? false;
  const host = useRef<HTMLDivElement>(null);
  const live = useRef<{ hero: Hero; stage: Stage; run: (fn: () => void) => void } | null>(null);
  const leaving = useRef(false);
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const [leavingNow, setLeavingNow] = useState(false);

  useEffect(() => {
    const box = host.current;
    if (!box) return;
    let gone = false;
    let undo = () => {};
    leaving.current = false;
    (async () => {
      const [{ createStage }, { gsap }, scene] = await Promise.all([
        import("./heroes/stage"),
        import("gsap"),
        import("./heroes/splitSky"),
      ]);
      if (gone) return;
      const stage = createStage(box, still);
      let hero!: Hero;
      const ctx = gsap.context(() => {
        hero = scene.build(stage);
      });
      stage.start();
      live.current = { hero, stage, run: (fn) => ctx.add(fn) };
      setReady(true);
      undo = () => {
        live.current = null;
        ctx.revert();
        stage.dispose();
      };
    })();
    return () => {
      gone = true;
      undo();
      setReady(false);
    };
  }, [still]);

  const hover = (side: Side | null) => {
    const now = live.current;
    if (!now || leaving.current) return;
    now.run(() => now.hero.hover(side));
    if (side === 0) rustle();
    if (side === 1) ping();
  };

  const choose = (side: Side) => {
    const now = live.current;
    if (leaving.current) return;
    if (!now || still) return onPick(SECTIONS[side]);
    leaving.current = true;
    setLeavingNow(true);
    whoosh();
    chosen();
    buzz(14);
    now.run(() => now.hero.choose(side, () => onPick(SECTIONS[side])));
  };

  /* the split sky can be dragged: the seam follows the pointer, and letting go far enough over chooses */
  const moved = (e: React.PointerEvent) => {
    const now = live.current;
    const p = press.current;
    if (!now?.hero.drag || !p || leaving.current) return;
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 10) return;
    p.moved = true;
    const at = now.stage.toWorld(e.clientX, e.clientY);
    now.run(() => now.hero.drag?.(at));
  };
  const lifted = () => {
    const now = live.current;
    const p = press.current;
    press.current = null;
    if (!now?.hero.drag || !p?.moved) return;
    let side: Side | null = null;
    now.run(() => {
      side = now.hero.drag?.(null) ?? null;
    });
    if (side !== null) choose(side);
  };

  return (
    <div
      className={styles.hero}
      data-leaving={leavingNow || undefined}
      data-ready={ready || undefined}
      onPointerDown={(e) => (press.current = { x: e.clientX, y: e.clientY, moved: false })}
      onPointerMove={moved}
      onPointerUp={lifted}
      onPointerCancel={lifted}
    >
      <div ref={host} className={styles.canvas} aria-hidden="true" />
      <div className={styles.picks}>
        {SECTIONS.map((section, i) => {
          const side = i as Side;
          const counts = tally(DOMAINS[section].flatMap((d) => d.skills));
          const total = counts.reduce((a, b) => a + b, 0);
          return (
            <button
              key={section}
              type="button"
              className={styles.pick}
              data-side={side}
              onClick={(e) => {
                // a drag that ended on the button is not a press
                if (e.detail > 0 && press.current?.moved) return;
                choose(side);
              }}
              onPointerEnter={(e) => e.pointerType === "mouse" && hover(side)}
              onPointerLeave={(e) => e.pointerType === "mouse" && hover(null)}
              onFocus={() => hover(side)}
              onBlur={() => hover(null)}
            >
              <span className={styles.plaque}>
                <span className={styles.name}>{section}</span>
                <span className={styles.meta}>
                  <b>{counts[3]}</b> of {total} stars lit
                </span>
                <span className={styles.band}>
                  <i style={{ width: `${(counts[3] / total) * 100}%` }} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
