"use client";

/*
 * Intro 3, "Library doors" (founder, 2026-11-08): "two tall painted doors of a great old library,
 * Math and Reading and Writing … Pointing at one makes it glow at the gap. Click and it swings
 * open, and the camera walks through into the scene."
 *
 * A stone hall (paint.ts) with a rose window in the hour's sky, wall lamps and a timber floor.
 * Two tall oak doors stand side by side under carved panels (a compass rosette, an open book),
 * each with its name. Pointing at one (or focusing it, or a first tap) eases its leaves ajar:
 * warm light glows in the gap and spills across the floor, and its lamp brightens; the other
 * door dims.
 * Choosing: the two leaves swing open on their hinges onto the subject's ground scene beyond (the
 * shared end state, already painted behind the hall), and the camera walks through the doorway
 * until the scene fills the screen (about 1.8 s, transforms only). Reduced motion: a cross-fade.
 */
import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Num } from "@/components/portal/primitives";
import { paintPicture, type PaintHandle } from "@/lib/painting/painterly";
import { layoutFor, type Slug } from "@/lib/painting/library/seam";
import type { IntroProps, Subject } from "../registry";
import { useIntroStage } from "../stage-context";
import { doorsFor, leafOf, renderDoor, renderHall, type DoorAt } from "./paint";
import styles from "./doors.module.css";

const SHORT: Record<Slug, string> = { math: "Math", "reading-writing": "Reading and Writing" };
const SLUGS: Slug[] = ["math", "reading-writing"];
const toSubject = (s: Slug): Subject => (s === "math" ? "math" : "rw");
/** The leaves swing for this long before the walk begins; the walk takes WALK_MS. */
const SWING_MS = 500;
const WALK_MS = 1300;

interface Geo {
  w: number;
  h: number;
  doors: Record<Slug, DoorAt>;
}

/** A doorway's opening in px. */
const box = (g: Geo, s: Slug) => {
  const d = g.doors[s];
  return {
    left: (d.cx - d.hw) * g.w,
    top: d.top * g.h,
    width: d.hw * 2 * g.w,
    height: (d.bottom - d.top) * g.h,
  };
};

