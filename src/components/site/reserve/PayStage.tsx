"use client";

// Our own checkout (founder, 2026-11-26), for a reserved cohort seat (/reserve/pay) and for a renewing
// plan (/checkout/pay). It is laid out the way Stripe's own checkout page is, in Karman's glass, type
// and colours, on the landscape:
//   - left, what is being bought: its name, the price, the lines of the bill with a subtotal, a
//     promotion code, and what it includes.
//   - right, the payment, top to bottom: the one-tap ways (Apple Pay, Google Pay, Link) in the shape of
//     our buttons with their own logos; "Or"; contact information (the account's email, and a mobile
//     number, filled in when we have it); the payment method as one list (card, bank, then the rest
//     under "More"); and the pay button.
// Stripe draws the one-tap buttons and the list of ways inside frames of its own, so card and bank
// details never touch this site; everything else here is ours. The buttons and the list are two
// checkouts for the same purchase (why: createReservationCheckoutSession), so a promotion code is put
// on both, and whichever is paid settles it (settle).
// The moment a payment is made the page shows "paid" itself (Paid.tsx): no wait, no page in between.
// Words: reserve-copy.ts (payPage). Styles: styles/pay.css.
import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Appearance, StripeCheckoutElementsSdk } from "@stripe/stripe-js";
import { track } from "@/lib/analytics/client";
import { dialPhone, formatPhone, okPhone } from "@/lib/marketing/lead-rules";
import { formatPrice } from "@/lib/marketing/offer";
import { RESERVE } from "@/lib/marketing/reserve-copy";
import Paid, { type PaidProps } from "./Paid";

const W = RESERVE.payPage;
type Actions = Extract<
  Awaited<ReturnType<StripeCheckoutElementsSdk["loadActions"]>>,
  { type: "success" }
>["actions"];
type Session = ReturnType<Actions["getSession"]>;
/** The order of the list: the card and the bank in sight, the rest under "More". */
const ORDER = ["card", "us_bank_account", "klarna", "affirm", "cashapp", "amazon_pay"];
const FONTS = [
  {
    cssSrc: "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700;800&display=swap",
  },
];

/** Stripe's fields, dressed like the site: glass rows and the page's own blue. They follow the page's
 *  light or dark mode. */
function appearance(dark: boolean): Appearance {
  const ink = dark ? "#fffaf3" : "#1d1a22";
  const blue = dark ? "#8fb0ff" : "#2449b8";
  const glass = dark ? "rgba(255, 250, 243, 0.08)" : "rgba(255, 253, 248, 0.6)";
  const line = `1.5px solid ${dark ? "rgba(255, 250, 243, 0.2)" : "rgba(29, 26, 34, 0.16)"}`;
  return {
    theme: dark ? "night" : "stripe",
    labels: "floating",
    variables: {
      fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
      fontSizeBase: "16px",
      fontWeightNormal: "600",
      colorPrimary: blue,
      colorText: ink,
      colorTextSecondary: ink,
      colorBackground: dark ? "#24243c" : "#fffdf8",
      colorDanger: dark ? "#ffb4a6" : "#b23a26",
      // the one-tap buttons take this: 55 tall, so fully round like our own
      borderRadius: "28px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        boxShadow: "none",
        border: line,
        borderRadius: "22px",
        backgroundColor: glass,
        fontWeight: "700",
      },
      ".Input:focus": { boxShadow: "none", border: `2px solid ${blue}` },
      ".Label": { fontWeight: "700" },
      ".AccordionItem": {
        boxShadow: "none",
        border: line,
        backgroundColor: glass,
        fontWeight: "800",
      },
      ".AccordionItem--selected": { color: ink, fontWeight: "800" },
      ".Block, .Tab": { boxShadow: "none", border: line, backgroundColor: glass },
    },
  };
}

/** The lines of the bill as Stripe holds them, in cents. */
interface Bill {
  subtotal: number;
  discount: number;
  total: number;
  /** The promotion code that is on, and its "50" when it is a percentage. */
  code: string | null;
  off: number | null;
  /** A renewing plan: what the next payment will be. */
  next: number | null;
}
function billOf(s: Session): Bill {
  const d = s.discountAmounts?.[0] ?? null;
  return {
    subtotal: s.total.subtotal.minorUnitsAmount,
    discount: s.total.discount.minorUnitsAmount,
    total: s.total.total.minorUnitsAmount,
    code: d ? (d.promotionCode ?? d.displayName) : null,
    off: d?.percentOff ?? null,
    next: s.recurring?.dueNext.total.minorUnitsAmount ?? null,
  };
}
/** "$69", or "$34.50" when there are cents. */
function money(cents: number): string {
  const n = cents / 100;
  return Number.isInteger(n) ? formatPrice(n) : `$${n.toFixed(2)}`;
}

