"use client";

// Reserve a seat, built to docs/forms/form-rules.md (founder, 2026-11-13). The visitor is signed in
// before this form opens (founder, 2026-11-25: nobody pays before they have an account), so it asks only
// what the account does not already say. At most six short steps:
//   1. who is reserving (one tap, and it words the rest): not asked of a parent account, or of anyone
//      who already said;
//   2. the parent's email, asked only of a student (a parent's is their account's);
//   3. the student's first name, alone (the seat is theirs): not asked of a student whose account has it;
//   4. the parent's name and mobile phone, after a word back about the student;
//   5. the SAT date the cohort ends on (one tap, no Continue): not asked when it is already known;
//   6. how to pay (one tap, no Continue), with the total and the guarantee on screen, then our payment page.
// The reservation is saved from the first answer, so a family who stops can be followed up, and coming
// back (or pressing Back on the payment page) carries on where they were.
// Nothing else is asked before payment: a buyer who has decided should reach the payment page fast, and the
// questions that get the student started come right after it (RegistrationFlight.tsx).
// The price is in view from the first step. Each field keeps its name while it is typed in, is checked when
// it is left, and says how to fix what is wrong. Buttons are never greyed out: a press shows every gap and
// puts the cursor in the first. Answers survive Back, a refresh and a return from the payment page.
// Steps are measured with form_step events (never what was typed). Words: reserve-copy.ts. Styles: reserve.css.
import { ParentPicture, StudentPicture } from "./RolePictures";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { payForSeat, saveEmail, saveNames } from "@/app/(site)/reserve/actions";
import { track } from "@/lib/analytics/client";
import { cleanName, formatPhone, okEmail, okName, okPhone } from "@/lib/marketing/lead-rules";
import { RESERVE as W } from "@/lib/marketing/reserve-copy";
import { keepKnown, monthName, readKnown } from "@/lib/onboarding/known";
import { UNDECIDED, type OpenProgram } from "@/lib/reserve/programs";

type Who = "parent" | "student";
type Field = "email" | "name" | "student" | "phone";
type Pay = "full" | "installments";
const STEPS = ["who", "email", "student", "parent", "date", "pay"] as const;
const at = (step: (typeof STEPS)[number]) => STEPS.indexOf(step);