export default function LibraryDoors({ percents, time, reducedMotion, onChoose }: IntroProps) {
  const stage = useIntroStage();
  const host = useRef<HTMLDivElement>(null);
  const hallRef = useRef<HTMLDivElement>(null);
  const cv = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [geo, setGeo] = useState<Geo | null>(null);
  const [active, setActive] = useState<Slug | null>(null);
  const [pick, setPick] = useState<Slug | null>(null);
  const pointer = useRef("mouse");
  const pressing = useRef(false);
  const state = useRef({ active, pick });
  state.current = { active, pick };

  /* Paint the hall and both pairs of doors; again after a resize. */
  useEffect(() => {
    const el = host.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const handles: PaintHandle[] = [];
    let painted = "";
    const paint = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (w < 8 || h < 8 || `${w}x${h}` === painted) return;
      painted = `${w}x${h}`;
      handles.splice(0).forEach((p) => p.stop());
      const doors = doorsFor(layoutFor(w, h));
      const g = { w, h, doors };
      setGeo(g);
      const hall = cv.current.hall;
      if (hall)
        handles.push(
          paintPicture(hall, renderHall(time, h / w, doors), {
            animate: !reducedMotion,
            ms: 1800,
            width: w,
            height: h,
          })
        );
    };
    const timer = window.setTimeout(() => {
      try {
        paint();
      } catch (error) {
        console.error("[library] the doors could not load", error);
      }
    }, 0);
    let resize = 0;
    const ro = new ResizeObserver(() => {
      if (!painted) return;
      clearTimeout(resize);
      resize = window.setTimeout(paint, 180);
    });
    ro.observe(el);
    return () => {
      clearTimeout(timer);
      clearTimeout(resize);
      ro.disconnect();
      handles.forEach((p) => p.stop());
    };
  }, [time, reducedMotion]);

  /* The door leaves, once their canvases are on the page at this size. */
  useEffect(() => {
    if (!geo) return;
    const handles: PaintHandle[] = [];
    const timer = window.setTimeout(() => {
      SLUGS.forEach((s, i) => {
        const b = box(geo, s);
        const door = renderDoor(time, b.height / b.width, 31 + i);
        for (const side of ["left", "right"] as const) {
          const c = cv.current[`${s}-${side}`];
          if (c)
            handles.push(
              paintPicture(c, leafOf(door, side), {
                animate: false,
                width: b.width / 2,
                height: b.height,
                brush: 0.6,
              })
            );
        }
      });
    }, 0);
    return () => {
      clearTimeout(timer);
      handles.forEach((p) => p.stop());
    };
  }, [geo, time]);

  /* Choosing: the leaves swing open, then the camera walks through the doorway. */
  useEffect(() => {
    if (!pick || !geo) return;
    const hall = hallRef.current;
    if (reducedMotion || !hall) {
      const t = window.setTimeout(() => onChoose(toSubject(pick)), 450);
      return () => clearTimeout(t);
    }
    const b = box(geo, pick);
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;
    const s = Math.max(geo.w / b.width, geo.h / b.height) * 1.15;
    hall.style.transformOrigin = `${cx}px ${cy}px`;
    const run = animate(
      hall,
      { x: [0, geo.w / 2 - cx], y: [0, geo.h / 2 - cy], scale: [1, s], opacity: [1, 1, 0] },
      {
        delay: SWING_MS / 1000,
        duration: WALK_MS / 1000,
        ease: [0.55, 0, 0.35, 1],
        opacity: { delay: SWING_MS / 1000, duration: WALK_MS / 1000, times: [0, 0.75, 1] },
      }
    );
    const t = window.setTimeout(() => onChoose(toSubject(pick)), SWING_MS + WALK_MS + 60);
    return () => {
      run.stop();
      clearTimeout(t);
    };
  }, [pick, geo, reducedMotion, onChoose]);

  const choose = (s: Slug) => {
    setActive(null);
    stage.showGround(toSubject(s));
    setPick(s);
  };

  /* The hall, with each doorway cut out so the scene beyond shows once the doors open. */
  const holes = geo
    ? `path(evenodd, "M0 0H${geo.w}V${geo.h}H0Z ${SLUGS.map((s) => {
        const b = box(geo, s);
        return `M${b.left} ${b.top}h${b.width}v${b.height}h${-b.width}Z`;
      }).join(" ")}")`
    : undefined;

  return (
    <div
      ref={host}
      className={styles.root}
      data-shown={geo ? "" : undefined}
      data-pick={pick ?? undefined}
      data-active={(!pick && active) || undefined}
      data-still={reducedMotion || undefined}
    >
      <div ref={hallRef} className={styles.hall}>
        <canvas
          ref={(c) => {
            cv.current.hall = c;
          }}
          className={styles.paint}
          style={{ clipPath: holes, WebkitClipPath: holes }}
        />
        {geo &&
          SLUGS.map((s) => {
            const b = box(geo, s);
            const d = geo.doors[s];
            return (
              <div key={s}>
                {/* Warm light spilling across the floor from the gap. */}
                <span
                  className={styles.spill}
                  data-door={s}
                  aria-hidden="true"
                  style={{
                    left: b.left - b.width * 0.4,
                    top: d.bottom * geo.h,
                    width: b.width * 1.8,
                    height: geo.h * (1 - d.bottom) + 2,
                  }}
                />
                <button
                  type="button"
                  className={styles.door}
                  data-slug={s}
                  data-on={active === s || undefined}
                  style={b}
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
                    if (e.pointerType !== "touch" && state.current.active === s) setActive(null);
                  }}
                  onFocus={() => {
                    if (!pressing.current) setActive(s);
                  }}
                  onBlur={() => {
                    if (state.current.active === s) setActive(null);
                  }}
                  onClick={() => {
                    const pressed = pressing.current;
                    pressing.current = false;
                    if (pressed && pointer.current === "touch" && state.current.active !== s) {
                      setActive(s);
                      return;
                    }
                    if (!state.current.pick) choose(s);
                  }}
                >
                  {/* The light behind the doors, seen in the gap; it gives way to the scene. */}
                  <span className={styles.glow} aria-hidden="true" />
                  <span className={styles.leaves} aria-hidden="true">
                    {(["left", "right"] as const).map((side) => (
                      <canvas
                        key={side}
                        ref={(c) => {
                          cv.current[`${s}-${side}`] = c;
                        }}
                        className={styles.leaf}
                        data-side={side}
                      />
                    ))}
                  </span>
                  <span className={styles.label}>
                    <span className={styles.name} data-name="">
                      {SHORT[s]}
                    </span>
                    <span className={styles.pct}>
                      <Num>{s === "math" ? percents.math : percents.rw}%</Num> done
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
