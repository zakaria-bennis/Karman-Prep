"use client";

// Our own payment page for a reserved seat (founder, 2026-11-14). Stripe's fields are placed inside our
// card, in our type and colours: card numbers are typed into Stripe's own frames, so they never touch
// this site. The one-tap ways to pay come first, Link above the rest (one tap for anyone who has saved a
// card with Link, at Stripe's normal card rate). Every other way to pay, the card form and the pay-later
// plans included, is behind one small link under them.
// Words: reserve-copy.ts (payPage). Styles: styles/reserve.css.
import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Appearance, StripeCheckoutElementsSdk } from "@stripe/stripe-js";
import { track } from "@/lib/analytics/client";
import { RESERVE } from "@/lib/marketing/reserve-copy";

const W = RESERVE.payPage;
type Actions = Extract<
  Awaited<ReturnType<StripeCheckoutElementsSdk["loadActions"]>>,
  { type: "success" }
>["actions"];

/** Stripe's fields, dressed like the site's pills. They follow the page's light or dark mode. */
function appearance(dark: boolean): Appearance {
  const ink = dark ? "#fffaf3" : "#1d1a22";
  return {
    theme: dark ? "night" : "flat",
    variables: {
      fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
      fontSizeBase: "17px",
      fontWeightNormal: "600",
      colorPrimary: dark ? "#8fb0ff" : "#2449b8",
      colorText: ink,
      colorTextSecondary: ink,
      colorBackground: dark ? "#24243c" : "#fffdf8",
      colorDanger: dark ? "#ffb4a6" : "#b23a26",
      borderRadius: "18px",
      spacingUnit: "5px",
    },
    rules: {
      ".Input": { boxShadow: "none", border: `1.5px solid ${dark ? "#5c5c7c" : "#cfc8bd"}` },
      ".Input:focus": {
        boxShadow: "none",
        border: `2px solid ${dark ? "#8fb0ff" : "#2449b8"}`,
      },
      ".Label": { fontWeight: "800" },
      ".Tab, .AccordionItem": {
        boxShadow: "none",
        border: `1.5px solid ${dark ? "#5c5c7c" : "#cfc8bd"}`,
      },
    },
  };
}

export default function PayStage({
  clientSecret,
  publishableKey,
  back,
  title,
  what,
  amount,
  note,
}: {
  clientSecret: string;
  publishableKey: string;
  /** Back to the reservation's last step. */
  back: string;
  title: string;
  /** "The 9-week SAT cohort, March" */
  what: string;
  /** "$995" */
  amount: string;
  /** What follows a deposit, or "". */
  note: string;
}) {
  const express = useRef<HTMLDivElement>(null);
  const fields = useRef<HTMLDivElement>(null);
  const actions = useRef<Actions | null>(null);
  const [ready, setReady] = useState(false);
  const [oneTap, setOneTap] = useState(true);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState("");

  useEffect(() => {
    let live = true;
    track("form_step", { form: "reserve", step: "pay-page", kind: "view" });
    const open = async () => {
      const stripe = publishableKey ? await loadStripe(publishableKey) : null;
      if (!live) return;
      if (!stripe) return setBad(W.errors.load);
      const dark = document.getElementById("ks")?.dataset.mode === "dark";
      const checkout = stripe.initCheckoutElementsSdk({
        clientSecret,
        elementsOptions: {
          appearance: appearance(dark),
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
      if (loaded.type !== "success") return setBad(W.errors.load);
      actions.current = loaded.actions;

      // the one-tap ways, Link first
      // Stripe's own defaults: with options set, the buttons never reported back (checked 2026-11-14)
      const one = checkout.createExpressCheckoutElement();
      let answered = false;
      const settle = (any: boolean) => {
        if (answered || !live) return;
        answered = true;
        // none of the one-tap ways is offered on this device: the full form opens instead
        setOneTap(any);
        if (!any) setMore(true);
        setReady(true);
      };
      // Stripe says which buttons it can show here, or nothing when there are none
      // (the event is newer than the installed type definitions)
      type Ways = { paymentMethods?: Record<string, boolean> | null };
      (one as unknown as { on: (name: string, heard: (e: Ways) => void) => void }).on(
        "availablepaymentmethodschange",
        (e) => settle(Object.values(e.paymentMethods ?? {}).some(Boolean))
      );
      one.on("confirm", async (event) => {
        setBusy(true);
        setBad("");
        track("form_step", { form: "reserve", step: "pay-page", kind: "choice", value: "one-tap" });
        const result = await loaded.actions.confirm({ expressCheckoutConfirmEvent: event });
        if (result.type === "error") {
          setBusy(false);
          setBad(result.error.message || W.errors.pay);
        }
      });
      if (express.current) one.mount(express.current);

      // every other way to pay, behind the small link
      const all = checkout.createPaymentElement({ layout: "accordion" });
      if (fields.current) all.mount(fields.current);
      // Stripe says nothing at all when no one-tap way is available: do not leave the page waiting on it
      setTimeout(() => settle(false), 3500);
    };
    // anything Stripe refuses while its fields are set up is said on the page, never left as a blank card
    open().catch((e) => {
      console.error("[pay] could not open the payment fields", e);
      if (live) {
        setReady(true);
        setBad(W.errors.load);
      }
    });
    return () => {
      live = false;
    };
  }, [clientSecret, publishableKey]);

  async function pay() {
    if (busy || !actions.current) return;
    setBusy(true);
    setBad("");
    track("form_step", { form: "reserve", step: "pay-page", kind: "next" });
    const result = await actions.current.confirm();
    // on success Stripe sends the family on to the welcome page; only a refusal comes back here
    if (result.type === "error") {
      setBusy(false);
      setBad(result.error.message || W.errors.pay);
      track("form_step", { form: "reserve", step: "pay-page", kind: "error" });
    }
  }

  return (
    <div className="rs gq-card rs-paypage" data-ready={ready || undefined}>
      <h1>{title}</h1>
      <p className="rs-due">
        <span>{what}</span>
        <b className="num">{amount}</b>
      </p>
      {note ? <p className="rs-note">{note}</p> : null}

      {ready ? null : <div className="rs-wait" role="status" aria-label={W.loading} />}
      <div className="rs-express" ref={express} data-off={oneTap ? undefined : ""} />
      {oneTap && ready && !more ? (
        <button
          type="button"
          className="rs-other"
          onClick={() => {
            setMore(true);
            track("form_step", {
              form: "reserve",
              step: "pay-page",
              kind: "choice",
              value: "other",
            });
          }}
        >
          {W.other}
        </button>
      ) : null}
      <div className="rs-all" hidden={!more}>
        <div ref={fields} />
        <button
          type="button"
          className="btn"
          onClick={pay}
          data-busy={busy || undefined}
          suppressHydrationWarning
        >
          <span className="lb">{busy ? W.paying : W.pay.replace("{amount}", amount)}</span>
        </button>
      </div>
      {bad ? (
        <p className="rs-msg rs-form-msg" role="alert">
          {bad}
        </p>
      ) : null}
      <p className="rs-note rs-promise">{RESERVE.pay.promise}</p>
      <a className="rs-back" href={back}>
        {RESERVE.back}
      </a>
    </div>
  );
}
