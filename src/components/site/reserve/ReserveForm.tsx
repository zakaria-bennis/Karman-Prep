"use client";

// Reserve a seat (founder, 2026-11-11 and 2026-11-13): four short steps under a progress bar. Who is filling
// it in comes first and the wording of the next step follows from it. Contact details are saved as soon as
// they are given (saveContact), so an unfinished reservation can be followed up. The last step opens
// Stripe's own checkout page (payForSeat). Every field is checked here for the visitor's sake and again on
// the server. Words: reserve-copy.ts. Styles: reserve.css.
import { useRef, useState, useTransition, type CSSProperties } from "react";
import { payForSeat, saveContact } from "@/app/(site)/reserve/actions";
import { cleanName, okEmail, okName, okPhone, okScore } from "@/lib/marketing/lead-rules";
import { RESERVE as W } from "@/lib/marketing/reserve-copy";
import type { OpenProgram } from "@/lib/reserve/programs";

type Who = "parent" | "student";
type Key = "first" | "last" | "email" | "phone" | "student";
const KEYS: Key[] = ["first", "last", "email", "phone", "student"];
const NAME_KEYS = new Set<Key>(["first", "last", "student"]);

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

const OK: Record<Key, (v: string) => boolean> = {
  first: okName,
  last: okName,
  student: okName,
  email: okEmail,
  phone: okPhone,
};
const WRONG: Record<Key, string> = {
  first: W.errors.name,
  last: W.errors.name,
  student: W.errors.name,
  email: W.errors.email,
  phone: W.errors.phone,
};
const INPUT: Record<Key, Record<string, string | number>> = {
  first: { type: "text", autoComplete: "given-name", autoCapitalize: "words", maxLength: 40 },
  last: { type: "text", autoComplete: "family-name", autoCapitalize: "words", maxLength: 40 },
  student: { type: "text", autoComplete: "off", autoCapitalize: "words", maxLength: 40 },
  email: {
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    autoCapitalize: "off",
    maxLength: 254,
  },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 17 },
};

