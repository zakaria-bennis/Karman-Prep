/**
 * What every answer saves (docs/research/2026-10-bluebook-difficulty-and-adaptivity.md,
 * Part 6.2, and the portals brief): the question version, the mode, the
 * position, whether it was a first try, the time spent, whether help, the
 * calculator or the explanation was used, and the device. In the prototype the
 * records live in localStorage so the Settings screen can show the data model
 * under "What we save". Nothing leaves the browser.
 */
export type AnswerMode = "daily10" | "practice" | "endless" | "trials" | "test" | "diagnostic";
export type DeviceKind = "phone" | "tablet" | "desktop";

export interface AnswerRecord {
  id: string;
  questionId: string;
  /** The exact version shown; a changed wording starts a new version. */
  questionVersion: string;
  skill: string;
  mode: AnswerMode;
  timed: boolean;
  /** 1-based position in the set, module or session. */
  position: number;
  module?: number;
  route?: "harder" | "easier";
  firstTry: boolean;
  chosen: string;
  correct: boolean;
  timeMs: number;
  changedAnswer: number;
  helpUsed: boolean;
  calculatorUsed: boolean;
  explanationUsed: boolean;
  difficulty: number;
  device: DeviceKind;
  answeredAt: string;
}

export const FIELDS: { key: keyof AnswerRecord; label: string; why: string }[] = [
  {
    key: "questionVersion",
    label: "Question version",
    why: "Answers point at the exact text shown.",
  },
  { key: "mode", label: "Mode", why: "Only test and timed answers calibrate difficulty." },
  { key: "position", label: "Position", why: "Where in the set or module it came up." },
  { key: "firstTry", label: "First try", why: "Only first tries count for calibration." },
  { key: "timeMs", label: "Time spent", why: "Pace, guessing and the time trials." },
  { key: "helpUsed", label: "Help used", why: "A hint changes what the answer tells us." },
  { key: "calculatorUsed", label: "Calculator opened", why: "A behaviour signal on math." },
  { key: "explanationUsed", label: "Explanation opened", why: "Whether the miss was studied." },
  { key: "changedAnswer", label: "Answer changed", why: "Second thoughts, counted." },
  { key: "device", label: "Device", why: "Possible screen effects." },
];

const KEY = "karman-demo-telemetry";
let cache: AnswerRecord[] | null = null;

export function readRecords(): AnswerRecord[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]") as AnswerRecord[];
  } catch {
    cache = [];
  }
  return cache;
}

function write(list: AnswerRecord[]) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-200)));
  } catch {
    /* storage can be off */
  }
}

export function deviceKind(): DeviceKind {
  if (typeof window === "undefined") return "desktop";
  const touch = navigator.maxTouchPoints > 0;
  if (!touch) return "desktop";
  return innerWidth < 700 ? "phone" : "tablet";
}

/** Has this student answered this exact question version before, in any mode? */
export function seenBefore(questionVersion: string): boolean {
  return readRecords().some((r) => r.questionVersion === questionVersion);
}

export function recordAnswer(
  r: Omit<AnswerRecord, "id" | "answeredAt" | "device" | "firstTry">
): AnswerRecord {
  const rec: AnswerRecord = {
    ...r,
    firstTry: !seenBefore(r.questionVersion),
    id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    device: deviceKind(),
    answeredAt: new Date().toISOString(),
  };
  write([...readRecords(), rec]);
  return rec;
}

export function clearRecords() {
  write([]);
}

export const versionOf = (questionId: string) => `${questionId}:v1`;

console.assert(FIELDS.length === 10, "ten telemetry fields on the panel");
