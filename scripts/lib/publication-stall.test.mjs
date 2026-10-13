import { test } from "node:test";
import { strict as assert } from "node:assert";
import { evaluatePublicationProgress } from "./publication-stall.mjs";

test("alerts after fifteen minutes only with a validated ready backlog", () => {
  const start = evaluatePublicationProgress(null, {
    sourcePdf: "frozen.pdf",
    approvedCount: 1356,
    readyBacklog: 73,
    now: 0,
  });
  assert.equal(start.stalled, false);
  const before = evaluatePublicationProgress(start, {
    sourcePdf: "frozen.pdf",
    approvedCount: 1356,
    readyBacklog: 73,
    now: 14 * 60 * 1000,
  });
  assert.equal(before.stalled, false);
  const stalled = evaluatePublicationProgress(before, {
    sourcePdf: "frozen.pdf",
    approvedCount: 1356,
    readyBacklog: 73,
    now: 15 * 60 * 1000,
  });
  assert.equal(stalled.stalled, true);
  assert.equal(
    evaluatePublicationProgress(stalled, {
      sourcePdf: "frozen.pdf",
      approvedCount: 1357,
      readyBacklog: 72,
      now: 16 * 60 * 1000,
    }).stalled,
    false
  );
  assert.equal(
    evaluatePublicationProgress(stalled, {
      sourcePdf: "frozen.pdf",
      approvedCount: 1356,
      readyBacklog: 0,
      now: 16 * 60 * 1000,
    }).stalled,
    false
  );
  assert.throws(() =>
    evaluatePublicationProgress(stalled, {
      sourcePdf: "different.pdf",
      approvedCount: 1356,
      readyBacklog: 73,
      now: 16 * 60 * 1000,
    })
  );
  assert.equal(
    evaluatePublicationProgress(stalled, {
      sourcePdf: "frozen.pdf",
      approvedCount: 1355,
      readyBacklog: 73,
      now: 16 * 60 * 1000,
    }).regressed,
    true
  );
});
