import { readFileSync, renameSync, writeFileSync } from "node:fs";

export function evaluatePublicationProgress(
  previous,
  { sourcePdf, approvedCount, readyBacklog, now }
) {
  if (!sourcePdf) throw new Error("source PDF required");
  if (previous && previous.sourcePdf !== sourcePdf)
    throw new Error("state belongs to another source PDF");
  if (!Number.isInteger(approvedCount) || approvedCount < 0)
    throw new Error("invalid approved count");
  if (!Number.isInteger(readyBacklog) || readyBacklog < 0) throw new Error("invalid ready backlog");
  const regressed = Boolean(previous && approvedCount < previous.approvedCount);
  const changed = !previous || approvedCount !== previous.approvedCount;
  const lastChangeAt = changed ? now : previous.lastChangeAt;
  const stalled = readyBacklog > 0 && !changed && now - lastChangeAt >= 15 * 60 * 1000;
  return {
    sourcePdf,
    approvedCount,
    readyBacklog,
    checkedAt: new Date(now).toISOString(),
    lastChangeAt,
    stalled,
    regressed,
  };
}

export function readProgress(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export function saveProgress(path, progress) {
  const temp = `${path}.tmp`;
  writeFileSync(temp, `${JSON.stringify(progress, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, path);
}
