"use client";

// The Schools page's "book a call" card (founder, 2026-11-12), in place of the old school-license email.
// Two short steps, the easy answers first: 1, the school (its name, your role, how many students, when);
// 2, how to reach you. The progress bar says where you are; the reasons to trust it sit at the top of the
// card. Checks follow LeadFormCard: a field is checked when you leave it (empty fields aren't scolded on
// the way past) and clears the moment it's fixed; the button never blocks, a second press waits for the
// first; every send says what happened. The server (school-call-actions.ts) checks it all again and sends
// nothing: someone at Karman reads the request and calls back.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { submitSchoolCall } from "@/app/(site)/schools/school-call-actions";
import {
  CALL_RULES,
  CALL_STEPS,
  CALL_TIMES,
  SCHOOL_ROLES,
  SCHOOL_SIZES,
  SCHOOL_STARTS,
  type CallField,
} from "@/lib/marketing/school-call";
import { SITE } from "@/lib/marketing/site-copy";
import { busy, toast } from "../live/kit";
import { Arrow, Icon } from "../parts";

const STEP_TITLES = ["About your school", "How to reach you"];
const ID = "call";

export default function SchoolCallForm({
  heading,
  text,
  proof,
}: {
  heading: string;
  text: string;
  /** The reasons to trust it, short: a count, the free year, how fast we reply. */
  proof: string[];
}) {
  const ref = useRef<HTMLFormElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [banner, setBanner] = useState("");
  const [done, setDone] = useState<{ name: string; email: string } | null>(null);
  const sending = useRef(false);
  /** The field to focus once a step change has painted. */
  const want = useRef<string | null>(null);

  const value = (k: string) => (ref.current ? String(new FormData(ref.current).get(k) ?? "") : "");
  const check = (k: CallField, v: string) => setErrors((e) => ({ ...e, [k]: CALL_RULES[k](v) }));
  const focus = (k: string) => document.getElementById(`${ID}-${k}`)?.focus();

  /** Checks one step's fields; focuses the first that needs fixing. True when all are fine. */
  function checkStep(n: number): boolean {
    const found = Object.fromEntries(CALL_STEPS[n].map((k) => [k, CALL_RULES[k](value(k))]));
    setErrors((e) => ({ ...e, ...found }));
    const first = CALL_STEPS[n].find((k) => found[k]);
    if (first) focus(first);
    return !first;
  }

  /** Shows step n and focuses `k` there (its first field by default). */
  function go(n: number, k: string = CALL_STEPS[n][0]) {
    want.current = k;
    setBanner("");
    setStep(n);
  }

  // a step change moves focus once it has painted (never on the first paint: the page shouldn't jump)
  useEffect(() => {
    if (want.current) focus(want.current);
    want.current = null;
  }, [step]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending.current || !ref.current) return;
    if (step === 0) {
      if (checkStep(0)) go(1);
      return;
    }
    if (!checkStep(1)) return;
    const early = CALL_STEPS[0].find((k) => CALL_RULES[k](value(k)));
    if (early) return go(0, early);
    setBanner("");
    const data = Object.fromEntries(
      [...new FormData(ref.current).entries()].map(([k, v]) => [k, String(v)])
    );
    const button = ref.current.querySelector<HTMLButtonElement>('button[type="submit"]');
    sending.current = true;
    if (button) busy(button, true, SITE["form sending"]);
    let result: Awaited<ReturnType<typeof submitSchoolCall>> | null = null;
    try {
      result = await submitSchoolCall(data);
    } catch {
      result = null; // the request failed: offline means the connection dropped, otherwise it was us
    }
    if (button) busy(button, false);
    sending.current = false;
    if (!result)
      return setBanner(navigator.onLine ? SITE["form error server"] : SITE["form error network"]);
    if (!result.ok) {
      if ("fields" in result) {
        setErrors(result.fields);
        const bad = Object.keys(result.fields)[0] ?? "";
        const back = CALL_STEPS.findIndex((s) => (s as readonly string[]).includes(bad));
        if (back >= 0 && back !== step) go(back, bad);
        else focus(bad);
        return;
      }
      return setBanner(SITE["form error server"]);
    }
    setDone({ name: (data.name ?? "").split(" ")[0] ?? "", email: data.email ?? "" });
  }

  const doneTitle = done
    ? `Thanks${done.name ? `, ${done.name}` : ""}. Your call is requested.`
    : "";
  const doneText = done
    ? `We'll write to ${done.email} within one school day to find a time that suits you. Nothing to pay, and nothing else to fill in.`
    : "";

  // once sent: the confirmation takes focus, and a message appears only if the card is off screen
  useEffect(() => {
    if (!done) return;
    card.current?.querySelector<HTMLElement>(".k-done")?.focus();
    const r = card.current?.getBoundingClientRect();
    if (r && (r.bottom < 80 || r.top > innerHeight - 80)) toast(doneTitle, doneText);
  }, [done, doneTitle, doneText]);

  const describedBy = (k: string) => (errors[k] ? `${ID}-${k}-msg` : undefined);
  const msg = (k: string) =>
    errors[k] ? (
      <p className="k-fieldmsg" id={`${ID}-${k}-msg`}>
        <Icon name="alert" />
        <span>{errors[k]}</span>
      </p>
    ) : null;
  const field = (k: CallField, label: ReactNode, control: ReactNode) => (
    <div className="k-field">
      <label htmlFor={`${ID}-${k}`}>{label}</label>
      {control}
      {msg(k)}
    </div>
  );
  /** What every input and select carries: its name, and its message when it has one. */
  const base = (k: CallField) => ({
    id: `${ID}-${k}`,
    name: k,
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": describedBy(k),
  });
  /** A typed answer is checked when you leave it, and cleared as soon as it's fixed. */
  const typed = (k: CallField) => ({
    ...base(k),
    onBlur: (e: { target: { value: string } }) => e.target.value && check(k, e.target.value),
    onChange: (e: { target: { value: string } }) => errors[k] && check(k, e.target.value),
  });
  const choose = (k: CallField, options: readonly string[], placeholder = "Choose one") => (
    <select {...base(k)} defaultValue="" onChange={(e) => check(k, e.target.value)}>
      <option value="" disabled={placeholder === "Choose one"}>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
  const optional = (label: string) => (
    <>
      {label} <span className="au-opt">(optional)</span>
    </>
  );

  return (
    <div className="au-form au-call" id={ID} ref={card}>
      {done ? (
        <div className="k-done" tabIndex={-1}>
          <span className="k-badge">
            <Icon name="check" className="draw" />
          </span>
          <h3>{doneTitle}</h3>
          <p>{doneText}</p>
        </div>
      ) : (
        <>
          <h3 className="i-formh">{heading}</h3>
          <p className="au-call-lede">{text}</p>
          <ul className="au-proof">
            {proof.map((p) => (
              <li key={p}>
                <Icon name="check" />
                {p}
              </li>
            ))}
          </ul>
          <span className="au-bar" aria-hidden="true">
            <i data-on="" />
            <i data-on={step > 0 ? "" : undefined} />
          </span>
          <form className="k-form" id={`${ID}f`} noValidate ref={ref} onSubmit={onSubmit}>
            {[0, 1].map((n) => (
              <fieldset key={n} className="au-step" hidden={step !== n}>
                <legend className="au-progress">
                  Step {n + 1} of 2 <span>· {STEP_TITLES[n]}</span>
                </legend>
                {n === 0 ? (
                  <>
                    {field(
                      "school",
                      "School name",
                      <input
                        {...typed("school")}
                        type="text"
                        autoComplete="organization"
                        autoCapitalize="words"
                        maxLength={120}
                      />
                    )}
                    <div className="k-pair">
                      {field("role", "Your role", choose("role", SCHOOL_ROLES))}
                      {field("students", "Number of students", choose("students", SCHOOL_SIZES))}
                    </div>
                    <fieldset className="k-field">
                      <legend>When would you like to start?</legend>
                      <div className="k-chips">
                        {SCHOOL_STARTS.map((s, i) => (
                          <label key={s}>
                            <input
                              type="radio"
                              name="start"
                              value={s}
                              id={i === 0 ? `${ID}-start` : undefined}
                              aria-describedby={describedBy("start")}
                              onChange={(e) => check("start", e.target.value)}
                            />
                            <span>{s}</span>
                          </label>
                        ))}
                      </div>
                      {msg("start")}
                    </fieldset>
                  </>
                ) : (
                  <>
                    {field(
                      "name",
                      "Your name",
                      <input
                        {...typed("name")}
                        type="text"
                        autoComplete="name"
                        autoCapitalize="words"
                        maxLength={60}
                      />
                    )}
                    {field(
                      "email",
                      "Work email",
                      <input
                        {...typed("email")}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="off"
                        spellCheck={false}
                        maxLength={254}
                      />
                    )}
                    <div className="k-pair">
                      {field(
                        "phone",
                        optional("Phone"),
                        <input
                          {...typed("phone")}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          maxLength={24}
                        />
                      )}
                      {field(
                        "callTime",
                        optional("Best time for a call"),
                        choose("callTime", CALL_TIMES, "Any time")
                      )}
                    </div>
                  </>
                )}
              </fieldset>
            ))}
            {/* a field people never see or reach: bots fill it, the server drops what they send */}
            <input
              className="k-trap"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              defaultValue=""
            />
            <div className="k-slot">
              {banner ? (
                <div className="k-banner" role="alert">
                  <Icon name="alert" />
                  <span>{banner}</span>
                  <button type="button" onClick={() => ref.current?.requestSubmit()}>
                    {SITE["error retry"]}
                  </button>
                </div>
              ) : null}
            </div>
            <div className="au-go">
              <button className="btn" type="submit">
                <span className="lb">
                  {step === 0 ? "Next: how to reach you" : "Book the call"}
                </span>
                <span className="go">
                  <Arrow />
                </span>
              </button>
              {step > 0 ? (
                <button type="button" className="au-back" onClick={() => go(0)}>
                  Back
                </button>
              ) : null}
            </div>
            <p className="help">
              {step === 0
                ? "Two short steps, under a minute. No card."
                : "We use this only to set up the call. No mailing list."}
            </p>
          </form>
        </>
      )}
    </div>
  );
}
