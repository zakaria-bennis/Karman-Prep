"use client";

/*
 * Intro 10, paper boats (founder, 2026-11-08): a calm stream seen from above at an angle, with
 * two folded paper boats, each with its name on the sail.
 * - Pointing at a boat (or focusing it, or a first tap on a touch screen) makes it bob and turn
 *   toward you, with rings spreading on the water around it.
 * - Choosing it sends it downstream, away up the stream. The camera follows, so the stream
 *   widens around us into the subject's scene: the lake under the bridge for Math, the brook
 *   through the meadow for Reading and Writing. Then the page opens the Library box over it.
 * The stream is painted in by the daily paintings' stroke engine. Transforms and opacity only
 * (Web Animations). Reduced motion: the boats don't move, the stream cross-fades to the scene.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Num } from "@/components/portal/primitives";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { renderLibraryScene } from "@/lib/painting/library/scenes";
import { layoutFor, type Layout, type Slug } from "@/lib/painting/library/seam";
import type { IntroProps, Subject } from "../registry";
import Boat from "./Boat";
import { LANDING, mooring, renderStream } from "./stream-art";
import styles from "./boats.module.css";

const SUBJECTS: Subject[] = ["math", "rw"];
const SLUG: Record<Subject, Slug> = { math: "math", rw: "reading-writing" };
const NAME: Record<Subject, string> = { math: "Math", rw: "Reading and Writing" };
const SAIL_MS = 2300;

function readTint() {
  const cs = getComputedStyle(document.documentElement);
  const hue = parseFloat(cs.getPropertyValue("--hue"));
  const sat = parseFloat(cs.getPropertyValue("--hs"));
  return { hue: Number.isFinite(hue) ? hue : 208, sat: Number.isFinite(sat) ? sat : 55 };
}

interface World {
  vw: number;
  vh: number;
  layout: Layout;
}

export default function PaperBoats({ percents, time, reducedMotion, onChoose }: IntroProps) {
  const [world, setWorld] = useState<World | null>(null);
  const [active, setActive] = useState<Subject | null>(null);
  const [chosen, setChosen] = useState<Subject | null>(null);
  const [shown, setShown] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const stream = useRef<HTMLCanvasElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const boats = useRef<Record<Subject, HTMLButtonElement | null>>({ math: null, rw: null });
  const ground = useRef<Record<Subject, HTMLCanvasElement | null>>({ math: null, rw: null });
  const scenes = useRef<Partial<Record<Subject, HTMLCanvasElement>>>({});
  const groundDone = useRef<Partial<Record<Subject, boolean>>>({});
  const handles = useRef<PaintHandle[]>([]);
  const pointer = useRef("mouse");
  const pressing = useRef(false);
  const live = useRef({ active, chosen });
  live.current = { active, chosen };
  const onChooseRef = useRef(onChoose);
  onChooseRef.current = onChoose;

  useEffect(() => {
    const measure = () => {
      if (live.current.chosen) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setWorld({ vw, vh, layout: layoutFor(vw, vh) });
    };
    measure();
    let t = 0;
    const onResize = () => {
      clearTimeout(t);
      t = window.setTimeout(measure, 180);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  /* Paint the stream in (brushwork, quickly the first time). */
  useEffect(() => {
    if (!world || !stream.current) return;
    const { vw, vh, layout } = world;
    const tint = readTint();
    groundDone.current = {};
    for (const s of SUBJECTS)
      scenes.current[s] = renderLibraryScene(SLUG[s], layout, time, tint, vh / vw).src;
    const first = !shown;
    handles.current.push(
      paintPicture(stream.current, renderStream(vw, vh, time), {
        animate: first && !reducedMotion,
        ms: 1500,
        width: vw,
        height: vh,
      })
    );
    setShown(true);
    const list = handles.current;
    return () => {
      list.splice(0).forEach((p) => p.stop());
    };
    // `shown` only marks the first paint; it must not repaint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, time, reducedMotion]);

  /** Paints the subject's full-screen scene, ready for the camera (once per subject). */
  const paintGround = (s: Subject) => {
    const c = ground.current[s];
    const src = scenes.current[s];
    if (!c || !src || !world || groundDone.current[s]) return;
    groundDone.current[s] = true;
    handles.current.push(
      paintPicture(c, src, { animate: false, width: world.vw, height: world.vh })
    );
  };

  /* Pointing at a boat gets its scene ready, in case it is chosen. */
  useEffect(() => {
    if (!active || chosen) return;
    const id = window.setTimeout(() => paintGround(active), 260);
    return () => clearTimeout(id);
    // paintGround reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, chosen]);

  const choose = (s: Subject) => {
    if (live.current.chosen || !world) return;
    setChosen(s);
    setActive(s);
    paintGround(s);
    const g = ground.current[s];
    if (reducedMotion || !g) {
      g?.animate({ opacity: [0, 1] }, { duration: 450, fill: "forwards" });
      window.setTimeout(() => onChooseRef.current(s), 480);
      return;
    }
    const { vw, vh, layout } = world;
    const m = mooring(layout, s);
    const [lu, lv] = LANDING[layout][s];
    const from = { x: m.u * vw, y: m.v * vh };
    const to = { x: lu * vw, y: lv * vh };
    const ease = "cubic-bezier(0.45, 0, 0.25, 1)";
    /* The boat sails off up the stream, growing small with distance. */
    const boat = boats.current[s]?.querySelector<HTMLElement>("[data-sail]");
    boat?.animate(
      [
        { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
        {
          transform: `translate3d(${(to.x - from.x) * 0.5}px, ${(to.y - from.y) * 0.4 - vh * 0.08}px, 0) scale(0.5)`,
          opacity: 1,
          offset: 0.5,
        },
        {
          transform: `translate3d(${to.x - from.x}px, ${to.y - from.y}px, 0) scale(0.14)`,
          opacity: 0,
        },
      ],
      { duration: SAIL_MS, easing: ease, fill: "forwards" }
    );
    /* The other boat drifts aside. */
    const other = s === "math" ? "rw" : "math";
    boats.current[other]?.animate(
      [
        { opacity: 1, transform: "translate(-50%, -100%)" },
        {
          opacity: 0,
          transform: `translate(calc(-50% + ${other === "math" ? -60 : 60}px), calc(-100% + 30px))`,
        },
      ],
      { duration: 600, easing: "ease-in", fill: "forwards" }
    );
    /* The camera follows: zooming toward the far stream, which opens into the scene. */
    const far = { x: from.x + (to.x - from.x) * 0.2, y: Math.min(from.y, to.y) - vh * 0.12 };
    const cam = camera.current;
    if (cam) {
      cam.style.transformOrigin = `${far.x}px ${far.y}px`;
      cam.animate(
        [
          { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
          {
            transform: `translate3d(${to.x - far.x}px, ${to.y - far.y}px, 0) scale(3.4)`,
            opacity: 0.2,
          },
        ],
        { duration: SAIL_MS, easing: "cubic-bezier(0.55, 0, 0.35, 1)", fill: "forwards" }
      );
    }
    g.style.transformOrigin = `${to.x}px ${to.y}px`;
    g.animate(
      [
        { opacity: 0, transform: "scale(1.5)", offset: 0 },
        { opacity: 0, transform: "scale(1.5)", offset: 0.32 },
        { opacity: 1, transform: "scale(1)", offset: 1 },
      ],
      { duration: SAIL_MS, easing: "cubic-bezier(0.3, 0, 0.2, 1)", fill: "forwards" }
    );
    window.setTimeout(() => onChooseRef.current(s), SAIL_MS + 60);
  };

  if (!world) return <div className={styles.root} />;
  const { layout } = world;

  return (
    <div
      ref={root}
      className={styles.root}
      data-shown={shown || undefined}
      data-time={time}
      data-layout={layout}
      data-chosen={chosen ?? undefined}
      data-reduced={reducedMotion || undefined}
      data-intro="paper-boats"
    >
      <div ref={camera} className={styles.camera}>
        <canvas ref={stream} className={styles.fill} />
      </div>
      {SUBJECTS.map((s) => (
        <canvas
          key={s}
          ref={(c) => {
            ground.current[s] = c;
          }}
          className={`${styles.fill} ${styles.ground}`}
          aria-hidden="true"
        />
      ))}
      <div className={styles.boats} inert={chosen !== null}>
        {SUBJECTS.map((s) => {
          const m = mooring(layout, s);
          const style = {
            left: `${m.u * 100}%`,
            top: `${m.v * 100}%`,
            "--size": m.scale,
          } as CSSProperties;
          return (
            <button
              key={s}
              ref={(b) => {
                boats.current[s] = b;
              }}
              type="button"
              className={styles.boat}
              data-subject={s}
              data-on={active === s || undefined}
              aria-label={`${NAME[s]}, ${percents[s]}% done`}
              style={style}
              onPointerDown={(e) => {
                pointer.current = e.pointerType;
                pressing.current = true;
              }}
              onPointerCancel={() => {
                pressing.current = false;
              }}
              onPointerEnter={(e) => {
                pointer.current = e.pointerType;
                if (e.pointerType !== "touch") setActive(s);
              }}
              onPointerLeave={(e) => {
                if (e.pointerType !== "touch" && live.current.active === s && !live.current.chosen)
                  setActive(null);
              }}
              onFocus={() => {
                if (!pressing.current) setActive(s);
              }}
              onBlur={() => {
                if (live.current.active === s && !live.current.chosen) setActive(null);
              }}
              onClick={() => {
                const pressed = pressing.current;
                pressing.current = false;
                /* On a touch screen the first tap turns the boat; the second sends it off. */
                if (pressed && pointer.current === "touch" && live.current.active !== s) {
                  setActive(s);
                  return;
                }
                choose(s);
              }}
            >
              <span data-sail="" className={styles.sail}>
                <span className={styles.ripples} aria-hidden="true">
                  <i />
                  <i />
                </span>
                <span className={styles.turn}>
                  <span className={styles.bob}>
                    <Boat name={NAME[s]} lines={s === "rw" ? ["Reading and", "Writing"] : ["Math"]}>
                      <Num>{percents[s]}%</Num> done
                    </Boat>
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
