"use client";

// The free-call form that closes the Private tutoring page: a name, a phone number, an email, and a time
// picked from the same day-and-time picker as the session demo. It sits straight on the landscape, in
// frosted-glass pills. Each field is checked when you leave it and again on the server (lead-actions.ts).
// If a plan's button was pressed above (PlanPicker.tsx), the plan's name goes along with the request.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { submitLead } from "@/app/(site)/lead-actions";
import { Arrow } from "@/components/site/parts";
import { okEmail, okPhone } from "@/lib/marketing/lead-rules";
import SlotPicker, {
  dayKey,
  fmtTime,
  longDay,
  openHours,
  useDays,
  type SlotWords,
} from "./SlotPicker";

type Field = "name" | "phone" | "email";

export interface CallWords extends SlotWords {
  name: string;
  phone: string;
  email: string;
  zone: string;
  button: string;
  sending: string;
  doneTitle: string;
  doneText: string;
  errors: Record<Field | "slot" | "server" | "network", string>;
}

const OK: Record<Field, (v: string) => boolean> = {
  name: (v) => v.trim().length > 0,
  phone: okPhone,
  email: okEmail,
};
const INPUT: Record<Field, Record<string, string | number>> = {
  name: { type: "text", autoComplete: "name", autoCapitalize: "words", maxLength: 60 },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 24 },
  email: {
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    autoCapitalize: "off",
    spellCheck: "false",
    maxLength: 254,
  },
};
const FIELDS: Field[] = ["name", "phone", "email"];

export default function CallForm({ w, today }: { w: CallWords; today: string }) {
  const days = useDays(today, 14);
  const first = days.find((d) => openHours(d, "calls").length) ?? days[0];
  const [day, setDay] = useState(first);
  const [hour, setHour] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [banner, setBanner] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const plan = useRef("");
  const form = useRef<HTMLFormElement>(null);
  const doneBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = (e: Event) => (plan.current = String((e as CustomEvent).detail ?? ""));
    window.addEventListener("karman:plan", on);
    return () => window.removeEventListener("karman:plan", on);
  }, []);
  useEffect(() => {
    if (done) doneBox.current?.focus();
  }, [done]);

  const check = (k: Field, v: string) =>
    setErrors((e) => ({ ...e, [k]: OK[k](v) ? "" : w.errors[k] }));
  const when = hour === null ? "" : `${longDay(day)} · ${fmtTime(hour)} ${w.zone}`;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending || !form.current) return;
    const data = Object.fromEntries(
      [...new FormData(form.current).entries()].map(([k, v]) => [k, String(v)])
    );
    const found: Record<string, string> = {};
    for (const k of FIELDS) if (!OK[k](data[k] ?? "")) found[k] = w.errors[k];
    if (hour === null) found.slot = w.errors.slot;
    setErrors(found);
    const bad = FIELDS.find((k) => found[k]);
    if (bad) return form.current.querySelector<HTMLElement>(`[name="${bad}"]`)?.focus();
    if (found.slot) return;
    setBanner("");
    setSending(true);
    let result: Awaited<ReturnType<typeof submitLead>> | null = null;
    try {
      result = await submitLead("call", {
        ...data,
        slot: `${dayKey(day)} ${fmtTime(hour as number)}`,
        plan: plan.current,
      });
    } catch {
      result = null;
    }
    setSending(false);
    if (!result) return setBanner(navigator.onLine ? w.errors.server : w.errors.network);
    if (!result.ok) {
      if ("fields" in result) return setErrors(result.fields);
      return setBanner(w.errors.server);
    }
    setDone(true);
  }

  if (done)
    return (
      <div className="cf cf-done" id="call" tabIndex={-1} ref={doneBox} role="status">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="29" />
          <path d="M19 33.5 28 42.5 46 23.5" />
        </svg>
        <h3>{w.doneTitle}</h3>
        <p>{when}</p>
        <p>{w.doneText}</p>
      </div>
    );

  return (
    <form className="cf" id="call" noValidate ref={form} onSubmit={onSubmit}>
      <div className="cf-fields">
        {FIELDS.map((k) => (
          <div className="cf-field" key={k}>
            <label className="cf-pill" data-bad={errors[k] ? true : undefined}>
              <span>{w[k]}</span>
              <input
                name={k}
                aria-invalid={errors[k] ? true : undefined}
                aria-describedby={errors[k] ? `call-${k}-msg` : undefined}
                onBlur={(e) => e.target.value && check(k, e.target.value)}
                onChange={(e) => errors[k] && check(k, e.target.value)}
                {...INPUT[k]}
              />
            </label>
            {errors[k] ? (
              <p className="cf-msg" id={`call-${k}-msg`}>
                {errors[k]}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <div className="cf-when">
        <SlotPicker
          days={days}
          kind="calls"
          day={day}
          hour={hour}
          onDay={(d) => {
            setDay(d);
            setHour(null);
          }}
          onHour={(h) => {
            setHour(h);
            setErrors((e) => ({ ...e, slot: "" }));
          }}
          w={w}
        />
        {errors.slot ? <p className="cf-msg">{errors.slot}</p> : null}
      </div>
      {/* a field people never see or reach: bots fill it, the server drops what they send */}
      <input
        className="k-trap"
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        defaultValue=""
      />
      <div className="cf-end">
        <p className="cf-sum" aria-live="polite">
          {when || w.zone}
        </p>
        {banner ? (
          <p className="cf-msg" role="alert">
            {banner}
          </p>
        ) : null}
        <button className="btn" type="submit" aria-busy={sending || undefined}>
          <span className="lb">{sending ? w.sending : w.button}</span>
          <span className="go">
            <Arrow />
          </span>
        </button>
      </div>
    </form>
  );
}