export default function ReserveForm({ programs }: { programs: OpenProgram[] }) {
  const [step, setStep] = useState(0);
  const [who, setWho] = useState<Who | null>(null);
  const [v, setV] = useState<Record<Key, string>>({
    first: "",
    last: "",
    email: "",
    phone: "",
    student: "",
  });
  const [bad, setBad] = useState<Partial<Record<Key | "score" | "form", string>>>({});
  const [id, setId] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [noScore, setNoScore] = useState(false);
  const [program, setProgram] = useState(programs[0]?.id ?? "");
  const [pay, setPay] = useState<"full" | "installments">("full");
  const [busy, start] = useTransition();
  const trap = useRef<HTMLInputElement>(null);
  const words = W.contact[who ?? "parent"];

  const set = (k: Key, raw: string) => {
    const value = NAME_KEYS.has(k) ? cleanName(raw) : k === "phone" ? formatPhone(raw) : raw;
    setV((old) => ({ ...old, [k]: value }));
    if (bad[k]) setBad((old) => ({ ...old, [k]: OK[k](value) ? undefined : WRONG[k] }));
  };

  // every gap is shown at once, and the cursor goes to the first one
  const checkContact = () => {
    const found: Partial<Record<Key, string>> = {};
    for (const k of KEYS) if (!OK[k](v[k])) found[k] = WRONG[k];
    setBad(found);
    const first = KEYS.find((k) => found[k]);
    if (first) document.getElementById(`rs-${first}`)?.focus();
    return !first;
  };

  const toScore = () => {
    if (!checkContact() || !who) return;
    start(async () => {
      const res = await saveContact({
        filledBy: who,
        parentFirst: v.first,
        parentLast: v.last,
        parentEmail: v.email,
        parentPhone: v.phone,
        studentFirst: v.student,
        company: trap.current?.value ?? "",
      });
      if (!res.ok) return setBad({ form: W.errors.server });
      setId(res.id);
      setBad({});
      setStep(2);
    });
  };

  const toPay = () => {
    if (!noScore && !okScore(score, 400)) return setBad({ score: W.errors.score });
    setBad({});
    setStep(3);
  };

  const submit = () => {
    if (!id) return;
    start(async () => {
      const res = await payForSeat({
        reservationId: id,
        startScore: noScore ? "" : score,
        programId: program,
        payment: pay,
      });
      if (res.ok) return window.location.assign(res.url);
      setBad({ form: res.error === "closed" ? W.errors.closed : W.errors.server });
    });
  };

  return (
    <div className="rs gq-card" style={{ "--at": step } as CSSProperties}>
      <ol className="rs-bar" aria-label={`Step ${step + 1} of ${W.steps.length}`}>
        {W.steps.map((name, i) => (
          <li
            key={name}
            data-on={i <= step || undefined}
            aria-current={i === step ? "step" : undefined}
          >
            {name}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="rs-step" key="who">
          <h1>{W.who.headline}</h1>
          <div className="rs-pick">
            {(["parent", "student"] as const).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => {
                  setWho(k);
                  setStep(1);
                }}
              >
                {W.who[k]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <form
          className="rs-step"
          key="contact"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            toScore();
          }}
        >
          <h1>{words.headline}</h1>
          <div className="rs-fields">
            {KEYS.map((k) => (
              <div
                className="rs-field"
                data-half={k === "first" || k === "last" || undefined}
                key={k}
              >
                <label className="cf-pill" data-bad={bad[k] ? true : undefined}>
                  <input
                    id={`rs-${k}`}
                    name={k}
                    value={v[k]}
                    placeholder={words[k]}
                    aria-label={words[k]}
                    aria-invalid={bad[k] ? true : undefined}
                    aria-describedby={bad[k] ? `rs-${k}-msg` : undefined}
                    onChange={(e) => set(k, e.target.value)}
                    onBlur={(e) =>
                      e.target.value &&
                      setBad((old) => ({
                        ...old,
                        [k]: OK[k](e.target.value) ? undefined : WRONG[k],
                      }))
                    }
                    {...INPUT[k]}
                  />
                </label>
                {bad[k] ? (
                  <p className="rs-msg" id={`rs-${k}-msg`}>
                    {bad[k]}
                  </p>
                ) : null}
              </div>
            ))}
            <input
              ref={trap}
              className="rs-trap"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
          </div>
          <p className="rs-note">{W.contact.note}</p>
          <Nav back={() => setStep(0)} busy={busy} label={W.next} />
        </form>
      ) : null}

      {step === 2 ? (
        <form
          className="rs-step"
          key="score"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            toPay();
          }}
        >
          <h1>{W.score.headline}</h1>
          <div className="rs-fields">
            <div className="rs-field">
              <label
                className="cf-pill"
                data-bad={bad.score ? true : undefined}
                data-off={noScore || undefined}
              >
                <input
                  id="rs-score"
                  inputMode="numeric"
                  maxLength={4}
                  disabled={noScore}
                  value={noScore ? "" : score}
                  placeholder={W.score.field}
                  aria-label={W.score.field}
                  aria-invalid={bad.score ? true : undefined}
                  onChange={(e) => {
                    setScore(e.target.value.replace(/\D/g, ""));
                    if (bad.score) setBad({});
                  }}
                />
              </label>
              {bad.score ? <p className="rs-msg">{bad.score}</p> : null}
            </div>
            <label className="rs-check">
              <input
                type="checkbox"
                checked={noScore}
                onChange={(e) => {
                  setNoScore(e.target.checked);
                  setBad({});
                }}
              />
              <span>{W.score.none}</span>
            </label>
            {noScore ? <p className="rs-note">{W.score.noneNote}</p> : null}
          </div>
          <fieldset className="rs-dates">
            <legend>{W.score.date}</legend>
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
          <Nav back={() => setStep(1)} busy={busy} label={W.next} off={!programs.length} />
        </form>
      ) : null}

      {step === 3 ? (
        <form
          className="rs-step"
          key="pay"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <h1>{W.pay.headline}</h1>
          <fieldset className="rs-pay">
            <legend className="rs-trap">{W.pay.headline}</legend>
            {(
              [
                ["full", W.pay.full, W.pay.fullPrice, W.pay.fullNote],
                ["installments", W.pay.parts, W.pay.partsPrice, W.pay.partsNote],
              ] as const
            ).map(([k, name, price, note]) => (
              <label key={k} data-on={pay === k || undefined}>
                <input type="radio" name="pay" checked={pay === k} onChange={() => setPay(k)} />
                <span>{name}</span>
                <b className="num">{price}</b>
                <small>{note}</small>
              </label>
            ))}
          </fieldset>
          <p className="rs-note">{W.pay.promise}</p>
          <Nav back={() => setStep(2)} busy={busy} label={busy ? W.pay.sending : W.pay.button} />
          <p className="rs-safe">{W.pay.safe}</p>
        </form>
      ) : null}

      {bad.form ? (
        <p className="rs-msg rs-form-msg" role="alert">
          {bad.form}
        </p>
      ) : null}
    </div>
  );
}

/** Back, and the step's main button, which shows that it is working while the server answers. */
function Nav({
  back,
  busy,
  label,
  off,
}: {
  back: () => void;
  busy: boolean;
  label: string;
  off?: boolean;
}) {
  return (
    <div className="rs-nav">
      <button type="button" className="rs-back" onClick={back} disabled={busy}>
        {W.back}
      </button>
      <button type="submit" className="btn" disabled={busy || off} data-busy={busy || undefined}>
        <span className="lb">{label}</span>
      </button>
    </div>
  );
}
