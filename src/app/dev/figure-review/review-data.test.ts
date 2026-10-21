import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DecisionError,
  decide,
  figureFile,
  isLocalHost,
  isLocalRequest,
  loadQueue,
  type StatusDoc,
} from "./review-data";

const ID = "2099-01_SYN_V1_MATH_M1_Q02";
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" data-figure-theme="karman-v1"><rect x="1"/></svg>';

let dir: string;

function put(id: string, figure: object, status: Partial<StatusDoc>) {
  const folder = path.join(dir, id);
  mkdirSync(folder, { recursive: true });
  const bytes = JSON.stringify(figure, null, 1);
  writeFileSync(path.join(folder, "figure.json"), bytes);
  writeFileSync(path.join(folder, "original.png"), "png");
  writeFileSync(
    path.join(folder, "status.json"),
    JSON.stringify({
      occurrence_id: id,
      status: "ready_for_founder",
      round: 1,
      history: [],
      ...status,
    })
  );
  return createHash("sha256").update(bytes).digest("hex");
}

const figure = {
  schema: "karman-figure-v1",
  figure_kind: "image",
  figure_svg: SVG,
  image_alt: "A made-up figure.",
  subject: "math",
  question_text: "Which made-up point is shown?",
  answer_format: "multiple_choice",
  answer_choices: ["A", "B", "C", "D"].map((letter) => ({
    letter,
    choice_text: letter.toLowerCase(),
  })),
  correct_answer: "B",
};

const status = (id = ID) =>
  JSON.parse(readFileSync(path.join(dir, id, "status.json"), "utf8")) as StatusDoc;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "figure-review-"));
});

describe("loadQueue", () => {
  it("lists waiting figures as quiz questions with counts", async () => {
    const sha = put(ID, figure, {
      round: 2,
      history: [
        { at: "t1", decision: "rejected", note: "Label the origin O", by: "founder" },
        { at: "t2", decision: "submitted", note: "", by: "r1" },
      ],
    });
    put("2099-01_SYN_V1_MATH_M1_Q03", figure, { status: "approved" });
    put("2099-01_SYN_V1_MATH_M1_Q04", figure, { status: "rejected" });
    const q = await loadQueue(dir);
    expect(q.counts).toEqual({ waiting: 1, approved: 1, rejected: 1, drafting: 0 });
    const item = q.items[0];
    expect(item.previousNote).toBe("Label the origin O");
    expect(item.fileSha256).toBe(sha);
    expect(item.question.image_url).toBe(
      `/dev/figure-review/files/${ID}/figure.svg?v=${sha.slice(0, 16)}`
    );
    expect(item.question.answer_choices).toHaveLength(4);
  });

  it("is empty when the folder does not exist", async () => {
    expect((await loadQueue(path.join(dir, "missing"))).items).toEqual([]);
  });
});

describe("decide", () => {
  it("approves with the hash of the bytes he saw and can undo", async () => {
    const sha = put(ID, figure, {});
    await decide({ id: ID, decision: "approved", round: 1, fileSha256: sha }, "t1", dir);
    expect(status()).toMatchObject({ status: "approved", approved_file_sha256: sha });
    expect(status().history.at(-1)).toEqual({
      at: "t1",
      decision: "approved",
      note: "",
      by: "founder",
    });
    await decide({ id: ID, decision: "undo", round: 1, fileSha256: sha }, "t2", dir);
    expect(status()).toMatchObject({ status: "ready_for_founder", approved_file_sha256: null });
    await expect(
      decide({ id: ID, decision: "undo", round: 1, fileSha256: sha }, "t3", dir)
    ).rejects.toThrow(DecisionError);
  });

  it("rejects only with a note", async () => {
    const sha = put(ID, figure, {});
    await expect(
      decide({ id: ID, decision: "rejected", round: 1, fileSha256: sha, note: "  " }, "t", dir)
    ).rejects.toMatchObject({ status: 400 });
    await decide(
      { id: ID, decision: "rejected", round: 1, fileSha256: sha, note: "Bars must touch" },
      "t",
      dir
    );
    expect(status()).toMatchObject({ status: "rejected" });
    expect(status().history.at(-1)?.note).toBe("Bars must touch");
  });

  it("refuses a changed figure, a stale round, a decided item and odd ids", async () => {
    const sha = put(ID, figure, {});
    writeFileSync(path.join(dir, ID, "figure.json"), JSON.stringify(figure));
    await expect(
      decide({ id: ID, decision: "approved", round: 1, fileSha256: sha }, "t", dir)
    ).rejects.toMatchObject({ status: 409 });
    const sha2 = put(ID, figure, { round: 2 });
    await expect(
      decide({ id: ID, decision: "approved", round: 1, fileSha256: sha2 }, "t", dir)
    ).rejects.toMatchObject({ status: 409 });
    put(ID, figure, { status: "approved" });
    await expect(
      decide({ id: ID, decision: "approved", round: 1, fileSha256: sha2 }, "t", dir)
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      decide({ id: "../x", decision: "approved", round: 1, fileSha256: sha2 }, "t", dir)
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      decide({ id: "2099-01_NOPE", decision: "approved", round: 1, fileSha256: sha2 }, "t", dir)
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("files and hosts", () => {
  it("serves only original.png and the figure SVG", async () => {
    put(ID, figure, {});
    expect((await figureFile(ID, "original.png", dir))?.type).toBe("image/png");
    const svg = await figureFile(ID, "figure.svg", dir);
    expect(new TextDecoder().decode(svg!.body)).toBe(SVG);
    expect(await figureFile(ID, "status.json", dir)).toBeNull();
    expect(await figureFile("..", "original.png", dir)).toBeNull();
  });

  it("treats only this machine as local", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("192.168.1.20")).toBe(false);
    expect(isLocalHost("karmanprep.com")).toBe(false);
    const req = (h: Record<string, string>) => isLocalRequest(new Headers(h));
    expect(req({ host: "localhost:3107", "x-forwarded-for": "::1" })).toBe(true);
    expect(req({ host: "127.0.0.1:3107", "x-forwarded-for": "::ffff:127.0.0.1" })).toBe(true);
    expect(req({ host: "localhost:3107", "x-forwarded-for": "10.0.0.7" })).toBe(false);
    expect(req({ host: "10.0.0.2:3107", "x-forwarded-for": "::1" })).toBe(false);
    expect(req({ host: "rebind.example:3107" })).toBe(false);
  });
});
