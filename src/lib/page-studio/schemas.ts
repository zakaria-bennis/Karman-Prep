// Runtime checks for every Page Studio server action (src/app/studio/actions.ts).
import { z } from "zod";
import { pageById } from "./inventory";

export const NOTE_KINDS = ["copy", "comment"] as const;
export const NOTE_CATEGORIES = ["copy", "visual", "functional", "other"] as const;
export const NOTE_STATUSES = [
  "draft",
  "sent",
  "question",
  "working",
  "in_pr",
  "done",
  "dismissed",
] as const;
export const VIEWPORTS = ["desktop", "laptop", "tablet", "phone"] as const;

export type NoteKind = (typeof NOTE_KINDS)[number];
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];
export type NoteStatus = (typeof NOTE_STATUSES)[number];
export type Viewport = (typeof VIEWPORTS)[number];

const id = z.string().uuid();
const text = (max: number) => z.string().max(max);

export const newNoteSchema = z
  .object({
    pageKey: z.string().refine((k) => Boolean(pageById(k)), "Unknown page"),
    pagePath: z.string().min(1).max(1000).startsWith("/"),
    persona: text(120),
    viewport: z.enum(VIEWPORTS),
    kind: z.enum(NOTE_KINDS),
    category: z.enum(NOTE_CATEGORIES),
    selector: text(1000),
    elementLabel: text(300),
    elementText: text(4000),
    elementHtml: text(4000),
    oldText: text(4000).nullable(),
    newText: text(4000).nullable(),
    body: text(4000),
  })
  .refine((n) => n.kind !== "copy" || (n.newText !== null && n.oldText !== null), {
    message: "A copy edit needs the words before and after",
  })
  .refine((n) => n.kind !== "comment" || n.body.trim().length > 0, {
    message: "Write the comment first",
  });

export const updateNoteSchema = z.object({
  id,
  body: text(4000).optional(),
  newText: text(4000).optional(),
  category: z.enum(NOTE_CATEGORIES).optional(),
});

export const noteIdSchema = z.object({ id });

/** Send notes to Claude: the given ones, or every draft when none are given. */
export const sendNotesSchema = z.object({ ids: z.array(id).max(500).optional() });

export const replySchema = z.object({ id, body: z.string().trim().min(1).max(4000) });

/** The founder's own status moves: close a note, drop it, or send it back to Claude. */
export const founderStatusSchema = z.object({
  id,
  status: z.enum(["done", "dismissed", "sent"]),
});

export const markSchema = z.object({
  pageKey: z.string().refine((k) => Boolean(pageById(k)), "Unknown page"),
  mark: z.enum(["good", "needs_work"]).nullable(),
});

export const viewAsSchema = z.union([
  z.object({ mode: z.literal("self") }),
  z.object({ mode: z.literal("role"), role: z.enum(["student", "parent", "tutor"]) }),
  z.object({ mode: z.literal("user"), userId: id }),
]);
export type ViewAsInput = z.infer<typeof viewAsSchema>;
