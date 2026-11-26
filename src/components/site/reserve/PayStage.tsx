"use client";

// Our own payment page for a reserved seat (founder, 2026-11-14). Stripe's fields are placed inside our
// page, in our type and colours: card numbers are typed into Stripe's own frames, so they never touch
// this site. It is the page where a family pays, so it is laid out plainly (founder, 2026-11-25):
//   - what is being bought, as a receipt of its own: on a wide screen it sits beside the payment, on a
//     phone above it. No tax line: none is charged.
//   - the one-tap ways (Link, Apple Pay, Google Pay), first and largest.
//   - then each other way under its own small heading: the card; "Buy now, pay later" as pills in one
//     row; the bank; and the less-used wallets behind a "More options" link.
// Stripe draws one list of ways per checkout and takes no headings, so each group is a checkout of its
// own for the same seat: the card's is open from the start, and another is opened when its pill is
// tapped (payAnotherWay). Whichever is paid settles the seat.
// The moment a payment is made the page shows "paid" itself (Paid.tsx): no wait, no page in between.
// Words: reserve-copy.ts (payPage). Styles: styles/pay.css.
import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Appearance, Stripe, StripeCheckoutElementsSdk } from "@stripe/stripe-js";
import { payAnotherWay, seatPaid } from "@/app/(site)/reserve/actions";
import { track } from "@/lib/analytics/client";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import Paid, { type PaidProps } from "./Paid";

const W = RESERVE.payPage;
type Other = keyof typeof W.ways;
type Way = "card" | Other;
type Actions = Extract<
  Awaited<ReturnType<StripeCheckoutElementsSdk["loadActions"]>>,
  { type: "success" }
>["actions"];
const LATER: Other[] = ["klarna", "affirm"];
const MORE: Other[] = ["cashapp", "amazon_pay"];
const FONTS = [
  {
    cssSrc: "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700;800&display=swap",
  },
];

/** Stripe's fields, dressed like the site's pills. They follow the page's light or dark mode. */
function appearance(dark: boolean): Appearance {
  const ink = dark ? "#fffaf3" : "#1d1a22";
  const line = `1.5px solid ${dark ? "#5c5c7c" : "#cfc8bd"}`;
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
      borderRadius: "22px",
      spacingUnit: "5px",
    },
    rules: {
      ".Input": { boxShadow: "none", border: line },
      ".Input:focus": {
        boxShadow: "none",
        border: `2px solid ${dark ? "#8fb0ff" : "#2449b8"}`,
      },
      ".Label": { fontWeight: "800" },
      ".Tab, .AccordionItem, .Block": { boxShadow: "none", border: line },
    },
  };
}

export interface PayStageProps {
  /** The reservation. */
  id: string;
  /** The checkout behind the one-tap buttons (Link, Apple Pay, Google Pay). */
  clientSecret: string;
  /** The checkout behind the typed card. */
  cardSecret: string;
  publishableKey: string;
  /** Back to the reservation's last step. */
  back: string;
  title: string;
  /** "The 9-week SAT cohort, March" */
  what: string;
  /** What is due today: "$995", or "$95" for a deposit. */
  amount: string;
  /** The cohort's full price: "$995". */
  price: string;
  /** After a deposit: "Then 3 monthly payments" and "$300 each". Null when paid in full. */
  later: { label: string; each: string } | null;
  /** What the seat includes, as short lines. */
  includes: string[];
  /** The other ways this account can be paid, besides the card and the one-tap ways. */
  ways: Other[];
  /** What the "paid" screen shows once the payment is made. */
  paid: Omit<PaidProps, "state">;
}

