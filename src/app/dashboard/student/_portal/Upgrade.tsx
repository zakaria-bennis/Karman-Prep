"use client";

// The Upgrade sheet (founder, 2026-11-14: "a locked feature says Upgrade when tapped"; Free's paywall
// after the 100 questions offers Practice or Pro; Pro over Practice). One piece of glass over the
// portal: from the bottom on a phone, in the middle on a wide screen. It says why it opened, lets the
// student choose monthly or three months, and each plan's button goes straight to checkout. Every
// price and number is from offer.ts (src/lib/portal/locks.ts). Escape, the close button or a press
// outside closes it; focus stays inside while it is open and goes back where it was after.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  checkoutHref,
  planCard,
  upgradesFor,
  upgradeWords,
  type Term,
  type UpgradeTo,
} from "@/lib/portal/locks";
import { usePortalData } from "./portalData";
import { Seg } from "./settingsControls";
import { tick } from "./sound";
import { closeUpgrade, useUpgrade } from "./upgradeStore";
import styles from "./upgrade.module.css";
import { useStill } from "@/lib/painting/useStill";

const UP = { type: "spring", stiffness: 420, damping: 38, mass: 1 } as const;
const STILL = { duration: 0 } as const;

function Check() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

function Plan({ to, term, lead }: { to: UpgradeTo; term: Term; lead: boolean }) {
  const card = planCard(to, term);
  const [going, setGoing] = useState(false);
  return (
    <article className={styles.plan} data-lead={lead || undefined}>
      <h3>{card.name}</h3>
      <p className={styles.price}>
        <b>{card.price}</b> <span>{card.per}</span>
      </p>
      <ul>
        {card.lines.map((line) => (
          <li key={line}>
            <Check />
            {line}
          </li>
        ))}
      </ul>
      <a
        className={styles.buy}
        href={checkoutHref(to, term)}
        data-lead={lead || undefined}
        aria-busy={going || undefined}
        onClick={() => {
          tick();
          setGoing(true);
        }}
      >
        {going ? (
          <span className={styles.orbs} role="img" aria-label="Opening checkout">
            <i />
            <i />
            <i />
          </span>
        ) : (
          `Get ${card.name}`
        )}
      </a>
    </article>
  );
}

export default function Upgrade() {
  const why = useUpgrade();
  const real = usePortalData();
  const still = useStill();
  const [term, setTerm] = useState<Term>("month");
  const [phone, setPhone] = useState(false);
  const sheet = useRef<HTMLElement>(null);
  const back = useRef<Element | null>(null);
  // the design page has no plan: it shows what Free would be offered
  const offers = upgradesFor(real?.planId ?? "free", why);

  useEffect(() => {
    const m = matchMedia("(max-width: 640px)");
    const set = () => setPhone(m.matches);
    set();
    m.addEventListener("change", set);
    return () => m.removeEventListener("change", set);
  }, []);

  useEffect(() => {
    if (!why) return;
    back.current = document.activeElement;
    const first = sheet.current?.querySelector<HTMLElement>("[data-first]");
    first?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeUpgrade();
      if (e.key !== "Tab" || !sheet.current) return;
      const all = [
        ...sheet.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ];
      if (all.length === 0) return;
      const [head, tail] = [all[0], all[all.length - 1]];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      (back.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [why]);

  const words = why ? upgradeWords(why, offers) : null;
  return (
    <AnimatePresence>
      {why && words && offers.length > 0 && (
        <motion.div
          className={styles.veil}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={still ? STILL : { duration: 0.2 }}
          onClick={() => closeUpgrade()}
        >
          <motion.section
            ref={sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-title"
            className={styles.sheet}
            data-one={offers.length === 1 || undefined}
            initial={still ? false : phone ? { y: "100%" } : { y: 28, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={still ? undefined : phone ? { y: "100%" } : { y: 16, opacity: 0, scale: 0.98 }}
            transition={still ? STILL : UP}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.close}
              aria-label="Close"
              data-first
              onClick={() => {
                tick();
                closeUpgrade();
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
              </svg>
            </button>
            <h2 id="upgrade-title">{words.title}</h2>
            {words.say && <p className={styles.say}>{words.say}</p>}
            <div className={styles.term}>
              <Seg
                label="How to pay"
                value={term}
                options={[
                  { value: "month", label: "Monthly" },
                  { value: "quarter", label: "3 months" },
                ]}
                onChange={setTerm}
              />
            </div>
            <div className={styles.plans}>
              {offers.map((to) => (
                <Plan key={to} to={to} term={term} lead={to === "pro"} />
              ))}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