export interface PayStageProps {
  /** Which purchase this is, for the step counts only. */
  flow: "reserve" | "plan";
  /** Called with Stripe's finished checkout the moment a payment is made: records it at once. */
  settle: (session: string) => Promise<{ state: string }>;
  /** The checkout behind the list of ways to pay. */
  clientSecret: string;
  /** The checkout behind the one-tap buttons (Link, Apple Pay, Google Pay), or "" when there is none. */
  tapSecret: string;
  publishableKey: string;
  /** Back to where this was chosen. */
  back: string;
  title: string;
  /** "The 9-week SAT cohort, March", or the plan's name. */
  what: string;
  /** What is due today: "$995", or "$95" for a deposit. */
  amount: string;
  /** The full price beside it: "$995". */
  price: string;
  /** A renewing plan: how often the amount is paid ("a month"). */
  per?: string;
  /** After a deposit: "Then 3 monthly payments" and "$300 each". Null when paid in full. */
  later: { label: string; each: string } | null;
  /** What it includes, as short lines. */
  includes: readonly string[];
  /** The line under them: the guarantee, or that a plan can be cancelled. */
  promise: string;
  /** The account's email: where the receipt goes. */
  email: string;
  /** The mobile number we already have, or "". */
  phone: string;
  /** Whether a promotion code can be entered (not on a deposit). */
  promo: boolean;
  /** Links under the pay button: the terms and the privacy policy. */
  legal: { href: string; label: string }[];
  /** What the "paid" screen shows once the payment is made. */
  paid: Omit<PaidProps, "state">;
}

