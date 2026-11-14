"use server";

// The marketing site's three forms: the SAT Program application, the private-tutoring strategy call and the
// free practice test seat. Each is checked with Zod here (the screen's own checks are only a convenience),
// recorded in `marketing_leads` with its answers, added to the Resend audience, and sent to the admin inbox
// so someone follows up. Nothing is charged and no account is made.
import { z } from "zod";
import { FROM, resend } from "@/lib/integrations/resend/client";
import { addToWaitlist } from "@/lib/integrations/resend/emails";
import {
  SCORE_FLOOR,
  okEmail,
  okName,
  okPhone,
  okScore,
  okSlot,
  slotInWindow,
  type LeadForm,
} from "@/lib/marketing/lead-rules";
import {
  FREE_PRACTICE_TEST,
  MARCH_PROGRAM,
  CALL_MINUTES,
  NEXT_PROGRAMS,
  PRIVATE_PACKAGES,
  type LeadSource,
} from "@/lib/marketing/offer";
import { list, section, SITE } from "@/lib/marketing/site-copy";
import { createAdminClient } from "@/lib/supabase/server";

export type LeadResult =
  | { ok: true }
  | { ok: false; fields: Partial<Record<string, string>> }
  | { ok: false; error: "server" };

const options = (n: number, key: string) =>
  list(section(n)[`form ${key} options`]) as [string, ...string[]];
const email = z
  .string()
  .trim()
  .max(254)
  .refine(okEmail, { message: SITE["form error email"] })
  .transform((v) => v.toLowerCase());
const latest = z
  .string()
  .trim()
  .max(4)
  .refine((v) => v === "" || okScore(v, SCORE_FLOOR.latest), { message: SITE["form error score"] });
const target = z
  .string()
  .trim()
  .max(4)
  .refine((v) => okScore(v, SCORE_FLOOR.target), { message: SITE["form error target"] });
/** A name on one line: control and invisible characters are dropped before the length checks. */
const oneLine = (message: string) =>
  z
    .string()
    .transform((v) =>
      v
        .replace(/[\p{C}]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .pipe(z.string().min(1, { message }).max(60));
/** A hidden field people never see; anything in it means a bot filled the form. */
const trap = z.literal("").optional();

const SCHEMAS = {
  apply: z.object({ email, latest, target, date: z.enum(options(25, "date")), company: trap }),
  // the free call: who to ask for, the number to text, and the time they picked
  call: z.object({
    email,
    name: oneLine(SITE["form error your name"]).refine(okName, {
      message: SITE["form error your name"],
    }),
    phone: z.string().trim().max(24).refine(okPhone, { message: SITE["form error phone"] }),
    slot: z
      .string()
      .refine((v) => okSlot(v) && slotInWindow(v), { message: SITE["form error slot"] }),
    plan: z.enum(["", ...PRIVATE_PACKAGES.map((p) => p.name)]).optional(),
    // the visitor's own time zone, so the time they saw can be worked out from the Central one
    zone: z.string().max(60).optional(),
    company: trap,
  }),
  seat: z.object({
    email,
    name: oneLine(SITE["form error name"]),
    grade: z.enum(options(42, "grade")),
    date: z.enum(options(42, "date")),
    company: trap,
  }),
} satisfies Record<LeadForm, z.ZodType>;

const COHORTS: Record<string, LeadSource> = {
  [MARCH_PROGRAM.startShort]: MARCH_PROGRAM.id,
  ...Object.fromEntries(NEXT_PROGRAMS.map((p) => [p.startShort, p.id])),
};

const LABELS: Record<LeadForm, string> = {
  apply: "SAT Program application",
  call: "Private tutoring strategy call",
  seat: "Free practice test seat",
};

const FORMS = z.enum(["apply", "call", "seat"]) satisfies z.ZodType<LeadForm>;

export async function submitLead(
  form: LeadForm,
  input: Record<string, string>
): Promise<LeadResult> {
  // the form name comes from the browser too: anything else (even "constructor") is refused calmly
  const which = FORMS.safeParse(form);
  if (!which.success) return { ok: false, error: "server" };
  const schema = SCHEMAS[which.data];
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fields: Partial<Record<string, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fields[key] ??= issue.message;
    }
    // a filled trap gets the same quiet "done" a person gets, so the bot learns nothing
    if (fields.company) return { ok: true };
    return { ok: false, fields };
  }
  const data = parsed.data as Record<string, string | undefined>;
  const source: LeadSource =
    form === "seat"
      ? FREE_PRACTICE_TEST.id
      : form === "call"
        ? "private"
        : COHORTS[data.date ?? ""];
  const details = Object.fromEntries(
    (["latest", "target", "date", "grade", "phone", "slot", "zone", "plan"] as const)
      .filter((k) => data[k])
      .map((k) => [
        k === "date" ? (form === "apply" ? "startDate" : "satDate") : k,
        data[k] as string,
      ])
  );

  const dbReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  let saved = false;
  try {
    if (dbReady) {
      const { error } = await createAdminClient()
        .from("marketing_leads")
        .upsert(
          {
            email: data.email as string,
            source,
            name: data.name ?? null,
            details,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email,source" }
        );
      if (error) throw error;
      saved = true;
    } else if (process.env.NODE_ENV === "production") {
      throw new Error("marketing_leads is not configured");
    }
  } catch (error) {
    console.error(
      "[lead] could not record the lead:",
      (error as { message?: string })?.message ?? "unknown"
    );
  }

  if (!saved && (dbReady || process.env.NODE_ENV === "production")) {
    // Until the live database has its marketing_leads table (founder, 2026-10-26), the admin inbox is the
    // record: the lead counts as received only if that email goes out.
    const sent = await notifyAdmin(form, data, details, source, true).catch(() => false);
    if (!sent) return { ok: false, error: "server" };
    await Promise.allSettled([addToWaitlist(data.email as string)]);
    return { ok: true };
  }

  // Best effort from here: the lead is already safe in the database.
  await Promise.allSettled([
    addToWaitlist(data.email as string),
    notifyAdmin(form, data, details, source, false),
  ]);
  return { ok: true };
}

/** "2026-11-19 5:00 pm" in Central Time, as a moment. Null if it cannot be read. */
function callStart(slot: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):00 (am|pm)$/.exec(slot);
  if (!m) return null;
  const hour = (Number(m[4]) % 12) + (m[5] === "pm" ? 12 : 0);
  const noon = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  const central = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hourCycle: "h23",
    }).format(noon)
  );
  return new Date(noon.getTime() + (hour - central) * 36e5);
}

