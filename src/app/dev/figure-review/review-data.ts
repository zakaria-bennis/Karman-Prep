import "server-only";

import { createHash } from "node:crypto";
import path from "node:path";
import type { StudentQuizQuestion } from "@/types/quiz";

// Dev-only founder figure review. The queue lives in the import pipeline's
// figures/ folder on the founder's machine (College Board material, never in
// the repo or a build): one folder per question with original.png, figure.json
// and status.json. `k figures submit` puts an item in ready_for_founder; this
// module records his approve / reject / undo in status.json, which the import
// toolkit's figure gate reads before anything is staged or published.

export const FIGURE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/;
export const SHA256 = /^[0-9a-f]{64}$/;

export type FigureStatus = "drafting" | "ready_for_founder" | "approved" | "rejected";
export type Decision = "approved" | "rejected" | "undo";

export interface HistoryEvent {
  at: string;
  decision: string;
  note: string;
  by: string;
}

export interface StatusDoc {
  occurrence_id: string;
  status: FigureStatus;
  round: number;
  history: HistoryEvent[];
  approved_file_sha256?: string | null;
  [key: string]: unknown;
}

export interface ReviewItem {
  id: string;
  round: number;
  fileSha256: string;
  submittedAt: string | null;
  submittedBy: string | null;
  reviewerNote: string;
  /** The founder's note from the last rejection, shown so he can confirm the fix. */
  previousNote: string | null;
  correctAnswer: string;
  question: StudentQuizQuestion;
}

export interface QueueState {
  items: ReviewItem[];
  counts: { waiting: number; approved: number; rejected: number; drafting: number };
}

export class DecisionError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409
  ) {
    super(message);
  }
}

export function isFigureReviewEnabled() {
  return process.env.NODE_ENV !== "production";
}

export function figureReviewDir() {
  return process.env.FIGURE_REVIEW_DIR ?? path.join(process.cwd(), ".figure-review");
}

/** Only requests to this machine (localhost) may read or change the queue. */
export function isLocalHost(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
}

/** The browser asked for a local name (Host header) and, as far as Next saw it, connected from
 *  this machine (x-forwarded-for, which Next fills from the socket when the client sent none).
 *  Next's nextUrl reports the server's own name, so it cannot tell a phone on the same Wi-Fi
 *  apart. Start the dev server with `-H 127.0.0.1` to keep other machines out entirely. */
