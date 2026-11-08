import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  fingerprint,
  openQueue,
  queueCounts,
  recordRow,
  remainingRows,
  saveQueue,
} from "./import-queue.mjs";

test("checkpoint resumes only unverified rows and keeps review holds separate", () => {
  const dir = mkdtempSync(join(tmpdir(), "karman-queue-"));
  try {
    const path = join(dir, "batch.checkpoint.json");
    const digest = fingerprint('[{"question_text":"Q"}]', "frozen.pdf");
    const queue = openQueue(path, digest, 4);
    recordRow(queue, 0, "inserted");
    recordRow(queue, 1, "review_held");
    recordRow(queue, 2, "error", "interrupted dependent write");
    saveQueue(path, queue);
    const resumed = openQueue(path, digest, 4);
    assert.deepEqual(remainingRows(resumed), [2, 3]);
    assert.deepEqual(queueCounts(resumed), {
      inserted: 1,
      review_held: 1,
      duplicate_verified: 0,
      error: 1,
      pending: 1,
    });
    assert.throws(() => openQueue(path, fingerprint("changed", "frozen.pdf"), 4));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
