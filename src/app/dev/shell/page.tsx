"use client";

// /dev/shell: step 2 of the portal rebuild, the menu, on the endless world (step 1, /dev/world).
// Second version (founder, 2026-11-15): frosted glass, not paper; Karman's own stickers; spring physics;
// a slim rail on desktop that opens when the pointer is on it. No screen is laid out yet.
//   ?plan=practice|cohort|private   whose menu to show
//   ?night=0                        light mode (dark is the default for now: the founder looks at
//                                   it that way, 2026-11-16)
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
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import "@/components/portal/portal.css";
import "@/components/portal/portal-lit.css";
import PortalFlight from "@/components/portal/PortalFlight";
import { portalFontVars } from "@/components/portal/fonts";
import styles from "./shell.module.css";
import Library, { DOMAINS, DomainPage, LevelPage, type Section } from "./Library";
import Chat from "./Chat";
import Homework from "./Homework";
import Schedule from "./Schedule";
import LibraryHero from "./LibraryHero";
import { Where } from "./Where";
import MistakeLog, { type Trail } from "./MistakeLog";
import { AccountMenu, tuckedIn } from "./More";
import Settings from "./Settings";
import { TEXT_SIZES, frostOf, useSettings } from "./settingsStore";
import { useSettingsEffects } from "./useSettingsEffects";
import { inView, slots, strip, waits } from "./moreBar";
import { useBarWidth, useLensDrag } from "./useBar";
import Progress, { STUDENTS, type StudentKey } from "./Progress";
import type { Found } from "./progressBreakdowns";
import { STATS, type StatKey } from "./progressStats";
import { LEVELS as LEVEL_NAMES } from "./skills72";
import SkillPage, { type OpenSkill } from "./SkillPage";
import { LABEL, ON_BAR, PLANS, type Page, type Plan } from "./plans";
import MusicOffer, { forgetMusic } from "./MusicOffer";
import Rewards from "./Rewards";
import { ChatDemo, Me, Unread, useChatPlan } from "./shellBits";
import { useMenuIntent } from "./useMenuIntent";
import { Sticker, type StickerName } from "./stickers";

/* Springs, in Apple's terms (Designing Fluid Interfaces): a quick response with a little bounce where a
   press or a flick carried the motion, none where a surface simply opens. */
