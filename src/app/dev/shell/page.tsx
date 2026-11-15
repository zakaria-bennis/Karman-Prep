"use client";

// /dev/shell: step 2 of the portal rebuild, the menu, on the endless world (step 1, /dev/world).
// Second version (founder, 2026-11-15): frosted glass, not paper; Karman's own stickers; spring physics;
// a slim rail on desktop that opens when the pointer is on it. No screen is laid out yet.
//   ?plan=practice|cohort|private   whose menu to show
//   ?night=1                        dark mode
//   ?demo=0                         hide the demo switches (for pictures)
//   ?open=1                         hold the desktop rail open (for pictures)
// Production builds return 404.
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { notFound, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import "@/components/portal/portal.css";
import "@/components/portal/portal-lit.css";
import PortalFlight from "@/components/portal/PortalFlight";
import { portalFontVars } from "@/components/portal/fonts";
import styles from "./shell.module.css";
import { Sticker, type StickerName } from "./stickers";

const LABEL: Record<StickerName, string> = {
  homework: "Homework",
  library: "Library",
  practice: "Practice",
  class: "Class",
  schedule: "Schedule",
  progress: "Progress",
  rewards: "Rewards",
  chat: "Chat",
  settings: "Settings",
  more: "More",
};

/** The founder's menus. `bar` is the phone's five; `rail` is the desktop's, which has room for what the
 *  phone keeps under More. The first item is where that student lands. */
const PLANS = {
  practice: {
    label: "Free, Practice, Pro",
    name: "Practice",
    bar: ["library", "practice", "progress", "rewards", "more"],
    rail: ["library", "practice", "progress", "rewards", "settings"],
  },
  cohort: {
    label: "Cohort",
    name: "Cohort",
    bar: ["homework", "library", "class", "progress", "more"],
    rail: ["homework", "library", "class", "chat", "progress", "rewards", "settings"],
  },
  private: {
    label: "Private",
    name: "Private",
    bar: ["homework", "library", "schedule", "progress", "more"],
    rail: ["homework", "library", "schedule", "chat", "progress", "rewards", "settings"],
  },
} as const satisfies Record<
  string,
  { label: string; name: string; bar: readonly StickerName[]; rail: readonly StickerName[] }
>;
type Plan = keyof typeof PLANS;

/* Springs, in Apple's terms (Designing Fluid Interfaces): a quick response with a little bounce where a
   press or a flick carried the motion, none where a surface simply opens. */
const SLIDE = { type: "spring", stiffness: 520, damping: 34, mass: 1 } as const;
const POP = { type: "spring", stiffness: 600, damping: 18, mass: 0.8 } as const;
const OPEN = { type: "spring", stiffness: 380, damping: 36, mass: 1 } as const;
const STILL = { duration: 0 } as const;
const RAIL = "(min-width: 960px) and (hover: hover)";
/** Where a flick would come to rest (Apple's projection, deceleration 0.99). */
const project = (v: number) => ((v / 1000) * 0.99) / (1 - 0.99);

function Shell() {
  const q = useSearchParams();
  const planQ = q.get("plan");
  const still = useReducedMotion() ?? false;
  const [plan, setPlan] = useState<Plan>(
    planQ !== null && planQ in PLANS ? (planQ as Plan) : "practice"
  );
  const [dark, setDark] = useState(q.get("night") === "1");
  const [rail, setRail] = useState(false);
  const [open, setOpen] = useState(q.get("open") === "1");
  const held = q.get("open") === "1";
  const items: readonly StickerName[] = rail ? PLANS[plan].rail : PLANS[plan].bar;
  const [page, setPage] = useState<StickerName>(PLANS[plan].bar[0]);
  const at = Math.max(0, items.indexOf(page));
  const [world] = useState(() => ({}));

  useEffect(() => {
    document.documentElement.setAttribute("data-kp-mode", dark ? "dark" : "light");
    document.documentElement.setAttribute("data-kp-look", "lit");
  }, [dark]);

  useEffect(() => {
    const m = matchMedia(RAIL);
    const set = () => setRail(m.matches);
    set();
    m.addEventListener("change", set);
    return () => m.removeEventListener("change", set);
  }, []);

  /* ---- the lens: the lit piece of glass under the current item. It is moved by a spring, so a new
     press, or a finger that grabs it, redirects it from wherever it is. ---- */
  const list = useRef<HTMLUListElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const placed = useRef(false);
  const spot = useCallback(
    (i: number) => {
      const li = list.current?.querySelectorAll<HTMLLIElement>("li[data-item]")[i];
      if (!li) return { x: 0, y: 0 };
      return rail ? { x: 0, y: li.offsetTop } : { x: li.offsetLeft + li.offsetWidth / 2, y: 0 };
    },
    [rail]
  );
  const send = useCallback(
    (i: number, velocity = 0) => {
      const to = spot(i);
      const how = still || !placed.current ? STILL : { ...SLIDE, velocity };
      animate(x, to.x, how);
      animate(y, to.y, how);
      placed.current = true;
    },
    [spot, still, x, y]
  );
  useLayoutEffect(() => {
    send(at);
  }, [at, send, items]);
  useEffect(() => {
    const again = () => {
      placed.current = false;
      send(at);
    };
    window.addEventListener("resize", again);
    return () => window.removeEventListener("resize", again);
  }, [at, send]);

  /* on the phone's bar the lens can be dragged: it follows the finger, and when let go it is thrown to
     the item its speed was carrying it to */
  const drag = useRef<{
    startX: number;
    from: number;
    moved: boolean;
    lastX: number;
    lastT: number;
    v: number;
  } | null>(null);
  const nearest = (px: number) => {
    const lis = [...(list.current?.querySelectorAll<HTMLLIElement>("li[data-item]") ?? [])];
    let best = 0;
    lis.forEach((li, i) => {
      const c = li.offsetLeft + li.offsetWidth / 2;
      const b = lis[best].offsetLeft + lis[best].offsetWidth / 2;
      if (Math.abs(c - px) < Math.abs(b - px)) best = i;
    });
    return best;
  };
  const down = (e: ReactPointerEvent<HTMLUListElement>) => {
    if (rail) return;
    drag.current = {
      startX: e.clientX,
      from: x.get(),
      moved: false,
      lastX: e.clientX,
      lastT: e.timeStamp,
      v: 0,
    };
  };
  const move = (e: ReactPointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.startX) < 10) return;
    if (!d.moved) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = 0.6 * d.v + 0.4 * (((e.clientX - d.lastX) / dt) * 1000);
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    const w = e.currentTarget.offsetWidth;
    const raw = d.from + (e.clientX - d.startX);
    const over = raw < 28 ? raw - 28 : raw > w - 28 ? raw - (w - 28) : 0;
    x.set(raw - over + over * 0.25);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    const i = nearest(x.get() + project(d.v));
    setPage(items[i]);
    send(i, d.v);
  };

  const choosePlan = (next: Plan) => {
    setPlan(next);
    setPage(PLANS[next].bar[0]);
  };
  const wide = rail && (open || held);

  return (
    <div
      className={`kp-shell ${portalFontVars} ${styles.shell}`}
      data-mode={dark ? "dark" : "light"}
    >
      <PortalFlight world={world} />

      <motion.nav
        className={styles.nav}
        aria-label="Portal"
        data-open={wide || undefined}
        initial={false}
        animate={rail ? { width: wide ? 232 : 72 } : { width: "auto" }}
        transition={still ? STILL : OPEN}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <span className={styles.brand} aria-label="Karman">
          K<i>arman</i>
        </span>
        <ul
          ref={list}
          className={styles.items}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <motion.li className={styles.lens} style={{ x, y }} aria-hidden="true" />
          {items.map((item) => (
            <li key={item} data-item>
              <motion.button
                type="button"
                className={styles.item}
                aria-current={item === page ? "page" : undefined}
                aria-label={LABEL[item]}
                whileTap={still ? undefined : { scale: 0.9 }}
                transition={POP}
                onClick={() => setPage(item)}
              >
                <motion.span
                  className={styles.art}
                  animate={{ scale: item === page ? 1.14 : 1, y: item === page && !rail ? -1 : 0 }}
                  transition={still ? STILL : POP}
                >
                  <Sticker name={item} />
                </motion.span>
                <span className={styles.word}>{LABEL[item]}</span>
              </motion.button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={styles.who}
          aria-label="Maya Okafor, account"
          onClick={() => setPage(rail ? "settings" : "more")}
        >
          <span className={styles.face} aria-hidden="true">
            M
          </span>
          <span className={styles.word}>
            Maya Okafor
            <small>{PLANS[plan].name}</small>
          </span>
        </button>
      </motion.nav>

      <main className={styles.main}>
        <h1 className={styles.title} key={page}>
          {LABEL[page]}
        </h1>
      </main>

      {q.get("demo") !== "0" && (
        <div className={styles.demo} role="group" aria-label="Demo switches">
          {(Object.keys(PLANS) as Plan[]).map((k) => (
            <button key={k} type="button" aria-pressed={plan === k} onClick={() => choosePlan(k)}>
              {PLANS[k].label}
            </button>
          ))}
          <button type="button" aria-pressed={dark} onClick={() => setDark(!dark)}>
            Night
          </button>
        </div>
      )}
    </div>
  );
}

export default function ShellDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Shell />
    </Suspense>
  );
}
