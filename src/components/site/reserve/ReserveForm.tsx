"use client";

// Reserve a seat, built to docs/forms/form-rules.md (founder, 2026-11-13). Five short steps:
//   1. who is reserving (one tap, and it words the rest);
//   2. the email, alone: on Continue the lead is saved, so a family who stops here can be followed up;
//   3. the names, and an optional phone that says why it is asked;
//   4. the SAT date the cohort ends on;
//   5. how to pay, with the total and the guarantee on screen, then Stripe's own payment page.
// Nothing else is asked before payment: a buyer who has decided should reach the payment page fast, and the
// questions that get the student started come right after it (RegistrationFlight.tsx).
// The price is in view from the first step. Each field keeps its name while it is typed in, is checked when
// it is left, and says how to fix what is wrong. Buttons are never greyed out: a press shows every gap and
// puts the cursor in the first. Answers survive Back, a refresh and a return from the payment page.
// Steps are measured with form_step events (never what was typed). Words: reserve-copy.ts. Styles: reserve.css.
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { payForSeat, saveEmail, saveNames } from "@/app/(site)/reserve/actions";
import { track } from "@/lib/analytics/client";
import { cleanName, okEmail, okName, okPhone } from "@/lib/marketing/lead-rules";
import { RESERVE as W } from "@/lib/marketing/reserve-copy";
import type { OpenProgram } from "@/lib/reserve/programs";

type Who = "parent" | "student";
type Field = "email" | "name" | "student" | "phone";
type Pay = "full" | "installments";
const STEPS = ["who", "email", "names", "date", "pay"] as const;
const KEEP = "karman:reserve";

/** A phone number as it is typed: (512) 555-0142, or + and digits for a number abroad. */
function formatPhone(v: string): string {
  if (v.trim().startsWith("+")) return `+${v.replace(/\D/g, "").slice(0, 15)}`;
  const d = v
    .replace(/\D/g, "")
    .replace(/^1(?=\d{10})/, "")
    .slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Whether a field's answer will do. The phone may be left empty. */
const OK: Record<Field, (v: string) => boolean> = {
  email: okEmail,
  name: okName,
  student: okName,
  phone: (v) => v.trim() === "" || okPhone(v),
};
const WRONG: Record<Field, string> = {
  email: W.errors.email,
  name: W.errors.name,
  student: W.errors.name,
  phone: W.errors.phone,
};
const TIDY: Partial<Record<Field, (v: string) => string>> = {
  name: cleanName,
  student: cleanName,
  phone: formatPhone,
};
const INPUT: Record<Field, Record<string, string | number | boolean>> = {
  email: {
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    autoCapitalize: "off",
    autoCorrect: "off",
    spellCheck: false,
    maxLength: 254,
  },
  name: {
    type: "text",
    autoComplete: "name",
    autoCapitalize: "words",
    autoCorrect: "off",
    spellCheck: false,
    maxLength: 80,
  },
  student: {
    type: "text",
    autoComplete: "off",
    autoCapitalize: "words",
    autoCorrect: "off",
    spellCheck: false,
    maxLength: 40,
  },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 17 },
};

interface Saved {
  step: number;
  who: Who | null;
  v: Record<Field, string>;
  id: string | null;
  program: string;
  pay: Pay;
}

