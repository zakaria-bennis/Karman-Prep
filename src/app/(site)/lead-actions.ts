"use server";

// The marketing site's three forms: the SAT Program application, the private-tutoring strategy call and the
// free practice test seat. Each is checked with Zod here (the screen's own checks are only a convenience),
// recorded in `marketing_leads` with its answers, added to the Resend audience, and sent to the admin inbox
// so someone follows up. Nothing is charged and no account is made.
import { z } from "zod";
import { FROM, resend } from "@/lib/integrations/resend/client";
import { addToWaitlist } from "@/lib/integrations/resend/emails";
import { okEmail, okScore, SCORE_FLOOR, type LeadForm } from "@/lib/marketing/lead-rules";
import {
  FREE_PRACTICE_TEST,
  MARCH_PROGRAM,
  NEXT_PROGRAMS,
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
/** A hidden field people never see; anything in it means a bot filled the form. */
const trap = z.literal("").optional();

const SCHEMAS = {
  apply: z.object({ email, latest, target, date: z.enum(options(25, "date")), company: trap }),
  call: z.object({ email, latest, date: z.enum(options(36, "date")), company: trap }),
  seat: z.object({
    email,
    name: z.string().trim().min(1, { message: SITE["form error name"] }).max(60),
    grade: z.enum(options(42, "grade")),
    date: z.enum(options(42, "date")),
    company: trap,
  }),
} satisfies Record<LeadForm, z.ZodType>;

const COHORTS: Record<string, LeadSource> = {
  [MARCH_PROGRAM.testDateShort]: MARCH_PROGRAM.id,
  ...Object.fromEntries(NEXT_PROGRAMS.map((p) => [p.testDateShort, p.id])),
};

const LABELS: Record<LeadForm, string> = {
  apply: "SAT Program application",
  call: "Private tutoring strategy call",
  seat: "Free practice test seat",
};

export async function submitLead(
  form: LeadForm,
  input: Record<string, string>
): Promise<LeadResult> {
  const schema = SCHEMAS[form];
  if (!schema) return { ok: false, error: "server" };
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
    (["latest", "target", "date", "grade"] as const)
      .filter((k) => data[k])
      .map((k) => [k === "date" ? "satDate" : k, data[k] as string])
  );

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
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
    } else if (process.env.NODE_ENV === "production") {
      throw new Error("marketing_leads is not configured");
    }
  } catch (error) {
    console.error(
      "[lead] could not record the lead:",
      (error as { message?: string })?.message ?? "unknown"
    );
    return { ok: false, error: "server" };
  }

  // Best effort from here: the lead is already safe in the database.
  await Promise.allSettled([addToWaitlist(data.email as string), notifyAdmin(form, data, details)]);
  return { ok: true };
}

async function notifyAdmin(
  form: LeadForm,
  data: Record<string, string | undefined>,
  details: Record<string, string>
) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return;
  const lines = [
    `Email: ${data.email}`,
    data.name ? `Student's first name: ${data.name}` : "",
    ...Object.entries(details).map(([k, v]) => `${k}: ${v}`),
  ].filter(Boolean);
  await resend.emails.send({
    from: FROM,
    to,
    replyTo: data.email,
    subject: `New ${LABELS[form]}`,
    text: `${LABELS[form]} from karmanprep.com\n\n${lines.join("\n")}\n`,
  });
}
