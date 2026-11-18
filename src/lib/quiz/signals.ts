// What the quiz sends the server about how a question was answered: a question's record
// (record.ts), cut down to what is kept. The browser reports it, so it is evidence of what
// happened on the student's device, never proof; the answer itself, and whether it is right, are
// still decided on the server from the answer alone.
import { z } from "zod";
import type { Device, QuestionRecord } from "./record";

const ms = z.number().int().min(0).max(86_400_000);
const count = z.number().int().min(0).max(9999);

export const answerSignalsSchema = z
  .object({
    questionId: z.string().uuid(),
    position: z.number().int().min(0).max(399),
    order: z.array(z.string().max(4)).max(8),
    activeMs: ms,
    awayMs: ms,
    idleMs: ms,
    aways: count,
    firstActionMs: ms.nullable(),
    answeredMs: ms.nullable(),
    picks: z.array(z.object({ choice: z.string().max(200), at: ms }).strict()).max(60),
    crossed: z
      .array(z.object({ choice: z.string().max(4), on: z.boolean(), at: ms }).strict())
      .max(60),
    calculatorOpens: count,
    calculatorMs: ms,
    explanationMs: ms,
    visits: count,
    pastes: count,
    copies: count,
    screenshotKeys: count,
    toolKeys: count,
    marked: z.boolean(),
    input: z.enum(["touch", "mouse", "keys"]).nullable(),
  })
  .strict();
export type AnswerSignals = z.infer<typeof answerSignalsSchema>;

export const deviceSchema = z
  .object({
    width: z.number().int().min(0).max(20_000),
    height: z.number().int().min(0).max(20_000),
    touch: z.boolean(),
    extended: z.boolean().optional(),
    utcOffset: z.number().int().min(-900).max(900),
  })
  .strict();

export const noteSignalsSchema = z
  .object({
    runId: z.string().uuid(),
    device: deviceSchema,
    items: z.array(answerSignalsSchema).min(1).max(60),
  })
  .strict();
export type NoteSignals = z.infer<typeof noteSignalsSchema>;

const cap = (n: number) => Math.min(86_400_000, Math.max(0, Math.round(n)));

/** A question's record as it is sent. Long lists keep their first and last entries. */
export function signalsOf(q: QuestionRecord): AnswerSignals {
  const ends = <T>(list: T[]) =>
    list.length <= 60 ? list : [...list.slice(0, 30), ...list.slice(-30)];
  return {
    questionId: q.questionId,
    position: Math.min(399, q.position),
    order: q.order.slice(0, 8),
    activeMs: cap(q.activeMs),
    awayMs: cap(q.awayMs),
    idleMs: cap(q.idleMs),
    aways: Math.min(9999, q.aways),
    firstActionMs: q.firstActionMs === null ? null : cap(q.firstActionMs),
    answeredMs: q.answeredMs === null ? null : cap(q.answeredMs),
    picks: ends(q.picks).map((p) => ({ choice: p.choice.slice(0, 200), at: cap(p.at) })),
    crossed: ends(q.crossed).map((c) => ({
      choice: c.choice.slice(0, 4),
      on: c.on,
      at: cap(c.at),
    })),
    calculatorOpens: Math.min(9999, q.calculatorOpens),
    calculatorMs: cap(q.calculatorMs),
    explanationMs: cap(q.explanationMs),
    visits: Math.min(9999, q.visits),
    pastes: Math.min(9999, q.pastes),
    copies: Math.min(9999, q.copies),
    screenshotKeys: Math.min(9999, q.screenshotKeys ?? 0),
    toolKeys: Math.min(9999, q.toolKeys ?? 0),
    marked: q.marked,
    input: q.input,
  };
}

/** The device as the record keeps it. */
export function deviceNow(): Device {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    touch: typeof window.matchMedia === "function" && matchMedia("(pointer: coarse)").matches,
    // a second screen, where the browser says so (it asks the student for nothing)
    extended: (window.screen as Screen & { isExtended?: boolean }).isExtended === true,
    utcOffset: new Date().getTimezoneOffset(),
  };
}

/** How many times the answer was changed, and the first thing picked. */
export const changesIn = (s: Pick<AnswerSignals, "picks">) => Math.max(0, s.picks.length - 1);
export const firstPickIn = (s: Pick<AnswerSignals, "picks">) => s.picks[0]?.choice ?? null;
export const lastPickIn = (s: Pick<AnswerSignals, "picks">) => s.picks.at(-1)?.choice ?? null;
