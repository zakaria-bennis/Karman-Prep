// ============================================================
// math-equivalence — Phase 5 SymPy bridge.
//
// SymPy is a Python library; Cloudflare Workers can't run Python at
// runtime, so Phase 5 equivalence checking is CI-only. The GitHub
// Actions job that runs scripts/pdf-pipeline/orchestrate.mjs installs
// sympy via `pip install sympy` (see .github/workflows/process-pdf.yml).
//
// This module spawns `python3 scripts/python/sympy-check.py` as a
// subprocess, pipes a JSON payload to its stdin, parses its JSON
// response, and returns a normalized result. Any failure mode —
// missing python3, missing sympy, parse error, timeout — collapses
// to `{ equivalent: null, method: 'inconclusive', reason }`. The
// caller treats `equivalent: null` exactly like 'solver disagreement'
// — i.e. blocks auto-repair and routes to review.
//
// We never throw from areExpressionsEquivalent — call sites in the
// hot pipeline must not have to wrap in try/catch.
// ============================================================

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYMPY_SCRIPT_PATH = path.resolve(__dirname, "..", "python", "sympy-check.py");

const DEFAULT_HARD_TIMEOUT_MS = 15_000;
const DEFAULT_SOFT_TIMEOUT_SEC = 10;

/**
 * Run the Python script with payload, return parsed JSON or a
 * synthetic failure object. NEVER throws.
 *
 * @param {object} args
 * @param {string} args.expressionA
 * @param {string} args.expressionB
 * @param {number} [args.softTimeoutSec=10]
 * @param {number} [args.hardTimeoutMs=15000]
 * @returns {Promise<{
 *   equivalent: boolean | null,
 *   method: string,
 *   reason: string,
 *   diagnostics?: object
 * }>}
 */
export async function areExpressionsEquivalent({
  expressionA,
  expressionB,
  softTimeoutSec = DEFAULT_SOFT_TIMEOUT_SEC,
  hardTimeoutMs = DEFAULT_HARD_TIMEOUT_MS,
}) {
  if (typeof expressionA !== "string" || typeof expressionB !== "string") {
    return {
      equivalent: null,
      method: "inconclusive",
      reason: "expressionA and expressionB must both be strings",
    };
  }

  // Quick win — if the strings are byte-identical, skip Python.
  if (expressionA === expressionB) {
    return {
      equivalent: true,
      method: "identical_strings",
      reason: "Inputs are byte-identical; no symbolic check needed.",
    };
  }

  const payload = JSON.stringify({
    expression_a: expressionA,
    expression_b: expressionB,
    timeout_seconds: softTimeoutSec,
  });

  let proc;
  try {
    proc = spawn("python3", [SYMPY_SCRIPT_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    return {
      equivalent: null,
      method: "inconclusive",
      reason: `python3 spawn failed: ${err?.message ?? String(err)}`,
    };
  }

  return await new Promise((resolve) => {
    let settled = false;
    const stdoutChunks = [];
    const stderrChunks = [];

    const settle = (result) => {
      if (settled) return;
      settled = true;
      // Best-effort cleanup; harmless if process already exited.
      try {
        proc.kill("SIGKILL");
      } catch {
        // ignore
      }
      resolve(result);
    };

    const timer = setTimeout(() => {
      settle({
        equivalent: null,
        method: "inconclusive",
        reason: `python3 subprocess hard-timeout at ${hardTimeoutMs}ms`,
      });
    }, hardTimeoutMs);

    proc.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    proc.stderr.on("data", (chunk) => stderrChunks.push(chunk));

    proc.on("error", (err) => {
      clearTimeout(timer);
      settle({
        equivalent: null,
        method: "inconclusive",
        reason: `python3 spawn error: ${err?.message ?? String(err)}`,
      });
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

      if (!stdout) {
        return settle({
          equivalent: null,
          method: "inconclusive",
          reason: `python3 exited code=${code} with no stdout. stderr=${stderr || "<empty>"}`,
        });
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch (parseErr) {
        return settle({
          equivalent: null,
          method: "inconclusive",
          reason: `Failed to parse python3 stdout as JSON: ${parseErr?.message}. stdout=${stdout.slice(0, 200)}`,
        });
      }

      if (parsed?.ok !== true) {
        return settle({
          equivalent: null,
          method: "inconclusive",
          reason:
            `sympy-check reported ${parsed?.error ?? "unknown_error"}: ${parsed?.details ?? ""}`.slice(
              0,
              400
            ),
          diagnostics: parsed,
        });
      }

      settle({
        equivalent: parsed.equivalent === true,
        method: parsed.method ?? "sympy",
        reason: "SymPy equivalence check completed.",
        diagnostics: parsed.diagnostics ?? null,
      });
    });

    // Write payload to stdin and close it.
    try {
      proc.stdin.write(payload);
      proc.stdin.end();
    } catch (writeErr) {
      clearTimeout(timer);
      settle({
        equivalent: null,
        method: "inconclusive",
        reason: `Failed to write payload to python3 stdin: ${writeErr?.message}`,
      });
    }
  });
}

export const __test__ = {
  SYMPY_SCRIPT_PATH,
  DEFAULT_HARD_TIMEOUT_MS,
  DEFAULT_SOFT_TIMEOUT_SEC,
};