/** A calendar invite for the free call, so opening the email puts it on the founder's calendar. */
function callInvite(start: Date, data: Record<string, string | undefined>, to: string): string {
  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const clean = (v: string) =>
    v
      .replace(/[\\;,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const end = new Date(start.getTime() + CALL_MINUTES * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Karman Prep//Free call//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:call-${stamp(start)}-${clean(data.email ?? "").replace(/[^a-z0-9]/gi, "")}@karmanprep.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:Karman free call: ${clean(data.name ?? "")}`,
    `DESCRIPTION:Phone ${clean(data.phone ?? "")} · ${clean(data.email ?? "")}${data.plan ? ` · ${clean(data.plan)}` : ""}`,
    `ORGANIZER;CN=Karman Prep:mailto:${to}`,
    `ATTENDEE;CN=Karman Prep;RSVP=TRUE:mailto:${to}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Karman free call",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Sends the lead to the admin inbox. Returns whether it was accepted for delivery. */
async function notifyAdmin(
  form: LeadForm,
  data: Record<string, string | undefined>,
  details: Record<string, string>,
  source: LeadSource,
  only: boolean
): Promise<boolean> {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return false;
  const lines = [
    only ? "NOT saved in the database: this email is the only record of this lead. Keep it." : "",
    `Email: ${data.email}`,
    `Source: ${source}`,
    data.name ? `${form === "call" ? "Name" : "Student's first name"}: ${data.name}` : "",
    ...Object.entries(details).map(([k, v]) => `${k}: ${v}`),
  ].filter(Boolean);
  const start = form === "call" && data.slot ? callStart(data.slot) : null;
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    replyTo: data.email,
    ...(start
      ? {
          attachments: [
            {
              filename: "karman-call.ics",
              content: Buffer.from(callInvite(start, data, to)).toString("base64"),
              contentType: "text/calendar; method=REQUEST; charset=utf-8",
            },
          ],
        }
      : {}),
    subject: `New ${LABELS[form]}`,
    text: `${LABELS[form]} from karmanprep.com\n\n${lines.join("\n")}\n`,
  });
  if (error) console.error("[lead] admin email failed:", error.message ?? "unknown");
  return !error;
}
