"use client";

// Adding hours, paid for on the spot (founder, 2026-11-17).
//   A card on file comes first: one Pay button, nothing to type ("if they have a card on file, we
//   could just charge that card ... it's just a simple checkout button"). With no card on file the
//   device's own one-tap ways come first (Apple Pay and Google Pay on a phone, Link and Google Pay
//   on a wide screen, where Apple Pay is not pushed). Every other way is behind "More ways to pay".
//   Bulk is cheaper: the price is worked out by the server (see hours-shared.ts) and shown here.
//   The payment is opened as soon as the Schedule tab is (see `warm`), so nothing waits when this
//   sheet comes up; choosing another number of hours changes the same payment.
//   Paid, the sheet celebrates: confetti, the student's character, and the new hours as green
//   squares.
// Card details are typed into Stripe's own frames and never touch this site. A sheet from the
// bottom on a phone, a card in the middle on a wide screen; a press outside it, or Escape, closes it.
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import {
  HOURS_MAX,
  dollars,
  hoursPriceCents,
  hoursSavingCents,
  sameForMore,
} from "@/lib/schedule/hours-shared";
import { Buddy } from "./HomeworkBuddy";
import { calm } from "./homeworkMotion";
import { confetti, press, useCount } from "./scheduleMotion";
import { chosen, tick } from "./sound";
import styles from "./schedulePay.module.css";

type Card = { id: string; brand: string; last4: string };
type Opened = { clientSecret: string; intentId: string; stripe: Stripe; card: Card | null };

const QUICK = [1, 5, 10, 20];
const BRAND: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
};

// ---- the payment is made ready before it is asked for ----
let ready: Promise<Opened> | null = null;
async function open(): Promise<Opened> {
  const res = await fetch("/api/schedule/hours", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hours: 1 }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    clientSecret?: string;
    intentId?: string;
    publishableKey?: string;
    card?: Card | null;
    error?: string;
  };
  if (!res.ok || !body.clientSecret || !body.intentId || !body.publishableKey)
    throw new Error(body.error || "The payment could not be opened.");
  const stripe = await loadStripe(body.publishableKey);
  if (!stripe) throw new Error("The payment could not be opened.");
  return {
    clientSecret: body.clientSecret,
    intentId: body.intentId,
    stripe,
    card: body.card ?? null,
  };
}
/** Called when the Schedule tab opens, so paying is ready the moment hours are wanted. */
export function warm() {
  ready ??= open();
  // a failure is said when the sheet is opened, not here
  ready.catch(() => {});
}

function look(dark: boolean): Appearance {
  const ink = dark ? "#f6f1e7" : "#1d1a22";
  return {
    theme: dark ? "night" : "flat",
    variables: {
      fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
      fontSizeBase: "16px",
      fontWeightNormal: "600",
      colorPrimary: dark ? "#8fe6c3" : "#0a5a43",
      colorText: ink,
      colorTextSecondary: ink,
      colorBackground: dark ? "#23263d" : "#fffdf8",
      colorDanger: dark ? "#ffb4a6" : "#b23a26",
      borderRadius: "16px",
    },
  };
}