export function isLocalRequest(headers: Headers) {
  const host = (headers.get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  const from = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  const loopback = (a: string) => a === "::1" || /^(::ffff:)?127\./.test(a);
  return isLocalHost(host) && from.every(loopback);
}

const sha256 = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

function folderOf(dir: string, id: string) {
  if (!FIGURE_ID.test(id)) throw new DecisionError("not a figure id", 400);
  return path.join(dir, id);
}

async function readJson<T>(file: string): Promise<{ raw: string; doc: T } | null> {
  const { readFile } = await import("node:fs/promises");
  try {
    const raw = await readFile(file, "utf8");
    return { raw, doc: JSON.parse(raw) as T };
  } catch {
    return null;
  }
}

type FigureDoc = Record<string, unknown> & {
  answer_choices?: { letter: string; choice_text?: string; choice_table_data?: unknown }[];
};

/** figure.json as the student quiz question the real quiz screen renders. */
export function toQuestion(id: string, doc: FigureDoc, fileSha256: string): StudentQuizQuestion {
  const str = (key: string) => (typeof doc[key] === "string" ? (doc[key] as string) : null);
  const kind = str("figure_kind") as StudentQuizQuestion["figure_kind"];
  const svg = kind === "image" && str("figure_svg");
  const qid = `figure-review-${id}`;
  return {
    id: qid,
    node_id: null,
    question_text: str("question_text") ?? "",
    question_type: "multiple_choice",
    // Display only: the quiz screen does not show difficulty to a student.
    difficulty: "intermediate",
    difficulty_level: 4,
    answer_format: str("answer_format") === "numeric_entry" ? "numeric_entry" : "multiple_choice",
    hint: null,
    image_url: svg
      ? `/dev/figure-review/files/${id}/figure.svg?v=${fileSha256.slice(0, 16)}`
      : null,
    image_alt: str("image_alt"),
    subject: (str("subject") ?? "math") as StudentQuizQuestion["subject"],
    topic_cluster: str("topic_cluster") ?? "Figure review",
    display_order: 0,
    passage_intro: str("passage_intro"),
    passage: str("passage"),
    passage_a: str("passage_a"),
    passage_b: str("passage_b"),
    figure_kind: kind,
    figure_table_data: (doc.figure_table_data ?? null) as StudentQuizQuestion["figure_table_data"],
    figure_chart_data: (doc.figure_chart_data ?? null) as StudentQuizQuestion["figure_chart_data"],
    figure_geometry_data: (doc.figure_geometry_data ??
      null) as StudentQuizQuestion["figure_geometry_data"],
    answer_choices: (doc.answer_choices ?? []).map((c) => ({
      id: `${qid}-${c.letter}`,
      question_id: qid,
      letter: c.letter as "A" | "B" | "C" | "D",
      choice_text: c.choice_text ?? "",
      choice_table_data: (c.choice_table_data ??
        null) as StudentQuizQuestion["answer_choices"][number]["choice_table_data"],
    })),
  };
}

function lastNote(status: StatusDoc, decision: string): string | null {
  const hit = [...status.history].reverse().find((h) => h.decision === decision);
  return hit ? hit.note || "" : null;
}

async function buildItem(dir: string, id: string, status: StatusDoc): Promise<ReviewItem | null> {
  const { readFile } = await import("node:fs/promises");
  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(dir, id, "figure.json"));
  } catch {
    return null;
  }
  const fileSha256 = sha256(bytes);
  const doc = JSON.parse(bytes.toString("utf8")) as FigureDoc;
  const submitted = [...status.history].reverse().find((h) => h.decision === "submitted");
  return {
    id,
    round: status.round,
    fileSha256,
    submittedAt: (status.submitted_at as string | undefined) ?? submitted?.at ?? null,
    submittedBy: submitted?.by ?? null,
    reviewerNote: typeof doc.notes === "string" ? doc.notes : "",
    previousNote: status.round > 1 ? lastNote(status, "rejected") : null,
    correctAnswer: typeof doc.correct_answer === "string" ? doc.correct_answer : "",
    question: toQuestion(id, doc, fileSha256),
  };
}

/** One queue item whatever its status (the snapshot exporter renders it), or null. */
export async function loadItem(id: string, dir = figureReviewDir()): Promise<ReviewItem | null> {
  if (!FIGURE_ID.test(id)) return null;
  const status = (await readJson<StatusDoc>(path.join(dir, id, "status.json")))?.doc;
  return status ? buildItem(dir, id, status) : null;
}

export async function loadQueue(dir = figureReviewDir()): Promise<QueueState> {
  const { readdir } = await import("node:fs/promises");
  const counts = { waiting: 0, approved: 0, rejected: 0, drafting: 0 };
  const items: ReviewItem[] = [];
  let names: string[] = [];
  try {
    names = (await readdir(dir, { withFileTypes: true }))
      .filter((d) => d.isDirectory() && FIGURE_ID.test(d.name))
      .map((d) => d.name);
  } catch {
    return { items, counts };
  }
  for (const id of names.sort()) {
    const status = (await readJson<StatusDoc>(path.join(dir, id, "status.json")))?.doc;
    if (!status) continue;
    if (status.status === "approved") counts.approved += 1;
    else if (status.status === "rejected") counts.rejected += 1;
    else if (status.status === "drafting") counts.drafting += 1;
    if (status.status !== "ready_for_founder") continue;
    const item = await buildItem(dir, id, status);
    if (!item) continue;
    counts.waiting += 1;
    items.push(item);
  }
  items.sort(
    (a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? "") || a.id.localeCompare(b.id)
  );
  return { items, counts };
}

