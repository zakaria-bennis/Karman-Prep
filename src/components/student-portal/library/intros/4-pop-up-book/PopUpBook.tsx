"use client";

/*
 * Intro 4, the pop-up book. A large closed book lies on a painted desk. It opens, and two ribbon
 * bookmarks hang out of it: Math and Reading and Writing. Pointing at one lifts its ribbon and
 * flutters the pages on its side. Choosing one lifts the book to face you and flips to that
 * section; a paper pop-up of the subject's scene rises out of the pages, and the camera dives
 * into it, landing on the subject's ground scene. Reduced motion: the book is already open,
 * pointing brightens the ribbon, and choosing cross-fades to the ground scene.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Num } from "@/components/portal/primitives";
import type { IntroProps, Subject } from "../registry";
import { useChoice, useViewport } from "../kit-4-6/hooks";
import {
  NAME,
  SUBJECTS,
  contentArea,
  paintGround,
  paintStill,
  readTint,
  wait,
} from "../kit-4-6/paint";
import kit from "../kit-4-6/kit.module.css";
import { renderDesk } from "./desk";
import { CUTS, cutLayer } from "./popup";
import styles from "./book.module.css";

type Phase = "closed" | "open" | "flip" | "pop" | "dive" | "end";

/** Page width over height. */
const PAGE = 0.74;

function geometry(W: number, H: number) {
  const A = contentArea(W, H);
  const phone = W < 768;
  const narrow = A.w / A.h < 1;
  const sw = Math.min(
    A.w * (phone ? 0.94 : narrow ? 0.9 : 0.62),
    A.h * (phone ? 0.42 : 0.62) * 2 * PAGE
  );
  const sh = sw / 2 / PAGE;
  const x = A.x + (A.w - sw) / 2;
  const y = A.y + A.h * (phone ? 0.16 : narrow ? 0.12 : 0.03);
  const hang = Math.max(56, Math.min(110, A.h * 0.1));
  /* The pop-up stands across the spread; the dive scales it until it covers the screen. */
  const R = { x: x + sw * 0.07, y: y + sh * 0.07, w: sw * 0.86, h: sh * 0.84 };
  const s = Math.max(W / R.w, H / R.h);
  const tx = W / 2 - s * (R.x + R.w / 2);
  const ty = H / 2 - s * (R.y + R.h / 2);
  return {
    x,
    y,
    sw,
    sh,
    hang,
    R,
    dive: `translate(${tx}px, ${ty}px) scale(${s})`,
    /* The layers' picture, placed so that after the dive it sits exactly on the screen. */
    inner: { left: -tx / s - R.x, top: -ty / s - R.y, width: W / s, height: H / s },
    ribbon: (sub: Subject) => x + sw * (sub === "math" ? 0.28 : 0.72),
  };
}