export default function ReserveForm({ programs }: { programs: OpenProgram[] }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [who, setWho] = useState<Who | null>(null);
  const [v, setV] = useState<Record<Field, string>>({
    email: "",
    name: "",
    student: "",
    phone: "",
  });
  const [bad, setBad] = useState<Partial<Record<Field | "form", string>>>({});
  const [id, setId] = useState<string | null>(null);
  const [program, setProgram] = useState(programs[0]?.id ?? "");
  const [pay, setPay] = useState<Pay>("full");
  const [busy, start] = useTransition();
  const [ready, setReady] = useState(false);
  const trap = useRef<HTMLInputElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const since = useRef(0);
  const name = STEPS[step];
  const say = who ?? "parent";
  const stepRef = useRef(0);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // answers survive a refresh and the trip to the payment page and back (this tab only)
  useEffect(() => {
    try {
      const kept = JSON.parse(sessionStorage.getItem(KEEP) ?? "null") as Saved | null;
      if (kept?.who) {
        setWho(kept.who);
        setV(kept.v);
        setId(kept.id);
        if (programs.some((p) => p.id === kept.program)) setProgram(kept.program);
        setPay(kept.pay);
        setStep(Math.min(kept.step, kept.id ? STEPS.length - 1 : 1));
      }
    } catch {
      // a private window may refuse storage: the form still works, it just starts fresh
    }
    setReady(true);
  }, [programs]);
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        KEEP,
        JSON.stringify({ step, who, v, id, program, pay } satisfies Saved)
      );
    } catch {
      // see above
    }
  }, [ready, step, who, v, id, program, pay]);

  // each step: note that it was seen, and put the cursor where the visitor will type
  useEffect(() => {
    if (!ready) return;
    since.current = Date.now();
    track("form_step", { form: "reserve", step: STEPS[step], kind: "view" });
    if (step > 0) {
      const root = card.current;
      (
        root?.querySelector<HTMLElement>(".rs-pill input") ?? root?.querySelector<HTMLElement>("h1")
      )?.focus();
    }
  }, [ready, step]);
  // leaving with the form unfinished: which step it was
  useEffect(() => {
    const leave = () => {
      if (document.visibilityState === "hidden")
        track("form_step", { form: "reserve", step: STEPS[stepRef.current], kind: "leave" });
    };
    document.addEventListener("visibilitychange", leave);
    return () => document.removeEventListener("visibilitychange", leave);
  }, []);

  const go = (to: number) => {
    const forward = to > step;
    track("form_step", {
      form: "reserve",
      step: name,
      kind: forward ? "next" : "back",
      seconds: Math.min(3600, Math.round((Date.now() - since.current) / 1000)),
    });
    setDir(forward ? 1 : -1);
    setBad({});
    setStep(to);
  };

  const set = (k: Field, raw: string) => {
    const value = TIDY[k] ? TIDY[k](raw) : raw;
    setV((old) => ({ ...old, [k]: value }));
    // a message goes the moment its field is put right; none appears while typing
    if (bad[k] && OK[k](value)) setBad((old) => ({ ...old, [k]: undefined }));
  };
  const leave = (k: Field) => {
    if (!v[k] || OK[k](v[k])) return;
    setBad((old) => ({ ...old, [k]: WRONG[k] }));
    track("form_step", { form: "reserve", step: name, kind: "error", field: k });
  };
  /** Every gap on this step at once, and the cursor in the first. True when there is none. */
  const check = (fields: Field[], required: Field[]) => {
    const found: Partial<Record<Field, string>> = {};
    for (const k of fields)
      if (!OK[k](v[k]) || (required.includes(k) && !v[k].trim())) found[k] = WRONG[k];
    setBad(found);
    const first = fields.find((k) => found[k]);
    if (first) {
      track("form_step", { form: "reserve", step: name, kind: "error", field: first });
      document.getElementById(`rs-${first}`)?.focus();
    }
    return !first;
  };
  const failed = (error: string) =>
    setBad({ form: error === "closed" ? W.errors.closed : W.errors.server });

  const submit: Record<(typeof STEPS)[number], () => void> = {
    who: () => {},
    email: () => {
      if (!check(["email"], ["email"]) || !who) return;
      if (id) return go(2); // already saved on an earlier pass
      start(async () => {
        const res = await saveEmail({
          filledBy: who,
          email: v.email,
          company: trap.current?.value ?? "",
        });
        if (!res.ok) return failed(res.error);
        setId(res.id);
        go(2);
      });
    },
    names: () => {
      if (!check(["name", "student", "phone"], ["name", "student"]) || !id) return;
      start(async () => {
        const res = await saveNames({
          reservationId: id,
          parentName: v.name,
          studentFirst: v.student,
          phone: v.phone,
        });
        if (!res.ok) return failed(res.error);
        go(3);
      });
    },
    date: () => {
      if (programs.length) go(4);
    },
    pay: () => {
      if (!id) return;
      start(async () => {
        track("form_step", { form: "reserve", step: "pay", kind: "choice", value: pay });
        const res = await payForSeat({
          reservationId: id,
          programId: program,
          payment: pay,
        });
        if (res.ok) return window.location.assign(res.url);
        failed(res.error);
      });
    },
  };

  const field = (k: Field, label: string, opts: { optional?: boolean; note?: string } = {}) => (
    <div className="rs-field" key={k}>
      <label
        className="rs-pill"
        data-bad={bad[k] ? true : undefined}
        data-filled={v[k] ? true : undefined}
      >
        <span>
          {label}
          {opts.optional ? <em> ({W.optional})</em> : null}
        </span>
        <input
          id={`rs-${k}`}
          name={k}
          value={v[k]}
          aria-invalid={bad[k] ? true : undefined}
          aria-describedby={
            [bad[k] ? `rs-${k}-msg` : "", opts.note ? `rs-${k}-note` : ""].join(" ").trim() ||
            undefined
          }
          onChange={(e) => set(k, e.target.value)}
          onBlur={() => leave(k)}
          {...INPUT[k]}
        />
      </label>
      {bad[k] ? (
        <p className="rs-msg" id={`rs-${k}-msg`} role="alert">
          {bad[k]}
        </p>
      ) : null}
      {opts.note ? (
        <p className="rs-why" id={`rs-${k}-note`}>
          {opts.note}
        </p>
      ) : null}
    </div>
  );

  const steps: Record<(typeof STEPS)[number], ReactNode> = {
    who: (
      <>
        <h1 tabIndex={-1}>{W.who.headline}</h1>
        <div className="rs-pick">
          {(["parent", "student"] as const).map((k) => (
            <button
              type="button"
              key={k}
              data-on={who === k || undefined}
              onClick={() => {
                setWho(k);
                track("form_step", { form: "reserve", step: "who", kind: "choice", value: k });
                go(1);
              }}
            >
              {W.who[k]}
            </button>
          ))}
        </div>
      </>
    ),
    email: (
      <>
        <h1 tabIndex={-1}>{W.email[say].headline}</h1>
        {field("email", W.email[say].field)}
        <input
          ref={trap}
          className="rs-trap"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <p className="rs-note">{W.email.note}</p>
      </>
    ),
    names: (
      <>
        <h1 tabIndex={-1}>{W.names[say].headline}</h1>
        {field("name", W.names[say].name)}
        {field("student", W.names[say].student)}
        {field("phone", W.names.phone, { optional: true, note: W.names.phoneNote })}
      </>
    ),
    date: (
      <>
        <h1 tabIndex={-1}>{W.score.headline}</h1>
        <fieldset className="rs-dates">
          <legend className="rs-trap">{W.score.headline}</legend>
          {programs.length ? (
            programs.map((p) => (
              <label key={p.id} data-on={p.id === program || undefined}>
                <input
                  type="radio"
                  name="program"
                  checked={p.id === program}
                  onChange={() => setProgram(p.id)}
                />
                <b>{p.sat}</b>
                <span>
                  {W.score.starts} {p.starts}
                </span>
              </label>
            ))
          ) : (
            <p className="rs-note">{W.score.closed}</p>
          )}
        </fieldset>
      </>
    ),
    pay: (
      <>
        <h1 tabIndex={-1}>{W.pay.headline}</h1>
        <fieldset className="rs-pay">
          <legend className="rs-trap">{W.pay.headline}</legend>
          {(
            [
              ["full", W.pay.full, W.pay.fullPrice, W.pay.fullNote],
              ["installments", W.pay.parts, W.pay.partsPrice, W.pay.partsNote],
            ] as const
          ).map(([k, label, price, note]) => (
            <label key={k} data-on={pay === k || undefined}>
              <input type="radio" name="pay" checked={pay === k} onChange={() => setPay(k)} />
              <span>{label}</span>
              <b className="num">{price}</b>
              <small>{note}</small>
            </label>
          ))}
        </fieldset>
        <p className="rs-note rs-promise">{W.pay.promise}</p>
      </>
    ),
  };

  const last = step === STEPS.length - 1;
  return (
    <div className="rs gq-card" ref={card}>
      <header className="rs-head">
        <p className="rs-sum">{W.summary}</p>
        <p className="rs-count" aria-live="polite">
          {W.stepOf.replace("{n}", String(step + 1)).replace("{total}", String(STEPS.length))}
        </p>
        <i
          className="rs-bar"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          aria-hidden="true"
        />
      </header>
      <form
        className="rs-step"
        key={name}
        data-dir={dir}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) submit[name]();
        }}
      >
        {steps[name]}
        {step > 0 ? (
          <div className="rs-nav">
            <button type="button" className="rs-back" onClick={() => go(step - 1)} disabled={busy}>
              {W.back}
            </button>
            <button
              type="submit"
              className="btn"
              aria-disabled={busy || (name === "date" && !programs.length) || undefined}
              data-busy={busy || undefined}
            >
              <span className="lb">{last ? (busy ? W.pay.sending : W.pay.button) : W.next}</span>
            </button>
          </div>
        ) : null}
        {last ? <p className="rs-safe">{W.pay.safe}</p> : null}
      </form>
      {bad.form ? (
        <p className="rs-msg rs-form-msg" role="alert">
          {bad.form}
        </p>
      ) : null}
    </div>
  );
}