export default function PayStage(p: PayStageProps) {
  const express = useRef<HTMLDivElement>(null);
  const hosts = useRef<Partial<Record<Way, HTMLDivElement | null>>>({});
  const stripe = useRef<Stripe | null>(null);
  const opened = useRef<Partial<Record<Way, Actions | "opening">>>({});
  const [ready, setReady] = useState(false);
  const [oneTap, setOneTap] = useState(true);
  const [way, setWay] = useState<Way>("card");
  const [loaded, setLoaded] = useState<Partial<Record<Way, boolean>>>({});
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState("");
  const [done, setDone] = useState<"paid" | "clearing" | null>(null);

  /** Stripe says the payment is made: settle the seat now and show it, with no page in between. */
  const finish = async (session: string) => {
    const { state } = await seatPaid({ id: p.id, session }).catch(() => ({
      state: "paid" as const,
    }));
    track("form_step", { form: "reserve", step: "pay-page", kind: "next" });
    setDone(state === "clearing" ? "clearing" : "paid");
  };

  const options = () => ({
    appearance: appearance(document.getElementById("ks")?.dataset.mode === "dark"),
    fonts: FONTS,
  });

  useEffect(() => {
    let live = true;
    track("form_step", { form: "reserve", step: "pay-page", kind: "view" });
    const open = async () => {
      const js = p.publishableKey ? await loadStripe(p.publishableKey) : null;
      if (!live) return;
      if (!js) return setBad(W.errors.load);
      stripe.current = js;
      const checkout = js.initCheckoutElementsSdk({
        clientSecret: p.clientSecret,
        elementsOptions: options(),
      });
      const got = await checkout.loadActions();
      if (!live) return;
      if (got.type !== "success") return setBad(W.errors.load);

      // The one-tap ways. Apple Pay and Google Pay are asked for everywhere they can work: in Safari,
      // and in Chrome and other browsers too, where Apple Pay shows a code to scan with an iPhone
      // (Stripe only offers that when it is asked for: "always").
      type OneTap = Parameters<typeof checkout.createExpressCheckoutElement>[0];
      const one = checkout.createExpressCheckoutElement({
        buttonHeight: 55,
        paymentMethods: { applePay: "always", googlePay: "always" },
      } as unknown as OneTap);
      let answered = false;
      const settle = (any: boolean) => {
        if (answered || !live) return;
        answered = true;
        // none of the one-tap ways is offered on this device: the card form is all there is to show
        setOneTap(any);
        setReady(true);
      };
      // Stripe says which buttons it can show here, or nothing when there are none
      // (the event is newer than the installed type definitions)
      type Ways = {
        availablePaymentMethods?: Record<string, boolean> | null;
        paymentMethods?: Record<string, boolean> | null;
      };
      const heard = (e: Ways) =>
        settle(Object.values(e.availablePaymentMethods ?? e.paymentMethods ?? {}).some(Boolean));
      const listen = one as unknown as { on: (name: string, heard: (e: Ways) => void) => void };
      listen.on("ready", heard);
      listen.on("availablepaymentmethodschange", heard);
      one.on("confirm", async (event) => {
        setBusy(true);
        setBad("");
        track("form_step", { form: "reserve", step: "pay-page", kind: "choice", value: "one-tap" });
        const result = await got.actions.confirm({
          expressCheckoutConfirmEvent: event,
          redirect: "if_required",
        });
        if (result.type === "error") {
          setBusy(false);
          return setBad(result.error.message || W.errors.pay);
        }
        await finish(result.session.id);
      });
      if (express.current) one.mount(express.current);

      // the typed card: its own checkout, so only card fields are drawn
      const cards =
        p.cardSecret === p.clientSecret
          ? { checkout, actions: got.actions }
          : await (async () => {
              const own = js.initCheckoutElementsSdk({
                clientSecret: p.cardSecret,
                elementsOptions: options(),
              });
              const its = await own.loadActions();
              return its.type === "success" ? { checkout: own, actions: its.actions } : null;
            })();
      if (!live) return;
      if (!cards) return setBad(W.errors.load);
      opened.current.card = cards.actions;
      const card = cards.checkout.createPaymentElement({ layout: { type: "tabs" } });
      if (hosts.current.card) card.mount(hosts.current.card);
      card.on("ready", () => setLoaded((l) => ({ ...l, card: true })));
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
    // the checkout is opened once for the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.clientSecret, p.cardSecret, p.publishableKey]);

  /** Another way is picked: its own checkout opens the first time, and its fields go under its pill. */
  async function pick(next: Way) {
    if (busy) return;
    setBad("");
    setWay(next);
    track("form_step", { form: "reserve", step: "pay-page", kind: "choice", value: next });
    if (next === "card" || opened.current[next] || !stripe.current) return;
    opened.current[next] = "opening";
    const fail = () => {
      delete opened.current[next];
      setWay("card");
      setBad(W.errors.way);
    };
    try {
      const res = await payAnotherWay({ reservationId: p.id, way: next });
      if (!res.ok) return fail();
      const checkout = stripe.current.initCheckoutElementsSdk({
        clientSecret: res.clientSecret,
        elementsOptions: options(),
      });
      const got = await checkout.loadActions();
      if (got.type !== "success") return fail();
      opened.current[next] = got.actions;
      const fields = checkout.createPaymentElement({
        // one way per checkout, so Stripe draws its fields alone, with no list or heading of its own
        layout: { type: "tabs", defaultCollapsed: false },
      });
      const host = hosts.current[next];
      if (host) fields.mount(host);
      fields.on("ready", () => setLoaded((l) => ({ ...l, [next]: true })));
    } catch (e) {
      console.error(`[pay] could not open ${next}`, e);
      fail();
    }
  }

  async function pay() {
    const actions = opened.current[way];
    if (busy || !actions || actions === "opening") return;
    setBusy(true);
    setBad("");
    const result = await actions.confirm({ redirect: "if_required" });
    // a way that leaves the site (a pay-later plan, a wallet) comes back to this page, which then
    // shows "paid"; a card is settled right here
    if (result.type === "error") {
      setBusy(false);
      setBad(result.error.message || W.errors.pay);
      return track("form_step", { form: "reserve", step: "pay-page", kind: "error" });
    }
    await finish(result.session.id);
  }

  if (done) return <Paid {...p.paid} state={done} />;

  const has = (list: Other[]) => list.filter((w) => p.ways.includes(w));
  const pill = (w: Other) => (
    <button
      type="button"
      key={w}
      className="pp-pill"
      aria-pressed={way === w}
      onClick={() => pick(way === w ? "card" : w)}
    >
      {W.ways[w]}
    </button>
  );
  /** Stripe's own fields for one way, shown only while that way is the one picked. */
  const panel = (w: Way) => (
    <div className="pp-panel" key={w} data-on={way === w || undefined} data-loaded={loaded[w]}>
      {way === w && !loaded[w] ? (
        <i className="pp-wait" role="status" aria-label={W.loading} />
      ) : null}
      <div
        ref={(el) => {
          hosts.current[w] = el;
        }}
      />
    </div>
  );
  const group = (list: Other[]) => (
    <>
      <div className="pp-pills">{list.map(pill)}</div>
      {list.map(panel)}
    </>
  );
  const later = has(LATER);
  const rest = has(MORE);
  const label =
    way === "card"
      ? W.pay.replace("{amount}", p.amount)
      : way === "us_bank_account"
        ? W.payBank.replace("{amount}", p.amount)
        : W.payWith.replace("{way}", W.ways[way]);

  return (
    <div className="pp" data-ready={ready || undefined}>
      <aside className="gq-card pp-sum">
        <h1>{p.title}</h1>
        <dl className="pp-bill">
          <div>
            <dt>{p.what}</dt>
            <dd className="num">{p.price}</dd>
          </div>
          {p.later ? (
            <>
              <div>
                <dt>{W.deposit}</dt>
                <dd className="num">{p.amount}</dd>
              </div>
              <div>
                <dt>{p.later.label}</dt>
                <dd className="num">{p.later.each}</dd>
              </div>
            </>
          ) : null}
          <div className="pp-total">
            <dt>{W.total}</dt>
            <dd className="num">{p.amount}</dd>
          </div>
        </dl>
        <ul className="pp-in">
          {p.includes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="pp-promise">{RESERVE.pay.promise}</p>
      </aside>

      <section className="gq-card pp-pay" aria-label={W.title}>
        {ready ? null : <i className="pp-wait" role="status" aria-label={W.loading} />}
        <div className="pp-fast" data-off={oneTap ? undefined : ""}>
          <h2>{W.oneTap}</h2>
          <div className="pp-express" ref={express} />
        </div>

        <div className="pp-way">
          <h2>{W.card}</h2>
          {way === "card" ? null : (
            <div className="pp-pills">
              <button type="button" className="pp-pill" onClick={() => pick("card")}>
                {W.byCard}
              </button>
            </div>
          )}
          {panel("card")}
        </div>

        {later.length ? (
          <div className="pp-way">
            <h2>{W.later2}</h2>
            {group(later)}
          </div>
        ) : null}

        {p.ways.includes("us_bank_account") ? (
          <div className="pp-way">
            <h2>{W.bank}</h2>
            {group(["us_bank_account"])}
          </div>
        ) : null}

        {rest.length ? (
          <div className="pp-way">
            <button
              type="button"
              className="pp-more"
              aria-expanded={more}
              onClick={() => setMore((m) => !m)}
            >
              {W.more}
            </button>
            {/* kept on the page while closed, so fields Stripe has already drawn are not thrown away */}
            <div className="pp-rest" hidden={!more}>
              {group(rest)}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="btn pp-go"
          onClick={pay}
          data-busy={busy || undefined}
          suppressHydrationWarning
        >
          <span className="lb">{busy ? W.paying : label}</span>
        </button>
        {bad ? (
          <p className="rs-msg rs-form-msg" role="alert">
            {bad}
          </p>
        ) : null}
        <a className="rs-back" href={p.back}>
          {RESERVE.back}
        </a>
      </section>
    </div>
  );
}
