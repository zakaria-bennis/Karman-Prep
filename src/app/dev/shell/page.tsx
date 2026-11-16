"use client";

// /dev/shell: step 2 of the portal rebuild, the menu, on the endless world (step 1, /dev/world).
// Second version (founder, 2026-11-15): frosted glass, not paper; Karman's own stickers; spring physics;
// a slim rail on desktop that opens when the pointer is on it. No screen is laid out yet.
//   ?plan=practice|cohort|private   whose menu to show
//   ?night=1                        dark mode
//   ?demo=0                         hide the demo switches (for pictures)
//   ?open=1                         hold the desktop rail open (for pictures)
// Production builds return 404.
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { notFound, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import "@/components/portal/portal.css";
import "@/components/portal/portal-lit.css";
import PortalFlight from "@/components/portal/PortalFlight";
import { Fox } from "@/components/portal/Fox";
import { portalFontVars } from "@/components/portal/fonts";
import styles from "./shell.module.css";
import Library, { DOMAINS, DomainPage, LevelPage, type Section } from "./Library";
import LibraryHero from "./LibraryHero";
import Progress, { STUDENTS, type StudentKey } from "./Progress";
import { LEVELS as LEVEL_NAMES } from "./skills72";
import { setSound } from "./sound";
import SkillPage, { type OpenSkill } from "./SkillPage";
import { Sticker, type StickerName } from "./stickers";

const LABEL: Record<StickerName, string> = {
  homework: "Homework",
  library: "Library",
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
    bar: ["library", "progress", "rewards", "more"],
    rail: ["library", "progress", "rewards"],
  },
  cohort: {
    label: "Cohort",
    name: "Cohort",
    bar: ["homework", "library", "class", "progress", "more"],
    rail: ["homework", "library", "class", "chat", "progress", "rewards"],
  },
  private: {
    label: "Private",
    name: "Private",
    bar: ["homework", "library", "schedule", "progress", "more"],
    rail: ["homework", "library", "schedule", "chat", "progress", "rewards"],
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
/* a page that slides over: it comes in from the side it is headed (1 forward, -1 back) on a spring, and
   the page it replaces leaves quickly the other way */
const SLIDE_OVER = {
  from: (dir: number) => ({ x: dir * 56, opacity: 0 }),
  here: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 560, damping: 40, mass: 1 },
  },
  gone: (dir: number) => ({
    x: dir * -56,
    opacity: 0,
    transition: { duration: 0.09, ease: "easeIn" as const },
  }),
};
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
  const [skill, setSkill] = useState<OpenSkill | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [sound, setSoundOn] = useState(true);
  useEffect(() => setSound(sound), [sound]);
  const inSkill = page === "library" && skill !== null;
  const [domain, setDomain] = useState<string | null>(null);
  /* which made-up student the Progress page shows (demo only) */
  const [student, setStudent] = useState<StudentKey>("weeks9");
  /* how frosted the glass is; the dial remembers its setting on this computer */
  const [frost, setFrost] = useState(0.7);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("kp-frost"));
      if (saved || localStorage.getItem("kp-frost") === "0") setFrost(saved);
    } catch {
      /* no storage: the default stands */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("kp-frost", String(frost));
    } catch {
      /* no storage */
    }
  }, [frost]);
  /* which way the next page slides: 1 going deeper, -1 coming back */
  const dir = useRef(1);
  // `domain` holds a domain's name or, from the key beside the ring, a level's name
  const openDomain =
    section && domain ? DOMAINS[section].find((d) => d.name === domain) : undefined;
  const openLevel =
    section && domain && !openDomain
      ? LEVEL_NAMES.indexOf(domain as (typeof LEVEL_NAMES)[number])
      : -1;
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
  const w = useMotionValue(64);
  const left = useTransform([x, w], ([c, width]: number[]) => c - width / 2);
  const [menu, setMenu] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState(0);
  const placed = useRef(false);
  const spot = useCallback(
    (i: number) => {
      const li = list.current?.querySelectorAll<HTMLLIElement>("li[data-item]")[i];
      if (!li) return { x: 0, y: 0, w: 64 };
      /* the lens is exactly its item: on the bar that is the picture and the word together */
      return rail
        ? { x: 0, y: li.offsetTop, w: li.offsetWidth }
        : { x: li.offsetLeft + li.offsetWidth / 2, y: 0, w: li.offsetWidth };
    },
    [rail]
  );
  const send = useCallback(
    (i: number, velocity = 0) => {
      const to = spot(i);
      const how = still || !placed.current ? STILL : { ...SLIDE, velocity };
      animate(x, to.x, how);
      animate(y, to.y, how);
      animate(w, to.w, how);
      placed.current = true;
    },
    [spot, still, x, y, w]
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
  const wide = rail && (open || held || menu);

  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const away = (e: PointerEvent) => {
      if (!(e.target as Element).closest("[data-account]")) setMenu(false);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", away);
    };
  }, [menu]);

  return (
    <div
      className={`kp-shell ${portalFontVars} ${styles.shell}`}
      data-mode={dark ? "dark" : "light"}
      style={{ "--frost-k": frost } as CSSProperties}
    >
      <PortalFlight world={world} />

      {/* a strip along the very edge: a pointer thrown to the far left opens the menu */}
      {rail && (
        <div className={styles.edge} aria-hidden="true" onPointerEnter={() => setOpen(true)} />
      )}
      <motion.nav
        className={styles.nav}
        aria-label="Portal"
        data-open={wide || undefined}
        initial={false}
        animate={rail ? { width: wide ? 232 : 72 } : { width: "auto" }}
        transition={still ? STILL : OPEN}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => {
          setOpen(false);
          setHover(null);
        }}
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
          {/* a faint piece of glass that follows the pointer from row to row (desktop only) */}
          <motion.li
            className={styles.under}
            aria-hidden="true"
            initial={false}
            animate={{ y: hoverY, opacity: rail && hover !== null && hover !== at ? 1 : 0 }}
            transition={still ? STILL : SLIDE}
          />
          <motion.li
            className={styles.lens}
            style={rail ? { x: 0, y, width: "100%" } : { x: left, y: 0, width: w }}
            aria-hidden="true"
          />
          {items.map((item, i) => (
            <li key={item} data-item>
              <motion.button
                type="button"
                className={styles.item}
                aria-current={item === page ? "page" : undefined}
                aria-label={LABEL[item]}
                whileTap={still ? undefined : { scale: 0.9 }}
                transition={POP}
                onClick={() => {
                  setPage(item);
                  setSkill(null);
                  setSection(null);
                  setDomain(null);
                }}
                onPointerEnter={(e) => {
                  setHover(i);
                  setHoverY(e.currentTarget.parentElement?.offsetTop ?? 0);
                }}
              >
                <motion.span
                  className={styles.art}
                  animate={{ scale: item === page ? 1.12 : 1 }}
                  transition={still ? STILL : POP}
                >
                  <Sticker name={item} />
                </motion.span>
                <span className={styles.word} data-word>
                  {LABEL[item]}
                </span>
              </motion.button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={styles.who}
          data-account
          aria-label="Maya Okafor, account"
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          <span className={styles.face} aria-hidden="true">
            <b>
              <Fox size={26} />
            </b>
          </span>
          <span className={styles.word}>
            Maya Okafor
            <small>{PLANS[plan].name}</small>
          </span>
        </button>
      </motion.nav>

      {/* the profile's own menu: Settings lives here, not in the rail (founder, 2026-11-15) */}
      <AnimatePresence>
        {menu && rail && (
          <motion.div
            className={styles.account}
            role="menu"
            data-account
            initial={still ? false : { opacity: 0, scale: 0.9, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={still ? undefined : { opacity: 0, scale: 0.9, y: 12, filter: "blur(8px)" }}
            transition={still ? STILL : OPEN}
          >
            <button
              type="button"
              role="menuitem"
              className={styles.row}
              onClick={() => {
                setPage("settings");
                setMenu(false);
              }}
            >
              <Sticker name="settings" size={24} />
              Settings
            </button>
            <div className={styles.look} role="group" aria-label="Appearance">
              <button type="button" aria-pressed={!dark} onClick={() => setDark(false)}>
                Light
              </button>
              <button type="button" aria-pressed={dark} onClick={() => setDark(true)}>
                Dark
              </button>
            </div>
            <button
              type="button"
              role="menuitem"
              className={styles.row}
              onClick={() => setMenu(false)}
            >
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={styles.main}>
        <div className={styles.crumbs}>
          {page === "library" && (inSkill || section) && (
            <button
              type="button"
              className={styles.back}
              onClick={() => {
                dir.current = -1;
                if (inSkill) setSkill(null);
                else if (domain) setDomain(null);
                else setSection(null);
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M14.500 6.500L9 12l5.500 5.500" />
              </svg>
              {inSkill ? skill.domain : domain ? section : "Library"}
            </button>
          )}
          {!(page === "library" && !section) && (
            <h1
              className={styles.title}
              key={
                inSkill ? skill.name : page === "library" && section ? (domain ?? section) : page
              }
              data-long={(page === "library" && (inSkill || section !== null)) || undefined}
            >
              {inSkill
                ? skill.name
                : page === "library" && section
                  ? (domain ?? section)
                  : LABEL[page]}
            </h1>
          )}
        </div>
        {page === "library" && !section && <LibraryHero onPick={setSection} />}
        {/* opening a skill slides its page in from the right, over the Library; going back slides it away */}
        {page === "library" && section && (
          <AnimatePresence mode="wait" initial={false} custom={dir.current}>
            <motion.div
              key={skill ? `skill ${skill.name}` : (domain ?? section)}
              custom={dir.current}
              variants={SLIDE_OVER}
              initial={still ? false : "from"}
              animate="here"
              exit={still ? undefined : "gone"}
            >
              {skill ? (
                <SkillPage skill={skill} />
              ) : section && openLevel >= 0 ? (
                <LevelPage
                  section={section}
                  level={openLevel}
                  onOpen={(next) => {
                    dir.current = 1;
                    setSkill(next);
                    window.scrollTo({ top: 0 });
                  }}
                />
              ) : openDomain ? (
                <DomainPage
                  domain={openDomain}
                  onOpen={(next) => {
                    dir.current = 1;
                    setSkill(next);
                    window.scrollTo({ top: 0 });
                  }}
                />
              ) : (
                <Library
                  rail={rail}
                  section={section}
                  onDomain={(name) => {
                    dir.current = 1;
                    setDomain(name);
                    window.scrollTo({ top: 0 });
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
        {page === "progress" && <Progress rail={rail} student={student} />}
      </main>

      {q.get("demo") !== "0" && (
        <div className={styles.demo} role="group" aria-label="Demo switches">
          <label>
            Frost
            <input
              type="range"
              min={0}
              max={1.6}
              step={0.05}
              value={frost}
              aria-valuetext={`${Math.round(frost * 100)} percent`}
              onChange={(e) => setFrost(Number(e.target.value))}
            />
            {Math.round(frost * 100)}%
          </label>
          <button type="button" aria-pressed={sound} onClick={() => setSoundOn(!sound)}>
            Sound
          </button>
          {(Object.keys(PLANS) as Plan[]).map((k) => (
            <button key={k} type="button" aria-pressed={plan === k} onClick={() => choosePlan(k)}>
              {PLANS[k].label}
            </button>
          ))}
          {page === "progress" &&
            (Object.keys(STUDENTS) as StudentKey[]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={student === k}
                onClick={() => setStudent(k)}
              >
                {STUDENTS[k].label}
              </button>
            ))}
          {!rail && (
            <button type="button" aria-pressed={dark} onClick={() => setDark(!dark)}>
              Night
            </button>
          )}
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