/** Whether a field's answer will do. */
const OK: Record<Field, (v: string) => boolean> = {
  email: okEmail,
  name: okName,
  student: okName,
  phone: okPhone,
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

/** What the signed-in account already says (lib/reserve/buyer.ts). */
export interface ReserveMe {
  who: Who | null;
  firstName: string;
  fullName: string;
  /** The SAT the account is taking, YYYY-MM-DD, or "". */
  satDate: string;
}
/** The account's unfinished reservation, carried on with. */
export interface ReserveOpen {
  id: string;
  who: Who;
  email: string;
  name: string;
  student: string;
  phone: string;
  program: string;
}

export default function ReserveForm({
  programs,
  me,
  open,
}: {
  programs: OpenProgram[];
  me: ReserveMe;
  open: ReserveOpen | null;
}) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [who, setWho] = useState<Who | null>(open?.who ?? me.who);
  const [v, setV] = useState<Record<Field, string>>({
    email: open?.email ?? "",
    name: open?.name ?? "",
    student: open?.student ?? "",
    phone: open?.phone ? formatPhone(open.phone) : "",
  });
  const [bad, setBad] = useState<Partial<Record<Field | "form", string>>>({});
  const [id, setId] = useState<string | null>(open?.id ?? null);
  const [program, setProgram] = useState(open?.program ?? "");
  const [pay, setPay] = useState<Pay | null>(null);
  const [busy, start] = useTransition();
  const [ready, setReady] = useState(false);
  // steps that are already answered (by the account, or earlier in this browser): never asked twice
  const [skip, setSkip] = useState({ who: false, student: false, date: false });
  const trap = useRef<HTMLInputElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const since = useRef(0);
  const name = STEPS[step];
  const say = who ?? "parent";
  // a parent's own account already has their name
  const nameKnown = who === "parent" && okName(me.fullName) && me.fullName.trim().length > 0;
  const stepRef = useRef(0);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Where the form opens: on the first question that is not answered yet. The account and its
  // unfinished reservation come from the server; what this browser was told before (who, which SAT)
  // fills the gaps for a brand-new account.
  useEffect(() => {
    const known = readKnown();
    const role = open?.who ?? me.who ?? known.role ?? null;
    const sat = me.satDate || known.satDate || "";
    const theirs = sat ? programs.find((p) => p.month === monthName(sat)) : undefined;
    const chosen =
      open?.program && (open.program === UNDECIDED || programs.some((p) => p.id === open.program))
        ? open.program
        : (theirs?.id ?? "");
    const student = open?.student || (role === "student" ? me.firstName : "");
    const skips = {
      who: Boolean(role),
      student: role === "student" && Boolean(me.firstName),
      date: Boolean(chosen),
    };
    setWho(role);
    setProgram(chosen);
    // the account's own name is the student's for a student, the parent's for a parent
    setV((old) => ({
      ...old,
      student: student || old.student,
      name: old.name || (role === "parent" ? me.fullName : ""),
    }));
    setSkip(skips);
    const answered: Record<(typeof STEPS)[number], boolean> = {
      who: skips.who,
      email: role === "parent" || Boolean(open?.email),
      student: Boolean(student),
      parent: Boolean(open?.name && open?.phone),
      date: skips.date,
      pay: false,
    };
    setStep(STEPS.findIndex((x) => !answered[x]));
    setReady(true);
  }, [programs, me, open]);

  // each step: note that it was seen, and put the cursor where the visitor will type
  useEffect(() => {
    if (!ready) return;
    since.current = Date.now();
    track("form_step", { form: "reserve", step: STEPS[step], kind: "view" });
    if (STEPS[step] !== "who") {
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

  /** Which SAT: the tap is the answer, so it shows for a moment and the form moves on (founder,
   *  2026-11-25: a question answered by a tap has no Continue). */
  const choosing = useRef(0);
  const choose = (programId: string) => {
    setProgram(programId);
    window.clearTimeout(choosing.current);
    choosing.current = window.setTimeout(() => go(at("pay")), 260);
  };
  /** How to pay: the same, and the payment page opens. */
  const choosePay = (how: Pay) => {
    if (busy || !id) return;
    setPay(how);
    window.clearTimeout(choosing.current);
    choosing.current = window.setTimeout(
      () =>
        start(async () => {
          track("form_step", { form: "reserve", step: "pay", kind: "choice", value: how });
          const res = await payForSeat({
            reservationId: id,
            programId: program || UNDECIDED,
            payment: how,
          });
          if (res.ok) return window.location.assign(res.url);
          setPay(null);
          failed(res.error);
        }),
      220
    );
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
    setBad({
      form:
        error === "closed" ? W.errors.closed : error === "role" ? W.errors.role : W.errors.server,
    });
  /** The reservation, made the first time something is saved (a parent's needs no email typed). */
  const reservation = async (filledBy: Who): Promise<string | null> => {
    if (id && filledBy === "parent") return id;
    const res = await saveEmail({
      filledBy,
      email: v.email,
      company: trap.current?.value ?? "",
    });
    if (!res.ok) {
      failed(res.error);
      return null;
    }
    setId(res.id);
    return res.id;
  };

  const submit: Record<(typeof STEPS)[number], () => void> = {
    who: () => {},
    // only a student is asked: the parent's email, saved (again, if it was corrected) on Continue
    email: () => {
      if (!check(["email"], ["email"]) || !who) return;
      start(async () => {
        if (await reservation(who)) go(next("email"));
      });
    },
    // the seat is for the student, so their name comes first and alone; the parent's name and phone
    // are the next question (founder, 2026-11-25)
    student: () => {
      if (!check(["student"], ["student"]) || !who) return;
      // a parent's reservation starts here (their email is their account's), so a family who stops
      // after this step can still be followed up
      start(async () => {
        if (await reservation(who)) go(at("parent"));
      });
    },
    parent: () => {
      const asked: Field[] = nameKnown ? ["phone"] : ["name", "phone"];
      if (!check(asked, asked) || !who) return;
      start(async () => {
        const seat = await reservation(who);
        if (!seat) return;
        const res = await saveNames({
          reservationId: seat,
          parentName: v.name,
          studentFirst: v.student,
          phone: v.phone,
        });
        if (!res.ok) return failed(res.error);
        go(next("parent"));
      });
    },
    date: () => {
      if (program) go(at("pay"));
    },
    pay: () => {},
  };

  const field = (k: Field, label: string, opts: { optional?: boolean } = {}) => (
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
          aria-describedby={bad[k] ? `rs-${k}-msg` : undefined}
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
                keepKnown({ role: k });
                track("form_step", { form: "reserve", step: "who", kind: "choice", value: k });
                // a parent's email is their account's; a student whose account has a name is not
                // asked for it
                const skipName = k === "student" && Boolean(me.firstName);
                setV((old) => ({
                  ...old,
                  student: skipName ? me.firstName : old.student,
                  name: old.name || (k === "parent" ? me.fullName : ""),
                }));
                setSkip((old) => ({ ...old, student: skipName }));
                go(at(k === "parent" ? "student" : "email"));
              }}
            >
              {k === "parent" ? <ParentPicture /> : <StudentPicture />}
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
      </>
    ),
    student: (
      <>
        <h1 tabIndex={-1}>{W.names[say].headline}</h1>
        {field("student", W.names[say].student)}
      </>
    ),
    parent: (
      <>
        {/* something back for the name they just gave, before the next ask */}
        <p className="rs-note rs-gave">{W.names[say].gave.replace("{name}", v.student.trim())}</p>
        {/* a parent whose account has their name is asked only for the phone */}
        <h1 tabIndex={-1}>{nameKnown ? W.names.phoneHeadline : W.names[say].parentHeadline}</h1>
        {nameKnown ? null : field("name", W.names[say].name)}
        {field("phone", W.names.phone)}
      </>
    ),
    date: (
      <>
        <h1 tabIndex={-1}>{W.score.headline}</h1>
        <fieldset className="rs-dates" data-n={programs.length}>
          <legend className="rs-trap">{W.score.headline}</legend>
          {programs.map((p) => (
            <label key={p.id} data-on={p.id === program || undefined}>
              <input
                type="radio"
                name="program"
                checked={p.id === program}
                onChange={() => choose(p.id)}
                onClick={() => choose(p.id)}
              />
              <b>{p.month}</b>
            </label>
          ))}
          <label className="rs-wide" data-on={program === UNDECIDED || undefined}>
            <input
              type="radio"
              name="program"
              checked={program === UNDECIDED}
              onChange={() => choose(UNDECIDED)}
              onClick={() => choose(UNDECIDED)}
            />
            <b>{W.score.notSure}</b>
          </label>
        </fieldset>
      </>
    ),
    pay: (
      <>
        {/* which cohort this is, with a way to change it: it may have been filled in for them */}
        <p className="rs-note rs-chosen">
          {program === UNDECIDED || !program
            ? W.pay.chosenOpen
            : W.pay.chosen.replace(
                "{month}",
                programs.find((p) => p.id === program)?.month ?? ""
              )}{" "}
          <button
            type="button"
            className="rs-change"
            disabled={busy}
            onClick={() => {
              setSkip((old) => ({ ...old, date: false }));
              go(at("date"));
            }}
          >
            {W.pay.change}
          </button>
        </p>
        <h1 tabIndex={-1}>{W.pay.headline}</h1>
        <fieldset className="rs-pay" disabled={busy}>
          <legend className="rs-trap">{W.pay.headline}</legend>
          {(
            [
              ["full", W.pay.full, W.pay.fullPrice, W.pay.fullNote],
              ["installments", W.pay.parts, W.pay.partsPrice, W.pay.partsNote],
            ] as const
          ).map(([k, label, price, note]) => (
            <label key={k} data-on={pay === k || undefined}>
              <input
                type="radio"
                name="pay"
                checked={pay === k}
                onChange={() => choosePay(k)}
                onClick={() => choosePay(k)}
              />
              <span>{label}</span>
              <b className="num">{price}</b>
              <small>{note}</small>
            </label>
          ))}
        </fieldset>
        {busy ? (
          <p className="rs-note rs-opening" role="status">
            {W.pay.sending}
          </p>
        ) : (
          <p className="rs-note rs-promise">{W.pay.promise}</p>
        )}
      </>
    ),
  };

  // the questions actually asked, in order: the count, and where Back and Continue lead
  const asked = STEPS.filter(
    (x) =>
      !(x === "who" && skip.who) &&
      !(x === "email" && who === "parent") &&
      !(x === "student" && skip.student) &&
      !(x === "date" && skip.date)
  );
  const next = (from: (typeof STEPS)[number]) => at(asked[asked.indexOf(from) + 1] ?? "pay");
  const before = asked[asked.indexOf(name) - 1];
  return (
    <div className="rs gq-card" ref={card}>
      <header className="rs-head">
        <p className="rs-sum">{W.summary}</p>
        <p className="rs-count" aria-live="polite">
          {W.stepOf
            .replace("{n}", String(asked.indexOf(name) + 1))
            .replace("{total}", String(asked.length))}
        </p>
        <i
          className="rs-bar"
          style={{ width: `${((asked.indexOf(name) + 1) / asked.length) * 100}%` }}
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
        {name === "who" ? null : (
          <div className="rs-nav">
            {/* Back goes to the last question that was asked; the first one has no Back */}
            {before ? (
              <button
                type="button"
                className="rs-back"
                onClick={() => go(at(before))}
                disabled={busy}
              >
                {W.back}
              </button>
            ) : (
              <span />
            )}
            {/* a question answered by one tap has no Continue */}
            {name === "date" || name === "pay" ? null : (
              <button
                type="submit"
                className="btn"
                aria-disabled={busy || undefined}
                data-busy={busy || undefined}
              >
                <span className="lb">{W.next}</span>
              </button>
            )}
          </div>
        )}
      </form>
      {bad.form ? (
        <p className="rs-msg rs-form-msg" role="alert">
          {bad.form}
        </p>
      ) : null}
    </div>
  );
}
