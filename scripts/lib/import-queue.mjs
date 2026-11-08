import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";

const COMPLETED = new Set(["inserted", "review_held", "duplicate_verified"]);

export function fingerprint(rawJson, sourcePdf) {
  return createHash("sha256").update(sourcePdf).update("\0").update(rawJson).digest("hex");
}

export function openQueue(path, digest, rowCount) {
  if (!path) return { version: 1, digest, rowCount, rows: {} };
  let queue;
  try {
    queue = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return { version: 1, digest, rowCount, rows: {} };
    throw error;
  }
  if (
    queue.version !== 1 ||
    queue.digest !== digest ||
    queue.rowCount !== rowCount ||
    !queue.rows
  ) {
    throw new Error("Queue checkpoint belongs to different JSON input or source PDF");
  }
  return queue;
}

export function remainingRows(queue) {
  return Array.from({ length: queue.rowCount }, (_, index) => index).filter(
    (index) => !COMPLETED.has(queue.rows[index]?.status)
  );
}

/** @param {string | null} [error] */
export function recordRow(queue, index, status, error = null) {
  queue.rows[index] = { status, ...(error ? { error } : {}) };
}

export function queueCounts(queue) {
  const counts = { inserted: 0, review_held: 0, duplicate_verified: 0, error: 0, pending: 0 };
  for (let i = 0; i < queue.rowCount; i++) {
    const status = queue.rows[i]?.status;
    if (status && status in counts) counts[status]++;
    else counts.pending++;
  }
  return counts;
}

export function saveQueue(path, queue) {
  if (!path) return;
  const temp = `${path}.tmp`;
  writeFileSync(temp, `${JSON.stringify(queue, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, path);
}
