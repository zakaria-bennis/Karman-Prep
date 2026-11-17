"use client";

// Adding hours, paid for on the spot (founder, 2026-11-17: "very easy to purchase more hours,
// whether it be in bulk or in single hours ... on mobile it should just take them to Apple Pay ...
// the faster the Apple Pay can pop up, the better").
//   The payment is opened as soon as the Schedule tab is (see `warm`), so when this sheet comes up
//   Stripe's one-tap buttons (Apple Pay, Link, Google Pay, whichever the device has) are placed at
//   once. How many hours is changed on the same payment, so the buttons never have to reload.
//   Every other way to pay (card, pay-later) is behind one small link.
// Card details are typed into Stripe's own frames and never touch this site. The price of an hour
// comes from offer.ts. A sheet from the bottom on a phone, a card in the middle on a wide screen; a
// press outside it, or Escape, closes it.
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import type { Appearance, StripeCheckoutElementsSdk } from "@stripe/stripe-js";
import { HOURS_MAX } from "@/lib/schedule/hours-shared";
import { Buddy } from "./HomeworkBuddy";
import { calm } from "./homeworkMotion";
import { press, useCount } from "./scheduleMotion";
import { RULES } from "./scheduleData";
import { chosen, tick } from "./sound";
import styles from "./schedulePay.module.css";

type Actions = Extract<
  Awaited<ReturnType<StripeCheckoutElementsSdk["loadActions"]>>,
  { type: "success" }
>["actions"];
type Opened = { clientSecret: string; sessionId: string; stripe: Stripe };

const QUICK = [1, 5, 10, 20];
const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });

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
    sessionId?: string;
    publishableKey?: string;
    error?: string;
  };
  if (!res.ok || !body.clientSecret || !body.sessionId || !body.publishableKey)
    throw new Error(body.error || "The payment could not be opened.");
  const stripe = await loadStripe(body.publishableKey);
  if (!stripe) throw new Error("The payment could not be opened.");
  return { clientSecret: body.clientSecret, sessionId: body.sessionId, stripe };
}
/** Called when the Schedule tab opens, so the buttons are there the moment hours are wanted. */
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
  const [oneTap, setOneTap] = useState(true);
  const [more, setMore] = useState(false);
  const [bad, setBad] = useState("");
  const [got, setGot] = useState(0);
  const total = useCount(count * RULES.hourPrice, 2);

  const sheet = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const express = useRef<HTMLDivElement>(null);
  const fields = useRef<HTMLDivElement>(null);
  const actions = useRef<Actions | null>(null);
  const session = useRef("");
  const line = useRef("");
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

  // the payment was bought: it is checked with the server, the hours are added, the sheet says so
  const finish = async () => {
    const res = await fetch(`/api/schedule/hours?session=${encodeURIComponent(session.current)}`);
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
    window.setTimeout(leave, 2400);
  };

  // Stripe's buttons and fields are placed in the sheet
  useEffect(() => {
    let live = true;
    const place = async () => {
      ready ??= open();
      const opened = await ready;
      if (!live) return;
      session.current = opened.sessionId;
      const dark = !sheet.current?.closest('[data-kp-mode="light"]');
      const checkout = opened.stripe.initCheckoutElementsSdk({
        clientSecret: opened.clientSecret,
        elementsOptions: {
          appearance: look(dark),
          fonts: [
            {
              cssSrc:
                "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700;800&display=swap",
            },
          ],
        },
      });
      const loaded = await checkout.loadActions();
      if (!live) return;
      if (loaded.type !== "success") throw new Error("The payment could not be opened.");
      actions.current = loaded.actions;
      line.current = loaded.actions.getSession().lineItems[0]?.id ?? "";

      // the one-tap ways first (only the height is set: see the note in reserve/PayStage.tsx)
      type OneTap = Parameters<typeof checkout.createExpressCheckoutElement>[0];
      const one = checkout.createExpressCheckoutElement({ buttonHeight: 52 } as unknown as OneTap);
      let answered = false;
      const settle = (any: boolean) => {
        if (answered || !live) return;
        answered = true;
        setOneTap(any);
        // none of the one-tap ways is on this device: the card form opens instead
        if (!any) setMore(true);
        setState("ready");
      };
      type Ways = { paymentMethods?: Record<string, boolean> | null };
      (one as unknown as { on: (name: string, heard: (e: Ways) => void) => void }).on(
        "availablepaymentmethodschange",
        (e) => settle(Object.values(e.paymentMethods ?? {}).some(Boolean))
      );
      one.on("confirm", async (event) => {
        setState("paying");
        setBad("");
        const result = await loaded.actions.confirm({
          expressCheckoutConfirmEvent: event,
          redirect: "if_required",
        });
        if (result.type === "error") {
          setState("ready");
          return setBad(result.error.message || "The payment did not go through.");
        }
        await finish();
      });
      if (express.current) one.mount(express.current);
      const all = checkout.createPaymentElement({ layout: "accordion" });
      if (fields.current) all.mount(fields.current);
      window.setTimeout(() => settle(false), 3500);
      // hours chosen while the buttons were loading
      if (want.current !== 1) void amount(want.current);
    };
    place().catch((e: unknown) => {
      ready = null;
      if (!live) return;
      setState("ready");
      setOneTap(false);
      setBad(e instanceof Error ? e.message : "The payment could not be opened.");
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // how many hours: the same payment is changed, so the buttons stay where they are
  const timer = useRef(0);
  const amount = async (hours: number) => {
    if (!actions.current || !line.current) return;
    const result = await actions.current.updateLineItemQuantity({
      lineItem: line.current,
      quantity: hours,
    });
    if (result.type === "error") setBad(result.error.message || "That amount could not be set.");
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

  const pay = async () => {
    if (!actions.current || state === "paying") return;
    setState("paying");
    setBad("");
    const result = await actions.current.confirm({ redirect: "if_required" });
    if (result.type === "error") {
      setState("ready");
      return setBad(result.error.message || "The payment did not go through.");
    }
    await finish();
  };

  const shell = typeof document === "undefined" ? null : document.querySelector(".kp-shell");
  if (!shell) return null;
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
          <div className={styles.done} role="status">
            <Buddy size={108} cheer={1} />
            <b>
              {got} {got === 1 ? "hour" : "hours"} added
            </b>
          </div>
        ) : (
          <>
            <h2>Add hours</h2>
            <div className={styles.quick} role="group" aria-label="How many hours">
              {QUICK.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={count === n}
                  onClick={(e) => {
                    press(e.currentTarget);
                    pick(n);
                  }}
                >
                  <b>{n}</b>
                  <small>{money(n * RULES.hourPrice)}</small>
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
              <p className={styles.total}>{money(total)}</p>
            </div>

            {state === "loading" && (
              <div className={styles.wait} role="status" aria-label="Loading ways to pay" />
            )}
            <div className={styles.express} ref={express} data-off={oneTap ? undefined : ""} />
            {oneTap && state !== "loading" && !more && (
              <button type="button" className={styles.other} onClick={() => setMore(true)}>
                More ways to pay
              </button>
            )}
            <div className={styles.all} hidden={!more}>
              <div ref={fields} />
              <button
                type="button"
                className={styles.go}
                disabled={state !== "ready"}
                onClick={pay}
              >
                {state === "paying" ? "Paying" : `Pay ${money(count * RULES.hourPrice)}`}
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