export default function PayStage(p: PayStageProps) {
  const express = useRef<HTMLDivElement>(null);
  const fields = useRef<HTMLDivElement>(null);
  const actions = useRef<Actions | null>(null);
  const tapActions = useRef<Actions | null>(null);
  const [ready, setReady] = useState(false);
  const [oneTap, setOneTap] = useState(true);
  const [way, setWay] = useState("card");
  const [bill, setBill] = useState<Bill | null>(null);
  // an American number comes back from Stripe as +1 and ten digits: shown the way it is typed here
  const [phone, setPhone] = useState(() => formatPhone(p.phone.replace(/^\+1(?=\d{10}$)/, "")));
  const [phoneBad, setPhoneBad] = useState(false);
  const [coding, setCoding] = useState(false);
  const [code, setCode] = useState("");
  const [codeBad, setCodeBad] = useState("");
  const [applying, setApplying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState("");
  const [done, setDone] = useState<{ state: "paid" | "clearing"; amount: string } | null>(null);

  /** Stripe says the payment is made: settle it now and show it, with no page in between. */
  const finish = async (session: Session) => {
    const { state } = await p.settle(session.id).catch(() => ({ state: "paid" }));
    track("form_step", { form: p.flow, step: "pay-page", kind: "next" });
    setDone({
      state: state === "clearing" ? "clearing" : "paid",
      amount: money(session.total.total.minorUnitsAmount),
    });
  };

  useEffect(() => {
    let live = true;
    track("form_step", { form: p.flow, step: "pay-page", kind: "view" });
    const open = async () => {
      const js = p.publishableKey ? await loadStripe(p.publishableKey) : null;
      if (!live) return;
      if (!js) return setBad(W.errors.load);
      const dark = document.getElementById("ks")?.dataset.mode === "dark";
      const start = async (clientSecret: string) => {
        const checkout = js.initCheckoutElementsSdk({
          clientSecret,
          elementsOptions: { appearance: appearance(dark), fonts: FONTS },
        });
        const got = await checkout.loadActions();
        return got.type === "success" ? { checkout, actions: got.actions } : null;
      };
      const [main, tap] = await Promise.all([
        start(p.clientSecret),
        p.tapSecret ? start(p.tapSecret).catch(() => null) : null,
      ]);
      if (!live) return;
      if (!main) return setBad(W.errors.load);
      const { checkout } = main;
      actions.current = main.actions;
      tapActions.current = tap?.actions ?? null;
      setBill(billOf(main.actions.getSession()));
      checkout.on("change", (session) => {
        if (live) setBill(billOf(session));
      });

      let answered = false;
      const settle = (any: boolean) => {
        if (answered || !live) return;
        answered = true;
        // none of the one-tap ways is offered on this device: the list below is all there is to show
        setOneTap(any);
        setReady(true);
      };
      if (tap) {
        // The one-tap ways. Apple Pay and Google Pay are asked for everywhere they can work: in
        // Safari, and in Chrome and other browsers too, where Apple Pay shows a code to scan with an
        // iPhone (Stripe only offers that when it is asked for: "always").
        type OneTap = Parameters<typeof checkout.createExpressCheckoutElement>[0];
        const logo = dark ? "white" : "black";
        const one = tap.checkout.createExpressCheckoutElement({
          buttonHeight: 55,
          buttonType: { applePay: "plain", googlePay: "plain" },
          buttonTheme: { applePay: logo, googlePay: logo },
          paymentMethods: { applePay: "always", googlePay: "always", link: "auto" },
        } as unknown as OneTap);
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
          track("form_step", { form: p.flow, step: "pay-page", kind: "choice", value: "one-tap" });
          const result = await tap.actions.confirm({
            expressCheckoutConfirmEvent: event,
            redirect: "if_required",
          });
          if (result.type === "error") {
            setBusy(false);
            return setBad(result.error.message || W.errors.pay);
          }
          await finish(result.session);
        });
        if (express.current) one.mount(express.current);
      } else settle(false);

      // the list of ways: Stripe draws each row with its own logo, and the fields of the one picked
      type List = Parameters<typeof checkout.createPaymentElement>[0];
      const list = checkout.createPaymentElement({
        layout: {
          type: "accordion",
          defaultCollapsed: false,
          radios: "always",
          spacedAccordionItems: true,
          visibleAccordionItemsCount: 2,
        },
        paymentMethodOrder: ORDER,
        // Apple Pay and Google Pay are the buttons above, not rows here as well
        wallets: { applePay: "never", googlePay: "never" },
      } as unknown as List);
      list.on("change", (e) => {
        const picked = (e as { value?: { type?: string } }).value?.type;
        if (picked && live) setWay(picked);
      });
      if (fields.current) list.mount(fields.current);
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
  }, [p.clientSecret, p.tapSecret, p.publishableKey]);

  async function pay() {
    const go = actions.current;
    if (busy || !go) return;
    if (!okPhone(phone)) {
      setPhoneBad(true);
      return document.getElementById("co-phone")?.focus();
    }
    setBusy(true);
    setBad("");
    const result = await go.confirm({ redirect: "if_required", phoneNumber: dialPhone(phone) });
    // a way that leaves the site (a pay-later plan, a wallet) comes back to this page, which then
    // shows "paid"; a card is settled right here
    if (result.type === "error") {
      setBusy(false);
      setBad(result.error.message || W.errors.pay);
      return track("form_step", { form: p.flow, step: "pay-page", kind: "error" });
    }
    await finish(result.session);
  }

  async function applyCode() {
    const go = actions.current;
    const typed = code.trim();
    if (!go || !typed || applying) return;
    setApplying(true);
    setCodeBad("");
    const result = await go.applyPromotionCode(typed).catch(() => null);
    // the one-tap buttons charge their own checkout, so the code goes on it too
    if (result?.type === "success")
      await tapActions.current?.applyPromotionCode(typed).catch(() => null);
    setApplying(false);
    if (result?.type !== "success") return setCodeBad(W.code.bad);
    track("form_step", { form: p.flow, step: "pay-page", kind: "choice", value: "code" });
    setBill(billOf(result.session));
    setCoding(false);
    setCode("");
  }
  async function removeCode() {
    const result = await actions.current?.removePromotionCode().catch(() => null);
    await tapActions.current?.removePromotionCode().catch(() => null);
    if (result?.type === "success") setBill(billOf(result.session));
  }

  if (done) return <Paid {...p.paid} amount={done.amount} state={done.state} />;

  const total = bill ? money(bill.total) : p.amount;
  const cut = bill && bill.discount > 0 ? bill : null;
  const named = (W.ways as Record<string, string>)[way];
  const label =
    way === "us_bank_account"
      ? W.payBank.replace("{amount}", total)
      : named
        ? W.payWith.replace("{way}", named)
        : W.pay.replace("{amount}", total);

  return (
    <div className="gq-card co" data-ready={ready || undefined}>
      <aside className="co-sum">
        <a className="co-back" href={p.back}>
          {RESERVE.back}
        </a>
        <h1>{p.title}</h1>
        <p className="co-price">
          <span className="num">{p.amount}</span>
          {p.per ? <span>{p.per}</span> : null}
        </p>
        <div className="co-bill">
          <p>
            <span>{p.what}</span>
            <span className="num">{p.price}</span>
          </p>
          {p.later ? (
            <>
              <p>
                <span>{W.deposit}</span>
                <span className="num">{p.amount}</span>
              </p>
              <p>
                <span>{p.later.label}</span>
                <span className="num">{p.later.each}</span>
              </p>
            </>
          ) : (
            <p>
              <span>{W.subtotal}</span>
              <span className="num">{bill ? money(bill.subtotal) : p.amount}</span>
            </p>
          )}
          {cut ? (
            <p className="co-cut">
              <span>
                <button
                  type="button"
                  className="co-tag"
                  onClick={removeCode}
                  aria-label={W.code.remove.replace("{code}", cut.code ?? "")}
                >
                  {cut.code}
                  <i aria-hidden="true" />
                </button>
                {cut.off ? <em>{W.code.off.replace("{percent}", String(cut.off))}</em> : null}
              </span>
              <span className="num">-{money(cut.discount)}</span>
            </p>
          ) : p.promo && coding ? (
            <form
              className="co-code"
              onSubmit={(e) => {
                e.preventDefault();
                void applyCode();
              }}
            >
              <input
                autoFocus
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeBad("");
                }}
                aria-label={W.code.field}
                placeholder={W.code.field}
                aria-invalid={codeBad ? true : undefined}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={40}
              />
              <button type="submit" data-busy={applying || undefined} disabled={!code.trim()}>
                {W.code.apply}
              </button>
            </form>
          ) : p.promo ? (
            <button type="button" className="co-add" onClick={() => setCoding(true)}>
              {W.code.add}
            </button>
          ) : null}
          {codeBad && !cut ? (
            <p className="rs-msg co-msg" role="alert">
              {codeBad}
            </p>
          ) : null}
          {p.later || cut || !p.per ? (
            <p className="co-total">
              <span>{W.total}</span>
              <span className="num">{total}</span>
            </p>
          ) : null}
          {cut && p.per && bill?.next != null && bill.next !== bill.total ? (
            <p className="co-then">
              {W.code.then.replace("{amount}", money(bill.next)).replace("{per}", p.per)}
            </p>
          ) : null}
        </div>
        <ul className="co-in">
          {p.includes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="co-promise">{p.promise}</p>
      </aside>

      <section className="co-pay" aria-label={p.title}>
        {ready ? null : <i className="co-wait" role="status" aria-label={W.loading} />}
        <div className="co-fast" data-off={oneTap ? undefined : ""}>
          <div className="co-express" ref={express} />
          <p className="co-or">
            <span>{W.or}</span>
          </p>
        </div>

        <div className="co-part">
          <h2>{W.contact}</h2>
          <div className="co-group">
            <p className="co-row">
              <span>{W.email}</span>
              <b>{p.email}</b>
            </p>
            <label
              className="co-row"
              data-filled={phone ? true : undefined}
              data-bad={phoneBad || undefined}
            >
              <span>{RESERVE.names.phone}</span>
              <input
                id="co-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                maxLength={17}
                value={phone}
                aria-invalid={phoneBad || undefined}
                aria-describedby={phoneBad ? "co-phone-msg" : undefined}
                onChange={(e) => {
                  setPhone(formatPhone(e.target.value));
                  setPhoneBad(false);
                }}
                onBlur={() => setPhoneBad(Boolean(phone) && !okPhone(phone))}
              />
            </label>
          </div>
          {phoneBad ? (
            <p className="rs-msg co-msg" id="co-phone-msg" role="alert">
              {RESERVE.errors.phone}
            </p>
          ) : null}
        </div>

        <div className="co-part">
          <h2>{W.method}</h2>
          <div className="co-fields" ref={fields} />
        </div>

        <button
          type="button"
          className="btn co-go"
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
        <p className="co-legal">
          {p.legal.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </p>
      </section>
    </div>
  );
}