const SLIDE = { type: "spring", stiffness: 520, damping: 34, mass: 1 } as const;
const POP = { type: "spring", stiffness: 600, damping: 18, mass: 0.8 } as const;
const OPEN = { type: "spring", stiffness: 380, damping: 36, mass: 1 } as const;
const STILL = { duration: 0 } as const;
/* the phone's bar turning to its second set and back: one strip pushed along, settling softly */
const TURN = { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const;
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

function Shell() {
  const q = useSearchParams();
  const planQ = q.get("plan");
  const still = useReducedMotion() ?? false;
  const [plan, setPlan] = useState<Plan>(
    planQ !== null && planQ in PLANS ? (planQ as Plan) : "practice"
  );
  const [dark, setDark] = useState(q.get("night") !== "0");
  const [rail, setRail] = useState(false);
  const [open, setOpen] = useState(q.get("open") === "1");
  const held = q.get("open") === "1";
  const { openSoon, notYet } = useMenuIntent(setOpen, held);
  /* the phone's bar is a carousel (moreBar.ts): `turned` is its second set, which More brings in */
  const [turned, setTurned] = useState(false);
  const away = tuckedIn(plan);
  /* with nothing tucked away, More would hold the profile picture alone, so the picture takes
     More's place and the bar never turns (founder, 2026-11-18) */
  const bar: readonly Page[] =
    away.length > 0 ? PLANS[plan].bar : PLANS[plan].bar.map((p) => (p === "more" ? "account" : p));
  const items: readonly Page[] = rail ? PLANS[plan].rail : away.length > 0 ? strip(bar, away) : bar;
  const seen: readonly Page[] = rail ? items : away.length > 0 ? inView(bar, away, turned) : bar;
  const [page, setPage] = useState<Page>(PLANS[plan].home);
  const [skill, setSkill] = useState<OpenSkill | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  /* the student's settings: sound, music, text size and the glass all follow them */
  const kept = useSettings();
  useSettingsEffects(kept);
  const inSkill = page === "library" && skill !== null;
  const [domain, setDomain] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentKey>("weeks9");
  /* the number whose own page is open in Progress, if any */
  const [stat, setStat] = useState<StatKey | null>(null);
  /* what is open inside the Mistake Log on a phone: it names the page and the way back */
  const [trail, setTrail] = useState<Trail | null>(null);
  /* where the phone's five are taken, the Mistake Log can also be opened from Progress, and then it
     goes back there */
  const [viaProgress, setViaProgress] = useState(false);
  const tucked = !rail && viaProgress && page === "mistakes";
  const inStat = page === "progress" && stat !== null;
  const extraTime = kept.extraTime;
  /* demo only: the exam's banner as it is once open, and the challenge's banner asked for again */
  const [examOpen, setExamOpen] = useState(false);
  useChatPlan(plan);
  const [intro, setIntro] = useState(0);
  /* counts each time the offer of music is asked for again (demo only) */
  const [offer, setOffer] = useState(0);
  const [free, setFree] = useState(false);
  /* which way the next page slides: 1 going deeper, -1 coming back */
  const dir = useRef(1);
  /* Escape steps back out of a number's page to Progress */
  useEffect(() => {
    if (!inStat) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      dir.current = -1;
      setStat(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [inStat]);
  // `domain` holds a domain's name or, from the key beside the ring, a level's name
  const openDomain =
    section && domain ? DOMAINS[section].find((d) => d.name === domain) : undefined;
  const openLevel =
    section && domain && !openDomain
      ? LEVEL_NAMES.indexOf(domain as (typeof LEVEL_NAMES)[number])
      : -1;
  /* the lit item: the page, when its picture is in view; if not, where it was opened from */
  const lit: Page = seen.includes(page)
    ? page
    : tucked && seen.includes("progress")
      ? "progress"
      : rail
        ? page
        : "more";
  const at = Math.max(0, items.indexOf(lit));
  /* a skill named on Progress or in the Mistake Log opens on its own page in the Library */
  const openSkill = (found: Found) => {
    dir.current = 1;
    setPage("library");
    setSection(found.section);
    setDomain(found.domain);
    setSkill({ ...found.skill, domain: found.domain });
    setStat(null);
    window.scrollTo({ top: 0 });
  };
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
  /* the bar's width, and from it where every picture of the strip sits (moreBar.ts) */
  const barW = useBarWidth(list, rail);
  const first = PLANS[plan].bar.length;
  const second = away.length > 0 ? away.length + 2 : 1;
  const places = useMemo(() => slots(first, second, barW, turned), [first, second, barW, turned]);
  const delays = useMemo(() => waits(first, second, turned), [first, second, turned]);
  /* the strip moves on its spring only when More turned it; a new width just places it */
  const [turnedAt, setTurnedAt] = useState(-1);
  const turning = !still && turnedAt === barW;
  const turn = () => {
    setTurnedAt(barW);
    setTurned(!turned);
  };
  const spot = useCallback(
    (i: number) => {
      if (!rail) {
        const s = places[i] ?? { x: 0, w: 64 };
        return { x: s.x + s.w / 2, y: 0, w: s.w };
      }
      const li = list.current?.querySelectorAll<HTMLLIElement>("li[data-item]")[i];
      if (!li) return { x: 0, y: 0, w: 64 };
      return { x: 0, y: li.offsetTop, w: li.offsetWidth };
    },
    [rail, places]
  );
  /* what the lens last saw, so it knows a turn of the bar from a new page or a new width */
  const was = useRef({ turned, barW });
  const send = useCallback(
    (i: number, velocity = 0) => {
      const to = spot(i);
      const swung = was.current.turned !== turned;
      if (was.current.barW !== barW) placed.current = false;
      was.current = { turned, barW };
      const how =
        still || !placed.current
          ? STILL
          : swung
            ? { ...TURN, delay: 0.03 }
            : { ...SLIDE, velocity };
      animate(x, to.x, how);
      animate(y, to.y, how);
      animate(w, to.w, how);
      placed.current = true;
    },
    [spot, still, x, y, w, turned, barW]
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

  const nearest = (px: number) => {
    const mid = (i: number) => places[i].x + places[i].w / 2;
    let best = items.indexOf(seen[0]);
    seen.forEach((item) => {
      const i = items.indexOf(item);
      if (Math.abs(mid(i) - px) < Math.abs(mid(best) - px)) best = i;
    });
    return best;
  };
  const go = (item: Page) => {
    setPage(item);
    setViaProgress(false);
    setSkill(null);
    setSection(null);
    setDomain(null);
    setStat(null);
  };
  /* on the phone's bar the lens can be dragged: it follows the finger, and when let go it is thrown
     to the item its speed was carrying it to */
  const { down, move, up } = useLensDrag(x, !rail, (to, v) => {
    const i = nearest(to);
    /* thrown onto More, the lens turns the bar as a press would */
    if (items[i] === "more") {
      send(at, v);
      turn();
    } else {
      go(items[i]);
      send(i, v);
    }
  });

  const choosePlan = (next: Plan) => {
    setPlan(next);
    setTurned(false);
    setPage(PLANS[next].home);
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
      style={
        { "--frost-k": frostOf(kept.clear), "--text-k": TEXT_SIZES[kept.textStep] } as CSSProperties
      }
    >
      <PortalFlight world={world} />

      {/* a strip along the very edge: a pointer thrown to the far left opens the menu */}
      {rail && (
        <div
          className={styles.edge}
          aria-hidden="true"
          onPointerEnter={openSoon}
          onPointerLeave={notYet}
        />
      )}
      <motion.nav
        className={styles.nav}
        aria-label="Portal"
        data-open={wide || undefined}
        initial={false}
        animate={rail ? { width: wide ? 232 : 72 } : { width: "auto" }}
        transition={still ? STILL : OPEN}
        onPointerEnter={openSoon}
        onPointerLeave={() => {
          notYet();
          setOpen(false);
          setHover(null);
        }}
        // the keyboard opens it by tabbing in. Focus that only comes back because the window did
        // (a button pressed earlier is focused again when the browser is returned to) does not.
        onFocus={(e) => e.target.matches(":focus-visible") && setOpen(true)}
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
            // a page the menu has no picture for (Account, on the desktop) lights nothing
            data-off={!items.includes(lit) || undefined}
            style={rail ? { x: 0, y, width: "100%" } : { x: left, y: 0, width: w }}
            aria-hidden="true"
          />
          {items.map((item, i) => {
            const out = !seen.includes(item);
            const pressed = item === "more" && !rail ? turned : undefined;
            return (
              <motion.li
                key={rail ? item : `bar ${item}`}
                data-item
                data-mid={(!rail && !turned && i === 2) || undefined}
                data-out={out || undefined}
                aria-hidden={out || undefined}
                initial={false}
                animate={
                  rail ? undefined : { x: places[i].x, width: places[i].w, opacity: out ? 0 : 1 }
                }
                transition={turning ? { ...TURN, delay: delays[i] } : STILL}
              >
                <motion.button
                  type="button"
                  className={styles.item}
                  aria-current={item === lit && item !== "more" ? "page" : undefined}
                  aria-label={LABEL[item]}
                  aria-expanded={pressed}
                  tabIndex={out ? -1 : undefined}
                  whileTap={still ? undefined : { scale: 0.9 }}
                  transition={POP}
                  onClick={() => (item === "more" ? turn() : go(item))}
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
                    {item === "account" ? (
                      <span className={styles.mine}>
                        <Me />
                      </span>
                    ) : (
                      <Sticker name={item} />
                    )}
                    {(item === "chat" || (item === "more" && !turned && away.includes("chat"))) && (
                      <Unread />
                    )}
                  </motion.span>
                  <span className={styles.word} data-word>
                    {rail ? LABEL[item] : (ON_BAR[item as StickerName] ?? LABEL[item])}
                  </span>
                </motion.button>
              </motion.li>
            );
          })}
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
              <Me />
            </b>
          </span>
          <span className={styles.word}>
            Maya Okafor
            <small>{PLANS[plan].name}</small>
          </span>
        </button>
      </motion.nav>

      <AccountMenu
        open={menu && rail}
        still={still}
        dark={dark}
        onDark={setDark}
        onSettings={() => (go("account"), setMenu(false))}
        onClose={() => setMenu(false)}
      />

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
          {inStat || trail || tucked ? (
            <Where
              from={trail?.back ?? "Progress"}
              onBack={() => {
                dir.current = -1;
                if (trail) trail.go();
                else if (tucked) go("progress");
                else setStat(null);
              }}
            >
              <h1 className={styles.title} key={trail?.name ?? (inStat ? stat : page)} data-long>
                {trail?.name ?? (inStat ? STATS[stat].name : LABEL[page])}
              </h1>
            </Where>
          ) : (
            !(page === "library" && !section) && (
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
            )
          )}
          {/* where the phone's five are taken, the Mistake Log is a press away from Progress */}
          {page === "progress" && !stat && !items.includes("mistakes") && (
            <button
              type="button"
              className={`${styles.back} ${styles.forth}`}
              onClick={() => {
                dir.current = 1;
                setPage("mistakes");
                setViaProgress(true);
                window.scrollTo({ top: 0 });
              }}
            >
              {LABEL.mistakes}
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M9.500 6.500l5.500 5.500-5.500 5.500" />
              </svg>
            </button>
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
                  taught={plan !== "practice"}
                  pro={plan === "practice" && !free}
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
        {/* Progress: choosing a number slides its own page in, the same way a skill does */}
        {page === "progress" && (
          <AnimatePresence mode="wait" initial={false} custom={dir.current}>
            <motion.div
              key={stat ?? "progress"}
              custom={dir.current}
              variants={SLIDE_OVER}
              initial={still ? false : "from"}
              animate="here"
              exit={still ? undefined : "gone"}
            >
              <Progress
                rail={rail}
                student={student}
                stat={stat}
                onStat={(next) => {
                  dir.current = 1;
                  setStat(next);
                  window.scrollTo({ top: 0 });
                }}
                extraTime={extraTime}
                free={free && plan === "practice"}
                onSkill={openSkill}
              />
            </motion.div>
          </AnimatePresence>
        )}
        {page === "chat" && plan !== "practice" && (
          <Chat key={plan} rail={rail} alone={plan === "private"} onTrail={setTrail} />
        )}
        {page === "homework" && <Homework examOpen={examOpen} intro={intro} />}
        {page === "schedule" && plan === "private" && <Schedule onGo={setPage} />}
        {page === "rewards" && <Rewards rail={rail} onTrail={setTrail} />}
        {page === "account" && (
          <Settings
            rail={rail}
            plan={plan}
            dark={dark}
            onDark={setDark}
            onGo={go}
            onTrail={setTrail}
          />
        )}
        {page === "mistakes" && (
          <MistakeLog
            key={student}
            rail={rail}
            student={STUDENTS[student]}
            flags={plan !== "practice"}
            onSkill={openSkill}
            onTrail={setTrail}
          />
        )}
      </main>

      {/* after 8 PM the offer of classical music comes in at the top right (MusicOffer.tsx) */}
      <MusicOffer key={offer} force={offer > 0} />

      {q.get("demo") !== "0" && (
        <div className={styles.demo} role="group" aria-label="Demo switches">
          {(Object.keys(PLANS) as Plan[]).map((k) => (
            <button key={k} type="button" aria-pressed={plan === k} onClick={() => choosePlan(k)}>
              {PLANS[k].label}
            </button>
          ))}
          {(page === "progress" || page === "mistakes") &&
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
          {page === "progress" && plan === "practice" && (
            <button type="button" aria-pressed={free} onClick={() => setFree(!free)}>
              Free plan
            </button>
          )}
          {plan !== "practice" && <ChatDemo plan={plan} />}
          {page === "homework" && (
            <>
              <button type="button" aria-pressed={examOpen} onClick={() => setExamOpen(!examOpen)}>
                Exam open
              </button>
              <button type="button" onClick={() => setIntro(intro + 1)}>
                Challenge intro
              </button>
            </>
          )}
          {/* shows the late-night offer of music now, whatever the hour and whatever was answered */}
          <button
            type="button"
            onClick={() => {
              forgetMusic();
              setOffer(offer + 1);
            }}
          >
            Offer music
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