export default function Pay({
  onPaid,
  onClose,
}: {
  onPaid: (hours: number) => void;
  onClose: () => void;
}) {
  const [count, setCount] = useState(1);
  const [state, setState] = useState<"loading" | "ready" | "paying" | "done">("loading");
  const [card, setCard] = useState<Card | null>(null);
  const [oneTap, setOneTap] = useState(false);
  const [more, setMore] = useState(false);
  const [bad, setBad] = useState("");
  const [got, setGot] = useState(0);
  const cents = hoursPriceCents(count);
  const total = useCount(cents / 100, 2);
  const saving = hoursSavingCents(count);
  const better = sameForMore(count);

  const sheet = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const express = useRef<HTMLDivElement>(null);
  const fields = useRef<HTMLDivElement>(null);
  const party = useRef<HTMLDivElement>(null);
  const opened = useRef<Opened | null>(null);
  const elements = useRef<StripeElements | null>(null);
  const want = useRef(1);
  const paid = useRef(onPaid);
  const close = useRef(onClose);
  useEffect(() => {
    paid.current = onPaid;
    close.current = onClose;
  });

  const leave = () => {
    if (calm() || !sheet.current) return close.current();
    gsap.to(shade.current, { opacity: 0, duration: 0.25 });
    gsap.to(sheet.current, {
      y: 40,
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => close.current(),
    });
  };

  // the sheet rises; Escape closes it
  useEffect(() => {
    if (!calm() && sheet.current) {
      gsap.fromTo(shade.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(
        sheet.current,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "expo.out" }
      );
    }
    const key = (e: KeyboardEvent) => e.key === "Escape" && leave();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  // paid: it is checked with the server, the hours are added, and the sheet celebrates
  const finish = async () => {
    const id = opened.current?.intentId ?? "";
    const res = await fetch(`/api/schedule/hours?intent=${encodeURIComponent(id)}`);
    const body = (await res.json().catch(() => ({}))) as { paid?: boolean; hours?: number };
    if (!body.paid || !body.hours) {
      setState("ready");
      return setBad("The payment did not go through. Nothing was charged.");
    }
    ready = null;
    chosen();
    setGot(body.hours);
    setState("done");
    paid.current(body.hours);
    window.setTimeout(leave, 3400);
  };
  useEffect(() => {
    if (state === "done" && party.current) confetti(party.current);
  }, [state]);

  // On a test key Stripe pins its own developer badge to the bottom right of the screen, over
  // "More ways to pay" on a phone. Customers never see it (it does not exist on a live key); it is
  // put out of the way here so the sheet can be looked at as they will see it.
  useEffect(() => {
    const hide = () => {
      for (const frame of document.querySelectorAll<HTMLElement>(
        "body > iframe, body > div > iframe"
      )) {
        const box = frame.getBoundingClientRect();
        const small = box.width > 0 && box.width < 260 && box.height < 90;
        const corner = box.bottom > window.innerHeight - 100 && box.right > window.innerWidth - 300;
        if (small && corner && /stripe/i.test(frame.getAttribute("name") ?? ""))
          frame.style.display = "none";
      }
    };
    const timer = window.setInterval(hide, 400);
    const stop = window.setTimeout(() => window.clearInterval(timer), 8000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, []);

  const settled = (error: { message?: string } | undefined, status: string | undefined) => {
    if (error || (status && status !== "succeeded" && status !== "processing")) {
      setState("ready");
      return setBad(error?.message || "The payment did not go through.");
    }
    return finish();
  };

  // Stripe's buttons and fields are placed in the sheet
  useEffect(() => {
    let live = true;
    const place = async () => {
      ready ??= open();
      const at = await ready;
      if (!live) return;
      opened.current = at;
      setCard(at.card);
      const dark = !sheet.current?.closest('[data-kp-mode="light"]');
      const group = at.stripe.elements({
        clientSecret: at.clientSecret,
        appearance: look(dark),
        fonts: [
          {
            cssSrc:
              "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700;800&display=swap",
          },
        ],
      });
      elements.current = group;
      // on a phone Apple Pay and Google Pay are offered wherever the browser can; on a wide
      // screen Apple Pay is left out (founder: "on desktop, Apple Pay is probably not what I would
      // want to push")
      const phone = window.matchMedia("(max-width: 719px), (pointer: coarse)").matches;
      const one = group.create("expressCheckout", {
        buttonHeight: 52,
        paymentMethods: {
          applePay: phone ? "always" : "never",
          googlePay: "always",
          link: "auto",
          amazonPay: "never",
        },
      });
      let answered = false;
      const settle = (any: boolean) => {
        if (answered || !live) return;
        answered = true;
        setOneTap(any);
        // no card on file and no one-tap way here: the card form opens by itself
        if (!any && !at.card) setMore(true);
        setState("ready");
      };
      one.on("ready", (e) => settle(Object.values(e.availablePaymentMethods ?? {}).some(Boolean)));
      one.on("confirm", async () => {
        setState("paying");
        setBad("");
        const { error, paymentIntent } = await at.stripe.confirmPayment({
          elements: group,
          clientSecret: at.clientSecret,
          confirmParams: { return_url: window.location.href },
          redirect: "if_required",
        });
        await settled(error, paymentIntent?.status);
      });
      if (express.current) one.mount(express.current);
      const all = group.create("payment", { layout: "accordion" });
      if (fields.current) all.mount(fields.current);
      window.setTimeout(() => settle(false), 3500);
      // hours chosen while this was loading
      if (want.current !== 1) void amount(want.current);
    };
    place().catch((e: unknown) => {
      ready = null;
      if (!live) return;
      setState("ready");
      setBad(e instanceof Error ? e.message : "The payment could not be opened.");
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // how many hours: the same payment is changed, so nothing reloads
  const timer = useRef(0);
  const changing = useRef<Promise<void>>(Promise.resolve());
  const amount = (hours: number) => {
    const run = async () => {
      const at = opened.current;
      if (!at) return;
      const res = await fetch("/api/schedule/hours", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId: at.intentId, hours }),
      });
      if (!res.ok) return setBad("That amount could not be set. Try again.");
      await elements.current?.fetchUpdates();
    };
    changing.current = changing.current.then(run, run);
    return changing.current;
  };
  const pick = (hours: number) => {
    const next = Math.min(HOURS_MAX, Math.max(1, hours));
    tick();
    setBad("");
    setCount(next);
    want.current = next;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void amount(next), 220);
  };

  /** Pays with the card on file, or with whatever was filled in under "More ways to pay". */
  const pay = async (how: "card" | "fields") => {
    const at = opened.current;
    if (!at || state !== "ready") return;
    setState("paying");
    setBad("");
    // a change of hours still on its way is waited for, so the price charged is the one shown
    window.clearTimeout(timer.current);
    await amount(want.current);
    if (how === "card" && card) {
      const { error, paymentIntent } = await at.stripe.confirmCardPayment(at.clientSecret, {
        payment_method: card.id,
      });
      return settled(error, paymentIntent?.status);
    }
    const group = elements.current;
    if (!group) return setState("ready");
    const checked = await group.submit();
    if (checked.error) {
      setState("ready");
      return setBad(checked.error.message || "Check the details and try again.");
    }
    const { error, paymentIntent } = await at.stripe.confirmPayment({
      elements: group,
      clientSecret: at.clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    return settled(error, paymentIntent?.status);
  };

  const shell = typeof document === "undefined" ? null : document.querySelector(".kp-shell");
  if (!shell) return null;
  const hiddenWays = state === "loading" || (!!card && !more) || !oneTap;
  return createPortal(
    <div className={styles.pay}>
      <div className={styles.shade} ref={shade} onClick={leave} />
      <div
        className={styles.sheet}
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Add hours"
        data-state={state}
      >
        {state === "done" ? (
          <div className={styles.done} role="status" ref={party}>
            <Buddy size={112} cheer={1} />
            <b>
              {got} {got === 1 ? "hour" : "hours"} added
            </b>
            <div className={styles.fresh} aria-hidden="true">
              {Array.from({ length: Math.min(got, 20) }, (_, i) => (
                <i key={i} style={{ "--i": i } as React.CSSProperties} />
              ))}
              {got > 20 && <span>+{got - 20}</span>}
            </div>
          </div>
        ) : (
          <>
            <h2>Add hours</h2>
            <div className={styles.quick} role="group" aria-label="How many hours">
              {QUICK.map((n, i) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={count === n}
                  data-n={i}
                  onClick={(e) => {
                    press(e.currentTarget);
                    pick(n);
                  }}
                >
                  <b>{n}</b>
                  <small>{n === 1 ? "hour" : "hours"}</small>
                </button>
              ))}
            </div>
            <div className={styles.fine}>
              <div className={styles.stepper}>
                <button
                  type="button"
                  aria-label="One hour fewer"
                  disabled={count <= 1}
                  onClick={() => pick(count - 1)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M6 12h12" />
                  </svg>
                </button>
                <span aria-live="polite">
                  {count} {count === 1 ? "hour" : "hours"}
                </span>
                <button
                  type="button"
                  aria-label="One hour more"
                  disabled={count >= HOURS_MAX}
                  onClick={() => pick(count + 1)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M6 12h12M12 6v12" />
                  </svg>
                </button>
              </div>
              <p className={styles.total}>
                {total.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
                })}
                {saving > 0 && <small>Save {dollars(saving)}</small>}
              </p>
            </div>
            {better && (
              <button type="button" className={styles.nudge} onClick={() => pick(better)}>
                {better} hours cost the same. Get {better}
              </button>
            )}

            {state === "loading" && (
              <div className={styles.wait} role="status" aria-label="Loading" />
            )}
            {card && state !== "loading" && (
              <div className={styles.onFile}>
                <button
                  type="button"
                  className={styles.go}
                  disabled={state !== "ready"}
                  onClick={() => pay("card")}
                >
                  {state === "paying" ? "Paying" : `Pay ${dollars(cents)}`}
                </button>
                <small>
                  {BRAND[card.brand] ?? "Card"} ending {card.last4}
                </small>
              </div>
            )}
            <div className={styles.express} ref={express} data-off={hiddenWays ? "" : undefined} />
            {state !== "loading" && !more && (oneTap || card) && (
              <button type="button" className={styles.other} onClick={() => setMore(true)}>
                More ways to pay
              </button>
            )}
            <div className={styles.all} hidden={!more}>
              <div ref={fields} />
              <button
                type="button"
                className={card ? styles.second : styles.go}
                disabled={state !== "ready"}
                onClick={() => pay("fields")}
              >
                {state === "paying" ? "Paying" : `Pay ${dollars(cents)}`}
              </button>
            </div>
            {bad && (
              <p className={styles.bad} role="alert">
                {bad}
              </p>
            )}
          </>
        )}
      </div>
    </div>,
    shell
  );
}
