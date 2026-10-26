"use client";

// The short form card on the program, private-tutoring and free-test pages. Fields come from the copy
// section's "form ..." labels. A field is checked when you leave it (empty fields aren't scolded on the way
// past) and clears the moment it's fixed; the button never blocks, a second press waits for the first; every
// send says what happened. The server (lead-actions.ts) checks everything again with Zod.
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { submitLead } from "@/app/(site)/lead-actions";
import { okEmail, okScore, SCORE_FLOOR, type LeadForm } from "@/lib/marketing/lead-rules";
import { list, section, SITE } from "@/lib/marketing/site-copy";
import { busy, toast } from "./live/kit";
import { Arrow, Icon } from "./parts";

type Field = "email" | "name" | "latest" | "target";

const RULES: Record<Field, (v: string) => string> = {
  email: (v) => (okEmail(v) ? "" : SITE["form error email"]),
  name: (v) => (v.trim() ? "" : SITE["form error name"]),
  latest: (v) => (!v.trim() || okScore(v, SCORE_FLOOR.latest) ? "" : SITE["form error score"]),
  target: (v) => (okScore(v, SCORE_FLOOR.target) ? "" : SITE["form error target"]),
};

export default function LeadFormCard({
  n,
  form,
  anchor,
  heading,
  className = "i-formcard rv",
  style,
}: {
  /** The copy section holding this form's labels. */
  n: number;
  form: LeadForm;
  /** The card's id, the target of the page's buttons (#apply, #call, #seat). */
  anchor: string;
  /** A heading above the fields (the free test's "Save your student's seat."). */
  heading?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const f = section(n);
  const F = (k: string) => f[`form ${k}`];
  const id = `${anchor}f`;
  const ref = useRef<HTMLFormElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [banner, setBanner] = useState("");
  const [done, setDone] = useState(false);
  const sending = useRef(false);
  const fields = (["email", "name", "latest", "target"] as Field[]).filter((k) => F(k));

  const value = (k: string) =>
    (ref.current?.elements.namedItem(k) as HTMLInputElement | null)?.value ?? "";
  const check = (k: Field, v: string) => setErrors((e) => ({ ...e, [k]: RULES[k](v) }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending.current || !ref.current) return;
    const found = Object.fromEntries(fields.map((k) => [k, RULES[k](value(k))]));
    setErrors(found);
    const first = fields.find((k) => found[k]);
    if (first) return document.getElementById(`${id}-${first}`)?.focus();
    setBanner("");
    const data = Object.fromEntries(
      [...new FormData(ref.current).entries()].map(([k, v]) => [k, String(v)])
    );
    const button = ref.current.querySelector<HTMLButtonElement>('button[type="submit"]');
    sending.current = true;
    if (button) busy(button, true, SITE["form sending"]);
    let result: Awaited<ReturnType<typeof submitLead>> | null = null;
    try {
      result = await submitLead(form, data);
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
        const bad = Object.keys(result.fields)[0];
        document.getElementById(`${id}-${bad}`)?.focus();
        return;
      }
      return setBanner(SITE["form error server"]);
    }
    setDone(true);
  }

  // once sent: the confirmation takes focus, and a message appears only if the card is off screen
  useEffect(() => {
    if (!done) return;
    card.current?.querySelector<HTMLElement>(".k-done")?.focus();
    const r = card.current?.getBoundingClientRect();
    if (r && (r.bottom < 80 || r.top > innerHeight - 80))
      toast(f["form done title"] ?? "", f["form done text"] ?? "");
  }, [done, f]);

  const help = (k: string) => (F(`${k} help`) ? `${id}-${k}-help` : "");
  const describedBy = (k: string) =>
    [help(k), errors[k] ? `${id}-${k}-msg` : ""].filter(Boolean).join(" ") || undefined;
  const msg = (k: string) =>
    errors[k] ? (
      <p className="k-fieldmsg" id={`${id}-${k}-msg`}>
        <Icon name="alert" />
        <span>{errors[k]}</span>
      </p>
    ) : null;
  const input = (k: Field, extra: Record<string, string | number>) => (
    <div className="k-field">
      <label htmlFor={`${id}-${k}`}>{F(k)}</label>
      <input
        id={`${id}-${k}`}
        name={k}
        aria-invalid={errors[k] ? true : undefined}
        aria-describedby={describedBy(k)}
        onBlur={(e) => e.target.value && check(k, e.target.value)}
        onChange={(e) => errors[k] && check(k, e.target.value)}
        {...extra}
      />
      {F(`${k} help`) ? (
        <p className="help" id={help(k)}>
          {F(`${k} help`)}
        </p>
      ) : null}
      {msg(k)}
    </div>
  );
  const score = (k: "latest" | "target") =>
    input(k, {
      type: "text",
      inputMode: "numeric",
      autoComplete: "off",
      maxLength: 4,
      placeholder: "1200",
    });

  return (
    <div className={className} style={style} id={anchor} ref={card}>
      {done ? (
        <div className="k-done" tabIndex={-1}>
          <span className="k-badge">
            <Icon name="check" className="draw" />
          </span>
          <h3>{F("done title")}</h3>
          <p>{F("done text")}</p>
        </div>
      ) : (
        <>
          {heading ? <h2 className="i-formh">{heading}</h2> : null}
          <form className="k-form" id={id} noValidate ref={ref} onSubmit={onSubmit}>
            {F("email")
              ? input("email", {
                  type: "email",
                  inputMode: "email",
                  autoComplete: "email",
                  autoCapitalize: "off",
                  spellCheck: "false",
                  maxLength: 254,
                })
              : null}
            {F("name")
              ? input("name", {
                  type: "text",
                  autoComplete: "off",
                  autoCapitalize: "words",
                  maxLength: 60,
                })
              : null}
            {F("grade") ? (
              <fieldset className="k-field">
                <legend>{F("grade")}</legend>
                <div className="k-chips">
                  {list(F("grade options")).map((g, i) => (
                    <label key={g}>
                      <input type="radio" name="grade" value={g} defaultChecked={i === 2} />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            {F("latest") || F("target") ? (
              <div className="k-pair">
                {F("latest") ? score("latest") : null}
                {F("target") ? score("target") : null}
              </div>
            ) : null}
            {F("date") ? (
              <div className="k-field">
                <label htmlFor={`${id}-date`}>{F("date")}</label>
                <select id={`${id}-date`} name="date">
                  {list(F("date options")).map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
            ) : null}
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
            <div className="k-slot">
              {banner ? (
                <div className="k-banner" role="alert">
                  <Icon name="alert" />
                  <span>{banner}</span>
                  <button type="button" onClick={() => ref.current?.requestSubmit()}>
                    {SITE["form retry"]}
                  </button>
                </div>
              ) : null}
            </div>
            <button className="btn" type="submit">
              <span className="lb">{F("button")}</span>
              <span className="go">
                <Arrow />
              </span>
            </button>
            {F("privacy") ? <p className="help">{F("privacy")}</p> : null}
          </form>
        </>
      )}
    </div>
  );
}