export default function PopUpBook({ percents, time, reducedMotion, onChoose }: IntroProps) {
  const [W, H] = useViewport();
  const desk = useRef<HTMLCanvasElement>(null);
  const grounds = useRef<Record<Subject, HTMLCanvasElement | null>>({ math: null, rw: null });
  const layers = useRef<(HTMLCanvasElement | null)[]>([]);
  const ready = useRef<Record<Subject, Promise<void>> | null>(null);
  const [shown, setShown] = useState(false);
  const [phase, setPhase] = useState<Phase>(reducedMotion ? "open" : "closed");
  const [chosen, setChosen] = useState<Subject | null>(null);
  const live = useRef(true);
  const g = useMemo(() => (W ? geometry(W, H) : null), [W, H]);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  /* Paint the desk now, and both ground scenes quietly behind it. */
  useEffect(() => {
    if (!W || !desk.current) return;
    const tint = readTint();
    const handles = [paintStill(desk.current, renderDesk(W, H, time, tint.hue), W, H)];
    const promises = {} as Record<Subject, Promise<void>>;
    for (const s of SUBJECTS) {
      promises[s] = new Promise<void>((resolve) => {
        const c = grounds.current[s];
        if (!c) return resolve();
        handles.push(paintGround(c, s, W, H, time, tint, resolve));
      });
    }
    ready.current = promises;
    setShown(true);
    return () => handles.forEach((h) => h.stop());
  }, [W, H, time]);

  /* The book opens a moment after the desk shows. */
  useEffect(() => {
    if (!shown || reducedMotion) return;
    const t = window.setTimeout(() => setPhase((p) => (p === "closed" ? "open" : p)), 450);
    return () => clearTimeout(t);
  }, [shown, reducedMotion]);

  const choose = useCallback(
    async (s: Subject) => {
      setChosen(s);
      const groundReady = ready.current?.[s] ?? Promise.resolve();
      if (reducedMotion) {
        await groundReady;
        setPhase("end");
        await wait(520);
        if (live.current) onChoose(s);
        return;
      }
      setPhase("flip");
      await Promise.all([wait(950), groundReady]);
      const ground = grounds.current[s];
      if (!live.current || !ground) return;
      CUTS.forEach((cut, i) => {
        const c = layers.current[i];
        if (c) cutLayer(c, ground, cut);
      });
      setPhase("pop");
      await wait(1250);
      if (!live.current) return;
      setPhase("dive");
      await wait(1350);
      if (!live.current) return;
      setPhase("end");
      await wait(80);
      if (live.current) onChoose(s);
    },
    [onChoose, reducedMotion]
  );

  const { active, props } = useChoice(choose, chosen !== null);
  const percent = (s: Subject) => (s === "math" ? percents.math : percents.rw);

  const vars = g
    ? ({
        "--x": `${g.x}px`,
        "--y": `${g.y}px`,
        "--sw": `${g.sw}px`,
        "--sh": `${g.sh}px`,
        "--hang": `${g.hang}px`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={`${kit.root} ${styles.root}`}
      data-intro="4"
      data-shown={shown || undefined}
      data-phase={phase}
      data-time={time}
      data-still={reducedMotion || undefined}
      data-active={(!chosen && active) || chosen || undefined}
      style={vars}
    >
      <div
        className={styles.world}
        style={{ transform: phase === "dive" || phase === "end" ? g?.dive : undefined }}
      >
        <canvas ref={desk} className={kit.fill} />
        <div className={styles.scene}>
          <div className={styles.book}>
            <div className={styles.block} />
            <div className={`${styles.page} ${styles.right}`} />
            {[0, 1, 2].map((i) => (
              <div
                key={`l${i}`}
                className={`${styles.leaf} ${styles.leafL}`}
                style={{ "--i": i } as CSSProperties}
              />
            ))}
            {[0, 1, 2, 3].map((i) => (
              <div
                key={`r${i}`}
                className={`${styles.leaf} ${styles.leafR}`}
                style={{ "--i": i } as CSSProperties}
              >
                <span className={styles.leafBack} />
              </div>
            ))}
            {SUBJECTS.map((s) => (
              <span key={s} className={styles.ribbonPage} data-s={s} />
            ))}
            <div className={styles.cover}>
              <div className={styles.coverFront}>
                <span className={styles.coverTitle}>Library</span>
              </div>
              <div className={styles.coverBack} />
            </div>
          </div>
        </div>
        {g && (
          <div
            className={styles.pop}
            style={{ left: g.R.x, top: g.R.y, width: g.R.w, height: g.R.h }}
            aria-hidden="true"
          >
            {CUTS.map((_, i) => (
              <div key={i} className={styles.layer} style={{ "--i": i } as CSSProperties}>
                <canvas
                  ref={(c) => {
                    layers.current[i] = c;
                  }}
                  style={{
                    position: "absolute",
                    left: g.inner.left,
                    top: g.inner.top,
                    width: g.inner.width,
                    height: g.inner.height,
                  }}
                />
              </div>
            ))}
          </div>
        )}
        {g &&
          SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              className={`${kit.choice} ${styles.choice}`}
              data-s={s}
              style={{
                left: s === "math" ? g.x : g.x + g.sw / 2,
                top: g.y,
                width: g.sw / 2,
              }}
              aria-label={`${NAME[s]}, ${percent(s)}% done`}
              {...props(s)}
            >
              <span
                className={styles.ribbon}
                style={{ left: g.ribbon(s) - (s === "math" ? g.x : g.x + g.sw / 2) }}
                aria-hidden="true"
              />
              <span className={`${kit.label} ${styles.label}`} aria-hidden="true">
                <span className={kit.name}>{NAME[s]}</span>
                <span className={kit.pct}>
                  <Num>{percent(s)}%</Num> done
                </span>
              </span>
            </button>
          ))}
      </div>
      {SUBJECTS.map((s) => (
        <canvas
          key={s}
          ref={(c) => {
            grounds.current[s] = c;
          }}
          className={kit.ground}
          data-on={(phase === "end" && chosen === s) || undefined}
        />
      ))}
    </div>
  );
}