export interface DecisionInput {
  id: string;
  decision: Decision;
  round: number;
  fileSha256: string;
  note?: string;
}

/** Record one founder decision in status.json (atomic temp-file rename, refused when the file
 *  changed under it). Approve and reject need the round and figure.json bytes he looked at;
 *  undo reverts his last decision on that item back to ready_for_founder. */
export async function decide(
  input: DecisionInput,
  now = new Date().toISOString(),
  dir = figureReviewDir()
): Promise<StatusDoc> {
  const { readFile, rename, writeFile, unlink } = await import("node:fs/promises");
  const folder = folderOf(dir, input.id);
  const statusPath = path.join(folder, "status.json");
  const before = await readJson<StatusDoc>(statusPath);
  if (!before) throw new DecisionError(`${input.id} is not in the figure queue`, 404);
  const status: StatusDoc = { ...before.doc, history: [...(before.doc.history ?? [])] };
  if (status.round !== input.round)
    throw new DecisionError("this figure was resubmitted since the page loaded", 409);
  const note = (input.note ?? "").trim();
  if (input.decision === "undo") {
    const last = status.history.at(-1);
    if (
      (status.status !== "approved" && status.status !== "rejected") ||
      last?.decision !== status.status ||
      last.by !== "founder"
    )
      throw new DecisionError("there is no decision of yours to undo on this figure", 409);
    status.history.push({
      at: now,
      decision: "undo",
      note: `undid ${status.status}`,
      by: "founder",
    });
    status.status = "ready_for_founder";
    status.approved_file_sha256 = null;
  } else {
    if (status.status !== "ready_for_founder")
      throw new DecisionError(`this figure is ${status.status}, not waiting for you`, 409);
    let bytes: Buffer;
    try {
      bytes = await readFile(path.join(folder, "figure.json"));
    } catch {
      throw new DecisionError("figure.json is missing", 409);
    }
    if (sha256(bytes) !== input.fileSha256)
      throw new DecisionError(
        "figure.json changed since the page loaded; showing the new one",
        409
      );
    if (input.decision === "rejected" && !note)
      throw new DecisionError("a rejection needs a note for the reviewer", 400);
    status.status = input.decision;
    status.approved_file_sha256 = input.decision === "approved" ? input.fileSha256 : null;
    status.history.push({ at: now, decision: input.decision, note, by: "founder" });
  }
  status.decided_at = now;
  const tmp = path.join(folder, `.status.json.${process.pid}.${Date.now()}.tmp`);
  await writeFile(tmp, JSON.stringify(status, null, 2) + "\n", "utf8");
  const current = await readJson<StatusDoc>(statusPath);
  if (current?.raw !== before.raw) {
    await unlink(tmp).catch(() => undefined);
    throw new DecisionError("status.json changed while saving; reload and try again", 409);
  }
  await rename(tmp, statusPath);
  return status;
}

/** Bytes for the review page: the source crop, or the figure's SVG from figure.json. */
export async function figureFile(
  id: string,
  name: string,
  dir = figureReviewDir()
): Promise<{ body: Uint8Array<ArrayBuffer>; type: string } | null> {
  if (!FIGURE_ID.test(id)) return null;
  const { readFile } = await import("node:fs/promises");
  try {
    if (name === "original.png") {
      return {
        body: new Uint8Array(await readFile(path.join(dir, id, "original.png"))),
        type: "image/png",
      };
    }
    if (name === "figure.svg") {
      const doc = (await readJson<FigureDoc>(path.join(dir, id, "figure.json")))?.doc;
      const svg = typeof doc?.figure_svg === "string" ? doc.figure_svg : null;
      return svg ? { body: new TextEncoder().encode(svg), type: "image/svg+xml" } : null;
    }
  } catch {
    return null;
  }
  return null;
}
