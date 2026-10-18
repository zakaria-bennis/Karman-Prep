// AR-57: privacy-safe calculator error reporting for the quiz host's onError hook. The sanitiser
// is eager and reused by the lazy quiz host; the Sentry send (report-error-send.ts) loads on the
// first report, which keeps Sentry off the quiz routes' eager graph (AR-33). A report is dropped
// silently when that chunk cannot load. It never imports v2 code (AR-1), so the codes are listed
// here.

/** KarmanCalculatorError's codes; any other code is dropped. */
const KNOWN_CODES: readonly string[] = ["invalid-argument", "unsupported", "destroyed"];

/** A name safe to report: an identifier-like word, never free text. */
const SAFE_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/** A V8 stack frame line. */
const V8_FRAME = /^\s+at\s/;

/** A WebKit or Gecko stack frame line. */
const WEBKIT_GECKO_FRAME = /^[^@]*@\S+:\d+:\d+$/;

function safeMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) return "UnknownError";
  const { name, code } = error as { name?: unknown; code?: unknown };
  const safeName = typeof name === "string" && SAFE_NAME.test(name) ? name : "Error";
  return typeof code === "string" && KNOWN_CODES.includes(code) ? `${safeName}: ${code}` : safeName;
}

function frameLines(error: unknown): string[] {
  if (typeof error !== "object" || error === null) return [];
  const { stack } = error as { stack?: unknown };
  if (typeof stack !== "string") return [];
  return stack.split("\n").filter((line) => V8_FRAME.test(line) || WEBKIT_GECKO_FRAME.test(line));
}

/**
 * Sends `error` to Sentry as a new Error whose message is `${name}` or `${name}: ${code}` and whose
 * stack is "Error: <message>" followed only by the original V8/WebKit/Gecko frame lines, tagged
 * { calculator: "v2", build: build ?? "unknown" }. The send loads on first use and a failed load
 * drops the report. Never sends LaTeX, rows, question text or answers, and never throws.
 */
export function reportCalculatorError(error: unknown, build: string | null): void {
  try {
    const message = safeMessage(error);
    const reported = new Error(message);
    reported.stack = ["Error: " + message, ...frameLines(error)].join("\n");
    void import("./report-error-send")
      .then((m) => m.sendCalculatorError(reported, { calculator: "v2", build: build ?? "unknown" }))
      .catch(() => {});
  } catch {
    // Reporting must never break the calculator or the quiz around it.
  }
}
