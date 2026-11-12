// ============================================================
// First-party analytics: the fixed list of events the browser may send, the limits, and the
// pure helpers both the route and the admin views share (path clean-up, surface, feature).
//
// Privacy by construction: an event is one of the names below with short, pattern-checked
// properties. Nothing here can carry an email, a name or text a person typed. Per-question
// answers are not events: the scoring tables (quiz_run_responses, catalog_practice_responses,
// question_responses) already hold them.
// ============================================================

import { z } from "zod";
import { MAX_BATCH, normalizePath } from "./shared";

export {
  ANALYTICS_RETENTION_MONTHS,
  MAX_BATCH,
  MAX_BODY_BYTES,
  SESSION_EVENTS_PER_MINUTE,
  featureOf,
  normalizePath,
  surfaceOf,
} from "./shared";

/** A short machine word: letters, digits and a few joiners. Never free text. */
const slug = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_.:/-]{0,59}$/i)
  .max(60);
const uuid = z.string().uuid();

/** Each event the browser may send, with the only properties it may carry. */
export const CLIENT_EVENTS = {
  /** A page was shown. */
  page_view: z.object({}).strict(),
  /** Seconds a page was visible and in use (sent when the visitor leaves it or hides the tab). */
  page_time: z.object({ seconds: z.number().int().min(1).max(1800) }).strict(),
  /** A click on a link into sign-up or checkout from the public site. */
  cta_click: z.object({ to: z.enum(["sign_up", "checkout", "sign_in"]) }).strict(),
  /** A click on any element marked data-track="name". */
  ui_click: z.object({ target: slug }).strict(),
  /** The account was created and the visitor reached the intake (first screen after sign-up). */
  signup: z.object({}).strict(),
  /** A question appeared on the quiz screen. With the scoring tables this gives skips and time to first answer. */
  question_viewed: z
    .object({ questionId: uuid, mode: z.enum(["instant", "end", "locked"]).optional() })
    .strict(),
  /** The calculator was opened on a question. */
  calculator_opened: z.object({ questionId: uuid.optional() }).strict(),
} as const;

export type ClientEventName = keyof typeof CLIENT_EVENTS;
export const CLIENT_EVENT_NAMES = Object.keys(CLIENT_EVENTS) as ClientEventName[];

/** Events only the server records (it knows they happened; the browser can't fake them). */
export const SERVER_EVENTS = [
  "onboarding_done",
  "test_started",
  "checkout_started",
  "paid",
] as const;
export type ServerEventName = (typeof SERVER_EVENTS)[number];

const utm = z
  .string()
  .max(100)
  .regex(/^[\w .+-]{1,100}$/)
  .refine((v) => !v.includes("@"), "no addresses");

/** One event as the browser sends it. Props are checked per name in parseBatch. */
const clientEventSchema = z
  .object({
    name: z.enum(CLIENT_EVENT_NAMES as [ClientEventName, ...ClientEventName[]]),
    path: z.string().min(1).max(400).startsWith("/"),
    at: z.number().int().positive(),
    props: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const batchSchema = z
  .object({
    anonymousId: uuid,
    sessionId: uuid,
    device: z.enum(["phone", "tablet", "desktop"]).optional(),
    /** The visit's first page only: where it came from (host, never the full address). */
    entry: z
      .object({
        referrerHost: z
          .string()
          .max(100)
          .regex(/^[a-z0-9.-]+$/i)
          .optional(),
        utmSource: utm.optional(),
        utmMedium: utm.optional(),
        utmCampaign: utm.optional(),
      })
      .strict()
      .optional(),
    events: z.array(clientEventSchema).min(1).max(MAX_BATCH),
  })
  .strict();

export type ClientBatch = z.infer<typeof batchSchema>;

export interface CleanEvent {
  name: ClientEventName;
  path: string;
  occurredAt: string;
  props: Record<string, unknown>;
}

/** Keeps the events whose props pass their own schema; clamps clock skew to the server's now. */
export function cleanEvents(batch: ClientBatch, now = Date.now()): CleanEvent[] {
  const out: CleanEvent[] = [];
  for (const e of batch.events) {
    const props = CLIENT_EVENTS[e.name].safeParse(e.props ?? {});
    if (!props.success) continue;
    // A browser clock may be off; anything from the future or over a day old gets "now".
    const at = e.at > now || e.at < now - 86_400_000 ? now : e.at;
    out.push({
      name: e.name,
      path: normalizePath(e.path),
      occurredAt: new Date(at).toISOString(),
      props: props.data as Record<string, unknown>,
    });
  }
  return out;
}
